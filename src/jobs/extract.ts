import dotenv from "dotenv";
import {
  listExtractionCandidates,
  markExtractionSuccess,
  markExtractionFailure,
} from "../db/extractionRepository";
import { extractReadableContent } from "../extraction/extractReadableContent";

dotenv.config();

async function runExtract() {
  console.log("AI Radar Extract\n");

  // Parse CLI flags
  const args = process.argv.slice(2);
  let limit: number | undefined = undefined;
  let includeFailures = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      const val = parseInt(args[i + 1], 10);
      if (!isNaN(val)) {
        limit = val;
      }
      i++;
    } else if (args[i] === "--retry-failures") {
      includeFailures = true;
    }
  }

  let candidates;
  try {
    candidates = listExtractionCandidates({ limit, includeFailures });
  } catch (err) {
    console.error("Failed to load candidates from SQLite:", err);
    process.exit(1);
  }

  console.log(`Loaded candidates: ${candidates.length}\n`);

  let succeededCount = 0;
  let failedCount = 0;

  for (const candidate of candidates) {
    try {
      const result = await extractReadableContent({
        itemId: candidate.id,
        title: candidate.title,
        url: candidate.url,
        rawExcerpt: candidate.rawExcerpt,
        rawContent: candidate.rawContent,
      });

      if (result.success && result.method && result.content !== undefined) {
        markExtractionSuccess({
          itemId: candidate.id,
          method: result.method,
          content: result.content,
        });
        succeededCount++;
        console.log(
          `[success] item=${candidate.id} method=${result.method} chars=${result.content.length} title="${candidate.title}"`
        );
      } else {
        const errorMsg = result.error || "Unknown extraction failure";
        markExtractionFailure({
          itemId: candidate.id,
          error: errorMsg,
        });
        failedCount++;
        console.log(`[failed] item=${candidate.id} error="${errorMsg}" title="${candidate.title}"`);
      }
    } catch (err) {
      failedCount++;
      const systemError = (err as Error).message;
      try {
        markExtractionFailure({
          itemId: candidate.id,
          error: systemError,
        });
      } catch (dbErr) {
        console.error(`Failed to record system error for item ${candidate.id}:`, dbErr);
      }
      console.log(`[failed] item=${candidate.id} error="System exception: ${systemError}" title="${candidate.title}"`);
    }
  }

  console.log("\nExtraction complete");
  console.log(`processed: ${candidates.length}`);
  console.log(`succeeded: ${succeededCount}`);
  console.log(`failed: ${failedCount}`);
}

runExtract();
