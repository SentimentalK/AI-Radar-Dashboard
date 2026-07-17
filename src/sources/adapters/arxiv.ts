import Parser from "rss-parser";
import type { SourceAdapter, RawSourceItem, SourceConfig } from "../types";

// Configure custom fields for arXiv-specific XML properties
const parser = new Parser({
  customFields: {
    item: [
      ["arxiv:primary_category", "primaryCategory"],
      ["arxiv:comment", "comment"],
    ],
  },
});

export function buildArxivApiUrl(source: SourceConfig): string {
  const baseUrl = "https://export.arxiv.org/api/query";
  const config = (source.config || {}) as Record<string, any>;

  let query = config.query;
  if (!query && config.category) {
    query = `cat:${config.category}`;
  }
  if (!query) {
    query = "cat:cs.AI"; // cs.AI fallback
  }

  // maxResults parsing
  let maxResults = parseInt(process.env.ARXIV_MAX_RESULTS || "25", 10);
  if (config.maxResults !== undefined) {
    const parsed = parseInt(config.maxResults, 10);
    if (!isNaN(parsed)) {
      maxResults = parsed;
    }
  }
  maxResults = Math.min(Math.max(maxResults, 1), 100); // capped at 100

  const sortBy = config.sortBy || "submittedDate";
  const sortOrder = config.sortOrder || "descending";

  const url = new URL(baseUrl);
  url.searchParams.set("search_query", query);
  url.searchParams.set("start", "0");
  url.searchParams.set("max_results", maxResults.toString());
  url.searchParams.set("sortBy", sortBy);
  url.searchParams.set("sortOrder", sortOrder);

  return url.toString();
}

export const arxivAdapter: SourceAdapter = {
  fetchMethod: "arxiv",

  async fetchItems(source: SourceConfig): Promise<RawSourceItem[]> {
    const apiUrl = buildArxivApiUrl(source);

    try {
      const feed = await parser.parseURL(apiUrl);

      return (feed.items ?? [])
        .filter((item) => item.title && item.link)
        .map((item) => {
          const url = item.link ?? "";
          
          // Extract arXiv ID and build PDF link
          const match = url.match(/\/abs\/([^\s/]+)/);
          const arxivId = match ? match[1] : "";
          const pdfUrl = arxivId ? `https://arxiv.org/pdf/${arxivId}.pdf` : null;

          // Parse authors list
          let author = null;
          if (item.author) {
            author = typeof item.author === "string" ? item.author : (item.author as any).name || null;
          } else if ((item as any).authors && Array.isArray((item as any).authors)) {
            author = (item as any).authors.map((a: any) => typeof a === "string" ? a : a.name).join(", ");
          }

          // arXiv abstracts are placed in summary or contentSnippet
          const abstract = item.summary ?? item.contentSnippet ?? null;

          return {
            sourceId: source.id,
            sourceType: source.type,
            title: (item.title ?? "").replace(/\s+/g, " ").trim(), // Clean up excessive whitespaces/newlines from title
            url,
            author,
            publishedAt: item.isoDate ?? item.pubDate ?? null,
            rawExcerpt: abstract,
            rawContent: abstract,
            metadata: {
              arxivId: arxivId || null,
              pdfUrl,
              primaryCategory: (item as any).primaryCategory?.$?.term || (item as any).primaryCategory || null,
              categories: item.categories || [],
            },
          };
        });
    } catch (err) {
      throw new Error(`Failed to parse arXiv source "${source.id}": ${(err as Error).message}`);
    }
  },
};
