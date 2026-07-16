import { loadEnabledSources } from "./loadSources";

function inspect() {
  console.log("AI Radar Source Inspect\n");

  try {
    const sources = loadEnabledSources();
    console.log(`Enabled sources: ${sources.length}\n`);

    for (const source of sources) {
      console.log(`- ${source.id}`);
      console.log(`  name: ${source.name}`);
      console.log(`  type: ${source.type}`);
      console.log(`  fetchMethod: ${source.fetchMethod}`);
      console.log(`  url: ${source.url || "N/A"}`);
      console.log();
    }
  } catch (error) {
    console.error("Sources inspection failed:", error);
    process.exit(1);
  }
}

inspect();
