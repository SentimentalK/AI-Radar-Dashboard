import dotenv from "dotenv";
import { createLlmProvider } from "../llm/providers";
import {
  listEnrichmentCandidates,
  saveEnrichmentSuccess,
  markEnrichmentFailure,
} from "../db/enrichmentRepository";
import { enrichItem } from "../llm/enrichItem";

dotenv.config();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = parseInt(process.env.ENRICH_BATCH_SIZE || "10", 10);
  let retryFailed = process.env.ENRICH_RETRY_FAILED === "true";
  let itemDelayMs = parseInt(process.env.ENRICH_ITEM_DELAY_MS || "0", 10);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      const parsedLimit = parseInt(args[i + 1], 10);
      if (!isNaN(parsedLimit)) {
        limit = parsedLimit;
      }
      i++;
    } else if (args[i] === "--retry-failed") {
      retryFailed = true;
    } else if (args[i] === "--item-delay-ms" && args[i + 1]) {
      const parsedDelay = parseInt(args[i + 1], 10);
      if (!isNaN(parsedDelay)) {
        itemDelayMs = parsedDelay;
      }
      i++;
    }
  }

  return { limit, retryFailed, itemDelayMs: Math.max(itemDelayMs, 0) };
}

async function runEnrichmentJob() {
  const { limit, retryFailed, itemDelayMs } = parseArgs();
  const maxChars = parseInt(process.env.ENRICH_MAX_CHARS || "30000", 10);

  console.log("AI Radar Enrich\n");

  let provider;
  try {
    provider = createLlmProvider();
  } catch (err) {
    console.error(`Failed to initialize LLM provider: ${(err as Error).message}`);
    process.exit(1);
  }

  console.log(`Provider:   ${provider.name}`);
  console.log(`Model:      ${provider.model}`);
  console.log(`Item delay: ${itemDelayMs}ms`);

  const candidates = listEnrichmentCandidates({ limit, retryFailed });
  console.log(`Candidates: ${candidates.length}\n`);

  if (candidates.length === 0) {
    console.log("No candidates found for enrichment. Exiting.");
    process.exit(0);
  }

  let succeeded = 0;
  let failed = 0;
  let totalRepairs = 0;
  let totalWarnings = 0;

  for (let i = 0; i < candidates.length; i++) {
    const item = candidates[i];
    try {
      const result = await enrichItem({
        provider,
        item,
        maxChars,
      });

      // Write-back successful enrichment and replace tags in a single short transaction
      saveEnrichmentSuccess({
        itemId: item.id,
        card: result.card,
        provider: provider.name,
        model: provider.model,
      });

      console.log(
        `[success] item=${item.id} action=${result.card.recommended_action} relevance=${result.card.engineering_relevance_score} category=${result.card.category} tags=${result.card.tags.length} repairs=${result.repairs.length} warnings=${result.qualityWarnings.length} latency=${result.latencyMs}ms`
      );

      succeeded++;
      totalRepairs += result.repairs.length;
      totalWarnings += result.qualityWarnings.length;

    } catch (err) {
      const errorMessage = (err as Error).message;
      console.log(`[failed] item=${item.id} error="${errorMessage}"`);

      // Write-back failure message to SQLite
      markEnrichmentFailure({
        itemId: item.id,
        provider: provider.name,
        model: provider.model,
        error: errorMessage,
      });

      failed++;
    }

    // Pace requests so overnight runs are less likely to trip provider RPM/TPM limits.
    if (itemDelayMs > 0 && i < candidates.length - 1) {
      await sleep(itemDelayMs);
    }
  }

  console.log("\nEnrichment complete");
  console.log(`processed: ${candidates.length}`);
  console.log(`succeeded: ${succeeded}`);
  console.log(`failed:    ${failed}`);
  console.log(`repairs:   ${totalRepairs}`);
  console.log(`warnings:  ${totalWarnings}`);
}

runEnrichmentJob();
