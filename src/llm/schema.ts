import { z } from "zod";

export const AiRadarCardSchema = z.object({
  source_content_unavailable: z.boolean(),

  title: z.string(),
  one_line_summary: z.string(),

  what_it_is: z.string(),
  problem_it_solves: z.string(),
  how_it_works: z.string(),
  why_now: z.string(),

  advantages: z.array(z.string()),
  limitations: z.array(z.string()),
  alternatives_or_related: z.array(z.string()),

  engineering_relevance_score: z.number().int().min(1).max(5),

  recommended_action: z.enum([
    "ignore",
    "monitor",
    "read",
    "try",
    "adopt",
  ]),

  category: z.enum([
    "agent",
    "rag",
    "memory",
    "coding_agent",
    "evaluation",
    "model_release",
    "open_source_tool",
    "infra",
    "security",
    "multimodal",
    "local_llm",
    "other",
  ]),

  maturity: z.enum([
    "research",
    "prototype",
    "production",
    "hype",
  ]),

  tags: z.array(z.string()),

  possible_use_in_ai_radar: z.string(),
  possible_use_at_work: z.string(),

  risk_notes: z.array(z.string()),

  confidence: z.enum([
    "low",
    "medium",
    "high",
  ]),
});

export type AiRadarCard = z.infer<typeof AiRadarCardSchema>;
