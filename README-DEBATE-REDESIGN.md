# Interactive Debate UI redesign

This build keeps the existing vanilla HTML/CSS/ES-module + Vercel/Supabase-compatible stack and reworks the primary experience into a live debate with Professor Lennox.

## Main flow

1. `index.html` — theatrical start screen with Professor Lennox and the existing persona portraits as the visible audience.
2. `topics.html` — existing question library, relabeled for conversation/debate mode.
3. `arena.html` — free-text threaded conversation with Professor Lennox, plus a persistent audience gallery.
4. Audience personas interrupt at conversational beats with non-blocking, dismissible toast bubbles. Clicking any persona opens a profile drawer and that persona's interruption history.
5. Conversation messages and interruption history are saved to the existing local active-game storage so the debate can be resumed.

## AI use

`api/debate.js` remains the live AI endpoint. It now accepts the free-text conversation history and asks the model for a concise Socratic challenge. If `GEMINI_API_KEY` is unavailable, the UI falls back to deterministic local Professor Lennox prompts so the debate remains usable.

## Assets

All existing image assets are preserved unchanged. The redesign references the existing Professor L portrait and all six persona portrait PNGs; no images were regenerated or replaced.

## Key changed files

- `index.html`
- `arena.html`
- `topics.html`
- `css/debate.css` (new)
- `js/home.js`
- `js/arena.js`
- `js/topics.js`
- `api/debate.js`
