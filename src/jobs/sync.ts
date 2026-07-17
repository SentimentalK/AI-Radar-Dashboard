import { loadEnabledSources } from "../sources/loadSources";
import { getAdapter } from "../sources/registry";
import { validateRawSourceItem } from "../sources/validateRawItem";
import { createItemHash } from "../sources/hash";
import { createItemId, insertRawItem } from "../db/itemRepository";
import { startSyncRun, finishSyncRun } from "../db/syncRunRepository";
import { createDb } from "../db/client";

async function runSync() {
  console.log("AI Radar Sync\n");

  let enabledSources;
  try {
    enabledSources = loadEnabledSources();
  } catch (err) {
    console.error("Failed to load enabled sources from database:", err);
    process.exit(1);
  }

  console.log(`Loaded enabled sources: ${enabledSources.length}\n`);

  // Sort sources dynamically by config.priority (defaulting to 999)
  enabledSources.sort((a, b) => {
    const configA = (a.config || {}) as Record<string, any>;
    const configB = (b.config || {}) as Record<string, any>;
    const priorityA = configA.priority !== undefined ? Number(configA.priority) : 999;
    const priorityB = configB.priority !== undefined ? Number(configB.priority) : 999;
    return priorityA - priorityB;
  });

  let succeededSourcesCount = 0;
  let failedSourcesCount = 0;
  let totalFetchedCount = 0;
  let totalInsertedCount = 0;

  for (const source of enabledSources) {
    const db = createDb();
    let runId: string | null = null;
    let fetched = 0;
    let inserted = 0;

    try {
      // Initialize the run state log entry
      runId = startSyncRun({ db, jobType: "sync", sourceId: source.id });

      // Resolve registered adapter (will throw error if unregistered)
      const adapter = getAdapter(source.fetchMethod);

      // Perform fetch (can fail on network timeout or parse failure)
      const rawItems = await adapter.fetchItems(source);
      fetched = rawItems.length;

      // Idempotently insert fetched items
      for (const item of rawItems) {
        validateRawSourceItem(item);
        const hash = createItemHash({ sourceId: item.sourceId, url: item.url });
        const itemId = createItemId();

        const wasInserted = insertRawItem(db, {
          id: itemId,
          sourceId: item.sourceId,
          sourceType: item.sourceType,
          title: item.title,
          url: item.url,
          author: item.author,
          publishedAt: item.publishedAt,
          rawExcerpt: item.rawExcerpt,
          rawContent: item.rawContent,
          hash,
        });

        if (wasInserted) {
          inserted++;
        }
      }

      // Record successful complete execution
      finishSyncRun({
        db,
        runId,
        status: "success",
        itemsFetched: fetched,
        itemsInserted: inserted,
      });

      succeededSourcesCount++;
      totalFetchedCount += fetched;
      totalInsertedCount += inserted;

      const skipped = fetched - inserted;
      console.log(`[${source.id}] fetched=${fetched} inserted=${inserted} skipped=${skipped} status=success`);
    } catch (err) {
      failedSourcesCount++;
      const errorMessage = (err as Error).message;
      console.error(`[${source.id}] failed: ${errorMessage}`);

      if (runId) {
        try {
          finishSyncRun({
            db,
            runId,
            status: "failed",
            error: errorMessage,
            itemsFetched: 0,
            itemsInserted: 0,
          });
        } catch (dbErr) {
          console.error(`Failed to update SQLite failed run entry for ${source.id}:`, dbErr);
        }
      }
    } finally {
      db.close();
    }
  }

  console.log("\nSync complete");
  console.log(`sources succeeded: ${succeededSourcesCount}`);
  console.log(`sources failed: ${failedSourcesCount}`);
  console.log(`items fetched: ${totalFetchedCount}`);
  console.log(`items inserted: ${totalInsertedCount}`);

  // Exit with error code 1 if and only if all enabled sources fail to execute
  if (enabledSources.length > 0 && succeededSourcesCount === 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSync();
