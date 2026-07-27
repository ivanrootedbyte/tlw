# The Last Word v2 — Production Current-Affairs MVP

A retro debate-card game where fictional satire personas debate current topics against Professor L.

## What is new in v2

- Plain-language rewrite across the game.
- 140 playable topics: 7 categories with 20 topics each.
- 115 playable cards.
- Round-by-round pop-up briefing flow.
- Result pop-up after each card play.
- Broader categories beyond tech: culture, relationships, work, society, health, faith/meaning.
- People-style PNG portraits are included in `assets/portraits/`.
- Gemini route still works through `api/debate.js` when `GEMINI_API_KEY` is set.
- Supabase remains optional and can be configured later.

## Deploy on Vercel

Use these Vercel settings for a static HTML/CSS/JS app with an API route:

- Preset: Other
- Root Directory: `./`
- Build Command: leave blank
- Output Directory: leave blank
- Install Command: leave blank

Required for AI responses:

```text
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.5-flash
```

Supabase can be added later. Without Supabase, the app still works in guest mode with local match history.

## Local run

Use a local static server instead of double-clicking `index.html`:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

This is needed because the browser fetches JSON files from `/data/` and uses module scripts.

## Optional Supabase setup

Update `js/env.js` later:

```js
window.__SUPABASE_URL__ = 'https://YOUR_PROJECT.supabase.co';
window.__SUPABASE_ANON_KEY__ = 'YOUR_SUPABASE_ANON_KEY';
```

Then run `supabase/schema.sql` in your Supabase SQL editor.

## Main changed files in v2

- `data/topics.json`
- `data/cards.json`
- `data/personas.json`
- `topics.html`
- `arena.html`
- `index.html`
- `js/topics.js`
- `js/arena.js`
- `js/deck.js`
- `js/game-engine.js`
- `js/dialogue-engine.js`
- `api/debate.js`
- `css/arcade.css`

## Notes

All characters are fictional satire personas for education and entertainment. They are not affiliated with or endorsed by any real person or company.
