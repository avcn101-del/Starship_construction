# Duct Tape Navy: Mostly in One Piece

A single-player ship builder and battle game for Android phones (installable
as a web app). You are a privateer captain who fights for the underdogs and
fights dirty. Build a ship from rooms, prepare it, and win fights you should
lose. Guns recoil, heat must be radiated, scans give you away, reactors fail
safe, and your crew's deaths are permanent.

**Status: Mission 0, levels L0 (materials) and L1 (one room alone) done: 27 scenarios verified, 1 withdrawn for a specification error and replaced.** No game yet. Mission 0
proves the physics and balance bottom-up, in text, before any graphics.

## Documents

| File | What it is |
|---|---|
| `DESIGN.md` | The current design (source of truth) |
| `DECISIONS.md` | The dated log of every decision and why |
| `CLAUDE.md` | Working rules for every session in this repository |
| `IDEAS.md` | Ideas not built yet, and the gates they must pass |
| `MISSION0.md` | The Mission 0 results ledger |
| `STATUS.md` | The hand-over between sessions: open pull requests, next steps |
| `CHANGELOG.md` | Versions |

## Running

Mission 0 runs headless with Node 22 (no npm):

```
node tools/m0.js list          # scenarios, lock hashes, last verdicts
node tools/m0.js run L1        # run a level (canonical runs are recorded)
node tools/m0.js verify L1     # independent re-run against the records
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
| `kinetic.chargeEnergy` | 500000 | 200000–2000000 | 3 | J | yes |
| `armour.kineticResistance` | 270000 | 135000–540000 | 1 | kg/(m*s) | yes |
| `armour.blastResistance` | 1000000 | 300000–3000000 | 3 | J | yes |
| `armour.burnEnergy` | 30000000 | 10000000–100000000 | 3 | J | yes |
| `room.kineticResistance` | 67500 | 30000–140000 | 1 | kg/(m*s) | yes |
| `he.blastEnergy` | 2000000 | 500000–5000000 | 3 | J | yes |
| `he.coupling` | 0.5 | 0.2–0.8 | 0 |  | yes |
| `beam.power` | 5000000 | 1000000–20000000 | 2 | W | yes |
| `beam.focusRange` | 600 | 300–1500 | 1 | m | yes |
| `shield.budget` | 10000000 | 2000000–40000000 | 2 | W | yes |
| `shield.radius` | 40 | 20–80 | 1 | m | yes |
| `shield.kineticStop` | 456644.8186993429 | 228322.40934967145–913289.6373986858 | 1 | kg/(m*s) | yes |
| `shield.bufferSeconds` | 1 | 0.2–5 | 0 | s | yes |
| `shield.powerDraw` | 2000000 | 500000–10000000 | 2 | W | yes |
| `thermal.heatCapacityPerCell` | 600000 | 200000–2000000 | 3 | J/K | yes |
| `thermal.plantHot` | 600 | 450–750 | 0 | K | yes |
| `thermal.plantOverheated` | 800 | 650–950 | 0 | K | yes |
| `thermal.plantCritical` | 1000 | 850–1300 | 0 | K | yes |
| `thermal.crewedHot` | 330 | 320–350 | 0 | K | yes |
| `thermal.crewedOverheated` | 350 | 340–380 | 0 | K | yes |
| `thermal.crewedCritical` | 380 | 360–420 | 0 | K | yes |
| `thermal.magazineHot` | 330 | 320–350 | 0 | K | yes |
| `thermal.magazineOverheated` | 350 | 340–380 | 0 | K | yes |
| `thermal.magazineCritical` | 450 | 400–500 | 0 | K | yes |
| `radiator.area` | 25 | 10–100 | 2 | m^2 | yes |
| `reactor.power` | 20000000 | 5000000–50000000 | 2 | W | yes |
| `reactor.heatPerPower` | 1 | 0.5–3 | 0 |  | yes |
| `reactor.decayFraction` | 0.07 | 0.03–0.15 | 0 |  | yes |
| `reactor.decayTime` | 900 | 300–1800 | 0 | s | yes |
| `reactor.breachFraction` | 0.5 | 0.25–0.75 | 0 |  | yes |
| `reactor.breachCountdown` | 10 | 3–30 | 0 | s | yes |
| `reactor.explosionEnergy` | 200000000 | 50000000–1000000000 | 3 | J | yes |
| `beambay.efficiency` | 0.4 | 0.2–0.8 | 0 |  | yes |
| `engine.thrust` | 8000000 | 2000000–30000000 | 2 | N | yes |
| `engine.powerDraw` | 10000000 | 2000000–40000000 | 2 | W | yes |
| `engine.heatFraction` | 0.3 | 0.1–1 | 0 |  | yes |
| `turret.fireRate` | 0.5 | 0.2–2 | -1 | 1/s | yes |
| `turret.powerDraw` | 200000 | 50000–1000000 | 2 | W | yes |
| `turret.heatPerShot` | 300000 | 100000–1000000 | 3 | J | yes |
| `magazine.capacity` | 75 | 25–250 | 3 | kg | yes |
| `quarters.crewPerCell` | 3 | 1–8 | 2 | crew | yes |
| `quarters.powerDraw` | 50000 | 10000–200000 | 2 | W | yes |
| `repair.rate` | 0.02 | 0.005–0.1 | 0 | 1/s | yes |
| `repair.radius` | 30 | 10–80 | 1 | m | yes |
| `bridge.powerDraw` | 100000 | 20000–500000 | 2 | W | yes |
| `crewRequired.bridge` | 4 | 4–12 | 2 | crew | yes |
| `crewRequired.reactor` | 4 | 4–12 | 2 | crew | yes |
| `crewRequired.engine` | 2 | 2–6 | 2 | crew | yes |
| `crewRequired.magazine` | 2 | 2–6 | 2 | crew | yes |
| `crewRequired.shieldGenerator` | 2 | 2–6 | 2 | crew | yes |
| `crewRequired.beamBay` | 3 | 3–9 | 2 | crew | yes |
| `crewRequired.turret` | 3 | 3–9 | 2 | crew | yes |
| `crewRequired.railgun` | 4 | 4–12 | 2 | crew | yes |
| `crewRequired.missileBay` | 3 | 3–9 | 2 | crew | yes |

Fixed (not tunable):

| Constant | Value | Unit | Note |
|---|---|---|---|
| `steelDensity` | 7850 | kg/m^3 | real density of steel; kinetic rounds are steel |
| `roundLengthToDiameter` | 4 |  | shape of a kinetic round (a cylinder 4 diameters long) |
| `sizeLinear` | S 2/3, M 1, L 3/2 |  | linear size of S and L relative to M (mass scales with its cube) |
| `beamWaistPerHalfCell` | 1/√2 (0.7071067811865475) |  | beam waist radius as a fraction of the target aperture radius (half a cell edge) |
| `shieldFalloffExponent` | 2 |  | shield field strength g(r) = 1 / (1 + (r / radius)^n) |
| `simStep` | 1/60 | s | simulation time step (#175) |
| `burnTimeLimit` | 3600 | s | a beam burn gives up after this long (#175) |
| `stefanBoltzmann` | 5.670374e-8 | W/(m^2*K^4) | real Stefan-Boltzmann constant (#143, #183) |
| `restTemperature` | 290 | K | rooms start here; space (3 K) is taken as 0 (#182, #183) |
| `radiatorEmissivity` | 0.9 |  | radiator.emissivity in DESIGN.md 13c.3: real, a dark panel (#182, #183) |
| `repairFalloffExponent` | 2 |  | repair field strength g(r) = 1 / (1 + (r / radius)^n), like the shield (#99, #183) |

`shield.kineticStop` is computed in `data.js` as one S round's sectional
momentum at T1 (#171), and again inside `withOverrides` so a kinetic
override reaches it (#184); its range is 0.5×–2× of that value.
Rate-like constants of an L room (power, draw, thrust, budget) are 9/4 of
the M value (#183). The `ROOMS` table in `data.js` gives each room's
footprint, placement, threshold class, crew and draws.

## Lineage

The lessons of the previous project, `avcn101-del/bridge-sim`, are in its
`HANDOFF.md`.
