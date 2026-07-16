import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { createLlmProvider } from "../llm/providers";
import { buildCardMessages } from "../llm/prompt";
import { AiRadarCardSchema } from "../llm/schema";
import { parseModelJson, stringifyValidationError } from "../llm/json";
import { evaluateCardQuality } from "../llm/evaluate";
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
  console.log("AI Radar LLM Eval\n");
  console.log("Loaded ZHIPU_API_KEY:", process.env.ZHIPU_API_KEY ? `${process.env.ZHIPU_API_KEY.slice(0, 8)}...` : "missing");

  let provider;
  try {
    provider = createLlmProvider();
  } catch (err) {
    console.error("Failed to initialize LLM provider:", (err as Error).message);
    process.exit(1);
  }

  const useLiveDb = process.env.LLM_EVAL_USE_LIVE_DB === "true";
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

      cases = rows.map((row) => {
        return {
          id: row.id,
          sourceType: "blog",
          sourceName: row.sourceId,
          title: row.title,
          url: row.url,
          publishedAt: row.publishedAt,
          extractedContent: row.extractedContent,
        };
      });
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

  const results: any[] = [];
  let parsePassCount = 0;
  let schemaPassCount = 0;
  let warningCount = 0;
  let failedCount = 0;

  let isFirst = true;
  for (const item of cases) {
    if (!isFirst) {
      console.log("Waiting 2000ms to respect rate limits...");
      await sleep(2000);
    }
    isFirst = false;

    console.log(`Running case: ${item.id} ("${item.title}")`);
    
    const messages = buildCardMessages(item);
    
    try {
      const response = await provider.generateJson({
        messages,
        temperature: 0.1,
        responseFormat: "json",
      });

      const parsed = response.parsedJson;
      const parseOk = parsed !== null;
      
      let schemaOk = false;
      let validationError: string | null = null;
      let qualityWarnings: string[] = [];
      let card = null;

      if (parseOk && parsed) {
        parsePassCount++;
        const parseResult = AiRadarCardSchema.safeParse(parsed);
        if (parseResult.success) {
          schemaOk = true;
          schemaPassCount++;
          card = parseResult.data;
          qualityWarnings = evaluateCardQuality(card);
          if (qualityWarnings.length > 0) {
            warningCount++;
            console.log(`  [warn] quality warnings: ${qualityWarnings.join("; ")}`);
          } else {
            console.log("  [pass] parsed and schema validated successfully");
          }
        } else {
          failedCount++;
          validationError = stringifyValidationError(parseResult.error);
          console.log(`  [fail] schema validation failed: ${validationError}`);
        }
      } else {
        failedCount++;
        console.log("  [fail] JSON parsing failed");
      }

      results.push({
        fixtureId: item.id,
        title: item.title,
        parseOk,
        schemaOk,
        qualityWarnings,
        card,
        rawText: response.rawText,
        error: validationError,
      });

    } catch (err) {
      failedCount++;
      const errorMessage = (err as Error).message;
      console.log(`  [fail] API call failed: ${errorMessage}\n${(err as Error).stack}`);
      results.push({
        fixtureId: item.id,
        title: item.title,
        parseOk: false,
        schemaOk: false,
        qualityWarnings: [],
        card: null,
        rawText: "",
        error: errorMessage,
      });
    }
  }

  const totalCases = cases.length;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.resolve(process.env.LLM_EVAL_OUTPUT_DIR || "reports");
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const reportFilename = `llm-eval-${timestamp}.json`;
  const reportPath = path.join(outputDir, reportFilename);

  const summary = {
    total: totalCases,
    parsePass: parsePassCount,
    schemaPass: schemaPassCount,
    warnings: warningCount,
    failed: failedCount,
  };

  const reportPayload = {
    runAt: new Date().toISOString(),
    provider: provider.name,
    model: provider.model,
    cases: results,
    summary,
  };

  fs.writeFileSync(reportPath, JSON.stringify(reportPayload, null, 2), "utf-8");

  console.log("\n=================================");
  console.log("AI Radar LLM Eval Summary");
  console.log("=================================");
  console.log(`Provider:           ${provider.name}`);
  console.log(`Model:              ${provider.model}`);
  console.log(`Number of cases:    ${totalCases}`);
  console.log(`Parse pass count:   ${parsePassCount}`);
  console.log(`Schema pass count:  ${schemaPassCount}`);
  console.log(`Warning count:      ${warningCount}`);
  console.log(`Failed count:       ${failedCount}`);
  console.log(`Report path:        ${reportPath}`);
  console.log("=================================");
}

runEvaluation();
