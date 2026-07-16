import type {
  ApiItem,
  ApiTimelineGroup,
  ApiSource,
  ApiSyncRun,
  ApiTag,
} from "../../shared/apiTypes";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getHealth(): Promise<{
  ok: boolean;
  service: string;
}> {
  return fetchJson<{ ok: boolean; service: string }>("/api/health");
}

export async function getTimeline(params?: {
  days?: number;
  sourceType?: string;
  category?: string;
  recommendedAction?: string;
  minRelevance?: number;
  limitPerDay?: number;
}): Promise<{
  groups: ApiTimelineGroup[];
}> {
  const query = new URLSearchParams();
  if (params) {
    if (params.days !== undefined) query.append("days", String(params.days));
    if (params.sourceType) query.append("sourceType", params.sourceType);
    if (params.category) query.append("category", params.category);
    if (params.recommendedAction) query.append("recommendedAction", params.recommendedAction);
    if (params.minRelevance !== undefined) query.append("minRelevance", String(params.minRelevance));
    if (params.limitPerDay !== undefined) query.append("limitPerDay", String(params.limitPerDay));
  }
  const queryString = query.toString();
  const url = `/api/items/timeline${queryString ? `?${queryString}` : ""}`;
  return fetchJson<{ groups: ApiTimelineGroup[] }>(url);
}

export async function getItems(params?: {
  sourceType?: string;
  sourceId?: string;
  category?: string;
  recommendedAction?: string;
  minRelevance?: number;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  items: ApiItem[];
  total: number;
  limit: number;
  offset: number;
}> {
  const query = new URLSearchParams();
  if (params) {
    if (params.sourceType) query.append("sourceType", params.sourceType);
    if (params.sourceId) query.append("sourceId", params.sourceId);
    if (params.category) query.append("category", params.category);
    if (params.recommendedAction) query.append("recommendedAction", params.recommendedAction);
    if (params.minRelevance !== undefined) query.append("minRelevance", String(params.minRelevance));
    if (params.q) query.append("q", params.q);
    if (params.limit !== undefined) query.append("limit", String(params.limit));
    if (params.offset !== undefined) query.append("offset", String(params.offset));
  }
  const queryString = query.toString();
  const url = `/api/items${queryString ? `?${queryString}` : ""}`;
  return fetchJson<{ items: ApiItem[]; total: number; limit: number; offset: number }>(url);
}

export async function getItem(id: string): Promise<{
  item: ApiItem;
}> {
  return fetchJson<{ item: ApiItem }>(`/api/items/${encodeURIComponent(id)}`);
}

export async function getSources(params?: {
  enabled?: boolean;
}): Promise<{
  sources: ApiSource[];
}> {
  const query = new URLSearchParams();
  if (params && params.enabled !== undefined) {
    query.append("enabled", String(params.enabled));
  }
  const queryString = query.toString();
  const url = `/api/sources${queryString ? `?${queryString}` : ""}`;
  return fetchJson<{ sources: ApiSource[] }>(url);
}

export async function getRuns(params?: {
  status?: string;
  sourceId?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  runs: ApiSyncRun[];
  total: number;
  limit: number;
  offset: number;
}> {
  const query = new URLSearchParams();
  if (params) {
    if (params.status) query.append("status", params.status);
    if (params.sourceId) query.append("sourceId", params.sourceId);
    if (params.limit !== undefined) query.append("limit", String(params.limit));
    if (params.offset !== undefined) query.append("offset", String(params.offset));
  }
  const queryString = query.toString();
  const url = `/api/runs${queryString ? `?${queryString}` : ""}`;
  return fetchJson<{ runs: ApiSyncRun[]; total: number; limit: number; offset: number }>(url);
}

export async function getTags(): Promise<{
  tags: ApiTag[];
}> {
  return fetchJson<{ tags: ApiTag[] }>("/api/tags");
}
