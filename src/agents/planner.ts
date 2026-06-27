import type { LLMClient } from "../llm/client.js";
import { parseJsonResponse } from "../llm/client.js";
import type { AppUnderstanding, TestCase, TestPlan, TesterConfig } from "../types.js";

const PLANNER_SYSTEM = `You are a senior QA engineer writing comprehensive test plans for web applications.

Given an app understanding (purpose, features, user flows), generate test cases that a human tester would run to verify EVERY function works.

Rules:
- Cover ALL features — navigation, forms, buttons, toggles, error states, empty states
- Write realistic human-like steps (click, fill, scroll, wait)
- Each step must have a clear target (button text, ref id, field placeholder, or URL)
- Include happy paths AND edge cases (empty submit, invalid input where applicable)
- Prioritize critical flows first
- Steps should be executable by browser automation

Respond ONLY with valid JSON:
{
  "testCases": [
    {
      "id": "test-1",
      "name": "Short test name",
      "description": "What we're verifying",
      "featureId": "feature-1",
      "priority": "critical|high|medium|low",
      "steps": [
        {
          "type": "navigate|click|fill|select|press|scroll|wait|hover|check",
          "target": "element ref, label, or URL",
          "value": "optional value for fill/select/press/wait",
          "description": "Human-readable step description"
        }
      ],
      "expectedOutcome": "What should be true if the test passes"
    }
  ]
}`;

export class PlannerAgent {
  constructor(private llm: LLMClient) {}

  async createPlan(
    understanding: AppUnderstanding,
    config: TesterConfig
  ): Promise<TestPlan> {
    const userPrompt = `Create a comprehensive test plan for this application.

App: ${understanding.name}
Purpose: ${understanding.purpose}
Target user: ${understanding.targetUser}
Base URL: ${config.url}

Features (${understanding.coreFeatures.length}):
${JSON.stringify(understanding.coreFeatures, null, 2)}

User flows:
${understanding.userFlows.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Generate up to ${config.maxTests} test cases covering every feature and flow.
Start URL for all tests: ${config.url}
Use element refs (ref-0, ref-1) or visible labels from the feature elements list as targets.`;

    const raw = await this.llm.chat([
      { role: "system", content: PLANNER_SYSTEM },
      { role: "user", content: userPrompt },
    ]);

    interface PlanResponse {
      testCases: TestCase[];
    }

    const parsed = parseJsonResponse<PlanResponse>(raw);
    const testCases = (parsed.testCases ?? []).slice(0, config.maxTests);

    return {
      appName: understanding.name,
      generatedAt: new Date().toISOString(),
      testCases: testCases.map((tc, i) => ({
        ...tc,
        id: tc.id || `test-${i + 1}`,
        priority: validatePriority(tc.priority),
        steps: tc.steps.map((s) => ({
          ...s,
          type: validateActionType(s.type),
        })),
      })),
    };
  }
}

function validatePriority(p: string): "critical" | "high" | "medium" | "low" {
  if (p === "critical" || p === "high" || p === "medium" || p === "low") return p;
  return "medium";
}

function validateActionType(t: string): TestCase["steps"][0]["type"] {
  const valid = ["navigate", "click", "fill", "select", "press", "scroll", "wait", "hover", "check"];
  if (valid.includes(t)) return t as TestCase["steps"][0]["type"];
  return "click";
}
