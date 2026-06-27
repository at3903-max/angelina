import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { TestReport } from "../types.js";

export class Reporter {
  constructor(private outputDir: string) {}

  async generate(report: TestReport): Promise<{ jsonPath: string; htmlPath: string }> {
    await mkdir(this.outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const jsonPath = join(this.outputDir, `report-${timestamp}.json`);
    const htmlPath = join(this.outputDir, `report-${timestamp}.html`);

    await writeFile(jsonPath, JSON.stringify(report, null, 2));
    await writeFile(htmlPath, this.renderHtml(report));

    return { jsonPath, htmlPath };
  }

  private renderHtml(report: TestReport): string {
    const passRate =
      report.summary.total > 0
        ? Math.round((report.summary.passed / report.summary.total) * 100)
        : 0;

    const resultRows = report.results
      .map((r) => {
        const statusClass = r.status === "passed" ? "pass" : r.status === "failed" ? "fail" : "skip";
        const steps = r.stepResults
          .map(
            (s) =>
              `<li class="${s.status}">
                <strong>Step ${s.stepIndex + 1}:</strong> ${escapeHtml(s.action.description)}
                <span class="step-msg">${escapeHtml(s.message)}</span>
              </li>`
          )
          .join("");

        return `
        <details class="test-case ${statusClass}">
          <summary>
            <span class="badge ${statusClass}">${r.status.toUpperCase()}</span>
            ${escapeHtml(r.testCase.name)}
            <span class="meta">${r.durationMs}ms · ${r.testCase.priority}</span>
          </summary>
          <p>${escapeHtml(r.testCase.description)}</p>
          <p><strong>Expected:</strong> ${escapeHtml(r.testCase.expectedOutcome)}</p>
          ${r.error ? `<p class="error"><strong>Error:</strong> ${escapeHtml(r.error)}</p>` : ""}
          <ol>${steps}</ol>
        </details>`;
      })
      .join("");

    const features = report.understanding.coreFeatures
      .map(
        (f) =>
          `<li><strong>${escapeHtml(f.name)}</strong> (${f.priority}) — ${escapeHtml(f.description)}</li>`
      )
      .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Test Report — ${escapeHtml(report.understanding.name)}</title>
  <style>
    :root { --pass: #16a34a; --fail: #dc2626; --skip: #ca8a04; --bg: #fafafa; --card: #fff; --border: #e5e7eb; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: #111; margin: 0; padding: 2rem; line-height: 1.5; }
    h1 { margin: 0 0 0.25rem; font-size: 1.75rem; }
    .subtitle { color: #555; margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; text-align: center; }
    .stat .num { font-size: 2rem; font-weight: 700; }
    .stat.pass .num { color: var(--pass); }
    .stat.fail .num { color: var(--fail); }
    section { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; }
    section h2 { margin-top: 0; font-size: 1.1rem; }
    .test-case { border: 1px solid var(--border); border-radius: 6px; padding: 0.75rem 1rem; margin-bottom: 0.75rem; }
    .test-case.pass { border-left: 4px solid var(--pass); }
    .test-case.fail { border-left: 4px solid var(--fail); }
    summary { cursor: pointer; font-weight: 600; list-style: none; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    summary::-webkit-details-marker { display: none; }
    .badge { font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 4px; color: #fff; }
    .badge.pass { background: var(--pass); }
    .badge.fail { background: var(--fail); }
    .meta { font-weight: 400; color: #666; font-size: 0.85rem; }
    ol { margin: 0.5rem 0 0; padding-left: 1.25rem; }
    li.failed { color: var(--fail); }
    li.passed { color: var(--pass); }
    .step-msg { display: block; font-size: 0.85rem; color: #666; }
    .error { color: var(--fail); }
    ul.features { padding-left: 1.25rem; }
  </style>
</head>
<body>
  <h1>${escapeHtml(report.understanding.name)}</h1>
  <p class="subtitle">${escapeHtml(report.understanding.purpose)}</p>

  <div class="grid">
    <div class="stat"><div class="num">${report.summary.total}</div>Total tests</div>
    <div class="stat pass"><div class="num">${report.summary.passed}</div>Passed</div>
    <div class="stat fail"><div class="num">${report.summary.failed}</div>Failed</div>
    <div class="stat"><div class="num">${passRate}%</div>Pass rate</div>
    <div class="stat"><div class="num">${Math.round(report.summary.durationMs / 1000)}s</div>Duration</div>
  </div>

  <section>
    <h2>App understanding</h2>
    <p><strong>Target user:</strong> ${escapeHtml(report.understanding.targetUser)}</p>
    <p><strong>Pages explored:</strong> ${report.understanding.discoveredPages.length}</p>
    <ul class="features">${features}</ul>
  </section>

  <section>
    <h2>Test results</h2>
    ${resultRows || "<p>No tests run.</p>"}
  </section>

  <footer style="color:#888;font-size:0.85rem;margin-top:2rem;">
    Generated ${escapeHtml(report.generatedAt)} · ${escapeHtml(report.config.url)}
  </footer>
</body>
</html>`;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function printSummary(report: TestReport): void {
  const { summary, understanding } = report;
  console.log("\n" + "=".repeat(60));
  console.log(`  TEST REPORT: ${understanding.name}`);
  console.log("=".repeat(60));
  console.log(`  Purpose: ${understanding.purpose.slice(0, 80)}...`);
  console.log(`  Features found: ${understanding.coreFeatures.length}`);
  console.log(`  Pages explored: ${understanding.discoveredPages.length}`);
  console.log("-".repeat(60));
  console.log(`  Total:  ${summary.total}`);
  console.log(`  Passed: ${summary.passed}`);
  console.log(`  Failed: ${summary.failed}`);
  console.log(`  Time:   ${Math.round(summary.durationMs / 1000)}s`);
  console.log("=".repeat(60));
}
