import type { LlmMessage } from "./types";
import { truncateText } from "../extraction/text";
import {
  RECOMMENDED_ACTION_VALUES,
  CATEGORY_VALUES,
  MATURITY_VALUES,
  CONFIDENCE_VALUES,
} from "./schema";

export type BuildCardPromptInput = {
  sourceType: string;
  sourceName?: string | null;
  title: string;
  url: string;
  publishedAt?: string | null;
  extractedContent: string;
};

export function buildCardMessages(input: BuildCardPromptInput): LlmMessage[] {
  const maxChars = parseInt(process.env.LLM_EVAL_MAX_CHARS || "30000", 10);
  const truncatedContent = truncateText(input.extractedContent, maxChars);

  const systemContent = `You are an AI engineering radar classifier.

Your job is to convert one technical source into a structured dashboard card for an engineering team.

Rules:
- Return strict JSON only.
- Do not include markdown code fences (like \`\`\`) in your response unless returning the JSON object.
- Do not include comments or trailing text.
- Do not invent facts not supported by the source content.
- If evidence is insufficient, say so explicitly in the relevant field.
- Be conservative with recommended_action.
- Focus on practical engineering value.
- Avoid marketing language.
- Prefer concise, information-dense wording.`;

  const userContent = `Source metadata:
{
  "source_type": "${input.sourceType}",
  "source_name": "${input.sourceName || "unknown"}",
  "title": "${input.title}",
  "url": "${input.url}",
  "published_at": "${input.publishedAt || "unknown"}"
}

Source content:
"""
${truncatedContent}
"""

Allowed enum values:
- recommended_action must be exactly one of: ${RECOMMENDED_ACTION_VALUES.map((v) => `"${v}"`).join(", ")}
- category must be exactly one of: ${CATEGORY_VALUES.map((v) => `"${v}"`).join(", ")}
- maturity must be exactly one of: ${MATURITY_VALUES.map((v) => `"${v}"`).join(", ")}
- confidence must be exactly one of: ${CONFIDENCE_VALUES.map((v) => `"${v}"`).join(", ")}

Enum selection rules:
- Never invent new enum values.
- If the source is about web frameworks, frontend architecture, deployment, APIs, or platform engineering, use category = "infra" or "other".
- If the source is a library, repo, SDK, CLI, or developer tool, prefer category = "open_source_tool" when applicable.
- If the source is about benchmarks, evals, testing, or measurement, use category = "evaluation".
- If the source is a weak/noisy announcement with insufficient technical detail, use recommended_action = "ignore" or "monitor", never "try" or "adopt".
- If the source is stable/mature, use maturity = "production". Do not output "stable".
- If the source says something is worth evaluating, map that to recommended_action = "read" or "try". Do not output "evaluate".

Return exactly this JSON shape:
{
  "source_content_unavailable": false,
  "title": "Title of the item",
  "one_line_summary": "One line summary of the item",
  "what_it_is": "A paragraph explaining what the technology is",
  "problem_it_solves": "A paragraph explaining what problem it solves",
  "how_it_works": "A paragraph explaining how it works under the hood",
  "why_now": "A paragraph explaining why this matters now or what changed recently",
  "advantages": ["advantage 1", "advantage 2"],
  "limitations": ["limitation 1", "limitation 2"],
  "alternatives_or_related": ["alternative 1", "alternative 2"],
  "engineering_relevance_score": 3,
  "recommended_action": "monitor",
  "category": "other",
  "maturity": "prototype",
  "tags": ["tag 1", "tag 2"],
  "possible_use_in_ai_radar": "A sentence suggesting how this could be used in AI Radar project",
  "possible_use_at_work": "A sentence suggesting how this could be used at work",
  "risk_notes": ["risk 1", "risk 2"],
  "confidence": "medium"
}`;

  return [
    { role: "system", content: systemContent },
    { role: "user", content: userContent },
  ];
}
