import type { AiRadarCard } from "./schema";

export function evaluateCardQuality(card: AiRadarCard): string[] {
  const warnings: string[] = [];

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

  if (card.recommended_action === "adopt" && card.confidence !== "high") {
    warnings.push("adopt action requires high confidence rating");
  }

  return warnings;
}
