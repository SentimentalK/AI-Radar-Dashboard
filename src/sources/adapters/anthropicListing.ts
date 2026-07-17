import { parse } from "node-html-parser";
import type { SourceConfig, SourceAdapter, RawSourceItem } from "../types";

export const anthropicListingAdapter: SourceAdapter = {
  fetchMethod: "anthropic_listing",

  async fetchItems(source: SourceConfig): Promise<RawSourceItem[]> {
    const config = (source.config || {}) as Record<string, any>;
    const section = config.section === "research" ? "research" : "news";
    const maxResults = parseInt(config.maxResults || "20", 10);

    const baseUrl = "https://www.anthropic.com";
    const url = `${baseUrl}/${section}`;
    console.log(`[AnthropicListing] Fetching listing section: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)"
      }
    });

    if (!response.ok) {
      throw new Error(`Anthropic Listing request failed with HTTP status ${response.status}`);
    }

    const html = await response.text();
    const root = parse(html);

    // Select all anchor tags
    const anchors = root.querySelectorAll("a");
    const items: RawSourceItem[] = [];

    for (const anchor of anchors) {
      const href = anchor.getAttribute("href") || "";
      
      // We look for links starting with /news/ or /research/ corresponding to the active section
      const targetPrefix = `/${section}/`;
      if (!href.startsWith(targetPrefix)) {
        continue;
      }

      // Title: Look for h2, h3, or h4 header elements inside the link block
      const hTag = anchor.querySelector("h1, h2, h3, h4");
      const title = hTag ? hTag.text.trim() : "";
      if (!title) {
        continue;
      }

      const canonicalUrl = `${baseUrl}${href}`;

      // Prevent duplicate URLs in list
      if (items.some(i => i.url === canonicalUrl)) {
        continue;
      }

      // Date: Look for nested <time> tag
      const timeTag = anchor.querySelector("time");
      const dateStr = timeTag ? timeTag.text.trim() : "";

      let publishedAt = new Date().toISOString();
      if (dateStr) {
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          publishedAt = parsedDate.toISOString();
        }
      }

      // Category: Look for span indicating post categories
      const catSpan = anchor.querySelector("span[class*='caption'], span[class*='meta']");
      const category = catSpan ? catSpan.text.trim() : "";

      // Excerpt: Look for a body paragraph inside the link block
      const pTag = anchor.querySelector("p");
      const excerpt = pTag ? pTag.text.trim().replace(/\s+/g, " ") : "";

      items.push({
        title,
        url: canonicalUrl,
        author: "Anthropic",
        publishedAt,
        rawExcerpt: excerpt || `Anthropic official ${section} post: ${title}`,
        rawContent: excerpt || title,
        sourceId: source.id,
        sourceType: "official",
        metadata: {
          category,
          section,
          dateString: dateStr,
          slug: href.replace(targetPrefix, "")
        }
      });
    }

    // Sort by publication date descending and slice
    const sorted = items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    return sorted.slice(0, maxResults);
  }
};
