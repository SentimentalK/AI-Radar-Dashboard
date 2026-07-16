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
  };
}

export function listSources(filters?: { enabled?: boolean }): ApiSource[] {
  const db = createDb();
  try {
    let query = "SELECT * FROM sources";
    const params: Record<string, any> = {};

    if (filters && filters.enabled !== undefined) {
      query += " WHERE enabled = @enabled";
      params.enabled = filters.enabled ? 1 : 0;
    }

    query += " ORDER BY type ASC, name ASC";

    const rows = db.prepare(query).all(params) as DbSourceRow[];
    return rows.map(mapRowToApiSource);
  } finally {
    db.close();
  }
}
