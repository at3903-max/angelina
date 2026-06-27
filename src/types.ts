export type TestStatus = "pending" | "running" | "passed" | "failed" | "skipped";

export interface TesterConfig {
  url: string;
  appName?: string;
  appDescription?: string;
  maxDepth: number;
  maxPages: number;
  maxTests: number;
  headless: boolean;
  timeout: number;
  outputDir: string;
  model: string;
}

export interface PageElement {
  role: string;
  name: string;
  tag?: string;
  href?: string;
  type?: string;
  placeholder?: string;
  ref: string;
}

export interface PageSnapshot {
  url: string;
  title: string;
  elements: PageElement[];
  visibleText: string;
  screenshotPath?: string;
}

export interface AppFeature {
  id: string;
  name: string;
  description: string;
  pageUrl: string;
  elements: string[];
  priority: "critical" | "high" | "medium" | "low";
}

export interface AppUnderstanding {
  name: string;
  purpose: string;
  targetUser: string;
  coreFeatures: AppFeature[];
  userFlows: string[];
  discoveredPages: string[];
}

export type TestActionType =
  | "navigate"
  | "click"
  | "fill"
  | "select"
  | "press"
  | "scroll"
  | "wait"
  | "hover"
  | "check";

export interface TestAction {
  type: TestActionType;
  target?: string;
  value?: string;
  description: string;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  featureId: string;
  steps: TestAction[];
  expectedOutcome: string;
  priority: "critical" | "high" | "medium" | "low";
}

export interface TestPlan {
  appName: string;
  generatedAt: string;
  testCases: TestCase[];
}

export interface StepResult {
  stepIndex: number;
  action: TestAction;
  status: TestStatus;
  message: string;
  durationMs: number;
  screenshotPath?: string;
}

export interface TestResult {
  testCase: TestCase;
  status: TestStatus;
  stepResults: StepResult[];
  verificationNotes: string;
  error?: string;
  durationMs: number;
}

export interface TestReport {
  config: TesterConfig;
  understanding: AppUnderstanding;
  plan: TestPlan;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    durationMs: number;
  };
  generatedAt: string;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
}
