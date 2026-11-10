`jenny.json` is the built-in voice. Put your exported voice pack here as `my-voice.json` and the game will use it on every device (your recordings play first; Jenny fills any gaps).

## Listening before merging

A clip that speech recognition hears correctly can still sound like other words to a person (the old "Cluck, cluck! I'm Lava!" did). So a pull request that changes `jenny.json` cannot merge until a person has listened to every new or changed clip.

- The **Voice listened** check (`.github/workflows/voice-listened.yml`) fails on any pull request that changes `voice/jenny.json` unless the pull request has the `voice-listened` label. It passes at once on pull requests that don't touch the file.
- Add the label only after listening to each new or changed clip in the game or in a player. It runs again when a label is added or removed.
- If a later push changes `jenny.json` again, the check takes the label off and fails, so the new clips are listened to too. A push that leaves the file alone keeps the label.
- A pull request from a fork can't have its label removed automatically (the workflow's token is read-only there), so a maintainer takes it off by hand.
- The check only counts the label: it can't tell whether the listening happened. The label is the owner's to add.
