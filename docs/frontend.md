# Frontend

React + Vite in `client/`, plain CSS in `src/index.css`. Visual design (colours, fonts, layout) is specified in `look-and-feel.md`.

## Components
| Component | Responsibility |
|-----------|----------------|
| `App.jsx` | Page layout: sidebar (logo + `FeedbackForm`), top bar (status + note count), hero headline, `FeedbackWall`. Holds the `notes` state and passes `notes` + `setNotes` to `FeedbackWall`. |
| `FeedbackForm.jsx` | Collects name + message and POSTs to `/api/feedbacks` (doesn't touch `notes`; its note arrives via the stream) |
| `FeedbackWall.jsx` | Loads notes on mount, subscribes to the live stream, renders the grid |
| `StickyNote.jsx` | Displays a single note |

## FeedbackForm
- Name input (optional, maxLength 40)
- Message textarea with live counter `x/280`
- Submit disabled while the message is empty/whitespace, over 280 chars, or a request is in flight
- On success: clear the form. The note itself appears via the stream.
- On failure: show the server's `error` message near the button

## FeedbackWall
- In one `useEffect` on mount: first open `new EventSource('/api/feedbacks/stream')`, then `fetch('/api/feedbacks')`. Opening the stream first means no note is missed while the list loads; the fetched list is merged with any notes the stream already delivered (de-duplicated by `id`).
- On each stream message, parse the note and prepend it **unless its `id` is already in the list**. Close the EventSource on unmount.
- Re-renders once a minute so relative times stay current.
- If the initial load fails, show "Could not load feedback. Is the server running?"
- Responsive CSS grid of `StickyNote` cards
- Empty state when there are no notes yet, e.g. "No feedback yet. Be the first!"

## StickyNote
- Dark tile with an accent colour `palette[id % palette.length]` (palette in `look-and-feel.md`), used for the name chip's dot and the hover border
- Name chip at the top, message in the middle (preserve line breaks with `white-space: pre-wrap`), relative time ("just now", "5 min ago", "2 h ago") at the bottom
- Render text as plain text only. Never use `dangerouslySetInnerHTML`.

Note: `created_at` from the server is UTC without a timezone marker. Parse it as UTC (e.g. append `Z` after replacing the space with `T`) before computing relative time.
