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
js/learning.js        the learning rules: graphemes, weeks, and what to ask (no page access; see docs/domain.md)
js/content.js         spoken lines, number words, the four outposts and their lands
js/settings.js        grown-up settings (saved in localStorage)
js/seasons.js         seasonal themes: when Halloween and Christmas show, and how they change the lands and outposts
js/art.js             pixel textures, outpost blocks, the heroes (Bob, Mr Henry, Dragon Fly) and the Nibblers
js/audio.js           sound effects and music (Web Audio, no files)
js/voice.js           speech: own recordings, then Jenny, then the device voice (letter sounds: own recordings only)
js/game.js            game rules: journey, questions, Nibblers, building, input, update loop
js/render.js          drawing the world and the menu previews
js/studio.js          the voice studio (record, trim, save, export and import)
js/main.js            main loop and start-up
voice/jenny.json      the built-in voice (Jenny (Dioco), made with Piper), one base64 MP3 per clip
voice/my-voice.json   your voice pack, if you add one (optional)
tools/voice/          scripts that made jenny.json (see tools/voice/README.md)
tests/                unit tests for js/learning.js, run in Node
tools/playtest/       automated playthrough, voice studio, zero-size and performance tests
docs/                 these guides, the README screenshot and the seasonal screenshots
```

The scripts load in this order at the bottom of `index.html`, and they share one global scope, so the order matters: `util, learning, content, settings, seasons, art, audio, voice, game, render, studio, main`.

## The `TEXT` and `LEVELS` registries

Every line the game says is listed in `TEXT` in `js/content.js`. Each key is one clip: `w_*` are example words, `n1` to `n10` numbers, and the rest are Bob's lines. Letter sounds (`s_*`) are the exception: they aren't in `TEXT` and have no Jenny clip, because neither built-in voice says them properly, so they play only from the player's own recordings (`soundOf` in `js/voice.js`). Voice packs use the same keys, so a new line needs a new `TEXT` key (and a Jenny clip, made with `tools/voice/add_lines.py`).

The outposts are block lists in `LEVELS` (same file), so new outposts can be added there. Their lands are in `THEMES`, and the difficulty levels are in `DIFF` in `js/settings.js`.

## Adding a hero

Each hero is drawn in code, with no image files. Everything that differs between heroes sits in one table per file, keyed by the hero's id (`bob`, `henry`, `dragon`), so a new hero is a drawing plus a row in each table:

| Where | What to add |
|---|---|
| `js/art.js` | a `drawX(b, time, o)` function, facing right, and any seasonal outfits in `COSTUMES` (drawn by `wear()`) |
| `js/render.js` | `LOOKS`: the drawing, its shadow and its poses; `CARD_POSE`: how it sits on its start-screen card |
| `js/game.js` | `HEROES`: its name, action button, how close Nibblers get, footstep sound, tap area and action (`charge`, then `blow`) |
| `js/audio.js` | any new sounds in `SFX` |
| `js/content.js` | its lines `hi_<id>` and `nib_<id>` in `TEXT`, then Jenny clips for them with `tools/voice/add_lines.py` |
| `index.html`, `css/style.css` | a `.char` button on the start screen, and the action button's colour (`#actBtn[data-hero="<id>"]`) |
| `tools/playtest/` | a scenario in `playtest.py` that plays as the hero, and the id in `perf_report.py`'s `--hero` choices |

Draw from photos of the original drawing or model, but keep the photos out of the repository: it is public.

## Seasonal themes

`SEASONS` in `js/seasons.js` lists each season's dates (`from` and `to` as month-day; a window may cross the new year), its changes to each land (merged over `THEMES` by `landTheme()`), and its block re-skins per outpost (`skinOutposts()` sets `skin` and `over` on blocks, by type or by `'column,row'`, without changing any shapes). The costumes are `COSTUMES` in `js/art.js`, and the seasonal scenery is in `DECOS` in `js/render.js`. `seasonOn(date)` is a pure function that says which season, if any, a date falls in. `?season=halloween|christmas|none` and `?date=YYYY-MM-DD` force a look or a date.

## Testing

### Unit tests

The learning rules in `js/learning.js` have unit tests in `tests/`, written in the words in [The learning domain](domain.md). They need Node 22 or later and nothing else:

```bash
node --test "tests/**/*.test.js"
```

`tests/acceptance/` says what the questions must do, from the outside; `tests/unit/` tests each rule on its own. Write the test before the change (see [Changing a rule](domain.md#changing-a-rule)).

### Playtests

```bash
pip install -r tools/playtest/requirements.txt
playwright install chromium firefox webkit
python tools/playtest/playtest.py              # robot plays nine scenarios (phone and desktop, all difficulties, every hero, Halloween, Christmas and the normal look)
python tools/playtest/studio_test.py           # voice studio with a pretend microphone
python tools/playtest/zero_size_test.py        # the game keeps drawing after it starts with no window size
python tools/playtest/card_test.py             # question card: its size and the answers' sizes, nothing overlaps on any screen size, and no built-in letter sounds
python tools/playtest/touch_test.py            # plays by touch alone: every control responds, and tapping never makes the browser load anything
python tools/playtest/zoom_test.py             # nothing on any screen lets a double tap or a pinch zoom the page
python tools/playtest/season_test.py           # the start screen's picture button: switched off stays off in the level, and a double tap counts once
python tools/playtest/gate_test.py             # the grown-ups check before the settings: children can't get in, grown-ups can
python tools/playtest/perf_test.py             # performance guard: frame rate, canvas size, music and hidden-page sound
```

Each script starts its own local server, which serves the game under `/doodle-builders/` as GitHub Pages does. They fail on a page error or any file the game needs that doesn't load. Screenshots and the exported test voice pack go to `tools/playtest/out/`. Tests that need the settings get past the grown-ups check with `pass_gate()` from `gate_test.py`.

Every pull request runs the unit tests and all nine playtests on GitHub Actions (`.github/workflows/playtests.yml`). If they fail, `tools/playtest/out/` is attached to the run as `playtest-out`.

### Browsers

We don't choose the browser a family uses, so the game has to work in all the popular ones. The tests run in Chromium unless `PLAYTEST_ENGINE` names another:

```bash
PLAYTEST_ENGINE=firefox python tools/playtest/touch_test.py   # or webkit; chrome or msedge use the copy installed on this computer
```

| Engine | Which browsers use it | Tested on every pull request |
|---|---|---|
| Chromium | Chrome, Edge, Samsung Internet, Opera, Vivaldi and Brave, on Android and computers | all nine tests |
| WebKit | Safari, and every browser on an iPhone or iPad, including Chrome and Vivaldi | `playtest`, `card_test`, `touch_test`, `zoom_test`, `season_test`, `gate_test` |
| Firefox | Firefox on Android and computers | `playtest`, `card_test`, `touch_test`, `zoom_test`, `season_test`, `gate_test` |

These test the page, not the browser around it. A browser's own buttons and messages can't be seen by a robot, and neither can real phone speakers, microphones or heat, so also try a release by hand on an iPhone (Safari and Chrome) and on an Android phone or tablet (Chrome and Samsung Internet).

## Performance

The game repaints its whole screen every frame, so how often it draws and how many pixels it draws decide how hot a phone or tablet gets. Before 3 Nov 2026 it drew up to 60 frames a second at full device resolution, and a tablet's main thread was busy almost all the time.

- `js/main.js` draws at most 30 frames a second (`FRAME_MS`) on any screen; the game logic still steps in sixtieths of a second.
- `js/game.js` caps the canvas at `MAX_PIXELS`. Phones keep their 2x drawing; tablets and laptops draw at 1x, and the browser scales the canvas up (crisply, when the scale is a whole number).
- `js/audio.js` makes no music notes while the music is off, and suspends all sound while the page is hidden.

`perf_test.py` guards all three in CI. Its checks don't depend on how fast the machine is, and its `BUDGET` must match `MAX_PIXELS`. To see what a change costs, run the local report before and after it:

```bash
python tools/playtest/perf_report.py                   # Chromium: fps, main-thread busy % and canvas size, phone and tablet
python tools/playtest/perf_report.py --engine webkit   # WebKit, Safari's engine: iPhone 15 and iPad Pro 11 presets
python tools/playtest/perf_report.py --slow 4          # Chromium with the CPU slowed down 4 times
python tools/playtest/perf_report.py --hero dragon     # play as another hero (default Bob)
```

Headless Chromium paints on the CPU, so "busy %" overstates what a real device's graphics chip does, but it shows which way a change moves the cost. The WebKit mode is the stand-in for iPhones and iPads: it runs Safari's engine with Playwright's device presets and reports the CPU time of WebKit's web content and GPU processes (read with `ps`, on macOS). Neither counts the graphics chip's own drawing. On 3 Nov 2026 the WebKit mode gave the same picture as Safari in the iOS Simulator, so there's no need to install the simulator (about 8 GB) for these checks. The report isn't run in CI, because the numbers depend on the machine.

## Code quality

[CodeScene](https://codescene.io/projects/87039) checks every pull request against its Code Health rules. Rule overrides live in `.codescene/code-health-rules.json`: the game code uses the defaults, and only the `tools/` scripts are relaxed. Dependabot branches are not analysed.

## Merging into `main`

Every change goes through a pull request. A ruleset on `main` lets a pull request merge only once these checks pass on its latest commit, and it refuses direct pushes. Nobody can bypass it, the owner included.

| Check | From | What it checks |
|---|---|---|
| Robot playtests | GitHub Actions | the unit tests, all nine playtests, and six of the playtests again in Firefox and WebKit |
| CodeScene Code Health Review (main) | CodeScene | the Code Health of the changed code |
| Socket Security: Pull Request Alerts | Socket | any package the pull request adds or changes |

Socket's Project Report, which covers every package already in use, is for information only. A branch doesn't have to be up to date with `main` before it merges.

If one of these services is down, merging waits. The owner can switch the ruleset off in Settings → Rules → Rulesets. CodeScene skips Dependabot branches, so let it analyse them before switching Dependabot on, or its pull requests could never merge.

## GitHub Pages

The game is served straight from the repository: Settings → Pages → Deploy from a branch → `main` / root.
