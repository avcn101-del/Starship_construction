# DECISIONS — working log (draft)

This is the memory of the design discussion that started 2026-10-20, not the
design document. Every row was agreed with the owner in that discussion.
`DESIGN.md`, `CLAUDE.md`, `IDEAS.md` and `CHANGELOG.md` are written from this
log once the discussion is finished. Until then nothing here is code.

Background: the previous project, `avcn101-del/bridge-sim`, closed as an MVP
with `HANDOFF.md` (on its `main`). Its lessons are referenced as "HANDOFF".

Languages: the game is in **English** by default (all player-facing text in one
place in `data.js`). Discussion with the owner is Vietnamese mixed with English.

## 1. Product

| # | Topic | Decision |
|---|---|---|
| 1 | Genre | PvE, **1v1 first** (easier to balance). Ships are built from **rooms** on a grid, 2D top-down. Room idea from Pixel Starships; its crew micro-management is rejected |
| 2 | The player | Builds the ship and sets **standing orders** before battle. In battle: **3 verbs** (scan a zone, target a room, switch order preset). **Pause** allowed (only 3 verbs, so pause is not micro). The player never steers and never writes scripts |
| 3 | Tech | Plain HTML/CSS/JS, no framework, no build, no npm. **ES modules** (hosting is HTTP, so the `file://` rule of bridge-sim is dropped; local dev needs a static server, e.g. `python3 -m http.server`). Hosted on **Cloudflare Pages** (static, no build step). The simulation kernel runs headless in **Node** for the harness |

## 2. Core laws (every idea is checked against these)

| Law | Meaning |
|---|---|
| **Throughput** | Combos are real (adjacent rooms synergise) but share one flow with a fixed rate: power, ammo feed, heat. Diminishing returns come from the shared flow, not from arbitrary curves. Anti alpha-strike: limited throughput, overkill wasted, recoil, over-penetration wasted |
| **Dependency** | Every strength hangs on something that can be shot. A stronger ship has more dependency chains, so more weak points (size tax) |
| **Information** | You cannot target what you have not scanned. Jamming, scan-proof plating, running cold and decoys hide you; each costs something under the other two laws |

**Six ways the weak beat the strong**: mission kill, cascade, information,
time window, attrition, mechanism counter. Each must stay reachable.

**Four gates for a physics law** (all four or it is cut): it serves a core
law; it opens or strengthens an underdog path; it is readable on screen; it
reuses a model the kernel already has.

## 3. Physics

| # | Decision |
|---|---|
| 4 | Principle: **borrow the shape of the real law, tune the constant** |
| 5 | **Kept**: inertia and moment of inertia; recoil (Newton 3: kinetic recoils hard, beams barely, off-axis guns spin the ship); centre-of-mass shift when rooms are lost; heat and radiators (heat leaves only by radiation, radiators on the outer hull); infrared signature (hot ships are easier to scan); inverse-square falloff (beams, passive sensing, jamming); projectile time of flight; **square–cube law** (bigger ships have less hull surface per volume) |
| 6 | **Cut**: kinetic energy ½mv² (overlaps falloff); decompression thrust (duplicates CoM shift, needs an atmosphere system); I²R resistance (wall capacity covers it). **Deferred**: sloped armour (needs player-controlled facing) |
| 7 | **No dice.** Hit or miss is decided by trajectories. A "seed" is a layout variant |
| 8 | **Four kernel models**: 2D rigid body; heat **per room**, conducting through shared walls; falloff field; projectiles |
| 9 | Hits by trajectory: a shot enters the first cell on its path (generalises bridge-sim's "outermost block on the attacker's side"). Over-penetration loses the remaining momentum. Debris blocks shots |

## 4. Ship model

| # | Decision |
|---|---|
| 10 | **Scale rule**: anything smaller than a compartment never occupies a cell. It is a property of a wall or of the hull |
| 11 | **Three placement layers**: rooms (cells); shared walls (where rooms touch); hull edge (each outer edge segment) |
| 12 | **Three graphs** on shared walls: structure, power, control. Capacity is proportional to the **length of the shared wall**. No conduit rooms, no relay rooms (supersedes the earlier "implicit + conduit/relay rooms" option). Fittings do not carry power or control |
| 13 | Fragments: a ship split by the structure graph becomes several rigid bodies, momentum conserved. A fragment without the bridge loses control: weapons stop, shields drop, engines stick at the last throttle. A reactor without control **breaches after a few seconds**. An auxiliary bridge is a later module |
| 14 | **Rooms (11)**: Bridge 2×2; Reactor 2×2, 3×3; Engine 2×3 (exhaust on the aft hull, thrust through CoM); Magazine 2×2 (feeds through shared walls, chain explosion); Shield generator 2×2, 3×3; Crew quarters 3×2 (repair radius); Beam bay 2×2, 3×3; Kinetic turret 2×2, 3×3; **Spinal railgun 2×N** along the axis (longer barrel = faster round; recoil through CoM pushes back, does not spin; fires forward only); Missile bay 3×2; Empty hold 2×2 (cheap, light, structure, buffer) |
| 15 | **Fittings (5)**, **one per hull edge segment**: Armour (tiers), Radiator, RCS (better far from CoM), Point defence, Sensor antenna. A fitting takes power and control from the room it is mounted on. The hull surface is the scarcest resource |
| 16 | Rooms take damage **per cell**; function scales with surviving cells |
| 17 | **Firing arcs are blocked by the ship's own rooms** |
| 18 | Combos go through shared walls; a room's perimeter caps how many it can have. Combo data shape: room pair, bonus, shared flow, weak point it creates |

## 5. Weapons and defence

| # | Decision |
|---|---|
| 19 | **Starter weapons**: Beam (instant, falloff, heavy power and heat, precise when scanned); Kinetic (time of flight, strongest recoil, penetrates along its path); Missile/torpedo (slow, self-propelled, **seeks the hottest IR spot**, surface splash, chain risk in its bay); Point defence (shoots missiles). Weapons come in **sizes** (small/medium/large: damage, recoil, slower traverse when large, heat concentration, hp, target size) |
| 20 | Later: **EMP** first (attacks the power and control graphs: disable without destroying). Tractor beam and mines deferred. Ramming and boarding cut |
| 21 | **Shield = energy screen**: an absorption **rate** set by its power, plus a small buffer for spikes. Absorbed energy becomes **heat**. Kinetic rounds lose a fixed amount of momentum (small rounds stopped, railgun passes reduced). Generators project a falloff field; gaps where coverage does not overlap are layout weak points. No four-facing shields |
| 22 | Attack/defence matrix: beam stopped by shield, weak at range; kinetic stopped by armour, dodged at range; missile stopped by point defence, misled by decoys or running cold. No defence stops everything. This is static physics for puzzle design, not bridge-sim's learning counter table |

## 6. Information

| # | Decision |
|---|---|
| 23 | The enemy's outer silhouette is always visible (optical); the interior is not |
| 24 | Passive IR and EM sensing fall off with distance²; **active scan falls off with distance⁴** (the return trip, as radar) and **reveals the scanner** |
| 25 | Scanning is **by zone**, takes seconds; revealed room positions are **remembered for the battle**; room state (hot, unpowered) needs passive tracking. Untargeted zones can be fired at blind |
| 26 | **The enemy scans you too** |
| 27 | Counters (later modules): Jammer (field; is itself EM-bright, so it reveals its own position); Scan-proof plating (a fitting, competes with armour and radiators); Running cold; Heat decoys |
| 28 | **Puzzle ships have layout variants** so scanning stays necessary |

## 7. Encounters and progression

| # | Decision |
|---|---|
| 29 | **Puzzle ships**, each tests one law with a small raced quantity, a race between two rates, and a penalty independent of hull size (HANDOFF lesson): Fortress (dependency: cut the power wall before its superweapon charges); Furnace (throughput: its beams heat your shields faster than you radiate; go out of range or kill its radiators); Swarm (missiles vs point defence, decoys, running cold); Ghost (information: locate the EM-bright jammer, close in, scan); Lance (spinal railgun: kill its RCS, attack from the flank) |
| 30 | **Every battle has a physical clock** (a superweapon charging, reinforcements arriving, an overloading reactor), so attrition does not always win |
| 31 | Measurement: the intended answer wins ≥ 3 of 4 layout variants; the naive answer (more hp, more guns) loses ≥ 3 of 4 |
| 32 | **Modes: ladder + roguelite.** Ladder: puzzle ships in a fixed order, by chapter, unlocks rooms. Roguelite: random variants of ships already beaten, only rooms unlocked in the ladder, **score only** (separate economy) |
| 33 | **Intact salvage**: destroying gives scrap (credits); disabling (power cut, decapitation, mission kill) recovers intact rooms; the first intact room of a new type **unlocks** it |
| 34 | Hull size opens in tiers; the square–cube law keeps bigger from being strictly better. Repairs per cell cost credits. **Ships are never lost permanently** |
| 35 | Roguelite environments each change **one constant of one law**: nebula (scan weaker), near a star (radiators worse, IR background noise), asteroid belt (trajectories blocked, cover), gravity well (background pull) |

## 8. Standing orders and battle

| # | Decision |
|---|---|
| 36 | **Coverage rule**: every in-battle decision has exactly one owner: an automatic rule (one right answer), a standing order (answer depends on the opponent), or a player verb (judgement in the moment). Every new law goes through this table |
| 37 | **Automatic**: RCS recoil compensation; point defence picks the nearest missile; crew repair order follows the power priority list; reactor containment always first; fragments without the bridge |
| 38 | **Standing orders (12 slots in 4 groups)**. Movement: engagement range, position relative to the enemy (bow / flank / stern), movement style (hold / orbit / strafe), dodging (never / missiles only / always). Firepower: facing, firing style (salvo / ripple), open fire (in range / sure hit), default target priority. Energy: power and repair priority, heat discipline (threshold and response: cease fire or back off). Emission: emission posture (cold / normal / full), auto-scan (on / off). Shields follow the emission posture |
| 39 | **Presets** bundle the orders ("Cold approach", "Gun duel", "Flank"); the in-battle verb switches presets, never single slots. The harness sweeps presets |
| 40 | Helm conflict resolution, fixed order: **position, then facing, then dodging**. The report records which order yielded |
| 41 | **Report**: the **KIA list first**; the **cascade tree** (each damage event carries its cause); timeline of scans and targets; what the enemy scanned of you; heat graph; salvage and unlocks; kill-cam replay (deterministic re-simulation from seed + player inputs) |

## 9. Architecture

| # | Decision |
|---|---|
| 42 | Kernel without DOM (runs in Node). **The renderer reads only the player's knowledge model, never the truth.** Every damage event carries its cause id. Two RNG streams: simulation and effects (bridge-sim §8 v0.31: drawing consumed the sim's `Math.random`) |
| 43 | Files. Foundation: `data.js`, `util.js`, `events.js`. Kernel: `layout.js`, `graph.js`, `body.js`, `heat.js`, `field.js`, `projectile.js`, `damage.js`, `sensors.js`, `helm.js`, `crew.js`, `enemy.js` (bridge-sim's when → do engine, enemy only), `battle.js`. Meta: `campaign.js`, `run.js`. Presentation: `renderer.js`, `effects.js`, `ui.js`, `shipyard.js`, `report.js`. Tools: `tools/harness.js` (Node), `tools/campaign.js` (Node), `tools/smoke.js` (Playwright) |
| 44 | Order of work: 0.1 layout, graphs, rigid body, kinetic, per-cell damage, fragments, harness, smoke, a target dummy (**playtest gate**: is a ship breaking apart compelling?); 0.2 heat, beam, shields, fields; 0.3 knowledge model, scan verb, scan-proof plating; 0.4 helm, orders, presets, enemy script, first puzzle Fortress (≥ 3 of 4 criterion); 0.5 report with cascade tree (**playtest gate**: does the player understand why they lost?); 0.6 missiles, point defence, Swarm; then ladder, salvage, roguelite, environments |

## 10. Presentation and crew

| # | Decision |
|---|---|
| 45 | Art direction **hybrid**: rooms in pixel art, effects (glow, plasma, beams) smooth |
| 46 | **Every effect has a physical cause in the simulation** ("beautiful but not absurd"). Per-law visual signatures: per-room black-body heat glow; recoil kick and RCS puffs; visible tracers and missile trails; shields visible only while absorbing, ripples, flickering gaps; fragments tumbling with real momentum, glowing fracture edges; cascades with a short delay between rooms; reactor breach countdown, white flash, expanding plasma shell and debris (**no shockwave in vacuum**); unscanned zones under sensor noise, scanline reveal. Venting gas drawn small and short (its thrust was cut) |
| 47 | **Slow-mo automatic** with a **zoom into the breached room** (crew visible), rate-limited (one zoom per few seconds; priority: most crew, reactor breach). Slow-mo only changes sim steps per frame |
| 48 | Readability overlays (toggle): heat map, power flow, control flow, CoM and recoil vectors, scanned zones, firing arcs. Canvas 2D: hull cached offscreen and redrawn on damage, additive glow, pooled particles with a cap, quality setting, `--perf` in the harness |
| 49 | **Crew**: no walking, no player orders. Named crew sit at their stations (idle animation only). When a room is destroyed its crew die: lights out, bodies pulled into vacuum, last words on comms, then silence. Lifesigns on the HUD only go down. Enemy lifesigns visible only in scanned zones; the report counts enemy dead. **Purpose: the player must feel life and death, not pixels** |
| 50 | Death is **permanent**; replacements cost credits (the only mechanical consequence). **Memorial wall** in the hangar. **Sober tone, no gore** |
| 51 | Repair: crew quarters repair rooms within a radius, scaled by its surviving cells |
| 52 | Building is now a moral choice too: a magazine next to a 20-person compartment, armour around the quarters |

## 11. Scale

| # | Decision |
|---|---|
| 53 | **Game scale**: sim and drawing share one scale; ships fight 4–8 ship lengths apart (rejected: magnifying ships only when drawn, which makes shots hit empty space; FTL-style split view) |
| 54 | Starting numbers (T1): cell 5 m (one deck); starter hull 30×14 cells (≈150×70 m, ~15 rooms); engagement 0.6–1.5 km; kinetic 0.5–1 km/s (1–3 s flight); spinal railgun 1.5–2.5 km/s; missiles accelerate, 8–15 s flight; dodging 1–2 g; **battle 3–6 minutes**. Engagement range stays 4–8 ship lengths at every tier; bigger weapons have longer range and faster rounds |
| 55 | Camera fits both ships (each ~10–15% of the screen width on desktop, ~150–200 px on a phone) |

## 11b. Shipyard and hull tiers

| # | Decision |
|---|---|
| 56 | **Free-form inside a drydock** (the tier's bounding box), plus a few **templates** as starting points. No fixed hull masks. The core laws must punish degenerate shapes themselves; the harness checks a snake ship against a compact one on the same budget, and if the snake wins the laws are incomplete |
| 57 | **Validation** (an invalid ship never undocks): every room connects to the bridge through shared walls; hull-required rooms touch the hull; the spinal railgun lies on the axis; **engine exhaust must be clear** (no room behind it) |
| 58 | **Live physics readout** while building: CoM and thrust line, acceleration in g and turn rate, heat balance at full fire vs radiator capacity, power balance and wall bottlenecks, hull segments used, shield coverage and firing arcs, crew per room. **Dry run** in the shipyard (deterministic headless battle vs a dummy or a known enemy variant) |
| 59 | Controls: room palette, drag and drop, **rotate 90°** (some rooms have a fixed direction: engines face aft, the spinal railgun faces forward), tap a hull segment to choose its fitting, undo, mirror tool, blueprints saved and exported as a string |
| 60 | **Crew capacity**: crew quarters set the total crew; each room needs its crew to be placed. A build-time constraint (crew quarters become a real dependency), never in-battle micro |
| 61 | **Cells scale with the tier; the cell count stays roughly constant.** Bigger ships get bigger rooms, not more of them (a battleship mounts one 15-inch gun, not ten 30 mm). Starting table: T1 Corvette 5 m, 30×14; T2 Frigate 7.5 m, 34×15; T3 Destroyer 10 m, 38×16; T4 Cruiser 15 m, 42×18; T5 Battleship 20 m, 46×20; T6 Capital 30 m, 50×22. No hard cap at T3 |
| 62 | Every tier still offers **S/M/L** sizes, so a capital mounts a main battery and secondaries (its S is bigger than a corvette's L) |
| 63 | **Room stats come from scaling formulas, not hand tables** (shell mass ∝ calibre³, round speed from barrel length, recoil from momentum, traverse from moment of inertia). Cell mass ∝ edge³, hull segment area ∝ edge², so the square–cube law emerges by itself |
| 64 | Each ship has its own local grid and cell size; a round resolves against the target's grid. **Armour thickness scales with the cell**, so small rounds cannot penetrate capital armour; a corvette beats a capital with torpedoes, EMP, or by shooting exposed fittings (radiators, RCS, antennas). Enemy capitals are natural bosses early in the ladder |
| 65 | Casualties scale: the report names officers and groups the rest ("Lt. Mara Okafor and 37 crew of Deck 4"); the memorial wall lists everyone |

## 11c. Platform

| # | Decision |
|---|---|
| 66 | **Primary device: an Android phone.** Battle is **landscape**; hangar and report work in portrait too |
| 67 | Touch: no hover, touch targets ≥ 44–48 px; the 3 verbs are taps (zone, room, preset buttons); pinch zoom; crew are visible only when zoomed (slow-mo zoom and pinch are therefore required) |
| 68 | Performance budget is the phone's (slower CPU, thermal throttling): constant cell count per tier, lower particle cap, automatic quality |
| 69 | **PWA**: installable to the home screen, full screen, offline after the first load (a manifest and a service worker, no build) |
| 70 | Tests: Playwright phone viewport and CPU throttling for smoke and `--perf`; **every playtest gate is also run on the owner's Android phone** |

## 12. Idea registry (not built; each must pass the four gates)

Named crew with veterancy; escape pods; rescuing crew on drifting fragments
after battle; sound carried through the hull (only your own ship is heard,
enemy explosions are silent).

## 13. Still open (discuss before writing the design docs)

1. ~~Shipyard and hull tiers~~ (decided, §11b)
2. Economy numbers (room and fitting prices, per-cell repair, crew replacement, salvage)
3. Chapter 1 (puzzle order, how each law is taught)
4. Concrete combo list for the 11 rooms and 5 fittings
5. Enemy AI (assumed: same helm and standing orders, plus the puzzle script)
6. Difficulty (bridge-sim lesson: mechanics, not stat scaling per win)
7. Sound
8. Game title (the repository is `Starship_construction`)
