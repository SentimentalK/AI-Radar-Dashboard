import type { ExtractionInput, ExtractionResult } from "./types";
import { cleanText, truncateText } from "./text";

export function extractFromRawExcerpt(input: ExtractionInput): ExtractionResult {
  const maxChars = parseInt(process.env.EXTRACTION_MAX_CHARS || "40000", 10);

  if (input.rawExcerpt && input.rawExcerpt.trim()) {
    const cleaned = cleanText(input.rawExcerpt);
    if (cleaned.length > 0) {
      return {
        success: true,
        method: "raw_excerpt",
        content: truncateText(cleaned, maxChars),
      };
    }
  }

  return {
    success: false,
    error: "Raw excerpt fallback is missing or empty",
  };
}
