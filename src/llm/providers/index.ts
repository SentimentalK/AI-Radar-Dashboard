import type { LlmProvider } from "../types";
import { mockProvider } from "./mock";
import { ZhipuProvider, zhipuProvider } from "./zhipu";
import { GroqProvider, groqProvider } from "./groq";

export function createLlmProviderFromConfig(config: { provider: string; model?: string }): LlmProvider {
  const providerName = config.provider.trim().toLowerCase();

  switch (providerName) {
    case "mock":
      return mockProvider;
    case "zhipu": {
      const apiKey = (process.env.ZHIPU_API_KEY || "").trim();
      if (!apiKey) {
        throw new Error("ZHIPU_API_KEY environment variable is required when LLM_PROVIDER=zhipu");
      }
      const instance = new ZhipuProvider();
      if (config.model) {
        Object.defineProperty(instance, "model", {
          get: () => config.model,
          configurable: true,
        });
      }
      return instance;
    }
    case "groq": {
      const apiKey = (process.env.GROQ_API_KEY || "").trim();
      if (!apiKey) {
        throw new Error("GROQ_API_KEY environment variable is required when LLM_PROVIDER=groq");
      }
      const instance = new GroqProvider();
      if (config.model) {
        Object.defineProperty(instance, "model", {
          get: () => config.model,
          configurable: true,
        });
      }
      return instance;
    }
    default:
      throw new Error(`Unknown or unsupported LLM_PROVIDER: "${providerName}". Supported: mock, zhipu, groq`);
  }
}

export function createLlmProvider(): LlmProvider {
  const provider = process.env.LLM_PROVIDER || "mock";
  return createLlmProviderFromConfig({ provider });
}
