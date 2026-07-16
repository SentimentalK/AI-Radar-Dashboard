export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmJsonRequest = {
  messages: LlmMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  responseFormat?: "json";
};

export type LlmJsonResponse = {
  rawText: string;
  parsedJson: unknown | null;
  model: string;
  provider: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

export type LlmProvider = {
  name: string;
  model: string;
  generateJson(request: LlmJsonRequest): Promise<LlmJsonResponse>;
};
