import fs from "node:fs";
import path from "node:path";

export function getDatabasePath(): string {
  const dbPath = process.env.DATABASE_PATH || path.resolve("data/radar.sqlite");
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return dbPath;
}
