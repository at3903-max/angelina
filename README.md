# Angelina Tester

A **human-like AI testing agent** that can test any web app. It discovers the app, understands its purpose, generates a full test plan, runs every function like a real user would, and reports what works and what doesn't.

## What it does

```
Your app URL
     ↓
① Discover  — explores pages, maps buttons/forms/links
② Understand — AI infers app purpose, features, user flows
③ Plan      — generates test cases for every function
④ Execute   — runs tests with human-like clicks, typing, scrolling
⑤ Verify    — AI checks each outcome against expectations
⑥ Report    — HTML + JSON report with pass/fail details
```

## Quick start

```bash
# Install dependencies
npm install
npx playwright install chromium

# Set your OpenAI API key
cp .env.example .env
# Edit .env and add OPENAI_API_KEY=sk-...

# Build
npm run build

# Test any app
npm start -- --url https://example.com
```

## Usage

```bash
angelina-tester --url <app-url> [options]

Options:
  -u, --url <url>           URL of the app to test (required)
  -n, --name <name>         App name hint for the AI
  -d, --description <text>  App description hint
  -o, --output <dir>        Report output directory (default: reports)
  --max-pages <n>           Max pages to explore (default: 8)
  --max-tests <n>           Max test cases to run (default: 15)
  --model <model>           OpenAI model (default: gpt-4o)
  --headed                  Show browser window
  --timeout <ms>            Action timeout (default: 15000)
```

### Examples

```bash
# Test a todo app
npm start -- --url https://todomvc.com/examples/react/ --name "TodoMVC"

# Test with hints (helps AI understand faster)
npm start -- --url https://myapp.com --name "SkinPod" --description "Skincare routine tracker for beginners"

# Watch the browser work
npm start -- --url https://myapp.com --headed --max-tests 20
```

## How it acts human

| Behavior | Detail |
|----------|--------|
| **Reading** | Scans visible text and interactive elements before acting |
| **Clicking** | Scrolls into view, hovers, pauses, then clicks |
| **Typing** | Character-by-character with random delays |
| **Scrolling** | Explores below-the-fold content |
| **Recovery** | If a step fails, AI suggests an alternative action |
| **Verification** | Uses vision + page state to confirm outcomes |

## Output

Reports are saved to `reports/`:

- `report-<timestamp>.html` — visual report with pass/fail, steps, screenshots
- `report-<timestamp>.json` — machine-readable full results
- `discovery.json` — app understanding and features found
- `test-plan.json` — generated test cases
- `screenshots/` — step-by-step screenshots

## Architecture

```
src/
├── cli.ts                 # CLI entry point
├── orchestrator.ts        # Runs discover → plan → execute → report
├── types.ts               # Shared types
├── llm/client.ts          # OpenAI integration
├── browser/
│   └── human-browser.ts   # Playwright with human-like behavior
├── agents/
│   ├── discoverer.ts      # Explores app, understands purpose
│   ├── planner.ts         # Generates comprehensive test plan
│   └── executor.ts        # Runs tests + AI verification
└── reporter/
    └── index.ts           # HTML + JSON reports
```

## Requirements

- Node.js 20+
- OpenAI API key (uses GPT-4o with vision for understanding and verification)
- Chromium (installed via Playwright)

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4o` | Model for all AI steps |
| `HEADLESS` | No | `true` | Run browser headless |

## Limitations (v0.1)

- Web apps only (URLs starting with http/https)
- Requires OpenAI API access
- Best for SPAs and multi-page web apps on the same origin
- Does not yet support native mobile apps or authenticated flows out of the box (pass hints via `--description` for now)

## License

MIT
