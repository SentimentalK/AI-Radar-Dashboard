import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

dotenv.config();

function parseArgs() {
  const args = process.argv.slice(2);
  let fresh = false;
  let skipSeed = false;
  let skipExtract = false;
  let noEnrich = false;
  let enrichLimit = parseInt(process.env.ENRICH_BATCH_SIZE || "10", 10);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--fresh") {
      fresh = true;
    } else if (args[i] === "--skip-seed") {
      skipSeed = true;
    } else if (args[i] === "--skip-extract") {
      skipExtract = true;
    } else if (args[i] === "--no-enrich") {
      noEnrich = true;
    } else if (args[i] === "--enrich-limit" && args[i + 1]) {
      const val = parseInt(args[i + 1], 10);
      if (!isNaN(val)) {
        enrichLimit = val;
      }
      i++;
    }
  }

  return { fresh, skipSeed, skipExtract, noEnrich, enrichLimit };
}

function runCommand(command: string) {
  console.log(`> Executing: ${command}`);
  try {
    execSync(command, { stdio: "inherit" });
    return "ok";
  } catch (err) {
    console.error(`Command failed: ${command}`);
    return "failed";
  }
}

async function runDataPull() {
  const startTime = new Date();
  const { fresh, skipSeed, skipExtract, noEnrich, enrichLimit } = parseArgs();

  console.log("=================================");
  console.log("AI Radar Data Pull Runner");
  console.log("=================================\n");

  const dbPath = process.env.DATABASE_PATH || "data/radar.sqlite";
  const steps: Record<string, string> = {};

  // 1. Fresh Database reset (Danger zone)
  if (fresh) {
    console.log("WARNING: --fresh flag specified. Resetting SQLite files...");
    const dir = path.dirname(dbPath);
    const base = path.basename(dbPath);
    const walPath = path.join(dir, `${base}-wal`);
    const shmPath = path.join(dir, `${base}-shm`);

    for (const file of [dbPath, walPath, shmPath]) {
      if (fs.existsSync(file)) {
        console.log(`Deleting file: ${file}`);
        try {
          fs.unlinkSync(file);
        } catch (err) {
          console.error(`Failed to delete ${file}: ${(err as Error).message}`);
        }
      }
    }
    console.log("Database reset complete.\n");
    steps["fresh_reset"] = "ok";
  }

  // 2. Run migrations
  steps["migrate"] = runCommand("npm run db:migrate");
  console.log("");

  // 3. Run seeds
  if (!skipSeed) {
    steps["seed"] = runCommand("npm run db:seed");
    console.log("");
  } else {
    console.log("Skipping database seeding.\n");
    steps["seed"] = "skipped";
  }

  // 4. Run sync
  steps["sync"] = runCommand("npm run sync");
  console.log("");

  // 5. Run extract
  if (!skipExtract) {
    steps["extract"] = runCommand("npm run extract");
    console.log("");
  } else {
    console.log("Skipping content extraction.\n");
    steps["extract"] = "skipped";
  }

  // 6. Run enrich
  const hasGroqKey = !!process.env.GROQ_API_KEY;
  if (noEnrich) {
    console.log("Enrichment skipped (--no-enrich specified).\n");
    steps["enrich"] = "skipped";
  } else if (!hasGroqKey) {
    console.log("No GROQ_API_KEY found in environment. Skipping enrichment.\n");
    steps["enrich"] = "skipped";
  } else {
    console.log(`Running enrichment with limit ${enrichLimit}...`);
    steps["enrich"] = runCommand(`npm run enrich -- --limit ${enrichLimit}`);
    console.log("");
  }

  // 7. Run inspect
  steps["inspect"] = runCommand("npm run db:inspect");
  console.log("");

  // 8. Run checkpoint
  steps["checkpoint"] = runCommand("npm run db:checkpoint");
  console.log("");

  // 9. Generate run report JSON
  const endTime = new Date();
  const report = {
    startedAt: startTime.toISOString(),
    endedAt: endTime.toISOString(),
    steps,
  };

  try {
    fs.mkdirSync("reports", { recursive: true });
    const timestamp = startTime.toISOString().replace(/[:.]/g, "-");
    const reportPath = path.join("reports", `data-pull-${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.log(`Data pull report saved to: ${reportPath}`);
  } catch (err) {
    console.error(`Failed to save report file: ${(err as Error).message}`);
  }

  console.log("\n=================================");
  console.log("Data Pull Execution Finished");
  console.log("=================================");
}

runDataPull();
