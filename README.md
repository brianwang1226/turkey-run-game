# Pardon Run — turkey-run-game-01

A side-scrolling runner: a turkey escapes Thanksgiving dinner, 2,400 m from
the farmyard through the orchard to the kitchen, with the farmer and his
pitchfork right behind it.

## Play

- `node serve.ts`, then open http://localhost:8080
- Space / Up / W: jump. Down / S: slide. P or Esc: pause. Click also starts.
- Jump the fences, hay bales and ovens; slide under the carving knives and
  meat hooks. Corn is +10, a golden feather +25, a gravy boat +15 and one
  life back. Three lives; each hit lets the farmer close in, the third hit
  ends the run caught. Reach 2,400 m and the turkey is pardoned.

## Files

- `main.ts` — the hand-in program (Node 22, standard library only): copies
  `game/` and `screenshots/` to the output directory and writes
  `dossier.json` with the vendored make.fun library.
- `serve.ts` — a tiny static server for local play (the kit's own).
- `game/index.html` — the page; `game/src/` is the game, plain ES modules:
  - `config.js` — every tuning number and colour
  - `world.js` — the rules and state, no drawing, no browser in it
  - `render.js` — all drawing, canvas shapes only, no image files
  - `input.js` — keyboard and pointer
  - `audio.js` — WebAudio sound effects, generated, no audio files
  - `shots.js` — staged scenes for the screenshots (an autopilot plays the
    real rules forward, so each frame is a frame the game produced)
  - `main.js` — the fixed-step loop, screens, best score
- `shots.json` — the four staged screenshots and their URLs.
- `vendor/makefun-game.ts` — the kit's library, copied unchanged.

## Screenshots

`?shot=start|play|kitchen|end&seed=1`, 1280×720 each, each at most 256 KiB.
Every shot is a real render of the game's own code: the autopilot in
`shots.js` plays the rules forward with seed 1, so the same URL always gives
the same frame.

## Playtesting (headless, Node)

The world has no browser in it, so it can be played by an autopilot in Node:
good play (react 0.35 s before an obstacle) escapes on 8/8 seeds with 0 hits;
a human-like player (0.30 s reaction, ±0.08 s jitter, 5% missed obstacles)
escapes 5/12 runs and gets caught on 7/12; doing nothing gets caught in
about 11 seconds. A full run takes about 2 minutes.
