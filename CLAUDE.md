# Feedback Wall: Claude Code Guide

A simple app where anyone can post a short feedback/comment, and everyone sees all feedback on a live wall, like a digital sticky-note board.

## Read these before working
All project context lives in `docs/`. Read the files relevant to your task before writing code:

| File | Read when |
|------|-----------|
| `docs/overview.md` | Always, for what the app does and its current features |
| `docs/tech-stack.md` | Adding/changing dependencies or tooling |
| `docs/architecture.md` | Touching how frontend, API, backend and DB connect |
| `docs/api.md` | Adding/changing any endpoint or request/response shape |
| `docs/database.md` | Changing the schema or queries |
| `docs/frontend.md` | Building or changing UI components and behaviour |
| `docs/look-and-feel.md` | Changing anything visual: colours, fonts, spacing, layout, component styling |
| `docs/decisions.md` | Before reversing or questioning an earlier choice |

The docs are the source of truth. If code and docs disagree, point it out and ask which is correct. Don't silently pick one.

## Hard rules
- Stick to the stack in `docs/tech-stack.md`. Ask before adding any library.
- Always use prepared statements (`?` placeholders) for SQL. Never use string concatenation.
- Validate input on the server, not only in the UI.
- Render user text as plain text. Never use `dangerouslySetInnerHTML`.
- Work in small steps; after each step, tell me exactly how to test it.
- Keep code simple and readable (student project). Add brief comments only where logic isn't obvious.
- Don't add features I haven't asked for.
- Follow `docs/look-and-feel.md` for all styling: use the CSS variables in `client/src/index.css`, don't hard-code new colours or fonts.

## Keeping docs up to date
Update the docs **only when a change is significant**, i.e. when it would mislead someone reading the docs later.

**Update the docs when:**
- a new feature is added or an existing one is removed → `overview.md` (+ any affected file)
- an endpoint, request/response shape, or status code changes → `api.md`
- the schema changes (table, column, index) → `database.md`
- a dependency is added/removed or the dev setup changes → `tech-stack.md`
- the data flow or component structure changes → `architecture.md` / `frontend.md`
- the visual design changes (colours, fonts, layout, component styling) → `look-and-feel.md`
- an earlier decision is reversed or a notable trade-off is made → add an entry to `decisions.md`

**Do NOT update the docs for:**
- bug fixes, refactors, renames inside a file, styling tweaks, comments, or formatting
- anything that doesn't change what the docs currently say

**How:**
- Edit only the affected sections; don't rewrite whole files.
- Do the doc update in the same task as the code change, and mention at the end which doc files you changed (or that none needed changing).
- Keep docs describing the *current* state. History belongs only in `decisions.md`.

## Quick commands
- Server: `cd server && npm run dev` (port 3000)
- Client: `cd client && npm run dev` (Vite, proxies `/api` → 3000)
- Production build/run (what Railway does): `npm run build && npm start` from the project root
