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

## Project structure
```
feedback-wall/
├── CLAUDE.md
├── package.json      # root build/start scripts used by Railway
├── docs/
├── server/
│   ├── index.js      # Express app, routes, SSE client list + broadcast; serves client/dist in production
│   ├── db.js         # better-sqlite3 connection + table creation
│   ├── data/         # feedback.db (gitignored, created on startup)
│   └── package.json
└── client/
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── FeedbackForm.jsx
    │   │   ├── FeedbackWall.jsx
    │   │   └── StickyNote.jsx
    │   └── index.css
    ├── vite.config.js
    └── package.json
```
