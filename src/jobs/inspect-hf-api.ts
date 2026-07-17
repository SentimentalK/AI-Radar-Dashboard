async function run() {
  try {
    const url = "https://huggingface.co/api/daily_papers";
    const response = await fetch(url);
    const data = await response.json();
    const item = data[0];
    console.log("Parent keys:", Object.keys(item));
    console.log("Child 'paper' keys:", Object.keys(item.paper));
    console.log("Full sample child 'paper' data:", JSON.stringify(item.paper, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
