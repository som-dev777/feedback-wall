# Look and Feel

The UI uses a dark, "developer terminal" style: near-black panels on a black page, monospace text, a pixel-font headline in neon lime, and small uppercase label chips. It was modelled on a reference screenshot the owner provided (the Overrides component-library site).

All styles live in `client/src/index.css`. Colours, fonts and spacing are CSS variables on `:root`. Change the variables rather than hard-coding values.

## Principles
- **Dark and flat.** Black page and near-black panels separated by thin borders and small gaps. No shadows, no gradients, no tilt.
- **Monospace everywhere.** Body text is monospace. Labels are small, uppercase and letter-spaced.
- **One loud colour.** Lime (`--accent`) is used for the headline, the Post button, input focus and text selection. Everything else stays grey.
- **Colour as a small signal.** Each note gets a neon dot (and a coloured border on hover), never a coloured background.

## Colour tokens
| Token | Hex | Used for |
|-------|-----|----------|
| `--bg` | `#000000` | Page background (shows as the gaps between panels) |
| `--panel` | `#0B0B0B` | Panels: sidebar, top bar, hero, note tiles |
| `--panel-raised` | `#141414` | Inputs, chips, disabled button |
| `--border` | `#1C1C1C` | Panel borders |
| `--border-strong` | `#2C2C2C` | Input and chip borders |
| `--text` | `#E8E8E8` | Main text (note messages, input text) |
| `--muted` | `#9A9A9A` | Labels, status text, chip text |
| `--dim` | `#5C5C5C` | Tagline, timestamps, counter, placeholders |
| `--accent` | `#D4FF3A` | Lime: headline, Post button, focus ring, selection |
| `--yellow` | `#FFE14D` | Top-bar status dot |
| `--green` | `#5CFF8A` | Top-bar status dot |
| `--danger` | `#FF5C5C` | Error text, counter over 280 |

**Note accent palette** (dot colour = `PALETTE[id % 5]` in `StickyNote.jsx`)
| Colour | Hex |
|--------|-----|
| Lime | `#D4FF3A` |
| Yellow | `#FFE14D` |
| Green | `#5CFF8A` |
| Violet | `#8C8CFF` |
| Pink | `#FF7AC6` |

## Typography
Loaded from Google Fonts in `client/index.html`. Each has a system monospace fallback, so the app still works offline (just less stylised).

| Token | Font | Used for |
|-------|------|----------|
| `--font-body` | JetBrains Mono (400/500/600) | All body text, inputs, buttons, labels |
| `--font-display` | VT323 | Hero headline (lime, `clamp(2.2rem, 5vw, 3.6rem)`) |
| `--font-logo` | Silkscreen | "Feedback Wall" logo in the sidebar |

Label style (status items, chips, section label, timestamps, button): uppercase, `letter-spacing: 0.06–0.1em`, size `0.65–0.8rem`.

## Layout
```
┌──────────────┬──────────────────────────────────────────────┐
│ FEEDBACK     │ ● REAL-TIME WALL   ● 3 NOTES       (top bar) │
│ WALL         ├──────────────────────────────────────────────┤
│ tagline      │ Leave a note.                                │
│              │ Everyone sees it instantly.  (hero, lime)    │
│ POST A NOTE  ├──────────────┬──────────────┬────────────────┤
│ [name     ]  │ [● NAME]     │ [● NAME]     │ [● NAME]       │
│ [message  ]  │ message…     │ message…     │ message…       │
│ 0/280 [POST] │ 5 MIN AGO    │ JUST NOW     │ 2 H AGO        │
└──────────────┴──────────────┴──────────────┴────────────────┘
```
- Page: a CSS grid with a `300px` sidebar and a flexible main column. `--gap` (6px) between all panels, `--radius` 8px on panels.
- **Sidebar** (sticky, full height): logo, tagline, "Post a note" label, then the form.
- **Top bar**: two status items with coloured dots: "Real-time wall" (yellow) and the live note count (green).
- **Hero**: the lime pixel-font headline.
- **Wall**: a grid of tiles, `repeat(auto-fill, minmax(260px, 1fr))`, min height 220px.
- **Below 800px wide**: the sidebar stacks above the main column and stops being sticky.

## Components
- **Note tile**: a panel. At the top is a chip showing the accent dot and the author's name in uppercase. The message sits in the middle (plain text, `pre-wrap`). The relative time is at the bottom in small dim uppercase. On hover the border turns the note's accent colour.
- **Inputs**: raised dark background, strong border, lime border on focus, dim placeholder.
- **Post button**: lime background, black uppercase text. When disabled, a raised grey background with dim text.
- **Empty and error states**: a single centred panel with muted text.
