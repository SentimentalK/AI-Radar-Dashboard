import type { LlmProvider } from "./types";
import { AiRadarCard, AiRadarCardSchema } from "./schema";
import { buildCardMessages } from "./prompt";
import { repairEnumOnlyOutput } from "./repair";
import { evaluateCardQuality } from "./evaluate";
import type { EnrichmentCandidate } from "../db/enrichmentRepository";
import { stringifyValidationError } from "./json";

export async function enrichItem(input: {
  provider: LlmProvider;
  item: EnrichmentCandidate;
  maxChars: number;
}): Promise<{
  card: AiRadarCard;
  repairs: string[];
  qualityWarnings: string[];
  rawText: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  latencyMs: number;
}> {
  const { provider, item, maxChars } = input;

  // Truncate the extracted content to the specified character limit
  const truncatedContent = item.extractedContent.slice(0, maxChars);
  const promptInput = {
    ...item,
    extractedContent: truncatedContent,
  };

  const messages = buildCardMessages(promptInput);
  const startTime = Date.now();

  const response = await provider.generateJson({
    messages,
    temperature: 0.1,
    responseFormat: "json",
  });

  const latencyMs = Date.now() - startTime;
  const rawText = response.rawText;
  const parsed = response.parsedJson;

  if (parsed === null) {
    throw new Error("Failed to parse LLM response text as JSON");
  }

  let card: AiRadarCard;
  let repairs: string[] = [];

  // Validate the generated card against the strict schema
  const initialParse = AiRadarCardSchema.safeParse(parsed);
  if (initialParse.success) {
    card = initialParse.data;
  } else {
    // Attempt automatic schema repair if validation fails
    const repairResult = repairEnumOnlyOutput(parsed);
    repairs = repairResult.repairs;

    const repairedParse = AiRadarCardSchema.safeParse(repairResult.repairedJson);
    if (repairedParse.success) {
      card = repairedParse.data;
    } else {
      const errorMsg = stringifyValidationError(repairedParse.error);
      throw new Error(`Schema validation failed even after repair: ${errorMsg}`);
    }
  }

  // Audit quality check rules
  const qualityWarnings = evaluateCardQuality(card);

  return {
    card,
    repairs,
    qualityWarnings,
    rawText,
    usage: response.usage,
    latencyMs,
  };
}
