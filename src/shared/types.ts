export type SourceType =
  | "paper"
  | "official"
  | "repo"
  | "blog"
  | "community";

export type FetchMethod =
  | "rss"
  | "rsshub"
  | "arxiv"
  | "github_trending"
  | "github_api"
  | "github_releases"
  | "scraper"
  | "manual";

export type RecommendedAction =
  | "ignore"
  | "monitor"
  | "read"
  | "try"
  | "adopt";

export type ItemCategory =
  | "agent"
  | "rag"
  | "memory"
  | "coding_agent"
  | "evaluation"
  | "model_release"
  | "open_source_tool"
  | "infra"
  | "security"
  | "multimodal"
  | "local_llm"
  | "other";

export type Maturity =
  | "research"
  | "prototype"
  | "production"
  | "hype";

export type Confidence =
  | "low"
  | "medium"
  | "high";

export type SyncRunStatus =
  | "running"
  | "success"
  | "failed"
  | "partial";
