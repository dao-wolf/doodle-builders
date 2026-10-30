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
js/seasons.js         seasonal themes: when Halloween and Christmas show, and how they change the lands and outposts
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
tools/playtest/       automated playthrough, voice studio and zero-size tests
docs/                 these guides, the README screenshot and the seasonal screenshots
```

The scripts load in this order at the bottom of `index.html`, and they share one global scope, so the order matters: `util, content, settings, seasons, art, audio, voice, game, render, studio, main`.

## The `TEXT` and `LEVELS` registries

Every line the game says is listed in `TEXT` in `js/content.js`. Each key is one clip: `s_*` are pure sounds, `w_*` example words, `n1` to `n10` numbers, and the rest are Bob's lines. Voice packs use the same keys, so a new line needs a new `TEXT` key (and a Jenny clip, made with `tools/voice/add_lines.py`).

The outposts are block lists in `LEVELS` (same file), so new outposts can be added there. Their lands are in `THEMES`, and the difficulty levels are in `DIFF` in `js/settings.js`.

## Seasonal themes

`SEASONS` in `js/seasons.js` lists each season's dates (`from` and `to` as month-day; a window may cross the new year), its changes to each land (merged over `THEMES` by `landTheme()`), and its block re-skins per outpost (`skinOutposts()` sets `skin` and `over` on blocks, by type or by `'column,row'`, without changing any shapes). The costumes are `COSTUMES` in `js/art.js`, and the seasonal scenery is in `DECOS` in `js/render.js`. `seasonOn(date)` is a pure function that says which season, if any, a date falls in. `?season=halloween|christmas|none` and `?date=YYYY-MM-DD` force a look or a date.

## Testing

```bash
pip install -r tools/playtest/requirements.txt
playwright install chromium
python tools/playtest/playtest.py              # robot plays seven scenarios (phone and desktop, all difficulties, Halloween, Christmas and the normal look)
python tools/playtest/studio_test.py           # voice studio with a pretend microphone
python tools/playtest/zero_size_test.py        # the game keeps drawing after it starts with no window size
```

Each script starts its own local server, which serves the game under `/doodle-builders/` as GitHub Pages does. They fail on a page error or any file the game needs that doesn't load. Screenshots and the exported test voice pack go to `tools/playtest/out/`.

Every pull request runs all three on GitHub Actions (`.github/workflows/playtests.yml`). If they fail, `tools/playtest/out/` is attached to the run as `playtest-out`.

## Code quality

[CodeScene](https://codescene.io/projects/87039) checks every pull request against its Code Health rules. Rule overrides live in `.codescene/code-health-rules.json`: the game code uses the defaults, and only the `tools/` scripts are relaxed. Dependabot branches are not analysed.

## Merging into `main`

Every change goes through a pull request. A ruleset on `main` lets a pull request merge only once these checks pass on its latest commit, and it refuses direct pushes. Nobody can bypass it, the owner included.

| Check | From | What it checks |
|---|---|---|
| Robot playtests | GitHub Actions | all three playtests |
| CodeScene Code Health Review (main) | CodeScene | the Code Health of the changed code |
| Socket Security: Pull Request Alerts | Socket | any package the pull request adds or changes |

Socket's Project Report, which covers every package already in use, is for information only. A branch doesn't have to be up to date with `main` before it merges.

If one of these services is down, merging waits. The owner can switch the ruleset off in Settings → Rules → Rulesets. CodeScene skips Dependabot branches, so let it analyse them before switching Dependabot on, or its pull requests could never merge.

## GitHub Pages

The game is served straight from the repository: Settings → Pages → Deploy from a branch → `main` / root.
