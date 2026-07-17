import type { FetchMethod, SourceAdapter } from "./types";
import { rssAdapter } from "./adapters/rss";
import { arxivAdapter } from "./adapters/arxiv";
import { githubReleasesAdapter } from "./adapters/githubReleases";

const adapters = new Map<FetchMethod, SourceAdapter>();

export function registerAdapter(adapter: SourceAdapter): void {
  adapters.set(adapter.fetchMethod, adapter);
}

export function getAdapter(fetchMethod: FetchMethod): SourceAdapter {
  const adapter = adapters.get(fetchMethod);

  if (!adapter) {
    throw new Error(`No adapter registered for fetch method: ${fetchMethod}`);
  }

  return adapter;
}

export function listRegisteredAdapters(): FetchMethod[] {
  return Array.from(adapters.keys());
}

// Placeholder manual adapter
export const manualAdapter: SourceAdapter = {
  fetchMethod: "manual",
  async fetchItems() {
    return [];
  },
};

// Register manual, rss, arxiv, and github_releases adapters
registerAdapter(manualAdapter);
registerAdapter(rssAdapter);
registerAdapter(arxivAdapter);
registerAdapter(githubReleasesAdapter);
