# Doodle Builders

A learning game that grows with children: numbers, letters and phonics first (ages 2 to 5, Reception), with more subjects to come as they move up through school. The heroes are children's own doodles.

The first adventure is **Bob's Outpost**.

Play as **Bob** (sneezes Nibblers away) or **Mr Henry** (trumps them away). Walk through the land answering questions to collect the pieces of an outpost, keep the Nibblers off them, then build the outpost at the end. There are four outposts: Hilltop Hut, Treehouse, Lighthouse and Snow Castle.

- **Letters and sounds** follow the Little Wandle Letters and Sounds Revised Reception order (Autumn 1 to Spring 1). Grown-ups choose which weeks to practise.
- **Numbers**: find the number (1 to 5 or 1 to 10) and count gems.
- **Difficulty**: Easy, Medium and Hard change how many Nibblers come and whether they can steal pieces.
- **Movement**: "I steer" (arrow buttons, arrow keys or tap the ground) or "Walks by itself".
- **Voice**: your own recordings first, then the built-in Jenny voice, then the device's voice.

It is a static website: plain HTML, CSS and JavaScript with no build step and no dependencies.

## Play it on your computer

Browsers block some features when a page is opened straight from a file, so serve the folder:

```bash
cd doodle-builders
python3 -m http.server 8000
```

Then open <http://localhost:8000>. The microphone works on `localhost`, so you can record your voice here too.

## Put it on GitHub and GitHub Pages

```bash
cd doodle-builders
git init
git add .
git commit -m "Doodle Builders"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/doodle-builders.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root → Save**. After a minute the game is live at `https://YOUR-NAME.github.io/doodle-builders/`. It works on phones and tablets too ("Add to Home Screen" makes it feel like an app).

## Record your own voice

Text-to-speech cannot say pure phonics sounds properly, so the best voice for teaching is yours.

1. Open the game from GitHub Pages or `localhost` (the microphone is blocked inside the Claude app viewer).
2. On the start screen, **press and hold "Grown-ups"**, then **Open voice studio**.
3. Pick a clip and press **RECORD**. Recording stops by itself when you stop talking; silence is trimmed and the volume is evened out. Press **Play** to check it, then **Next**.
4. Start with the **Sounds** tab: they are the ones children copy. Words, Numbers and Bob's lines are optional; anything you don't record is said by Jenny.
5. Press **Export voice pack** to save `my-voice.json`, put it in the `voice/` folder, then commit and push. Your voice now plays on every device that opens the game.

You can also **Upload a file** for any clip (for example a voice memo recorded on your phone) and **Import voice pack** to load a pack onto another device. Recordings made in the studio are kept in that browser until you export them.

Tips for pure sounds: say `s`, `m`, `f` and other stretchy sounds as a held "sss" or "mmm"; keep bouncy sounds like `t`, `p`, `b` short with no "uh" after them. Little Wandle's free "How to say the sounds" videos for parents show each one: <https://www.littlewandle.org.uk/resources/for-parents/>.

## Grown-up settings

On the start screen, press and hold **Grown-ups**. During a game, press and hold the **gear** button (the game pauses). Settings are saved on the device:

| Setting | Options |
|---|---|
| Game | Letters & sounds, Numbers, Both |
| Movement | I steer (arrows), Walks by itself |
| Difficulty | Easy, Medium, Hard |
| Phonics sounds | Little Wandle Reception weeks to practise |
| Letters shown as | lowercase, UPPERCASE, Both |
| Numbers | 1 to 5, 1 to 10 |
| Voice | Natural (Jenny) or Device voice, plus "Use my own recordings first" |
| Outposts | Unlock all, or start again from outpost 1 |

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
voice/jenny.json      the built-in voice (Piper "Jenny (Dioco)"), one base64 MP3 per clip
voice/my-voice.json   your voice pack, if you add one (optional)
tools/voice/          scripts that made jenny.json
tools/playtest/       automated playthrough and voice studio tests
```

Every line the game says is listed in `TEXT` in `js/content.js`. Each key is one clip: `s_*` are pure sounds, `w_*` example words, `n1` to `n10` numbers, and the rest are Bob's lines. The outposts are block lists in `LEVELS` (same file), so new outposts can be added there.

## Testing

```bash
pip install -r tools/playtest/requirements.txt
playwright install chromium
python tools/playtest/playtest.py              # robot plays four scenarios (phone and desktop, all difficulties)
python tools/playtest/studio_test.py           # voice studio with a pretend microphone
```

`index.html?speed=2` runs the game faster, which is handy for testing.

## Credits and licences

- Bob and Mr Henry come from a child's sketch-pad drawings.
- Built-in voice: **Jenny (Dioco)**, made with [Piper](https://github.com/rhasspy/piper). The Jenny dataset licence requires the attribution "Jenny (Dioco)" wherever the voice is used, and allows commercial use: <https://github.com/dioco-group/jenny-tts-dataset>.
- Fonts: Andika and Silkscreen from Google Fonts (SIL Open Font License), loaded from Google's servers.
- Not affiliated with or endorsed by Little Wandle Letters and Sounds Revised. The teaching order follows their published Reception overview; no Little Wandle materials, audio or images are included.
- Choose a licence for your own code before publishing (for example MIT) and add it as `LICENSE`.
