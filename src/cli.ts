#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { AppTesterOrchestrator, createDefaultConfig } from "./orchestrator.js";

const program = new Command();

program
  .name("angelina-tester")
  .description("Human-like AI agent that discovers, understands, and tests any web app")
  .version("0.1.0")
  .requiredOption("-u, --url <url>", "URL of the app to test")
  .option("-n, --name <name>", "App name hint for the AI")
  .option("-d, --description <text>", "App description hint for the AI")
  .option("-o, --output <dir>", "Output directory for reports", "reports")
  .option("--max-pages <n>", "Max pages to explore", "8")
  .option("--max-tests <n>", "Max test cases to generate", "15")
  .option("--model <model>", "OpenAI model", process.env.OPENAI_MODEL ?? "gpt-4o")
  .option("--headed", "Run browser with visible window (not headless)")
  .option("--timeout <ms>", "Action timeout in ms", "15000")
  .action(async (opts) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("\n❌ OPENAI_API_KEY is required. Set it in .env or your environment.\n");
      process.exit(1);
    }

    let url = opts.url as string;
    if (!url.startsWith("http")) {
      url = `https://${url}`;
    }

    const config = createDefaultConfig({
      url,
      appName: opts.name,
      appDescription: opts.description,
      outputDir: opts.output,
      maxPages: parseInt(opts.maxPages, 10),
      maxTests: parseInt(opts.maxTests, 10),
      model: opts.model,
      headless: !opts.headed,
      timeout: parseInt(opts.timeout, 10),
    });

    try {
      const orchestrator = new AppTesterOrchestrator(config, apiKey);
      const report = await orchestrator.run();
      process.exit(report.summary.failed > 0 ? 1 : 0);
    } catch (err) {
      console.error("\n❌ Tester failed:", (err as Error).message);
      process.exit(1);
    }
  });

program.parse();
