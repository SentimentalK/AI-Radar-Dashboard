import type { ApiItem } from "../../shared/apiTypes";

export function formatDate(value: string | null | undefined): string {
  if (!value) return "Unknown date";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return "Unknown date";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Unknown date";
  }
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Unknown date";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return "Unknown date";
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Unknown date";
  }
}

export function truncateText(value: string | null | undefined, maxLength: number): string {
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength) + "...";
}

export function getDisplayDate(item: ApiItem): string {
  return formatDate(item.publishedAt || item.fetchedAt);
}
