import type { SourceAdapter, RawSourceItem, SourceConfig } from "../types";

export const githubReleasesAdapter: SourceAdapter = {
  fetchMethod: "github_releases",

  async fetchItems(source: SourceConfig): Promise<RawSourceItem[]> {
    const config = (source.config || {}) as Record<string, any>;
    const owner = config.owner;
    const repo = config.repo;

    if (!owner || !repo) {
      throw new Error(`GitHub releases source "${source.id}" is missing "owner" or "repo" configuration`);
    }

    const maxResults = parseInt(config.maxResults || "10", 10);
    const includePrerelease = config.includePrerelease ?? false;

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;

    const headers: Record<string, string> = {
      "Accept": "application/vnd.github+json",
      "User-Agent": "AI-Radar-Dashboard",
    };

    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    try {
      const response = await fetch(apiUrl, { headers });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API returned status ${response.status}: ${errorText}`);
      }

      const releases = (await response.json()) as any[];
      if (!Array.isArray(releases)) {
        throw new Error("GitHub API response is not a valid releases array");
      }

      const items: RawSourceItem[] = [];

      for (const release of releases) {
        // Skip drafts
        if (release.draft) {
          continue;
        }

        // Skip prereleases if configured
        if (!includePrerelease && release.prerelease) {
          continue;
        }

        // We map each matched release
        items.push({
          sourceId: source.id,
          sourceType: source.type,
          title: `${owner}/${repo} release ${release.name || release.tag_name}`,
          url: release.html_url,
          author: release.author?.login || null,
          publishedAt: release.published_at || null,
          rawExcerpt: release.body || null,
          rawContent: release.body || null,
          metadata: {
            repoFullName: `${owner}/${repo}`,
            tagName: release.tag_name,
            prerelease: release.prerelease,
            draft: release.draft,
          },
        });

        // Limit results check
        if (items.length >= maxResults) {
          break;
        }
      }

      return items;
    } catch (err) {
      throw new Error(`Failed to fetch GitHub releases for "${owner}/${repo}": ${(err as Error).message}`);
    }
  },
};
