import Database from "better-sqlite3";
import crypto from "node:crypto";

export type InsertRawItemInput = {
  id: string;
  sourceId: string;
  sourceType: string;
  title: string;
  url: string;
  author?: string | null;
  publishedAt?: string | null;
  rawExcerpt?: string | null;
  rawContent?: string | null;
  hash: string;
};

export function createItemId(): string {
  return crypto.randomUUID();
}

export function insertRawItem(db: Database.Database, input: InsertRawItemInput): boolean {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO items (
      id,
      source_id,
      source_type,
      title,
      url,
      author,
      published_at,
      raw_excerpt,
      raw_content,
      hash,
      created_at,
      updated_at
    )
    VALUES (
      @id,
      @sourceId,
      @sourceType,
      @title,
      @url,
      @author,
      @publishedAt,
      @rawExcerpt,
      @rawContent,
      @hash,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
  `);

  const result = stmt.run({
    id: input.id,
    sourceId: input.sourceId,
    sourceType: input.sourceType,
    title: input.title,
    url: input.url,
    author: input.author ?? null,
    publishedAt: input.publishedAt ?? null,
    rawExcerpt: input.rawExcerpt ?? null,
    rawContent: input.rawContent ?? null,
    hash: input.hash,
  });

  return result.changes === 1;
}
