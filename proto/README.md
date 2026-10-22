# Feel prototype v2 (throwaway)

A rough page to judge how a battle feels on the phone (`DESIGN.md` §13h,
§13j; decisions #217, #224, #233, #237): two reference ships R1 (§13f.2)
on the path model's kernel (§13i), flown by a stand-in autopilot from three
standing orders (§8: range, facing, dodge), with rounds that hit or miss for
physical reasons only. It only reads and drives the kernel through its
exported functions, adds no game number outside `js/data.js`, and **never
counts as a Mission 0 result**.

## Run it

From the repository root:

```
python3 -m http.server 8000
```

then open `http://localhost:8000/proto/` (on a phone on the same network,
use the computer's address). Not `file://`: ES modules need a server.
Hold the phone in landscape.

Every kernel import in `proto/` uses the single prefix `../js/`; to publish
the page elsewhere, copy `js/` beside `proto/` or rewrite that one prefix.

## Loadout panel

Shown before each battle and from **Restart**; the current loadout stays in
the top-right corner during the battle. **Defaults** resets every lever.

The **fit** applies to both ships alike (#223's ladder: constants within
their approved ranges, then layout and combinations of existing physics):

- **Magazine**: HE full (default), AP full, HE half, AP quarter, by mass
  (fractions of `magazine.capacity`), loaded as whole rounds by the
  kernel's `loadMagazine`. A magazine explodes when a cell of it is
  wrecked, with the charge energy of its rounds, plus the warhead for HE.
- **Layout**: **R1d** (default since L4b, #261, #264: R1 with a 0.2 m
  steel citadel on the magazine's eight wall segments and five plates around
  the turret, 1460.8 t, 1.05 g), R1 (§13f.2), **R1-B** (the hold moved to
  [9,11)×[2,4) and the beam bay to [11,13)×[2,4), so the hold stands between
  the beam bay and the magazine) or R1c (the citadel only). Each passes the
  kernel's `validateShip` at every build.
- **Shield budget**: 10 MW (default, `js/data.js`), 5 or 20 MW: a run-time
  override of `shield.budget` (approved 2–40 MW).
- **Hits to wreck**: 3 (default) or 5: a run-time override of
  `kinetic.hitsToWreck` (approved 1–8).
- **Turrets**: on, or off (both turrets hold: the beam-only probe).

The **orders** are yours (the enemy keeps its script's):

- **Range order**: hold 900 (default), close 600, open 1500 m, centre of
  mass to centre of mass (#54's band).
- **Facing order**: bow-on (default) or broadside.
- **Dodge order**: off (default) or on.

The **seed** (first battle: 1) times each ship's dodge through the seeded
RNG of `js/util.js`. It is shown on the panel and in the battle's corner;
Restart adds 1; type another to replay a battle. `battle.js` refuses an
override outside its constant's approved range. `PROTO_VERSION` is
`feel-3`.

## Play

- **Tap an enemy room** to target it (yellow dashed outline). Your turret
  aims at it and your beam fires while the preset says so. A wrecked target
  is dropped.
- **Fire**: weapons on the target, shield on, your standing orders as set,
  engine up to 50 %. **Cool**: weapons off, shield off, engine off: the
  ship coasts, the RCS holds the facing order's heading, no dodging.
  **Evade**: weapons hold, shield on, broadside and dodge, engine up to
  100 %. The range order still comes first in Evade (#40).
- **×1 ×2 ×4**: time. **Pause**, **Restart** (back to the loadout panel,
  seed + 1).
- The enemy runs a fixed script: Fire 60 s, Cool 30 s, repeat; it aims at
  your beam bay, then your turret, then your engine, each until wrecked;
  its orders are hold 900 m, bow-on, dodge on.
- The battle ends when a ship is Disabled (no weapon able to fire for 10 s,
  whatever its engine does: the kernel's rule, `js/battle.js`
  `weaponStates`, #255) or destroyed (its reactor or magazine explodes, or
  its largest piece holds under half its mass, #83), and shows the time, the
  crew lost and rooms wrecked (the KIA list first), then **why it ended**:
  the cascade tree from the kernel's events (#41, #264): the root shot or
  beam, then each event it caused, indented; the red row is the event that
  took the last weapon, or the explosion.

### What the physics does with the orders (no new constant)

- **Facing**: the beam bay is spinal (#234): the beam leaves along the
  ship's axis from the bay's bow face and hits whatever that line crosses on
  the enemy, possibly nothing (a miss). Only a bow-on ship beams its target.
  The engine pushes along the axis, so broadside the ship dodges with the
  engine (1.8 g at full thrust); bow-on only the RCS pushes sideways (two
  1 MN fittings on 850 t: 2.35 m/s², 0.24 g).
- **Rounds**: a kernel `shot` launches a round at the shooter's velocity
  plus 800 m/s along the turret's aim; the turret aims at the lead point
  (the target room extrapolated at its ship's velocity over the time of
  flight). Each step the round's segment is tested against the target's
  hull cells. A hit: the kernel's `shieldRound` slows it at the hull entry
  point and its `fireRound` resolves it along the cells the line crosses
  from entry to exit (holes stay on the path). A round that crosses nothing
  flies on and is a miss once 3 km from the midpoint between the ships. No
  dispersion: misses come from acceleration during the time of flight
  (the lead knows velocity only).
- **Beam**: the kernel's shield takes it at the hull entry point
  (`setBeams`); what passes goes along the crossed cells with the kernel's
  `fireBeam` (Bethe deposit, the bay's `beamEnergy`, no falloff).

## Read the view

- **World strip** (top): both ships to scale, the line of sight from you to
  the enemy pointing right; every hull cell on its body (red outline: a
  hole); a yellow line from each centre of mass shows its velocity against
  the midpoint's as 5 s of travel; a white tick marks each bow. Rounds in
  flight are white dots with a tail. A beam is magenta where it passes the
  shield, cyan where the shield takes it all, grey dashes where it misses.
  Top right: the range and how fast it opens or closes; bottom: each side's
  hits, misses and rounds in flight.
- **Head-up grids** (as v1; the enemy's is tappable): each room's colour is
  its temperature against its own thresholds (dark blue at rest, green
  toward hot, yellow at hot, red at overheated, white toward critical); a
  darker cell has lost integrity (thin red frame); a destroyed cell is
  black with a red cross; `!` after a label: shut down; a grey outline: the
  room has lost control. The cyan oval is the shield. A white arrow shows
  where a round entered in the last 1.5 s, with the cells it reached framed;
  the beam is drawn where it enters (and to the deepest cell it reached when
  it passes the shield); "beam: miss" when its line crosses nothing.
- Above each grid: preset, target, the autopilot's mode and the engine's
  throttle. Below: whether beam, gun and engine are able, crew, reactor
  output, shield and what it absorbs; a red countdown while Disabled looms.
- The log (right) lists the kernel's events and the prototype's
  `round-hit` and `round-missed`: time, side (P you, E enemy), room, event,
  cause, crew aboard after it. Shots are drawn, not logged.

## Stand-ins (also on screen)

Each is marked `STAND-IN` in the code.

1. **Autopilot** (for L4's `helm.js`): the three orders in #40's order.
   Range first: out of a 100 m dead band, or drifting faster than 50 m/s off
   the wanted relative velocity, the ship flies a wanted closing speed
   (0.05 /s × the range error, at most 40 m/s) with no drift across the line
   of sight, thrusting along the velocity error once within 10° of it.
   Facing next: bow-on points the bow at the enemy, broadside puts the line
   of sight across the axis. Dodge last: the sign of the thrust across the
   line of sight flips every 6–14 s (seeded); broadside that is a turn to the
   other broadside, bow-on the RCS pair on one side. The RCS holds and turns
   the heading: a time-optimal turn rate on 70 % of the couple's angular
   acceleration, the torque it needs less the thrust torque, met each step
   by the subset of able fittings closest to it. Every gain is in
   `config.js` (`AUTOPILOT`), commented PROTOTYPE SETTING, NOT A GAME
   NUMBER.
2. **Presets' throttles**: Fire up to 50 %, Cool 0, Evade 100 %.
3. **Enemy script**: Fire 60 s, Cool 30 s; beam bay, turret, engine; hold
   900, bow-on, dodge on.
4. **Turret**: free aim in any direction (no traverse arc, no slew, no
   dispersion); its rounds never hit their own ship.
5. A cell the line clips at a corner counts as crossed whole (the chord rule
   waits for the next kernel pass).
6. Both sides see the true layout: no scans.
7. No point defence, no missiles, no railgun.
8. Disabled is the kernel's rule (`js/battle.js` `weaponStates`: a weapon
   not destroyed, controlled, not shut down, active, joined to a reactor that
   can produce; the gun fed), `battle.disabledSeconds` (10 s, `js/data.js`);
   destroyed means a reactor or magazine explosion or too many pieces
   (`battle.wreckFraction`). The prototype keeps its own loop (lead aim, the
   helm); the kernel's L4b loop (`js/battle.js`) is ship versus a static
   target. A round flying farther
   than `battle.cullDistance` from every body leaves play (a miss).

The kernel turns ships with `js/util.js`'s deterministic sin and cos (physics
pass 2, #239 Q6), so the prototype's own stand-in `detmath.js` is gone: the
same battle on the phone and in Node, so a phone export replays MATCH. Since
physics pass 2 a hit also gives the ship it hits its impulse and its heat,
and the shield's field pushes on its generator's ship (13k.1).

## Export and replay

- **Export** (top bar during a battle, and on the end panel) pauses the
  battle and builds one line of JSON: the version (`PROTO_VERSION`), the
  seed, the loadout (fit and your orders), every input of the player with
  its step number, where the battle stands (ended or not, step, time,
  losers and reason, crew lost, rooms wrecked, shots, hits and misses per
  side), the number of events and their hash, and a per-room summary
  ([first hot, first overheated, wrecked] in s). It copies the text to the
  clipboard and says "copied"; if the phone refuses, it says so and the text
  stays selected in a box to copy by hand. **Close** resumes. Inputs are
  tokens such as `5400Pc 5460TbeamBay` (Cool at step 5400, then target the
  beam bay).
- `node proto/replay.mjs <file.json> [--every S] [--quiet]` rebuilds the
  battle headless from the seed, loadout and inputs, runs it to the
  exported step, prints the full event log and each room's temperature
  peak, then compares the end and the event hash with the export: **MATCH**
  (exit 0) or **MISMATCH** (exit 1). `--every 1` also prints each room's
  temperature and integrity, each shield's state and the helm (mode, range,
  throttle, heading) once per simulated second. Text around the JSON is
  ignored.
- The hash folds every event's JSON, after every tick, in the order the
  battle emits them. Bump `PROTO_VERSION` whenever `proto/` or `js/` changes
  what a battle does: replay warns when the export's version differs.

## Tools

- `node proto/measure.mjs [--seeds N] [--first S] [--range close|hold|open]
  [--facing bow|broadside] [--limit s] [--magazine ...] [--layout R1D|R1|R1B|R1C]
  [--shield-budget W] [--hits N] [--turrets on|off]`: duels headless with
  both ships on the enemy's script (by default seeds 1–10 at each range
  order, on both ships); prints a table per duel (length, end, each side's
  shots / hits / misses, what destroyed a ship, the cost per step) and a
  summary per range. `--facing broadside` replaces the script's bow-on on
  both ships.
- `NODE_PATH=/opt/node-tools/node_modules node proto/smoke.mjs`: Playwright
  at 844 × 390 with touch; checks the panel shows seed 1, chooses a
  non-default loadout (AP full, R1-B, 20 MW, hits 5, close 600, broadside,
  dodge on) and seed 41 and starts, checks the seed in the battle's corner,
  taps a target, cycles the presets, runs ×4 to the end or 6 simulated
  minutes (target the turret at 8 s, Cool at 12 s, Fire at 16 s, Export from
  the top bar at 20 s), exports again at the end, runs `replay.mjs` on both
  exports (each must print MATCH and carry seed 41), checks Restart brings
  the panel back with seed 42; fails on any console error, a visible button
  under 44 px or a MISMATCH; writes `proto/screens/loadout.png`,
  `start.png`, `export.png`, `end.png` and `restart.png`.

## Files

`index.html`, `proto.css`, `proto.js` (the page), `battle.js` (the battle
and the autopilot, no DOM), `duel.js` (the fixed duel of the determinism
test, no DOM), `export.js` (the export and its event hash, no DOM), `config.js` (every
prototype setting), `measure.mjs`, `replay.mjs`, `smoke.mjs`, `screens/`.
