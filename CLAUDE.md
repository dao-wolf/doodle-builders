# Doodle Builders: guide for Claude

A static HTML, canvas and JavaScript learning game for children aged 2 to 5 (phonics and numbers). The first adventure is Bob's Outpost. How to run it, the project layout, the `TEXT`/`LEVELS` registries and the tests are in [docs/developing.md](docs/developing.md): read that first rather than repeating it here.

## Every change

- Run both playtests before and after (`tools/playtest/playtest.py` and `tools/playtest/studio_test.py`). They are the only tests; there are no unit tests yet. Every pull request also runs them on GitHub Actions.
- CodeScene and Socket Security check every pull request. Don't let Code Health drop; the rules are in `.codescene/code-health-rules.json`.
- Don't add a `LICENSE` file. The owner is choosing a licence with a trade mark attorney.

## How the code is built (easy to break)

- **No build step, no modules.** Plain `<script>` files share one global scope, and the load order at the bottom of `index.html` matters: `util, content, settings, art, audio, voice, game, render, studio, main`. A top-level `const` used before its file loads throws. Switching to native ES modules is the next planned change.
- **Game flow** is a phase state machine in `js/game.js`: `menu → intro → walk → ask → reward → … → arrive → bask → carry → place → building → done`. Use `later()` for delayed game steps, not `setTimeout`: restarting a level bumps `gen`, which cancels them.
- **Coordinates** are logical units scaled by `SC`. The hero, Nibblers and decorations are in world x (subtract `camX` to draw); question blocks, gems, particles and flying pieces are in screen coordinates.
- **Voice priority** (`js/voice.js`): the player's own recording (IndexedDB), then `voice/my-voice.json`, then `voice/jenny.json`, then the device's speech engine. If any clip in a line is missing, the whole line falls back to the device voice.
- **Keep every path relative** (`js/util.js`, not `/js/util.js`). GitHub Pages serves the game from `/doodle-builders/`, and so do the playtests.
- **Never rename the `bobs-outpost-*` storage keys** (`localStorage` settings, IndexedDB `bobs-outpost-voice`, the voice pack format) without a migration. It would wipe children's progress and the family's recordings.

## Design decisions to keep

- The players are 2 to 5 years old. Wrong answers get a gentle "That one says…" and a retry, a hint arrow appears after a quiet spell, and everything is spoken as well as shown. Hard mode's "Try again" ending is the one exception, and is under review.
- Phonics follows the Little Wandle Reception order, sound-first (never letter names). Include no Little Wandle materials, audio or images. Distractors never pair lookalikes (b/d/p) or same-sound spellings (c/k/ck): see `LOOKALIKE` and `SAME` in `js/content.js`.
- Answers float in front of the hero and never spawn on them. Gems are collected only by tapping.
- Defaults are in `DEFAULTS` (`js/settings.js`): game mode Both, Autumn 1 sounds, lowercase letters, numbers 1 to 5, movement "I steer", difficulty Easy, voice Natural (Jenny) with own recordings first. Change them only on purpose.
- The "Jenny (Dioco)" credit must stay visible (licence requirement).
- British English and plain words in all copy, comments and docs.

## Platform direction (decided 29 Oct 2026)

- One web codebase for the web, iPhone and Android. Capacitor (which wraps a website as a phone app) will package the same files for the App Store and Google Play later.
- Keep it a plain static site that GitHub Pages serves straight from `main`. A bundler (for example Vite) would mean deploying Pages through GitHub Actions, so raise it before adding one.
- Rejected: React Native (built for app screens, not canvas games; most of the code would be rewritten), Flutter with Flame, and Unity (full rewrites). Revisit only if budget devices can't keep the game smooth, or if many parent-facing screens such as accounts or subscriptions are needed.
- Before app store packaging: self-host the fonts (they load from Google's servers today) and load every asset from the app itself, so it works offline.
