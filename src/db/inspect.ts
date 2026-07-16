import dotenv from "dotenv";
import { createDb } from "./client";

dotenv.config();

function inspect() {
  console.log("AI Radar DB inspect");
  const db = createDb();
  const dbPath = db.name;
  console.log(`Database: ${dbPath}\n`);

  try {
    const sourcesCount = db.prepare("SELECT COUNT(*) as count FROM sources").get() as { count: number };
    const itemsCount = db.prepare("SELECT COUNT(*) as count FROM items").get() as { count: number };
    const tagsCount = db.prepare("SELECT COUNT(*) as count FROM tags").get() as { count: number };
    const dailyBriefsCount = db.prepare("SELECT COUNT(*) as count FROM daily_briefs").get() as { count: number };
    const syncRunsCount = db.prepare("SELECT COUNT(*) as count FROM sync_runs").get() as { count: number };

    console.log(`sources: ${sourcesCount.count}`);
    console.log(`items: ${itemsCount.count}`);
    console.log(`tags: ${tagsCount.count}`);
    console.log(`daily_briefs: ${dailyBriefsCount.count}`);
    console.log(`sync_runs: ${syncRunsCount.count}`);
  } catch (error) {
    console.error("Database inspection failed:", error);
    process.exit(1);
  } finally {
    db.close();
  }
}

inspect();
