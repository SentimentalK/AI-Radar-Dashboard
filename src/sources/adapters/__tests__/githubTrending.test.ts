import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { githubTrendingAdapter } from "../githubTrending";
import type { SourceConfig } from "../../types";

test("githubTrendingAdapter parses HTML fixture correctly", async () => {
  const fixturePath = path.resolve("src/sources/adapters/__fixtures__/github-trending.html");
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture file not found: ${fixturePath}`);
  }
  const html = fs.readFileSync(fixturePath, "utf8");

  // Stub fetch to return the local HTML
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    return {
      ok: true,
      status: 200,
      text: async () => html,
    } as any;
  };

  try {
    const source: SourceConfig = {
      id: "github-trending-ai-test",
      name: "GitHub Trending AI",
      type: "repo",
      fetchMethod: "github_trending",
      url: "https://github.com/trending",
      enabled: true,
      config: {
        hydrateWithApi: false, // Skip REST calls during offline tests
        aiOnly: true,
      },
    };

    const items = await githubTrendingAdapter.fetchItems(source);
    
    assert.ok(items.length > 0, "Should extract at least one trending AI item from fixture");
    
    const first = items[0];
    assert.ok(first.title.includes("/"), "Title should be owner/repo format");
    assert.strictEqual(first.sourceType, "repo");
    assert.strictEqual(first.author, first.title.split("/")[0]);
    assert.ok(first.url.startsWith("https://github.com/"), "URL should point to github.com");
    assert.ok(first.rawContent.length > 0, "Should parse content");
    assert.ok(typeof first.metadata?.starsToday === "number", "starsToday should be parsed");
    assert.strictEqual(first.metadata?.hydrationStatus, "skipped_no_token");
    assert.ok(((first.metadata?.aiMatchScore as number) || 0) >= 3, "Filtered repo should match score threshold");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
