# Duct Tape Navy: Mostly in One Piece — Design

Status: designed 2026-10-20; **Mission 0 L0 (materials) and L1 (one room alone) passed and merged; L2 next**, no game yet. Mission 0 (§13) comes
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
| Recoil (Newton 3) | Every gun pushes its ship by the momentum of its round, beams almost not at all; at real masses a turret's push is tiny (as on real warships) and only the spinal railgun's heavy slug is expected to move or turn a ship visibly; RCS compensates. L3 measures it, E4 cuts it if it has no effect (#203 C) |
| Centre-of-mass shift | Losing a flank moves the CoM; aligned engines become off-axis |
| Heat and radiators | Heat leaves only by radiation, through radiators on the hull; **Stefan–Boltzmann**: radiated power ∝ area × emissivity × T⁴ (#143). Inside, heat moves fast only along the machinery's **coolant loop** (plant rooms and heat sinks sharing walls); crewed rooms and magazines are insulated (a bulkhead leaks little) and cooled by **life support**, which pumps their heat into the loop (#200, #201) |
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
| Propellant | Engines are **self-fuelled torches**: their thrust comes from their own fuel, whose amount is not tracked, and their exhaust carries the jet's heat away (very IR-bright); the ship's electricity runs only their pumps and magnets (#140, #203 A). Craft have a delta-v budget |

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
| Engine | 2×3 | exhaust on the aft hull, **exhaust must be clear** | a self-fuelled torch (#203 A): thrust from its own fuel, auxiliary power and heat from the ship; exhaust very IR-bright; thrust through the CoM recommended, not required |
| Magazine | 2×2 | inside | ammunition by contents, fed through walls; explodes by the ammunition left (HE far more than AP) |
| Shield generator | 2×2, 3×3 | inside | shield field; EM-bright while absorbing; absorbing makes heat |
| Crew quarters | 3×2 | inside | houses crew, sets crew capacity (#60); repair field by surviving cells (#51) |
| Beam bay | 2×2, 3×3 | one side on the hull | much power, very much heat; its firing window stays open while firing |
| Kinetic turret | 2×2, 3×3 | one side on the hull | rounds and recoil; ammunition and some power |
| Spinal railgun | 2×N | on the axis, fires forward | longer barrel, faster round; axial recoil; very much power |
| Missile bay | 3×2 | one side on the hull | a small ready store refilled from the magazine; explodes by the missiles inside (#148) |
| Empty hold | 2×2 | anywhere | structure only; insulates, absorbs blast |
| Heat sink | 2×2, 3×3 | anywhere | stores heat: 5× the heat capacity and 3× the conductivity of a room, no crew, no power; buys time while firing hot, then must be cooled through its walls; a destroyed cell vents its share of the heat (#197, #198) |

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
| Beam (a millimetre-wave **maser**, #203 B: a 600 m focus range from a 1.8 m waist is a 16 mm wavelength) | light speed, falloff | power and very much heat | almost none | burns over time at a point; heats the room | best when scanned |
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
| E1 | Every L0–L6 scenario PASSes its locked criterion, or is withdrawn for a specification error or as superseded by an owner's design decision: still locked and recorded, listed in `mission0/withdrawn.json` with its decision, and replaced by a successor that PASSes (#188, #200) |
| E2 | Invariants on every sweep: same seed → same log hash; momentum conserved at splits; heat generated = radiated + stored; no NaN |
| E3 | Every kept physics law has at least one passing proof scenario |
| E4 | Every schema attribute has a measured effect, or it is cut |
| E5 | No build wins more than 75% against the reference set; every degenerate build loses ≥ 3 of 4 against the reference ship on the same budget |
| E6 | Each underdog path: a 60%-budget ship beats a 100% one with the intended tactic and loses without it |
| E7 | The median reference battle lasts 3–6 minutes |
| E8 | T1 and T6 1v1 battles cost at most **1 ms per simulation step in Node** (a quarter of a 60 Hz phone frame, allowing for a phone's slower JavaScript; the owner, #213) |

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

**L2** (pairs and clusters; #192–#196): planned 2026-10-21, merged
2026-10-21 after review (#204, #205, #207), §13d: a cell
layout with shared walls, heat conduction, power and ammunition by wall
length, blast between rooms, shield overlap with the budget counted once
(#170), the shared repair budget, the size rule, 12 scenarios.

**L3** (the minimal ship; #208–#211): planned 2026-10-21, §13f: cell mass
from heat capacity, a 2D rigid body, thrust, RCS and recoil, fragments with
momentum conserved, control and SCRAM in a fragment, validation, the
reference ship R1, 9 scenarios. E8's budget is 1 ms per step (#213).

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
setting and tone, the spending guideline (#191: 20 USD of sessions per
level, soft, every cost reported), anything flagged as uncertain or
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
| Thresholds | Per room class, three temperatures: **hot** (function degrades: not modelled at L1 beyond the event), **overheated** (the room shuts itself down: no function, no working heat, but a reactor keeps its decay heat, #187; it restarts when T falls below hot), **critical** (the crew in the room die; a magazine cooks off; a reactor melts down) |
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
| 14 | `L1.repair.breach` (#189) | crew quarters (all 6 cells) and an idle M reactor (demand 0) at r = 0.25 × repair.radius; hit-1 destroys reactor cell A at 1 s; when A's `cell-repaired` event comes, hit-2 destroys cell B 1 s later and hit-3 cell C 1 s after that; after the explosion, an external 1.1 MW heats the destroyed reactor for 2000 s | no `breach` after hit-2 (1 of 4 destroyed); `breach` at hit-3 (2 of 4); explosion at breach + countdown, one-sided; exactly **one** explosion and no meltdown in the whole run; crew deaths 1 per destroyed reactor cell (k = cells currently destroyed), cumulative reactor deaths ≤ its crew required; the destroyed count after A's repair is 0 |
| 15 | `L1.room.restart` (#189) | (a) an M engine at full throttle with 2 radiators, powered and controlled, run 6000 s; (b) an M bridge with 2 radiators, heated by an external 1.1 MW until its overheated event, then the external source is off, run until its restart and 10 s more | (a) shutdown at overheated (thrust 0, draw 0 from the next step), restart at the first step with T < hot (thrust back to full), and the cycle repeats: shutdown and restart events alternate, at least 2 shutdowns; each restart time t_r after a shutdown at T_s matches the radiative cooling closed form t = (T_hot⁻³ − T_s⁻³) / (3 n εσA / C) within 1e-4 relative (about 1259 s from 800 K); (b) control false from the overheated step with `control-lost` cause `overheat`, control true again at restart with `control-restored`, restart time by the same closed form (about 1412 s from 350 K) within 1e-4 relative; no crew deaths |

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
  `PARAMS`, `FIXED`, `ROOMS`, `TIERS` and `BASE_EDGE` (#185, #189). The
  size rule, the crew rounding and the kernel interpretations accepted
  after PR #5 are in #185; the reviewer's fixes (destroyed count after
  repair, lock-line validation and folder-based lock rule, exploded rooms
  never explode twice, turret on accumulated time, `withdrawn.json`
  validation) are in #189. `data.js` flattens `thermal.plant.*` to
  `thermal.plantHot` etc. and `rooms.<type>.crewRequired` to
  `crewRequired.<type>`, because overrides address `group.name`.
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

## 13d. L2 plan (lead designer, 2026-10-21, #192–#196)

L1 proved each room alone. L2 proves **pairs and clusters through shared
walls** (#127): heat conduction, power and ammunition flowing by wall
length, blast between rooms, shield overlap with the budget counted once
(#170), the shared repair budget, the size rule, and the L1 signals (an
overheated reactor without cooling melts down, #187 (5); a bridge restarts
by conduction, not a fixture, #190 (2)). A cluster is a few rooms placed on
a cell grid; it is not yet a ship (no rigid body, no control graph: L3).
Numbers are T1, size M, SI.

### 13d.1 The models (#192, #193)

| Rule | Statement |
|---|---|
| Layout (`js/layout.js`) | A cluster has one cell grid at the tier's edge. A room occupies a rectangle of cells at an integer cell position, its footprint rotated by 0° or 90°. Rooms never overlap. Two rooms **share a wall** along every pair of edge-adjacent cells, one in each; the shared wall length L is (number of such cell pairs) × edge. An **open edge** is a room cell edge with no room cell beside it; a room carries at most one radiator per open edge (#15). The distance between two rooms (fields) is between their centres |
| Live walls | A shared edge carries power, ammunition and heat only while **both** cells on it survive (a destroyed cell is a hole). Blast uses every shared edge (a hole lets blast through) |
| Conduction (`js/heat.js`, **#200, #201**) | Heat flows through each live shared wall at G (T_a − T_b). **Coolant walls**: between two **coolant rooms** (the plant rooms: reactor, beam bay, shield generator, engine, spinal railgun; and the heat sink), the machinery's coolant loop runs through the bulkhead: G = `conduction.wall` × L × h(f_a, f_b), h the harmonic mean 2 f_a f_b / (f_a + f_b) of their coolant factors (1; the heat sink `heatsink.conductivityFactor`). **Passive walls**: every other wall (a crewed room, a magazine, a hold on either side) leaks only through the bulkhead: G = `conduction.passive` × L × h(p_a, p_b) with passive factors 1, and `conduction.holdFactor` for an empty hold (#18c). Explicit Euler at the step, flows computed from the temperatures at the start of the step, so the heat books close exactly: generated = radiated + stored + moved, Σ flows = 0 over the cluster |
| Life support (#201) | Each crewed room (bridge, quarters, turret, missile bay) and each magazine keeps its own air cool: while it is powered (the bridge on its backup, #147) and above `FIXED.lifeSupportSetpoint` (295 K), it **pumps** heat out of itself into the coolant rooms sharing a live wall with it, split by wall length, at most `lifeSupport.capacityPerCell` × surviving cells W and never below the setpoint within a step. A heat pump works against the gradient, so it pushes into a hotter coolant room. With no coolant neighbour, or unpowered, it does nothing: the room has only its passive walls and its own radiators. It is ship service, not the room's machinery: it **keeps running while the room is shut down** (overheated or switched off), as long as the room is powered (#205). Under power routing a room counts as powered for life support while it is joined through live walls (through any rooms) to a reactor able to produce (not shut down, not destroyed, demand above 0), whatever its own request: a switched-off or overheated room, or a turret with no rounds, keeps it (#207). The pump's own work is not added as heat yet (a simplification; with power routing for life support at L3 it may be). Enemy beams that heat the room directly (#138) can overwhelm it; the heat it pumps loads the coolant loop, so a reactor beside crewed rooms runs hotter |
| Power (`js/graph.js`) | Reactors produce up to their output (L1); consumers draw their L1 draw. Power flows through any room (no conduit rooms, #12) along live walls, each with capacity `power.wallCapacity` × L. Consumers are served in **priority order** (the power-priority order of #38; at L2 a list given by the scenario, then room id): each consumer in turn gets the most additional flow the residual network allows (augmenting paths found by breadth-first search in room-id order, so the result is deterministic). A consumer that receives a fraction f of its draw works at f: every rate-like output and its heat × f (a beam at f × power, a turret at f × its fire rate, a shield at f × its budget). The bridge keeps its backup supply (#147); a reactor delivers only what is routed |
| Ammunition | A magazine feeds only rooms that share a live wall with it, no routing through other rooms (#18; magazines must touch the guns they feed, so a bomb sits beside every gun). Each wall carries at most `ammo.wallFeed` × L kg/s of rounds of the consumer's size, in the magazine's loading order. A turret holds a **ready store** of `turret.readyRounds` rounds of its own size (#201 (5), #207); it fires from the store and the feed refills it. Its sustained rate is min(fire rate, feed / round mass) |
| Blast between rooms | An internal explosion of energy E (a magazine or reactor, L1) first fills its own room up to that room's blast capacity B = surviving cells × `room.blastResistance` (× `hold.blastFactor` for a hold); the excess then spreads as a wave front from the **whole damaged region** (#169, #205): in each round, the excess is split among every unsaturated room touching any saturated room, by shared wall length, each filling up to its capacity; what no room can take escapes to space. Within a room the energy spreads evenly over its cells; a cell is destroyed when its share reaches its resistance. Books: absorbed + escaped = E exactly; with every room reached, absorbed = min(E, Σ B), escaped = max(0, E − Σ B) (#184) |
| Shield overlap (#170) | Fields add, each generator paying from its own budget (#99). In each step, a beam at point j asks generator i for a_ij = P_j × B_i g_ij / Σ_k B_k g_kj, capped so that Σ_i a_ij ≤ min(P_j, Σ_i B_i g_ij) (L0 for one generator). If a generator's asks Σ_j a_ij exceed its budget B_i (× its power fraction), every ask to it is scaled by B_i / Σ_j a_ij; the point then absorbs the sum of what it was granted, with no second round in the same step. **No generator ever absorbs more than its budget**: this removes the double counting of #170. Each generator heats by what it pays (L1). The impulse buffer of each generator is shared the same way |
| Shield buffer (E4) | The buffer (budget × `shield.bufferSeconds`) pays the energy of rounds stopped (L0), drains when rounds arrive faster than it refills, and refills at the budget left unused by continuous beams. L2 shows it binding under a salvo; L5 decides whether real salvos ever reach it, or it is cut (#177, E4) |
| Repair sharing (#99, #185 (6)) | A quarters' repair budget is R = `repair.rate` × surviving fraction (integrity per second). A damaged cell j in range asks q_j = R g(r_j) (L1); if Σ q_j > R, every ask is scaled by R / Σ q_j. Overlapping quarters add, each paying its own budget. One cell alone is repaired exactly as at L1 |
| Size rule (#185 (4), #187 (4)) | Per-cell quantities scale with the cell count (L = 9/4 of M): heat capacity, magazine capacity, reactor explosion energy, crew (rounded). Rate-like quantities scale with the footprint (9/4 of M): power, draw, thrust, budget (L1). Per-round quantities follow the round: an L turret fires rounds of (3/2)³ the M mass at 2/3 the M rate, heat per shot × (3/2)³ |

### 13d.2 Scenarios (#194)

Conventions as L1 (#177, #181, #185 (2)): inputs from `data.js`; no case on
a threshold or on a whole number of steps unless it tests that; closed
forms where they exist. Where the dynamics of several coupled rooms has no
closed form, the scenario computes its expected value with **its own
reference integrator** (RK4 at dt / 10, written in the scenario file, using
only `data.js` constants and the rules of §13d.1, never the kernel), and the
tolerance is the kernel's Euler error, stated per row. Every scenario
checks the heat books (1e-9 per room and Σ flows = 0), event fields, no
NaN and determinism.

| # | Scenario | Setup and measure | Expected and criterion |
|---|---|---|---|
| 1 | `L2.heat.pair` | two idle M rooms side by side, one at T_a ∈ {400, 600, 1000 K}, the other at 290 K; wall L ∈ {5, 10 m}; ordinary–ordinary and ordinary–hold; no radiators; 4 τ; T1–T6 for one case | ΔT(t) = ΔT₀ e^(−t/τ), τ = C_a C_b / ((C_a + C_b) G); \|ΔT − closed form\| ≤ 1e-3 ΔT₀; C_a T_a + C_b T_b constant to 1e-12; τ ∝ edge across tiers |
| 2 | `L2.heat.chain` | three idle M rooms in a row, the first at 600 K, the others at 290 K; the middle one ordinary or a hold; 300 s | the 3 × 3 linear system solved in the scenario by eigen-decomposition (closed form); temperatures within 1e-3 K; heat reaching the third room with a hold in the middle < 15 % of that without |
| 3 | `L2.heat.neighbour` | an M reactor at demand d ∈ {0.25, 0.5} beside (a) an M magazine, (b) crew quarters, with wall L ∈ {5, 10 m}, and (c) each with an M hold between; no radiators; until the neighbour's critical, the reactor's overheated, or 900 s | (a, b) the linear two-room solution with a constant source: time the neighbour reaches its critical (magazine 450 K: cook-off; quarters 380 K: crew die) within 1e-3 relative, by a root of the closed form; (c) the reactor overheats first and the neighbour stays below critical through 900 s (reference integrator, 1e-3 K) |
| 4 | `L2.reactor.cooled` | an M reactor at full demand with n ∈ {0, 1, 2, 4} M hull rooms sharing a 10 m wall each, every hull room with 4 radiators; to overheat, then decay heat, 3600 s | reference integrator: overheat time and peak reactor temperature within 1e-3; n = 0 melts down at the L1 time; **n ≥ 1 does not melt down**; reports the overheat time (the battle clock of one reactor at full power) |
| 5 | `L2.power.flow` | small graphs of reactors, holds and consumers: reactor → beam bay over L ∈ {5, 10 m}; reactor → hold → beam bay; two reactors and three consumers with a priority list; a bottleneck wall losing cells | delivered to each consumer = the priority-ordered max flow, computed in the scenario by enumerating every cut of the small graph (independent of the kernel), exact; a beam bay at fraction f fires f × beam power and heats f × its L1 heat; cutting the bottleneck wall's cells lowers delivery exactly |
| 6 | `L2.ammo.feed` | an M magazine beside an M or L turret over L ∈ {5, 10 m}, firing freely 600 s (measurement times off the shot and refill grid) | shots by t = ready store + rounds fed, closed form: sustained rate = min(fire rate, `ammo.wallFeed` L / round mass); the L turret on a 5 m wall is **feed-limited**; magazine contents fall by exactly the mass fired; a turret not touching the magazine fires only its ready store |
| 7 | `L2.blast.walls` | a magazine (M, full HE, and half AP) exploding in (a) a row of three ordinary rooms, (b) the same with a hold beside it, (c) a magazine in the middle of two identical rooms | absorbed per room by the rule of §13d.1, closed form for these geometries; absorbed + escaped = E exactly; absorbed = min(E, Σ B), escaped = max(0, E − Σ B) when every room is reached; equal shares in (c); the hold absorbs `hold.blastFactor` times an ordinary room; crew die per destroyed cell (L1) |
| 8 | `L2.shield.overlap` | two M generators d ∈ {40, 80 m} apart; (a) one beam of P ∈ {5, 20 MW} midway; (b) two simultaneous beams of 10 MW, one at each generator; (c) one generator unpowered | (a) absorbed = min(P, Σ B_i g_i), each generator pays its share; (b) **neither generator pays more than its budget** (the #170 case; it shows only at 20 MW, where without the rule each point would absorb 15 MW and each generator pay 15 MW against a 10 MW budget, #205); (c) only the powered one absorbs; heat of each = its payment + its draw |
| 9 | `L2.shield.buffer` | an M generator, idle beam; a salvo of N ∈ {5, 20, 40} M rounds arriving in one step at the generator, then the refill | stopping energy per round from L0; the buffer binds at the round k = ⌈buffer / energy⌉ and later rounds pass at their unstopped speed; refill at the unused budget, closed form; (E4: the buffer has a measured effect) |
| 10 | `L2.repair.shared` | one quarters and two damaged hold cells at r ∈ {0.25, 1} × radius; then two quarters overlapping on one cell | rates by the rule of §13d.1, closed form; one cell alone = L1; the sum of a quarters' payments never exceeds R |
| 11 | `L2.size.rule` | M and L reactor, magazine, turret, quarters at T1 | the scaled quantities of §13d.1 exactly: L reactor explosion 450 MJ, L magazine capacity 9/4, L turret round mass (3/2)³ M at 2/3 the rate, crew 9/4 rounded |
| 12 | `L2.bridge.conduction` | an M bridge beside an M hull room with 4 radiators over 10 m, heated by an external 1.1 MW until it overheats, then the source off | control lost at overheat, restored at restart (L1 events); restart time by the reference integrator within 1e-3; no radiator on the bridge itself (replaces the fixture of #190 (2)) |

Dependencies: 2–4 and 12 on 1; 3 on `L1.room.thresholds` and
`L1.magazine.cookoff`; 4 on `L1.reactor.scram`; 5 on `L1.beambay.heat`;
6 on `L1.turret.fire`; 7 on `L0.blast.surface.v2`; 8 and 9 on
`L1.shield.generator`; 10 on `L1.quarters.repair`.

**What L2 does not test**: the control graph and the bridge's control
paths (L3), the rigid body, recoil and CoM (L3), validation of a whole ship
(L3), round types chosen against a target (L4), battle balance (L5).

**Additions after the owner's answers (#197–#199)**, built on the same
branch after the first canonical run of rows 1–12 and before the review:

| # | Scenario | Setup and measure | Expected and criterion |
|---|---|---|---|
| 13 | `L2.heatsink.buffer` | an M reactor at 12.5 MW (feeding one M beam bay) beside (a) an ordinary idle M room, (b) an M heat sink, over 10 m, no radiators; T1 and T3 | the two-room linear solution with a constant source: reactor overheat time by a root of the closed form, within 1e-3 relative; (b) later than (a) (estimate: 421 s against 166 s at T1) |
| 14 | `L2.heatsink.loss` | an M heat sink at 600 K; its cells destroyed one per second; then an M reactor at 12.5 MW beside the damaged sink | each destroyed cell vents exactly (C / n)(T − T_rest) to space, T unchanged, C and Q fall by one cell's share; heat books include the vented energy; with k cells lost the reactor overheats sooner, by the reference integrator within 1e-3 |
| ~~15~~ | ~~`L2.cofferdam`~~ | withdrawn before it was written (#201): under #200 the cofferdam has no heat role left; the room is deferred to `IDEAS.md` | — |

Row 13 (a) uses a **coolant** neighbour (an idle M beam bay), so the heat
sink is compared with an ordinary coolant room. Dependencies: 13 and 14
on 1.

**Heat v2 (#200, #201)**: the rows below replace rows 1–3 and 12 where
they test the replaced conduction rule; the replaced scenarios stay locked
and recorded and are withdrawn under #188 (rows 2 and 3 also for the lead
designer's specification errors, #201). Every expected value below was
estimated by the lead designer before locking, over the **whole run**.

| # | Scenario | Setup and measure | Expected and criterion |
|---|---|---|---|
| 1b | `L2.heat.pair.v2` | two idle M rooms side by side over L ∈ {5, 10 m}: (a) two coolant rooms (beam bays off) at T_a ∈ {400, 600, 1000 K} and 290 K, 4 τ, T1–T6 for one case; (b) a coolant room at 600 K beside an empty hold or an unpowered M magazine at 290 K, 3600 s | ΔT(t) = ΔT₀ e^(−t/τ), τ = C_a C_b / ((C_a + C_b) G) with G by the wall type of §13d.1; \|ΔT − closed form\| ≤ 1e-3 ΔT₀; C_a T_a + C_b T_b constant to 1e-12 |
| 2b | `L2.heat.chain.v2` | three idle M rooms in a row over 10 m walls: a beam bay off at 600 K, a middle room at 290 K (a beam bay off, or an empty hold), a beam bay off at 290 K; 300 s | the 3 × 3 linear system by eigen-decomposition; temperatures within **3e-3 K**; the heat reaching the third room through a hold is **< 1e-3** of that through a coolant room (estimate 4.9e-5) |
| 3b | `L2.heat.neighbour.v2` | an M reactor at demand d ∈ {0.25, 0.5} (on demand, L1) beside an M magazine full of M HE or M crew quarters over a 10 m passive wall, life support on (powered) or off (unpowered); 900 s | life support on: the neighbour never exceeds 295 K + 0.01 K; life support off: the neighbour's peak temperature by the reference integrator within 1e-3 K, and it stays below its critical through 900 s (estimates: magazine 331 / 338 K, quarters 318 / 322 K) |
| 16 | `L2.lifesupport` | M crew quarters, powered, beside an idle M beam bay with 4 radiators over 10 m; an enemy beam heats the quarters directly (#138) at P ∈ {0.2, 1, 5 MW}; and the same quarters unpowered; 900 s | piecewise closed form: time to the setpoint C·5 / (P + draw), then rate P + draw − capacity; time to critical (crew die) one-sided: **never** at 0.2 MW (peak ≤ 295.01 K), about 439 s at 1 MW, 68 s at 5 MW (by the reference integrator; the piecewise form above leaves out the passive wall and the draw stopping at overheated, and gives 425 s, #204); the heat pumped arrives in the beam bay (books) |
| 12b | `L2.bridge.conduction.v2` | an M bridge (inside, no radiator, life support on its backup) beside an idle M beam bay with 4 radiators over 10 m; an external 1.1 MW heats it until overheated, then the source is off | reference integrator within 1e-3: overheat at about 142 s, restart about 231 s after the source stops (measured 142.95 s and 230.6 s; the row's earlier "480 s" was a wrong estimate, #204); control lost and restored (L1 events) |

### 13d.3 Constants and approved ranges (#195)

| Constant | Value | Range | k | Note |
|---|---|---|---|---|
| `conduction.wall` | 4e3 W/(K·m) | 1e3–2e4 | 1 | two M rooms over a 10 m wall: τ = 30 s; heat races ∝ edge as at L1 |
| `conduction.holdFactor` | 0.1 | 0.02–0.3 | 0 | an empty hold's conductivity (#18c); hold–ordinary wall 0.18 of ordinary |
| `power.wallCapacity` | 2e6 W/m | 5e5–5e6 | 1 | a 10 m wall carries 20 MW (a whole M reactor), a 5 m wall 10 MW (not a whole beam bay) |
| `ammo.wallFeed` | 0.06 kg/(s·m) | 0.02–0.3 | 1 | 5 m: 0.3 kg/s, enough for an M turret (0.25 kg/s), not for an L one (0.56 kg/s) |
| `turret.readyRounds` | 4 | 2–10 | 0 | rounds held in the turret, per its size |
| `room.blastResistance` | 5e5 J | 2e5–2e6 | 3 | blast energy one ordinary room cell absorbs before it is destroyed (half an armour cell) |
| `hold.blastFactor` | 4 | 2–10 | 0 | an empty hold absorbs blast (#18c) |
| `heatsink.capacityFactor` | 5 | 2–10 | 0 | heat capacity per cell × this (#198); a water or phase-change store |
| `heatsink.conductivityFactor` | 3 | 1–5 | 0 | conductivity factor in the harmonic mean of §13d.1 (#198) |

The heat sink's threshold class is **plant** (600 / 800 / 1000 K) with no
function to lose and no crew; it has no special behaviour at its
thresholds (events only).

| Constant (#201) | Value | Range | k | Note |
|---|---|---|---|---|
| `conduction.passive` | 25 W/(K·m) | 5–100 | 1 | a steel bulkhead with air on both sides (≈ 250 W/K for 10 m × 5 m) |
| `lifeSupport.capacityPerCell` | 5e4 W | 1e4–2e5 | 2 | bridge 200 kW, quarters 300 kW, magazine 200 kW |
| `FIXED.lifeSupportSetpoint` | 295 K | fixed | — | the air temperature life support holds |

`conduction.holdFactor` now applies to passive walls (#201).

No other new constant; anything an engineer needs beyond this list enters
`data.js` with `approved: false` and is listed in the pull request.

**Reading** (estimated by the lead designer with a simple integrator
before locking, the lesson of L1): an M reactor at full power overheats in
61 s alone, 94 s with one cooled neighbour and 278 s with four, and **one
neighbour is enough to keep it from melting down** after the overheat: the
battle clock of one reactor at full power is 1.5–5 minutes (coolant
neighbours; unchanged by #200). ~~A reactor at a quarter of its power cooks
a magazine in about 3 min and kills the crew of quarters beside it in about
2.4 min~~: that was the harmonic-mean model, about 35 times harsher than a
real bulkhead, replaced by #200. Under #200, crewed rooms and magazines
beside a running reactor stay at 295 K while life support runs, and reach
only 318–338 K in 15 min without it; crew die of heat when an enemy beam
heats their room (5 MW: 68 s; 1 MW: about 7 min; 0.2 MW: never), or when
cooling and power are cut for a long time. Heat, not ammunition, is what
limits a ship that fights at full power; the machinery's coolant chain is
what the enemy cuts.

### 13d.4 Kernel, tools and process (#196)

- New files as `DESIGN.md` §14 plans: `js/layout.js` (grid, placement,
  rotation, shared walls, open edges) and `js/graph.js` (power flow by
  priority, ammunition feed); conduction in `js/heat.js`; blast between
  rooms, shield overlap, repair sharing and the size rule in the existing
  files where their L1 parts live. `js/rooms.js` stays the behaviour of a
  room; a cluster world steps all its rooms together, conduction and flows
  computed from the state at the start of each step.
- The L1 API keeps working: a room added without a layout is a cluster of
  one, and every L0 and L1 scenario must still VERIFY unchanged
  (`node tools/m0.js regress`); a run() or kernel change that moves an L0 or
  L1 result is a bug to report, never a reason to re-record.
- Process as L1: scenarios unlocked, run for crashes only, committed,
  **locked in a commit of their own**, then the first canonical run; one
  branch `m0/l2-clusters`, one pull request; the physics checker (blind,
  from §13d.1 and §13d.3) and the reviewer run on it; the lead designer
  merges when neither reports a blocking finding (#180).

## 13e. The D pass: real round sizes, partial damage, repair (#203 D, #206)

Built after L2 merges and before L3, on its own branch `m0/d-damage`,
because it touches L0 constants and L1's repair. Estimates were made with
every rule of L0–L2 switched on (#204). It also carries the life-support
fix of the L2 review (#207): the same kernel file, and L3 is the first
level to route power through crewed rooms.

### 13e.1 Rules

| Rule | Statement |
|---|---|
| Real round sizes | An M kinetic round at T1 is **6 kg** of solid steel at 800 m/s (62 mm, 250 mm long): a light naval gun, as a 1500–2500 t real corvette carries (the old 0.5 kg was a 27 mm cannon). Every quantity tied to the round scales by the same factor 12 in mass so that every penetration depth and feed ratio of L0–L2 is **unchanged**: the kinetic resistances scale by 12^(1/3) (sectional momentum ∝ m^(1/3) at fixed shape and speed), magazine capacity and wall feed by 12 (the magazine still holds 150 M rounds), the propellant charge by 12 (6 MJ per M round, about 1.5 kg of propellant). The HE warhead stays 2 MJ (≈ 0.5 kg TNT, 8 % of a 6 kg shell, a real filler fraction); the turret's heat per shot stays 0.3 MJ (most of a gun's heat stays in its barrel, outside the room) |
| Partial kinetic damage | Kinetic damage stays momentum (#137): a round passing a room cell removes that cell's resistance R from its sectional momentum, as before, and takes **1 / `kinetic.hitsToWreck`** of the cell's integrity; the cell it stops in loses (sectional momentum left / R) / `kinetic.hitsToWreck`. A cell is destroyed when its integrity reaches 0 (#16). Crew die in proportion to the integrity lost: the room's cumulative deaths are floor(crew × (cells − Σ integrity) / cells), never more than its crew (#189) |
| Repair | Repair restores **damaged** cells only (integrity between 0 and 1); a destroyed cell (integrity 0) is not repaired in battle and waits for the drydock (amends #51); it stays destroyed for the rest of the battle (this replaces #190 (1), which let a destroyed cell come back at integrity 1) |
| Life support under routing (#207) | A room keeps life support while joined through live walls to a reactor able to produce, whatever its own power request (§13d.1); the kernel tied it to the room's routed fraction, so a shut-down room lost it under routing, against #205 (3) |
| Shield buffer | Unchanged rule; with the real round, stopping an M round costs 1.71 MJ, so a 10 MJ buffer binds at the **6th** round of a salvo (the old 0.5 kg round: the 71st). E4 for `shield.bufferSeconds` is met at L2 by this effect |

### 13e.2 Constants and approved ranges (#206)

| Constant | Old | New | Range | k |
|---|---|---|---|---|
| `kinetic.roundMass` | 0.5 kg | 6 kg | 2–20 | 3 |
| `armour.kineticResistance` | 2.7e5 | 2.7e5 × 12^(1/3) = 6.181e5, computed exactly in `data.js` | 3e5–1.25e6 | 1 |
| `room.kineticResistance` | 6.75e4 | 6.75e4 × 12^(1/3) = 1.545e5, computed exactly | 7e4–3.2e5 | 1 |
| `magazine.capacity` | 75 kg | 900 kg | 300–3000 | 3 |
| `ammo.wallFeed` | 0.06 kg/(s·m) | 0.72 kg/(s·m) | 0.24–3.6 | 1 |
| `kinetic.chargeEnergy` | 0.5 MJ | 6 MJ | 2–20 | 3 |
| `kinetic.hitsToWreck` | — | 3 | 1–8 | 0 |

`shield.kineticStop` stays computed from the S round (#171), so it follows.

### 13e.3 Scenarios

| # | Scenario | Setup and measure | Expected and criterion |
|---|---|---|---|
| D1 | `L1.kinetic.damage` | S, M and L rounds at T1 along a row of M crew quarters cells (3 cells deep) and along a row of empty hold cells; then 2 and 3 M rounds along the same line; T1–T6 for M | per passed cell integrity loss 1 / hitsToWreck exactly; the stopping cell (s_left / R) / hitsToWreck; crew deaths by the floor rule; after 3 M rounds every passed cell destroyed; depths and losses identical T1–T6 |
| D2 | `L1.quarters.repair.v2` | the setup of `L1.quarters.repair` with the target cell damaged by 0.7123 (not destroyed), and a second target cell destroyed | time to integrity 1 = 0.7123 / (rate × c / 6 × g(r)), one-sided; the destroyed cell stays at 0 through 600 s and no `cell-repaired` event for it |
| D3 | `L1.repair.breach.v2` | quarters and an idle M reactor at 0.25 radius; cell A damaged by 0.7123 at 1 s and repaired; then cells B and C destroyed 1 s apart; a destroyed cell D next to the quarters | no breach after B; breach at C (2 of 4 destroyed); explosion at breach + countdown, one-sided; exactly one explosion; D stays destroyed; reactor deaths ≤ its crew |
| D4 | `L2.shield.salvo` | an M generator and a salvo of N ∈ {3, 5, 6, 7, 10} M rounds of 6 kg | stop cost 1.707 MJ per round (L0 formula); the buffer binds at round ⌈10 MJ / cost⌉ = 6; later rounds pass unstopped; refill at the unused budget |
| D5 | `L2.lifesupport.routed` (#207) | (a) an M crew quarters at 320 K, powered and active, an idle M reactor sharing 5 m and an M heat sink sharing 10 m with it (not with each other), all else at 290 K, 600 s, no routing; (b) power routing on: the quarters beside an M reactor at demand 0.25 over 10 m, an external 0.2 MW and 1 MW on the quarters for 900 s, with the quarters active, switched off, and with the reactor switched off | (a) heat pumped into each neighbour in the ratio of their live wall lengths (1 : 2) within 1e-9 at every step; the quarters never below 295 K − 1e-9 K; time to within 1 mK of the setpoint against a reference integrator, 1e-3 (estimate 353 s; 39.6 and 79.1 MJ pumped); (b) the quarters' temperature against a reference integrator within 1e-6 K every second: active and switched off hold ≤ 295.01 K at 0.2 MW (estimates 295.0013 / 295.0010 K); reactor off pumps nothing (338.5 K, hot at about 738 s); at 1 MW crew die at about 438 s (active), 458 s (switched off) and 328 s (no supply), one-sided on the step grid |
| D5b | `L2.lifesupport.routed.v2` (#212) | D5's setup and cases unchanged | D5's checks, except that in (b) the quarters' temperature matches the reference integrator within **1e-6 relative** (about 0.3–0.5 mK) every second; the kernel's Euler differs by 2e-6 to 5e-5 K, so the margin is 6× or more (D5's 1e-6 K was under the Euler error: the lead designer's specification error, #212) |
| D6 | `L2.blast.split` (#212) | an M magazine sharing a 10 m wall with an M hold and a 5 m wall with (i) a second M hold or (ii) an M bridge, the two neighbours not touching each other; the magazine holds one HE round (8 MJ: 6 MJ charge + 2 MJ warhead) or one AP round (6 MJ); (ii) with AP only | the magazine fills to its capacity (2 MJ); the excess splits 2 : 1 by wall length with no room saturated and nothing escaping: (i) HE 4 / 2 MJ, AP 2.667 / 1.333 MJ; (ii) AP hold 2.667 MJ, bridge 1.333 MJ, its cells at integrity 1/3 and 2 of its 4 crew dead by the floor rule (blast follows the D-pass crew rule, #212); books absorbed + escaped = E exactly. With the 6 kg round the small loads of `L2.blast.walls` saturate every room, so the split before saturation needed a case of its own |

**Expected effect on locked scenarios**: every L0, L1 and L2 scenario
whose criterion is a formula over `data.js` re-records with the new values
and still passes (the scaling keeps every ratio). `L1.quarters.repair` and
`L1.repair.breach` repair destroyed cells, so they no longer pass: they are
withdrawn as superseded by #203 (#188 as extended by #200) with D2 and D3
as successors. Any other scenario that changes verdict is a finding for the
lead designer, not a withdrawal.

## 13f. L3 plan: the minimal ship (lead designer, 2026-10-21, #208–#211)

L2 proved clusters. L3 proves **a ship**: a valid layout becomes one rigid
body with mass, centre of mass and moment of inertia from its cells; engines,
RCS and recoil move and turn it; the structure graph splits it into
fragments with momentum conserved; a fragment without the bridge SCRAMs
and goes dark (#13, #81, #127). Built after the D pass merges, on
`m0/l3-ship` from `main`. Numbers are T1, size M, SI; estimates were made
over each whole run with every rule of L0–L2 and the D pass on (#204), by
the lead designer's own integrators; the engineer reproduces them
independently before the lock, as at L2.

### 13f.1 The models (#208)

| Rule | Statement |
|---|---|
| Cell mass (#202 E) | A cell's mass and its heat capacity are one number: m = C / `thermal.specificHeat` (600 J/(kg·K), a steel-and-aluminium structure), so an M cell at T1 is **1 t** and the exponent is C's (k = 3). A heat sink cell is a cell plus the water that holds its extra capacity: m + (`heatsink.capacityFactor` − 1) × C / `FIXED.waterSpecificHeat` (4186 J/(kg·K)): 1.57 t. Contents add their real mass: a magazine its rounds (900 kg full, D pass), a turret its ready rounds. Fittings add `radiator.mass` and `rcs.mass` at their edge's midpoint |
| Rigid body (`js/body.js`) | A ship is a 2D rigid body: mass M, centre of mass, moment of inertia I = Σ m (a²/6 + d²) over cells (a square cell of edge a about its own centre, plus parallel axis) and Σ m d² over fittings and contents (point masses). State: position, heading θ, velocity v, angular velocity ω. Forces and torques of the step are summed in the body frame, rotated to the world, and integrated by semi-implicit Euler at the step (v and ω first, then position and θ). Impulses (recoil, fixtures) change v and ω at once. Mass properties are recomputed whenever mass changes (a round leaves, a cell is destroyed, a fragment separates); the velocity field is kept (a rigid body that loses a part keeps v at each surviving point and ω), so momentum is booked exactly |
| Thrust | An engine pushes along the ship's forward axis (+x, its exhaust faces aft) at the centre of its exhaust face, with `engine.thrust` × throttle × footprint factor × surviving fraction × power fraction, only while controlled and not shut down (L1); off the centre of mass it also turns the ship (#14: recommended through the CoM, not required) |
| RCS (fitting, #15) | An RCS fitting on an open edge pushes the ship along the edge's inward normal at the edge's midpoint, `rcs.force` while fired; it takes its power and control from its host room (its draw joins the host's request; it fires at the host's power fraction and only while the host is controlled); its heat, `rcs.powerDraw` × `engine.heatFraction`, goes to the host room. Not on an inside room (#190 (2)) |
| Recoil (#5, #203 C) | A gun firing a round of mass m at muzzle velocity u along direction d gives the ship the impulse −m u d at the gun room's centre; the round leaves with m (v_point + u d), so ship plus rounds conserve momentum exactly. Propellant gas is not modelled (#187 (6)) |
| Destroyed cells | A destroyed cell (integrity 0, D pass) is a hole: it carries no structure, control, power, ammunition or heat (L2), and **resists no round** (a round passes it at no cost; #212) and its mass leaves the ship as **debris** with the velocity of its point (momentum kept; debris as obstacles is L4, #9). A damaged cell keeps its whole mass |
| Structure and fragments (`js/graph.js`) | Surviving cells connect through every edge they share, inside a room and across live walls. When the surviving cells fall into several connected sets, each becomes a fragment: a rigid body with its own mass properties and the parent's velocity field (v of its new centre of mass, the same ω), so mass, momentum, angular momentum and kinetic energy are conserved exactly. A room whose surviving cells fall into two fragments works in the fragment holding most of them (tie: the lower cell index); its other cells are dead weight there |
| Control (#12, #81, #147) | A room is controlled while a path of live walls joins it to a surviving bridge in its fragment (connectivity only, through any rooms). A room that loses control loses its function (L1 `controlled`): an engine stops, a gun stops firing, a reactor **SCRAMs** (decay heat follows, #81). A fragment without the bridge goes dark; destroying the bridge SCRAMs every reactor (decapitation). The bridge keeps its backup supply. At L3 control and structure run over the same live walls, so control is lost only with the bridge or by a split (the "cut the power walls" route of #82 is power, L2) |
| Life support in fragments | §13d.1 as amended by #207: a room keeps life support while joined to a reactor able to produce; a dark fragment's crewed rooms lose it, the bridge keeps it on its backup |
| Validation (`js/layout.js`, #57) | A ship undocks only if: every room connects to the bridge through live walls; every hull room (beam bay, turret, missile bay, engine) has an open edge, and an engine's exhaust face is open with **no cell aft of it** in its rows (clear exhaust); a fitting sits on an open edge of a room that is not inside, at most one per edge (#15); no room overlaps another or leaves the drydock grid (`TIERS` grid). **Inside** (bridge, reactor, magazine, shield generator, quarters) means the room carries no fitting; it may touch the hull. Each failure names its rule |
| Readout (#58) | The shipyard's physics readout is computed from the same functions: M, centre of mass, I, acceleration in g with every engine at full throttle (`FIXED.standardGravity`), angular acceleration from every RCS couple, and the heat balance at a stated load against the radiators' capacity at plant hot |

### 13f.2 The reference ship R1

The smallest valid ship with each built room type once (the railgun and the
missile bay stay data only until their levels, #185 (3)); x forward, cells
[x0, x1) × [y0, y1):

| Room | Cells | Room | Cells |
|---|---|---|---|
| engine (rotated, exhaust at x = 0) | [0,3) × [2,4) | heat sink | [3,5) × [4,6) |
| reactor | [3,5) × [2,4) | quarters | [5,8) × [4,6) |
| bridge | [5,7) × [2,4) | turret | [8,10) × [4,6) |
| magazine | [7,9) × [2,4) | shield generator | [3,5) × [0,2) |
| beam bay | [9,11) × [2,4) | hold | [7,9) × [0,2) |

Fittings, one per open edge: 17 radiators (engine 2 top + 2 bottom on
columns x = 1, 2; heat sink 2 top + 2 aft; shield generator 2 bottom + 2
each side; beam bay 2 bow + 1 bottom at x = 9) and 4 RCS (top and bottom
edges of the engine's column x = 0 and of the beam bay's column x = 10).
No fitting on an engine's exhaust face. Coolant loop: engine, reactor, heat sink and shield generator; the
beam bay sits outside it (passive walls only), on purpose.

**Estimates for R1** (cells, contents, 17 radiators and 4 RCS): M ≈ 52.3 t,
centre of mass (28.73, 16.47) m, I ≈ 1.313e7 kg·m²; the engine's thrust
line (y = 15 m) passes 1.47 m below the centre of mass.

### 13f.3 Scenarios (#209)

Conventions as L2 (#177, #185 (2), #194): inputs from `data.js`, closed
forms where they exist, otherwise the scenario's own reference integrator
(never kernel code), no case on a threshold or a whole number of steps
unless it tests that; every scenario checks the heat books, Σ flows = 0,
event fields, no NaN, determinism, and from L3 the **momentum books**:
ship + rounds + debris conserve momentum and angular momentum to 1e-9.

| # | Scenario | Setup and measure | Expected and criterion |
|---|---|---|---|
| 1 | `L3.mass.props` | one cell; each M room alone (contents full and empty); R1; R1 after 20 rounds fired and after 4 cells destroyed; T1 and T6 | M, centre of mass and I against the cell sums of 13f.1, 1e-12 relative; a T1 cell 1000 kg, a heat sink cell 1573 kg; mass ∝ edge³ and I ∝ edge⁵ from T1 to T6 (1e-12) |
| 2 | `L3.thrust` | (a) a symmetric test ship (bridge, reactor, engine on one axis) at full throttle, 10 s; (b) R1 at full throttle, 10 s, no RCS | (a) a = F / M to 1e-9 and ω = 0 to 1e-12 (thrust through the centre of mass); (b) ω(t) = α t with α = F d / I (estimate 0.224 rad/s², 12.9 °/s²) to 1e-9, position and heading against the reference integrator, 1e-6; readout acceleration (estimate 3.90 g for R1 at 2 MN) exact |
| 3 | `L3.rcs.turn` | R1, engine off, a bow–stern RCS couple fired bang-bang to turn 90° and stop | α = Σ r × F / I (estimate 0.381 rad/s², arms 50 m); the turn takes 2 √(θ / α) (estimate 4.06 s), one-sided on the step grid; final |ω| ≤ α dt; readout turn rate exact |
| 4 | `L3.recoil` | R1's M turret fires N ∈ {1, 5, 20} rounds broadside and forward; a railgun-sized fixture impulse of 25 000 N·s (10 kg at 2500 m/s, #54) along the axis and 5 m off it | ship momentum change = −Σ round momenta (1e-12) and Δω per shot = (r × p) / I with I updated as rounds leave (1e-9): estimates 0.092 m/s and 0.34 °/s per broadside shot, 6.8 °/s after 20, 0.18 °/s per forward shot; fixture 0.48 m/s and 0.55 °/s; the measured numbers go to §16 for E4 (#203 C) |
| 5 | `L3.split.momentum` | R1 moving at 10 m/s and turning at 0.05 rad/s; the bridge cells (5,2), (5,3) and the heat sink cells (4,4), (4,5) are destroyed in one step | two fragments (stern ≈ 17 t: engine, reactor, shield generator, half the heat sink; bow ≈ 25 t: bridge half, magazine, quarters, turret, beam bay, hold) and 4 cells of debris (≈ 5 t); mass, momentum, angular momentum about the origin and kinetic energy conserved (1e-9); each fragment's v and ω equal the parent's velocity field at its centre of mass (stern ≈ (10.10, −0.68) m/s, bow ≈ (9.95, 0.56) m/s, cells only) |
| 6 | `L3.fragment.scram` | the cut of row 5 from rest, the reactor at demand 0.5 and the shield on; a cut that keeps bridge and reactor together; R1 with the bridge destroyed | the stern reactor SCRAMs at the split step (`scram`, cause the destroyed cell), its decay heat follows L1 (closed form, 1e-9); the stern engine and shield stop; the bow bridge keeps control on its backup and its life support runs, while the quarters', magazine's and turret's stop (#207); the kept-together cut runs on; the destroyed bridge SCRAMs every reactor |
| 7 | `L3.validation` | R1 and one variant per rule of 13f.1 (a room cut off, a hull room with no open edge, an exhaust blocked by one cell aft, a fitting on an inside room, two fittings on one edge, an overlap, a room outside the grid) | R1 valid; every variant rejected with exactly its rule's reason |
| 8 | `L3.ship.heat` | R1 without power routing (fixed loads, every room powered): idle (bridge and quarters only), cruise (shield on, engine at 0.5, the reactor delivering 7.25 MW) and battle (cruise plus the beam firing, 19.75 MW) for 900, 900 and 600 s | books per room and per ship 1e-9; the readout's heat balance and radiator capacity at plant hot (17 panels: 2.81 MW) exact; event times (hot, overheated, SCRAM) against the scenario's reference integrator, which carries every L1, L2 and D-pass rule over the whole run, 1e-3: estimates idle none (plant rooms near 300 K), cruise hot at 509 s (shield generator), 513 s (reactor), 550 s (engine), nothing overheated in 900 s (reactor peak ≈ 743 K), battle beam bay hot at 103 s and overheated at 178 s (it sits outside the loop), reactor hot at 157 s, later events after the beam bay's shutdown left to the reference; crewed rooms ≤ 295.01 K while life support runs (#205 (8)) |
| 9 | `L3.kinetic.hole` (#212) | an M round along a line of six M quarters (D1's line) with the 2nd cell destroyed beforehand, and the same line intact | the destroyed cell takes nothing from the round and loses no integrity; the round stops one cell deeper than in the intact line (D1: in cell 11 of the intact line, so in cell 12), its stopping loss by the D-pass rule; deaths by the floor rule |

`node tools/perf.js` (new, not a scenario: timing is not deterministic)
reports milliseconds per step for two R1s at T1 and T6 stepping together
(the E8 baseline; a 10-room cluster costs about 0.066 ms per step today).

### 13f.4 Constants and approved ranges (#210)

| Constant | Value | Range | k |
|---|---|---|---|
| `thermal.specificHeat` | 600 J/(kg·K) | 400–900 | 0 |
| `FIXED.waterSpecificHeat` | 4186 J/(kg·K) | fixed | — |
| `FIXED.standardGravity` | 9.80665 m/s² | fixed | — |
| `engine.thrust` (re-tuned, #203 A) | 2 MN | 0.5–8 MN | 2 |
| `rcs.force` | 100 kN | 30–500 kN | 2 |
| `rcs.powerDraw` | 200 kW | 50 kW–1 MW | 2 |
| `rcs.mass` | 200 kg | 50–1000 kg | 3 |
| `radiator.mass` | 250 kg (10 kg/m², an ISS panel) | 100–1000 kg | 2 |

Readings at T1: a 52 t minimal ship accelerates at 3.9 g on one engine; a
250 t corvette with two engines at 1.6 g (dodging 1–2 g, #54); R1 turns 90°
in 4 s on one RCS couple, a 250 t corvette (I ≈ 3.5e8 kg·m², two couples
60 m out) in about 10 s; the same layout at T6 turns 6× slower (I ∝ edge⁵,
torque ∝ edge³) and accelerates 6× slower; an M shot turns R1 by 0.34 °/s
broadside and a 250 t corvette by about 0.02 °/s (#206: 0.35 °/s after 20
shots).

### 13f.5 Kernel, tools and process (#211)

Files (§14): `js/body.js` (mass properties, rigid body, impulses,
fragments' bodies), `js/graph.js` (structure and control graphs),
`js/layout.js` (validation, fittings on open edges), `js/rooms.js`
(engine and RCS forces, recoil, SCRAM on control loss), `tools/perf.js`.
Every L0, L1, L2 and D-pass scenario VERIFIES unchanged except
`L1.engine.thrust` and any whose records hold `engine.thrust`, which
re-record with the new value and must still PASS; any other verdict change
is a finding. Scenarios locked in their own commit before the first
canonical run; physics checker blind from 13f.1, 13f.2 and 13f.4; reviewer
on the final head. **Signals to measure, not to fix at L3**: recoil turns a
minimal ship visibly (E4 is judged at L5); R1 cannot hold shields and half
thrust for ten minutes on 17 radiators without passing plant hot, and a beam bay outside the coolant
loop shuts down after about three minutes of firing (the throughput law
binding, #205 (8)); control and structure coincide at L3. E8's
budget is **1 ms per step in Node** for a T1 and a T6 1v1 (the owner,
#213); `tools/perf.js` measures the L3 baseline against it, and L5 checks
it with combat on.

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

**L1 one room alone** (2026-10-21; 16 scenarios, 199 cases, each locked
before its first canonical run; 15 PASS and VERIFIED, `L1.radiator.steady`
FAILs and is **WITHDRAWN** for a specification error (#185, #187 (8)),
replaced by `L1.radiator.steady.v2`; T1, size M, SI; constants of §13c.3.
The first run also failed 2 of 20 cases of `L1.quarters.repair` on a
kernel bug, a repaired cell reported one step early; the kernel was fixed
and L1 re-run, the criterion untouched. All L0 and L1 records were
re-recorded when the data hash widened to `PARAMS`, `FIXED` and `ROOMS`
(#185 (9)), and again when it took in `TIERS` and `BASE_EDGE` (#189 (7));
both times only `dataHash` and `code` moved. The reviewer's fixes of #189
landed without changing any recorded result: the destroyed count is the
cells destroyed now (a cell stays destroyed until repaired to integrity
1), an exploded room never explodes or melts down again, the turret fires
on accumulated time, the bridge raises `control-restored`, and the lock
line and `withdrawn.json` are validated):

| Scenario | What the numbers say |
|---|---|
| `L1.radiator.cooling` | An idle M turret with one panel cools from 1000 K to 970.0 K in 60 s (two panels: faster, per n); at 400 K it loses under 1 K. The stepped temperature matches the T⁻³ closed form within 1e-3 at 400–1200 K and T1–T6 (T6 cools slowest: C grows k = 3, A k = 2); radiated + heat left = initial heat to 1e-9 |
| `L1.radiator.steady` | **FAIL, WITHDRAWN** (successor `L1.radiator.steady.v2`, #185; listed in `mission0/withdrawn.json`, its lock and FAIL kept). Only one case lies below a crewed room's critical (0.1 MW, 4 panels, T_ss = 374.1 K): after 3600 s from rest the room is at 351.8 K, radiating 78.1 kW of 100 kW. Its time constant C T_ss / (4P) is about 2200 s, so one hour is not "steady" to 1e-3; the formula is not contradicted, the run is too short |
| `L1.radiator.steady.v2` | An idle M beam bay (plant class, switched off), 11 (P, n) pairs with T_ss below 1000 K (2 MW on one panel, 1119 K, is out): T_ss from 374.1 K (0.1 MW, 4 panels) to 940.9 K (1 MW on 1, 2 MW on 2). **(a)** Started at T_ss, the room holds it for 600 s with a largest deviation of **exactly 0** in every case, and radiates P (100 kW to 2 MW) with IR brightness = P to 1e-6. **(b)** From rest, the temperature rises in every one of the 216 000 steps, never passes T_ss, and the gap shrinks every step; after 3600 s it is 22.8% short at 0.1 MW on one panel (time constant ~3200 s) and 5.7e-7 short at 2 MW on four (~240 s); the smallest single-step rise is 3.2e-8 K, far above float resolution |
| `L1.room.thresholds` | Under 1.1 MW, all nine rooms cross hot, overheated and critical in that order at C (T_x − T_rest) / P, one-sided: a crewed 2×2 room is hot at 87.3 s and critical at 196.4 s, a plant room critical at 1549 s. Each shuts down at overheated; at critical its crew die (bridge 4, reactor 4, engine 2, magazine 2, shield 2, quarters 18, beam bay 3, turret 3, hold 0); the full HE magazine cooks off (375 MJ) and the reactor melts down (200 MJ), cause 'heat' |
| `L1.reactor.power` | Delivered = d P exactly; heat = d P; an M reactor alone at full overheats at 61.2 s (122.4 s at half, 244.8 s at a quarter; T6 367.2 s, since C grows faster than P); in the next step it delivers 0 and decay heat has begun (f h d P τ (1 − e^(−dt/τ)) to 1e-9); at d = 0 it stays at 290 K |
| `L1.reactor.scram` | A control cut stops delivery within one step (event cause 'control-loss'); decay heat adds 81 / 796 / 928 MJ by 60 / 900 / 1200 s from full; SCRAMmed at 600 K the reactor melts down at 1291.6 s (21.5 min) with a 200 MJ explosion; from rest it peaks near 815 K (it does overheat) and never melts down; an idle reactor gets no decay heat |
| `L1.reactor.breach` | The countdown starts at the 2nd of 4 and the 5th of 9 destroyed cells (the ≥ threshold itself); the explosion follows 10 s later (200 MJ, caused by the breaching hit); destroyed entirely, a reactor explodes at the last hit (4 s, 9 s), once |
| `L1.magazine.cookoff` | Full magazines hold 150 M, 506 S, 44 L rounds; full AP is a 75 MJ bomb, full HE 375 MJ (S and L scale by (2/3)³ and (3/2)³); cook-off at 349.09 s under 1.1 MW at every tier (source scaled k = 3), cause 'heat'; a hit that destroys a cell sets it off at once, cause the hit |
| `L1.turret.fire` | Shots = min(n, 1 + floor(rate t)) at T1–T6 (one every 2 s at T1, every 12 s at T6); recoil impulse, heat and energy drawn match exactly; 5 rounds run dry at 8 s with a 'dry' cease-fire; unpowered it never fires |
| `L1.shield.generator` | At the generator an M shield absorbs min(P_in, 10 MW) and is EM-bright by exactly that; under the M beam it heats at 7 MW and shuts down at 174.9 s (102 s under 10 or 30 MW, 306 s under 2 MW); then the whole beam passes and it stops heating; unpowered the field is off from the start |
| `L1.engine.thrust` | Thrust u F, draw u D, heat 0.3 u D, a = u F / m exactly (8 MN on 1500 t: 5.33 m/s²); no power or no control gives zero thrust and draw; full throttle is hot at 372 s at T1 (2232 s at T6) |
| `L1.quarters.repair` | Housed crew 3 per surviving cell (18, 9, 3, 0); 3 die per destroyed cell; repair 0.02 /s × (c / 6) × g(r): a destroyed cell next to full quarters is whole in 50 s, at the radius in 100 s, at 4 radii in 850 s; quarters with one cell left take 6 times longer; with none, nothing |
| `L1.bridge.control` | Control holds while any cell survives and with the power cut (the backup feeds the 100 kW draw); the 4th destroyed cell removes it, 'control-lost' caused by hit-4; alone the bridge's own draw makes it hot in 960 s |
| `L1.beambay.heat` | Draw 12.5 MW for a 5 MW beam, 7.5 MW of heat: hot at 99.2 s, shut down at 163.2 s, after which beam and draw are 0 ('beam-stopped', cause 'heat'); T6 979.2 s; unpowered no beam |
| `L1.repair.breach` (#189) | Full quarters 7.5 m from an idle M reactor rebuild a destroyed reactor cell in 53.13 s (repaired at 54.13 s, closed form 54.125 s); the destroyed count is then 0, so the next hit (1 of 4) does not breach and the one after (2 of 4) does; the explosion follows 10 s later (200 MJ, cause hit-3). One crew member dies per destroyed cell (3 hits, then the explosion takes the last: 4 of 4). Heated by 1.1 MW for 2000 s, the wreck passes its critical temperature (1206.7 K) with no meltdown and no second explosion |
| `L1.room.restart` (#189) | An M engine at full throttle with two panels cycles: shutdown at 800 K, restart below 600 K after 1258.7 s (closed form within 1e-4: 1.1e-6 to 3.3e-6 relative here), full thrust again, 4 shutdowns and 3 restarts in 6000 s. An M bridge heated past 350 K loses control at the overheated step ('control-lost', cause 'overheat': **heat decapitates**), regains it at the restart 1412.08 s later (closed form 1412.078 s, 4.0e-6 relative; 'control-restored'), no crew deaths |

The locked `L1.bridge.control` lists the law "decapitation only by
destruction"; that text is **superseded by #185 (6)** (an overheated or
switched-off bridge gives no control), which `L1.room.restart` now locks.
The `L1.reactor.scram` case started at 600 K sits exactly on the plant
hot threshold (#177); its lock stays (#189 (9)).

Honest reading. Strong: the radiator cooling (Euler against the T⁻³
closed form over five temperatures and six tiers), the radiator's fixed
point (v2: at T_ss the per-step imbalance P − nεσA·T_ss⁴ is below the
float resolution of the stored heat, so the temperature does not move at
all; a kernel area or emissivity off by 1e-5 would fail it, through the
radiated power at 1e-6 in every case and the temperature in the fast
cases (time constants under about 1100 s), as #187 (3) intends), the decay heat and the
meltdown time (an exponential integrated per step against the logarithmic
closed form), the breach threshold tested exactly at 2 of 4, the heat
books and event fields checked in all 199 cases, and the tier sweeps.
Close restatements of their formulas: the engine, the shield generator's
rates, the beam bay's rates, the turret's counts and the magazine's
energies; their value is locking the rules. **Caveat on the one-sided
times** (#185 (2)): many cases the plan lists land exactly on a whole
number of steps, so **19 of the 96** one-sided times pass only through the
1e-9 relative float slack on their bounds, i.e. the window is effectively
closed there (the earlier count of 18 + 5 was wrong; the 19 were found by
evaluating `expected <= actual < expected + dt` without slack on every
call, the command is in PR #5). At expected + dt (14): `L1.reactor.power`
T1 at full (61.2 s); `L1.bridge.control` powered and cut (960 s);
`L1.quarters.repair` c = 6 at 0, 0.5, 1 radius (50, 62.5, 100 s), c = 3
at 0, 0.5, 2, 4 radii (100, 125, 500, 1700 s), c = 1 at 0.5, 1, 2, 4 radii
(375, 600, 1500, 5100 s). One rounding error below expected (5):
`L1.reactor.power` T1 at half and T3 at full (122.4 s); `L1.beambay.heat`
T2, T4, T6 (244.8, 489.6, 979.2 s). From L2 on no case lands on a whole
number of steps unless it tests that (#185 (2)). Signals for L2 and the
designer: (1) `L1.radiator.steady` is withdrawn and its successor passes;
(2) a turret firing freely overheats at 16 min and shuts itself down, so
its own heat never reaches critical (#185 (7)); (3) a reactor SCRAMmed at
full from rest still crosses overheated (815 K peak) and does not melt
down, as intended (#185 (8)); (4) a bridge alone overheats in 24 min on
its own draw and, shut down, gives no control: heat can decapitate
(#185 (6)); (5) crewed rooms radiate almost nothing, so their cooling is
all L2; (6) **an overheated reactor without wall cooling always melts
down** (#187 (5)): an M reactor that overheats at full power has 1.26 GJ
of decay heat to come against 0.48 GJ of margin to critical, so heat
discipline must act before overheated (#18b), and L2 measures whether
conduction through its walls to radiator rooms saves it.

**L2 pairs and clusters, first run** (2026-10-21; superseded where it
concerns heat by #200 and #201, see the next block: of these 12 scenarios
`L2.heat.pair`, `L2.heat.chain`, `L2.heat.neighbour` and
`L2.bridge.conduction` are withdrawn and their numbers below describe the
replaced wall rule; 12 scenarios, 95 cases, each
locked before its first canonical run (commit `621f2c6`); **10 PASS, 2
FAIL**; T1, size M, SI; constants of §13d.3; in review on
`m0/l2-clusters`. The seven constants changed the data hash, so every L0
and L1 record was re-recorded with only `dataHash` and `code` moving, and
every L0 and L1 scenario still VERIFIES with unchanged results and run()
hashes. Cases added by the engineer beyond §13d.2, so the plan's claims
have something to bite on: two small HE loads in `L2.blast.walls`, 20 MW
beams in `L2.shield.overlap` (b), N = 80 in `L2.shield.buffer`):

| Scenario | What the numbers say |
|---|---|
| `L2.heat.pair` | Two M rooms over 10 m relax with τ = 30 s (5 m: 60 s; ordinary–hold: 165 and 330 s); ΔT follows ΔT₀ e^(−t/τ) within 1.02e-4 ΔT₀ at every step (Euler); C_a T_a + C_b T_b drifts by at most 1.5e-14; the fitted τ is in proportion to the edge from T1 to T6 |
| `L2.heat.chain` | **FAIL.** Without a hold the three rooms match the eigen-decomposition within 7.3e-4 K at 300 s; with a hold in the middle the Euler error is 2.1e-3 K, over the plan's 1e-3 K, and the hold lets **43.3 %** of the heat through to the third room (closed form 43.27 %), not < 15 %: at 300 s the hold walls (τ ≈ 330 s) have not finished slowing it. Both are the plan's numbers, not the kernel's: the kernel agrees with the closed form to its Euler error |
| `L2.heat.neighbour` | Direct walls, all 8 PASS: a reactor at a quarter of its power cooks a magazine off in 183.6 s (10 m) or 211.9 s (5 m) and kills all 18 crew of quarters beside it in 143.3 s (10 m) or 173.6 s (5 m); at half power 105.9 / 129.9 s and 86.8 / 110.5 s; the reactor itself would overheat only at 187–558 s. **FAIL** on the hold cases: an M hold between them saves the neighbour through 900 s only behind 5 m walls (magazine 404 K and 414 K at the end; quarters at a quarter power 374.6 K); behind 10 m walls the magazine still cooks off (654 s at d = 0.25, 624 s at d = 0.5) and the quarters' crew die (530 s, 471 s), and at half power behind 5 m walls too (879 s). The hold delays death by 6–13 minutes; it does not prevent it, because after the overheat the reactor's stored heat and decay heat keep flowing outwards. In every hold case the kernel matches the reference integrator (overheat within one step; temperatures within 1e-3 K except two cases that stop one step apart on the critical threshold) |
| `L2.reactor.cooled` | The battle clock of one M reactor at full power: **overheat at 61.2 s alone, 94.1 s with one cooled neighbour, 146.3 s with two, 278.3 s with four** (three not run); alone it melts down at 492.5 s (reference 492.8 s, L1 closed form 492.8 s); with one or more neighbours it never melts down in an hour but cycles between 800 K and its restart below 600 K (2, 4 and 5 shutdowns). The lead designer's estimates hold. The n = 0 overheat lands on a whole number of steps (3672), so the kernel crosses one step after the reference and its meltdown comes 0.37 s earlier (7.4e-4, inside the 1e-3) |
| `L2.power.flow` | Delivery equals the priority-ordered max flow by cut enumeration in all 9 graphs, to the watt: a 5 m wall carries 10 of a beam bay's 12.5 MW (it fires 4 MW and heats 6 MW); power passes through a hold; the hold-bay wall losing 1 and 2 cells gives 12.5, 10 and 0 MW; two reactors (30 MW) and 35 MW of consumers give 12.5 / 10 / 7.5 MW under one priority list and 12.5 / 12.5 / 5 under the other |
| `L2.ammo.feed` | An M turret is fire-limited on both walls (154 shots: the 4-round store and 150 fed); an L turret on a 5 m wall is **feed-limited**, one round every 5.625 s instead of every 3 s (48 shots, 30 by 150 s against 48 on a 10 m wall); a turret not touching the magazine fires its 4 ready rounds and stops. Counts match the closed form at all 30 measurement times |
| `L2.blast.walls` | The wave front of 13d.1 exactly, in all 12 cases: a full HE magazine (375 MJ) or a half AP one (37.5 MJ) saturates every room of these small clusters (6–16 MJ of capacity) and the rest escapes; 5 and 10 MJ show the split by wall length (of 5 MJ, a hold beside the magazine takes 1.5 MJ and the first room 1.5 MJ; of 10 MJ, the first room fills and the hold takes 5 MJ as the front moves on) |
| `L2.shield.overlap` | Two M generators share a beam between them in halves; at 20 MW midway they absorb 16 MW (40 m apart) or 10 MW (80 m). With a beam at each generator **no generator pays more than its 10 MW**: at 10 MW the asks sum to exactly the budget, at 20 MW the rule cuts each point from 15 (or 12) MW to 10 MW. The double counting of #170 is gone |
| `L2.shield.buffer` | An M round costs 142.2 kJ to stop (800 → 266.7 m/s): salvos of 5, 20, 40 leave 9.29, 7.16, 4.31 MJ of the 10 MJ buffer, so **the buffer binds only at round 71**; at N = 80 rounds 72–80 pass at 800 m/s. It refills at the full unused budget in one second. The plan's salvos never reach it (E4 still needs a real salvo of 71 M rounds in one step, L5) |
| `L2.repair.shared` | Two damaged cells at 0.25 radius share one quarters' budget (0.01 /s each instead of 0.0188); at one radius the asks sum to exactly the budget; one cell alone is repaired at L1's rate; two quarters overlapping add (0.0288 /s); no quarters ever pays more than its budget |
| `L2.size.rule` | In a cluster an L reactor delivers 45 MW, houses 9 crew and explodes at **450 MJ**; an L magazine holds 168.75 kg; an L turret fires 1.6875 kg rounds at a third per second, 1.0125 MJ of heat per shot, drawing 450 kW, with 7 crew |
| `L2.bridge.conduction` | An M bridge heated by 1.1 MW overheats at 217.1 s (control lost, cause `overheat`) and, cooled only through its wall into a hull room with 4 radiators, restarts 933.1 s later (control restored, cause `restart`); reference 933.13 s. No radiator on the bridge, no crew deaths |

Honest reading. Strong: the conduction against two closed forms
(exponential pair at six tiers, the chain's eigen-decomposition), the
reference integrators of the neighbour, the cooled reactor and the bridge
(RK4 against the kernel's Euler, with the L1 shutdown, decay heat and
restart on the step grid), the power flow against cut enumeration (an
algorithm unlike the kernel's augmenting paths), and the feed counts at 30
times. Close restatements of their rules: the blast split, the shield
overlap, the buffer, the repair sharing and the size rule; their value is
locking the rules, and the engineer-added cases are what make the blast
and buffer checks bite. What the numbers said for the design under the
replaced rule (no longer true since #200: crew beside a running reactor are
safe while life support runs, see the next block): a running reactor
cooked its neighbours within one battle, and one empty hold bought 6–13
minutes rather than safety. Still true: one cooled neighbour is enough to stop a
meltdown (#187 (5) answered), but the reactor then cycles between 600 and
800 K; a 5 m wall starves a beam bay and an L turret; the shield buffer
still had no effect at realistic salvo sizes (the D pass's 6 kg round
makes it bind at the 6th, #206). Signals for L3: power
routing, feed and conduction now depend on which cells survive, so
fragments (L3) will change power and heat paths mid-battle; the reactor
restart cycle (shut down, restart below 600 K) will need a control-path
rule; the bridge relies on its backup supply in a routed cluster (#147);
rounds in overlapping shields are not built (a question in the pull
request).

**L2 after #200 and #201: the coolant loop, life support and the heat
sink** (2026-10-21; kernel `21deae1` and `53bc67c`; seven scenarios, 42
cases, locked at `bb2c50b` before their first canonical run; all PASS;
code `fd649fa`). The new constants changed the data hash, so L0 and L1
were re-recorded with only `dataHash` and `code` moving, and all 28 still
VERIFY with unchanged results and run() hashes (a room alone has no
walls). Every L2 record moved: the books now carry `pumped` and `vented`;
beyond that shape, the results of `L2.blast.walls`, `L2.power.flow`,
`L2.reactor.cooled`, `L2.repair.shared`, `L2.shield.buffer`,
`L2.shield.overlap` and `L2.size.rule` are unchanged (their heat runs only
through coolant walls, or none), and `L2.ammo.feed` still PASSes with its
magazine–turret wall now passive (the heat it moved fell from 23 MJ to
0.5–2 MJ; nothing it checks depends on it).

| Scenario | What the numbers say |
|---|---|
| `L2.heat.pair.v2` | Two coolant rooms over 10 m relax with τ = 30 s (5 m: 60 s), ΔT within 1.02e-4 ΔT₀ of the closed form at every step, τ in proportion to the edge from T1 to T6 (45, 60, 90, 120, 180 s). A 600 K coolant room beside a passive neighbour barely moves in an hour: τ = 26 400 s through a hold (10 m; 52 800 s over 5 m), the hold reaches 309.8 K; τ = 4 800 s into an unpowered magazine, which reaches 371.8 K (338.5 K over 5 m). Energy constant to 2.2e-14 |
| `L2.heat.chain.v2` | Through two coolant walls the three rooms meet near 393 K in 300 s (closed form within 7.25e-4 K); through a hold the third room receives **4.855e-5** of that heat (0.012 MJ against 245.5 MJ), as the lead designer estimated |
| `L2.heat.neighbour.v2` | A reactor at a quarter or half power beside a full HE magazine or crew quarters over a 10 m passive wall: with life support the neighbour never passes **295.0011 K** in 15 min (it pumps 92–151 MJ back into the reactor); without it the neighbour peaks at 331.0 / 337.8 K (magazine) and 317.7 / 322.3 K (quarters), as estimated, far below cook-off (450 K) and crew death (380 K). The reactor, with no radiators, overheats at 123 / 247 s and, on decay heat, peaks at 833–966 K: **with life support pumping its heat back it reaches 950 K (magazine) and 966 K (quarters) at half power, 34 K from meltdown** |
| `L2.lifesupport` | Quarters with 300 kW of life support under an enemy beam: at 0.2 MW they hold 295.001 K for 15 min (213 MJ pumped into the beam bay, which climbs to 355 K); at 1 MW the crew die at **439.2 s** and at 5 MW at **68.4 s**; unpowered, at 327.9 s and 65.0 s, and at 0.2 MW they reach 338.1 K. The row's estimates (425 s, 68 s) left out the passive wall and the quarters' draw stopping at overheated (350 K), which add 14 s at 1 MW |
| `L2.bridge.conduction.v2` | A bridge under 1.1 MW overheats at **142.95 s** (control lost) and restarts **230.6 s** after the source stops (control restored), life support moving 74.7 MJ into the beam bay; reference within one step. The row estimated about 480 s: that holds only if a shut-down bridge kept drawing its 100 kW (451 s); the L1 rule stops it |
| `L2.heatsink.buffer` | A reactor delivering 12.5 MW overheats at **166.0 s** beside an idle beam bay and **420.9 s** beside a heat sink at T1 (estimates 166 / 421 s); at T3 (same layout, 20 m wall) 331.9 / 841.7 s. A heat sink multiplies the battle clock by 2.5 |
| `L2.heatsink.loss` | Each destroyed cell of a 600 K heat sink vents exactly 930 MJ, T stays 600 K, C and Q fall by 3e6 J/K and 1.8 GJ; the last cell empties it. A reactor placed beside the damaged sink overheats at 132.1, 129.2, 125.3, 103.1 and 97.9 s for 0–4 cells lost (the third loss also halves the wall). Note: a sink already at 600 K makes the reactor overheat **sooner** than a cold beam bay does (132 s against 166 s): a full sink is a liability |

**Withdrawn** (`mission0/withdrawn.json`; locked and recorded with their
FAIL; `verify` and `regress` report them WITHDRAWN): `L2.heat.pair`
(superseded by #200: its hold cases expect τ = 165 / 330 s, the passive
wall gives 26 400 / 52 800 s) and `L2.bridge.conduction` (superseded by
#200: it expects overheat at 217.1 s and restart 933.1 s later, the
passive wall and life support give 143.0 s and 230.6 s), successors
`L2.heat.pair.v2` and `L2.bridge.conduction.v2`; `L2.heat.chain` and
`L2.heat.neighbour` (specification errors, #201 (2)), successors
`L2.heat.chain.v2` and `L2.heat.neighbour.v2`. Under the #200 kernel these
two fail differently from their first records (the chain's hold case is
off by 139 K against the old conductance; every neighbour case now fails,
since nothing cooks), so they were re-recorded canonically: their
records show the #200 kernel's FAIL, and the replaced rule's FAIL stays
in the git history of the record files. `L2.reactor.cooled` depends on
the withdrawn `L2.heat.pair`; `tools/m0.js` now lets a withdrawn
dependency count through its successor (#188).

Honest reading. Strong: the coolant and passive walls against closed
forms (pair, chain) and the heat sink's clock against its closed form at
two tiers; the vent law to 1e-12; the reference integrators for the
neighbour, life support, the bridge and the damaged sink (RK4 against the
kernel's Euler, with life support taken once per step as 13d.1 states it,
and the L1 shutdowns on the step grid). Weaker: the life-support cases
pass partly by construction (the pump is capped at what lies above the
setpoint), and the row-16 closed form is shown, not checked. What the
numbers say for the design: **crew beside a running reactor are now safe
as long as life support runs** (about 0.001 K above 295 K), and without
it they reach only 318–338 K in 15 minutes; **enemy beams are what kill
crew by heat** (1 MW: 7.3 min; 5 MW: 68 s); life support pumps the heat
back into the coolant loop, so it lengthens the crew's life at the
reactor's expense (a reactor at half power without radiators reaches
950–966 K); the heat sink buys 2.5× the clock when cold and costs time
when already hot; losing it shortens the clock as the dependency law
wants. Signals: whether life support should stop when its room shuts
down, and whether it should draw power, are open (questions in the pull
request); a full heat sink beside a cold reactor is a heat source. Answered by #205 (3)
and #207: life support keeps running in a shut-down room while the room is
powered (under routing: joined to a reactor able to produce); it draws
no power until L3. Reviewer (#207): the split by wall length and the
setpoint clamp moved no L2 criterion; D5 tests them.

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
