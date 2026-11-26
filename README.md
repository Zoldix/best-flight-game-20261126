# Sunset Valley — a flight game

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Zoldix/best-flight-game-20261126/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Zoldix/best-flight-game-20261126/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

Entry for the [make.fun competition "Make the best flight game"](https://make.fun/bounty/best-flight-game-20261126-0057) ($500, deadline 28 Nov 2026 07:57 WIB).

A 3D chase-view flight game written in raw WebGL (own shaders, no library, no
network). Fly a prop plane built from parts down a sunset valley: thread six
rings in order, watch fuel burn and damage, then land on the marked runway
"27" — centreline dashes, threshold piano bars, touchdown bars, edge lights —
slower than 46 KT with a gentle sink. A winding river, a lake, faceted
mountains lit warm on the sun side and cool in shade, a gradient sunset sky.

## How to play

- **Enter** — start the sortie · **R** — fly again
- **W / ↑** climb · **S / ↓** dive · **A / D** bank and turn
- **Shift / C** — throttle up / down · **mouse** — steer
- Land with all 6 rings, under 46 KT, gentle sink, for the best score

The HUD shows altitude, vertical speed, airspeed, heading, throttle, fuel,
damage, an artificial horizon, and a mission panel with the next ring and the
runway distance. Title screen, sortie results, and crash/landing screens are
all in the game. Sound is synthesized live (engine hum, ring chime) — no audio
files.

## Run it

Open `game/index.html` in desktop Chrome (or serve `game/` statically).
`node serve.ts` serves the entry locally; `node main.ts` writes `game/`,
`screenshots/` and `dossier.json` to the output directory — deterministically:
fixed timestep, seeded world generation, no `Date.now()` or free
`Math.random()` in the game, so two runs write the same bytes.

Screenshots are real renders of this code (Playwright, headless Chromium,
WebGL via SwiftShader), taken with the seeded demo scenes in `shots.json`.

MIT licensed. Original idea, art, sound and names.
