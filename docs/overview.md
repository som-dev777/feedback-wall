# Overview

## What it is
Feedback Wall is a digital sticky-note board. Anyone can post a short feedback or comment, and everyone viewing the app sees all feedback on a shared wall that updates live, without refreshing.

## Users
Anyone with the link. There are no accounts, no login and no moderation (yet).

## Current features
| # | Feature | Details |
|---|---------|---------|
| 1 | Post feedback | Optional name (max 40 chars, defaults to "Anonymous") + required message (1–280 chars) |
| 2 | View the wall | All feedback shown as sticky notes, newest first |
| 3 | Live updates | New notes appear instantly for every open browser (Server-Sent Events) |
| 4 | Dark terminal look | Dark panelled layout, monospace and pixel fonts, lime accent; each note is a tile with a coloured name chip + relative time (see `look-and-feel.md`) |
| 5 | AI summary | A **Summarize** button sends the 10 most recent notes to OpenAI and shows a short summary, a sentiment bar (positive / neutral / negative) and the top themes as bars. Only the person who clicks sees it. |

## Out of scope (for now)
Authentication, editing or deleting notes, likes/reactions, moderation, pagination.

## Deployment
Code on GitHub (public repo), hosted on Railway as a single Node service with a persistent volume for the SQLite file. See `tech-stack.md` → Production.

- Live app: https://feedback-wall-production.up.railway.app
- Repo: https://github.com/som-dev777/feedback-wall
- Pushing to `main` redeploys automatically **once the Railway GitHub App is installed** for this repo. Without it, deploy the latest commit with `railway service source connect --repo som-dev777/feedback-wall --branch main --service feedback-wall`.

## Status
v1 built. All features above are implemented.
