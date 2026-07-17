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
  // === TIER 1 - CORE ACTIVE SOURCES ===

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
      limit: 30,
      minimumUpvotes: 2,
      includeZeroVotePapers: false,
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
      // Fallback keywords if feed tags/categories are absent
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

  // === TIER 2 - CONDITIONAL & DISABLED BACKFILLS / DEPRECATED ===

  // 9. Artificial Analysis (Disabled until formal API change-detection is implemented)
  {
    id: "artificial-analysis-models",
    name: "Artificial Analysis Model Intelligence",
    type: "official",
    fetchMethod: "manual",
    url: "https://artificialanalysis.ai",
    enabled: 0,
    config: {
      priority: 80,
      sourceRole: "model_intelligence",
      maxResults: 20,
    },
  },

  // 10. Deprecated Hacker News AI Search (Pruned to preserve history)
  {
    id: "hn-ai-search",
    name: "Hacker News AI Search RSS",
    type: "community",
    fetchMethod: "rss",
    url: "https://hnrss.org/newest?q=AI",
    enabled: 0,
    config: {
      priority: 90,
      sourceRole: "community_discussion",
      note: "Disabled to reduce noise",
    },
  },

  // 11. Deprecated GitHub Blog
  {
    id: "github-blog",
    name: "GitHub Blog",
    type: "blog",
    fetchMethod: "rss",
    url: "https://github.blog/feed/",
    enabled: 0,
    config: {
      priority: 90,
      note: "Disabled to prioritize official announcements",
    },
  },

  // 12. Deprecated Direct arXiv Feeds
  {
    id: "arxiv-ai-agents",
    name: "arXiv AI Agents",
    type: "paper",
    fetchMethod: "arxiv",
    url: "https://export.arxiv.org/api/query",
    enabled: 0,
    config: {
      priority: 90,
      sourceRole: "backfill",
      query: "cat:cs.AI AND (all:agent OR all:agents OR all:autonomous)",
      maxResults: 100,
    },
  },
  {
    id: "arxiv-rag-memory",
    name: "arXiv RAG and Memory",
    type: "paper",
    fetchMethod: "arxiv",
    url: "https://export.arxiv.org/api/query",
    enabled: 0,
    config: {
      priority: 90,
      sourceRole: "backfill",
      query: "(cat:cs.CL OR cat:cs.AI OR cat:cs.IR) AND (all:RAG OR all:retrieval OR all:memory)",
      maxResults: 100,
    },
  },
  {
    id: "arxiv-coding-agents",
    name: "arXiv Coding Agents",
    type: "paper",
    fetchMethod: "arxiv",
    url: "https://export.arxiv.org/api/query",
    enabled: 0,
    config: {
      priority: 90,
      sourceRole: "backfill",
      query: "(cat:cs.SE OR cat:cs.AI OR cat:cs.CL) AND (all:code OR all:programming OR all:software OR all:agent)",
      maxResults: 100,
    },
  },
  {
    id: "arxiv-llm-evaluation",
    name: "arXiv LLM Evaluation",
    type: "paper",
    fetchMethod: "arxiv",
    url: "https://export.arxiv.org/api/query",
    enabled: 0,
    config: {
      priority: 90,
      sourceRole: "backfill",
      query: "(cat:cs.CL OR cat:cs.AI OR cat:cs.LG) AND (all:evaluation OR all:benchmark OR all:hallucination)",
      maxResults: 100,
    },
  },
  {
    id: "arxiv-local-llm-inference",
    name: "arXiv Local LLM and Inference",
    type: "paper",
    fetchMethod: "arxiv",
    url: "https://export.arxiv.org/api/query",
    enabled: 0,
    config: {
      priority: 90,
      sourceRole: "backfill",
      query: "(cat:cs.LG OR cat:cs.CL OR cat:cs.AI) AND (all:inference OR all:quantization OR all:serving OR all:latency)",
      maxResults: 100,
    },
  },
  {
    id: "arxiv-specific-papers",
    name: "arXiv Specific Papers Pinned",
    type: "paper",
    fetchMethod: "arxiv",
    url: "https://export.arxiv.org/api/query",
    enabled: 0,
    config: {
      priority: 90,
      sourceRole: "watchlist",
      idList: ["2607.01456"],
    },
  },

  // 13. Deprecated Fixed Repo Release Watchlists
  {
    id: "github-mcp-typescript-sdk-releases",
    name: "GitHub MCP TypeScript SDK Releases",
    type: "repo",
    fetchMethod: "github_releases",
    url: "https://github.com/modelcontextprotocol/typescript-sdk",
    enabled: 0,
    config: {
      priority: 90,
      sourceRole: "watchlist",
      owner: "modelcontextprotocol",
      repo: "typescript-sdk",
      maxResults: 30,
    },
  },
  {
    id: "github-ollama-releases",
    name: "GitHub Ollama Releases",
    type: "repo",
    fetchMethod: "github_releases",
    url: "https://github.com/ollama/ollama",
    enabled: 0,
    config: {
      priority: 90,
      sourceRole: "watchlist",
      owner: "ollama",
      repo: "ollama",
      maxResults: 30,
    },
  },
  {
    id: "github-vllm-releases",
    name: "GitHub vLLM Releases",
    type: "repo",
    fetchMethod: "github_releases",
    url: "https://github.com/vllm-project/vllm",
    enabled: 0,
    config: {
      priority: 90,
      sourceRole: "watchlist",
      owner: "vllm-project",
      repo: "vllm",
      maxResults: 30,
    },
  },
  {
    id: "github-open-webui-releases",
    name: "GitHub Open WebUI Releases",
    type: "repo",
    fetchMethod: "github_releases",
    url: "https://github.com/open-webui/open-webui",
    enabled: 0,
    config: {
      priority: 90,
      sourceRole: "watchlist",
      owner: "open-webui",
      repo: "open-webui",
      maxResults: 30,
    },
  },

  // 14. Deprecated OpenAI / Anthropic RSS placeholders
  {
    id: "openai-official",
    name: "OpenAI Official Updates",
    type: "official",
    fetchMethod: "rss",
    url: "https://openai.com/news/",
    enabled: 0,
    config: {
      priority: 90,
    },
  },
  {
    id: "anthropic-official",
    name: "Anthropic Official Updates",
    type: "official",
    fetchMethod: "rss",
    url: "https://www.anthropic.com/news",
    enabled: 0,
    config: {
      priority: 90,
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

// Check if running as script directly
if (process.argv[1] && process.argv[1].endsWith("seed-sources.ts")) {
  seed();
} else {
  // exported for test runs
  // @ts-ignore
  seed.defaultSources = defaultSources;
}
export { seed };
