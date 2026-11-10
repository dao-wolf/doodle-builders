# The hero's house

Where a child feeds their hero, by tracing a letter or a number. Back to the [README](../README.md) or [Developing](developing.md).

From the outposts screen, the **house** button (a picture of a house) opens a meadow, in the season's colours, with the hero in it. It is "Lava's house", "Bob's house", "Mr Henry's house" or "Dragon Fly's house": the name a screen reader says is `Visit Lava's house`, and the words in these docs use it too. It used to be called the den. The code still does (`js/den.js`, `den`, `#den*`), because renaming it would touch every test for no gain. The tracing rules are in `js/trace.js` ([The learning domain](domain.md#tracing)); the tests are `tests/unit/trace.test.js` and `tools/playtest/den_test.py`.

## What a child can do

Every control is a picture, because the players are 2 to 5 and can't read. The hero says the same hello they say when chosen, so the house needs no new voice clips.

| Picture | What happens |
|---|---|
| A big letter or number, shown as a pale path with a dotted line down it and a green start dot | The child puts a finger on the start dot and follows the dots. What they have traced fills in orange. The hero watches the finger |
| A right trace | The path fills in, a snack (an apple, strawberry, cupcake or corn, in turn) flies to the hero's mouth, they munch it in three bites and hop happily, and one of the three parts of the **snack bar** at the top fills |
| Three snacks | The bar is full, the hero does a happy dance, the bar starts again, and a new letter or number comes |
| A finger off the path | Nothing is lost. The path glows so the child sees where to go, and the voice says the letter (its sound if the family recorded it, and its word such as "like sun") or the number. What was traced stays, and the child can carry on from where they left the path, lift and carry on, or start again |
| Tap the hero | They giggle, hop and send up hearts |
| Two arrows | Another letter or number, if this one is hard today |
| T-shirt | A row of costume buttons: the season's costume, none, Halloween, Christmas, Easter. Lava also gets two colour buttons (sunny and lagoon) |
| Arrow | Back to the outposts |

A costume or colour is saved on the device (`S.outfits` per hero, `S.lavaColour`) and shows in every level. With no costume picked, a hero wears the season's costume, as before. Nibblers always wear the season's. When a grown-up sets **Seasonal themes** to Off, no costumes show anywhere and the costume buttons are hidden; a hero with nothing else to choose (everyone but Lava) has no T-shirt button then.

## What is traced

- **Letters** come from the weeks a grown-up chose in the settings, as single letters only: `sh`, `igh` and the other digraphs can't be traced in one go, so they are left out. If the chosen weeks hold only digraphs (Autumn 2, week 4, say), the house uses the single letters taught so far, so there is always something to trace. They are always lower case, formed the way UK phonics lessons teach: round letters start at the top on the right and go anticlockwise, letters with a stem go straight down it first.
- **Numbers** are 1 to the number range in the settings (5 or 10). The 10 is a 1 and then a 0.
- **Game mode** decides which: letters only, numbers only, or both, which take turns. A letter or number isn't asked again within a few turns.

## How a trace is judged

Forgiving for small fingers, and still a real trace. A touch must land near the start dot. The finger must then follow the path, in order, staying within 12 per cent of the shape's size from it (and never less than 28 px, so a small screen is no harder), and cover at least 85 per cent of each stroke. A touch that lands away from the start dot counts for nothing until the finger lifts and tries again. Cutting a corner or scribbling across the shape doesn't count. A letter with more than one stroke (t, x, k and others) is traced a stroke at a time, lifting between them, and the dots of i and j are drawn but not needed. The numbers are in `TRACE_RULES` in `js/trace.js`, and `tests/unit/trace.test.js` checks that every letter and number accepts a wobbly, a fast and a slightly short trace and refuses a scribble, a half trace and a trace from the wrong end.

## Rules the house follows

- **Nothing can go wrong.** No score, no timer, nothing to forget, no hungry or sad hero, and nothing that a child can break. The snack bar never drains: nothing takes a snack back, and it empties only when the hero has danced. A trace that goes wrong loses nothing.
- **Pictures, not words.** Every button has an `aria-label` for grown-ups and screen readers. No words are drawn on the screen, and the hello isn't captioned over the letter.
- **Big targets.** Each button is at least 44 px; `den_test.py` checks it.
- **No zooming, no scrolling.** The same rules as every other screen (`zoom_test.py` visits the house).
- **The house button is in view on a phone held sideways.** In a window up to 600 px tall and wider than it is tall, the four outposts sit in one row (`css/style.css`, next to `.lvls`), so Back and the house button show without scrolling. `den_test.py` checks it at 844 by 390 and 667 by 375.
- **The letter and the buttons fit both ways round.** Held sideways, the letter is on the left, the hero on the right with the snack bar above them, and the buttons in a column on the left. Held upright, the snack bar is at the top, the letter fills the space above the hero, and the buttons are in a row at the bottom. `den_test.py` turns a phone on its side and checks everything stays on screen.
- **Same heroes, same art.** The house draws each hero with their own `LOOKS` entry, so a new hero appears in the house with a row in `DEN_HEIGHT` and `DEN_MOUTH` and nothing else.
- **Light on the phone.** It draws at the same 30 frames a second and pixel budget as the levels, and the trace is a few lines a frame.

## Later: tracing in the build step

The tracing rules in `js/trace.js` don't touch the page, the canvas or the house, so the level's build step could ask for a trace instead of a question. Nothing in `js/game.js` uses them yet. The owner will decide after trying the house with children.

## Backlog: needs discovery first

These came up when the house was first asked for ("look after their character, change costume, play, grow and evolve elements of the character"). Dressing up is built, and so is feeding, now by tracing. The rest each need a decision about what children and grown-ups want before anyone builds them. None is started.

| Idea | What we need to find out |
|---|---|
| **Trace in the build step**, instead of a question | Does tracing teach more than choosing? Is it too slow for the build step? The owner decides after trying the house |
| **Capital letters and digraphs** (sh, ch, igh) to trace | How to trace a digraph in one go, and whether the letter case setting should apply |
| **Grow and evolve** parts of a hero (Lava's comb gets bigger, her tail longer, a new colour of feather; Bob's antenna grows a leaf; Dragon Fly adds a brick) | What makes it grow: snacks, outposts built? How many stages? It must never punish a child for being away. Is it permanent? What does a 2 year old understand of "growing"? |
| **An egg that hatches** into Lava, tied to the Easter look | Should it happen only at Easter, or any time? One egg, or one per hero? |
| **Earn costumes** by filling the snack bar, instead of all being free | Does a reward help or pressure? Do grown-ups want to link the learning to the house, or keep them apart? |
| **Hero-only play**: Lava makes bouncy lava bubbles, Dragon Fly flies loops, Bob sneezes confetti, Mr Henry plays a trumpet-trunk tune | Which would children choose first? Which sounds are gentle? The ball game was taken out because it had no purpose, so what would each of these add? |
| **Favourite snacks** and reactions for each hero | Is it worth the extra drawings? Would a "favourite" make a child feel a wrong snack is a mistake? |
| **Good night**: the house gets dark and quiet, the hero sleeps | Would grown-ups use it as a bedtime step? Is a lullaby wanted? |
| **More colours** for every hero, or a child colouring their own | How many? Does it fit the heroes drawn from a child's own drawing? |
| **Decorate the house** (a rug, flowers, toys) | What can children place without reading or dragging? |
| **Hero lines** spoken in the house ("Yum!", "Wheee!") | Needs new Jenny clips (`tools/voice/add_lines.py`) and a decision on whether a hero should talk at all there |
| **Two heroes at once**, or heroes visiting each other | How would a child choose the second one? |
| **One house per child** (profiles) | Heroes, costumes and progress are saved per device today, so brothers and sisters share them |
| **A grown-ups switch** to hide the house or limit time in it | Do grown-ups want it? What limits are reasonable? |
| **Reduced motion** in the house (fewer hearts and hops) | Check with the system setting and with a child who is sensitive to movement |

## Choices made for this version

These were not all discovered with children and grown-ups; some were the simplest thing that works. Change them if discovery says otherwise.

- **The change from the den (10 Nov 2026).** Trying the first den with children aged 2 to 5, the owner found that "den" was a confusing word and that its play (a ball, and tapping to feed) had no purpose and drew children away from the learning. So it became the hero's house, and feeding became tracing. The ball and plain tapping to feed were taken out. Dressing up, Lava's colours and tapping the hero stayed.
- Three snacks fill the bar. The snack bar isn't saved: it starts empty each time the house opens, because there is nothing a child should have to remember.
- Every costume is open all year, not only in its season, and a chosen costume stays until it is changed. The exception is the grown-ups' **Seasonal themes** setting: with it Off, nobody wears a costume and the costume buttons are hidden (the owner's choice, 8 Nov 2026), because a grown-up who switches the seasons off may be avoiding one on purpose. A pick stays saved and comes back when the setting changes. Lava's colours stay.
- Costumes are chosen per hero.
- Lava has two colours, sunny and lagoon. Sunny is the default.
- The house uses the meadow land and the season's colours.
