import crypto from "node:crypto";

export function normalizeUrl(urlStr: string): string {
  if (!urlStr) return "";

  try {
    const trimmed = urlStr.trim();
    const url = new URL(trimmed);

    // Lowercase hostname (standard URL class does this but we make it explicit)
    url.hostname = url.hostname.toLowerCase();

    // Strip common tracking parameters (conservative check)
    const trackers = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    for (const tracker of trackers) {
      url.searchParams.delete(tracker);
    }

    let result = url.toString();

    // Remove trailing slash if URL pathname is not empty (and doesn't break search params)
    if (result.endsWith("/") && url.pathname !== "/") {
      result = result.slice(0, -1);
    } else if (result.endsWith("/") && url.pathname === "/" && !url.search && !url.hash) {
      result = result.slice(0, -1);
    }

    return result;
  } catch (err) {
    // Fallback for simple strings or invalid URLs
    let clean = urlStr.trim();
    if (clean.endsWith("/")) {
      clean = clean.slice(0, -1);
    }
    return clean;
  }
}

export function createItemHash(input: {
  sourceId: string;
  url: string;
  title?: string;
}): string {
  const normalized = normalizeUrl(input.url);
  const key = `${input.sourceId}::${normalized}`;
  return crypto.createHash("sha256").update(key).digest("hex");
}
