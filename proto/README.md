# Feel prototype: the battle phases (throwaway)

A rough page to judge how the battle phases feel on the phone (`DESIGN.md`
§13n.12; decisions #217, #365, #366, #367). The battle is **the kernel's own
symmetric loop** (`js/battle.js` `createBattle` / `tick`) on the locked
builds of `mission0/builds.js`. **Both ships are flown by `js/enemy.js` at
the standard personality** (0.5 each): the captain picks Fire, Cool or Evade
itself every `enemy.decisionInterval`, aims, scans and targets. You are side
A. Your decisions are **menu entries** over the captain, plus two verbs
(scan, target). The phases are emulated between ticks by `proto/phases.js`.
The page adds no game number of its own; it only writes the kernel's inputs
and the state the kernel reads (`helm.override`, the captain's patience),
and it **never counts as a Mission 0 result**.

## Run it

From the repository root:

```
python3 -m http.server 8000
```

then open `http://localhost:8000/proto/` (on a phone on the same network,
use the computer's address). Not `file://`: ES modules need a server.
Hold the phone in landscape.

Kernel imports in `proto/` use these prefixes: `../js/`,
`../mission0/targets.js` and `../mission0/builds.js` (the locked builds).
To publish the page elsewhere, copy `js/` and those two `mission0/` files
beside `proto/`, or rewrite the prefixes. `mission0/builds.js` ends with a
Node-only check that reads `process.argv`; `index.html` defines a stub
`window.process` so it loads in the browser.

## The battle panel

Shown before each battle and from **Restart**:

- **Your build** and **Enemy build**: R2, Lance, Swarm or Furnace.
- **Opening distance**: `helm.rangeOpen` (1500 m, the default) or
  `helm.rangeHold` (900 m), both from `js/data.js`. `battle.cullDistance`
  becomes twice the opening when that is above its default (a run-time
  override, #318; it never is at these two openings).
- **Aspect**: bow on (the ships face each other) or broadside (both side
  on).
- **Decision points**: **Pause** (the default: the battle waits for your
  choice, with no timer) or **Auto, no pause** (the automatic choice applies
  at once, and you may change it from the menu at any time).
- **Seed** (first battle: 1). It draws the dodge intervals of both captains
  (`js/helm.js`). Restart adds 1; type another seed to replay a battle.

`PROTO_VERSION` is `phases-1`, shown at the right of the top bar.

## The phases

Each side judges its own phase from its own knowledge model and its own
log (#346). The enemy runs the same phases and always takes the automatic
choices.

1. **Contact.** Every side starts on **Stand off** (range open), weapons
   held. The page sets the captain's patience to the kernel's zone count
   (#367 (1)), so `js/enemy.js` keeps the hold until the side's model
   resolves **every zone** of the other ship. Contact also ends when the side
   has **no antenna standing** (each one ruined or its cell destroyed), or
   when **its own ship takes a `cell-damaged` event**. At those two exits the
   page sets the patience to 0, and the kernel's own step releases the hold.
   Choosing another entry from the menu during contact also leaves contact,
   with weapons free.
2. **Decision point 1**, at contact's exit. You may take any entry of your
   build's menu. Stand off now means weapons free. The automatic choice is
   your build's first position entry.
3. **Position / finish.** You move between entries at any time from the menu
   (right panel). Close in is the finish.
4. **Decision point 2 (a reversal).** It comes the first time your ship takes
   a `cell-damaged` event after you took an attack entry (one with a role,
   position or finish). The choices are stay, Stand off (weapons free) or
   Break off; the automatic choice is stay. Staying does not re-arm it:
   another reversal needs another attack entry first.

## The menu (`js/data.js` `MENUS`)

Each entry is a set of slot values written into the side's
`helm.override`, over the captain's own override (its personality's range
and open-fire rule). It holds through the captain's preset switches. Every
build has **Stand off** and **Break off** (range disengage). Each build's own
entries, in the order of §13n.12's table:

- **R2**: Turret line, Close in.
- **Lance**: Rail line, Close in.
- **Swarm**: Missile screen, Close in.
- **Furnace**: Beam line, Close in, Evade.

Each entry carries one line of text, shown under the readout and on the
decision panel.

## Play: the menu and two verbs

There are no preset buttons: the captain re-picks its preset every second,
so a preset verb would not hold (#367 (2)). The readout names the captain's
current preset.

- **A menu entry**: tap it in the right panel, or on the decision panel.
  It is recorded with its battle step and applied before the next step.
- **Scan a zone**: tap the enemy's grid anywhere that is not a known room
  (an unknown cell or empty space), and your antenna scans the zone under the
  tap (`setScan`, zone 0–5). **Scan** in the top bar, then a tap, scans the
  zone under the tap even on a known room (a re-scan).
- **Target a known room**: tap a room your model knows. The helm keeps it
  while the model knows a standing cell of it; otherwise the captain picks.
- **×1 ×2 ×4**: time. **Pause**, **Restart** (back to the panel, seed + 1),
  **Export**.

**The phase readout** (right panel, under the menu):
- `YOU`: your phase (contact, stand-off, break-off, position, finish, or a
  decision), your entry, and "weapons held" while the kernel holds.
- `ENEMY`: only what your model and your own log can tell you. That is
  whether it has hit you yet, and whether the range is opening or closing,
  from its silhouette. Its phase and its entry are never shown.
- Then your entry's line, or for a few seconds the note of an automatic
  decision.

The battle ends by the kernel's rules (`js/battle.js` `checkEnd`):
destroyed (a reactor explodes, or the largest piece holds under
`battle.wreckFraction` of the mass), Disabled (no able weapon for
`battle.disabledSeconds`), a surrender or an escape. The end panel gives the
time, each side's crew lost, rooms wrecked and shots / hits / misses. For
each side that ended, it shows **why**: the cascade tree from the kernel's
events (#41, #264).

## Read the view: you from your world, the enemy from your model

- **Your grid** (left, facing right) is your own world: each room's colour
  is its temperature against its own thresholds (dark blue at rest, green
  toward hot, yellow at hot, red at overheated, white toward critical); a
  darker cell has lost integrity (thin red frame); a destroyed cell is
  black with a red cross; `!` after a label: shut down; a grey outline: the
  room has lost control; the cyan oval is your shield. A white arrow shows
  where a round entered your hull in the last 1.5 s. Above: your menu
  entry and the captain's preset ("holding fire" while the helm holds), the target your helm holds, its
  mode and the engine's throttle. Below: each weapon able or why not
  (`weaponStates`), crew, the heat fraction and the buffer fraction
  (`js/helm.js`), your shield; a red countdown while Disabled looms.
- **The enemy's grid** (right, facing left) is **your knowledge model**
  (`js/sensors.js`), the same information `tools/play.mjs`'s `modelText`
  prints: the zones (dashed; a resolved one green with the time it
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

- **Export** (in the top bar during a battle, and on the end panel) pauses
  the battle and builds one line of JSON. It holds the version, the setup
  (builds, opening, aspect, seed, pause), the menu choices `[{ step, entry }]`,
  the verbs `[{ t, step, verb, arg }]`, the step and time, the end line, the
  kernel's battle hash (`battleHash`) and the shot books per side. It copies
  the text to the clipboard; if the phone refuses, the text stays selected in
  a box to copy by hand. **Close** resumes.
- `node proto/replay.mjs <file.json> [--log]` rebuilds the battle with
  `proto/phases.js` `replayPhases` from the setup, the choices (each applied
  at its step, before that step's tick) and the verbs. It runs to the
  exported step (or the end), then prints the hash and the end: **MATCH**
  (exit 0) when both equal the export's, else **MISMATCH** (exit 1).
  `--log` also prints the kernel's per-second log, both cascade trees and
  each side's entries. `tools/duel.js` cannot carry the choices or the
  captain on side A, so a phases export has no `tools/duel.js` line. An
  older `feel-6` export still replays through `tools/duel.js`.
- Bump `PROTO_VERSION` whenever `proto/` or `js/` changes what a battle
  does: replay warns when the export's version differs.

## Tools

- `node proto/play.mjs <player> <enemy> [--opening ...] [--aspect ...] [--seed n] [--limit s] [--out file]`:
  plays one battle headless on the page's modules, as a player would with
  the pause setting on: scan zone 2, target the first known room, Close in
  at decision point 1, Stand off at decision point 2. It writes the export,
  for `proto/replay.mjs`.
- `node proto/captain-probe.mjs`: the probe behind #367. It shows that
  `js/enemy.js` releases a hold written between ticks once its patience's
  zones resolve, and that it resets a preset verb at its next decision.
- `NODE_PATH=/opt/node-tools/node_modules node proto/smoke.mjs`: Playwright
  at 844 × 390 with touch. It checks `PROTO_VERSION` and the determinism duel
  (`proto/duel.js` in Chromium against `tools/determinism.mjs`, MATCH), then
  plays two battles through decision point 1:
  - R2 v Swarm, 1500 m, bow on, seed 41, with the pause setting: a scan and
    a target through the page; the battle must wait at decision point 1; it
    takes the panel's second option, exports mid-battle and at the end.
  - Restart (seed 42), Lance v Furnace, 900 m, broadside, with the auto
    setting: the automatic entry must apply without stopping; it takes Break
    off from the menu and exports at the end.

  Every export must replay with MATCH. The test fails on any console error
  or on a visible button under 44 px. It writes `proto/screens/*.png`.
- `node proto/measure.mjs`: the old R1d-A duels (`proto/duel.js`), kept for
  reference.

## Files

`index.html`, `proto.css`, `proto.js` (the page), `phases.js` (the phases,
the menu, the decision points, the replay; no DOM), `battle.js` (the page's
battle on the kernel: verbs, shot books, losses, the end tree; no DOM),
`duel.js` (`createDuel`, `replayLine`, `endLine` mirrored from
`tools/duel.js`, and the determinism duel; no DOM), `export.js` (the
export; no DOM), `config.js` (every prototype setting), `measure.mjs`,
`replay.mjs`, `play.mjs`, `captain-probe.mjs`, `smoke.mjs`, `screens/`.
