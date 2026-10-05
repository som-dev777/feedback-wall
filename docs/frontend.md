# Frontend

React + Vite in `client/`, plain CSS in `src/index.css`. Visual design (colours, fonts, layout) is specified in `look-and-feel.md`.

## Components
| Component | Responsibility |
|-----------|----------------|
| `App.jsx` | Page layout: sidebar (logo + `FeedbackForm`), top bar (status + note count), hero headline, `FeedbackSummary`, `FeedbackWall`. Holds the `notes` state and passes `notes` + `setNotes` to `FeedbackWall`. |
| `FeedbackForm.jsx` | Collects name + message and POSTs to `/api/feedbacks` (doesn't touch `notes`; its note arrives via the stream) |
| `FeedbackWall.jsx` | Loads notes on mount, subscribes to the live stream, renders the grid |
| `StickyNote.jsx` | Displays a single note |
| `FeedbackSummary.jsx` | Summarize button, AI summary text, sentiment bar and theme bars. Keeps its own state; gets `noteCount` from `App` |

## FeedbackForm
- Name input (optional, maxLength 40)
- Message textarea with live counter `x/280`
- Submit disabled while the message is empty/whitespace, over 280 chars, or a request is in flight
- On success: clear the form, but only fields still holding the text that was sent. The note appears via the stream, often before the POST reply, so the user may already be typing the next note.
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

## FeedbackSummary
- Panel between the hero and the wall, titled "AI summary"
- Button: "Summarize" (then "Refresh" once a summary is shown); "Summarizing..." and disabled while waiting; disabled when the wall is empty
- On success: summary text (plain text), "Based on the N most recent notes · HH:MM", a sentiment bar split by positive / neutral / negative counts with a legend, and up to 4 theme bars sized relative to the most common theme
- On failure: show the server's `error` message; the button works again
- Only the person who clicks sees the summary (it is not broadcast)
