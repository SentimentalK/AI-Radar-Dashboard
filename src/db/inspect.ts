import dotenv from "dotenv";
import fs from "fs";
import { createDb } from "./client";

dotenv.config();

function inspect() {
  console.log("=================================");
  console.log("AI Radar DB inspect");
  console.log("=================================");

  const db = createDb();
  const dbPath = db.name;
  console.log(`Database: ${dbPath}`);

  try {
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      const fileSizeKb = (stats.size / 1024).toFixed(2);
      console.log(`File Size: ${fileSizeKb} KB`);
    } else {
      console.log("File Size: N/A (does not exist on disk yet)");
    }
    console.log("---------------------------------\n");

    // 1. Source stats
    const totalSources = db.prepare("SELECT COUNT(*) as count FROM sources").get() as { count: number };
    const enabledSources = db.prepare("SELECT COUNT(*) as count FROM sources WHERE enabled = 1").get() as { count: number };
    console.log("Sources:");
    console.log(`  Total:   ${totalSources.count}`);
    console.log(`  Enabled: ${enabledSources.count}`);
    console.log("");

    // 2. Ingestion / Items stats
    const totalItems = db.prepare("SELECT COUNT(*) as count FROM items").get() as { count: number };
    console.log(`Items (Total: ${totalItems.count}):`);
    
    const itemsByType = db.prepare("SELECT source_type, COUNT(*) as count FROM items GROUP BY source_type").all() as any[];
    if (itemsByType.length > 0) {
      console.log("  By Type:");
      for (const row of itemsByType) {
        console.log(`    - ${row.source_type}: ${row.count}`);
      }
    }

    const itemsBySource = db.prepare(`
      SELECT source_id, COUNT(*) as count 
      FROM items 
      GROUP BY source_id 
      ORDER BY count DESC 
      LIMIT 10
    `).all() as any[];
    if (itemsBySource.length > 0) {
      console.log("  Top Sources:");
      for (const row of itemsBySource) {
        console.log(`    - ${row.source_id}: ${row.count}`);
      }
    }
    console.log("");

    // 3. Extraction stats
    const extracted = db.prepare("SELECT COUNT(*) as count FROM items WHERE extracted_content IS NOT NULL").get() as { count: number };
    const pendingExtract = db.prepare("SELECT COUNT(*) as count FROM items WHERE extracted_content IS NULL AND extraction_error IS NULL").get() as { count: number };
    const extractErrors = db.prepare("SELECT COUNT(*) as count FROM items WHERE extraction_error IS NOT NULL").get() as { count: number };
    console.log("Extraction Status:");
    console.log(`  Extracted:          ${extracted.count}`);
    console.log(`  Pending Extraction: ${pendingExtract.count}`);
    console.log(`  Extraction Errors:  ${extractErrors.count}`);
    console.log("");

    // 4. Enrichment stats
    const enriched = db.prepare("SELECT COUNT(*) as count FROM items WHERE enriched_at IS NOT NULL").get() as { count: number };
    const pendingEnrich = db.prepare("SELECT COUNT(*) as count FROM items WHERE enriched_at IS NULL AND extracted_content IS NOT NULL AND enrichment_error IS NULL").get() as { count: number };
    const enrichErrors = db.prepare("SELECT COUNT(*) as count FROM items WHERE enrichment_error IS NOT NULL").get() as { count: number };
    console.log("Enrichment Status:");
    console.log(`  Enriched:           ${enriched.count}`);
    console.log(`  Pending Enrichment: ${pendingEnrich.count}`);
    console.log(`  Enrichment Errors:  ${enrichErrors.count}`);
    console.log("");

    // 5. Tag stats
    const totalTags = db.prepare("SELECT COUNT(*) as count FROM tags").get() as { count: number };
    console.log(`Tags (Total: ${totalTags.count}):`);
    const topTags = db.prepare(`
      SELECT tags.name, COUNT(*) as count 
      FROM tags 
      JOIN item_tags ON tags.id = item_tags.tag_id 
      GROUP BY tags.name 
      ORDER BY count DESC 
      LIMIT 5
    `).all() as any[];
    if (topTags.length > 0) {
      console.log("  Top Tags:");
      for (const tag of topTags) {
        console.log(`    - #${tag.name} (${tag.count} items)`);
      }
    }
    console.log("");

    // 6. Latest Ingestions
    const latestRuns = db.prepare(`
      SELECT id, status, started_at, items_fetched, items_inserted 
      FROM sync_runs 
      ORDER BY started_at DESC 
      LIMIT 5
    `).all() as any[];
    if (latestRuns.length > 0) {
      console.log("Latest Sync Runs:");
      for (const run of latestRuns) {
        console.log(`  - Run ${run.id.slice(0, 8)}... | Status: ${run.status} | Fetched: ${run.items_fetched} | Inserted: ${run.items_inserted} | Started: ${run.started_at}`);
      }
    }

  } catch (error) {
    console.error("Database inspection failed:", error);
    process.exit(1);
  } finally {
    db.close();
  }
  console.log("=================================");
}

inspect();
