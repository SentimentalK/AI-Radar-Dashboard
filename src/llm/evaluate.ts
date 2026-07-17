import type { AiRadarCard } from "./schema";

export function evaluateCardQuality(card: AiRadarCard): string[] {
  const warnings: string[] = [];

  // 1. Text length constraints
  if (card.problem_it_solves.length < 20) {
    warnings.push("problem_it_solves is too short (under 20 characters)");
  }

  if (card.how_it_works.length < 20) {
    warnings.push("how_it_works is too short (under 20 characters)");
  }

  if (card.limitations.length === 0) {
    warnings.push("limitations array is empty");
  }

  if (card.tags.length === 0) {
    warnings.push("tags array is empty");
  }

  // 2. Weak/noisy checks
  if (card.confidence === "low" && card.recommended_action !== "ignore" && card.recommended_action !== "monitor") {
    warnings.push("weak/noisy source should have recommended_action set to ignore or monitor");
  }

  // 3. Source content unavailable alignment
  if (card.source_content_unavailable && card.confidence !== "low") {
    warnings.push("source_content_unavailable=true requires confidence level low");
  }

  // 4. Confidence high requires limitations
  if (card.confidence === "high" && card.limitations.length === 0) {
    warnings.push("confidence=high requires at least one limitation to be listed");
  }

  // 5. Adopt recommended action rules
  if (card.recommended_action === "adopt") {
    if (card.maturity !== "production") {
      warnings.push("adopt action requires maturity level production");
    }
    if (card.confidence !== "high") {
      warnings.push("adopt action requires high confidence rating");
    }
  }

  // 6. Practical work suggestions
  if (card.engineering_relevance_score >= 4 && card.possible_use_at_work.length < 20) {
    warnings.push("high relevance score requires detailed possible_use_at_work (>= 20 characters)");
  }

  // 7. Generic-only tags detection
  const genericTags = ["ai", "tool", "software", "tech", "algorithm", "model"];
  const lowerTags = card.tags.map((t) => t.trim().toLowerCase());
  const allGeneric = lowerTags.length > 0 && lowerTags.every((t) => genericTags.includes(t));
  if (allGeneric) {
    warnings.push("tags array contains only generic placeholder values (e.g. AI, tool)");
  }

  // 8. Marketing terms in summary check
  const buzzwords = ["game-changing", "revolutionary", "cutting-edge", "amazing", "cool new"];
  const summaryLower = card.one_line_summary.toLowerCase();
  const containsBuzzwords = buzzwords.some((word) => summaryLower.includes(word));
  if (containsBuzzwords) {
    warnings.push("one_line_summary contains marketing hype buzzwords");
  }

  return warnings;
}
