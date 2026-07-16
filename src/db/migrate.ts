import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createDb } from "./client";

dotenv.config();

function runMigration() {
  console.log("AI Radar DB migration");
  
  const db = createDb();
  const dbPath = db.name;
  
  try {
    const schemaPath = fileURLToPath(new URL("schema.sql", import.meta.url));
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    
    // Execute all SQL statements inside a single transaction for safety
    db.transaction(() => {
      db.exec(schemaSql);
      
      // Idempotently track schema version 1
      const row = db.prepare("SELECT 1 FROM schema_migrations WHERE version = 1").get();
      if (!row) {
        db.prepare("INSERT INTO schema_migrations (version, name) VALUES (1, 'initial_schema')").run();
      }
    })();
    
    console.log(`Database: ${dbPath}`);
    console.log("Applied schema version 1");
    console.log("Done");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    db.close();
  }
}

runMigration();
