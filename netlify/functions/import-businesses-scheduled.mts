import type { Config } from "@netlify/functions";
import { processNextBatch } from "../../src/lib/importers/queue";

async function handler() {
  const summary = await processNextBatch();
  console.log("import-businesses-scheduled:", JSON.stringify(summary));
}

export default handler;

export const config: Config = {
  // Every 15 minutes — a handful of area+category searches per run, staying
  // well under both the 30s scheduled-function limit and Google's rate limit.
  schedule: "*/15 * * * *",
};
