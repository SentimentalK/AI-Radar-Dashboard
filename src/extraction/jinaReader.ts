import type { ExtractionInput, ExtractionResult } from "./types";
import { cleanText, truncateText, isUsefulContent } from "./text";

export function buildJinaReaderUrl(targetUrl: string): string {
  const base = (process.env.JINA_READER_BASE_URL || "https://r.jina.ai").trim().replace(/\/+$/, "");
  return `${base}/${targetUrl.trim()}`;
}

export async function extractWithJinaReader(input: ExtractionInput): Promise<ExtractionResult> {
  const enabled = process.env.JINA_READER_ENABLED !== "false";
  if (!enabled) {
    return {
      success: false,
      error: "Jina Reader extraction is disabled via environment configuration",
    };
  }

  // URL protocol validation
  try {
    const parsedUrl = new URL(input.url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return {
        success: false,
        error: `Jina Reader rejected URL protocol: "${parsedUrl.protocol}". Only HTTP/HTTPS protocols are supported.`,
      };
    }
  } catch (err) {
    return {
      success: false,
      error: `Invalid URL format: "${input.url}"`,
    };
  }

  const readerUrl = buildJinaReaderUrl(input.url);
  const timeoutMs = parseInt(process.env.JINA_READER_TIMEOUT_MS || "15000", 10);
  const maxChars = parseInt(process.env.EXTRACTION_MAX_CHARS || "40000", 10);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      Accept: "text/plain",
    };

    if (process.env.JINA_API_KEY) {
      headers["Authorization"] = `Bearer ${process.env.JINA_API_KEY}`;
    }

    const response = await fetch(readerUrl, {
      signal: controller.signal,
      headers,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `Jina Reader request failed with HTTP status ${response.status}`,
      };
    }

    const rawMarkdown = await response.text();

    if (!isUsefulContent(rawMarkdown)) {
      return {
        success: false,
        error: "Extracted Jina Markdown content is under 500 character threshold",
      };
    }

    const cleaned = cleanText(rawMarkdown);
    return {
      success: true,
      method: "jina_reader",
      content: truncateText(cleaned, maxChars),
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = (err as Error).name === "AbortError";
    const errorMessage = isTimeout
      ? `Jina Reader request timed out after ${timeoutMs}ms`
      : `Jina Reader fetch failed: ${(err as Error).message}`;

    return {
      success: false,
      error: errorMessage,
    };
  }
}
