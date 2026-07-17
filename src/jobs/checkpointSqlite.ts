import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { createDb } from "../db/client";

dotenv.config();

function checkpoint() {
  console.log("AI Radar SQLite Checkpoint\n");
  const db = createDb();
  const dbPath = db.name;

  try {
    console.log(`Checkpointing database: ${dbPath}`);
    db.pragma("wal_checkpoint(FULL)");
    db.pragma("optimize");
    db.close();

    console.log("Checkpoint completed successfully.\n");

    const stats = fs.statSync(dbPath);
    const fileSizeKb = (stats.size / 1024).toFixed(2);
    console.log(`SQLite file size: ${fileSizeKb} KB`);

    const dir = path.dirname(dbPath);
    const base = path.basename(dbPath);
    const walPath = path.join(dir, `${base}-wal`);
    const shmPath = path.join(dir, `${base}-shm`);

    const walExists = fs.existsSync(walPath);
    const shmExists = fs.existsSync(shmPath);

    console.log(`WAL file exists: ${walExists}`);
    console.log(`SHM file exists: ${shmExists}`);

    if (walExists || shmExists) {
      console.warn(
        "\nWarning: radar.sqlite-wal or radar.sqlite-shm still exists. Copy all sqlite files or close writers and checkpoint again."
      );
    } else {
      console.log("\nDatabase is fully merged and ready to be copied as a standalone data artifact!");
    }
  } catch (err) {
    console.error("Checkpoint failed:", err);
    process.exit(1);
  }
}

checkpoint();
