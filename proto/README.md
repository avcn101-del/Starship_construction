# Feel prototype on the L5d kernel (throwaway)

A rough page to judge how a battle feels on the phone (`DESIGN.md` §13h,
§13j, §13n.1 (d); decisions #217, #224, #233, #237, #301 (5)). Since
`feel-6` the battle is **the kernel's own symmetric loop** (`js/battle.js`
`createBattle` / `tick`), set up exactly as `tools/duel.js`'s `createDuel`:
both ships **R1d-A** (R1d with the hold's antenna, `mission0/targets.js`),
knowledge on, you are side A on the kernel's helm (`js/helm.js`) starting on
the preset Fire, the enemy is side T, `js/enemy.js` at personality 0.5 each
(the standard enemy). The page adds no loop, no autopilot, no script and no
game number of its own; it only drives the kernel through its inputs and
reads its state, and it **never counts as a Mission 0 result**.

## Run it

From the repository root:

```
python3 -m http.server 8000
```

then open `http://localhost:8000/proto/` (on a phone on the same network,
use the computer's address). Not `file://`: ES modules need a server.
Hold the phone in landscape.

Kernel imports in `proto/` use two prefixes: `../js/` and
`../mission0/targets.js` (the ships' blueprints, `tools/duel.js`'s own
source). To publish the page elsewhere, copy `js/` and `mission0/targets.js`
beside `proto/` or rewrite those two prefixes.

## Loadout panel

Shown before each battle and from **Restart**. Both ships are R1d-A; the
levers that meant something only on the old loop (magazine, layout, turrets,
the range / facing / dodge orders) are gone: the kernel's presets carry the
orders now. What is left:

- **Seed** (first battle: 1): the battle's seeded stream (`js/util.js`); it
  draws the enemy's dodge and strafe intervals (`js/helm.js`). Restart adds
  1; type another to replay a battle. (In the duels measured below the
  enemy never leaves Fire, so no draw happens and every seed gives the same
  battle.)
- **Shield budget**: 10 MW (default, `js/data.js`), 5 or 20 MW: a run-time
  override of `shield.budget` (approved 2–40 MW), on both ships.
- **Hits to wreck**: 3 (default) or 5: a run-time override of
  `kinetic.hitsToWreck` (approved 1–8), on both ships.

`config.js` `overridesOf` refuses a value outside its approved range.
`PROTO_VERSION` is `feel-6`, shown at the right of the top bar.

## Play: the three verbs

Each verb is pushed to the kernel's inputs `{ t, verb, arg }` (side A) at
the step it is made and applies before the next step, exactly as
`tools/play.mjs` does, so a played battle replays from its seed and inputs.

- **Scan a zone**: tap the enemy's grid anywhere that is not a known room
  (an unknown cell or empty space) and your antenna scans the zone under the
  tap (`setScan`, zone 0–5). **Scan** in the top bar, then a tap, scans the
  zone under the tap even on a known room (a re-scan). While you give no
  scan, Fire's and Evade's auto-scan slot picks the nearest unresolved zone.
- **Target a known room**: tap a room your model knows. The helm keeps it
  while the model knows a standing cell of it; otherwise the preset's
  priority picks (`chooseTarget`).
- **Switch preset**: **Fire**, **Cool**, **Evade** (`js/data.js` `PRESETS`:
  the twelve slots and a throttle 0.5 / 0 / 1).
- **×1 ×2 ×4**: time; **Pause**; **Restart** (back to the panel, seed + 1);
  **Export**.

The battle ends by the kernel's rules (`js/battle.js` `checkEnd`):
destroyed (a reactor explodes, or the largest piece holds under
`battle.wreckFraction` of the mass), Disabled (no able weapon for
`battle.disabledSeconds`), the enemy's surrender or escape. The end panel
gives the time, each side's crew lost, rooms wrecked and shots / hits /
misses, and for each side that ended **why**: the cascade tree from the
kernel's events (#41, #264), the root, then each event it caused, indented;
the red row is the event the end names as its parent. The end panel is the
debrief: it is the one place the page reads the enemy's own log, and only
once the battle is over.

## Read the view: you from your world, the enemy from your model

- **Your grid** (left, facing right) is your own world: each room's colour
  is its temperature against its own thresholds (dark blue at rest, green
  toward hot, yellow at hot, red at overheated, white toward critical); a
  darker cell has lost integrity (thin red frame); a destroyed cell is
  black with a red cross; `!` after a label: shut down; a grey outline: the
  room has lost control; the cyan oval is your shield. A white arrow shows
  where a round entered your hull in the last 1.5 s. Above: your preset
  ("holding fire" while the helm holds), the target your helm holds, its
  mode and the engine's throttle. Below: each weapon able or why not
  (`weaponStates`), crew, the heat fraction and the buffer fraction
  (`js/helm.js`), your shield; a red countdown while Disabled looms.
- **The enemy's grid** (right, facing left) is **your knowledge model**
  (`js/sensors.js`), the same information `tools/play.mjs`'s `modelText`
  prints: the six zones (dashed; a resolved one green with the time it
  resolved), the silhouette's standing cells (grey: unknown), the cells a
  scan revealed (in their room's IR class once its panels are resolved,
  else dim; their integrity as of the scan), a known cell the silhouette no
  longer shows (crossed), each known room's outline with its type and its IR
  class or the time of its scan. Your antenna's zone has a green frame and a
  progress bar; your target is in yellow dashes (a ring at a zone centre
  while the target is a point). A white ring marks where your round entered
  (your model's hits), with the known cells it crossed framed. Above and
  below: zones resolved, rooms known, the silhouette's cells and bodies, the
  sources resolved now. The enemy's true layout, its orders, its target and
  its rounds in flight are never drawn.
- **World strip** (top): your ship from your world and the enemy's
  silhouette on its poses, to scale, the line of sight pointing right; a
  yellow line shows each velocity against the midpoint's as 5 s of travel
  (the enemy's as your helm observes it from the silhouette); a white tick
  marks your bow. Your rounds in flight are white dots with a tail. Your beam
  is magenta to its entry on the enemy's hull, grey dashes when its line
  crosses nothing; the enemy's beam is drawn only where it lands on your hull
  (magenta past your shield, cyan when your shield takes all). Top right: the
  range and how fast it opens or closes; bottom: your shots, hits, misses,
  rounds in flight and hits taken.
- **The log** (right) lists your own ship's events (its log holds your
  scans, the zones and sources you resolved and everything that hit you),
  your verbs, and your hits from your model: time, side, room, event,
  cause, crew aboard after it. Shots are drawn, not logged.

## Export and replay

- **Export** (top bar during a battle, and on the end panel) pauses the
  battle and builds one line of JSON: the version, the seed, the overrides,
  the inputs `[{ t, verb, arg }]`, the step and time, the end line, the
  kernel's battle hash (`battleHash`), the shot books per side and the
  `tools/duel.js` **replay line** (`replayLine`, mirrored in
  `proto/duel.js` because `tools/duel.js` imports `node:fs`). It copies the
  text to the clipboard and says "copied"; if the phone refuses, the text
  stays selected in a box to copy by hand. **Close** resumes.
- `node proto/replay.mjs <file.json> [--log]` rebuilds the battle with
  `tools/duel.js`'s `createDuel` from the export's seed, overrides and
  inputs, runs it to the exported step (or its end) and prints the hash and
  the end; with the replay line equal to `tools/duel.js`'s `replayLine` of
  the same inputs it prints **MATCH** (exit 0), else **MISMATCH** (exit 1).
  `--log` also prints the kernel's per-second log and both cascade trees.
  The replay line itself, run from the repository root, prints the same
  hash and end. Text around the JSON is ignored.
- Bump `PROTO_VERSION` whenever `proto/` or `js/` changes what a battle
  does: replay warns when the export's version differs.

## Tools

- `node proto/measure.mjs [--seeds N] [--first S] [--limit s] [--inputs <json>]`:
  duels headless on `createDuel` (default seeds 1–10, no inputs); prints per
  duel the end, each side's shots / hits / misses, the time of flight of the
  rounds that hit, how far each target's centre of mass moved across the line
  of sight during a flight beyond the constant-velocity lead, and the
  target hull's smallest half-extent across the line of sight. It reads the
  true state (a tool, not the page).
- `NODE_PATH=/opt/node-tools/node_modules node proto/smoke.mjs`: Playwright
  at 844 × 390 with touch; checks `PROTO_VERSION` on the page and seed 1 on
  the panel, computes the determinism duel (`proto/duel.js` `duelHash`) in
  Chromium against `tools/determinism.mjs` in Node (MATCH), chooses 20 MW and
  seed 41 and starts, uses each verb once through the page (Scan then a tap
  on zone 2; a tap on a room the model knows; Evade), runs ×4 to the end or 6
  simulated minutes with an Export from the top bar at 12 s, exports again at
  the end, runs `replay.mjs` on both exports (each must MATCH), and checks
  Restart brings the panel back with seed 42; fails on any console error, a
  visible button under 44 px, a verb that did not reach the inputs or a
  MISMATCH; writes `proto/screens/loadout.png`, `start.png`, `export.png`,
  `end.png` and `restart.png`.
- `proto/duel.js` `duelHash()` is the duel of `L0.determinism.v2`:
  `createDuel({ seed: 7, inputs: [{ t: 0, verb: 'preset', arg: 'evade' }] })`
  run for 60 s (it ends at 36.5 s, A destroyed), the hash of every event and
  every body's final state; `tools/determinism.mjs [--chromium]` prints it.

## Files

`index.html`, `proto.css`, `proto.js` (the page), `battle.js` (the page's
battle on the kernel: verbs, shot books, losses, the end tree; no DOM),
`duel.js` (`createDuel`, `replayLine`, `endLine` mirrored from
`tools/duel.js`, and the determinism duel; no DOM), `export.js` (the
export; no DOM), `config.js` (every prototype setting), `measure.mjs`,
`replay.mjs`, `smoke.mjs`, `screens/`.
