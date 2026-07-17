import { parse } from "node-html-parser";
import type { SourceConfig, SourceAdapter, RawSourceItem } from "../types";

const AI_KEYWORDS = [
  "ai",
  "llm",
  "agent",
  "rag",
  "inference",
  "model",
  "transformer",
  "embedding",
  "vector",
  "mcp",
  "machine-learning",
  "deep-learning",
  "generative-ai",
  "computer-vision",
  "speech",
  "multimodal"
];

function calculateAiScore(
  repoName: string,
  description: string,
  topics: string[]
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const lowerName = repoName.toLowerCase();
  const lowerDesc = description.toLowerCase();

  // 1. Topic Match: +3 points
  for (const topic of topics) {
    const lowerTopic = topic.toLowerCase();
    if (AI_KEYWORDS.some(kw => lowerTopic === kw || lowerTopic.includes(kw))) {
      score += 3;
      reasons.push(`topic:${lowerTopic}`);
    }
  }

  // 2. Description keyword match: +2 points
  const matchedDescKws = AI_KEYWORDS.filter(kw => {
    const regex = new RegExp(`\\b${kw}\\b`, "i");
    return regex.test(lowerDesc);
  });
  if (matchedDescKws.length > 0) {
    score += 2;
    reasons.push(`description:${matchedDescKws.join(",")}`);
  }

  // 3. Repository name keyword match: +1 point
  const matchedNameKws = AI_KEYWORDS.filter(kw => lowerName.includes(kw));
  if (matchedNameKws.length > 0) {
    score += 1;
    reasons.push(`name:${matchedNameKws.join(",")}`);
  }

  return { score, reasons };
}

export const githubTrendingAdapter: SourceAdapter = {
  fetchMethod: "github_trending",

  async fetchItems(source: SourceConfig): Promise<RawSourceItem[]> {
    const config = (source.config || {}) as Record<string, any>;
    const since = config.since || "daily";
    const language = config.language || "";
    const maxResults = parseInt(config.maxResults || "25", 10);
    const hydrateWithApi = config.hydrateWithApi !== false;
    const aiOnly = config.aiOnly !== false;

    const url = `https://github.com/trending/${language}?since=${since}`;
    console.log(`[GitHubTrending] Fetching trending page: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub Trending request failed with HTTP status ${response.status}`);
    }

    const html = await response.text();
    const root = parse(html);
    const rows = root.querySelectorAll("article.Box-row");
    const token = process.env.GITHUB_TOKEN;

    const rawItems: RawSourceItem[] = [];

    for (const row of rows) {
      const titleAnchor = row.querySelector("h2.h3 a");
      if (!titleAnchor) continue;

      const href = titleAnchor.getAttribute("href") || "";
      const pathParts = href.split("/").filter(Boolean);
      if (pathParts.length < 2) continue;

      const owner = pathParts[0].trim();
      const repo = pathParts[1].trim();
      const repoFullName = `${owner}/${repo}`;

      // Description
      const descParagraph = row.querySelector("p.col-9");
      const description = descParagraph ? descParagraph.text.trim().replace(/\s+/g, " ") : "";

      // Language
      const langSpan = row.querySelector("[itemprop=programmingLanguage]");
      const progLang = langSpan ? langSpan.text.trim() : "";

      // Stars added in trending duration
      const rowText = row.text;
      const starsMatch = rowText.match(/([\d,]+)\s+stars?\s+(?:today|this week|this month)/i);
      const starsToday = starsMatch ? parseInt(starsMatch[1].replace(/,/g, ""), 10) : 0;

      let topics: string[] = [];
      let stargazersCount: number | null = null;
      let forksCount: number | null = null;
      let openIssuesCount: number | null = null;
      let licenseName: string | null = null;
      let homepageUrl: string | null = null;
      let createdAtStr: string | null = null;
      let hydrationStatus: "hydrated" | "skipped_no_token" | "failed" = "skipped_no_token";

      // Hydration
      if (hydrateWithApi) {
        if (token) {
          try {
            const apiLink = `https://api.github.com/repos/${owner}/${repo}`;
            const apiRes = await fetch(apiLink, {
              headers: {
                "Accept": "application/vnd.github+json",
                "User-Agent": "AI-Radar-Dashboard",
                "Authorization": `Bearer ${token}`
              }
            });

            if (apiRes.ok) {
              const apiData = await apiRes.json() as Record<string, any>;
              topics = Array.isArray(apiData.topics) ? apiData.topics : [];
              stargazersCount = typeof apiData.stargazers_count === "number" ? apiData.stargazers_count : null;
              forksCount = typeof apiData.forks_count === "number" ? apiData.forks_count : null;
              openIssuesCount = typeof apiData.open_issues_count === "number" ? apiData.open_issues_count : null;
              homepageUrl = apiData.homepage || null;
              createdAtStr = apiData.created_at || null;
              
              if (apiData.license && typeof apiData.license === "object") {
                licenseName = apiData.license.name || apiData.license.key || null;
              }
              hydrationStatus = "hydrated";
            } else {
              console.warn(`[GitHubTrending] Hydration request failed for ${repoFullName}: HTTP ${apiRes.status}`);
              hydrationStatus = "failed";
            }
          } catch (apiErr) {
            console.warn(`[GitHubTrending] Hydration exception for ${repoFullName}:`, apiErr);
            hydrationStatus = "failed";
          }
        } else {
          hydrationStatus = "skipped_no_token";
        }
      }

      // AI filtering
      const { score, reasons } = calculateAiScore(repo, description, topics);
      
      if (aiOnly && score < 3) {
        // Skipped because it does not match AI topic requirements
        continue;
      }

      const publishedAt = createdAtStr || new Date().toISOString();
      const content = `${repoFullName} is a trending repository starred on GitHub.
Language: ${progLang}
Description: ${description}
Recent Momentum: ${starsToday} stars added during trending period.
Overall Stars: ${stargazersCount !== null ? stargazersCount : "N/A"} | Forks: ${forksCount !== null ? forksCount : "N/A"}`;

      rawItems.push({
        title: repoFullName,
        url: `https://github.com/${owner}/${repo}`,
        author: owner,
        publishedAt,
        rawExcerpt: description || `Trending repository ${repoFullName} on GitHub`,
        rawContent: content,
        sourceId: source.id,
        sourceType: source.type, // 'repo'
        metadata: {
          repoOwner: owner,
          repoName: repo,
          starsToday,
          language: progLang,
          topics,
          stars: stargazersCount,
          forks: forksCount,
          openIssues: openIssuesCount,
          license: licenseName,
          homepage: homepageUrl,
          hydrationStatus,
          aiMatchScore: score,
          aiMatchReasons: reasons
        }
      });
    }

    return rawItems.slice(0, maxResults);
  }
};
