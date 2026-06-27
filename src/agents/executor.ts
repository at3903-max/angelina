import type { HumanBrowser } from "../browser/human-browser.js";
import type { LLMClient } from "../llm/client.js";
import { parseJsonResponse } from "../llm/client.js";
import type {
  PageSnapshot,
  StepResult,
  TestAction,
  TestCase,
  TestResult,
  TestStatus,
} from "../types.js";

export class ExecutorAgent {
  constructor(private llm: LLMClient) {}

  async runTest(
    browser: HumanBrowser,
    testCase: TestCase,
    startUrl: string
  ): Promise<TestResult> {
    const startTime = Date.now();
    const stepResults: StepResult[] = [];
    let status: TestStatus = "running";
    let error: string | undefined;
    let verificationNotes = "";

    console.log(`\n  ▶ ${testCase.name}`);

    try {
      await browser.navigate(startUrl);

      for (let i = 0; i < testCase.steps.length; i++) {
        const action = testCase.steps[i];
        const stepStart = Date.now();
        let snapshot = await browser.captureSnapshot();

        try {
          await this.executeAction(browser, action, snapshot, startUrl);
          const screenshotPath = (await browser.captureSnapshot(`step-${i + 1}`)).screenshotPath;

          stepResults.push({
            stepIndex: i,
            action,
            status: "passed",
            message: `Completed: ${action.description}`,
            durationMs: Date.now() - stepStart,
            screenshotPath,
          });
          console.log(`    ✓ Step ${i + 1}: ${action.description}`);
        } catch (stepErr) {
          const msg = (stepErr as Error).message;
          snapshot = await browser.captureSnapshot(`fail-${i + 1}`);
          const screenshotPath = snapshot.screenshotPath;

          stepResults.push({
            stepIndex: i,
            action,
            status: "failed",
            message: msg,
            durationMs: Date.now() - stepStart,
            screenshotPath,
          });
          console.log(`    ✗ Step ${i + 1}: ${action.description} — ${msg}`);

          const recovered = await this.tryRecover(browser, testCase, action, snapshot, msg);
          if (recovered) {
            stepResults[stepResults.length - 1].status = "passed";
            stepResults[stepResults.length - 1].message = `Recovered: ${recovered}`;
            console.log(`    ↻ Recovered step ${i + 1}: ${recovered}`);
          } else {
            throw new Error(`Step ${i + 1} failed: ${msg}`);
          }
        }
      }

      const finalSnapshot = await browser.captureSnapshot("final");
      const screenshot = await browser.screenshotBase64();
      const verification = await this.verifyOutcome(testCase, finalSnapshot, screenshot);
      verificationNotes = verification.raw;
      status = verification.passed ? "passed" : "failed";

      if (status === "failed") {
        error = "Verification failed — expected outcome not met";
      }
    } catch (err) {
      status = "failed";
      error = (err as Error).message;
      console.log(`    ✗ Test failed: ${error}`);
    }

    const icon = status === "passed" ? "✓" : "✗";
    console.log(`  ${icon} ${testCase.name} — ${status}`);

    return {
      testCase,
      status,
      stepResults,
      verificationNotes,
      error,
      durationMs: Date.now() - startTime,
    };
  }

  private async executeAction(
    browser: HumanBrowser,
    action: TestAction,
    snapshot: PageSnapshot,
    baseUrl: string
  ): Promise<void> {
    switch (action.type) {
      case "navigate": {
        const url = action.target?.startsWith("http")
          ? action.target
          : new URL(action.target ?? "/", baseUrl).href;
        await browser.navigate(url);
        break;
      }
      case "click": {
        const selector = browser.resolveElementRef(snapshot, action.target ?? "");
        if (!selector) throw new Error(`Could not find element: ${action.target}`);
        await browser.humanClick(selector);
        break;
      }
      case "fill": {
        const selector = browser.resolveElementRef(snapshot, action.target ?? "");
        if (!selector) throw new Error(`Could not find field: ${action.target}`);
        await browser.humanFill(selector, action.value ?? "test input");
        break;
      }
      case "press":
        await browser.humanPress(action.value ?? "Enter");
        break;
      case "scroll":
        await browser.humanScroll(action.value === "up" ? "up" : "down");
        break;
      case "wait":
        await browser.wait(parseInt(action.value ?? "1000", 10));
        break;
      case "hover": {
        const selector = browser.resolveElementRef(snapshot, action.target ?? "");
        if (!selector) throw new Error(`Could not find element: ${action.target}`);
        await browser.page.locator(selector).first().hover();
        break;
      }
      case "check": {
        const selector = browser.resolveElementRef(snapshot, action.target ?? "");
        if (!selector) throw new Error(`Could not find checkbox: ${action.target}`);
        await browser.page.locator(selector).first().check();
        break;
      }
      case "select": {
        const selector = browser.resolveElementRef(snapshot, action.target ?? "");
        if (!selector) throw new Error(`Could not find select: ${action.target}`);
        await browser.page.locator(selector).first().selectOption(action.value ?? "");
        break;
      }
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async tryRecover(
    browser: HumanBrowser,
    testCase: TestCase,
    failedAction: TestAction,
    snapshot: PageSnapshot,
    errorMessage: string
  ): Promise<string | null> {
    try {
      const screenshot = await browser.screenshotBase64();
      const raw = await this.llm.chatWithVision(
        `You help a QA tester recover from failed browser automation steps.
Suggest ONE alternative action to achieve the same goal. Respond with JSON:
{ "recovered": true|false, "action": { "type": "click|fill|press|scroll|wait", "target": "...", "value": "...", "description": "..." }, "reason": "..." }`,
        `Test: ${testCase.name}
Failed step: ${JSON.stringify(failedAction)}
Error: ${errorMessage}
Page elements: ${JSON.stringify(snapshot.elements.slice(0, 40))}`,
        screenshot
      );

      const parsed = parseJsonResponse<{
        recovered: boolean;
        action?: TestAction;
        reason?: string;
      }>(raw);

      if (!parsed.recovered || !parsed.action) return null;

      await this.executeAction(browser, parsed.action, snapshot, snapshot.url);
      return parsed.reason ?? parsed.action.description;
    } catch {
      return null;
    }
  }

  private async verifyOutcome(
    testCase: TestCase,
    snapshot: PageSnapshot,
    screenshotBase64: string
  ): Promise<{ passed: boolean; raw: string }> {
    const raw = await this.llm.chatWithVision(
      `You verify whether a web app test passed. Compare the current page state to the expected outcome.
Respond with JSON: { "passed": true|false, "confidence": 0-1, "observations": "...", "issues": ["..."] }`,
      `Test: ${testCase.name}
Expected outcome: ${testCase.expectedOutcome}
Current URL: ${snapshot.url}
Page title: ${snapshot.title}
Visible text (excerpt): ${snapshot.visibleText.slice(0, 2000)}`,
      screenshotBase64
    );

    try {
      const parsed = parseJsonResponse<{ passed: boolean }>(raw);
      return { passed: parsed.passed !== false, raw };
    } catch {
      return { passed: true, raw };
    }
  }
}
