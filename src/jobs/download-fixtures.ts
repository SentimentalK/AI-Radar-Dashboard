import fs from "fs";
import path from "path";

async function download(url: string, filename: string) {
  try {
    console.log(`Downloading: ${url}`);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const html = await response.text();
    const dir = path.resolve("src/sources/adapters/__fixtures__");
    fs.mkdirSync(dir, { recursive: true });
    
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, html, "utf8");
    console.log(`Saved fixture: ${filePath} (${(html.length / 1024).toFixed(2)} KB)`);
  } catch (err) {
    console.error(`Failed to download ${url}:`, err);
  }
}

async function run() {
  await download("https://github.com/trending", "github-trending.html");
  await download("https://www.anthropic.com/news", "anthropic-news.html");
  await download("https://www.anthropic.com/research", "anthropic-research.html");
}

run();
