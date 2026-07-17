import { z } from "zod";
import type { SourceConfig, SourceAdapter, RawSourceItem } from "../types";

// Tolerant schema definition to protect against Hugging Face API structure shifts
const HuggingFacePaperSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string().optional().nullable(),
  publishedAt: z.string().optional().nullable(),
  upvotes: z.number().optional().nullable(),
  authors: z.array(z.object({ name: z.string() })).optional().nullable(),
  githubRepo: z.string().optional().nullable(),
}).passthrough();

const HuggingFaceDailyPaperResponseSchema = z.array(
  z.object({
    paper: HuggingFacePaperSchema.optional(),
  }).passthrough()
);

export const huggingFaceDailyPapersAdapter: SourceAdapter = {
  fetchMethod: "huggingface_daily_papers",

  async fetchItems(source: SourceConfig): Promise<RawSourceItem[]> {
    const config = (source.config || {}) as Record<string, any>;
    
    // Parse local filters (not sent to HF API to ensure reliability)
    const limit = parseInt(config.limit || "30", 10);
    const minimumUpvotes = parseInt(config.minimumUpvotes !== undefined ? config.minimumUpvotes : "2", 10);
    const includeZeroVotePapers = !!config.includeZeroVotePapers;

    const url = "https://huggingface.co/api/daily_papers";
    console.log(`[HuggingFaceDailyPapers] Querying endpoint: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "AI-Radar-Dashboard/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`Hugging Face Daily Papers request failed with HTTP status ${response.status}`);
    }

    const rawData = await response.json();
    const parseResult = HuggingFaceDailyPaperResponseSchema.safeParse(rawData);

    if (!parseResult.success) {
      throw new Error(`Hugging Face API response validation failed: ${parseResult.error.message}`);
    }

    const items: RawSourceItem[] = [];

    for (const rawItem of parseResult.data) {
      const paper = rawItem.paper;
      if (!paper || !paper.id || !paper.title) {
        console.warn("[HuggingFaceDailyPapers] Skipped item due to missing core identifiers", rawItem);
        continue;
      }

      const upvotes = paper.upvotes || 0;

      // Apply upvotes criteria locally
      if (!includeZeroVotePapers && upvotes === 0) {
        continue;
      }
      if (upvotes < minimumUpvotes) {
        continue;
      }

      const authorNames = paper.authors ? paper.authors.map(a => a.name) : [];
      const canonicalUrl = `https://huggingface.co/papers/${paper.id}`;

      items.push({
        title: paper.title,
        url: canonicalUrl,
        author: authorNames.length > 0 ? authorNames.join(", ") : "Unknown",
        publishedAt: paper.publishedAt || new Date().toISOString(),
        rawExcerpt: paper.summary || "",
        rawContent: paper.summary || "",
        sourceId: source.id,
        sourceType: source.type, // 'paper'
        metadata: {
          arxivId: paper.id,
          upvotes,
          githubRepo: paper.githubRepo || null,
          huggingFacePaperId: paper.id,
          paperAuthors: authorNames
        }
      });
    }

    // Sort by upvotes descending and slice to requested limit
    const sorted = items.sort((a, b) => ((b.metadata?.upvotes as number) || 0) - ((a.metadata?.upvotes as number) || 0));
    return sorted.slice(0, limit);
  }
};
