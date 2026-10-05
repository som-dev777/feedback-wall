# Decisions Log

Record significant choices and reversals here, newest first. Each entry gives the date, the decision and the reason, in a few lines. Don't log small changes.

---

### 2026-10-05: AI summary via OpenAI, called from the server
The owner asked for a Summarize button that sends the last 10 notes to OpenAI. The call is made by the server with Node's built-in `fetch` (no SDK, so no new library), using structured JSON output so the visuals get reliable numbers. The key stays on the server in a gitignored `server/.env`. Notes are sent as JSON with an instruction to treat them as data, to resist prompt injection, and the model's numbers are clamped before reaching the UI. To limit cost on a public page, the last summary is reused until a new note arrives and simultaneous clicks share one call. `gpt-4.1-nano` is used because it is the only model the provided key can access. Summaries are shown only to the person who clicks, not broadcast.

### 2026-10-05: Added gzip compression and long caching for built assets
NFT testing showed the 223 KB JavaScript bundle was sent uncompressed and re-validated on every visit. Added the `compression` package (approved by the owner) and a one-year `immutable` cache for hashed files in `/assets`. Page transfer dropped from ~225 KB to ~71 KB; repeat visits download 0 KB of assets. The SSE stream is excluded from compression, because compression buffers output and would delay live notes.

### 2026-10-05: Dim text colour raised for accessibility
NFT testing measured the `--dim` grey (#5C5C5C) at 2.94:1 contrast on the dark panels, below the WCAG AA minimum of 4.5:1, which made timestamps, the counter and placeholders hard to read. Raised to #808080 (≈5:1). It stays visibly dimmer than `--muted`, so the visual hierarchy is kept.

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
