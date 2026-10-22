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

**When play is not fun** (#223, the owner), in this order: (1) tune
constants within their approved ranges; (2) find new play in combinations
of the physics already built (rooms, presets or standing orders that reuse
existing laws, each through `IDEAS.md` and the four gates); (3) only then
change a law or the direction, which is the owner's. Combinations do not
fix pacing (that is rung 1), and a combination the player cannot read on
screen does not count.

**Every interaction is symmetric** (#228, the owner): an agent and what it
meets exchange the same quantity (impulse for a round, energy for a beam)
and each is damaged by it against its own strength (Newton's third law: a
bird strike wrecks the bird and dents the aircraft). New behaviour must
follow from the physics already in the model and real material constants,
never from a factor added to correct an outcome. **One recorded exception**
(#240 (2)): the shield slows a round by a field, so the round is not
damaged; the momentum the field removes goes to the ship holding the
generator and the energy to the generator's heat. Everything that resists
(kinetic, beam deposit and burn, blast, heat capacity, repair) follows the
cell's mass, heat by the **thermally coupled** mass of the room type
(#240 (1); built in physics pass 2, §13k).

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
(#7); the enemy's decisions (when to dodge or switch a preset) may draw
from the seeded stream, the player's ship never does (#240 (3)). Four kernel models: 2D rigid body, per-room heat, falloff fields,
projectiles (#8).

| Law (kept) | In the game |
|---|---|
| Inertia, moment of inertia | Mass far from the centre turns slowly; recomputed when blocks are lost |
| Recoil (Newton 3) | Every gun pushes its ship by the momentum of its round, beams almost not at all; at real masses a turret's push is tiny (as on real warships) and only the spinal railgun's heavy slug is expected to move or turn a ship visibly; RCS compensates. L3 measures it, E4 cuts it if it has no effect (#203 C) |
| Centre-of-mass shift | Losing a flank moves the CoM; aligned engines become off-axis |
| Heat and radiators | Heat leaves only by radiation, through radiators on the hull; **Stefan–Boltzmann**: radiated power ∝ area × emissivity × T⁴ (#143). Inside, heat moves fast only along the machinery's **coolant loop** (plant rooms and heat sinks sharing walls); crewed rooms and magazines are insulated (a bulkhead leaks little) and cooled by **life support**, which pumps their heat into the loop (#200, #201) |
| Infrared | Only surfaces are seen; deep reactors are invisible until heat reaches the hull; IR brightness also ∝ T⁴ (#102) |
| Inverse-square, distance⁴ | Passive sensing and jamming fall off with distance²; active scans with distance⁴ (#24). A beam's divergence is a few microradians, so at battle range it does not fall off (#230) |
| Time of flight | Rounds and missiles travel; ships dodge |
| Square–cube | Cell mass ∝ edge³, hull area ∝ edge²: big ships have less hull per tonne (#63) |
| Fail-safe reactors | Losing control SCRAMs a reactor; decay heat follows (#81) |

Cut: kinetic energy ½mv² as damage, decompression thrust, I²R resistance.
Deferred: sloped armour (#6), now with tumble in `IDEAS.md`, after prototype v2 (#230).

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
(mass k=3, area k=2, length k=1). `CONSTANTS.md`, generated from
`js/data.js`, is the only table of values and ranges; this document gives
the rules and the reasons, not a second copy of the numbers.

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
| Magazine | 2×2 | inside | ammunition by contents, fed through walls; explodes by the ammunition left: the propellant dominates, HE adds about a third (#215) |
| Shield generator | 2×2, 3×3 | anywhere; a plant room that may carry fittings (#219) | shield field; EM-bright while absorbing; absorbing makes heat |
| Crew quarters | 3×2 | inside | houses crew, sets crew capacity (#60); repair field by surviving cells (#51) |
| Beam bay | 2×N, 3×N (a linear accelerator, #234) | along the axis, bow face open | much power, very much heat; the longer, the deeper its beam reaches; its firing window stays open while firing |
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
| Beam (a **neutral particle beam** from a spinal accelerator, #229, #234, in place of the maser of #203 B; §13i) | near light speed, no falloff at battle range | power and very much heat | almost none | energy lost along its path, most near the end of its range: reaches rooms behind armour; heats the room | best when scanned |
| Kinetic | time of flight | ammunition | strongest | momentum along the path | must lead the target |
| Missile | slow, guided | ammunition, tube | small | by warhead | by seeker |
| Point defence | against munitions | power or ammunition | small | — | — |

| Attack | Armour | Shield | Point defence | Decoys, running cold | Range | Sustain |
|---|---|---|---|---|---|---|
| Beam | **mass alone counts**: armour stops it no better than a room of the same mass (#230) | **stops well** | — | — | **certain at every range** (no falloff, #230) | no ammunition, heat |
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

Game scale: one scale for simulation and drawing (#53; the "4–8 ship
lengths" of #53/#54 is dropped, #240 (5): the band below is set by the
time of flight, §13j.1). T1 numbers: cell 5 m, hull 30×14, engagement 0.6–1.5
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

**Audits** (#238, the owner): besides the per-pull-request roles, an
**independent, read-only audit** that reads the whole, not one pass, at
fixed milestones, each a session that decides nothing and reports with a
location and a quote for every finding: (a) **documents** (`data.js`
against `DESIGN.md` and `DECISIONS.md`; decisions against each other;
rules living in one place only; sense), (b) **process** (where errors
were caught against where money went; the plan gate; what to streamline),
(c) **physics as one system** (models resting on different assumptions,
one law or several, exponents against the new masses, the shield's
exchanges, real-world anchors), (d) **scenario quality** (tautologies,
outside anchors, tolerances against the method's error, lock discipline,
withdrawals, coverage by mutation). The lead designer answers each finding
in a consolidation pass recorded as a decision. The first audits' answers:
#240 (the owner's seven), #241 (process), the consolidation (#242) and
physics pass 2 (§13k). **Milestones**: now
(2026-10-21, before the L4 plan); before each level's plan from L4 on
(a–d, light: only what the level touches); at Mission 0 exit (all four,
full); before the first rendering commit and before the first public
build (a, b, d full; c light); and whenever a law changes (c full). An
audit found nothing is recorded too.

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

§13c.2 Scenarios (#181) — moved to `HISTORY.md` (#241)

§13c.3 Constants and approved ranges (#183) — moved to `HISTORY.md` (#241)

§13c.4 Kernel, tools and process (#184) — moved to `HISTORY.md` (#241)

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
| Blast between rooms | An internal explosion of energy E (a magazine or reactor, L1) first fills its own room up to that room's blast capacity B = surviving cells × `room.blastResistance` (× `hold.blastFactor` for a hold; from L4, Σ remaining integrity × that resistance, #216); the excess then spreads as a wave front from the **whole damaged region** (#169, #205): in each round, the excess is split among every unsaturated room touching any saturated room, by shared wall length, each filling up to its capacity; what no room can take escapes to space. Within a room the energy spreads evenly over its cells; a cell is destroyed when its share reaches its resistance. Books: absorbed + escaped = E exactly; with every room reached, absorbed = min(E, Σ B), escaped = max(0, E − Σ B) (#184) |
| Shield overlap (#170) | Fields add, each generator paying from its own budget (#99). In each step, a beam at point j asks generator i for a_ij = P_j × B_i g_ij / Σ_k B_k g_kj, capped so that Σ_i a_ij ≤ min(P_j, Σ_i B_i g_ij) (L0 for one generator). If a generator's asks Σ_j a_ij exceed its budget B_i (× its power fraction), every ask to it is scaled by B_i / Σ_j a_ij; the point then absorbs the sum of what it was granted, with no second round in the same step. **No generator ever absorbs more than its budget**: this removes the double counting of #170. Each generator heats by what it pays (L1). The impulse buffer of each generator is shared the same way |
| Shield buffer (E4) | The buffer (budget × `shield.bufferSeconds`) pays the energy of rounds stopped (L0), drains when rounds arrive faster than it refills, and refills at the budget left unused by continuous beams. L2 shows it binding under a salvo; L5 decides whether real salvos ever reach it, or it is cut (#177, E4) |
| Repair sharing (#99, #185 (6)) | A quarters' repair budget is R = `repair.rate` × surviving fraction (integrity per second). A damaged cell j in range asks q_j = R g(r_j) (L1); if Σ q_j > R, every ask is scaled by R / Σ q_j. Overlapping quarters add, each paying its own budget. One cell alone is repaired exactly as at L1 |
| Size rule (#185 (4), #187 (4)) | Per-cell quantities scale with the cell count (L = 9/4 of M): heat capacity, magazine capacity, reactor explosion energy, crew (rounded). Rate-like quantities scale with the footprint (9/4 of M): power, draw, thrust, budget (L1). Per-round quantities follow the round: an L turret fires rounds of (3/2)³ the M mass at 2/3 the M rate, heat per shot × (3/2)³ |

§13d.2 Scenarios (#194) — moved to `HISTORY.md` (#241)

§13d.3 Constants and approved ranges (#195) — moved to `HISTORY.md` (#241)

§13d.4 Kernel, tools and process (#196) — moved to `HISTORY.md` (#241)

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
| Partial kinetic damage | Kinetic damage stays momentum (#137): a round passing a room cell removes that cell's resistance R from its sectional momentum, as before (until L3 a destroyed cell still resists; from L3 it is a hole and resists nothing, #212 (5), #216), and takes **1 / `kinetic.hitsToWreck`** of the cell's integrity; the cell it stops in loses (sectional momentum left / R) / `kinetic.hitsToWreck`. A cell is destroyed when its integrity reaches 0 (#16). Crew die in proportion to the integrity lost: the room's cumulative deaths are floor(crew × (cells − Σ integrity) / cells), never more than its crew (#189) |
| Repair | Repair restores **damaged** cells only (integrity between 0 and 1); a destroyed cell (integrity 0) is not repaired in battle and waits for the drydock (amends #51); it stays destroyed for the rest of the battle (this replaces #190 (1), which let a destroyed cell come back at integrity 1) |
| Life support under routing (#207) | A room keeps life support while joined through live walls to a reactor able to produce, whatever its own power request (§13d.1); the kernel tied it to the room's routed fraction, so a shut-down room lost it under routing, against #205 (3) |
| Shield buffer | Unchanged rule; with the real round, stopping an M round costs 1.71 MJ, so a 10 MJ buffer binds at the **6th** round arriving in one step (the old 0.5 kg round: the 71st), or above 5.9 rounds/s for longer. One M turret fires 0.5/s, so the rule is proven but real salvos may never reach it: E4 for `shield.bufferSeconds` stays open until L5 (#214) |

§13e.2 Constants and approved ranges (#206) — moved to `HISTORY.md` (#241)

§13e.3 Scenarios — moved to `HISTORY.md` (#241)

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
| Cell mass (#202 E; **superseded by #221 from the mass pass, §13g**) | A cell's mass and its heat capacity are one number: m = C / `thermal.specificHeat` (600 J/(kg·K), a steel-and-aluminium structure), so an M cell at T1 is **1 t** and the exponent is C's (k = 3). A heat sink cell is a cell plus the water that holds its extra capacity: m + (`heatsink.capacityFactor` − 1) × C / `FIXED.waterSpecificHeat` (4186 J/(kg·K)): 1.57 t. Contents add their real mass: a magazine its rounds (900 kg full, D pass), a turret its ready rounds. Fittings add `radiator.mass` and `rcs.mass` at their edge's midpoint |
| Rigid body (`js/body.js`) | A ship is a 2D rigid body: mass M, centre of mass, moment of inertia I = Σ m (a²/6 + d²) over cells (a square cell of edge a about its own centre, plus parallel axis) and Σ m d² over fittings and contents (point masses). State: position, heading θ, velocity v, angular velocity ω. Forces and torques of the step are summed in the body frame, rotated to the world, and integrated by semi-implicit Euler at the step (v and ω first, then position and θ). Impulses (recoil, fixtures) change v and ω at once. Mass properties are recomputed whenever mass changes (a round leaves, a cell is destroyed, a fragment separates); the velocity field is kept (a rigid body that loses a part keeps v at each surviving point and ω), so momentum is booked exactly |
| Thrust | An engine pushes along the ship's forward axis (+x, its exhaust faces aft) at the centre of its exhaust face, with `engine.thrust` × throttle × footprint factor × surviving fraction × power fraction, only while controlled and not shut down (L1); off the centre of mass it also turns the ship (#14: recommended through the CoM, not required) |
| RCS (fitting, #15) | An RCS fitting on an open edge pushes the ship along the edge's inward normal at the edge's midpoint, `rcs.force` while fired; it takes its power and control from its host room (its draw joins the host's request; it fires at the host's power fraction and only while the host is controlled); its heat, `rcs.powerDraw` × `engine.heatFraction`, goes to the host room. Not on an inside room (#190 (2)) |
| Recoil (#5, #203 C) | A gun firing a round of mass m at muzzle velocity u along direction d gives the ship the impulse −m u d at the gun room's centre; the round leaves with m (v_point + u d), so ship plus rounds conserve momentum exactly. Rounds fed from a magazine to a turret move mass inside the ship: momentum and angular momentum are kept, so ω changes as I changes (#219, #220). Propellant gas is not modelled (#187 (6)) |
| Destroyed cells | A destroyed cell (integrity 0, D pass) is a hole: it carries no structure, control, power, ammunition or heat (L2), and **resists no round** (a round passes it at no cost; #212) and its mass leaves the ship as **debris** with the velocity of its point (momentum kept; debris as obstacles is L4, #9). A damaged cell keeps its whole mass |
| Structure and fragments (`js/graph.js`) | Surviving cells connect through every edge they share, inside a room and across live walls. When the surviving cells fall into several connected sets, each becomes a fragment: a rigid body with its own mass properties and the parent's velocity field (v of its new centre of mass, the same ω), so mass, momentum, angular momentum and kinetic energy are conserved exactly. A room whose surviving cells fall into two fragments works in the fragment holding most of them (tie: the lower cell index); its other cells are dead weight there |
| Control (#12, #81, #147) | A room is controlled while a path of live walls joins it to a surviving, working bridge (not shut down, switched on; L1) in its fragment (connectivity only, through any rooms). A room that loses control loses its function (L1 `controlled`): an engine stops, a gun stops firing, a reactor **SCRAMs** (decay heat follows, #81). A fragment without the bridge goes dark; destroying the bridge SCRAMs every reactor (decapitation). The bridge keeps its backup supply. At L3 control and structure run over the same live walls, so control is lost only with the bridge or by a split (the "cut the power walls" route of #82 is power, L2) |
| Life support in fragments | §13d.1 as amended by #207: a room keeps life support while joined to a reactor able to produce; a dark fragment's crewed rooms lose it, the bridge keeps it on its backup |
| Validation (`js/layout.js`, #57) | A ship undocks only if: every room connects to the bridge through live walls; every hull room (beam bay, turret, missile bay, engine) has an open edge, and an engine's exhaust face is open with **no cell aft of it** in its rows (clear exhaust); a fitting sits on an open edge of a room that is not inside, at most one per edge (#15); no room overlaps another or leaves the drydock grid (`TIERS` grid). **Inside** (bridge, reactor, magazine, quarters; not the shield generator, #219) means the room carries no fitting; it may touch the hull. Each failure names its rule |
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

**Estimates for R1** (L3's 1 t cells, **superseded by the mass pass, §13g.3**: R1 is about 448 t) (cells, contents, 17 radiators and 4 RCS): M ≈ 52.3 t,
centre of mass (28.73, 16.47) m, I ≈ 1.313e7 kg·m²; the engine's thrust
line (y = 15 m) passes 1.47 m below the centre of mass.

§13f.3 Scenarios (#209) — moved to `HISTORY.md` (#241)

§13f.4 Constants and approved ranges (#210; `thermal.specificHeat`, `engine.thrust` and `rcs.force` superseded by §13g.2, #221) — moved to `HISTORY.md` (#241)

§13f.5 Kernel, tools and process (#211) — moved to `HISTORY.md` (#241)

## 13g. The mass pass: ships of real density (#221) — moved to `HISTORY.md` (#241)

## 13h. The feel prototype (#217, #223, #224) — moved to `HISTORY.md` (#241)

## 13i. The path model (#228–#235)

Built before prototype v2 and L4, on branch `m0/path` from `main`; it
leaves `proto/` working (the superseded functions stay). It applies the
owner's symmetric principle (#228) to what a round and a beam meet along
their path, with real material constants only, and makes **protection the
mass on the path** (#232). Revised by #234 and #235 after the owner saw the
first version still let an M round cross 40 m of rooms. Estimates by the
lead designer's own integrator, with every rule of L0–L3 and the mass pass
on (#204); the scenarios below are their re-runnable check. Its Bethe
integration reproduces NIST PSTAR's proton ranges in water within 0.15 %
(7.709 against 7.718 g/cm² at 100 MeV).

### 13i.1 Rules

| Rule | Statement |
|---|---|
| Cell mass by room type (#232, #234) | Each room type has the **real mass of its cells, at the low end of its real range** (the owner, #234), in 13i.2; contents (rounds) and a heat sink's water are added as before. This replaces the one `structure.cellMass` of #221 for every room |
| Cell matter | A cell on a path is its mass spread over its face: **areal density σ = cell mass / edge²**, iron-equivalent by mass. A destroyed cell is a hole: σ = 0 (#212 (5)) |
| Kinetic resistance (#232) | A cell resists **r = c × σ**, with one constant c = `matter.kineticResistance` (m/s), the value of armour steel already calibrated (L0's armour cell: 6.181e5 kg/(m·s) over 400 kg/m², c = 1545.4 m/s). It replaces `armour.kineticResistance` and `room.kineticResistance`. Known simplification, accepted by the owner: thin spaced plates resist a hard round less per kilogram than one thick plate, so light rooms are a little too protective |
| Round damage (#230) | The round takes **the same sectional momentum the cell takes, against its own strength** S = c × ρ_steel × L (L its pristine length: per kilogram of steel, a round is as strong as armour). Its damage f grows by (sectional momentum the cell took) / S; damage **flattens it at constant volume**: A = A₀ / (1 − f), its momentum unchanged by f. At each cell, with s = p / A on entry: if s > r and f + r / S < 1, it passes (the cell takes r, p falls by r·A, f grows by r / S); otherwise it stops there, the cell takes min(s, r), f grows by that / S, capped at 1 (f = 1: the round is **wrecked**; its remaining momentum goes to the ship like a stopped round's). A hole takes nothing and does nothing to the round. Cell losses are the D pass's (#206): a passed cell 1 / `kinetic.hitsToWreck`, the stopping cell (taken / r) / `kinetic.hitsToWreck`. Momentum books: p₀ = Σ r·A over passed cells + the stop's remaining p + p on exit |
| Shield and rounds | The shield slows a round by a field, not by contact: no round damage (unchanged) |
| Tumble | Left out; in `IDEAS.md` with sloped armour (#6), after prototype v2's helm (#230) |
| Beam bay (#234) | **An axis room 2 × N cells** (M; 3 × N for L), N ≥ 2, lying along the ship's axis rows (its rows hold strictly the mean row of the cells of rooms joined to a bridge, and its x-span is at least its y-span; rules `axis` and `bow`, #236) with its bow face open, like the spinal railgun: a linear accelerator. Its particles' kinetic energy is **E = `beam.gradient` × N × edge** (10 MeV/m: a 10 m bay gives 100 MeV, a 40 m bay 400 MeV). Its power, draw and heat are as at L1, whatever N (a longer bay gives the same power at a lower current). R1's 2 × 2 bow beam bay is such a room with N = 2 |
| Beam deposit (#229) | Neutral hydrogen atoms of energy E: inside matter each is a proton; survivors lose energy by the **Bethe formula** (no shell or density correction): dE/dX = K (Z/A) (1/β²) [½ ln(2 mₑc² β²γ² T_max / I²) − β²], T_max = 2 mₑc² β²γ² / (1 + 2γ mₑ/M + (mₑ/M)²), X the areal density crossed, iron (Z/A 0.46557, I 286 eV); a fraction dX / λ_I of the survivors has a **nuclear interaction** (λ_I = 1321 kg/m², iron) and leaves its remaining energy in that cell (a simplification: the real shower spreads forward over about λ_I). Cell i receives the fraction F_i of P; what is left leaves the ship. F is recomputed when a path cell becomes a hole |
| Beam range (#230) | **No falloff** at battle range: all of P arrives at 0.6–1.5 km. The Gaussian maser falloff (`beam.focusRange`, `FIXED.beamWaistPerHalfCell`) is superseded |
| Beam damage and heat | Cell i loses integrity at P·F_i / `armour.burnEnergy` per second (the energy that ruins any cell along the beam's channel: 30 MJ melts about 25 kg of steel, at about 1.2 MJ/kg from rest, an estimate) and is destroyed at 1; P·F_i is heat in cell i's room (#138). The shield absorbs first, at the entry point, as at L2 |
| Not in this pass | Blast resistance stays a fixed energy per cell (`armour.blastResistance`, `room.blastResistance`); tying it to mass is a later question |
| Kernel | New pure functions in `js/damage.js` (`penetrateRound`, `beamDeposit`); `fireRound` uses the round rule; a `fireBeam` in `js/rooms.js`; cell masses per type in `js/rooms.js` and `js/layout.js` (the axis beam bay's footprint and validation). The superseded pure functions (`penetrate`, `beamDeliveredFraction`, `burnThrough`) **stay** for the withdrawn scenarios and the prototype |

§13i.2 Constants (#235; k = 3 for every mass) — moved to `HISTORY.md` (#241)

### 13i.3 Estimates (T1 unless stated)

- σ per cell: hold and magazine 120, heat sink 143, beam bay 220, engine
  244, armour 400, crew rooms 592, reactor 5000 kg/m².
- **R1 weighs about 844 t** (cells only; 440 t before): 15 MN gives about
  1.8 g (3.4 g before), still above the 1–2 g of dodging (#54).
- Continuous depth of S / M / L rounds, in cells of one kind: armour
  **1.480 / 2.166 / 3.162** (unchanged from the first version, identical
  T1–T6); crew rooms 1.078 / 1.498 / 2.191; hold 4.589 / 6.798 / 10.102;
  engine 2.340 / 3.429 / 5.071; beam bay 2.579 / 3.794 / 5.592; reactor
  0.135 / 0.203 / 0.304. A round ends 41–52 % flattened.
- R1's middle row from the bow (beam bay 2, magazine 2, bridge 2, reactor
  2, engine 3): an M round stops in the **first bridge cell** (depth 4.25);
  the reactor behind is untouched.
- An M round leaving after 1–4 hold cells keeps 0.882 / 0.756 / 0.621 /
  0.476 of its momentum.
- D1's setup: in an M quarters (3 cells deep) S and M stop in the 2nd cell,
  L in the 3rd; through a hold (2 deep) every size exits with 0.627 / 0.756
  / 0.839 of its momentum. D1's line of six quarters: the M round stops in
  cell 2 intact, cell 3 with the 2nd cell destroyed.
- Within approved ranges a steel round is never wrecked (f stays below 1:
  f ≤ v / c); the wreck is tested on the pure function.
- Beam fractions in armour cells: 100 and 200 MeV (N = 2, 4): all in cell 1;
  400 MeV (N = 8): **0.431 / 0.299 / 0.269**; in crew cells, 400 MeV: 0.587
  / 0.413. R1's 10 m bay is a surface beam; reaching rooms behind needs a
  long spinal accelerator, which costs length, mass and exposure (#234).
- Beam burn on an armour column at contact (5 MW, 30 MJ): N = 2: cells 1, 2,
  3 at **6, 12, 18 s** (exactly 360 steps each; the earlier 6.02 was a stale estimate, #236); N = 8: **13.9, 18.2, 20.5 s**; the same at
  any range.

§13i.4 Scenarios — moved to `HISTORY.md` (#241)

§13i.5 Process and cost — moved to `HISTORY.md` (#241)

## 13j. Prototype v2: a helm and physical misses (#237)

Built after the path model, before L4, on branch `proto/v2` from `main`;
throwaway, in `proto/` only (#217), on the path model's kernel. v1 showed
that no lever could act before the magazine blew (#233); v2 gives the
player the levers the design already names (§8: engagement range, facing,
dodging) and lets rounds miss for physical reasons only. Every number
below was computed with the kernel at `719a6c1` (the lead designer's
scripts; re-runnable from `proto/measure.mjs` once v2 exists).

§13j.1 What the kernel says before anything is built — moved to `HISTORY.md` (#241)

### 13j.2 Scope

| Part | Built as |
|---|---|
| Kernel | `js/` unchanged except `data.js`: `armour.kineticResistance`, `beam.focusRange` and `FIXED.beamWaistPerHalfCell` **removed** (#236 (1)); the superseded pure functions stay. The five withdrawn L0 scenarios that read them (`beam-burn`, `beam-burn-v2`, `beam-falloff`, `kinetic-penetration`, `kinetic-penetration-v2`) become **retired** in `mission0/withdrawn.json` (`retired: true`, reason): `regress` lists them and does not run them, counted apart (expected 57 VERIFIED + 29 WITHDRAWN + 5 RETIRED). A locked scenario is never edited |
| Paths | the path model's kernel: `shieldRound` at the hull entry point, `fireRound` along the **cells the round's line crosses** in the target's grid (entry to exit, in order; holes stay on the path); `fireBeam` the same along the beam's line; cell masses as the kernel has them. The Gaussian beam, `burnThrough` and the bow-armour belt stand-ins of v1 go |
| Helm | three **standing orders** (§8), executed by an autopilot STAND-IN for L4's `helm.js`: **range** close 600 / hold 900 / open 1500 m (the #54 band; thrust along the line of sight into a dead band); **facing** bow-on / broadside; **dodge** off / on (the throttle's sign flipped at seeded random intervals across the line of sight). Conflicts resolve as #40: range, then facing, then dodging; the autopilot holds heading with the RCS against the thrust torque and turns with the couple. Interval, dead band and gains are prototype settings in `proto/config.js`, never game numbers |
| Facing's physics | the beam bay is spinal (#234): the beam leaves along the ship's axis and hits whatever that line crosses, so only a bow-on ship beams its target; the main engine pushes along the axis, so only a broadside ship dodges at 1.8 g (bow-on it has the RCS: 2 MN / 850 t = 2.35 m/s², 0.24 g, about 1.5 m over a 900 m flight: nothing; the first version wrote 0.24 m/s², a unit error, #239), and a broadside shows 11 columns instead of 6 rows. No constant |
| Rounds | a kernel `shot` launches a round at the shooter's velocity plus 800 m/s along the turret's aim; the turret aims at the **lead point** (the target room's position extrapolated at its ship's velocity over the time of flight; a quadratic) in any direction (STAND-IN: no traverse arc, no slew); each step the round's segment is tested against the target's hull; a round that crosses nothing flies on and is culled 3 km from the midpoint (a prototype setting; #222 (7)). **No dispersion**: misses come from motion only |
| Player | targets a room by tap (as v1); presets: **Fire** (weapons on the target, shield on, the standing orders as set), **Cool** (weapons off, shield off, engine off: the ship coasts, the RCS holds heading, no dodging), **Evade** (weapons hold, shield on, broadside and dodge on at full thrust); time ×1, ×2, ×4 |
| Loadout | v1's magazine, layout, shield budget, hits to wreck, turrets; **bow armour removed** (its stand-in read the removed constants; armour fittings come with #15); new **range** and **facing** orders; the **seed**, shown, changed at every Restart (+1, editable), written in the export; `PROTO_VERSION` 'feel-3' |
| Enemy | the script of v1 (Fire 60 s, Cool 30 s; beam bay, turret, engine) with orders hold 900, bow-on, dodge on (which, bow-on, is the RCS only: the enemy does not dodge in effect, a contradiction of this plan with its own facing row, found by the docs audit and the measure, #239); the script and every preset's throttle listed in the on-screen stand-ins (#233) |
| View | v1's two head-up grids (enemy tappable) plus a **world strip**: both ships to scale with heading and velocity, rounds in flight, the range in metres, hits and misses counted; on each grid an arrow where rounds enter; the beam drawn where it lands (or misses). The camera of #55 waits |
| Export / replay | as v1 (`proto/export.js`, `proto/replay.mjs`, MATCH on the event hash), now with seed and orders; `proto/measure.mjs` runs the duel headless for the seeds 1–10 at each range and prints its length, hits, misses and the end |

**Stand-ins**, labelled `STAND-IN` in the code and on screen: the
autopilot; a cell the line clips at a corner counts as crossed whole (the
chord rule r = c σ chord / edge, no constant, goes to the next kernel
pass); the turret's free aim; both sides see the true layout; no point
defence, missiles or railgun; Disabled from room state (10 s in
`proto/config.js`).

§13j.3 Estimate (rough, for the owner to test, not a criterion) — moved to `HISTORY.md` (#241)

### 13j.4 What the owner judges (on the Android phone)

v1's four (pace, heat, readability, choices; §13h.1) and: (5) **range**:
whether 600 / 900 / 1500 m play differently; (6) **facing**: whether
bow-on (beam, short silhouette, no dodge) against broadside (dodge, no
beam, long silhouette) is a choice the player can read; (7) whether R1's
open magazine reads as a layout to fix in the shipyard. Each finding goes
on #223's ladder.

§13j.5 Process and cost — moved to `HISTORY.md` (#241)

§13j.6 What the build measured (#239) — moved to `HISTORY.md` (#241)

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

The roadmap after Mission 0 (presentation, content, carriers #110, roguelite) is unchanged; the old list, with the passes between L3 and L4, is in `HISTORY.md` (§15, moved #241).
The Mission 0 levels and their order are in §13; every pass after L3 is a row in `DECISIONS.md`.
The next steps live in `STATUS.md`.

## 16. Measured — moved to `HISTORY.md` (#241)

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
