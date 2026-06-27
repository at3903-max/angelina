export type RunPhase =
  | "queued"
  | "discovering"
  | "planning"
  | "executing"
  | "reporting"
  | "completed"
  | "failed";

export interface TesterConfig {
  url: string;
  appName?: string;
  appDescription?: string;
  maxPages: number;
  maxTests: number;
  model: string;
  headless: boolean;
}

export interface TestRunSummary {
  id: string;
  status: RunPhase;
  config: TesterConfig;
  createdAt: string;
  updatedAt: string;
  report?: TestReport;
  error?: string;
  logs: string[];
}

export interface TestReport {
  understanding: {
    name: string;
    purpose: string;
    targetUser: string;
    coreFeatures: Array<{
      id: string;
      name: string;
      description: string;
      priority: string;
    }>;
    discoveredPages: string[];
  };
  plan: {
    testCases: Array<{
      id: string;
      name: string;
      description: string;
      priority: string;
    }>;
  };
  results: Array<{
    testCase: { id: string; name: string; description: string; priority: string };
    status: string;
    error?: string;
    durationMs: number;
    stepResults: Array<{
      stepIndex: number;
      action: { description: string };
      status: string;
      message: string;
      screenshotPath?: string;
    }>;
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    durationMs: number;
  };
}

export interface RunProgressEvent {
  type: string;
  runId: string;
  timestamp: string;
  phase?: RunPhase;
  message?: string;
  data?: unknown;
}

export interface StartRunRequest {
  url: string;
  appName?: string;
  appDescription?: string;
  maxPages?: number;
  maxTests?: number;
  model?: string;
  apiKey?: string;
}
