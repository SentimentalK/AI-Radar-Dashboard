import Database from "better-sqlite3";
import { getDatabasePath } from "./paths";

export function createDb() {
  const db = new Database(getDatabasePath());

  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");

  return db;
}
