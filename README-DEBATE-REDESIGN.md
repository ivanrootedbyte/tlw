# Interactive Debate UI redesign

This build keeps the existing vanilla HTML/CSS/ES-module + Vercel/Supabase-compatible stack and reworks the primary experience into a live debate with Professor L.

## Main flow

1. `index.html` — theatrical start screen with Professor L and the existing persona portraits as the visible audience.
2. `topics.html` — existing question library, relabeled for conversation/debate mode.
3. `arena.html` — free-text threaded conversation with Professor L, plus a persistent audience gallery.
4. Audience personas interrupt at conversational beats with non-blocking, dismissible toast bubbles. Clicking any persona opens a profile drawer and that persona's interruption history.
5. Conversation messages and interruption history are saved to the existing local active-game storage so the debate can be resumed.

## AI use

`api/debate.js` remains the live AI endpoint. It now accepts the free-text conversation history and asks the model for a concise Socratic challenge. If `GEMINI_API_KEY` is unavailable, the UI falls back to deterministic local Professor L prompts so the debate remains usable.

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


## Professor L clarity flow

The topic screen now requires two layers before entering the conversation:
1. Choose a broad topic/prompt from the existing library.
2. Write the user's actual question or uncertainty.

The selected topic and custom question are stored locally and sent with each `/api/debate` request. The AI is instructed to act as an original fictional Christian academic called Professor L. Biblical truth governs the worldview, but replies are intentionally conversational rather than sermon-like and Scripture is quoted only when it materially clarifies the issue.

No new Supabase SQL is required for this local-session version. Supabase would only be needed if custom questions/transcripts should persist across devices/accounts.
