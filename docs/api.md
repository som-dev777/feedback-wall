# API

Base path: `/api`. All request and response bodies are JSON (except the SSE stream).

## Note object
```json
{
  "id": 12,
  "name": "Somnath",
  "message": "Love the live wall!",
  "created_at": "2026-10-04 09:15:32"
}
```
`created_at` is UTC in SQLite's `datetime('now')` format.

---

## POST /api/feedbacks
Create a new feedback note.

**Request body**
```json
{ "name": "Somnath", "message": "Love the live wall!" }
```

**Validation**
| Field | Rule |
|-------|------|
| `message` | Required string, trimmed, 1–280 characters |
| `name` | Optional string, trimmed, max 40 characters; missing or empty → `"Anonymous"` |

**Responses**
- `201 Created`: the created note object
- `400 Bad Request`: `{ "error": "<reason>" }`
- `413 Payload Too Large`: `{ "error": "Request body is too large" }` (body over Express's 100 KB limit)
- `500 Internal Server Error`: `{ "error": "Something went wrong" }`

**Side effect:** the created note is broadcast to all connected `/api/feedbacks/stream` clients.

---

## GET /api/feedbacks
Return all notes, newest first (`ORDER BY created_at DESC, id DESC`).

**Responses**
- `200 OK`: array of note objects
- `500`: `{ "error": "Something went wrong" }`

---

## POST /api/summary
Summarize the 10 most recent notes with OpenAI. No request body.

**Responses**
- `200 OK`:
  ```json
  {
    "summary": "Most people like the live updates; a few find the text hard to read.",
    "sentiment": { "positive": 6, "neutral": 3, "negative": 1 },
    "themes": [{ "label": "Live updates", "count": 4 }, { "label": "Readability", "count": 2 }],
    "noteCount": 10,
    "generatedAt": "2026-10-05T08:10:00.000Z"
  }
  ```
  `themes` has at most 4 items, most common first. Counts are whole numbers between 0 and `noteCount` (themes: at least 1). The model's sentiment counts may not add up exactly to `noteCount`.
- `400 Bad Request`: `{ "error": "There is no feedback to summarize yet" }`
- `502 Bad Gateway`: `{ "error": "Could not get a summary right now. Please try again." }` (OpenAI failed, timed out after 20 s, or returned something unreadable)
- `503 Service Unavailable`: `{ "error": "Summaries are not set up on this server" }` (no `OPENAI_API_KEY`)

**Cost control:** the last summary is reused while no new note has arrived, and simultaneous requests share one OpenAI call.

---

## GET /api/feedbacks/stream
Server-Sent Events stream of newly created notes.

**Response headers**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Messages**
- New note: `data: <note object as JSON>\n\n`
- Heartbeat every ~25s: `: ping\n\n` (keeps the connection alive; browsers ignore it)

The server removes the client from its list when the connection closes.

---

## Testing with curl
```bash
# create
curl -X POST http://localhost:3000/api/feedbacks \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","message":"Hello wall"}'

# list
curl http://localhost:3000/api/feedbacks

# watch the live stream (keep open, post from another terminal)
curl -N http://localhost:3000/api/feedbacks/stream
```
