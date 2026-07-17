import { createDb } from "./client";

export type ExtractionCandidate = {
  id: string;
  title: string;
  url: string;
  publishedAt: string | null;
  fetchedAt: string | null;
  rawExcerpt: string | null;
  rawContent: string | null;
};

export function listExtractionCandidates(input?: {
  limit?: number;
  includeFailures?: boolean;
}): ExtractionCandidate[] {
  const db = createDb();
  try {
    const limit = input?.limit !== undefined
      ? Math.min(Math.max(input.limit, 1), 200)
      : parseInt(process.env.EXTRACTION_BATCH_SIZE || "25", 10);
      
    const includeFailures = input?.includeFailures === true;

    // Default: extracted_at IS NULL (exclude success/failure attempts)
    // Retry mode: extracted_content IS NULL (allow retrying failed items)
    const sqlFilter = includeFailures
      ? "WHERE extracted_content IS NULL"
      : "WHERE extracted_at IS NULL";

    // Newest-first: always drain the most recent items before older backlog.
    const query = `
      SELECT
        id,
        title,
        url,
        published_at as publishedAt,
        fetched_at as fetchedAt,
        raw_excerpt as rawExcerpt,
        raw_content as rawContent
      FROM items
      ${sqlFilter}
      ORDER BY COALESCE(published_at, fetched_at) DESC, fetched_at DESC, id DESC
      LIMIT ?
    `;

    const rows = db.prepare(query).all(limit) as ExtractionCandidate[];

    return rows;
  } finally {
    db.close();
  }
}

export function markExtractionSuccess(input: {
  itemId: string;
  method: string;
  content: string;
}): void {
  const db = createDb();
  try {
    db.prepare(`
      UPDATE items
      SET
        extracted_content = ?,
        extraction_method = ?,
        extracted_at = CURRENT_TIMESTAMP,
        extraction_error = NULL
      WHERE id = ?
    `).run(input.content, input.method, input.itemId);
  } finally {
    db.close();
  }
}

export function markExtractionFailure(input: {
  itemId: string;
  error: string;
}): void {
  const db = createDb();
  try {
    db.prepare(`
      UPDATE items
      SET
        extracted_content = NULL,
        extraction_method = NULL,
        extracted_at = CURRENT_TIMESTAMP,
        extraction_error = ?
      WHERE id = ?
    `).run(input.error, input.itemId);
  } finally {
    db.close();
  }
}
