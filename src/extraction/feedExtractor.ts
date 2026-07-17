import type { ExtractionInput, ExtractionResult } from "./types";
import { cleanText, truncateText, isUsefulContent } from "./text";

export function extractFromFeed(input: ExtractionInput): ExtractionResult {
  const maxChars = parseInt(process.env.EXTRACTION_MAX_CHARS || "40000", 10);

  const isArxiv = input.url.includes("arxiv.org");
  const isGithubReleases = input.url.includes("github.com") && input.url.includes("/releases");
  const bypassThreshold = isArxiv || isGithubReleases;

  if (input.rawContent && (bypassThreshold ? input.rawContent.trim().length > 0 : isUsefulContent(input.rawContent))) {
    const cleaned = cleanText(input.rawContent);
    return {
      success: true,
      method: "feed",
      content: truncateText(cleaned, maxChars),
    };
  }

  if (input.rawExcerpt && (bypassThreshold ? input.rawExcerpt.trim().length > 0 : isUsefulContent(input.rawExcerpt))) {
    const cleaned = cleanText(input.rawExcerpt);
    return {
      success: true,
      method: "feed",
      content: truncateText(cleaned, maxChars),
    };
  }

  return {
    success: false,
    error: "Feed rawContent and rawExcerpt are missing or under 500 character threshold",
  };
}
