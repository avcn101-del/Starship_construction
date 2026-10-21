# Duct Tape Navy: Mostly in One Piece — Design

Status: designed 2026-10-20; **Mission 0 L0 (materials) passed and merged; L1 in progress**, no game yet. Mission 0 (§13) comes
before any content or rendering. Numbers in brackets (#n) point to the row
in `DECISIONS.md` that records the decision and why. This file is the
current design and the source of truth; `DECISIONS.md` is the dated log.

## 1. Vision

**You are a privateer captain who fights for the underdogs and fights dirty.
You build a ship from rooms, prepare it, and win fights you should lose.
Physics is real enough to be exploited; people are real enough to be
mourned.**

| Pillar | Borrowed from | How it shows in play |
|---|---|---|
| **Ships built from rooms** | Pixel Starships (rooms on a grid); real naval design (a battleship mounts one big gun, not ten small ones) | Free-form building inside a drydock; rooms are compartments with functions; bigger hulls get bigger rooms, not more of them |
| **Physics that is not absurd** | Real physics: Newton, thermodynamics, radar, the square–cube law | Guns recoil, heat must be radiated, infrared reveals hot surfaces, active scans reveal the scanner, big ships have little hull per tonne, reactors fail safe |
| **The underdog fights dirty** | Firefly (tone), privateers under a letter of marque | Six ways for the weak to beat the strong; capturing ships for prize money; a captain's voice that is dry and funny while death stays heavy |

| Topic | Decision |
|---|---|
| Format | PvE, **1v1 first** (#1) |
| The player | Builds the ship and sets standing orders; in battle three verbs (scan a zone, target a room, switch preset) and pause; never steers, never writes scripts (#2) |
| Platform | **Android phone first**, landscape battles, installable PWA, offline (#66–#69) |
| Tech | Plain HTML/CSS/JS, ES modules, no build, no npm, Cloudflare Pages; the simulation kernel runs headless in Node (#3) |
| Language | The game is in English; all player-facing text lives in one place in `data.js` |
| Tone | Dark comedy with plot twists; the captain jokes, death stays heavy; sober, no gore (#50, #160, #161) |
| Title | *Duct Tape Navy: Mostly in One Piece* (#162) |

## 2. Rules every idea passes

**Three core laws** (`DECISIONS.md` §2):

| Law | Meaning |
|---|---|
| **Throughput** | Synergies are real but share one flow with a fixed rate (power, ammunition, heat, blast). Diminishing returns come from the shared flow. Alpha strikes are limited by throughput, wasted overkill and over-penetration, and recoil |
| **Dependency** | Every strength hangs on something that can be shot. A stronger ship has more dependency chains, so more weak points |
| **Information** | You cannot target what you have not scanned. Hiding costs something under the other two laws |

**Six ways the weak beat the strong**, each must stay reachable: mission
kill, cascade, information, time window, attrition, mechanism counter.

**Gates and rules**

| Rule | Statement |
|---|---|
| Four gates for a physics law | It serves a core law; it opens or strengthens an underdog path; it is readable on screen; it reuses a model the kernel already has. All four or it is cut |
| Coverage | Every in-battle decision has exactly one owner: an automatic rule (one right answer), a standing order (depends on the opponent), or a player verb (judgement in the moment) (#36) |
| Attributes | Every attribute must earn its place with a measured effect in Mission 0; an attribute with none is cut (§5.1) |
| Effects | Every visual or sound has a physical cause in the simulation: beautiful but not absurd (#46, #153) |
| Ammunition types | One physical parameter traded for another; a best and a worst target; one counter; serves a core law (#94) |
| Named ships | Each tests one law (later two) with a small raced quantity, a race between two rates, and a penalty independent of hull size; the intended answer wins ≥ 3 of 4 variants, the naive one loses ≥ 3 of 4 (#29, #31) |
| Tells | Every special enemy mechanic has a physical precursor visible to passive sensors seconds before it happens (#114) |
| Difficulty | Only mechanics, never hidden stat multipliers (#122) |
| Ideas | New ideas go to `IDEAS.md` and pass the gates before they are built |

## 3. The loop

1. **Shipyard**: build the hull from rooms and fittings, set the magazine's
   contents, set standing orders and presets, read the intel journal,
   dry-run headless against a dummy or a known enemy variant, undock.
2. **Battle**: the ship fights on its orders; the player scans zones,
   targets rooms, switches presets, may pause. 3–6 minutes, with a physical
   clock (#30).
3. **Report**: the KIA list first, the cascade tree, scans and targets on a
   timeline, what the enemy learned of you, heat, salvage, kill-cam (#41).
4. **Progress**: intact salvage unlocks room types; credits buy rooms,
   repairs, replacements and drydock tiers; the memorial remembers.

Two modes (#32): the **ladder** (named ships in a fixed order, by chapter,
unlocks) and the **roguelite** (random variants of beaten ships, ladder
unlocks only, score only).

## 4. Physics

Principle: **borrow the shape of the real law, tune the constant** (#4).
**No dice**: hits are decided by trajectories; a seed is a layout variant
(#7). Four kernel models: 2D rigid body, per-room heat, falloff fields,
projectiles (#8).

| Law (kept) | In the game |
|---|---|
| Inertia, moment of inertia | Mass far from the centre turns slowly; recomputed when blocks are lost |
| Recoil (Newton 3) | Kinetic weapons recoil hard, beams barely; off-axis guns spin the ship; RCS compensates |
| Centre-of-mass shift | Losing a flank moves the CoM; aligned engines become off-axis |
| Heat and radiators | Heat leaves only by radiation, through radiators on the hull; **Stefan–Boltzmann**: radiated power ∝ area × emissivity × T⁴ (#143) |
| Infrared | Only surfaces are seen; deep reactors are invisible until heat reaches the hull; IR brightness also ∝ T⁴ (#102) |
| Inverse-square, distance⁴ | Beams, passive sensing and jamming fall off with distance²; active scans with distance⁴ (#24) |
| Time of flight | Rounds and missiles travel; ships dodge |
| Square–cube | Cell mass ∝ edge³, hull area ∝ edge²: big ships have less hull per tonne (#63) |
| Fail-safe reactors | Losing control SCRAMs a reactor; decay heat follows (#81) |

Cut: kinetic energy ½mv² as damage, decompression thrust, I²R resistance.
Deferred: sloped armour (#6).

| Topic | Decision |
|---|---|
| Hits | A shot enters the first cell on its path; over-penetration loses the remaining momentum; debris blocks shots (#9) |
| Damage channels | **Kinetic** (momentum: each cell takes part by its resistance; the ships' relative velocity is not counted), **thermal** (absorbed beam energy, which also becomes heat in the target room), **blast**, **EMP** (#137, #138) |
| Shields | An energy screen: an absorption rate plus a small buffer; everything stopped, kinetic included, costs budget and becomes heat (#21, #139) |
| Fields | One rule: each source has a finite budget spread over its coverage with falloff; overlaps add, each source paying from its own budget (#99) |
| Explosions | Through shared walls inside a ship; a radial field outside it (#141) |
| Propellant | Ships have none to run out of (reactor drives); craft have a delta-v budget (#140) |

## 5. Ship model

Scale rule: anything smaller than a compartment never occupies a cell (#10).
Three placement layers: rooms on cells, shared walls, hull edge segments
(#11).

**Six wall channels** (#12, #18): structure and control are connectivity
only; power, ammunition, heat and blast flow with a capacity proportional to
the shared wall length. There is **no combo table**: every synergy is a flow
or a field, and a room's perimeter caps its neighbours (#18). Example: a
reactor beside a magazine conducts heat into it and the rounds cook off.

Fragments: a ship split by the structure graph becomes several rigid bodies
with momentum conserved; a fragment without the bridge SCRAMs and goes dark
(#13, #81). Rooms take damage per cell and work in proportion to surviving
cells (#16). Firing arcs are blocked by the ship's own rooms (#17). Three
heat thresholds for every room: hot (degrades), overheated (shuts down),
critical (cells damaged, **crew in the room die**) (#18b); the per-room
heat model and its two threshold classes are in §13c (#182). Empty holds
insulate and absorb blast (#18c).

### 5.1 Data model

Three kinds of entity: **blocks** (rooms and fittings) store attributes,
**munitions** (rounds, missiles, craft, decoys) store their own, **ships**
have only derived values (CoM, moment of inertia, acceleration, turn rate,
heat and power balance, signatures, arcs, coverage). Every numeric
attribute is a base value plus a **scaling exponent k** on the cell edge
(mass k=3, area k=2, length k=1).

| # | Block group | Attributes |
|---|---|---|
| 1 | Geometry | type, size, tier, placement rule, orientation |
| 2 | Mass and structure | density, hp per cell, price, scaling exponents |
| 3 | Resistances | kinetic, thermal, blast, EMP |
| 4 | Wall channels | structure, control (connectivity); power, ammunition, heat, blast (capacity coefficient) |
| 5 | Power | produced, consumed per state |
| 6 | Ammunition | capacity, contents, feed rate |
| 7 | Thermal | heat per state, heat capacity, conductivity, three temperature thresholds, radiator area and emissivity |
| 8 | Fields | type, budget, radius, falloff exponent (2 or 4) |
| 9 | Signatures | EM when active, radar reflectivity (IR is derived from surface temperature) |
| 10 | Control, crew, failure | provides or requires control; crew required and housed; behaviour on power loss, control loss, destruction (explosive energy), overheating |
| + | Action | weapon (calibre, launch energy, barrel length, fire rate, traverse), engine (thrust, exhaust direction), sensor (scan strength), hangar (launch rate, capacity) |

**Munition**: mass, launch velocity, seeker, warhead (channel and energy),
signature, hp (for point defence), fuel, reusable, pilot.

### 5.2 Rooms

| Room | Sizes | Placement | Profile |
|---|---|---|---|
| Bridge | 2×2 | inside | provides control; little power, **own backup supply** (#147); destroyed: every reactor SCRAMs |
| Reactor | 2×2, 3×3 | inside | power and much heat; SCRAM on control loss, decay heat; breach when heavily damaged; meltdown when critical |
| Engine | 2×3 | exhaust on the aft hull, **exhaust must be clear** | thrust and heat; exhaust very IR-bright; thrust through the CoM recommended, not required |
| Magazine | 2×2 | inside | ammunition by contents, fed through walls; explodes by the ammunition left (HE far more than AP) |
| Shield generator | 2×2, 3×3 | inside | shield field; EM-bright while absorbing; absorbing makes heat |
| Crew quarters | 3×2 | inside | houses crew, sets crew capacity (#60); repair field by surviving cells (#51) |
| Beam bay | 2×2, 3×3 | one side on the hull | much power, very much heat; its firing window stays open while firing |
| Kinetic turret | 2×2, 3×3 | one side on the hull | rounds and recoil; ammunition and some power |
| Spinal railgun | 2×N | on the axis, fires forward | longer barrel, faster round; axial recoil; very much power |
| Missile bay | 3×2 | one side on the hull | a small ready store refilled from the magazine; explodes by the missiles inside (#148) |
| Empty hold | 2×2 | anywhere | structure only; insulates, absorbs blast |

Later rooms: hangar bay (#107), jammer (#27), auxiliary bridge (#13). No
separate EMP room: EMP is a warhead (#142).

### 5.3 Fittings

One fitting per hull edge segment; a fitting takes power and control from
the room it is mounted on; the hull surface is the scarcest resource (#15).

| Fitting | Job | Notes |
|---|---|---|
| Armour | stops | high kinetic resistance, heavy, tiers |
| Radiator | dumps its room's heat (T⁴) | low hp; IR-bright |
| RCS | torque = distance × force | better far from the CoM |
| Point defence, kinetic | flak against munitions | its own small ammo store, can be exhausted (#93) |
| Point defence, laser | against munitions | power and heat |
| Sensor antenna | active scan, passive sensing | needs a control path to the bridge; EM-bright when scanning |

Later fittings: scan-proof plating (#27), decoy launcher (#149).

### 5.4 Tiers and scaling

**Cells scale with the tier; the cell count stays roughly constant** (#61).
Every tier offers S/M/L sizes (#62). Each ship has its own grid and cell
size; armour scales with the cell, so small rounds cannot penetrate capital
armour (#64). Casualty lists group the crew of big ships (#65).

| Tier | Cell | Grid |
|---|---|---|
| T1 Corvette | 5 m | 30×14 |
| T2 Frigate | 7.5 m | 34×15 |
| T3 Destroyer | 10 m | 38×16 |
| T4 Cruiser | 15 m | 42×18 |
| T5 Battleship | 20 m | 46×20 |
| T6 Capital | 30 m | 50×22 |

### 5.5 Shipyard

Free-form inside the drydock with templates (#56); validation: every room
connected to the bridge, hull rooms on the hull, the railgun on the axis,
clear exhaust (#57); live physics readout and dry run (#58); palette, drag
and drop, rotation by 90° with fixed-direction rooms, fittings by tapping a
hull segment, undo, mirror, exportable blueprints (#59).

## 6. Weapons, defence, ammunition

| Weapon | Physics | Flow | Recoil | Damage | Precision |
|---|---|---|---|---|---|
| Beam | light speed, falloff | power and very much heat | almost none | burns over time at a point; heats the room | best when scanned |
| Kinetic | time of flight | ammunition | strongest | momentum along the path | must lead the target |
| Missile | slow, guided | ammunition, tube | small | by warhead | by seeker |
| Point defence | against munitions | power or ammunition | small | — | — |

| Attack | Armour | Shield | Point defence | Decoys, running cold | Range | Sustain |
|---|---|---|---|---|---|---|
| Beam | burns through slowly | **stops well** | — | — | **weakens** | no ammunition, heat |
| Kinetic | **stops well** | partly | — | — | **dodged** | a stock |
| Missile | partly | partly | **shot down** | **misled** | not dodged | few, precious |

**Firing window** (#100): a shield opens a hole only where your own round
crosses it, only while it passes; beams hold it open while they fire.

**Ammunition** is finite for kinetics and missiles, reloaded free between
battles (#89, #90). Running dry counts toward Disabled (#91). Measured
target: default magazines last a disciplined 3–6 minute battle and run dry
around minute 4 when firing freely (#92). The player
sets magazine contents; each shot's type is chosen automatically against a
scanned target, the default against an unscanned one (#95).

| Kinetic round | Trade |
|---|---|
| Standard | balanced |
| AP | deep, almost no blast; wasted through thin rooms |
| HE | surface blast; the answer to exposed fittings |
| Sabot | lighter and faster, **less recoil**, less damage |
| Flak | proximity fragmentation against munitions |

**Missiles = seeker + warhead** (#97). Seekers: IR (radiators and exhaust),
radar, anti-radiation (homes on emitters), designated (your target room;
the capture tool). Warheads: HE, penetrator, EMP. Starter set: kinetic
Standard, AP, HE; missile IR + HE; the rest unlock by salvage (#98).

**Carriers** (after Mission 0, #104–#110): a craft is a reusable missile
with hp, fuel, payload and a named pilot. Four new rules only: launch and
recovery cycle, datalink (jammable), fuel, air wing orders (mission, recall
threshold, wave size, on datalink loss). No new verbs: scanning sends a
recon drone, targeting sends bombers. The hangar full of fuelled craft is
the biggest bomb aboard (the Midway window). Cap ~24 craft per side.

## 7. Information

| Topic | Decision |
|---|---|
| Free | The outer silhouette is always visible (#23) |
| Passive | IR and EM fall off with distance²; IR sees surfaces only (#24, #102) |
| Active | Scans fall off with distance⁴ and **reveal the scanner**; by zone, seconds each; positions remembered for the battle; room state needs passive tracking (#24, #25) |
| Jamming | Jams your own sensors too; burn-through when close enough (#101) |
| Shields | Do not block scans; EM-bright while absorbing (#103) |
| Counters | Jammer, scan-proof plating, running cold, heat decoys (#27, #149) |
| Symmetry | The enemy scans you too and knows only what it has scanned; one knowledge model per side; the renderer reads only the player's (#26, #42, #112) |
| Variants | Named ships have layout variants so scanning stays necessary (#28) |

## 8. Battle

**Standing orders, 12 slots in 4 groups** (#38): *movement* (engagement
range, position bow / flank / stern, movement style hold / orbit / strafe,
dodging); *firepower* (facing, firing style salvo / ripple, open fire in
range / sure hit, default target priority); *energy* (power and repair
priority, heat discipline threshold and response); *emission* (posture
cold / normal / full, auto-scan). Shields follow the posture. **Presets**
bundle orders; the verb switches presets, never single slots (#39). Helm
conflicts resolve as position, then facing, then dodging (#40).

| Decision in battle | Owner |
|---|---|
| Distance, side of the enemy, movement style, dodging, facing, firing style, when to open fire, default target, power and repair priority, heat response, emission, auto-scan | standing order |
| RCS recoil compensation, point defence target, repair order, reactor containment first, dark fragments, each shot's ammunition type | automatic |
| Which zone to scan, which room to target, which preset | player verb |

**Disabled** (#82): no weapon able to fire and no thrust for ~10 s, or the
enemy strikes its colours. The battle ends and the ship is captured. Routes:
cut the power walls, decapitate, split it at a choke point, mission kill,
EMP, overheat it, run it dry, surrender. **The loot is whatever is left**:
intact rooms, the blueprint, prize money; destroyed only when a reactor or
magazine explodes or the ship breaks into too many pieces (#83). The same
condition defeats the player (#84). Your crew on a dark fragment are
recovered after a win (#88).

**Report** (#41): KIA list first; cascade tree from cause-carrying events;
timeline; what the enemy scanned; heat; salvage and unlocks; deterministic
kill-cam.

## 9. Enemies

| Topic | Decision |
|---|---|
| Symmetry | Same automatic layer, orders, presets and three verbs; scripts (bridge-sim's when → do engine) hold only mechanics, personality and conditional reactions (#111) |
| Fairness | No information cheating, same delays, deterministic, no learning across battles; the player keeps an intel journal (#112–#116) |
| Personality | Aggression, patience, caution, resolve (#117) |
| Factions | Bundles of defaults: personality range, technology, one signature mechanic, surrender culture, look and voice. Three to start, one per core law; a ladder chapter is a faction (#118, #119) |
| Wildcard | Drawn once at battle start from the seed; never on a first ladder encounter; detectable; measured (#120) |
| Named ships | Working names: Fortress (dependency), Furnace (throughput), Swarm (missiles vs point defence), Ghost (information), Lance (spinal railgun). Each has a kill route and a harder capture route; some strike colours (#29, #85, #86, #121) |
| Difficulty | Seven mechanical levers; measured; one standard difficulty plus assists (game speed, longer tells, extended clock) and Ironman (#122–#124) |

## 10. Progression and economy

| Topic | Decision |
|---|---|
| Rules | Reward the core skill; never stuck; always a sink (#71). **Ships are never lost permanently**; repairs are per cell (#34) |
| Flows | Sources: reward, scrap, intact rooms, prize money. Sinks: rooms and fittings, per-cell repair, crew replacements, **drydock tiers** (#72) |
| Inventory | Rooms are owned items by type, size and tier; rearranging is free; destroyed rooms are repaired, not lost (#73); prices by formula (#74); tier-bound with trade-in (#75) |
| Safety nets | Free emergency repair after a loss (#76); a free beginner corvette (#77); beaten ladder ships replayable for half the reward (#78) |
| Unlocks | The first intact room of a type unlocks it (#33) |
| Captured ships | Commissioned only if your drydock has their tier, otherwise broken up or sold (#87) |
| Morality | No bonus for sparing enemy crew (#79) |
| Roguelite environments | Each changes one constant of one law: nebula, near a star, asteroid belt, gravity well (#35) |

## 11. Presentation (after Mission 0)

| Topic | Decision |
|---|---|
| Art | Hybrid: pixel-art rooms, smooth effects (#45) |
| Signatures | Black-body heat glow, recoil and RCS puffs, tracers and trails, shields only while absorbing, tumbling fragments, staggered cascades, breach countdown and plasma shell (no shockwave in vacuum) (#46) |
| Slow-mo | Automatic, with a zoom into the breached room, rate-limited (#47) |
| Overlays | Heat, power, control, CoM and recoil, scanned zones, arcs (#48) |
| Crew | Named, seated at stations, no walking; die when their room is destroyed or cooked; last words, then silence; lifesigns; KIA list; memorial wall; permanent death; replacements cost credits (#49–#52, #65, #88) |
| Sound | Nothing through vacuum: your hull, comms, alarms, sensor sonification under the information law; haptics on Android; synthesised; no battle music (#153–#157) |
| Setting and captain | A privateer under a letter of marque who fights for the underdogs, practical, cynical, with a slightly funny moral code (#158, #159) |
| Tone | Firefly-style dark comedy and plot twists; death stays heavy; no names or terms taken from Firefly (#160, #161) |

## 12. Scale and platform

Game scale: one scale for simulation and drawing; ships fight 4–8 ship
lengths apart (#53). T1 numbers: cell 5 m, hull 30×14, engagement 0.6–1.5
km, kinetic 0.5–1 km/s, railgun 1.5–2.5 km/s, missiles 8–15 s of flight,
dodging 1–2 g, battles 3–6 minutes (#54). The camera fits both ships (#55).
Phone first: touch targets ≥ 44–48 px, pinch zoom, the phone's performance
budget, Playwright phone emulation, every playtest also on the owner's
Android phone (#66–#70).

## 13. Mission 0

Foundations are proven **bottom-up, in text, before any content or
rendering** (#125, #126, #152).

| Level | Proves |
|---|---|
| L0 Materials | round vs plate, beam vs plate, a point in a shield field |
| L1 One room | each room alone: reactor, radiator, magazine, turret, shield generator, engine, crew quarters, bridge |
| L2 Pairs and clusters | flows through shared walls: power vs wall length, cook-off time, hold insulation, shield overlap |
| L3 Minimal ship | CoM, moment of inertia, recoil spin, split momentum, SCRAM in a fragment |
| L4 Ship vs static target | every capture route reaches Disabled; the cascade tree is right |
| L5 Ship vs ship | no dominant build; degenerate builds punished |
| L6 Scaling | T1–T6: square–cube, small rounds vs capital armour |

Each constant is tuned at the lowest level where it acts (#128). Output is
text: time series, a per-second battle log from L4, and **expected (formula)
vs actual, PASS/FAIL** for every scenario; "many runs" means sweeping
initial conditions, since a seed repeats exactly (#129). Accepted risk: the
feel is unverified until after L5 (#130).

**Scenario spec** (#144): `id`, `level`, `laws`, `dependsOn`, `setup`,
`run`, `measure`, `expected`, `tolerance`, `criterion`, `locked` (date and
hash), `tunable`. Folders `mission0/scenarios/` and `mission0/results/`;
`MISSION0.md` is the ledger generated from the results. Tunable constants
carry approved `min`–`max` ranges (#145).

**Units**: SI throughout the simulation (#163).

**Exit criteria** (#164), all eight required:

| | Criterion |
|---|---|
| E1 | Every L0–L6 scenario PASSes its locked criterion |
| E2 | Invariants on every sweep: same seed → same log hash; momentum conserved at splits; heat generated = radiated + stored; no NaN |
| E3 | Every kept physics law has at least one passing proof scenario |
| E4 | Every schema attribute has a measured effect, or it is cut |
| E5 | No build wins more than 75% against the reference set; every degenerate build loses ≥ 3 of 4 against the reference ship on the same budget |
| E6 | Each underdog path: a 60%-budget ship beats a 100% one with the intended tactic and loses without it |
| E7 | The median reference battle lasts 3–6 minutes |
| E8 | T1 and T6 1v1 battles cost at most a quarter of the phone's frame budget per step in Node (milliseconds set at L3, approved, then locked) |

**L0** (#165, #166): seven material scenarios; kinetic penetration by
sectional momentum (p/A) so same-tier rounds and armour balance; beams as a
Gaussian beam (flat within the focus range, then 1/d²).

**After the L0 review** (#169–#175): blast spreads as a wave front, with
damaged and destroyed reported apart and a provisional open-face coupling;
the shield's per-point cap can double-count its budget, to be resolved
before L2; `shield.kineticStop` is computed exactly from the S round;
`shield.radius` is the half-strength radius; L0's "AP" is the plain steel
round; locked L0 criteria stay and stronger v2 scenarios follow; heat
invariants that hold by construction do not count towards E3; records hash
`run()` too; the step and burn limit live in `data.js`.
The five **v2 scenarios** and `he.coupling` (0.5, 0.2–0.8) are approved
(#176): vented energy at the open face, damage falling with distance,
one-sided burn time with a heat floor, continuous penetration depth, the M
beam itself against the shield, and an S round stopped exactly with
`kineticStop` swept over its range.

**L1** (one room alone; #181–#184): approved 2026-10-21, the full plan is
§13c: nine rooms (the eight of #127 plus the beam bay), the per-room heat
model with two threshold classes, 13 scenarios and their constants.

**Agentic operation** (#131–#136): parallel within a level, gated between
levels; runner, verifier (independent, re-runs from the command line only),
analyst, integrator (the only writer of `data.js` and the ledger); criteria
locked before running; overrides instead of edits; no conclusion without a
re-runnable command; multi-agent waves only with the owner's go-ahead;
agents tune within approved ranges, the owner decides criteria, out-of-range
constants and law changes; the feel and phone playtests are never
delegated; the kernel and scenario framework are written first by one
agent; nightly regression.

## 13b. Roles

| Role | Does | Never |
|---|---|---|
| Lead designer | discusses with the owner; keeps `DESIGN.md`, `DECISIONS.md` | reviews its own code |
| Engineer | builds a level as designed; one branch, one PR | changes the design (asks in the PR) |
| Reviewer | reviews a PR against `DESIGN.md` and `CLAUDE.md`; re-runs; comments | edits, approves, merges |
| Physics checker | derives expected results blind, posts them, then compares | sees the answer first |

Each role is its own session, defined in `.claude/agents/`; work is handed
over through pull requests; reviewers get artifacts, not conclusions (#167).
**Approval tiers** (#180): the owner decides **direction** (vision, core
laws, verbs and loop, adding or removing a law, what is built or cut,
setting and tone, spending caps, anything flagged as uncertain or
irreversible); the **lead designer decides everything technical**
(scenarios, criteria, formulas, constants, ranges, exponents, models that
implement a decided law, architecture, process), records each as a row
marked *LD* in `DECISIONS.md`, reports it in `STATUS.md`, and merges a pull
request once the reviewer and the physics checker report no blocking
finding; the owner can veto any row afterwards. Documentation-only commits
by the lead designer go straight to `main`; code always goes through a pull
request. The current state for a new chat is in `STATUS.md` (#179).

## 13c. L1 plan (approved 2026-10-21, #181–#184)

L0 proved the materials. L1 proves that **each room alone** behaves as its
laws say, over time, at the simulation step (1/60 s, #175): heat per room
with three thresholds (#18b), radiators by T⁴ (#143), the reactor's
fail-safe chain (#81), the magazine as a bomb (#91), the turret's rate and
recoil, the shield generator's heat (#21, #139), the engine's thrust and
heat, the crew quarters as crew capacity and repair field (#51, #60, #99),
the bridge's control and backup supply (#147). Every number enters
`data.js` with a range; every effect raises an **event with a cause id**
(#156), which L1 fixes once so the kernel need not change later. Rooms at
L1: the eight of #127 plus the **beam bay** (#181), whose heat is the
Furnace's whole mechanic. Numbers are T1, size M, SI.

### 13c.1 The heat model (`js/heat.js`, #182)

| Rule | Statement |
|---|---|
| State | Each room stores heat Q (J); its temperature is T = Q / C, absolute, with C = cells × `thermal.heatCapacityPerCell`. Rooms start at `thermal.restTemperature` (290 K). Space is at 3 K, taken as 0 |
| Generation | Each room adds the heat its state generates (reactor: heatPerPower × delivered power; beam bay: draw − beam power; shield generator: draw + absorbed; engine: draw × heatFraction; turret: heatPerShot per shot; bridge and quarters: their draw) |
| Radiator | A radiator on a hull segment of a room radiates εσA T⁴ of **that room's** heat (Stefan–Boltzmann, real σ, ε = 0.9). Its IR brightness is the same number (#102, #143) |
| Conduction | Between rooms through shared walls: **L2**, not L1 |
| Thresholds | Per room class, three temperatures: **hot** (function degrades: not modelled at L1 beyond the event), **overheated** (the room shuts itself down: no function, no own heat; it restarts when T falls below hot), **critical** (the crew in the room die; a magazine cooks off; a reactor melts down) |
| Two classes | **Plant rooms** (reactor, beam bay, shield generator, engine): hot 600 K, overheated 800 K, critical 1000 K. Their temperature is the plant's working temperature; the crew at their stations die when the plant is critical. **Crewed rooms** (bridge, crew quarters, turret, missile bay, empty hold): 330 / 350 / 380 K. **Magazine**: 330 / 350 / 450 K (cook-off). Consequence, measured at L2: a crewed room sharing a wall with a working reactor cooks unless a hold insulates it (#18c), which is the intended layout pressure (#18, #52) |
| Integration | Explicit Euler at `simStep`; stable while dt × 4εσAT³ / C ≪ 1 (2e-3 at 1000 K with the values below) |
| Invariant (E2, counts for E3 now, #174) | Per room and per run: heat generated = heat radiated + heat stored, to 1e-9 relative |

Cells have an **integrity** in [0, 1]: a cell a round passes is 0
(destroyed); a blast lowers it by absorbed energy / resistance (L0's
"damaged"); repair raises it (§3.11). **Crew die per destroyed cell**
(`crewPerCell` of the room's crew each, #49 refined) and all at once at
critical heat (#18b).

### 13c.2 Scenarios (#181)

Conventions as in L0 v2 (#176): inputs from `data.js`; threshold crossings
are **one-sided**, expected ≤ actual < expected + dt; closed forms to 1e-9
relative unless stated; no case sits exactly on a threshold unless it tests
that threshold (#177). Tier sweeps T1–T6 use the scaling exponents of §4.
Every scenario also checks the heat invariant, no NaN, and that every event
carries time, room, cause id and the fields of #156.

| # | Scenario | Setup and measure | Expected (formula) and criterion |
|---|---|---|---|
| 1 | `L1.radiator.cooling` | a hull room (idle turret) at T0 ∈ {400, 600, 800, 1000, 1200 K}, n ∈ {1, 2} radiators, no generation, 60 s; tiers at T0 = 1000 K | T(t) = (T0⁻³ + 3 n εσA t / C)^(−1/3); relative error ≤ 1e-3; radiated + stored = initial heat to 1e-9 |
| 2 | `L1.radiator.steady` | the same room with generation P ∈ {0.1, 0.5, 1, 2 MW}, n ∈ {1, 2, 4}, run 3600 s (cases with T_ss below critical only) | T_ss = (P / (n εσA))^(1/4); \|T(3600 s) − T_ss\| / T_ss ≤ 1e-3; radiated power at the end = IR brightness = P within 1e-3. **Recorded FAIL** (#185: 3600 s is under two time constants; a specification error, the lock stays) |
| 2b | `L1.radiator.steady.v2` (#185) | an idle M beam bay (plant class, hull room), P ∈ {0.1, 0.5, 1, 2 MW}, n ∈ {1, 2, 4}, cases with T_ss below the plant critical; (a) started at T_ss for 600 s; (b) started at rest for 3600 s | T_ss = (P / (n εσA))^(1/4); (a) \|T − T_ss\| / T_ss ≤ 1e-6 at every step, radiated power = IR brightness = P within 1e-6 at the end; (b) T rises every step, never exceeds T_ss, and T_ss − T shrinks every step |
| 3 | `L1.room.thresholds` | each of the nine rooms heated by an external P (no own generation, no radiator) | t_x = C (T_x − T_rest) / P for hot, overheated, critical, one-sided; events in that order; at critical the room's crew die (deaths = crew housed or required); the magazine cooks off; the reactor melts down |
| 4 | `L1.reactor.power` | reactor at demand d ∈ {0, 0.25, 0.5, 1} of `reactor.power`, no radiator; tiers | delivered = d P exactly (demand-driven); heat rate = h d P; time to overheated one-sided; at overheated it shuts down: delivered = 0 within one step, decay heat begins |
| 5 | `L1.reactor.scram` | running at full from T_s ∈ {rest, 600 K} (and idle from rest); control cut at t_s; cause id 'control-loss' (EMP later uses the same path) | delivered → 0 within one step; decay heat P_d(t) = f h P e^(−t/τ); heat added by t = f h P τ (1 − e^(−t/τ)) to 1e-3; **no decay heat from an idle reactor**; meltdown iff C (T_crit − T_s) < f h P τ, at t = −τ ln(1 − C (T_crit − T_s) / (f h P τ)) one-sided (yes from 600 K, no from rest with the values of §4); the explosion event carries `reactor.explosionEnergy` |
| 6 | `L1.reactor.breach` | destroy cells one at a time; M (4 cells) and L (9 cells) | the countdown starts at the cell that makes destroyed / total ≥ `reactor.breachFraction` (this **is** the threshold test: 2 of 4, 5 of 9); the explosion comes `reactor.breachCountdown` later, one-sided, with `reactor.explosionEnergy`; a reactor destroyed entirely explodes at once |
| 7 | `L1.magazine.cookoff` | contents by mass ≤ `magazine.capacity`: all AP, all HE, half and half, size S and L, half full; heated by P; also destroyed by damage; tiers | counts = floor(capacity / round mass of the size) (150 M, 506 S, 44 L at T1); explosion energy = n_AP × charge + n_HE × (charge + `he.blastEnergy`), sizes scaled by (2/3)³ and (3/2)³, exact; cook-off at t = C (T_crit − T_rest) / P one-sided; the event carries energy and the cause ('heat' or the damaging hit) |
| 8 | `L1.turret.fire` | ammunition n ∈ {5, 150}; measured at t ∈ {1, 9.5, 99.5, 399.5 s} (never on a shot time); powered and unpowered; tiers (rate k = −1) | shots = min(n, 1 + floor(rate × t)); recoil impulse = shots × m v with m from `roundGeometry`, exact; heat = shots × heatPerShot; energy drawn = draw × time while able to fire; dry or unpowered → ceases fire (event) |
| 9 | `L1.shield.generator` | generator on, beam P_in ∈ {2, 5, 10, 30 MW} at the generator (strength 1); powered and unpowered; tiers | absorbed rate = min(P_in, budget) (L0); heat rate = draw + absorbed; time to overheated one-sided; after shutdown passed = P_in and heat rate 0; unpowered: field off from the start; EM signature while absorbing = absorbed power |
| 10 | `L1.engine.thrust` | throttle u ∈ {0, 0.5, 1}; ship mass given as m ∈ {1000, 1500 t}; powered, unpowered, uncontrolled; tiers | thrust = u F; draw = u D; heat rate = u D h; a = u F / m exact; no power or no control → thrust 0 and draw 0 (#4d); time to hot at full throttle one-sided |
| 11 | `L1.quarters.repair` | quarters with c ∈ {6, 3, 1, 0} surviving cells; one target room with one destroyed cell at r ∈ {0, 0.5, 1, 2, 4} × radius | housed crew = crewPerCell × c, deaths per destroyed cell = crewPerCell; repair rate = `repair.rate` × (c / 6) × g(r), g(r) = 1 / (1 + (r / radius)²) (#99, as the shield); time to integrity 1 = 1 / rate', one-sided; c = 0 → no repair |
| 12 | `L1.bridge.control` | bridge with reactor power on, cut, and destroyed cell by cell | control = true while any cell survives; power cut → still true (backup supply, #147); destroyed → false, event 'control-lost' with the destroying hit as cause; heat from its draw, time to hot one-sided |
| 13 | `L1.beambay.heat` | beam bay firing at full; powered and unpowered; tiers | draw = beam.power / efficiency; heat rate = draw − beam.power; times to hot and overheated one-sided; at overheated the beam stops (power 0, draw 0, event); unpowered → no beam |

Scenarios 4–13 depend on 3 (the thresholds) and 1 (the integrator); 9 on
`L0.shield.point.v2`; 8 on `L0.kinetic.penetration`. Expected formulas live
in the scenario files, so the lock covers them.

**What L1 does not test** (honest scope): conduction between rooms,
radiators cooling a reactor (the reactor is placed inside, so its heat
reaches a radiator only through walls: L2), the repair budget shared among
rooms (L2), recoil spin and CoM (L3), control paths through the structure
graph (L3), ammunition feed through walls (L2), the "hot" degradation of
function (no model yet; the event only).

### 13c.3 Constants and approved ranges (#183)

Rate-like constants of a room (power, draw, thrust, budget) belong to its
footprint: an L room (3×3) has 9/4 of the M value, which is `sizeLinear.L`²
and the same rule as the beam and shield at L0.

| Constant | Value | Range | k | Note |
|---|---|---|---|---|
| `FIXED.stefanBoltzmann` | 5.670374e-8 W/m²K⁴ | fixed | — | real |
| `FIXED.restTemperature` | 290 K | fixed | — | rooms start here |
| `radiator.emissivity` | 0.9 | fixed | — | real, a dark panel |
| `thermal.heatCapacityPerCell` | 6e5 J/K | 2e5–2e6 | 3 | sets the pace of every heat race: an M beam bay alone reaches hot in 99 s and shuts down at 163 s |
| `thermal.plant.hot / overheated / critical` | 600 / 800 / 1000 K | 450–750 / 650–950 / 850–1300 | 0 | reactor, beam bay, shield generator, engine |
| `thermal.crewed.hot / overheated / critical` | 330 / 350 / 380 K | 320–350 / 340–380 / 360–420 | 0 | bridge, quarters, turret, missile bay, hold |
| `thermal.magazine.hot / overheated / critical` | 330 / 350 / 450 K | 320–350 / 340–380 / 400–500 | 0 | critical = cook-off |
| `radiator.area` | 25 m² | 10–100 | 2 | one panel per 5 m segment; 165 kW at 600 K, 523 kW at 800 K, 1.28 MW at 1000 K |
| `reactor.power` | 20 MW | 5–50 | 2 | electric, delivered on demand; k = 2 matches its consumers (beam, shield, engine), so a layout's power balance is tier-invariant; the square–cube law lives in mass and hull area (#63), not here |
| `reactor.heatPerPower` | 1.0 | 0.5–3 | 0 | waste heat per delivered watt |
| `reactor.decayFraction` | 0.07 | 0.03–0.15 | 0 | decay heat at SCRAM as a fraction of the thermal power at SCRAM (real: ~7%) |
| `reactor.decayTime` | 900 s | 300–1800 | 0 | exponential decay (the real power law borrowed in shape, #4); 1.26 GJ in total: a reactor SCRAMmed hot melts down in ~21 min without cooling, one SCRAMmed from rest never does, so EMP disables without destroying (#82) |
| `reactor.breachFraction` | 0.5 | 0.25–0.75 | 0 | destroyed cells that start the countdown |
| `reactor.breachCountdown` | 10 s | 3–30 | 0 | #81 |
| `reactor.explosionEnergy` | 200 MJ | 50 MJ–1 GJ | 3 | breach and meltdown; a full HE magazine is 375 MJ |
| `beambay.efficiency` | 0.4 | 0.2–0.8 | 0 | draw = beam power / efficiency; the rest is heat (7.5 MW for the M beam) |
| `shield.powerDraw` | 2 MW | 0.5–10 | 2 | while on; becomes heat, plus everything absorbed |
| `engine.thrust` | 8 MN | 2–30 | 2 | two M engines give a 1500 t corvette ~1 g (#54); k = 2 makes big ships sluggish (a ∝ 1 / edge) |
| `engine.powerDraw` | 10 MW | 2–40 | 2 | thrust and power are independent constants: ships have no propellant (#140) |
| `engine.heatFraction` | 0.3 | 0.1–1 | 0 | |
| `turret.fireRate` | 0.5 /s | 0.2–2 | −1 | big guns fire slower; momentum per second then scales k = 2 like the beam |
| `turret.powerDraw` | 200 kW | 50 kW–1 MW | 2 | |
| `turret.heatPerShot` | 0.3 MJ | 0.1–1 | 3 | |
| `kinetic.chargeEnergy` | 0.5 MJ | 0.2–2 | 3 | propellant energy per M round (its muzzle energy is 160 kJ); an AP magazine explodes by this alone, HE by this plus the warhead (#91) |
| `magazine.capacity` | 75 kg | 25–250 | 3 | 150 M rounds: 5 min of one turret firing freely; #92 is tuned at L4 |
| `quarters.crewPerCell` | 3 | 1–8 | 2 | 18 crew in a T1 quarters, 648 at T6 (#65) |
| `quarters.powerDraw` | 50 kW | 10–200 | 2 | |
| `repair.rate` | 0.02 /s | 0.005–0.1 | 0 | integrity per second at the generator with all cells surviving: 50 s per cell |
| `repair.radius` | 30 m | 10–80 | 1 | half-strength radius, exponent 2 (#99, like the shield) |
| `bridge.powerDraw` | 100 kW | 20–500 | 2 | from the backup supply when the reactor is cut; the backup has no limit (#147) |
| `rooms.<type>.crewRequired` | bridge 4, reactor 4, engine 2, magazine 2, shield 2, beam bay 3, turret 3, railgun 4, missile bay 3, quarters 0, hold 0 | 1–3× | 2 | data at L1; measured at L3 (validation, #60) |

Reading at T1 with these values (what the engineer should see): a reactor
alone at full power overheats in 61 s, so power on demand and conduction
to radiators (L2) are what keep a ship alive; the beam bay is the heat
problem (163 s to shutdown); a turret firing freely is not, within a
battle (hot after 11 min, shut down at 16 min, never critical alone,
#185); a shield generator
under an M beam shuts down after 175 s; engines run a whole battle (6 min
to hot). Crewed rooms radiate almost nothing (15 kW per panel at 330 K):
their heat has to reach a plant room or stay small, which L2 measures.

### 13c.4 Kernel, tools and process (#184)

- `js/heat.js`: room heat state, generation, radiator step, thresholds and
  events. `js/rooms.js`: rooms built from `data.js` (footprint, class, crew,
  draws), power and control state, the behaviours above. `js/events.js`:
  the event list; every event has `t`, `type`, `room`, `cause`, and the
  fields of #156 where they apply (`energy`, `crew`, `channel`).
  `data.js` gains a `ROOMS` table and the groups above. `DESIGN.md` §14
  lists `rooms.js` under the kernel. The data hash of a record covers
  `PARAMS`, `FIXED` and `ROOMS` (#185). The size rule, the crew rounding
  and the kernel interpretations accepted after PR #5 are in #185.
- `tools/m0.js`: from L1 the lock hash covers **the whole scenario file
  except its `locked:` line** (the v2 review's coverage gap); L0 locks stay
  as they are. `shield.kineticStop` is derived inside `withOverrides` so
  kinetic overrides reach it (#171 as intended). `blast()`'s coupling
  argument becomes required. The `approved` flags of #177 flip to true.
- Process as in L0: scenarios written and run only for crashes, committed,
  **locked in a commit of their own**, then the first canonical run; one
  branch `m0/l1-rooms`, one pull request; the reviewer and the physics
  checker run on it; the lead designer merges once neither reports a
  blocking finding (#180).

## 14. Architecture

| Layer | Files (planned) |
|---|---|
| Foundation | `data.js` (every number, ranges, scaling exponents, text), `util.js` (vectors, seeded RNG with separate simulation and effects streams), `events.js` |
| Kernel (no DOM) | `layout.js`, `graph.js`, `body.js`, `heat.js`, `rooms.js`, `field.js`, `projectile.js`, `damage.js`, `sensors.js`, `helm.js`, `crew.js`, `enemy.js`, `battle.js` |
| Meta | `campaign.js`, `run.js` |
| Presentation (after Mission 0) | `renderer.js`, `effects.js`, `ui.js`, `shipyard.js`, `report.js`, audio; `manifest.json`, `service-worker.js` |
| Tools | Mission 0 runner (Node, e.g. `node tools/m0.js L1 reactor ...`), `tools/campaign.js` (Node), `tools/smoke.js` (Playwright, after Mission 0) |

Kernel rules (#42, #156): no DOM; **no `Math.random`** in the simulation;
the renderer and the enemy read only their knowledge model; every damage
event carries its cause id; events carry what sound needs (energy, distance,
channel, room, crew aboard).

## 15. Roadmap

1. **Mission 0**, L0 to L6, one branch and PR per level (#151).
2. After Mission 0 exits: presentation (renderer, shipyard, report, phone
   UI, sound). Order to be decided then.
3. Content: factions, named ships, chapters, story.
4. Carriers: first an enemy carrier as a boss, then the player's at T5
   (#110).
5. Roguelite and environments.

## 16. Measured

Every row is in `MISSION0.md` with the command that reproduces it.

**L0 materials** (2026-10-20; seven scenarios, 66 cases, all PASS on their
first canonical run, locked before it; the first independent re-run was
the reviewer's on PR #1. Re-run on 2026-10-20 after #171 and #175, all
PASS. "AP" in L0 is the plain steel round: round types (#96) are not
modelled yet (#173)):

| Scenario | What the numbers say |
|---|---|
| `L0.kinetic.penetration` | S, M, L AP rounds pass 1, 2, 3 armour cells **at every tier T1–T6**: sectional momentum makes same-tier rounds and armour balance by themselves (#165) |
| `L0.kinetic.overpen` | An AP M round through an ordinary room 1–4 cells deep wastes 90–61% of its momentum leaving the ship: AP is poor against thin rooms (#96) |
| `L0.blast.surface` | A 2 MJ HE warhead bursting on an edge cell destroys 1 armour cell and damages 4: the burst cell saturates at 1 MJ (provisional) and its three neighbours take 0.33 MJ each (3 MJ: still 1 destroyed, 4 damaged; 5 MJ: 4 destroyed, 9 damaged). Energy is conserved and excess vents only when the plate is full. The criterion checks the energy books, a lower bound on damaged cells, connectivity and the burst cell; **it does not pin the spreading law** (wall-length proportionality, #18): any connected spread that conserves energy passes |
| `L0.beam.falloff` | The Gaussian beam delivers 98% at 0 m, 86% at the focus range (600 m), 55% at 1.2 km; flat within the focus range (0.995 at a quarter of it) and 1/d² beyond (d²f within 2.2% between 10 and 20 focus ranges) |
| `L0.beam.burn` | An M beam burns through an armour cell in 6.1 s at contact, 6.9 s at 600 m, 14.1 s at 1.5 km, putting 30 MJ of heat into the target room per cell (provisional burn energy) |
| `L0.shield.point` | An M shield (10 MW) absorbs at most 10 MW at the generator, 8 MW at 20 m, 5 MW at its radius (40 m, half strength), 2 MW at 80 m and 0.59 MW at 160 m (beams of 2, 10 and 30 MW run). No 5 MW (M) beam was run: that it absorbs an M beam completely within its radius is **an inference from the formula** (budget × g(40 m) = 5 MW), not a measurement |
| `L0.shield.kinetic` | An M shield stops an S round at the generator (exactly: `shield.kineticStop` is one S round's sectional momentum, #171) and slows an M round from 800 to 267 m/s, paying 47–373 kJ per round |

Honest reading: L0 proves the materials behave as their formulas say and
that the books balance; it says nothing yet about balance between ships.
The strong checks are where the simulation computes differently from the
formula (numerical integration in the beam falloff, time stepping in the
burn and the shield, tier invariance in penetration, conservation in the
blast). `L0.kinetic.overpen` and `L0.shield.kinetic` are close restatements
of their formulas: their value is locking the rule against later changes.
Two signals for later levels: a single round costs the shield's impulse
buffer 0.05–0.4 MJ of a 10 MJ buffer, so **the buffer has no measured effect
yet** (E4: it must show one under rapid fire at L2, or be cut); and, by
the formula, an M shield fully stops an M beam inside its radius, which L2
(overlap) and L5 (ship vs ship) must show is not a dominant defence. Heat
invariants that hold by construction do not count towards E3 (#174).

**L0 v2** (2026-10-21; five scenarios beside the seven, 81 cases, locked
before their first canonical run, all PASS on it; inputs from `data.js`;
`he.coupling` 0.5, approved 0.2–0.8 (#176)):

| Scenario | What the numbers say |
|---|---|
| `L0.blast.surface.v2` | A contact burst vents exactly (1 − coupling) of its energy at the open face, and absorbed + escaped + vented = E in every case. At coupling 0.5 the M warhead (2 MJ) puts exactly 1 MJ (= one cell's provisional blast resistance) into the plate: **1 cell destroyed, 1 damaged** (v1 without venting: 1 destroyed, 4 damaged). At 0.2 it destroys none; at 0.8, 1 destroyed and 4 damaged. 10 MJ at 0.5: 4 destroyed, 9 damaged; 20 MJ at 0.8: 13 destroyed, 22 damaged. On every 11×11 case, damage is non-increasing with grid distance (no cell further out holds more than any cell nearer) and symmetric about the burst row; a 3×3 plate filled to capacity lets 1 MJ escape |
| `L0.beam.burn.v2` | The stepped burn time lies in [t, t + dt) of the formula at 0 to 2.5 focus ranges (6.12 s at contact, 6.95 s at 600 m, 14.15 s at 1.5 km), and the heat in the target room exceeds the 30 MJ burn energy by less than one step's energy (1–56 kJ) |
| `L0.kinetic.penetration.v2` | The continuous depth matches s0 / R within 1e-9 at every tier and size: S 1.691, M 2.537, L 3.805 cells, identical T1–T6 |
| `L0.shield.point.v2` | The M beam itself (5 MW) is now run: **fully absorbed out to the radius** (40 m), 2 of 5 MW absorbed at 80 m, 0.59 MW at 160 m; at the generator the shield takes all of 10 MW and 10 of 30 MW (beams of 0.5×, 1×, 2×, 6× the M beam) |
| `L0.shield.kinetic.v2` | With the computed `kineticStop` an S round stops exactly (0 m/s); swept 0.5×–2×, S is stopped only at ≥ 1× (400 m/s left at 0.5×); M is stopped at ≥ 1.5×, L slowed to 89 m/s at 2×; exit velocity never rises with `kineticStop` |

Honest reading: v2 replaces the weak points named above with measurements.
The blast's spreading is now constrained (falling with distance,
symmetric), though both hold here by the plate's geometry and the wave
front's equal shares; they are not a test of the wall-length law on an
irregular room (L2). The burn is now one-sided. That the M shield absorbs
an M beam completely inside its radius is now measured, so the dominance
question for L2 and L5 stands on data. Two cautions: the default coupling
puts the M warhead **exactly** on one cell's blast resistance, so the
"1 destroyed" result sits on a knife edge (any lower coupling or higher
resistance gives 0 destroyed); and `armour.blastResistance`,
`armour.burnEnergy` and `shield.bufferSeconds` are still unapproved, so the
blast, burn and shield-kinetic v2 verdicts hold only once the owner
approves them. The shield buffer still never binds (a round costs at most
0.53 MJ of 10 MJ).

## 17. Open questions

1. **Chapter design** waits for Mission 0 (#125).
2. Player-facing names of factions and named ships (current names are
   working names).
3. Economy prices: measured with `tools/campaign.js`.
4. A store and trademark check of the title before any public release.
5. Approved ranges for each level after L1, decided by the lead designer
   before that level starts (#145, #180); L1's are in §13c.
6. The `approved` flags of #177 in `data.js` flip at the start of L1
   (#184).
