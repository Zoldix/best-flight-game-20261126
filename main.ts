// Sunset Valley — entry program (Node 22, standard library only).
//
// The game is this directory's game/ folder: a 3D chase-view flight game in raw
// WebGL (own shaders, no library, no network request) that a desktop browser
// plays offline from game/index.html. This program hands it in: it copies game/
// and screenshots/ from beside this file to the output directory and writes
// dossier.json there, the summary the judge reads, with the vendored make.fun
// library. Before copying, it verifies the hand-in is shaped the way the
// scorer expects — the four seeded screenshots present, each under the size
// cap, and the game folder inside its file-count cap — so a malformed entry
// fails here, loudly, instead of at the gate.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// --- Sunset Valley hand-in checks -------------------------------------------------
// The screenshots are the judge's first contact with the game, so their shape is
// verified, not assumed: exactly the seeded scenes from shots.json, PNG, and
// each one no larger than the 256 KiB the gate allows. The game folder must
// stay a plain static site: at most 993 files, every path short enough for the
// intake, and an index.html at its root that the browser opens directly.
const SHOT_NAMES = ['1-cover.png', '2-menu.png', '3-fire.png', '4-results.png'];
const SHOT_MAX_BYTES = 262144;
const GAME_MAX_FILES = 993;

function verifyHandIn() {
  const shotsDir = join(here, 'screenshots');
  for (const name of SHOT_NAMES) {
    const file = join(shotsDir, name);
    if (!existsSync(file)) throw new Error(`missing screenshot: screenshots/${name}`);
    const size = statSync(file).size;
    if (size > SHOT_MAX_BYTES) throw new Error(`screenshot ${name} is ${size} bytes, over the ${SHOT_MAX_BYTES} cap`);
  }
  const gameDir = join(here, 'game');
  if (!existsSync(join(gameDir, 'index.html'))) throw new Error('game/index.html is missing');
  let files = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(dir, entry.name));
      else files += 1;
    }
  };
  walk(gameDir);
  if (files > GAME_MAX_FILES) throw new Error(`game/ holds ${files} files, over the ${GAME_MAX_FILES} cap`);
  return { shots: SHOT_NAMES.length, gameFiles: files };
}

const handIn = verifyHandIn();
console.log(`sunset-valley: hand-in verified (${handIn.shots} screenshots, ${handIn.gameFiles} game files)`);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
