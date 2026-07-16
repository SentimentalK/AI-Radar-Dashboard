import type { RawSourceItem } from "./types";

export function validateRawSourceItem(item: RawSourceItem): void {
  if (!item.sourceId || !item.sourceId.trim()) {
    throw new Error("RawSourceItem sourceId is required");
  }

  if (!item.sourceType || !item.sourceType.trim()) {
    throw new Error("RawSourceItem sourceType is required");
  }

  if (!item.title || !item.title.trim()) {
    throw new Error("RawSourceItem title is required");
  }

  if (!item.url || !item.url.trim()) {
    throw new Error("RawSourceItem url is required");
  }
}
