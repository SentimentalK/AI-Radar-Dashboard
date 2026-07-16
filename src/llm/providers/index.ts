import type { LlmProvider } from "../types";
import { mockProvider } from "./mock";
import { zhipuProvider } from "./zhipu";

export function createLlmProvider(): LlmProvider {
  const providerName = (process.env.LLM_PROVIDER || "mock").trim().toLowerCase();

  switch (providerName) {
    case "mock":
      return mockProvider;
    case "zhipu": {
      const apiKey = (process.env.ZHIPU_API_KEY || "").trim();
      if (!apiKey) {
        throw new Error("ZHIPU_API_KEY environment variable is required when LLM_PROVIDER=zhipu");
      }
      return zhipuProvider;
    }
    default:
      throw new Error(`Unknown or unsupported LLM_PROVIDER: "${providerName}". Supported: mock, zhipu`);
  }
}
