import Database from "better-sqlite3";
import { createDb } from "./client";
import { ApiItem, ApiTimelineGroup } from "../shared/apiTypes";
import { parseJsonArray } from "./helpers";
import { SourceType, FetchMethod } from "../shared/types";

interface DbItemRow {
  id: string;
  source_id: string;
  source_type: string;
  title: string;
  url: string;
  author: string | null;
  published_at: string | null;
  fetched_at: string;
  
  raw_excerpt: string | null;
  raw_content: string | null;
  
  extraction_method: string | null;
  extracted_content: string | null;
  extracted_at: string | null;
  extraction_error: string | null;
  
  one_line_summary: string | null;
  what_it_is: string | null;
  problem_it_solves: string | null;
  how_it_works: string | null;
  why_now: string | null;
  advantages_json: string | null;
  limitations_json: string | null;
  alternatives_or_related_json: string | null;
  
  engineering_relevance_score: number | null;
  recommended_action: string | null;
  category: string | null;
  maturity: string | null;
  confidence: string | null;
  
  enrichment_model: string | null;
  enriched_at: string | null;
  enrichment_error: string | null;
  
  hash: string;
  created_at: string;
  updated_at: string;
  source_name?: string | null;
}

function mapRowToApiItem(row: DbItemRow, tags: string[] = []): ApiItem {
  return {
    id: row.id,
    sourceId: row.source_id,
    sourceType: row.source_type,
    title: row.title,
    url: row.url,
    author: row.author,
    publishedAt: row.published_at,
    fetchedAt: row.fetched_at,
    rawExcerpt: row.raw_excerpt,
    rawContent: row.raw_content,
    extractionMethod: row.extraction_method,
    extractedContent: row.extracted_content,
    extractedAt: row.extracted_at,
    extractionError: row.extraction_error,
    oneLineSummary: row.one_line_summary,
    whatItIs: row.what_it_is,
    problemItSolves: row.problem_it_solves,
    howItWorks: row.how_it_works,
    whyNow: row.why_now,
    advantages: parseJsonArray(row.advantages_json),
    limitations: parseJsonArray(row.limitations_json),
    alternativesOrRelated: parseJsonArray(row.alternatives_or_related_json),
    engineeringRelevanceScore: row.engineering_relevance_score,
    recommendedAction: row.recommended_action,
    category: row.category,
    maturity: row.maturity,
    confidence: row.confidence,
    enrichmentModel: row.enrichment_model,
    enrichedAt: row.enriched_at,
    enrichmentError: row.enrichment_error,
    hash: row.hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sourceName: row.source_name ?? null,
    tags,
  };
}

export type ListItemsFilters = {
  sourceType?: string;
  sourceId?: string;
  category?: string;
  recommendedAction?: string;
  minRelevance?: number;
  q?: string;
  limit?: number;
  offset?: number;
};

export function listItems(filters: ListItemsFilters): {
  items: ApiItem[];
  total: number;
  limit: number;
  offset: number;
} {
  const db = createDb();
  try {
    const whereClauses: string[] = [];
    const params: Record<string, any> = {};

    if (filters.sourceType) {
      whereClauses.push("items.source_type = @sourceType");
      params.sourceType = filters.sourceType;
    }
    if (filters.sourceId) {
      whereClauses.push("items.source_id = @sourceId");
      params.sourceId = filters.sourceId;
    }
    if (filters.category) {
      whereClauses.push("items.category = @category");
      params.category = filters.category;
    }
    if (filters.recommendedAction) {
      whereClauses.push("items.recommended_action = @recommendedAction");
      params.recommendedAction = filters.recommendedAction;
    }
    if (filters.minRelevance !== undefined) {
      whereClauses.push("items.engineering_relevance_score >= @minRelevance");
      params.minRelevance = filters.minRelevance;
    }
    if (filters.q) {
      whereClauses.push("(items.title LIKE @q OR items.raw_excerpt LIKE @q OR sources.name LIKE @q)");
      params.q = `%${filters.q}%`;
    }

    const whereStr = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

    // Count total matches
    const countSql = `
      SELECT COUNT(*) as count 
      FROM items 
      LEFT JOIN sources ON sources.id = items.source_id
      ${whereStr}
    `;
    const countRow = db.prepare(countSql).get(params) as { count: number };
    const total = countRow.count;

    // Retrieve paginated items (capped at 200)
    const limit = filters.limit !== undefined ? Math.min(Math.max(filters.limit, 1), 200) : 50;
    const offset = filters.offset !== undefined ? Math.max(filters.offset, 0) : 0;

    const selectSql = `
      SELECT 
        items.*, 
        sources.name as source_name 
      FROM items 
      LEFT JOIN sources ON sources.id = items.source_id
      ${whereStr}
      ORDER BY COALESCE(items.published_at, items.fetched_at) DESC
      LIMIT @limit OFFSET @offset
    `;

    const rows = db.prepare(selectSql).all({ ...params, limit, offset }) as DbItemRow[];

    const itemIds = rows.map((r) => r.id);
    const tagsMap = new Map<string, string[]>();
    if (itemIds.length > 0) {
      const placeholders = itemIds.map(() => "?").join(",");
      const tagsSql = `
        SELECT item_tags.item_id, tags.name 
        FROM item_tags 
        JOIN tags ON tags.id = item_tags.tag_id 
        WHERE item_tags.item_id IN (${placeholders})
      `;
      const tagsRows = db.prepare(tagsSql).all(itemIds) as { item_id: string; name: string }[];
      for (const tRow of tagsRows) {
        let list = tagsMap.get(tRow.item_id);
        if (!list) {
          list = [];
          tagsMap.set(tRow.item_id, list);
        }
        list.push(tRow.name);
      }
    }

    return {
      items: rows.map((row) => mapRowToApiItem(row, tagsMap.get(row.id) || [])),
      total,
      limit,
      offset,
    };
  } finally {
    db.close();
  }
}

export function getItemById(id: string): ApiItem | null {
  const db = createDb();
  try {
    const row = db.prepare(`
      SELECT 
        items.*, 
        sources.name as source_name 
      FROM items 
      LEFT JOIN sources ON sources.id = items.source_id
      WHERE items.id = ?
    `).get(id) as DbItemRow | undefined;

    if (!row) return null;

    const tagsRows = db.prepare(`
      SELECT tags.name 
      FROM item_tags 
      JOIN tags ON tags.id = item_tags.tag_id 
      WHERE item_tags.item_id = ?
    `).all(id) as { name: string }[];
    const tags = tagsRows.map((r) => r.name);

    return mapRowToApiItem(row, tags);
  } finally {
    db.close();
  }
}

export function listTimelineGroups(input: {
  days?: number;
  sourceType?: string;
  category?: string;
  recommendedAction?: string;
  minRelevance?: number;
  limitPerDay?: number;
  q?: string;
}): ApiTimelineGroup[] {
  const db = createDb();
  
  const days = input.days !== undefined ? Math.min(Math.max(input.days, 1), 90) : 7;
  const limitPerDay = input.limitPerDay !== undefined ? Math.min(Math.max(input.limitPerDay, 1), 200) : 50;

  try {
    const whereClauses: string[] = [];
    const params: Record<string, any> = {};

    if (input.sourceType) {
      whereClauses.push("items.source_type = @sourceType");
      params.sourceType = input.sourceType;
    }
    if (input.category) {
      whereClauses.push("items.category = @category");
      params.category = input.category;
    }
    if (input.recommendedAction) {
      whereClauses.push("items.recommended_action = @recommendedAction");
      params.recommendedAction = input.recommendedAction;
    }
    if (input.minRelevance !== undefined) {
      whereClauses.push("items.engineering_relevance_score >= @minRelevance");
      params.minRelevance = input.minRelevance;
    }
    if (input.q) {
      whereClauses.push("(items.title LIKE @q OR items.raw_excerpt LIKE @q OR sources.name LIKE @q)");
      params.q = `%${input.q}%`;
    }

    const whereStr = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

    // Query a large buffer of recent items to group in-memory
    const queryLimit = Math.max(days * limitPerDay, 500);
    const selectSql = `
      SELECT 
        items.*, 
        sources.name as source_name 
      FROM items 
      LEFT JOIN sources ON sources.id = items.source_id
      ${whereStr}
      ORDER BY COALESCE(items.published_at, items.fetched_at) DESC
      LIMIT @queryLimit
    `;



    const rows = db.prepare(selectSql).all({ ...params, queryLimit }) as DbItemRow[];

    const itemIds = rows.map((r) => r.id);
    const tagsMap = new Map<string, string[]>();
    if (itemIds.length > 0) {
      const placeholders = itemIds.map(() => "?").join(",");
      const tagsSql = `
        SELECT item_tags.item_id, tags.name 
        FROM item_tags 
        JOIN tags ON tags.id = item_tags.tag_id 
        WHERE item_tags.item_id IN (${placeholders})
      `;
      const tagsRows = db.prepare(tagsSql).all(itemIds) as { item_id: string; name: string }[];
      for (const tRow of tagsRows) {
        let list = tagsMap.get(tRow.item_id);
        if (!list) {
          list = [];
          tagsMap.set(tRow.item_id, list);
        }
        list.push(tRow.name);
      }
    }

    const apiItems = rows.map((row) => mapRowToApiItem(row, tagsMap.get(row.id) || []));

    // Group items by date string (YYYY-MM-DD)
    const groupsMap = new Map<string, ApiItem[]>();
    for (const item of apiItems) {
      const dateStr = getLocalDateString(item.publishedAt || item.fetchedAt);
      
      let list = groupsMap.get(dateStr);
      if (!list) {
        list = [];
        groupsMap.set(dateStr, list);
      }
      
      if (list.length < limitPerDay) {
        list.push(item);
      }
    }

    // Sort dates descending and slice to requested days
    const sortedDates = Array.from(groupsMap.keys()).sort((a, b) => b.localeCompare(a));
    const activeDates = sortedDates.slice(0, days);

    return activeDates.map((date) => ({
      date,
      items: groupsMap.get(date) || [],
    }));
  } finally {
    db.close();
  }
}

function getLocalDateString(isoStr: string | null): string {
  if (!isoStr) return "Unknown Date";
  try {
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return "Unknown Date";
    return date.toISOString().split("T")[0];
  } catch {
    return "Unknown Date";
  }
}
