# For grown-ups

How to change the game's settings and record your own voice. Back to the [README](../README.md).

## Settings

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

## Record your own voice

Text-to-speech cannot say pure phonics sounds properly, so the best voice for teaching is yours.

1. Open the game from GitHub Pages or `localhost` (see [Developing](developing.md#run-it-on-your-computer)). The microphone is blocked inside the Claude app viewer.
2. On the start screen, **press and hold "Grown-ups"**, then **Open voice studio**.
3. Pick a clip and press **RECORD**. Recording stops by itself when you stop talking; silence is trimmed and the volume is evened out. Press **Play** to check it, then **Next**.
4. Start with the **Sounds** tab: they are the ones children copy. Words, Numbers and Bob's lines are optional; anything you don't record is said by Jenny.
5. Press **Export voice pack** to save `my-voice.json`, put it in the `voice/` folder, then commit and push. Your voice now plays on every device that opens the game.

You can also **Upload a file** for any clip (for example a voice memo recorded on your phone) and **Import voice pack** to load a pack onto another device. Recordings made in the studio are kept in that browser until you export them.

Tips for pure sounds: say `s`, `m`, `f` and other stretchy sounds as a held "sss" or "mmm"; keep bouncy sounds like `t`, `p`, `b` short with no "uh" after them. Little Wandle's free "How to say the sounds" videos for parents show each one: <https://www.littlewandle.org.uk/resources/for-parents/>.
