import type { LlmProvider, LlmJsonRequest, LlmJsonResponse } from "../types";
import { parseModelJson } from "../json";

export class GroqProvider implements LlmProvider {
  name = "groq";

  get model(): string {
    return process.env.GROQ_MODEL || process.env.LLM_MODEL || "openai/gpt-oss-120b";
  }

  async generateJson(request: LlmJsonRequest): Promise<LlmJsonResponse> {
    const apiKey = (process.env.GROQ_API_KEY || "").trim();
    if (!apiKey) {
      throw new Error("GROQ_API_KEY environment variable is required to execute Groq requests");
    }

    const baseUrl = (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").trim().replace(/\/+$/, "");
    const completionsUrl = `${baseUrl}/chat/completions`;

    const body: Record<string, any> = {
      model: this.model,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: request.temperature !== undefined ? request.temperature : 0.1,
      response_format: request.responseFormat === "json" ? { type: "json_object" } : undefined,
    };

    // Use max_completion_tokens (do not send both max_tokens and max_completion_tokens)
    const maxTokensVal = request.maxOutputTokens ?? 4096;
    body.max_completion_tokens = maxTokensVal;

    let attempts = 0;
    const maxAttempts = 4;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await fetch(completionsUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
        });

        if (response.status === 429) {
          if (attempts >= maxAttempts) {
            throw new Error(`Rate limit exceeded and max retry attempts reached.`);
          }

          let waitSeconds = 15;
          const retryAfter = response.headers.get("retry-after");
          if (retryAfter) {
            const parsedSec = parseFloat(retryAfter);
            if (!isNaN(parsedSec)) {
              waitSeconds = parsedSec;
            }
          } else {
            try {
              const clonedResponse = response.clone();
              const bodyText = await clonedResponse.text();
              const match = bodyText.match(/try again in (\d+(\.\d+)?)s/i);
              if (match && match[1]) {
                waitSeconds = parseFloat(match[1]);
              }
            } catch {}
          }

          const sleepMs = Math.ceil(waitSeconds * 1000) + 1500;
          console.log(`\n  [groq] Rate limit hit (429). Retrying in ${sleepMs}ms (attempt ${attempts}/${maxAttempts})...`);
          await new Promise((resolve) => setTimeout(resolve, sleepMs));
          continue;
        }

        if (!response.ok) {
          let errorBody = "";
          try {
            errorBody = await response.text();
            errorBody = errorBody.slice(0, 1000);
          } catch {
            errorBody = "unreadable response body";
          }
          throw new Error(
            `Groq request failed with HTTP status ${response.status} (${response.statusText}): ${errorBody}`
          );
        }

        const responseData = (await response.json()) as any;
        
        if (!responseData?.choices || responseData.choices.length === 0) {
          throw new Error("Groq API returned an empty choices array");
        }

        const rawText = responseData.choices[0]?.message?.content;
        if (rawText === undefined || rawText === null) {
          throw new Error("Groq API returned choices with missing message content");
        }

        const parsedJson = parseModelJson(rawText);

        const inputTokens = responseData?.usage?.prompt_tokens;
        const outputTokens = responseData?.usage?.completion_tokens;
        const totalTokens = responseData?.usage?.total_tokens;

        return {
          rawText,
          parsedJson,
          model: this.model,
          provider: "groq",
          usage: inputTokens !== undefined ? {
            inputTokens,
            outputTokens,
            totalTokens,
          } : undefined,
        };
      } catch (err) {
        if (attempts >= maxAttempts) {
          throw new Error(`Groq provider HTTP request failed: ${(err as Error).message}`);
        }
        console.log(`\n  [groq] Request failed: ${(err as Error).message}. Retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
    throw new Error("Groq provider execution failed inexplicably.");
  }
}

export const groqProvider = new GroqProvider();
