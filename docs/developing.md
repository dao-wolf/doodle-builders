# Developing

How to run, change and test the game. Back to the [README](../README.md).

It is a static website: plain HTML, CSS and JavaScript with no build step and no dependencies.

## Run it on your computer

Browsers block some features when a page is opened straight from a file, so serve the folder:

```bash
cd doodle-builders
python3 -m http.server 8000
```

Then open <http://localhost:8000>. The microphone works on `localhost`, so you can record your voice here too. `index.html?speed=2` runs the game faster, which is handy for testing.

## Project layout

```
index.html            the page: HUD, buttons, menus, settings and voice studio
css/style.css         all styles
js/util.js            canvas setup, constants, helpers
js/content.js         phonics sounds, numbers, spoken lines, the four outposts and their lands
js/settings.js        grown-up settings (saved in localStorage)
js/art.js             pixel textures, outpost blocks, Bob, Mr Henry and the Nibblers
js/audio.js           sound effects and music (Web Audio, no files)
js/voice.js           speech: own recordings, then Jenny, then the device voice
js/game.js            game rules: journey, questions, Nibblers, building, input, update loop
js/render.js          drawing the world and the menu previews
js/studio.js          the voice studio (record, trim, save, export and import)
js/main.js            main loop and start-up
voice/jenny.json      the built-in voice (Jenny (Dioco), made with Piper), one base64 MP3 per clip
voice/my-voice.json   your voice pack, if you add one (optional)
tools/voice/          scripts that made jenny.json (see tools/voice/README.md)
tools/playtest/       automated playthrough and voice studio tests
docs/                 these guides and the README screenshot
```

The scripts load in this order at the bottom of `index.html`, and they share one global scope, so the order matters: `util, content, settings, art, audio, voice, game, render, studio, main`.

## The `TEXT` and `LEVELS` registries

Every line the game says is listed in `TEXT` in `js/content.js`. Each key is one clip: `s_*` are pure sounds, `w_*` example words, `n1` to `n10` numbers, and the rest are Bob's lines. Voice packs use the same keys, so a new line needs a new `TEXT` key (and a Jenny clip, made with `tools/voice/add_lines.py`).

The outposts are block lists in `LEVELS` (same file), so new outposts can be added there. Their lands are in `THEMES`, and the difficulty levels are in `DIFF` in `js/settings.js`.

## Testing

```bash
pip install -r tools/playtest/requirements.txt
playwright install chromium
python tools/playtest/playtest.py              # robot plays four scenarios (phone and desktop, all difficulties)
python tools/playtest/studio_test.py           # voice studio with a pretend microphone
```

Both scripts start their own local server. Screenshots and the exported test voice pack go to `tools/playtest/out/`.

## Code quality

[CodeScene](https://codescene.io/projects/87039) checks every pull request against its Code Health rules. Rule overrides live in `.codescene/code-health-rules.json`: the game code uses the defaults, and only the `tools/` scripts are relaxed. Dependabot branches are not analysed.

## GitHub Pages

The game is served straight from the repository: Settings → Pages → Deploy from a branch → `main` / root.
