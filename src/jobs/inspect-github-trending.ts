async function run() {
  try {
    const url = "https://github.com/trending";
    console.log(`Fetching: ${url}`);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const html = await response.text();
    console.log("HTML length:", html.length);
    
    // Find the first <article class="Box-row">
    const index = html.indexOf('<article class="Box-row">');
    if (index !== -1) {
      console.log("Snippet from <article class=\"Box-row\">:");
      console.log(html.slice(index, index + 2500));
    } else {
      console.log("Could not find <article class=\"Box-row\">. Log first 1000 chars:");
      console.log(html.slice(0, 1000));
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
