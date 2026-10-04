# Decisions Log

Record significant choices and reversals here, newest first. Each entry gives the date, the decision and the reason, in a few lines. Don't log small changes.

---

### 2026-10-04: Deploy to Railway, not Vercel
Vercel was the first choice, but its serverless functions lose the SQLite file and can't keep SSE connections open, so the app would reset and stop updating live. Railway runs a normal long-lived Node server with a persistent volume, so the app deploys unchanged as one service (Express also serves the React build). Deployment moved from "out of scope" to done.

### 2026-10-04: Dark terminal look replaces pastel sticky notes
The owner asked to match a reference design (dark panels, monospace/pixel fonts, lime accent). Pastel backgrounds and tilt are dropped; each note keeps an `id`-derived colour, now used as a small accent dot instead. Fonts come from Google Fonts with system monospace fallbacks, so no npm dependency was added.

### 2026-10-04: Colour not stored in the DB
The form collects only name + message. Note colour and tilt are derived from `id` on the frontend, which keeps the schema to one simple table.

### 2026-10-04: Server-Sent Events for live updates
The wall must update live. SSE is one-way (server → browser), built into browsers via `EventSource`, and needs no extra library. We chose it over polling (laggy, wasteful) and Socket.IO (unnecessary two-way machinery).

### 2026-10-04: Endpoints under `/api/feedbacks`
Plural resource name to match the architecture diagram. The `/api` prefix lets the Vite dev proxy forward requests to Express, so no CORS setup is needed.

### 2026-10-04: Stack chosen
React + Vite, Node + Express, SQLite via better-sqlite3. JavaScript across the whole app; SQLite file lives inside the project. Confirmed as allowed for the IITM project.
