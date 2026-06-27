import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type {
  RunPhase,
  RunProgressEvent,
  StartRunRequest,
  TestReport,
  TestRunSummary,
} from "../types.js";
import { AppTesterOrchestrator, createDefaultConfig } from "../orchestrator.js";

interface StoredRun extends TestRunSummary {
  emitter: EventEmitter;
  outputDir: string;
}

export class RunStore {
  private runs = new Map<string, StoredRun>();

  list(): TestRunSummary[] {
    return [...this.runs.values()]
      .map(({ emitter: _e, outputDir: _o, ...summary }) => summary)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get(id: string): TestRunSummary | undefined {
    const run = this.runs.get(id);
    if (!run) return undefined;
    const { emitter: _e, outputDir: _o, ...summary } = run;
    return summary;
  }

  getOutputDir(id: string): string | undefined {
    return this.runs.get(id)?.outputDir;
  }

  subscribe(id: string, listener: (event: RunProgressEvent) => void): () => void {
    const run = this.runs.get(id);
    if (!run) throw new Error("Run not found");
    run.emitter.on("event", listener);
    return () => run.emitter.off("event", listener);
  }

  async start(request: StartRunRequest): Promise<TestRunSummary> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const outputDir = join(process.cwd(), "reports", id);
    const apiKey = request.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }

    let url = request.url.trim();
    if (!url.startsWith("http")) {
      url = `https://${url}`;
    }

    const config = createDefaultConfig({
      url,
      appName: request.appName,
      appDescription: request.appDescription,
      maxPages: request.maxPages ?? 8,
      maxTests: request.maxTests ?? 15,
      model: request.model ?? process.env.OPENAI_MODEL ?? "gpt-4o",
      headless: request.headless ?? process.env.HEADLESS !== "false",
      outputDir,
    });

    const emitter = new EventEmitter();
    const run: StoredRun = {
      id,
      status: "queued",
      config,
      createdAt: now,
      updatedAt: now,
      logs: [],
      emitter,
      outputDir,
    };

    this.runs.set(id, run);

    const emit = (partial: Omit<RunProgressEvent, "runId" | "timestamp">) => {
      const event: RunProgressEvent = {
        ...partial,
        runId: id,
        timestamp: new Date().toISOString(),
      };
      if (partial.message) {
        run.logs.push(`[${event.timestamp}] ${partial.message}`);
      }
      if (partial.phase) {
        run.status = partial.phase;
      }
      run.updatedAt = event.timestamp;
      emitter.emit("event", event);
    };

    setImmediate(async () => {
      try {
        emit({ type: "phase", phase: "discovering", message: "Starting test run..." });

        const orchestrator = new AppTesterOrchestrator(config, apiKey, {
          runId: id,
          silent: true,
          onProgress: (e) => {
            emit(e);
            if (e.type === "complete" && e.data && typeof e.data === "object" && "report" in (e.data as object)) {
              run.report = (e.data as { report: TestReport }).report;
            }
          },
        });

        const report = await orchestrator.run();
        run.report = report;
        run.status = "completed";
      } catch (err) {
        run.status = "failed";
        run.error = (err as Error).message;
        emit({ type: "error", phase: "failed", message: run.error });
      }
    });

    const { emitter: _e, outputDir: _o, ...summary } = run;
    return summary;
  }
}

export const runStore = new RunStore();
