import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { DiscovererAgent } from "./agents/discoverer.js";
import { PlannerAgent } from "./agents/planner.js";
import { ExecutorAgent } from "./agents/executor.js";
import { HumanBrowser, saveSnapshotJson } from "./browser/human-browser.js";
import { LLMClient } from "./llm/client.js";
import { Reporter, printSummary } from "./reporter/index.js";
import type { TestReport, TesterConfig } from "./types.js";

export class AppTesterOrchestrator {
  private llm: LLMClient;
  private discoverer: DiscovererAgent;
  private planner: PlannerAgent;
  private executor: ExecutorAgent;
  private reporter: Reporter;

  constructor(private config: TesterConfig, apiKey: string) {
    this.llm = new LLMClient(apiKey, config.model);
    this.discoverer = new DiscovererAgent(this.llm);
    this.planner = new PlannerAgent(this.llm);
    this.executor = new ExecutorAgent(this.llm);
    this.reporter = new Reporter(config.outputDir);
  }

  async run(): Promise<TestReport> {
    const startTime = Date.now();
    await mkdir(this.config.outputDir, { recursive: true });

    console.log("\n🤖 Angelina App Tester");
    console.log(`   Target: ${this.config.url}`);
    console.log(`   Model:  ${this.config.model}\n`);

    const browser = await chromium.launch({ headless: this.config.headless });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(this.config.timeout);

    const humanBrowser = new HumanBrowser(page, this.config.outputDir);
    await humanBrowser.init();

    try {
      // Phase 1: Discover & understand
      console.log("📡 Phase 1: Discovering app & understanding purpose...");
      const { understanding, snapshots } = await this.discoverer.exploreApp(
        humanBrowser,
        this.config
      );
      await saveSnapshotJson(this.config.outputDir, "discovery", {
        understanding,
        snapshots: snapshots.map((s) => ({
          url: s.url,
          title: s.title,
          elementCount: s.elements.length,
        })),
      });
      console.log(`   ✓ Found ${understanding.coreFeatures.length} features across ${understanding.discoveredPages.length} pages`);
      console.log(`   ✓ Purpose: ${understanding.purpose.slice(0, 100)}...`);

      // Phase 2: Plan tests
      console.log("\n📋 Phase 2: Generating test plan...");
      const plan = await this.planner.createPlan(understanding, this.config);
      await saveSnapshotJson(this.config.outputDir, "test-plan", plan);
      console.log(`   ✓ Created ${plan.testCases.length} test cases`);

      // Phase 3: Execute tests
      console.log("\n🧪 Phase 3: Running tests (human-like)...");
      const results = [];
      for (const testCase of plan.testCases) {
        const result = await this.executor.runTest(
          humanBrowser,
          testCase,
          this.config.url
        );
        results.push(result);
      }

      const report: TestReport = {
        config: this.config,
        understanding,
        plan,
        results,
        summary: {
          total: results.length,
          passed: results.filter((r) => r.status === "passed").length,
          failed: results.filter((r) => r.status === "failed").length,
          skipped: results.filter((r) => r.status === "skipped").length,
          durationMs: Date.now() - startTime,
        },
        generatedAt: new Date().toISOString(),
      };

      // Phase 4: Report
      console.log("\n📊 Phase 4: Generating report...");
      const { jsonPath, htmlPath } = await this.reporter.generate(report);
      printSummary(report);
      console.log(`\n  JSON: ${jsonPath}`);
      console.log(`  HTML: ${htmlPath}\n`);

      return report;
    } finally {
      await browser.close();
    }
  }
}

export function createDefaultConfig(overrides: Partial<TesterConfig> & { url: string }): TesterConfig {
  return {
    url: overrides.url,
    appName: overrides.appName,
    appDescription: overrides.appDescription,
    maxDepth: overrides.maxDepth ?? 2,
    maxPages: overrides.maxPages ?? 8,
    maxTests: overrides.maxTests ?? 15,
    headless: overrides.headless ?? process.env.HEADLESS !== "false",
    timeout: overrides.timeout ?? 15000,
    outputDir: overrides.outputDir ?? join(process.cwd(), "reports"),
    model: overrides.model ?? process.env.OPENAI_MODEL ?? "gpt-4o",
  };
}
