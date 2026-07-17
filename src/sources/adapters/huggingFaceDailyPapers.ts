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

function getDateString(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export const huggingFaceDailyPapersAdapter: SourceAdapter = {
  fetchMethod: "huggingface_daily_papers",

  async fetchItems(source: SourceConfig): Promise<RawSourceItem[]> {
    const config = (source.config || {}) as Record<string, any>;
    
    // Parse filters
    const limit = parseInt(config.limit || "150", 10); // larger limit for history
    const minimumUpvotes = parseInt(config.minimumUpvotes !== undefined ? config.minimumUpvotes : "2", 10);
    const includeZeroVotePapers = !!config.includeZeroVotePapers;
    const days = parseInt(config.days !== undefined ? config.days : "15", 10);

    const items: RawSourceItem[] = [];
    const seenPaperIds = new Set<string>();

    console.log(`[HuggingFaceDailyPapers] Querying papers over the last ${days} days...`);

    for (let i = 0; i < days; i++) {
      const dateStr = getDateString(i);
      const url = `https://huggingface.co/api/daily_papers?date=${dateStr}`;
      
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "AI-Radar-Dashboard/1.0"
          }
        });

        if (!response.ok) {
          console.warn(`[HuggingFaceDailyPapers] Request failed for date ${dateStr}: HTTP status ${response.status}`);
          continue;
        }

        const rawData = await response.json();
        const parseResult = HuggingFaceDailyPaperResponseSchema.safeParse(rawData);

        if (!parseResult.success) {
          console.warn(`[HuggingFaceDailyPapers] Validation failed for date ${dateStr}: ${parseResult.error.message}`);
          continue;
        }

        for (const rawItem of parseResult.data) {
          const paper = rawItem.paper;
          if (!paper || !paper.id || !paper.title) continue;

          // Deduplicate across days (just in case they overlap)
          if (seenPaperIds.has(paper.id)) {
            continue;
          }
          seenPaperIds.add(paper.id);

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
            sourceType: source.type,
            metadata: {
              arxivId: paper.id,
              upvotes,
              githubRepo: paper.githubRepo || null,
              huggingFacePaperId: paper.id,
              paperAuthors: authorNames
            }
          });
        }
      } catch (err) {
        console.error(`[HuggingFaceDailyPapers] Error fetching papers for date ${dateStr}:`, err);
      }
    }

    // Sort by upvotes descending and slice to requested limit
    const sorted = items.sort((a, b) => ((b.metadata?.upvotes as number) || 0) - ((a.metadata?.upvotes as number) || 0));
    console.log(`[HuggingFaceDailyPapers] Successfully fetched ${sorted.length} papers over ${days} days.`);
    return sorted.slice(0, limit);
  }
};
