# Angelina Tester

A **human-like AI testing agent** packaged as a full web app. Point it at any URL — it explores the app, understands its purpose, tests every function like a real user, and shows live results in the dashboard.

## What it does

```
Your app URL
     ↓
① Discover   — crawls pages, maps buttons/forms/links
② Understand — AI infers app purpose, features, user flows
③ Plan       — generates test cases for every function
④ Execute    — runs tests with human-like clicks, typing, scrolling
⑤ Verify     — AI checks outcomes against expectations
⑥ Report     — live dashboard + HTML/JSON reports
```

## Quick start (web app)

```bash
# 1. Install everything
npm install
npm install --prefix web

# 2. Configure API key
cp .env.example .env
# Edit .env → OPENAI_API_KEY=sk-...

# 3. Build
npm run build

# 4. Run the app
npm run start:app
# Open http://localhost:3001
```

### Development mode (hot reload)

```bash
npm install
npm install --prefix web
cp .env.example .env

# Terminal: builds server on save + runs API + Vite frontend
npm run dev

# Frontend: http://localhost:5173  (proxies API to :3001)
# Or use production build at http://localhost:3001
```

## CLI mode (headless)

```bash
npm run build:server
npm start -- --url https://example.com --name "My App"
```

## Project structure

```
angelina/
├── src/                          # Backend + AI engine
│   ├── server/
│   │   ├── index.ts              # Express app (API + serves UI)
│   │   ├── routes.ts             # REST + SSE endpoints
│   │   └── run-store.ts          # Test run state management
│   ├── agents/
│   │   ├── discoverer.ts         # Explores app, understands purpose
│   │   ├── planner.ts            # Generates test plan
│   │   └── executor.ts           # Runs tests + AI verification
│   ├── browser/
│   │   └── human-browser.ts      # Playwright with human-like behavior
│   ├── llm/client.ts             # OpenAI integration
│   ├── orchestrator.ts           # Full test pipeline
│   ├── reporter/index.ts         # HTML + JSON reports
│   ├── types.ts                  # Shared types
│   └── cli.ts                    # CLI entry point
├── web/                          # React frontend
│   ├── src/
│   │   ├── App.tsx               # Main app shell
│   │   ├── api.ts                # API client + SSE
│   │   └── components/
│   │       ├── Layout.tsx        # Sidebar + navigation
│   │       ├── NewRunForm.tsx    # Start a new test
│   │       ├── RunDetail.tsx     # Live progress + results
│   │       └── ReportView.tsx    # App understanding view
│   └── vite.config.ts
├── reports/                      # Generated reports (per run)
└── package.json
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/runs` | List all test runs |
| POST | `/api/runs` | Start a new test run |
| GET | `/api/runs/:id` | Get run status + report |
| GET | `/api/runs/:id/events` | SSE live progress stream |
| GET | `/api/runs/:id/screenshots/:file` | Step screenshots |

### Start a run (POST /api/runs)

```json
{
  "url": "https://your-app.com",
  "appName": "My App",
  "appDescription": "Optional hint for the AI",
  "maxPages": 8,
  "maxTests": 15,
  "model": "gpt-4o",
  "apiKey": "sk-... (optional if set in .env)"
}
```

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes* | — | OpenAI API key (*or pass in UI) |
| `OPENAI_MODEL` | No | `gpt-4o` | Model for AI steps |
| `PORT` | No | `3001` | Server port |
| `HEADLESS` | No | `true` | Run browser headless |

## How it acts human

| Behavior | Detail |
|----------|--------|
| Reading | Scans visible text and elements before acting |
| Clicking | Scrolls into view, hovers, pauses, then clicks |
| Typing | Character-by-character with random delays |
| Recovery | If a step fails, AI tries an alternative |
| Verification | Uses vision + page state to confirm outcomes |

## Requirements

- Node.js 20+
- OpenAI API key (GPT-4o with vision)
- Chromium (auto-installed via Playwright)

## License

MIT
