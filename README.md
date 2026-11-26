# Sunset Valley — a flight game

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Zoldix/best-flight-game-20261126/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Zoldix/best-flight-game-20261126/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

Entry for the [make.fun competition "Make the best flight game"](https://make.fun/bounty/best-flight-game-20261126-0057) ($500, deadline 28 Nov 2026 07:57 WIB).

A 3D chase-view flight game written in raw WebGL (own shaders, no library, no
network). One sunset valley, three sorties, picked from the mission-select
screen:

1. **Valley Survey** — thread six rings down the valley in order, then land.
2. **Scoop & Drop** — skim the lake low to fill the water tank, drop two loads
   on the forest fire on the west slope, then land.
3. **Medevac** — land on the clearing pad, take the patient aboard, and reach
   the hospital helipad before the 5:00 clock runs out.

Every landing is on the marked runway "27" — centreline dashes, threshold
piano bars, touchdown bars, edge lights — or on a marked pad, slower than
46 KT with a gentle sink, and every touchdown is graded **SMOOTH / FIRM /
MISSED** with a **GOLD / SILVER / BRONZE** medal per sortie. A lake,
a lake, faceted mountains lit warm on the sun side and cool in shade, a
gradient sunset sky.

## How to play

- **1 / 2 / 3 or click** — pick a sortie · **Enter** — fly it · **R** — fly again
- **W / ↑** climb · **S / ↓** dive · **A / D** bank and turn
- **Shift / C** — throttle up / down · **mouse** — steer
- Finish the sortie's job, land under 46 KT with a gentle sink, earn the medal

The HUD shows altitude, vertical speed, airspeed, heading, throttle, fuel and
damage bars, gear and flap state, low-fuel and stall warnings, an artificial
horizon, a north-up minimap (rings, lake, fire, pads, runway), and a
mission panel that briefs the current stage. Sound is synthesized live
(engine hum, chime) — no audio files.

## Run it

Open `game/index.html` in desktop Chrome (or serve `game/` statically).
`node serve.ts` serves the entry locally; `node main.ts` writes `game/`,
`screenshots/` and `dossier.json` to the output directory — deterministically:
fixed timestep, seeded world generation, no `Date.now()` or free
`Math.random()` in the game, so two runs write the same bytes.

Screenshots are real renders of this code (Playwright, headless Chromium,
WebGL via SwiftShader), taken with the seeded demo scenes in `shots.json`.

MIT licensed. Original idea, art, sound and names.
