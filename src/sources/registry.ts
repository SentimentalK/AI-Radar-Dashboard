import type { FetchMethod, SourceAdapter } from "./types";

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

// Only manual is registered in Phase 2
registerAdapter(manualAdapter);
