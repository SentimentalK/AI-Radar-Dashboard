import Parser from "rss-parser";
import type { SourceAdapter, RawSourceItem, SourceConfig } from "../types";

const parser = new Parser();

export const rssAdapter: SourceAdapter = {
  fetchMethod: "rss",

  async fetchItems(source: SourceConfig): Promise<RawSourceItem[]> {
    if (!source.url) {
      throw new Error(`RSS source "${source.id}" is missing url`);
    }

    try {
      const feed = await parser.parseURL(source.url);
      const config = (source.config || {}) as Record<string, any>;
      
      const allowedTags = Array.isArray(config.allowedTags) 
        ? config.allowedTags.map((t: string) => t.toLowerCase()) 
        : null;
      const includeKeywords = Array.isArray(config.includeKeywords) 
        ? config.includeKeywords.map((k: string) => k.toLowerCase()) 
        : null;

      const rawItems = feed.items ?? [];
      const mapped: RawSourceItem[] = [];
      let filteredCount = 0;

      for (const item of rawItems) {
        if (!item.title || !item.link) continue;

        let keep = true;

        // Apply filters only if filter configuration exists
        if (allowedTags || includeKeywords) {
          const itemCategories = Array.isArray(item.categories) 
            ? item.categories.map((c: any) => String(c).toLowerCase()) 
            : [];

          if (itemCategories.length > 0) {
            if (allowedTags) {
              // If item has categories and allowedTags is specified, check intersection
              const hasMatchingTag = itemCategories.some(cat => 
                allowedTags.some(tag => cat === tag || cat.includes(tag))
              );
              keep = hasMatchingTag;
            } else {
              keep = true;
            }
          } else {
            // Fall back to keyword parsing if no categories are present
            if (includeKeywords) {
              const titleLower = (item.title || "").toLowerCase();
              const excerptLower = (item.contentSnippet || item.summary || "").toLowerCase();
              const contentLower = (item.content || "").toLowerCase();
              
              keep = includeKeywords.some(kw => 
                titleLower.includes(kw) || 
                excerptLower.includes(kw) || 
                contentLower.includes(kw)
              );
            } else {
              // Retain item if there are no tags on the item and no keyword checks are configured
              keep = true;
            }
          }
        }

        if (!keep) {
          filteredCount++;
          continue;
        }

        mapped.push({
          sourceId: source.id,
          sourceType: source.type,
          title: item.title ?? "",
          url: item.link ?? "",
          author: item.creator ?? item.author ?? null,
          publishedAt: item.isoDate ?? item.pubDate ?? null,
          rawExcerpt: item.contentSnippet ?? item.summary ?? null,
          rawContent: item.content ?? item["content:encoded"] ?? null,
          metadata: {
            guid: item.guid ?? null,
            feedTitle: feed.title ?? null,
            categories: item.categories ?? []
          },
        });
      }

      if (filteredCount > 0) {
        console.log(`[RSS: ${source.id}] fetched: ${rawItems.length}, filtered: ${filteredCount}, mapped: ${mapped.length}`);
      }

      return mapped;
    } catch (err) {
      throw new Error(`Failed to parse RSS source "${source.id}": ${(err as Error).message}`);
    }
  },
};
