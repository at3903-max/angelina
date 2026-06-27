import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { DiscovererAgent } from "./agents/discoverer.js";
import { PlannerAgent } from "./agents/planner.js";
import { ExecutorAgent } from "./agents/executor.js";
import { HumanBrowser, saveSnapshotJson } from "./browser/human-browser.js";
import { LLMClient } from "./llm/client.js";
import { Reporter, printSummary } from "./reporter/index.js";
import type { RunPhase, RunProgressEvent, TestReport, TesterConfig } from "./types.js";

export type ProgressCallback = (event: Omit<RunProgressEvent, "runId" | "timestamp">) => void;

export interface OrchestratorOptions {
  runId?: string;
  onProgress?: ProgressCallback;
  silent?: boolean;
}

export class AppTesterOrchestrator {
  private llm: LLMClient;
  private discoverer: DiscovererAgent;
  private planner: PlannerAgent;
  private executor: ExecutorAgent;
  private reporter: Reporter;
  private runId: string;
  private onProgress?: ProgressCallback;
  private silent: boolean;

  constructor(
    private config: TesterConfig,
    apiKey: string,
    options: OrchestratorOptions = {}
  ) {
    this.llm = new LLMClient(apiKey, config.model);
    this.discoverer = new DiscovererAgent(this.llm);
    this.planner = new PlannerAgent(this.llm);
    this.executor = new ExecutorAgent(this.llm);
    this.reporter = new Reporter(config.outputDir);
    this.runId = options.runId ?? "cli";
    this.onProgress = options.onProgress;
    this.silent = options.silent ?? false;
  }

  private emit(
    type: RunProgressEvent["type"],
    message?: string,
    data?: unknown,
    phase?: RunPhase
  ): void {
    this.onProgress?.({ type, message, data, phase });
    if (!this.silent && message) {
      console.log(message);
    }
  }

  async run(): Promise<TestReport> {
    const startTime = Date.now();
    await mkdir(this.config.outputDir, { recursive: true });

    this.emit("phase", "Starting test run", undefined, "discovering");
    if (!this.silent) {
      console.log("\n🤖 Angelina App Tester");
      console.log(`   Target: ${this.config.url}`);
      console.log(`   Model:  ${this.config.model}\n`);
    }

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
      this.emit("phase", "Discovering app & understanding purpose...", undefined, "discovering");
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

      this.emit(
        "feature",
        `Found ${understanding.coreFeatures.length} features`,
        { understanding, featureCount: understanding.coreFeatures.length }
      );

      this.emit("phase", "Generating test plan...", undefined, "planning");
      const plan = await this.planner.createPlan(understanding, this.config);
      await saveSnapshotJson(this.config.outputDir, "test-plan", plan);
      this.emit("log", `Created ${plan.testCases.length} test cases`, { plan });

      this.emit("phase", "Running tests (human-like)...", undefined, "executing");
      const results = [];
      for (const testCase of plan.testCases) {
        this.emit("test_start", testCase.name, { testCase });
        const result = await this.executor.runTest(
          humanBrowser,
          testCase,
          this.config.url,
          (msg) => this.emit("test_step", msg, { testId: testCase.id })
        );
        results.push(result);
        this.emit("test_end", `${testCase.name}: ${result.status}`, { result });
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

      this.emit("phase", "Generating report...", undefined, "reporting");
      const { jsonPath, htmlPath } = await this.reporter.generate(report);
      if (!this.silent) {
        printSummary(report);
        console.log(`\n  JSON: ${jsonPath}`);
        console.log(`  HTML: ${htmlPath}\n`);
      }

      this.emit("report", "Report ready", { jsonPath, htmlPath, report });
      this.emit("complete", "Test run completed", { report }, "completed");
      return report;
    } catch (err) {
      const message = (err as Error).message;
      this.emit("error", message, { error: message }, "failed");
      throw err;
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
