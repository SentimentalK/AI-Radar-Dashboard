async function run() {
  try {
    const date = "2026-07-10";
    const url = `https://huggingface.co/api/daily_papers?date=${date}`;
    console.log(`Fetching papers for ${date}: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    console.log("Is Array?", Array.isArray(data));
    console.log("Count:", Array.isArray(data) ? data.length : "N/A");
    if (Array.isArray(data) && data.length > 0) {
      console.log("First paper title:", data[0]?.paper?.title);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
