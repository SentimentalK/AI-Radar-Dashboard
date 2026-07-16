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

      return (feed.items ?? [])
        .filter((item) => item.title && item.link)
        .map((item) => ({
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
          },
        }));
    } catch (err) {
      throw new Error(`Failed to parse RSS source "${source.id}": ${(err as Error).message}`);
    }
  },
};
