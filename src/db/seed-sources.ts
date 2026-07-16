import dotenv from "dotenv";
import { createDb } from "./client";
import { SourceType, FetchMethod } from "../shared/types";

dotenv.config();

const VALID_SOURCE_TYPES: SourceType[] = ["paper", "official", "repo", "blog", "community"];
const VALID_FETCH_METHODS: FetchMethod[] = ["rss", "rsshub", "arxiv", "github_trending", "github_api", "scraper", "manual"];

const defaultSources = [
  {
    id: "arxiv-ai",
    name: "arXiv AI",
    type: "paper",
    fetchMethod: "arxiv",
    url: "https://arxiv.org/list/cs.AI/recent",
    enabled: 1,
    config: {
      category: "cs.AI",
      keywords: ["agent", "rag", "large language model", "llm"]
    }
  },
  {
    id: "arxiv-se",
    name: "arXiv Software Engineering",
    type: "paper",
    fetchMethod: "arxiv",
    url: "https://arxiv.org/list/cs.SE/recent",
    enabled: 1,
    config: {
      category: "cs.SE",
      keywords: ["large language model", "code agent", "software engineering"]
    }
  },
  {
    id: "github-trending-ai",
    name: "GitHub Trending AI",
    type: "repo",
    fetchMethod: "github_trending",
    url: "https://github.com/trending",
    enabled: 1,
    config: {
      keywords: ["llm", "agent", "rag", "mcp", "ai"]
    }
  },
  {
    id: "openai-official",
    name: "OpenAI Official Updates",
    type: "official",
    fetchMethod: "rss",
    url: "https://openai.com/news/",
    enabled: 1,
    config: {
      note: "Exact feed or scraper strategy will be implemented in a later phase."
    }
  },
  {
    id: "anthropic-official",
    name: "Anthropic Official Updates",
    type: "official",
    fetchMethod: "rss",
    url: "https://www.anthropic.com/news",
    enabled: 1,
    config: {
      note: "Exact feed or scraper strategy will be implemented in a later phase."
    }
  },
  {
    id: "hn-ai-search",
    name: "Hacker News AI Search RSS",
    type: "community",
    fetchMethod: "rss",
    url: "https://hnrss.org/newest?q=AI",
    enabled: 1,
    config: {
      note: "Simple RSS source for Phase 3 ingestion validation."
    }
  },
  {
    id: "github-blog",
    name: "GitHub Blog",
    type: "blog",
    fetchMethod: "rss",
    url: "https://github.blog/feed/",
    enabled: 1,
    config: {
      note: "Simple RSS source for Phase 3 ingestion validation."
    }
  }
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
