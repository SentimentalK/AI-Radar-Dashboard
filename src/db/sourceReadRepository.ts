import { createDb } from "./client";
import { ApiSource } from "../shared/apiTypes";
import { parseJsonObject } from "./helpers";

interface DbSourceRow {
  id: string;
  name: string;
  type: string;
  url: string | null;
  fetch_method: string;
  enabled: number;
  config_json: string;
  created_at: string;
  updated_at: string;
  last_run_status?: string | null;
  last_run_at?: string | null;
  last_run_error?: string | null;
}

function mapRowToApiSource(row: DbSourceRow): ApiSource {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    url: row.url,
    fetchMethod: row.fetch_method,
    enabled: row.enabled === 1,
    config: parseJsonObject(row.config_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastRunStatus: row.last_run_status ?? null,
    lastRunAt: row.last_run_at ?? null,
    lastRunError: row.last_run_error ?? null,
  };
}

export function listSources(filters?: { enabled?: boolean }): ApiSource[] {
  const db = createDb();
  try {
    const params: Record<string, any> = {};
    let whereClause = "";

    if (filters && filters.enabled !== undefined) {
      whereClause = "WHERE sources.enabled = @enabled";
      params.enabled = filters.enabled ? 1 : 0;
    }

    const query = `
      SELECT 
        sources.*,
        sr.status as last_run_status,
        sr.started_at as last_run_at,
        sr.error as last_run_error
      FROM sources
      LEFT JOIN (
        SELECT source_id, status, started_at, error,
               ROW_NUMBER() OVER (PARTITION BY source_id ORDER BY started_at DESC) as rn
        FROM sync_runs
      ) sr ON sr.source_id = sources.id AND sr.rn = 1
      ${whereClause}
      ORDER BY sources.type ASC, sources.name ASC
    `;

    const rows = db.prepare(query).all(params) as DbSourceRow[];
    return rows.map(mapRowToApiSource);
  } finally {
    db.close();
  }
}
