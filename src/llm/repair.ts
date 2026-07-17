import {
  RECOMMENDED_ACTION_VALUES,
  CATEGORY_VALUES,
  MATURITY_VALUES,
  CONFIDENCE_VALUES,
} from "./schema";

export type RepairResult = {
  repairedJson: unknown;
  repairs: string[];
};

export function repairEnumOnlyOutput(input: unknown): RepairResult {
  if (typeof input !== "object" || input === null) {
    return { repairedJson: input, repairs: [] };
  }

  const repaired: Record<string, any> = { ...(input as Record<string, any>) };
  const repairs: string[] = [];

  // 1. Repair recommended_action
  if ("recommended_action" in repaired) {
    const action = String(repaired.recommended_action).trim().toLowerCase();
    if (!RECOMMENDED_ACTION_VALUES.includes(action as any)) {
      let mapped = action;
      if (action === "evaluate" || action === "investigate") {
        mapped = "read";
      } else if (action === "test" || action === "experiment") {
        mapped = "try";
      } else if (action === "watch") {
        mapped = "monitor";
      } else if (action === "skip") {
        mapped = "ignore";
      }

      if (RECOMMENDED_ACTION_VALUES.includes(mapped as any)) {
        repaired.recommended_action = mapped;
        repairs.push(`Map recommended_action: "${action}" -> "${mapped}"`);
      }
    }
  }

  // 2. Repair category
  if ("category" in repaired) {
    const cat = String(repaired.category).trim().toLowerCase();
    if (!CATEGORY_VALUES.includes(cat as any)) {
      let mapped = cat;
      if (cat === "web_framework" || cat === "web_development") {
        mapped = "infra";
      } else if (cat === "developer_tool" || cat === "tool" || cat === "llm_tool") {
        mapped = "open_source_tool";
      } else if (cat === "benchmark" || cat === "eval") {
        mapped = "evaluation";
      } else if (cat === "software_engineering") {
        mapped = "coding_agent";
      } else {
        mapped = "other"; // Default unknown categories to other
      }

      repaired.category = mapped;
      repairs.push(`Map category: "${cat}" -> "${mapped}"`);
    }
  }

  // 3. Repair maturity
  if ("maturity" in repaired) {
    const mat = String(repaired.maturity).trim().toLowerCase();
    if (!MATURITY_VALUES.includes(mat as any)) {
      let mapped = mat;
      if (mat === "stable" || mat === "mature") {
        mapped = "production";
      } else if (mat === "experimental" || mat === "early") {
        mapped = "prototype";
      } else if (mat === "academic") {
        mapped = "research";
      }

      if (MATURITY_VALUES.includes(mapped as any)) {
        repaired.maturity = mapped;
        repairs.push(`Map maturity: "${mat}" -> "${mapped}"`);
      }
    }
  }

  // 4. Repair confidence
  if ("confidence" in repaired) {
    const conf = String(repaired.confidence).trim().toLowerCase();
    if (!CONFIDENCE_VALUES.includes(conf as any)) {
      let mapped = conf;
      if (conf === "uncertain") {
        mapped = "low";
      } else if (conf === "medium-high" || conf === "high-medium") {
        mapped = "medium";
      }

      if (CONFIDENCE_VALUES.includes(mapped as any)) {
        repaired.confidence = mapped;
        repairs.push(`Map confidence: "${conf}" -> "${mapped}"`);
      }
    }
  }

  return { repairedJson: repaired, repairs };
}
