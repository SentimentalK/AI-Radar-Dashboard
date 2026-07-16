import { createDb } from "./client";
import { ApiTag } from "../shared/apiTypes";

interface DbTagRow {
  id: number;
  name: string;
  item_count: number;
}

export function listTags(): ApiTag[] {
  const db = createDb();
  try {
    const rows = db.prepare(`
      SELECT
        tags.id,
        tags.name,
        COUNT(item_tags.item_id) AS item_count
      FROM tags
      LEFT JOIN item_tags ON item_tags.tag_id = tags.id
      GROUP BY tags.id, tags.name
      ORDER BY item_count DESC, tags.name ASC
    `).all() as DbTagRow[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      itemCount: row.item_count,
    }));
  } finally {
    db.close();
  }
}
