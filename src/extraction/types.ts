export type ExtractionMethod =
  | "feed"
  | "jina_reader"
  | "raw_excerpt";

export type ExtractionInput = {
  itemId: string;
  title: string;
  url: string;
  rawExcerpt?: string | null;
  rawContent?: string | null;
};

export type ExtractionResult = {
  success: boolean;
  method?: ExtractionMethod;
  content?: string;
  error?: string;
};
