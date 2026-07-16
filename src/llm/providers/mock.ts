import type { LlmProvider, LlmJsonRequest, LlmJsonResponse } from "../types";

export const mockProvider: LlmProvider = {
  name: "mock",
  model: "mock-card-model",

  async generateJson(request: LlmJsonRequest): Promise<LlmJsonResponse> {
    // Attempt to extract the title from the prompt's source metadata
    let title = "Mock Ingested Title";
    const userMessage = request.messages.find((m) => m.role === "user");
    if (userMessage) {
      const match = userMessage.content.match(/"title":\s*"([^"]+)"/);
      if (match && match[1]) {
        title = match[1];
      }
    }

    const mockCard = {
      source_content_unavailable: false,
      title: title,
      one_line_summary: "Mock summary demonstrating local provider execution.",
      what_it_is: "A simulation content object representing a structured dashboard card.",
      problem_it_solves: "Allows verification of schema validators without remote LLM costs.",
      how_it_works: "Mock adapter parses input metadata and returns typed static attributes.",
      why_now: "Ensures offline compilations and local pipelines run reliably.",
      advantages: ["Runs offline", "Zero API request fees"],
      limitations: ["No real content parsing", "Static fields"],
      alternatives_or_related: ["Zhipu GLM 4.7 API"],
      engineering_relevance_score: 3,
      recommended_action: "try",
      category: "other",
      maturity: "prototype",
      tags: ["mock", "test", "offline"],
      possible_use_in_ai_radar: "Validates database schema integrations.",
      possible_use_at_work: "Acts as a structural check inside development pipelines.",
      risk_notes: ["No risk during local tests"],
      confidence: "medium",
    };

    const rawText = JSON.stringify(mockCard, null, 2);

    return {
      rawText,
      parsedJson: mockCard,
      model: "mock-card-model",
      provider: "mock",
      usage: {
        inputTokens: 50,
        outputTokens: 80,
        totalTokens: 130,
      },
    };
  },
};
