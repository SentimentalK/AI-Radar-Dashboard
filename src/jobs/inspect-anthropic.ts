async function testParse(url: string) {
  try {
    console.log(`\nTesting parse on: ${url}`);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const html = await response.text();
    
    // Regular expression to match each article link block
    // Articles on Anthropic website are represented by <a href="/news/..." or <a href="/research/..."
    const articleRegex = /<a\s+href="(\/(?:news|research)\/([a-zA-Z0-9_-]+))"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    const items: any[] = [];
    
    while ((match = articleRegex.exec(html)) !== null) {
      const link = `https://www.anthropic.com${match[1]}`;
      const slug = match[2];
      const innerHtml = match[3];
      
      // Extract title: usually inside h2 or h3 or class containing "Title"
      const titleMatch = innerHtml.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";
      
      // Extract date: usually inside <time>...</time>
      const dateMatch = innerHtml.match(/<time[^>]*>([\s\S]*?)<\/time>/);
      const dateStr = dateMatch ? dateMatch[1].replace(/<[^>]+>/g, "").trim() : "";
      
      // Extract category: usually inside <span class="caption bold">...
      const catMatch = innerHtml.match(/<span class="[^"]*caption[^"]*">([\s\S]*?)<\/span>/);
      const category = catMatch ? catMatch[1].replace(/<[^>]+>/g, "").trim() : "";
      
      // Extract excerpt: usually inside <p class="...body...">...
      const excerptMatch = innerHtml.match(/<p class="[^"]*body[^"]*">([\s\S]*?)<\/p>/);
      const excerpt = excerptMatch ? excerptMatch[1].replace(/<[^>]+>/g, "").trim() : "";
      
      if (title && !items.some(i => i.url === link)) {
        items.push({
          title,
          url: link,
          dateStr,
          category,
          excerpt,
          slug
        });
      }
    }
    
    console.log(`Extracted ${items.length} items.`);
    console.log("Top 5 items:", JSON.stringify(items.slice(0, 5), null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

async function run() {
  await testParse("https://www.anthropic.com/news");
  await testParse("https://www.anthropic.com/research");
}

run();
