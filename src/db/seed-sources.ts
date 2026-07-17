import dotenv from "dotenv";
import { createDb } from "./client";
import { SourceType, FetchMethod } from "../shared/types";

dotenv.config();

const VALID_SOURCE_TYPES: SourceType[] = ["paper", "official", "repo", "blog", "community"];
const VALID_FETCH_METHODS: FetchMethod[] = [
  "rss",
  "rsshub",
  "arxiv",
  "github_trending",
  "github_api",
  "github_releases",
  "huggingface_daily_papers",
  "anthropic_listing",
  "scraper",
  "manual",
];

const defaultSources = [
  // 1. Hugging Face Daily Papers (Priority 10)
  {
    id: "hf-daily-papers",
    name: "Hugging Face Daily Papers",
    type: "paper",
    fetchMethod: "huggingface_daily_papers",
    url: "https://huggingface.co/api/daily_papers",
    enabled: 1,
    config: {
      priority: 10,
      sourceRole: "research_discovery",
      limit: 150,
      minimumUpvotes: 2,
      includeZeroVotePapers: false,
      days: 30,
    },
  },

  // 2. GitHub Trending AI (Priority 20)
  {
    id: "github-trending-ai",
    name: "GitHub Trending AI",
    type: "repo",
    fetchMethod: "github_trending",
    url: "https://github.com/trending",
    enabled: 1,
    config: {
      priority: 20,
      sourceRole: "open_source_momentum",
      since: "daily",
      language: "",
      maxResults: 25,
      hydrateWithApi: true,
      aiOnly: true,
    },
  },

  // 3. Simon Willison AI Blog (Priority 30)
  {
    id: "simon-willison-ai",
    name: "Simon Willison AI Blog",
    type: "blog",
    fetchMethod: "rss",
    url: "https://simonwillison.net/atom/entries/",
    enabled: 1,
    config: {
      priority: 30,
      sourceRole: "expert_analysis",
      maxResults: 20,
      preferFullContent: true,
      allowedTags: [
        "ai",
        "llms",
        "generative-ai",
        "agents",
        "openai",
        "anthropic",
        "gemini",
        "mcp",
        "prompt-engineering"
      ],
      includeKeywords: ["ai", "llm", "agent", "mcp", "claude", "gpt"]
    },
  },

  // 4. Latent Space (Priority 31)
  {
    id: "latent-space",
    name: "Latent Space AI Newsletter",
    type: "blog",
    fetchMethod: "rss",
    url: "https://www.latent.space/feed",
    enabled: 1,
    config: {
      priority: 31,
      sourceRole: "expert_analysis",
      maxResults: 20,
      preferFullContent: true,
    },
  },

  // 5. OpenAI News (Priority 40)
  {
    id: "openai-news",
    name: "OpenAI Newsroom",
    type: "official",
    fetchMethod: "rss",
    url: "https://openai.com/news/rss.xml",
    enabled: 1,
    config: {
      priority: 40,
      sourceRole: "official_announcement",
      maxResults: 20,
      preferFullContent: true,
    },
  },

  // 6. Anthropic News (Priority 41)
  {
    id: "anthropic-news",
    name: "Anthropic Newsroom",
    type: "official",
    fetchMethod: "anthropic_listing",
    url: "https://www.anthropic.com/news",
    enabled: 1,
    config: {
      priority: 41,
      sourceRole: "official_announcement",
      section: "news",
      maxResults: 20,
    },
  },

  // 7. Anthropic Research (Priority 42)
  {
    id: "anthropic-research",
    name: "Anthropic Research",
    type: "official",
    fetchMethod: "anthropic_listing",
    url: "https://www.anthropic.com/research",
    enabled: 1,
    config: {
      priority: 42,
      sourceRole: "official_research",
      section: "research",
      maxResults: 20,
    },
  },

  // 8. Google DeepMind Blog (Priority 43)
  {
    id: "deepmind-blog",
    name: "Google DeepMind Blog",
    type: "official",
    fetchMethod: "rss",
    url: "https://deepmind.google/blog/rss.xml",
    enabled: 1,
    config: {
      priority: 43,
      sourceRole: "official_announcement",
      maxResults: 20,
      preferFullContent: true,
    },
  },
];

function seed() {
  console.log("AI Radar DB seed default sources");
  const db = createDb();

  try {
    const upsertStmt = db.prepare(`
      INSERT INTO sources (
        id, name, type, url, fetch_method, enabled, config_json, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        url = excluded.url,
        fetch_method = excluded.fetch_method,
        enabled = excluded.enabled,
        config_json = excluded.config_json,
        updated_at = CURRENT_TIMESTAMP
    `);

    let seedCount = 0;

    db.transaction(() => {
      for (const source of defaultSources) {
        // Validate source fields against types
        if (!VALID_SOURCE_TYPES.includes(source.type as any)) {
          throw new Error(`Invalid source type validation failed for ID "${source.id}": "${source.type}"`);
        }
        if (!VALID_FETCH_METHODS.includes(source.fetchMethod as any)) {
          throw new Error(`Invalid fetch method validation failed for ID "${source.id}": "${source.fetchMethod}"`);
        }

        upsertStmt.run(
          source.id,
          source.name,
          source.type,
          source.url,
          source.fetchMethod,
          source.enabled,
          JSON.stringify(source.config)
        );
        seedCount++;
      }
    })();

    console.log(`Successfully seeded ${seedCount} sources.`);
  } catch (error) {
    console.error("Database seeding failed:", error);
    process.exit(1);
  } finally {
    db.close();
  }
}

if (process.argv[1] && process.argv[1].endsWith("seed-sources.ts")) {
  seed();
} else {
  // @ts-ignore
  seed.defaultSources = defaultSources;
}
export { seed };
