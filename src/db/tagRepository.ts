import { createDb } from "./client";

function normalizeTag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .slice(0, 64);
}

export function replaceItemTags(input: {
  itemId: string;
  tags: string[];
}): void {
  const { itemId, tags } = input;
  const db = createDb();

  // Normalize tags, remove empty tags, and remove duplicates
  const normalized = tags
    .map(normalizeTag)
    .filter((t) => t.length > 0);
  
  const uniqueTags = Array.from(new Set(normalized));

  try {
    // Run the tag replacement inside a short transaction
    const transaction = db.transaction((id: string, tagNames: string[]) => {
      // 1. Delete existing tag mappings for this item
      db.prepare("DELETE FROM item_tags WHERE item_id = ?").run(id);

      // 2. Insert missing tags and add mappings
      for (const name of tagNames) {
        // Insert tag name if it doesn't exist
        db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)").run(name);
        
        // Query the tag ID
        const tagRow = db.prepare("SELECT id FROM tags WHERE name = ?").get(name) as { id: number };
        const tagId = tagRow.id;

        // Insert mapping into item_tags
        db.prepare("INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)").run(id, tagId);
      }
    });

    transaction(itemId, uniqueTags);
  } finally {
    db.close();
  }
}
