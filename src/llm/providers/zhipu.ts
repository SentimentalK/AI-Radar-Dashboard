import type { LlmProvider, LlmJsonRequest, LlmJsonResponse } from "../types";
import { parseModelJson } from "../json";

export class ZhipuProvider implements LlmProvider {
  name = "zhipu";

  get model(): string {
    return process.env.ZHIPU_MODEL || process.env.LLM_MODEL || "glm-4-flash";
  }

  async generateJson(request: LlmJsonRequest): Promise<LlmJsonResponse> {
    const apiKey = (process.env.ZHIPU_API_KEY || "").trim();
    if (!apiKey) {
      throw new Error("ZHIPU_API_KEY environment variable is required to execute Zhipu GLM requests");
    }

    const baseUrl = (process.env.ZHIPU_BASE_URL || "https://open.bigmodel.cn/api/paas/v4").trim().replace(/\/+$/, "");
    const completionsUrl = `${baseUrl}/chat/completions`;

    // Map request payload to OpenAI-compatible BigModel body
    const body = {
      model: this.model,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: request.temperature !== undefined ? request.temperature : 0.1,
      max_tokens: request.maxOutputTokens,
      response_format: request.responseFormat === "json" ? { type: "json_object" } : undefined,
    };

    try {
      const response = await fetch(completionsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let errorBody = "";
        try {
          errorBody = await response.text();
          errorBody = errorBody.slice(0, 300); // Clamp preview size
        } catch {
          errorBody = "unreadable response body";
        }
        throw new Error(
          `Zhipu completions request failed with HTTP status ${response.status}: ${errorBody}`
        );
      }

      const responseData = (await response.json()) as any;
      const rawText = responseData?.choices?.[0]?.message?.content || "";
      const parsedJson = parseModelJson(rawText);

      // Extract usage metadata if available
      const inputTokens = responseData?.usage?.prompt_tokens;
      const outputTokens = responseData?.usage?.completion_tokens;
      const totalTokens = responseData?.usage?.total_tokens;

      return {
        rawText,
        parsedJson,
        model: this.model,
        provider: "zhipu",
        usage: inputTokens !== undefined ? {
          inputTokens,
          outputTokens,
          totalTokens,
        } : undefined,
      };
    } catch (err) {
      throw new Error(`Zhipu provider HTTP request failed: ${(err as Error).message}`);
    }
  }
}

export const zhipuProvider = new ZhipuProvider();
