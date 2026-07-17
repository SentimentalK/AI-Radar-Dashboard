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
  "scraper",
  "manual",
];

const defaultSources = [
  // arXiv Papers
  {
    id: "arxiv-ai-agents",
    name: "arXiv AI Agents",
    type: "paper",
    fetchMethod: "arxiv",
    url: "https://export.arxiv.org/api/query",
    enabled: 1,
    config: {
      query: "cat:cs.AI AND (all:agent OR all:agents OR all:autonomous)",
      maxResults: 25,
      sortBy: "submittedDate",
      sortOrder: "descending",
    },
  },
  {
    id: "arxiv-rag-memory",
    name: "arXiv RAG and Memory",
    type: "paper",
    fetchMethod: "arxiv",
    url: "https://export.arxiv.org/api/query",
    enabled: 1,
    config: {
      query: "(cat:cs.CL OR cat:cs.AI OR cat:cs.IR) AND (all:RAG OR all:retrieval OR all:memory)",
      maxResults: 25,
      sortBy: "submittedDate",
      sortOrder: "descending",
    },
  },
  {
    id: "arxiv-coding-agents",
    name: "arXiv Coding Agents",
    type: "paper",
    fetchMethod: "arxiv",
    url: "https://export.arxiv.org/api/query",
    enabled: 1,
    config: {
      query: "(cat:cs.SE OR cat:cs.AI OR cat:cs.CL) AND (all:code OR all:programming OR all:software OR all:agent)",
      maxResults: 25,
      sortBy: "submittedDate",
      sortOrder: "descending",
    },
  },
  {
    id: "arxiv-llm-evaluation",
    name: "arXiv LLM Evaluation",
    type: "paper",
    fetchMethod: "arxiv",
    url: "https://export.arxiv.org/api/query",
    enabled: 1,
    config: {
      query: "(cat:cs.CL OR cat:cs.AI OR cat:cs.LG) AND (all:evaluation OR all:benchmark OR all:hallucination)",
      maxResults: 25,
      sortBy: "submittedDate",
      sortOrder: "descending",
    },
  },
  {
    id: "arxiv-local-llm-inference",
    name: "arXiv Local LLM and Inference",
    type: "paper",
    fetchMethod: "arxiv",
    url: "https://export.arxiv.org/api/query",
    enabled: 1,
    config: {
      query: "(cat:cs.LG OR cat:cs.CL OR cat:cs.AI) AND (all:inference OR all:quantization OR all:serving OR all:latency)",
      maxResults: 25,
      sortBy: "submittedDate",
      sortOrder: "descending",
    },
  },

  // GitHub Releases
  {
    id: "github-mcp-typescript-sdk-releases",
    name: "GitHub MCP TypeScript SDK Releases",
    type: "repo",
    fetchMethod: "github_releases",
    url: "https://github.com/modelcontextprotocol/typescript-sdk",
    enabled: 1,
    config: {
      owner: "modelcontextprotocol",
      repo: "typescript-sdk",
      maxResults: 10,
      includePrerelease: false,
    },
  },
  {
    id: "github-ollama-releases",
    name: "GitHub Ollama Releases",
    type: "repo",
    fetchMethod: "github_releases",
    url: "https://github.com/ollama/ollama",
    enabled: 1,
    config: {
      owner: "ollama",
      repo: "ollama",
      maxResults: 10,
      includePrerelease: false,
    },
  },
  {
    id: "github-vllm-releases",
    name: "GitHub vLLM Releases",
    type: "repo",
    fetchMethod: "github_releases",
    url: "https://github.com/vllm-project/vllm",
    enabled: 1,
    config: {
      owner: "vllm-project",
      repo: "vllm",
      maxResults: 10,
      includePrerelease: false,
    },
  },
  {
    id: "github-open-webui-releases",
    name: "GitHub Open WebUI Releases",
    type: "repo",
    fetchMethod: "github_releases",
    url: "https://github.com/open-webui/open-webui",
    enabled: 1,
    config: {
      owner: "open-webui",
      repo: "open-webui",
      maxResults: 10,
      includePrerelease: false,
    },
  },

  // Official Blogs / Feeds
  {
    id: "github-blog",
    name: "GitHub Blog",
    type: "blog",
    fetchMethod: "rss",
    url: "https://github.blog/feed/",
    enabled: 1,
    config: {
      note: "GitHub news and feature blog",
    },
  },
  {
    id: "hn-ai-search",
    name: "Hacker News AI Search RSS",
    type: "community",
    fetchMethod: "rss",
    url: "https://hnrss.org/newest?q=AI",
    enabled: 1,
    config: {
      note: "Hacker News submissions matching 'AI'",
    },
  },

  // Disabled placeholders for future scraping
  {
    id: "openai-official",
    name: "OpenAI Official Updates",
    type: "official",
    fetchMethod: "rss",
    url: "https://openai.com/news/",
    enabled: 0,
    config: {
      note: "Currently disabled until a custom scraper or direct RSS feed is resolved.",
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
      note: "Currently disabled until a custom scraper or direct RSS feed is resolved.",
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
    console.error("Seeding failed:", error);
    process.exit(1);
  } finally {
    db.close();
  }
}

seed();
