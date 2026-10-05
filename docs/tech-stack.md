# Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React + Vite | Component-based UI, fast dev server with hot reload |
| Styling | Plain CSS | No extra tooling needed for a small UI |
| Fonts | Google Fonts (JetBrains Mono, VT323, Silkscreen) via `<link>` in `client/index.html` | Loaded from a CDN, not an npm dependency; falls back to system monospace offline |
| Backend | Node.js + Express | Minimal, well-known, same language as the frontend |
| Database | SQLite via `better-sqlite3` | Single file inside the project, zero setup, fast synchronous API |
| API style | REST (JSON over HTTP) | Simple contract between frontend and backend |
| Live updates | Server-Sent Events (SSE) | One-way server → browser push, built into browsers, no extra library |
| AI summary | OpenAI Chat Completions (`gpt-4.1-nano`) with structured JSON output, called with Node's built-in `fetch` | No SDK needed; the key's only available model; cheap and fast (~1.5 s) |

## Runtime
- Node.js 22 or newer (`better-sqlite3` 13 requires it; developed on Node 24). Production is pinned to Node 22 LTS via `engines` in the root `package.json`. `better-sqlite3` is a native module; on Node 20 it crashes at startup.
- Backend uses ES modules (`"type": "module"`).

## Dependencies
**server/**
- `express`
- `better-sqlite3`
- `compression` (gzip for API responses and the built client; the live stream is excluded so notes aren't held back)
- dev: `nodemon`

**client/**
- What the Vite React template provides (`react`, `react-dom`, `vite`, `@vitejs/plugin-react`, plus the template's dev tooling `oxlint` and `@types/react*`)

**root (testing)**
- dev: `@playwright/test` (end-to-end browser tests, Chromium only), `@types/node` (added by the Playwright installer)
- Tests live in `tests/`, config in `playwright.config.js`. Run with `npm run test:e2e` (or `npm run test:e2e:ui` for the visual runner); report with `npx playwright show-report`.
- Test files: `post-note`, `form-rules`, `api` (server validation via the `request` fixture), `live-updates` (two browser contexts), `persistence`, `states` (empty/error/loading via `page.route` mocks), `safety` (HTML shown as text, line breaks), `display` (relative time, note count, accent colour), `journeys` (multi-user turns, Hindi/emoji, double-click, Enter key, fake clock, SQL-looking text, typing during a slow post), `summary` (AI summary API + UI).
- AI summary tests never call OpenAI: `tests/mock-openai.js` is a fake OpenAI server on port **3199** that Playwright starts alongside the app (`OPENAI_API_KEY=test-key`). `summary.spec.js` runs in its own Playwright project after all other tests, so "the 10 newest notes" is stable. The NFT server runs with summaries switched off.
- **Non-functional (NFT) suite**: `npm run test:nft`. Config `playwright.nft.config.js`, tests in `tests-nft/`, own server on port **3200** with `DATA_DIR=.test-data-nft`, one worker so timings aren't skewed. Covers page load (Core Web Vitals), post and live-update latency, API load, many concurrent viewers, a 1,000-note wall, Fast-3G and offline, responsive layouts, accessibility (keyboard, labels, focus, WCAG AA contrast) and long-session stability. Each measurement is checked against a budget and saved to `nft-results/results.json`.
- Tests never use the dev servers or the real DB: Playwright's `webServer` builds the client and starts Express on port **3100** with `DATA_DIR=.test-data` (deleted at the start of each run, gitignored).

No other libraries without approval. In particular: no ORM, no Socket.IO, no CORS package, no CSS framework, no Axios.

## Dev setup
- Server runs on port **3000**: `cd server && npm run dev` (nodemon).
- Client runs on Vite's default port **5173**: `cd client && npm run dev`.
- `client/vite.config.js` proxies `/api` → `http://localhost:3000`, so the client always calls relative `/api/...` URLs. This is why no CORS setup is needed.
- **Secrets:** put `OPENAI_API_KEY=...` in `server/.env` (gitignored). `server/env.js` loads it with Node's `process.loadEnvFile`; variables already set in the environment win. Never put keys in code or commit them.

## Production (Railway)
- One service runs everything: Express serves the API **and** the built React app from `client/dist/`. Same origin, so no proxy or CORS is needed.
- Responses are gzipped (the main JS goes from ~223 KB to ~69 KB). Files in `/assets` have hashed names and are cached for a year (`immutable`); `index.html` is not cached, so new deploys show up immediately.
- Root `package.json` scripts, which Railway runs automatically:
  - `npm run build`: installs server + client dependencies and runs `vite build`
  - `npm start`: starts `server/index.js`
- Environment variables:
  | Variable | Default | Purpose |
  |----------|---------|---------|
  | `PORT` | `3000` | Set by Railway automatically |
  | `DATA_DIR` | `server/data` | Folder for `feedback.db`; on Railway, set to the volume mount path (e.g. `/data`) so notes survive redeploys |
  | `OPENAI_API_KEY` | none | Enables the AI summary. Without it `/api/summary` returns 503 |
  | `OPENAI_MODEL` | `gpt-4.1-nano` | Model used for summaries |
  | `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Only changed by tests, to point at the fake OpenAI server |
- Not Vercel: its serverless functions have a temporary file system (SQLite data would be lost) and can't hold long-lived SSE connections (see `decisions.md`).

## .gitignore
```
node_modules/
server/data/*.db
client/dist/
.DS_Store
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
/playwright/.auth/
/.test-data/
/.test-data-nft/
/nft-results/
```
