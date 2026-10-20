# Duct Tape Navy: Mostly in One Piece

A single-player ship builder and battle game for Android phones (installable
as a web app). You are a privateer captain who fights for the underdogs and
fights dirty. Build a ship from rooms, prepare it, and win fights you should
lose. Guns recoil, heat must be radiated, scans give you away, reactors fail
safe, and your crew's deaths are permanent.

**Status: Mission 0, level L0 (materials) done.** No game yet. Mission 0
proves the physics and balance bottom-up, in text, before any graphics.

## Documents

| File | What it is |
|---|---|
| `DESIGN.md` | The current design (source of truth) |
| `DECISIONS.md` | The dated log of every decision and why |
| `CLAUDE.md` | Working rules for every session in this repository |
| `IDEAS.md` | Ideas not built yet, and the gates they must pass |
| `MISSION0.md` | The Mission 0 results ledger (empty) |
| `CHANGELOG.md` | Versions |

## Running

Mission 0 runs headless with Node 22 (no npm):

```
node tools/m0.js list          # scenarios, lock hashes, last verdicts
node tools/m0.js run L0        # run a level (canonical runs are recorded)
node tools/m0.js verify L0     # independent re-run against the records
node tools/m0.js regress       # re-run every recorded PASS
node tools/m0.js ledger        # regenerate MISSION0.md
```

The game itself will be served as static files (`python3 -m http.server`)
and hosted on Cloudflare Pages.

## Tweakable values

From `js/data.js` (SI units; T1 base values; scaled = value × (edge / 5 m)^k).
Keep this section in sync with `data.js`.

| Constant | T1 value | Approved range | k | Unit | Approved |
|---|---|---|---|---|---|
| `kinetic.roundMass` | 0.5 | 0.2–2 | 3 | kg | yes |
| `kinetic.muzzleVelocity` | 800 | 500–1000 | 0 | m/s | yes |
| `armour.kineticResistance` | 270000 | 135000–540000 | 1 | kg/(m*s) | yes |
| `armour.blastResistance` | 1000000 | 300000–3000000 | 3 | J | **no (provisional)** |
| `armour.burnEnergy` | 30000000 | 10000000–100000000 | 3 | J | **no (provisional)** |
| `room.kineticResistance` | 67500 | 30000–140000 | 1 | kg/(m*s) | **no (provisional)** |
| `he.blastEnergy` | 2000000 | 500000–5000000 | 3 | J | yes |
| `beam.power` | 5000000 | 1000000–20000000 | 2 | W | yes |
| `beam.focusRange` | 600 | 300–1500 | 1 | m | yes |
| `shield.budget` | 10000000 | 2000000–40000000 | 2 | W | yes |
| `shield.radius` | 40 | 20–80 | 1 | m | yes |
| `shield.kineticStop` | 457000 | 228500–914000 | 1 | kg/(m*s) | yes |
| `shield.bufferSeconds` | 1 | 0.2–5 | 0 | s | **no (provisional)** |

Fixed (not tunable):

| Constant | Value | Note |
|---|---|---|
| `steelDensity` | 7850 | real density of steel; kinetic rounds are steel |
| `roundLengthToDiameter` | 4 | shape of a kinetic round (a cylinder 4 diameters long) |
| `sizeLinear` | S 0.667, M 1.000, L 1.500 | linear size of S and L relative to M (mass scales with its cube) |
| `beamWaistPerHalfCell` | 0.7071067811865475 | beam waist radius as a fraction of the target aperture radius (half a cell edge) |
| `shieldFalloffExponent` | 2 | shield field strength g(r) = 1 / (1 + (r / radius)^n) |

## Lineage

The lessons of the previous project, `avcn101-del/bridge-sim`, are in its
`HANDOFF.md`.
