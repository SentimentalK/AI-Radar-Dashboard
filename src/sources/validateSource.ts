import { SourceConfig } from "./types";
import { SourceType, FetchMethod } from "../shared/types";

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

export function validateSourceConfig(source: SourceConfig): void {
  if (!source.id || source.id.trim() === "") {
    throw new Error('Invalid source config: "id" must be a non-empty string.');
  }

  if (!source.name || source.name.trim() === "") {
    throw new Error(`Invalid source config for source "${source.id}": "name" must be a non-empty string.`);
  }

  if (!VALID_SOURCE_TYPES.includes(source.type)) {
    throw new Error(
      `Invalid source config for source "${source.id}": "type" must be one of [${VALID_SOURCE_TYPES.join(", ")}]. Got "${source.type}".`
    );
  }

  if (!VALID_FETCH_METHODS.includes(source.fetchMethod)) {
    throw new Error(
      `Invalid source config for source "${source.id}": "fetchMethod" must be one of [${VALID_FETCH_METHODS.join(", ")}]. Got "${source.fetchMethod}".`
    );
  }

  if (source.fetchMethod !== "manual" && (!source.url || source.url.trim() === "")) {
    throw new Error(
      `Invalid source config for source "${source.id}": "url" is required for fetchMethod "${source.fetchMethod}".`
    );
  }

  if (typeof source.config !== "object" || source.config === null) {
    throw new Error(`Invalid source config for source "${source.id}": "config" must be an object.`);
  }
}
