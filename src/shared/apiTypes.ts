export type ApiItem = {
  id: string;
  sourceId: string;
  sourceType: string;

  title: string;
  url: string;
  author: string | null;
  publishedAt: string | null;
  fetchedAt: string;

  rawExcerpt: string | null;
  rawContent: string | null;

  extractionMethod: string | null;
  extractedContent: string | null;
  extractedAt: string | null;
  extractionError: string | null;

  oneLineSummary: string | null;
  whatItIs: string | null;
  problemItSolves: string | null;
  howItWorks: string | null;
  whyNow: string | null;

  advantages: string[];
  limitations: string[];
  alternativesOrRelated: string[];

  engineeringRelevanceScore: number | null;
  recommendedAction: string | null;
  category: string | null;
  maturity: string | null;
  confidence: string | null;

  enrichmentModel: string | null;
  enrichedAt: string | null;
  enrichmentError: string | null;

  hash: string;
  createdAt: string;
  updatedAt: string;

  sourceName?: string | null;
  tags: string[];
};

export type ApiTimelineGroup = {
  date: string;
  items: ApiItem[];
};

export type ApiSource = {
  id: string;
  name: string;
  type: string;
  url: string | null;
  fetchMethod: string;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ApiSyncRun = {
  id: string;
  jobType: string;
  sourceId: string | null;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  itemsFetched: number;
  itemsInserted: number;
  itemsUpdated: number;
  itemsEnriched: number;
  error: string | null;
  metadata: Record<string, unknown>;
};

export type ApiTag = {
  id: number;
  name: string;
  itemCount: number;
};
