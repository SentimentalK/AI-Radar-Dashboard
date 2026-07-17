import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { anthropicListingAdapter } from "../anthropicListing";
import type { SourceConfig } from "../../types";

test("anthropicListingAdapter parses news HTML fixture correctly", async () => {
  const fixturePath = path.resolve("src/sources/adapters/__fixtures__/anthropic-news.html");
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
      id: "anthropic-news-test",
      name: "Anthropic News",
      type: "official",
      fetchMethod: "anthropic_listing",
      url: "https://www.anthropic.com/news",
      enabled: true,
      config: {
        section: "news",
        maxResults: 10,
      },
    };

    const items = await anthropicListingAdapter.fetchItems(source);
    
    assert.ok(items.length > 0, "Should extract at least one news item from fixture");
    
    const first = items[0];
    assert.ok(first.title.length > 0, "Title should not be empty");
    assert.strictEqual(first.sourceType, "official");
    assert.strictEqual(first.author, "Anthropic");
    assert.ok(first.url.startsWith("https://www.anthropic.com/news/"), "URL should point to news folder");
    assert.strictEqual(first.metadata?.section, "news");
    assert.ok(first.publishedAt.length > 0, "publishedAt should not be empty");
    assert.ok(first.rawExcerpt.length > 0, "rawExcerpt should be parsed");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("anthropicListingAdapter parses research HTML fixture correctly", async () => {
  const fixturePath = path.resolve("src/sources/adapters/__fixtures__/anthropic-research.html");
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
      id: "anthropic-research-test",
      name: "Anthropic Research",
      type: "official",
      fetchMethod: "anthropic_listing",
      url: "https://www.anthropic.com/research",
      enabled: true,
      config: {
        section: "research",
        maxResults: 10,
      },
    };

    const items = await anthropicListingAdapter.fetchItems(source);
    
    assert.ok(items.length > 0, "Should extract at least one research item from fixture");
    
    const first = items[0];
    assert.ok(first.title.length > 0, "Title should not be empty");
    assert.strictEqual(first.sourceType, "official");
    assert.strictEqual(first.author, "Anthropic");
    assert.ok(first.url.startsWith("https://www.anthropic.com/research/"), "URL should point to research folder");
    assert.strictEqual(first.metadata?.section, "research");
    assert.ok(first.publishedAt.length > 0, "publishedAt should not be empty");
    assert.ok(first.rawExcerpt.length > 0, "rawExcerpt should be parsed");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
