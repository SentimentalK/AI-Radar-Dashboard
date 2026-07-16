import { SourceType, FetchMethod } from "../shared/types";

export type SourceConfig = {
  id: string;
  name: string;
  type: SourceType;
  url: string | null;
  fetchMethod: FetchMethod;
  enabled: boolean;
  config: Record<string, unknown>;
};

export type RawSourceItem = {
  sourceId: string;
  sourceType: SourceType;

  title: string;
  url: string;

  author?: string | null;
  publishedAt?: string | null;

  rawExcerpt?: string | null;
  rawContent?: string | null;

  metadata?: Record<string, unknown>;
};

export type SourceAdapter = {
  fetchMethod: FetchMethod;
  fetchItems(source: SourceConfig): Promise<RawSourceItem[]>;
};
