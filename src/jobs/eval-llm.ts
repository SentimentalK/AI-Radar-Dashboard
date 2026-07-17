import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { createLlmProvider, createLlmProviderFromConfig } from "../llm/providers";
import { buildCardMessages } from "../llm/prompt";
import { AiRadarCardSchema } from "../llm/schema";
import { parseModelJson, stringifyValidationError } from "../llm/json";
import { evaluateCardQuality } from "../llm/evaluate";
import { repairEnumOnlyOutput } from "../llm/repair";
import { createDb } from "../db/client";

dotenv.config();

type EvalInput = {
  id: string;
  sourceType: string;
  sourceName?: string | null;
  title: string;
  url: string;
  publishedAt?: string | null;
  extractedContent: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runEvaluation() {
  const isCompareMode = process.env.LLM_EVAL_COMPARE === "true";
  const useLiveDb = process.env.LLM_EVAL_USE_LIVE_DB === "true";
  const outputDir = path.resolve(process.env.LLM_EVAL_OUTPUT_DIR || "reports");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. Load test cases (fixtures or live database items)
  let cases: EvalInput[] = [];
  if (useLiveDb) {
    console.log("Loading candidates from live SQLite database...");
    const db = createDb();
    try {
      const rows = db.prepare(`
        SELECT id, source_id as sourceId, title, url, published_at as publishedAt, extracted_content as extractedContent
        FROM items
        WHERE extracted_content IS NOT NULL
        ORDER BY COALESCE(published_at, fetched_at) DESC
        LIMIT 5
      `).all() as any[];

      cases = rows.map((row) => ({
        id: row.id,
        sourceType: "blog",
        sourceName: row.sourceId,
        title: row.title,
        url: row.url,
        publishedAt: row.publishedAt,
        extractedContent: row.extractedContent,
      }));
    } catch (err) {
      console.error("Failed to load live database items:", err);
      db.close();
      process.exit(1);
    } finally {
      db.close();
    }
    console.log(`Loaded ${cases.length} live database items.\n`);
  } else {
    const fixturesDir = path.resolve("src/llm/fixtures");
    const files = [
      "github-repo-reader.json",
      "official-blog-code-migration.json",
      "paper-abstract-agent-memory.json",
      "weak-noisy-source.json",
    ];

    for (const file of files) {
      const filePath = path.join(fixturesDir, file);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, "utf-8");
          cases.push(JSON.parse(content));
        } catch (err) {
          console.error(`Failed to load fixture file ${file}:`, err);
        }
      }
    }
    console.log(`Loaded ${cases.length} static fixtures.\n`);
  }

  if (cases.length === 0) {
    console.error("No evaluation cases loaded. Exiting.");
    process.exit(1);
  }

  // Helper function to evaluate cases against a target provider
  async function runTarget(targetConfig: { provider: string; model?: string }) {
    const provider = createLlmProviderFromConfig(targetConfig);
    const results: any[] = [];
    let parsePass = 0;
    let schemaPassBeforeRepair = 0;
    let schemaPassAfterRepair = 0;
    let repairCount = 0;
    let warningCount = 0;
    let failed = 0;
    let totalLatency = 0;

    let isFirst = true;
    for (const item of cases) {
      if (!isFirst) {
        // Sleep 2000ms sequentially to avoid RPM rate-limiting
        console.log("Waiting 2000ms to respect rate limits...");
        await sleep(2000);
      }
      isFirst = false;

      console.log(`[${provider.name}/${provider.model}] Running case: ${item.id} ("${item.title}")`);

      const messages = buildCardMessages(item);
      const startTime = Date.now();

      try {
        const response = await provider.generateJson({
          messages,
          temperature: 0.1,
          responseFormat: "json",
        });

        const latencyMs = Date.now() - startTime;
        totalLatency += latencyMs;

        const parsed = response.parsedJson;
        const parseOk = parsed !== null;

        let schemaOkBeforeRepair = false;
        let schemaOkAfterRepair = false;
        let repairs: string[] = [];
        let qualityWarnings: string[] = [];
        let card: any = null;
        let validationError: string | null = null;
        let caseStatus: "pass" | "pass_with_repair" | "warn" | "fail" = "fail";

        if (parseOk && parsed) {
          parsePass++;

          // 1. Initial schema check
          const initialParse = AiRadarCardSchema.safeParse(parsed);
          if (initialParse.success) {
            schemaOkBeforeRepair = true;
            schemaOkAfterRepair = true;
            schemaPassBeforeRepair++;
            schemaPassAfterRepair++;
            card = initialParse.data;
            qualityWarnings = evaluateCardQuality(card);

            if (qualityWarnings.length > 0) {
              caseStatus = "warn";
              warningCount++;
            } else {
              caseStatus = "pass";
            }
          } else {
            // 2. Perform repair on schema fail
            const repairResult = repairEnumOnlyOutput(parsed);
            repairs = repairResult.repairs;
            repairCount += repairs.length;

            const repairedParse = AiRadarCardSchema.safeParse(repairResult.repairedJson);
            if (repairedParse.success) {
              schemaOkAfterRepair = true;
              schemaPassAfterRepair++;
              card = repairedParse.data;
              qualityWarnings = evaluateCardQuality(card);
              caseStatus = "pass_with_repair";
              if (qualityWarnings.length > 0) {
                warningCount++;
              }
            } else {
              caseStatus = "fail";
              failed++;
              validationError = stringifyValidationError(repairedParse.error);
            }
          }
        } else {
          caseStatus = "fail";
          failed++;
        }

        console.log(`  [${caseStatus}] parse=${parseOk ? "ok" : "failed"} schema_before=${schemaOkBeforeRepair ? "ok" : "failed"} schema_after=${schemaOkAfterRepair ? "ok" : "failed"} repairs=${repairs.length} warnings=${qualityWarnings.length} latency=${latencyMs}ms`);
        if (validationError) {
          console.log(`  └─ validation error: ${validationError}`);
        }

        results.push({
          fixtureId: item.id,
          title: item.title,
          parseOk,
          schemaOkBeforeRepair,
          schemaOkAfterRepair,
          repairs,
          qualityWarnings,
          caseStatus,
          card,
          rawText: response.rawText,
          error: validationError,
          latencyMs,
          usage: response.usage,
        });

      } catch (err) {
        const latencyMs = Date.now() - startTime;
        totalLatency += latencyMs;
        failed++;

        const errorMessage = (err as Error).message;
        console.log(`  [fail] API call failed: ${errorMessage} latency=${latencyMs}ms`);

        results.push({
          fixtureId: item.id,
          title: item.title,
          parseOk: false,
          schemaOkBeforeRepair: false,
          schemaOkAfterRepair: false,
          repairs: [],
          qualityWarnings: [],
          caseStatus: "fail",
          card: null,
          rawText: "",
          error: errorMessage,
          latencyMs,
        });
      }
    }

    const avgLatencyMs = Math.round(totalLatency / cases.length);

    return {
      provider: provider.name,
      model: provider.model,
      summary: {
        total: cases.length,
        parsePass,
        schemaPassBeforeRepair,
        schemaPassAfterRepair,
        repairCount,
        warningCount,
        failed,
        averageLatencyMs: avgLatencyMs,
      },
      cases: results,
    };
  }

  // ==========================================
  // Execution Mode Router
  // ==========================================
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  if (isCompareMode) {
    console.log("AI Radar LLM Eval Compare Mode\n");
    const targetsStr = process.env.LLM_EVAL_COMPARE_TARGETS || "zhipu:glm-4-flash,groq:openai/gpt-oss-120b";
    
    // Parse targets e.g. "zhipu:glm-4-flash,groq:openai/gpt-oss-120b"
    const targets = targetsStr.split(",").map((target) => {
      const parts = target.trim().split(":");
      return {
        provider: parts[0],
        model: parts[1] || undefined,
      };
    });

    console.log("Comparison Targets:");
    for (const t of targets) {
      console.log(` - ${t.provider} / ${t.model || "default"}`);
    }
    console.log("");

    const reportTargetsResults: any[] = [];

    for (const target of targets) {
      console.log(`--- Running Target: ${target.provider} (${target.model || "default"}) ---`);
      const runResult = await runTarget(target);
      reportTargetsResults.push(runResult);
      console.log("");
    }

    // Determine simple best metrics
    let bestBySchema = "none";
    let bestBySchemaVal = -1;
    let bestByWarnings = "none";
    let bestByWarningsVal = Infinity;

    for (const res of reportTargetsResults) {
      const schemaPass = res.summary.schemaPassAfterRepair;
      if (schemaPass > bestBySchemaVal) {
        bestBySchemaVal = schemaPass;
        bestBySchema = `${res.provider}/${res.model}`;
      }

      const totalFailsAndWarns = res.summary.failed + res.summary.warningCount;
      if (totalFailsAndWarns < bestByWarningsVal) {
        bestByWarningsVal = totalFailsAndWarns;
        bestByWarnings = `${res.provider}/${res.model}`;
      }
    }

    const reportPath = path.join(outputDir, `llm-compare-${timestamp}.json`);
    const comparisonReport = {
      runAt: new Date().toISOString(),
      mode: "compare",
      targets: reportTargetsResults,
      comparison: {
        bestBySchemaAfterRepair: bestBySchema,
        bestByFewestWarnings: bestByWarnings,
        notes: [
          `Target with best schema pass count after repair: ${bestBySchema} (${bestBySchemaVal}/${cases.length})`,
          `Target with lowest warning & failure count: ${bestByWarnings} (total score: ${bestByWarningsVal})`,
        ],
      },
    };

    fs.writeFileSync(reportPath, JSON.stringify(comparisonReport, null, 2), "utf-8");

    // Print nice console summary table
    console.log("=========================================================================================");
    console.log("AI Radar LLM Eval Compare Summary Table");
    console.log("=========================================================================================");
    console.log(
      "Provider/Model".padEnd(30) +
      "Parse".padEnd(8) +
      "Schema(Pre)".padEnd(14) +
      "Schema(Post)".padEnd(14) +
      "Repairs".padEnd(10) +
      "Warnings".padEnd(10) +
      "Failed".padEnd(8) +
      "AvgLatency"
    );
    console.log("-----------------------------------------------------------------------------------------");
    for (const res of reportTargetsResults) {
      const name = `${res.provider}/${res.model}`;
      console.log(
        name.padEnd(30) +
        `${res.summary.parsePass}/${res.summary.total}`.padEnd(8) +
        `${res.summary.schemaPassBeforeRepair}/${res.summary.total}`.padEnd(14) +
        `${res.summary.schemaPassAfterRepair}/${res.summary.total}`.padEnd(14) +
        `${res.summary.repairCount}`.padEnd(10) +
        `${res.summary.warningCount}`.padEnd(10) +
        `${res.summary.failed}`.padEnd(8) +
        `${res.summary.averageLatencyMs}ms`
      );
    }
    console.log("=========================================================================================");
    console.log(`Report written to: ${reportPath}\n`);

  } else {
    // Single provider execution
    const provider = createLlmProvider();
    console.log(`AI Radar LLM Eval Single Mode (Provider: ${provider.name}, Model: ${provider.model})\n`);

    const runResult = await runTarget({
      provider: provider.name,
      model: provider.model,
    });

    const reportPath = path.join(outputDir, `llm-eval-${timestamp}.json`);
    const reportPayload = {
      runAt: new Date().toISOString(),
      provider: runResult.provider,
      model: runResult.model,
      cases: runResult.cases,
      summary: runResult.summary,
    };

    fs.writeFileSync(reportPath, JSON.stringify(reportPayload, null, 2), "utf-8");

    console.log("\n=================================");
    console.log("AI Radar LLM Eval Summary");
    console.log("=================================");
    console.log(`Provider:                     ${runResult.provider}`);
    console.log(`Model:                        ${runResult.model}`);
    console.log(`Number of cases:              ${runResult.summary.total}`);
    console.log(`Parse pass count:             ${runResult.summary.parsePass}`);
    console.log(`Schema pass count (Pre):      ${runResult.summary.schemaPassBeforeRepair}`);
    console.log(`Schema pass count (Post):     ${runResult.summary.schemaPassAfterRepair}`);
    console.log(`Repair count:                 ${runResult.summary.repairCount}`);
    console.log(`Warning count:                ${runResult.summary.warningCount}`);
    console.log(`Failed count:                 ${runResult.summary.failed}`);
    console.log(`Average Latency:              ${runResult.summary.averageLatencyMs}ms`);
    console.log(`Report path:                  ${reportPath}`);
    console.log("=================================");
  }
}

runEvaluation();
