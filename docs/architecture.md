# Architecture

## Layers and responsibilities
| Layer | Tech | Job |
|-------|------|-----|
| Frontend | React | Shows the UI. The user sees and types here. No business logic. |
| API | REST + SSE | Defines the contract the frontend uses to talk to the backend. |
| Backend | Node + Express | Route handlers. Validation and business logic live here, not in the UI. |
| Database | SQLite | Persists data so it survives restarts. One table. |

## Flows

### 1. Submit feedback
```
FeedbackForm ──POST /api/feedbacks──▶ Express: validate + INSERT ──▶ SQLite
                                          │
                                          ├─▶ broadcast new note to all SSE clients
                                          └─▶ 201 + created note back to the form
```

### 2. Load the wall
```
FeedbackWall (on load) ──GET /api/feedbacks──▶ Express: SELECT newest first ──▶ SQLite
                       ◀──────── JSON array ────────
```

### 3. Live updates
```
FeedbackWall ──GET /api/feedbacks/stream (EventSource, stays open)──▶ Express keeps a list of clients
             ◀──── data: {new note} ──── pushed whenever flow 1 saves a note
```
The poster's own note also arrives through the stream, so the wall skips notes whose `id` is already shown.

### 4. AI summary
```
FeedbackSummary ──POST /api/summary──▶ Express: SELECT 10 newest ──▶ SQLite
                                          │
                                          ├─▶ same newest note as last time? return the saved summary
                                          └─▶ otherwise fetch() OpenAI chat completions (structured JSON) ──▶ OpenAI
                ◀──── { summary, sentiment, themes } ────
```
The API key lives only on the server (`server/.env` locally, a Railway variable in production). The browser never sees it.

## Project structure
```
feedback-wall/
├── CLAUDE.md
├── package.json      # root build/start scripts used by Railway
├── docs/
├── server/
│   ├── index.js      # Express app, routes, SSE client list + broadcast; serves client/dist in production
│   ├── env.js        # loads server/.env (OPENAI_API_KEY); imported first
│   ├── db.js         # better-sqlite3 connection + table creation
│   ├── summary.js    # OpenAI call (built-in fetch) + checks on the model's answer
│   ├── .env          # OPENAI_API_KEY (gitignored, never committed)
│   ├── data/         # feedback.db (gitignored, created on startup)
│   └── package.json
└── client/
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── FeedbackForm.jsx
    │   │   ├── FeedbackSummary.jsx
    │   │   ├── FeedbackWall.jsx
    │   │   └── StickyNote.jsx
    │   └── index.css
    ├── vite.config.js
    └── package.json
```
