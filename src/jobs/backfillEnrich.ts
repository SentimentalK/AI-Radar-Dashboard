import dotenv from "dotenv";
import { execSync } from "node:child_process";
import { listExtractionCandidates } from "../db/extractionRepository";
import { listEnrichmentCandidates } from "../db/enrichmentRepository";

dotenv.config();

function parseArgs() {
  const args = process.argv.slice(2);
  // Lockstep defaults: extract a small newest batch, then enrich the same size
  // so older extracted backlog does not jump ahead of fresher items.
  let batch = parseInt(process.env.BACKFILL_BATCH || "5", 10);
  let extractLimit: number | null = null;
  let enrichLimit: number | null = null;
  let roundSleepMs = parseInt(process.env.BACKFILL_ROUND_SLEEP_MS || "5000", 10);
  let maxRounds = parseInt(process.env.BACKFILL_MAX_ROUNDS || "0", 10); // 0 = until done
  let retryFailed = process.env.ENRICH_RETRY_FAILED === "true";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    if (arg === "--batch" && next) {
      const n = parseInt(next, 10);
      if (!isNaN(n)) batch = n;
      i++;
    } else if (arg === "--extract-limit" && next) {
      const n = parseInt(next, 10);
      if (!isNaN(n)) extractLimit = n;
      i++;
    } else if (arg === "--enrich-limit" && next) {
      const n = parseInt(next, 10);
      if (!isNaN(n)) enrichLimit = n;
      i++;
    } else if (arg === "--round-sleep-ms" && next) {
      const n = parseInt(next, 10);
      if (!isNaN(n)) roundSleepMs = n;
      i++;
    } else if (arg === "--max-rounds" && next) {
      const n = parseInt(next, 10);
      if (!isNaN(n)) maxRounds = n;
      i++;
    } else if (arg === "--retry-failed") {
      retryFailed = true;
    }
  }

  const resolvedExtract = Math.min(Math.max(extractLimit ?? batch, 1), 200);
  const resolvedEnrich = Math.max(enrichLimit ?? batch, 1);

  return {
    extractLimit: resolvedExtract,
    enrichLimit: resolvedEnrich,
    roundSleepMs: Math.max(roundSleepMs, 0),
    maxRounds: Math.max(maxRounds, 0),
    retryFailed,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runCommand(command: string) {
  console.log(`> ${command}`);
  execSync(command, { stdio: "inherit", env: process.env });
}

function itemStamp(publishedAt: string | null | undefined, fallback?: string | null) {
  return publishedAt || fallback || "(no date)";
}

function describeFrontier(retryFailed: boolean) {
  const nextExtract = listExtractionCandidates({ limit: 1 })[0];
  const nextEnrich = listEnrichmentCandidates({ limit: 1, retryFailed })[0];

  return {
    nextExtract,
    nextEnrich,
    extractPending: Boolean(nextExtract),
    enrichPending: Boolean(nextEnrich),
  };
}

async function runBackfill() {
  const opts = parseArgs();
  const startedAt = new Date();

  console.log("=================================");
  console.log("AI Radar Extract → Enrich Backfill");
  console.log("Mode: newest-first (ignore backlog age / cache size)");
  console.log("=================================");
  console.log(`extractLimit:   ${opts.extractLimit}`);
  console.log(`enrichLimit:    ${opts.enrichLimit}`);
  console.log(`roundSleepMs:   ${opts.roundSleepMs}`);
  console.log(`maxRounds:      ${opts.maxRounds || "∞"}`);
  console.log(`retryFailed:    ${opts.retryFailed}`);
  console.log(`LLM_PROVIDER:   ${process.env.LLM_PROVIDER || "mock"}`);
  console.log(`ENRICH_MAX_CHARS: ${process.env.ENRICH_MAX_CHARS || "30000"}`);
  console.log(`ENRICH_ITEM_DELAY_MS: ${process.env.ENRICH_ITEM_DELAY_MS || "0"}`);
  console.log("");
  console.log(
    "Each round: extract newest pending → enrich newest pending (by published_at/fetched_at DESC)."
  );
  console.log("");

  let round = 0;

  while (true) {
    round++;
    if (opts.maxRounds > 0 && round > opts.maxRounds) {
      console.log(`Reached --max-rounds=${opts.maxRounds}. Stopping.`);
      break;
    }

    const before = describeFrontier(opts.retryFailed);
    if (!before.extractPending && !before.enrichPending) {
      console.log("No extract or enrich candidates left. Done.");
      break;
    }

    console.log(`\n----- Round ${round} (newest-first) -----`);
    if (before.nextExtract) {
      console.log(
        `next extract: ${itemStamp(before.nextExtract.publishedAt, before.nextExtract.fetchedAt)} | ${before.nextExtract.title}`
      );
    } else {
      console.log("next extract: (none)");
    }
    if (before.nextEnrich) {
      console.log(
        `next enrich:  ${itemStamp(before.nextEnrich.publishedAt)} | ${before.nextEnrich.title}`
      );
    } else {
      console.log("next enrich:  (none — will extract newest first)");
    }

    // Always clear the newest unextracted items before enriching older extracted backlog.
    if (before.extractPending) {
      runCommand(`npm run extract -- --limit ${opts.extractLimit}`);
      console.log("");
    }

    const afterExtract = describeFrontier(opts.retryFailed);
    if (afterExtract.enrichPending) {
      if (afterExtract.nextEnrich) {
        console.log(
          `enrich frontier: ${itemStamp(afterExtract.nextEnrich.publishedAt)} | ${afterExtract.nextEnrich.title}`
        );
      }
      const enrichCmd = opts.retryFailed
        ? `npm run enrich -- --limit ${opts.enrichLimit} --retry-failed`
        : `npm run enrich -- --limit ${opts.enrichLimit}`;
      runCommand(enrichCmd);
      console.log("");
    } else if (!before.extractPending) {
      console.log("No enrich candidates after extract. Done.");
      break;
    }

    if (opts.roundSleepMs > 0) {
      console.log(`Sleeping ${opts.roundSleepMs}ms before next round...`);
      await sleep(opts.roundSleepMs);
    }
  }

  const endedAt = new Date();
  const elapsedMin = ((endedAt.getTime() - startedAt.getTime()) / 60000).toFixed(1);
  console.log("\n=================================");
  console.log(`Backfill finished in ${elapsedMin} minutes (${round} rounds)`);
  console.log("=================================");
}

runBackfill().catch((err) => {
  console.error(`Backfill failed: ${(err as Error).message}`);
  process.exit(1);
});
