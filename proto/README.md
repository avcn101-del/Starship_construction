# Feel prototype (throwaway)

A rough page to judge how a battle feels on the phone (`DESIGN.md` §13h,
decisions #217, #223, #224): two reference ships R1 (§13f.2, at the mass
pass's masses, #221) 900 m apart on the unchanged L3 kernel. It only reads
and drives the kernel through its exported functions, adds no game number
outside `js/data.js`, and **never counts as a Mission 0 result**.

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

Shown before each battle and from **Restart**; one loadout applies to
**both ships alike**; the current loadout stays in the top-right corner
during the battle. **Defaults** gives the battle without the panel (the
same event hash for the same seed). The levers (#223's ladder: constants
within their approved ranges, then layout and combinations of existing
physics):

- **Magazine**: HE full (default), AP full, HE half, AP quarter, by mass
  (fractions of `magazine.capacity`), loaded as whole rounds by the
  kernel's `loadMagazine`. A magazine explodes when a cell of it is
  wrecked, with the charge energy of its rounds, plus the warhead for HE.
- **Bow armour**: none, 1 or 2 armour cells in front of each bow-facing
  row. A `STAND-IN` (stand-in 7 below): armour fittings (#15) are not built
  in the kernel.
- **Layout**: R1 (§13f.2) or **R1-B**: the hold moved to [9,11)×[2,4) and
  the beam bay to [11,13)×[2,4), so the hold stands between the beam bay
  and the magazine; 17 radiators (the beam bay's on its free edges) and the
  same 4 RCS. Both layouts pass the kernel's `validateShip` every time a
  ship is built.
- **Shield budget**: 10 MW (default, `js/data.js`), 5 or 20 MW: a run-time
  override of `shield.budget` (approved 2–40 MW).
- **Hits to wreck**: 3 (default) or 5: a run-time override of
  `kinetic.hitsToWreck` (approved 1–8).
- **Turrets**: on, or off (both turrets hold: the beam-only probe).

`battle.js` refuses an override outside its constant's approved range.

## Play

- **Tap an enemy room** to target it (yellow dashed outline). Your beam and
  turret fire at it while the preset says so. A wrecked target is dropped.
- **Fire**: beam and turret on the target, shield on, engine half.
  **Cool**: weapons off, shield off, engine off. **Evade**: engine full, RCS
  turning, weapons hold (the shield stays on: §13h.2 does not say).
- **×1 ×2 ×4**: time. **Pause**, **Restart** (back to the loadout panel).
- The enemy runs a fixed script: Fire 60 s, Cool 30 s, repeat; it aims at
  your beam bay, then your turret, then your engine, each until wrecked.
- The battle ends when a ship is Disabled (no weapon able to fire and no
  thrust for 10 s, #82) or destroyed (its reactor or magazine explodes), and
  shows the time, crew lost and rooms wrecked.

## Read the view

- Each room's colour is its temperature against its own thresholds: dark
  blue at rest, green toward hot, yellow at hot, red at overheated, white
  toward critical. A darker cell has lost integrity (thin red frame); a
  destroyed cell is black with a red cross. `!` after a label: shut down.
  A grey outline: the room has lost control. A magenta bar along a cell's
  bottom: the beam's burn so far.
- The cyan oval is the shield; brighter is a larger budget. Below each ship:
  whether the beam, the gun and the engine are able, crew aboard, reactor
  output, shield and what it absorbs; a red countdown while Disabled looms.
- Rounds are white dashes; a white frame flashes along the row a round went
  down. A beam is a magenta line while it passes the shield, cyan while the
  shield takes all of it.
- The log (right) lists the kernel's events: time, side (P you, E enemy),
  room, event, cause, crew aboard after it. Shots are drawn, not logged.

## Stand-ins (also on screen)

Each is marked `STAND-IN` in the code.

1. Rounds fly straight at the muzzle velocity (`kinetic.muzzleVelocity`)
   from gun to the aimed room: no aiming error, no lead, no deflection. On
   arrival the kernel's `shieldRound` slows them at the aimed room and its
   `fireRound` resolves them along one grid row of the aimed room, entering
   from the bow (the side facing the shooter); the row is picked by the
   seeded RNG (`js/util.js`), since the room's centre lies on a cell line.
2. Beams: the kernel's shield takes the beam at the aimed room
   (`setBeams`); what passes, times the Gaussian fraction that lands on one
   cell at 900 m (`beamDeliveredFraction`), heats the aimed room and burns
   its cells one by one, the ones facing the shooter first. A cell burns
   through at `armour.burnEnergy` (L0's rule; `data.js` has no room value).
3. Both sides see the true layout: no scans.
4. No point defence, no missiles, no railgun.
5. No helm: both ships are held at their stations for aiming and drawing.
   Engines and RCS still draw power and make heat in the kernel; the motion
   the kernel integrates is not shown or used.
6. Disabled is judged from room state (working, controlled, a reactor able
   to power it, the gun fed); destroyed means a reactor or magazine
   explosion.
7. Bow armour (loadout): N armour cells stand in front of each bow-facing
   row, beyond the row's foremost room cell (grey cells in the view). A
   round arriving in that row, after the shield, first passes them by L0's
   rule (the kernel's `penetrate`, `armour.kineticResistance` per cell; a
   wrecked armour cell is a hole) and enters the row with the sectional
   momentum left. A beam burning a cell of the aimed room first burns that
   row's armour cells (`armour.burnEnergy` each); that energy stays in the
   armour and does not heat the room. Armour cells are wrecked like room
   cells: 1 / `kinetic.hitsToWreck` per round passing, (absorbed / R) /
   `hitsToWreck` for the cell a round stops in. Their mass and heat are
   ignored (ships are held at station, stand-in 5).

## Tools

- `node proto/measure.mjs [--seeds N] [--limit s] [--magazine heFull|apFull|heHalf|apQuarter]
  [--armour 0|1|2] [--layout R1|R1B] [--shield-budget W] [--hits N] [--turrets on|off]`:
  battles headless with both sides on the enemy's script and one loadout;
  prints per seed the length, the end, what destroyed a ship, the first
  room to fail on each side, the event hash and the cost per step, then a
  summary. `--beam-only` is `--turrets off`.
- `NODE_PATH=/opt/node-tools/node_modules node proto/smoke.mjs`: Playwright
  at 844 × 390 with touch; chooses a non-default loadout (AP full, armour 1,
  R1-B, shield 20 MW, hits 5) and starts, taps a target, cycles the presets,
  runs ×4 to the end or 6 simulated minutes, checks Restart brings the
  panel back; fails on any console error or a visible button under 44 px;
  writes `proto/screens/loadout.png`, `start.png` and `end.png`.

## Files

`index.html`, `proto.css`, `proto.js` (the page), `battle.js` (the battle,
no DOM), `config.js` (every prototype setting), `measure.mjs`, `smoke.mjs`,
`screens/`.
