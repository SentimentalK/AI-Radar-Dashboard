import Database from "better-sqlite3";
import crypto from "node:crypto";

export function startSyncRun(input: {
  db: Database.Database;
  jobType: string;
  sourceId?: string | null;
}): string {
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  const stmt = input.db.prepare(`
    INSERT INTO sync_runs (
      id,
      job_type,
      source_id,
      started_at,
      status
    )
    VALUES (
      @id,
      @jobType,
      @sourceId,
      @startedAt,
      'running'
    )
  `);

  stmt.run({
    id: runId,
    jobType: input.jobType,
    sourceId: input.sourceId ?? null,
    startedAt,
  });

  return runId;
}

export function finishSyncRun(input: {
  db: Database.Database;
  runId: string;
  status: "success" | "failed" | "partial";
  itemsFetched?: number;
  itemsInserted?: number;
  itemsUpdated?: number;
  itemsEnriched?: number;
  error?: string | null;
  metadata?: Record<string, unknown>;
}): void {
  const finishedAt = new Date().toISOString();

  const stmt = input.db.prepare(`
    UPDATE sync_runs
    SET
      finished_at = @finishedAt,
      status = @status,
      items_fetched = @itemsFetched,
      items_inserted = @itemsInserted,
      items_updated = @itemsUpdated,
      items_enriched = @itemsEnriched,
      error = @error,
      metadata_json = @metadataJson
    WHERE id = @runId
  `);

  stmt.run({
    runId: input.runId,
    finishedAt,
    status: input.status,
    itemsFetched: input.itemsFetched ?? 0,
    itemsInserted: input.itemsInserted ?? 0,
    itemsUpdated: input.itemsUpdated ?? 0,
    itemsEnriched: input.itemsEnriched ?? 0,
    error: input.error ?? null,
    metadataJson: JSON.stringify(input.metadata ?? {}),
  });
}
