import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Page } from "playwright";
import type { PageElement, PageSnapshot } from "../types.js";

const MAX_ELEMENTS = 120;
const MAX_VISIBLE_TEXT = 4000;

function randomDelay(min: number, max: number): Promise<void> {
  const ms = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class HumanBrowser {
  readonly page: Page;
  private screenshotCounter = 0;
  private outputDir: string;

  constructor(page: Page, outputDir: string) {
    this.page = page;
    this.outputDir = outputDir;
  }

  async init(): Promise<void> {
    await mkdir(join(this.outputDir, "screenshots"), { recursive: true });
  }

  async navigate(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await this.page.waitForTimeout(800);
    await randomDelay(200, 600);
  }

  async humanClick(selector: string): Promise<void> {
    const locator = this.page.locator(selector).first();
    await locator.scrollIntoViewIfNeeded();
    await randomDelay(150, 400);
    await locator.hover({ timeout: 5000 }).catch(() => {});
    await randomDelay(80, 200);
    await locator.click({ timeout: 10000 });
    await randomDelay(300, 700);
  }

  async humanFill(selector: string, value: string): Promise<void> {
    const locator = this.page.locator(selector).first();
    await locator.scrollIntoViewIfNeeded();
    await randomDelay(100, 300);
    await locator.click({ timeout: 5000 });
    await randomDelay(100, 250);
    await locator.fill("");
    for (const char of value) {
      await locator.pressSequentially(char, { delay: 40 + Math.random() * 80 });
    }
    await randomDelay(200, 500);
  }

  async humanPress(key: string): Promise<void> {
    await randomDelay(100, 300);
    await this.page.keyboard.press(key);
    await randomDelay(200, 400);
  }

  async humanScroll(direction: "up" | "down" = "down"): Promise<void> {
    const delta = direction === "down" ? 400 : -400;
    await this.page.mouse.wheel(0, delta);
    await randomDelay(400, 800);
  }

  async wait(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  async captureSnapshot(label?: string): Promise<PageSnapshot> {
    const elements = await this.extractInteractiveElements();
    const visibleText = await this.extractVisibleText();
    const screenshotPath = await this.takeScreenshot(label);

    return {
      url: this.page.url(),
      title: await this.page.title(),
      elements,
      visibleText,
      screenshotPath,
    };
  }

  async screenshotBase64(): Promise<string> {
    const buffer = await this.page.screenshot({ type: "png", fullPage: false });
    return buffer.toString("base64");
  }

  private async takeScreenshot(label?: string): Promise<string> {
    this.screenshotCounter++;
    const name = `${String(this.screenshotCounter).padStart(3, "0")}${label ? `-${label}` : ""}.png`;
    const path = join(this.outputDir, "screenshots", name);
    await this.page.screenshot({ path, fullPage: false });
    return path;
  }

  private async extractInteractiveElements(): Promise<PageElement[]> {
    return this.page.evaluate((max) => {
      const selectors = [
        "a[href]",
        "button",
        "input",
        "textarea",
        "select",
        "[role='button']",
        "[role='link']",
        "[role='tab']",
        "[role='checkbox']",
        "[role='radio']",
        "[role='menuitem']",
        "[role='switch']",
        "[onclick]",
        "[contenteditable='true']",
      ];

      const seen = new Set<string>();
      const results: PageElement[] = [];

      for (const sel of selectors) {
        for (const el of document.querySelectorAll(sel)) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;

          const style = window.getComputedStyle(el);
          if (style.visibility === "hidden" || style.display === "none") continue;

          const htmlEl = el as HTMLElement;
          const name =
            htmlEl.getAttribute("aria-label") ||
            htmlEl.getAttribute("title") ||
            htmlEl.getAttribute("placeholder") ||
            (htmlEl as HTMLInputElement).value ||
            htmlEl.innerText?.trim().slice(0, 80) ||
            htmlEl.tagName.toLowerCase();

          const href = (el as HTMLAnchorElement).href || undefined;
          const type = (el as HTMLInputElement).type || undefined;
          const placeholder = (el as HTMLInputElement).placeholder || undefined;
          const role = el.getAttribute("role") || el.tagName.toLowerCase();
          const key = `${role}:${name}:${href || ""}`;

          if (seen.has(key)) continue;
          seen.add(key);

          results.push({
            role,
            name: name.slice(0, 100),
            tag: el.tagName.toLowerCase(),
            href,
            type,
            placeholder,
            ref: `ref-${results.length}`,
          });

          if (results.length >= max) return results;
        }
      }
      return results;
    }, MAX_ELEMENTS);
  }

  private async extractVisibleText(): Promise<string> {
    const text = await this.page.evaluate((maxLen) => {
      const body = document.body;
      if (!body) return "";
      return body.innerText.replace(/\s+/g, " ").trim().slice(0, maxLen);
    }, MAX_VISIBLE_TEXT);
    return text;
  }

  resolveElementRef(snapshot: PageSnapshot, target: string): string | null {
    const normalized = target.toLowerCase().trim();

    const byRef = snapshot.elements.find((e) => e.ref === target);
    if (byRef) return this.elementToSelector(byRef);

    const match = snapshot.elements.find((e) => {
      const name = e.name.toLowerCase();
      return (
        name === normalized ||
        name.includes(normalized) ||
        normalized.includes(name) ||
        (e.placeholder?.toLowerCase().includes(normalized) ?? false)
      );
    });

    return match ? this.elementToSelector(match) : null;
  }

  private elementToSelector(el: PageElement): string {
    if (el.href && el.tag === "a") {
      try {
        const path = new URL(el.href).pathname;
        if (path && path !== "/") {
          return `a[href*="${path.replace(/"/g, '\\"')}"]`;
        }
      } catch {
        /* fall through */
      }
    }

    if (el.placeholder) {
      return `[placeholder="${el.placeholder.replace(/"/g, '\\"')}"]`;
    }

    if (el.name && el.name.length > 1) {
      const escaped = el.name.replace(/"/g, '\\"');
      if (el.tag === "button" || el.role === "button") {
        return `button:has-text("${escaped}")`;
      }
      if (el.tag === "a" || el.role === "link") {
        return `a:has-text("${escaped}")`;
      }
      if (el.tag === "input" || el.tag === "textarea") {
        return `${el.tag}[aria-label="${escaped}"], ${el.tag}[placeholder="${escaped}"]`;
      }
      return `[aria-label="${escaped}"]`;
    }

    return el.tag ?? "button";
  }
}

export async function saveSnapshotJson(outputDir: string, name: string, data: unknown): Promise<void> {
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, `${name}.json`), JSON.stringify(data, null, 2));
}
