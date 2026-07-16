import { createDb } from "../db/client";
import { SourceConfig } from "./types";
import { validateSourceConfig } from "./validateSource";
import { SourceType, FetchMethod } from "../shared/types";

interface SourceRow {
  id: string;
  name: string;
  type: string;
  url: string | null;
  fetch_method: string;
  enabled: number;
  config_json: string;
}

function mapRowToConfig(row: SourceRow): SourceConfig {
  let config: Record<string, unknown> = {};
  try {
    config = JSON.parse(row.config_json);
  } catch (err) {
    throw new Error(`Failed to parse config_json for source "${row.id}": ${(err as Error).message}`);
  }

  return {
    id: row.id,
    name: row.name,
    type: row.type as SourceType,
    url: row.url,
    fetchMethod: row.fetch_method as FetchMethod,
    enabled: row.enabled === 1,
    config,
  };
}

export function loadEnabledSources(): SourceConfig[] {
  const db = createDb();
  try {
    const rows = db.prepare("SELECT * FROM sources WHERE enabled = 1").all() as SourceRow[];
    return rows.map((row) => {
      const config = mapRowToConfig(row);
      validateSourceConfig(config);
      return config;
    });
  } finally {
    db.close();
  }
}

export function loadAllSources(): SourceConfig[] {
  const db = createDb();
  try {
    const rows = db.prepare("SELECT * FROM sources").all() as SourceRow[];
    return rows.map((row) => {
      const config = mapRowToConfig(row);
      validateSourceConfig(config);
      return config;
    });
  } finally {
    db.close();
  }
}
