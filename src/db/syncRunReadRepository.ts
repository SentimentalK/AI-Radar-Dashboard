import { createDb } from "./client";
import { ApiSyncRun } from "../shared/apiTypes";
import { parseJsonObject } from "./helpers";

interface DbSyncRunRow {
  id: string;
  job_type: string;
  source_id: string | null;
  started_at: string;
  finished_at: string | null;
  status: string;
  items_fetched: number;
  items_inserted: number;
  items_updated: number;
  items_enriched: number;
  error: string | null;
  metadata_json: string;
}

function mapRowToApiSyncRun(row: DbSyncRunRow): ApiSyncRun {
  return {
    id: row.id,
    jobType: row.job_type,
    sourceId: row.source_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    status: row.status,
    itemsFetched: row.items_fetched,
    itemsInserted: row.items_inserted,
    itemsUpdated: row.items_updated,
    itemsEnriched: row.items_enriched,
    error: row.error,
    metadata: parseJsonObject(row.metadata_json),
  };
}

export type ListSyncRunsFilters = {
  status?: string;
  sourceId?: string;
  limit?: number;
  offset?: number;
};

export function listSyncRuns(filters?: ListSyncRunsFilters): {
  runs: ApiSyncRun[];
  total: number;
  limit: number;
  offset: number;
} {
  const db = createDb();
  try {
    const whereClauses: string[] = [];
    const params: Record<string, any> = {};

    if (filters?.status) {
      whereClauses.push("status = @status");
      params.status = filters.status;
    }
    if (filters?.sourceId) {
      whereClauses.push("source_id = @sourceId");
      params.sourceId = filters.sourceId;
    }

    const whereStr = whereClauses.length > 0 ? " WHERE " + whereClauses.join(" AND ") : "";

    // Count total rows
    const countSql = `SELECT COUNT(*) as count FROM sync_runs ${whereStr}`;
    const countRow = db.prepare(countSql).get(params) as { count: number };
    const total = countRow.count;

    // Clamp pagination constraints
    const limit = filters?.limit !== undefined ? Math.min(Math.max(filters.limit, 1), 200) : 50;
    const offset = filters?.offset !== undefined ? Math.max(filters.offset, 0) : 0;

    const selectSql = `
      SELECT * 
      FROM sync_runs
      ${whereStr}
      ORDER BY started_at DESC
      LIMIT @limit OFFSET @offset
    `;

    const rows = db.prepare(selectSql).all({ ...params, limit, offset }) as DbSyncRunRow[];

    return {
      runs: rows.map(mapRowToApiSyncRun),
      total,
      limit,
      offset,
    };
  } finally {
    db.close();
  }
}
