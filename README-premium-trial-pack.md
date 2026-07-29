# The Last Word Premium Trial Pack

Replace the files in this zip over your current repo after the title-screen updates.

What this adds:
- 160 premium topic questions in `data/topics.json`
- 8 specific Professor L rounds per topic
- 6 personas x 3 answer choices per round
- 13,500 persona-specific answer choices in `data/star-trials.json`
- 20-star debate meter: starts at 10/20, caps at 20/20
- no early win at 20; the debate continues until collapse or the 8th round
- compact no-scroll arena layout for desktop and mobile

Changed files:
- `data/topics.json`
- `data/star-trials.json`
- `js/star-trial-engine.js`
- `js/arena.js`
- `js/topics.js`
- `css/arcade.css`

Notes:
- The homepage title-screen files are not included here.
- The persona names/images are not changed here.
- All premium content is static JSON, so it works on Vercel without extra API cost.
