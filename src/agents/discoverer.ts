import type { LLMClient } from "../llm/client.js";
import { parseJsonResponse } from "../llm/client.js";
import type { HumanBrowser } from "../browser/human-browser.js";
import type { AppUnderstanding, PageSnapshot, TesterConfig } from "../types.js";

const DISCOVER_SYSTEM = `You are an expert QA analyst and UX researcher. You analyze web applications like a curious human user would.

Given a page snapshot (URL, title, interactive elements, visible text) and optionally a screenshot, you must:
1. Infer what this application is FOR (its purpose)
2. Identify who would use it (target user)
3. List every testable feature/function you can see on this page
4. Describe natural user flows someone would perform

Respond ONLY with valid JSON in this exact shape:
{
  "name": "App name",
  "purpose": "One paragraph describing what the app does",
  "targetUser": "Who uses this and why",
  "features": [
    {
      "id": "feature-1",
      "name": "Feature name",
      "description": "What this feature does",
      "pageUrl": "URL where feature lives",
      "elements": ["ref-0", "Login button", "email field"],
      "priority": "critical|high|medium|low"
    }
  ],
  "userFlows": ["Flow 1 description", "Flow 2 description"],
  "pagesToExplore": ["relative or absolute URLs worth visiting next"]
}

Be thorough. Every button, form, link, and navigation item is a potential feature to test.
Prioritize critical user paths (auth, core actions, checkout, create/save, etc.).`;

export class DiscovererAgent {
  constructor(private llm: LLMClient) {}

  async analyzePage(
    snapshot: PageSnapshot,
    screenshotBase64: string,
    config: TesterConfig,
    priorUnderstanding?: Partial<AppUnderstanding>
  ): Promise<AppUnderstanding> {
    const context = priorUnderstanding
      ? `\nPrior discovery context:\n${JSON.stringify(priorUnderstanding, null, 2)}`
      : "";

    const userPrompt = `Analyze this web application page.

App URL: ${config.url}
${config.appName ? `App name hint: ${config.appName}` : ""}
${config.appDescription ? `App description hint: ${config.appDescription}` : ""}

Page snapshot:
${JSON.stringify(
  {
    url: snapshot.url,
    title: snapshot.title,
    elements: snapshot.elements.slice(0, 80),
    visibleText: snapshot.visibleText.slice(0, 2500),
  },
  null,
  2
)}
${context}

Identify ALL testable features. Include navigation, forms, toggles, modals, and actions.`;

    const raw = await this.llm.chatWithVision(DISCOVER_SYSTEM, userPrompt, screenshotBase64);

    interface DiscoverResponse {
      name: string;
      purpose: string;
      targetUser: string;
      features: Array<{
        id: string;
        name: string;
        description: string;
        pageUrl: string;
        elements: string[];
        priority: string;
      }>;
      userFlows: string[];
      pagesToExplore: string[];
    }

    const parsed = parseJsonResponse<DiscoverResponse>(raw);

    return {
      name: parsed.name || config.appName || "Unknown App",
      purpose: parsed.purpose,
      targetUser: parsed.targetUser,
      coreFeatures: parsed.features.map((f) => ({
        ...f,
        priority: validatePriority(f.priority),
      })),
      userFlows: parsed.userFlows ?? [],
      discoveredPages: [snapshot.url, ...(parsed.pagesToExplore ?? [])],
    };
  }

  async exploreApp(
    browser: HumanBrowser,
    config: TesterConfig
  ): Promise<{ understanding: AppUnderstanding; snapshots: PageSnapshot[] }> {
    const snapshots: PageSnapshot[] = [];
    const visited = new Set<string>();
    const toVisit: string[] = [config.url];
    let understanding: AppUnderstanding | undefined;

    while (toVisit.length > 0 && visited.size < config.maxPages) {
      const nextUrl = toVisit.shift()!;
      const normalized = normalizeUrl(nextUrl, config.url);
      if (visited.has(normalized)) continue;
      visited.add(normalized);

      try {
        await browser.navigate(normalized);
        const snapshot = await browser.captureSnapshot("discover");
        snapshots.push(snapshot);

        const screenshot = await browser.screenshotBase64();
        const partial = understanding
          ? {
              name: understanding.name,
              purpose: understanding.purpose,
              coreFeatures: understanding.coreFeatures,
              discoveredPages: understanding.discoveredPages,
            }
          : undefined;

        const pageUnderstanding = await this.analyzePage(snapshot, screenshot, config, partial);
        understanding = mergeUnderstanding(understanding, pageUnderstanding);

        for (const page of pageUnderstanding.discoveredPages) {
          const resolved = resolveUrl(page, config.url);
          if (resolved && !visited.has(resolved) && sameOrigin(resolved, config.url)) {
            toVisit.push(resolved);
          }
        }
      } catch (err) {
        console.warn(`  ⚠ Could not explore ${normalized}: ${(err as Error).message}`);
      }
    }

    if (!understanding) {
      throw new Error("Failed to discover any app features");
    }

    understanding.discoveredPages = [...visited];
    return { understanding, snapshots };
  }
}

function validatePriority(p: string): "critical" | "high" | "medium" | "low" {
  if (p === "critical" || p === "high" || p === "medium" || p === "low") return p;
  return "medium";
}

function normalizeUrl(url: string, base: string): string {
  try {
    return new URL(url, base).href.replace(/\/$/, "") || new URL(url, base).href;
  } catch {
    return url;
  }
}

function resolveUrl(url: string, base: string): string | null {
  try {
    return new URL(url, base).href;
  } catch {
    return null;
  }
}

function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

function mergeUnderstanding(
  existing: AppUnderstanding | undefined,
  incoming: AppUnderstanding
): AppUnderstanding {
  if (!existing) return incoming;

  const featureMap = new Map(existing.coreFeatures.map((f) => [f.id, f]));
  for (const f of incoming.coreFeatures) {
    if (!featureMap.has(f.id)) featureMap.set(f.id, f);
  }

  return {
    name: incoming.name || existing.name,
    purpose: incoming.purpose || existing.purpose,
    targetUser: incoming.targetUser || existing.targetUser,
    coreFeatures: [...featureMap.values()],
    userFlows: [...new Set([...existing.userFlows, ...incoming.userFlows])],
    discoveredPages: [...new Set([...existing.discoveredPages, ...incoming.discoveredPages])],
  };
}
