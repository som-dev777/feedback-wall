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

## Runtime
- Node.js 22 or newer (`better-sqlite3` 13 requires it; developed on Node 24). Production is pinned to Node 22 LTS via `engines` in the root `package.json`. `better-sqlite3` is a native module; on Node 20 it crashes at startup.
- Backend uses ES modules (`"type": "module"`).

## Dependencies
**server/**
- `express`
- `better-sqlite3`
- dev: `nodemon`

**client/**
- What the Vite React template provides (`react`, `react-dom`, `vite`, `@vitejs/plugin-react`, plus the template's dev tooling `oxlint` and `@types/react*`)

No other libraries without approval. In particular: no ORM, no Socket.IO, no CORS package, no CSS framework, no Axios.

## Dev setup
- Server runs on port **3000**: `cd server && npm run dev` (nodemon).
- Client runs on Vite's default port **5173**: `cd client && npm run dev`.
- `client/vite.config.js` proxies `/api` → `http://localhost:3000`, so the client always calls relative `/api/...` URLs. This is why no CORS setup is needed.

## Production (Railway)
- One service runs everything: Express serves the API **and** the built React app from `client/dist/`. Same origin, so no proxy or CORS is needed.
- Root `package.json` scripts, which Railway runs automatically:
  - `npm run build`: installs server + client dependencies and runs `vite build`
  - `npm start`: starts `server/index.js`
- Environment variables:
  | Variable | Default | Purpose |
  |----------|---------|---------|
  | `PORT` | `3000` | Set by Railway automatically |
  | `DATA_DIR` | `server/data` | Folder for `feedback.db`; on Railway, set to the volume mount path (e.g. `/data`) so notes survive redeploys |
- Not Vercel: its serverless functions have a temporary file system (SQLite data would be lost) and can't hold long-lived SSE connections (see `decisions.md`).

## .gitignore
```
node_modules/
server/data/*.db
client/dist/
.DS_Store
```
