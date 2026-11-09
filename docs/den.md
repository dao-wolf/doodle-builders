# The den

Where a child looks after their hero. Back to the [README](../README.md) or [Developing](developing.md).

From the outposts screen, the **Den** button opens a meadow (in the season's colours) with the hero in it. The code is `js/den.js`; the tests are `tools/playtest/den_test.py`.

## What a child can do

Every control is a picture, because the players are 2 to 5 and can't read. The hero says the same hello they say when chosen, so the den needs no new voice clips.

| Picture | What happens |
|---|---|
| Tap the hero | They giggle, hop and send up hearts |
| Apple | A snack (an apple, strawberry, cupcake or corn, in turn) drops to the hero's mouth, they munch it in three bites, then hop happily |
| Ball | A ball bounces about. The hero nudges it back and bounces it off their head; a tap on the ball kicks it. Tap the picture again to put it away |
| T-shirt | A row of costume buttons: the season's costume, none, Halloween, Christmas, Easter. Lava also gets two colour buttons (sunny and lagoon) |
| Arrow | Back to the outposts |

A costume or colour is saved on the device (`S.outfits` per hero, `S.lavaColour`) and shows in every level. With no costume picked, a hero wears the season's costume, as before. Nibblers always wear the season's. When a grown-up sets **Seasonal themes** to Off, no costumes show anywhere and the costume buttons are hidden; a hero with nothing else to choose (everyone but Lava) has no T-shirt button then.

## Rules the den follows

- **Nothing can go wrong.** No score, no timer, nothing to forget, no hungry or sad hero, and nothing that a child can break.
- **Pictures, not words.** Every button has an `aria-label` for grown-ups and screen readers.
- **Big targets.** Each button is at least 44 px; `den_test.py` checks it.
- **No zooming, no scrolling.** The same rules as every other screen (`zoom_test.py` visits the den).
- **The Den button is in view on a phone held sideways.** In a window up to 600 px tall and wider than it is tall, the four outposts sit in one row (`css/style.css`, next to `.lvls`), so Back and Den show without scrolling. `den_test.py` checks it at 844 by 390 and 667 by 375.
- **Same heroes, same art.** The den draws each hero with their own `LOOKS` entry, so a new hero appears in the den with a row in `DEN_HEIGHT` and `DEN_MOUTH` and nothing else.

## Backlog: needs discovery first

These came up when the den was first asked for ("look after their character, change costume, play, grow and evolve elements of the character"). The first four are built. The rest each need a decision about what children and grown-ups want before anyone builds them. None is started.

| Idea | What we need to find out |
|---|---|
| **Grow and evolve** parts of a hero (Lava's comb gets bigger, her tail longer, a new colour of feather; Bob's antenna grows a leaf; Dragon Fly adds a brick) | What makes it grow: time, care, outposts built? How many stages? It must never punish a child for being away. Is it permanent? What does a 2 year old understand of "growing"? |
| **An egg that hatches** into Lava, tied to the Easter look | Should it happen only at Easter, or any time? One egg, or one per hero? |
| **Earn costumes** by building outposts, instead of all being free | Does a reward help or pressure? Do grown-ups want to link the learning to the den, or keep them apart? |
| **Hero-only play**: Lava makes bouncy lava bubbles, Dragon Fly flies loops, Bob sneezes confetti, Mr Henry plays a trumpet-trunk tune | Which would children choose first? Which sounds are gentle? |
| **Favourite snacks** and reactions for each hero | Is it worth the extra drawings? Would a "favourite" make a child feel a wrong snack is a mistake? |
| **Good night**: the den gets dark and quiet, the hero sleeps | Would grown-ups use it as a bedtime step? Is a lullaby wanted? |
| **More colours** for every hero, or a child colouring their own | How many? Does it fit the heroes drawn from a child's own drawing? |
| **Decorate the den** (a rug, flowers, toys) | What can children place without reading or dragging? |
| **Hero lines** spoken in the den ("Yum!", "Wheee!") | Needs new Jenny clips (`tools/voice/add_lines.py`) and a decision on whether a hero should talk at all there |
| **Two heroes at once**, or heroes visiting each other | How would a child choose the second one? |
| **One den per child** (profiles) | Heroes, costumes and progress are saved per device today, so brothers and sisters share them |
| **A grown-ups switch** to hide the den or limit time in it | Do grown-ups want it? What limits are reasonable? |
| **Reduced motion** in the den (fewer hearts and hops) | Check with the system setting and with a child who is sensitive to movement |

## Choices made for the first version

These were not discovered with children and grown-ups; they were the simplest thing that works. Change them if discovery says otherwise.

- Every costume is open all year, not only in its season, and a chosen costume stays until it is changed. The exception is the grown-ups' **Seasonal themes** setting: with it Off, nobody wears a costume and the costume buttons are hidden (the owner's choice, 8 Nov 2026), because a grown-up who switches the seasons off may be avoiding one on purpose. A pick stays saved and comes back when the setting changes. Lava's colours stay.
- Costumes are chosen per hero.
- Lava has two colours, sunny and lagoon. Sunny is the default.
- The den uses the meadow land and the season's colours.
