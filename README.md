# The Last Word: Retro Debate Arena Plus

Production-style MVP for a retro debate game with:
- 6 fictional tech-archetype personas
- local-first gameplay
- Vercel API route for live Professor L cross-examination
- Supabase magic-link sign-in and cloud match history

## Run locally
Use any static server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy to Vercel
1. Push this folder to GitHub.
2. Import the repo into Vercel.
3. Add environment variables in Vercel:
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` (optional, defaults to `gemini-2.5-flash-lite`)
4. Deploy.

Gemini 2.5 Flash-Lite is currently documented by Google as its most cost-efficient multimodal model, while Gemini 2.5 Flash is described as the better price-performance general model. This build defaults to Flash-Lite so Professor L cross-examination stays lightweight.

## Supabase setup
1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. Copy `js/env.example.js` to `js/env.js`.
4. Fill in:
   - `window.__SUPABASE_URL__`
   - `window.__SUPABASE_ANON_KEY__`
5. In Supabase Auth, enable email magic links. Supabase documents magic-link and OTP flows through `signInWithOtp`.

## What changed from the previous zip
- `api/debate.js` now calls Gemini when `GEMINI_API_KEY` is present, with local fallback if not.
- `account.html` now includes magic-link login UI.
- `js/supabase-client.js` handles auth, profile upsert, and cloud match saves.
- `js/account.js` merges cloud history with local history.
- `js/arena.js` now requests a live Professor L line every round and tries to sync results to Supabase.
- `js/env.js` is included as a safe placeholder so the app runs without configuration.

## Notes
- The main loop still works without AI or Supabase.
- Cloud save activates only after sign-in.
- The game remains single-player and inexpensive to test because most gameplay is still static and local-first.
