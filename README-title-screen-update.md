# The Last Word title-screen update

This update changes the home page into the retro title screen shown in the reference image while keeping the Star Trial gameplay flow the same.

Replace these files/folders in your repo:

- `index.html`
- `css/arcade.css`
- `js/home.js`
- `js/storage.js`
- `js/arena.js`
- `js/verdict.js`
- `assets/ui/home-title-screen.png`

Behavior:
- `New Game` clears any unfinished cached Star Trial and goes to `topics.html`.
- `Load Game` resumes the unfinished Star Trial from this browser using `arena.html?resume=1`.
- `Account` goes to `account.html`.
- Finished trials clear the active saved game so Load Game does not reopen completed debates.

The title screen uses the provided reference image as the arcade artwork background, then overlays real clickable buttons so the page behaves like a game menu.
