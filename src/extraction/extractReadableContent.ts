import type { ExtractionInput, ExtractionResult } from "./types";
import { extractFromFeed } from "./feedExtractor";
import { extractWithJinaReader } from "./jinaReader";
import { extractFromRawExcerpt } from "./rawExcerptExtractor";

export async function extractReadableContent(input: ExtractionInput): Promise<ExtractionResult> {
  // 1. Try extracting using feed content
  const feedResult = extractFromFeed(input);
  if (feedResult.success) {
    return feedResult;
  }

  // 2. Try crawling using Jina Reader API
  const jinaResult = await extractWithJinaReader(input);
  if (jinaResult.success) {
    return jinaResult;
  }

  // 3. Try falling back to raw excerpt
  const rawResult = extractFromRawExcerpt(input);
  if (rawResult.success) {
    return rawResult;
  }

  // 4. Return combined failure error log
  const feedErr = feedResult.error || "unknown error";
  const jinaErr = jinaResult.error || "unknown error";
  const rawErr = rawResult.error || "unknown error";
  
  return {
    success: false,
    error: `Feed failed: ${feedErr}; Jina failed: ${jinaErr}; Raw excerpt failed: ${rawErr}`,
  };
}
