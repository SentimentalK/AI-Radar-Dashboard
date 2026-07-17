import { createDb } from "./client";
import type { AiRadarCard } from "../llm/schema";

export type EnrichmentCandidate = {
  id: string;
  sourceId: string;
  sourceType: string;
  sourceName: string | null;
  title: string;
  url: string;
  publishedAt: string | null;
  extractedContent: string;
};

export function listEnrichmentCandidates(input?: {
  limit?: number;
  retryFailed?: boolean;
}): EnrichmentCandidate[] {
  const db = createDb();
  const limit = input?.limit !== undefined ? Math.max(input.limit, 1) : 10;
  const retryFailed = input?.retryFailed ?? false;

  try {
    let query = "";
    if (retryFailed) {
      // retryFailed = true: select all items with extracted content that are not successfully enriched,
      // including items with enrichment_error IS NOT NULL.
      query = `
        SELECT 
          items.id,
          items.source_id as sourceId,
          items.source_type as sourceType,
          sources.name as sourceName,
          items.title,
          items.url,
          items.published_at as publishedAt,
          items.extracted_content as extractedContent
        FROM items
        LEFT JOIN sources ON sources.id = items.source_id
        WHERE items.extracted_content IS NOT NULL
          AND items.enriched_at IS NULL
        ORDER BY COALESCE(items.published_at, items.fetched_at) DESC,
                 items.extracted_at DESC,
                 items.id DESC
        LIMIT ?
      `;
    } else {
      // retryFailed = false (default): select items with extracted content where enriched_at is null
      // AND enrichment_error is also null (excluding previously failed items).
      query = `
        SELECT 
          items.id,
          items.source_id as sourceId,
          items.source_type as sourceType,
          sources.name as sourceName,
          items.title,
          items.url,
          items.published_at as publishedAt,
          items.extracted_content as extractedContent
        FROM items
        LEFT JOIN sources ON sources.id = items.source_id
        WHERE items.extracted_content IS NOT NULL
          AND items.enriched_at IS NULL
          AND items.enrichment_error IS NULL
        ORDER BY COALESCE(items.published_at, items.fetched_at) DESC,
                 items.extracted_at DESC,
                 items.id DESC
        LIMIT ?
      `;
    }

    const rows = db.prepare(query).all(limit) as any[];
    return rows.map((r) => ({
      id: r.id,
      sourceId: r.sourceId,
      sourceType: r.sourceType,
      sourceName: r.sourceName ?? null,
      title: r.title,
      url: r.url,
      publishedAt: r.publishedAt ?? null,
      extractedContent: r.extractedContent,
    }));
  } finally {
    db.close();
  }
}

export function saveEnrichmentSuccess(input: {
  itemId: string;
  card: AiRadarCard;
  provider: string;
  model: string;
}): void {
  const db = createDb();
  try {
    const { itemId, card, provider, model } = input;
    const modelString = `${provider}/${model}`;
    const timestamp = new Date().toISOString();

    // 1. Normalize tags
    const normalizedTags = (card.tags || [])
      .map((t) => t.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 64))
      .filter((t) => t.length > 0);
    const uniqueTags = Array.from(new Set(normalizedTags));

    // 2. Execute database transaction for successful enrichment and tags replacement
    const tx = db.transaction(() => {
      // Update item enrichment details
      db.prepare(`
        UPDATE items
        SET
          one_line_summary = ?,
          what_it_is = ?,
          problem_it_solves = ?,
          how_it_works = ?,
          why_now = ?,
          advantages_json = ?,
          limitations_json = ?,
          alternatives_or_related_json = ?,
          engineering_relevance_score = ?,
          recommended_action = ?,
          category = ?,
          maturity = ?,
          confidence = ?,
          enrichment_model = ?,
          enriched_at = ?,
          enrichment_error = NULL,
          updated_at = ?
        WHERE id = ?
      `).run(
        card.one_line_summary,
        card.what_it_is,
        card.problem_it_solves,
        card.how_it_works,
        card.why_now,
        JSON.stringify(card.advantages),
        JSON.stringify(card.limitations),
        JSON.stringify(card.alternatives_or_related),
        card.engineering_relevance_score,
        card.recommended_action,
        card.category,
        card.maturity,
        card.confidence,
        modelString,
        timestamp,
        timestamp,
        itemId
      );

      // Replace item tags (handles empty tag arrays safely)
      db.prepare("DELETE FROM item_tags WHERE item_id = ?").run(itemId);
      for (const name of uniqueTags) {
        db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)").run(name);
        const tagRow = db.prepare("SELECT id FROM tags WHERE name = ?").get(name) as { id: number };
        const tagId = tagRow.id;
        db.prepare("INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)").run(itemId, tagId);
      }
    });

    tx();
  } finally {
    db.close();
  }
}

export function markEnrichmentFailure(input: {
  itemId: string;
  provider: string;
  model: string;
  error: string;
}): void {
  const db = createDb();
  try {
    const { itemId, provider, model, error } = input;
    const modelString = `${provider}/${model}`;
    const timestamp = new Date().toISOString();

    db.prepare(`
      UPDATE items
      SET
        enrichment_error = ?,
        enrichment_model = ?,
        updated_at = ?
      WHERE id = ?
    `).run(error, modelString, timestamp, itemId);
  } finally {
    db.close();
  }
}
