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
| Blast between rooms | An internal explosion of energy E (a magazine or reactor, L1) first fills its own room up to that room's blast capacity B = surviving cells × `room.blastResistance` (× `hold.blastFactor` for a hold; from L4, Σ remaining integrity × that resistance, #216); the excess then spreads as a wave front from the **whole damaged region** (#169, #205): in each round, the excess is split among every unsaturated room touching any saturated room, by shared wall length, each filling up to its capacity; what no room can take escapes to space. Within a room the energy spreads evenly over its cells; a cell is destroyed when its share reaches its resistance. Books: absorbed + escaped = E exactly; with every room reached, absorbed = min(E, Σ B), escaped = max(0, E − Σ B) (#184) |
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
| Partial kinetic damage | Kinetic damage stays momentum (#137): a round passing a room cell removes that cell's resistance R from its sectional momentum, as before (until L3 a destroyed cell still resists; from L3 it is a hole and resists nothing, #212 (5), #216), and takes **1 / `kinetic.hitsToWreck`** of the cell's integrity; the cell it stops in loses (sectional momentum left / R) / `kinetic.hitsToWreck`. A cell is destroyed when its integrity reaches 0 (#16). Crew die in proportion to the integrity lost: the room's cumulative deaths are floor(crew × (cells − Σ integrity) / cells), never more than its crew (#189) |
| Repair | Repair restores **damaged** cells only (integrity between 0 and 1); a destroyed cell (integrity 0) is not repaired in battle and waits for the drydock (amends #51); it stays destroyed for the rest of the battle (this replaces #190 (1), which let a destroyed cell come back at integrity 1) |
| Life support under routing (#207) | A room keeps life support while joined through live walls to a reactor able to produce, whatever its own power request (§13d.1); the kernel tied it to the room's routed fraction, so a shut-down room lost it under routing, against #205 (3) |
| Shield buffer | Unchanged rule; with the real round, stopping an M round costs 1.71 MJ, so a 10 MJ buffer binds at the **6th** round arriving in one step (the old 0.5 kg round: the 71st), or above 5.9 rounds/s for longer. One M turret fires 0.5/s, so the rule is proven but real salvos may never reach it: E4 for `shield.bufferSeconds` stays open until L5 (#214) |

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

### 13f.3 Scenarios (#209)

The masses, accelerations, turn times and recoil numbers in rows 1–5 are
L3's (1 t cells); the mass pass replaced them (§13g.3, #221) and rows
1–5's v3 successors carry the new ones.

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
| 6 | `L3.fragment.scram` | the cut of row 5 from rest, the reactor at demand 0.5 and the shield on; a cut that keeps bridge and reactor together; R1 with the bridge destroyed | the stern reactor SCRAMs at the split step (`scram`, cause the destroyed cell), its decay heat follows L1 (closed form, 1e-9); the stern engine and shield stop; the bow bridge keeps control on its backup and its life support runs, while the quarters', magazine's and turret's stop (#207); the kept-together cut runs on; the destroyed bridge SCRAMs every reactor; and two cases for #207's clauses that the D pass left untested (#216): a quarters joined to a running reactor only **through other rooms** keeps life support, and a reactor switched on at **demand 0** supplies none |
| 7 | `L3.validation` | R1 and one variant per rule of 13f.1 (a room cut off, a hull room with no open edge, an exhaust blocked by one cell aft, a fitting on an inside room, two fittings on one edge, an overlap, a room outside the grid) | R1 valid; every variant rejected with exactly its rule's reason |
| 8 | `L3.ship.heat` | R1 without power routing (fixed loads, every room powered): idle (bridge and quarters only), cruise (shield on, engine at 0.5, the reactor delivering 7.25 MW) and battle (cruise plus the beam firing, 19.75 MW) for 900, 900 and 600 s | books per room and per ship 1e-9; the readout's heat balance and radiator capacity at plant hot (17 panels: 2.81 MW) exact; event times (hot, overheated, SCRAM) against the scenario's reference integrator, which carries every L1, L2 and D-pass rule over the whole run, 1e-3: estimates idle none (plant rooms near 300 K), cruise hot at 509 s (shield generator), 513 s (reactor), 550 s (engine), nothing overheated in 900 s (reactor peak ≈ 743 K), battle beam bay hot at 103 s and overheated at 178 s (it sits outside the loop), reactor hot at 157 s, later events after the beam bay's shutdown left to the reference; crewed rooms ≤ 295.01 K while life support runs (#205 (8)) |
| 9 | `L3.kinetic.hole` (#212) | an M round along a line of six M quarters (D1's line) with the 2nd cell destroyed beforehand, and the same line intact | the destroyed cell takes nothing from the round and loses no integrity; the round stops one cell deeper than in the intact line (D1: in cell 11 of the intact line, so in cell 12), its stopping loss by the D-pass rule; deaths by the floor rule |
| 2b | `L3.thrust.v2` (#219) | row 2's setup and cases | row 2's checks, except that (b)'s position and heading match the RK4 reference within **1e-2 relative at t = 5 s and 10 s** (the kernel's semi-implicit Euler differs by about dt / t: 3.3e-3 and 1.7e-3; a thrust that does not turn with the ship is off by order 1) |
| 8b | `L3.ship.heat.v2` (#219) | row 8's setup and cases | row 8's checks, except the crewed rooms: their peak temperatures match the reference integrator within **0.01 K** and **none reaches crewed hot** (330 K); the bridge beside a reactor at 740–800 K rises to about 295.3 K (cruise) and 295.7 K (battle), because the reactor's passive leak plus the bridge's own draw exceed its 200 kW of life support (the lead designer's own estimate showed it) |
| v2 | `L3.mass.props.v2`, `L3.validation.v2`, `L3.rcs.turn.v2`, `L3.recoil.v2`, `L3.split.momentum.v2` (#219) | their rows' setups and cases | their rows' checks unchanged; only the shared invariants are rescaled: heat books within max(1e-9 × the largest flow, **1e-10 × the room's heat at the start**) (float resolution of a stored heat of 1e9 J; measured residues ≤ 5.2e-12 of it), angular books within **1e-9 × net + 1e-12 × gross** angular impulse booked (#220: 1e-12 on the net term fails R1 at T6 on float, 2.2e-12). Added before their lock (#220): `L3.rcs.turn.v2` asserts the discrete turn (122 + 122 firing steps, heading 14 884 α dt² = 1.576373 rad, 1e-9) and `L3.thrust.v2` (a) the discrete position x_n = a dt² n(n+1)/2 (1e-9). `L3.thrust.v2` and `L3.ship.heat.v2` carry the same invariants |

`node tools/perf.js` (new, not a scenario: timing is not deterministic)
reports milliseconds per step for two R1s at T1 and T6 stepping together
(the E8 baseline; a 10-room cluster costs about 0.066 ms per step today).

### 13f.4 Constants and approved ranges (#210; `thermal.specificHeat`, `engine.thrust` and `rcs.force` superseded by §13g.2, #221)

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

Readings at T1 (L3's numbers; superseded by §13g.3): a 52 t minimal ship accelerates at 3.9 g on one engine; a
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

## 13g. The mass pass: ships of real density (#221)

Built after L3 merges and before the feel prototype (#217), on its own
branch `m0/mass` from `main`. Estimates made with every rule of L0–L3 on
(#204), by the lead designer's integrator.

### 13g.1 Rules

| Rule | Statement |
|---|---|
| Structural mass | A cell's mass is **`structure.cellMass`, 10 t per M cell at T1** (k = 3): 80 kg/m³ over a 5 m cube, a light warship or spacecraft (a real frigate is about 125 kg/m³ over its envelope; a 250-cell T1 corvette is then about 2500 t, the 1500–2500 t of a real corvette, #202). It replaces m = C / `thermal.specificHeat` of #208, which made ships ten times too light (8 kg/m³). A heat sink cell adds the water of its extra capacity, (`heatsink.capacityFactor` − 1) × C / `FIXED.waterSpecificHeat` (0.57 t); contents and fittings add their real mass as at L3 |
| Heat capacity | Unchanged: `thermal.heatCapacityPerCell` is the heat capacity of the machinery, coolant and air coupled to the room's heat, not of its structure; every heat race of L1–L3 is unchanged. `thermal.specificHeat` is removed (no use left, E4) |
| Thrust and RCS | Re-tuned for the new masses (#203 A): a 2500 t corvette with two engines reaches about 1.2 g (dodging 1–2 g, #54) and turns 90° in about 10 s on two RCS couples 60 m out |

### 13g.2 Constants and approved ranges (#221)

| Constant | Old | New | Range | k |
|---|---|---|---|---|
| `structure.cellMass` | — (C / c_p = 1 t) | 1e4 kg | 3e3–3e4 kg (24–240 kg/m³) | 3 |
| `thermal.specificHeat` | 600 J/(kg·K) | removed | — | — |
| `engine.thrust` | 2 MN | 15 MN | 4–60 MN | 2 |
| `rcs.force` | 100 kN | 1 MN | 0.3–5 MN | 2 |

### 13g.3 Estimates and scenarios

R1 (13f.2) becomes about **448 t**, centre of mass (29.45, 16.38) m, I ≈ 1.08e8 kg·m²; the thrust line passes 1.38 m below the centre of mass; full thrust gives 3.41 g and 10.9 °/s² of spin; an RCS couple turns it 90° in 3.68 s; a broadside M shot turns it by **0.040 °/s** (20 shots: 0.79 °/s) and the 25 000 N·s railgun-sized impulse moves it by 0.056 m/s (0.066 °/s 5 m off axis): recoil now matters only for the railgun, as #203 C expected. The row-5 cut gives fragments of about 161 t and 241 t (cells only) plus 41 t of debris, at (10.13, −0.72) and (9.94, 0.53) m/s.

**Also in the mass pass** (#222, from the L3 review): a new scenario
`L3.fragment.rules` for three kernel rules no L3 scenario tests: an RCS on a
room that has lost control does not fire; a split room's cells outside its
working fragment carry no flows (dead weight); the working fragment of a
room split evenly is the one holding its lower-indexed cell. `ROOMS` gives
the shield generator `placement: 'anywhere'` (#219) instead of an
override; the physics readout (#58) works on a blueprint before the ship is
enabled; `tools/perf.js` reads its masses from `data.js`.

**Expected effect on locked scenarios**: every L0–L2 and D-pass scenario re-records with the new data and still passes (only `L1.engine.thrust` and `L1.room.restart` hold `engine.thrust`). The L3 scenarios whose expected values compute mass from `thermal.specificHeat` encode the replaced rule: they are **withdrawn as superseded by #221** (#188 as extended by #200) with v3 successors identical except the mass rule (expected: `L3.mass.props.v2`, `L3.thrust.v2`, `L3.rcs.turn.v2`, `L3.recoil.v2`, `L3.split.momentum.v2`; the engineer lists the real set). Every other L3 scenario re-records and must still pass; any other verdict change is a finding. A tolerance of a successor is checked against the kernel's step error and float resolution before its lock (#212, #219, #220).

## 13h. The feel prototype (#217, #223, #224)

Built after the mass pass merges, before L4, on branch `proto/feel` from
`main`; throwaway, in `proto/` only (CLAUDE.md exception, #217).

### 13h.1 What the owner judges (on the Android phone)

1. **Pace** (E7): how long an R1-versus-R1 duel lasts and whether its
   middle drags or rushes.
2. **Heat**: how soon the ship must cool down, and whether that choice is
   interesting or only a tax.
3. **Readability**: whether the player sees why things happen (which room
   is hot, what a hit did, why a gun stopped).
4. **Choices**: whether targeting a room and switching a preset change the
   outcome.

The owner writes down **what** is not fun (slow, unclear, few choices, too
harsh); each kind points to a rung of #223's ladder.

### 13h.2 Scope

| Part | Built as |
|---|---|
| Page | `proto/index.html`, `proto/proto.js`, `proto/proto.css`; canvas 2D, landscape, touch targets ≥ 44 px; loads the kernel's ES modules from `js/` unchanged |
| Ships | two R1s (§13f.2) at 900 m (#54: 0.6–1.5 km), facing each other, at the mass pass's numbers |
| Player | targets a room by tapping it; three presets: **Fire** (beam and turret on the target, shield on, engine half), **Cool** (weapons off, shield off, engine off), **Evade** (engine full, RCS turning, weapons hold); time ×1, ×2, ×4 |
| Enemy | the same presets on a fixed, seeded script (Fire 60 s, Cool 30 s, repeat), aiming at the player's beam bay, then turret, then engine |
| Ends | when one ship is Disabled (#82: no weapon able to fire and no thrust for 10 s) or destroyed; shows the time, crew lost and rooms wrecked |
| View | each room tinted by temperature against its thresholds, its integrity, the shield's strength, rounds and beams as lines, a scrolling text log of events (cause, room, crew) |

**Stand-ins** for what L4–L5 have not built, each labelled `STAND-IN` in
the code and on screen: rounds fly in a straight line at 800 m/s from gun to
the aimed point and resolve with the kernel's `fireRound` along the target's
grid on arrival (no aiming error, no lead, no deflection); a beam heats the
aimed room and burns its cells by the L0 rules at the field's strength
there; both sides see the true layout (no scans: the information law is not
in the prototype); no point defence, missiles or railgun.

### 13h.3 Estimate (rough, for the owner to test, not a criterion)

At the shield's strength where the guns hit (g ≈ 0.6 at the enemy's beam bay
and turret, 30 m from its generator), a 5 MW beam is fully absorbed by a
fresh shield (6 MW there), and an M round passes about 6 room cells instead
of 10. So the first minutes are a **heat race**: the shield heats by what it
absorbs, the beam bay (outside the coolant loop) shuts down after about 3
minutes of firing (L3), the coolant loop reaches plant hot in about 3
minutes at battle load; then the shield fails and the rounds and beams
start wrecking rooms. Expected duel: **about 3–6 minutes** (E7), uncertain
by a factor of two; the prototype measures it.

### 13h.4 What the first build showed (#227)

With the kernel's numbers an R1 duel ends in **about 11 s**: M rounds slowed
by the shield still pass about 6 room cells, reach the full magazine behind
the beam bay and set it off; a beam alone never passes a fresh shield (both
ships disabled by their own heat after 14.5 min). A loadout panel (magazine
load, a stand-in bow armour belt, layout R1-B, shield budget and hits to
wreck within their ranges, turrets off) moves it only to 15–47 s (armour,
hits to wreck). The cause is partly the stand-ins (perfect aim, ships held
at station) and partly the kinetic model itself: a round never suffers
damage, so it skewers rooms like a needle. The **path model** (#228) answers
the second; prototype v2 (a helm and physical misses) the first. An
**Export** button copies seed, loadout and inputs, and `proto/replay.mjs`
replays the battle headless with its full event log (MATCH check), so the
owner's play can be read exactly. Hosted as a private claude.ai page (#226).

### 13h.5 Process and cost

One engineer session (opus); no scenarios (nothing in `proto/` counts for
Mission 0); the reviewer checks only #217's rules (reads the kernel
unchanged, no number outside `js/data.js` except layout and colours, every
stand-in labelled) and a Playwright smoke test at a phone viewport with
zero console errors. The owner plays it from a private hosted page.
Estimated cost 10–15 USD.

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

### 13i.2 Constants (#235; k = 3 for every mass)

| Constant | Value | Range | Source or reasoning |
|---|---|---|---|
| `matter.kineticResistance` (new, k = 0) | 1545.4 m/s (= 2.7e5 × 12^(1/3) / 400) | 750–3125 m/s (the old armour range over 400 kg/m²) | L0's armour calibration: the model stops an M round in 2.166 cells of 400 kg/m² (5.1 cm of steel each), about 11 cm; De Marre from the 6-pounder gives 100–150 mm (a weak source, #230; corrected by the physics checker, #236) |
| `armour.kineticResistance`, `room.kineticResistance` | removed | — | replaced by the line above (#232) |
| `armour.cellMass` (new) | 1e4 kg | 3e3–3e4 | L0's armour cell (5 cm of steel over 25 m²); armour fittings come later (#15) |
| `structure.cellMass` (now structure only: hold, magazine, heat sink before contents) | 3e3 kg (24 kg/m³) | 2e3–6e3 | the lead designer's estimate: frames, decks and bulkheads only (no source found) |
| `cellMass.crewed` (bridge, quarters, turret, missile bay) | 1.48e4 kg (118 kg/m³) | 1.1e4–1.65e4 (88–131 kg/m³) | ISS Destiny 14.5 t in 8.5 m × 4.3 m (118 kg/m³, low end, #234); ISS Harmony about 131 kg/m³ |
| `cellMass.reactor` | 1.25e5 kg (1000 kg/m³) | 1.0e5–2.0e5 | US submarine reactor compartments: 1130–1680 tons in about 10 m × 12 m (Hanford, GlobalSecurity), low end; crew beside it need shielding all round, as in a submarine |
| `cellMass.engine` | 6.1e3 kg | 4e3–1.2e4 | structure 3 t + a 15 MN engine at the Saturn F-1's thrust per tonne (8.4 t for 6.8 MN) over 6 cells |
| `cellMass.beamBay` | 5.5e3 kg | 4e3–1.2e4 | structure 3 t + about 1 t of accelerator per metre (an estimate; no cryomodule mass found) over a 2-cell slice |
| `cellMass.shieldGenerator`, `cellMass.railgun` | 1e4 kg | 5e3–2e4 | no real analogue (the shield is the premise, #202); the old average |
| `beam.gradient` (new, k = 0) | 10 MeV/m = 1.6022e-12 J/m | 5–20 MeV/m | ESS: 90 MeV in 50 m warm, 2 GeV in 312 m cold (about 6 MeV/m), cavities 16.7–20 MV/m |
| `beam.particleEnergy`, `beam.focusRange`, `FIXED.beamWaistPerHalfCell` | removed | — | the energy follows the bay's length (#234); no falloff (#230) |
| `FIXED.protonRestEnergy`, `FIXED.electronRestEnergy`, `FIXED.betheK`, `FIXED.ironZOverA`, `FIXED.ironMeanExcitation`, `FIXED.ironInteractionLength` | 938.272 MeV, 0.51099895 MeV, 0.307075 MeV·cm²/mol, 0.46557, 286 eV, 1321 kg/m² | real | CODATA, PDG (iron: λ_I 132.1 g/cm² = 16.77 cm) |

data.js stays SI (#163); each note gives the MeV and g/cm² values. Every
new constant is approved by the lead designer (#235), for veto.

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

### 13i.4 Scenarios

Each is locked in a commit of its own before its first canonical run.

| # | Name | Setup | Expected (formula) and criterion |
|---|---|---|---|
| P1 | `L0.kinetic.penetration.v3` | S, M, L AP rounds into a column of armour cells, T1–T6 | the round rule by the scenario's own loop: continuous depth within 1e-9 (1.480, 2.166, 3.162), identical across tiers within 1e-9; passes 1, 2, 3 cells; momentum books within 1e-9 |
| P2 | `L0.kinetic.overpen.v2` | an M AP round through 1–4 hold cells | p on exit / p₀ by the rule within 1e-9 (0.882 / 0.756 / 0.621 / 0.476) |
| P3 | `L0.kinetic.wreck` | `penetrateRound` called with a round strength of 0.3 S (a function test, not a data override) on armour cells | wrecked (f = 1) where the scenario's own loop says; the cell takes min(s, r); books within 1e-9 |
| P4 | `L1.kinetic.damage.v2` | D1's setup under the new masses and rule, T1–T6 | depths in crew and hold cells as 13i.3 within 1e-9; losses: passed cells 1/3, the stopping cell (taken / r)/3; deaths by the floor rule; the first quarters cell destroyed after three M rounds |
| P5 | `L3.kinetic.hole.v2` | D1's line of six M quarters, intact and with the 2nd cell destroyed | stops in cell 2 and in cell 3; the hole takes nothing and does nothing to the round; the same stopping loss; deaths by the floor rule; identical at T6 |
| P6 | `L0.beam.depth` | 100, 200, 400 MeV into 8 armour cells at T1; 400 MeV into crew cells; 400 MeV at T6; 400 MeV with cell 1 a hole | fractions by the scenario's own Bethe integration (≥ 10× finer steps than the kernel) within 1e-3 absolute; Σ F_i + exit = 1 within 1e-9; a hole shifts the profile one cell deeper; CSDA range of a 200 MeV proton in iron 373 kg/m² within 1 % |
| P7 | `L0.beam.range` | an M beam at 0, 600, 1500 m | delivered power = P exactly |
| P8 | `L0.beam.burn.v3` | M beam bays N = 2 and 8 on a column of 4 armour cells, at contact and at 1.5 km, T1 and T3 | destruction times in [t, t + dt) of the scenario's own stepped integration (13i.3); heat in each room = energy deposited there within 1e-9; the same at both ranges |
| P9 | `L1.beambay.length` | M and L beam bays of N ∈ {2, 4, 8} at T1 and T3; a bay off the axis rows; a bay with its bow face closed | E = `beam.gradient` × N × edge exactly; power, draw and heat as `L1.beambay.heat`, independent of N; the two bad bays fail validation, each naming its rule |
| P10 | L3 successors (mass) | the L3 scenarios whose expected values use cell masses (expected: `L3.mass.props.v3`, `L3.thrust.v3`, `L3.rcs.turn.v3`, `L3.recoil.v3`, `L3.split.momentum.v3`; the engineer lists the real set) | v4 successors identical except the masses of 13i.2 |

**Withdrawn as superseded** (#188): by #230, `L0.kinetic.penetration` and
`.v2` → P1, `L0.kinetic.overpen` → P2, `L0.beam.falloff` → P7,
`L0.beam.burn` and `.v2` → P8; by #232, `L1.kinetic.damage` → P4,
`L3.kinetic.hole` → P5; by #234, the L3 mass scenarios → P10. The engineer
lists the real set: every other scenario re-records and must still pass,
and any other verdict change is a finding. A tolerance is checked against
the kernel's step error and float resolution before its lock (#212, #219,
#220).

### 13i.5 Process and cost

The engineer session paused at #232 resumes on `m0/path` with this
version; then a blind physics checker (sonnet) given the setups extracted
by node, who derives P1–P9 before reading the code; then the reviewer
(sonnet). The lead designer merges with no blocking finding (#180).
Estimated cost 20–25 USD (more scenarios than the first version).

## 13j. Prototype v2: a helm and physical misses (#237)

Built after the path model, before L4, on branch `proto/v2` from `main`;
throwaway, in `proto/` only (#217), on the path model's kernel. v1 showed
that no lever could act before the magazine blew (#233); v2 gives the
player the levers the design already names (§8: engagement range, facing,
dodging) and lets rounds miss for physical reasons only. Every number
below was computed with the kernel at `719a6c1` (the lead designer's
scripts; re-runnable from `proto/measure.mjs` once v2 exists).

### 13j.1 What the kernel says before anything is built

- R1 at the path model's masses: **850.1 t**, centre of mass (24.59,
  16.29) m, I = 1.117e8 kg·m²; 15 MN gives **1.80 g**. The thrust line
  (row 3's midpoint, y = 15 m) passes **1.29 m** below the centre of mass:
  a torque of 19.4 MN·m, **9.9 °/s²** of spin under full thrust. One bow
  RCS fitting (27.9 m from the centre of mass) gives 27.9 MN·m, so a helm
  holds heading under full thrust with one bow fitting fired about 70 % of
  the steps; the bow–stern couple (50 m arm) gives 25.6 °/s², a 90° turn
  in 3.75 s bang-bang.
- Time of flight of an M round (800 m/s) at 600 / 900 / 1500 m: **0.75 /
  1.13 / 1.88 s**. A ship that changes its thrust after the shot moves
  **5 / 11 / 31 m** across the line of fire in that time (½ a t²), against
  a hull 30 m wide and 55 m long. So with a lead-aimed gun: at 600 m
  nothing misses; at 900 m a dodging ship takes the round about two cells
  from the aimed one (another room, same ship); at 1.5 km most rounds
  miss. This is #54's band (0.6–1.5 km) from the existing physics, with
  no new constant.
- Paths through R1 after 5 s with the shield charged (M round, 800 m/s):
  from the bow down the middle rows (472 m/s after the shield) it passes
  both beam-bay cells and **stops in the first magazine cell** (loss 0.28):
  about four hits on one row wreck a magazine cell and set it off; down
  row 4 it stops in the second turret cell. **Broadside at x = 7** (hold
  then magazine) it passes the hold and both magazine cells (0.33 each):
  three hits; from the other side the magazine is the hull. At x = 3 the
  shield generator's 10 t cells stop it in the first cell (267 m/s at the
  generator); at x = 5 the quarters stop it. **R1's magazine is open from
  three sides** behind 3–5.5 t cells: a layout fault the shipyard will
  teach, not unfairness; R1-B (the hold forward) covers the bow only.
- The beam: R1's N = 2 bay gives 100 MeV, all of it in the first cell met;
  through a fresh shield (6 MW absorbed at g ≈ 0.6 against 5 MW) nothing
  passes, as in v1: the first minutes stay a heat race.

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

### 13j.3 Estimate (rough, for the owner to test, not a criterion)

At hold 900 m, both bow-on and dodging, the hits spread over six rows
instead of two: an R1 duel should last **30–90 s** (v1: 11 s), ended by
the magazine. At 1.5 km most rounds miss and the beam is stopped by the
fresh shield: a heat race of **minutes**, decided by who cools when. At
600 m nothing misses: about v1. Uncertain by a factor of two; v2 measures
it over ten seeds.

**Not reached (#239).** The estimate assumed a bow-on ship dodges at 1.8 g,
which the facing row above denies it: bow-on the dodge is the RCS alone.
§13j.6 has the measure.

### 13j.4 What the owner judges (on the Android phone)

v1's four (pace, heat, readability, choices; §13h.1) and: (5) **range**:
whether 600 / 900 / 1500 m play differently; (6) **facing**: whether
bow-on (beam, short silhouette, no dodge) against broadside (dodge, no
beam, long silhouette) is a choice the player can read; (7) whether R1's
open magazine reads as a layout to fix in the shipyard. Each finding goes
on #223's ladder.

### 13j.5 Process and cost

One engineer session (opus) on `proto/v2`; no scenarios; the reviewer
(sonnet) checks #217's rules, the retirement of the five scenarios, a full
`regress`, the replay MATCH and a phone-viewport smoke test with zero
console errors; no physics checker (the kernel's physics is unchanged;
the helm is a stand-in). The lead designer publishes the page (#226).
Estimated cost 12–18 USD (v1's three sessions cost 12.05).

### 13j.6 What the build measured (#239)

`node proto/measure.mjs` (both ships on the enemy script, seeds 1–10 per
range order, default loadout; head `4fba090`):

| Orders (both ships) | close 600 m | hold 900 m | open 1500 m |
|---|---|---|---|
| bow-on, dodge on | 20.8 s, 91 % hits, all seeds alike | **7.1 s, 100 % hits**, all seeds alike | 33.7–37.8 s, 94 % |
| broadside, dodge on | 20.9 / 33.9 / 46.9 s, 6 % misses | 9.1 / 37.2 / 45.4 s, 12 % | 37.8 / 49.0 / 107.9 s, 13 % |

(min / median / max over seeds; every duel ends in a magazine explosion.)
Bow-on the lead-aimed gun lands on the aimed beam bay and the round runs
down the axis rows into the magazine, as §13j.1 predicted: four hits on one
row. The reviewer found that the close and open rows mostly measure the
stand-in autopilot settling (the ships start 900 m apart and, while
ranging, fly by velocity error rather than bow-on, so hits scatter across
rooms for about 18 s), not the range order itself: read them so. The
**levers act** (#233's question): broadside and dodge move the duel from
7 s to 9–108 s, at the cost of the beam and a longer silhouette.
Kernel finding: `Math.sin` / `Math.cos` differ between V8 versions
(Chromium 141 against Node 22), so a battle in which ships turn cannot
replay across engines; `proto/detmath.js` installs fdlibm's sin and cos
(within 1 ulp of native, bit-identical across the two engines) as a
stand-in; the kernel gets its own in the next kernel pass. Reviewer: no
blocking finding; the replay MATCHes across engines; the smoke test runs
with zero console errors.

## 13k. Physics pass 2: one law, closed books, tiers, determinism (#240, #243)

Built after the documents' consolidation (#242) and before the L4 plan, on
branch `m0/pass2` from `main`. It applies the owner's answers to the audits
(#240) and the physics audit's findings (`audit/2026-10-21-physics.md`, F1–F29)
and the kernel findings of #236, #227 Q9 and #239. Every number below is
printed by `node tools/estimates/pass2.mjs` (#241 (1)); the scenarios are
its re-runnable check. The checklist of #241 (1) is §13k.6.

### 13k.1 Rules

| Rule | Statement |
|---|---|
| Burn by mass (F1) | A cell on a beam's path loses integrity at P·F_i / (q × cell mass) per second, q = `matter.burnEnergyPerKg` (new, k = 0), calibrated on L0's armour cell (30 MJ / 10 t = **3000 J/kg**); `armour.burnEnergy` is removed. A hold cell is ruined by 9 MJ, a crewed cell by 44 MJ, a reactor cell by 375 MJ (75 s of a 5 MW beam; 6 s today) |
| Blast by mass (F3, #240 (6)) | A cell absorbs q_b × cell mass of blast, q_b = `matter.blastPerKg` (new, k = 0), calibrated on armour (1 MJ / 10 t = **100 J/kg**); `armour.blastResistance`, `room.blastResistance` and `hold.blastFactor` are removed (no physics for a free-volume buffer was written; a hold cell absorbs 0.3 MJ, a reactor cell 12.5 MJ). #18c's "hold as a blast buffer" is lost and recorded as such; the hold keeps its conduction factor (air and bulkheads, passive-wall physics) |
| Heat capacity by coupled mass (F9, #240 (1)) | A room's C = cells × `thermal.coupled.<class>` J/K, one value per room type in 13k.2 (the part that heats on the race's timescale), replacing the single `thermal.heatCapacityPerCell`; a heat sink's water adds as before. Races: reactor alone to overheated **561 s** (61 today), beam bay to hot 165 s (99), engine 868 s (372), shield generator at 6 MW absorbed 496 s (93); the whole-ship races scale with their slowest room (R1's 9 min with shields up becomes roughly 20–40 min: measured by the successor of `L3.ship.heat.v2`). If play then needs faster races, #223's first rung applies (constants within ranges), never the old 1 t value |
| Repair by mass (F13) | Repair restores `repair.massRate` kg/s of a cell's mass (new, k = 0, 200 kg/s = the old rate × an armour cell); `repair.rate` is removed. A third of a hold cell in 5 s, of a crewed cell in 25 s, of a reactor cell in 208 s |
| Books close at the target (F4, F5) | `fireRound` applies the momentum the cells took (Σ impulse) to the body holding them, at the hit cells; the round's lost kinetic energy is heat in the rooms that took momentum, in proportion (1.92 MJ per M hit, about 0.8 K in a four-cell room). Momentum and energy books close between two ships to 1e-9 × gross |
| The shield's books (F16, F17, #240 (2)) | The momentum the field removes from a round (3200 N·s per M round at g = 1) is applied to the body holding the generator, at the generator; the energy stays heat in the generator (as built). For a beam the field removes particles (power), not energy per particle: the survivors' depth is unchanged (stated, F17) |
| Tier-invariant beam depth (F10, #240 (4)) | `beam.gradient` scales with k = **−0.41**: a bay of N cells reaches the same depth in cells at every tier (N = 2: 0.282 armour cells, T1–T6 within 1 %); a stylisation like #64 for rounds (real linacs do not scale), written in §5.4. The T1 value stays 10 MeV/m |
| Energy buffer (F15) | `shield.buffer` (new, J, k = 3, 10 MJ at T1 = today's budget × 1 s) replaces `shield.bufferSeconds`: 5.86 M rounds per buffer at every tier (0.98 at T6 today) |
| Machinery mass (F11, F23, F24) | `cellMass.engine` = `structure.cellMass` (k = 3) + `engine.machineryMass` (new, k = 2, 2.7 t per cell at T1: the F-1's vacuum thrust per kilogram, 925 N/kg); `cellMass.beamBay` = structure + `beambay.machineryMass` (k = 1, 2.5 t per cell: 1 t of accelerator per metre); `rcs.mass` k = 2; `cellMass.reactor` 1.25e5 → **1.5e5 kg** (the cited compartment's low end is 1200 kg/m³, F24). R1's mass and thrust at T1 change by the engine (−2.4 t) and the reactor (+100 t): re-estimated by the script |
| Deterministic kernel (#239 Q6) | `js/util.js` gets fdlibm's `sin`, `cos` (from `proto/detmath.js`), an integer-power `powi` and, if the determinism test shows a difference, `log` and `exp`; `body.js` and `data.js`'s `scaled` use them; no `Math.pow` or `**` with a non-integer in the kernel. `tools/determinism.mjs` prints the event hash of a fixed 60 s R1 duel with turning in Node; `proto/smoke.mjs` computes it in Chromium; MATCH is the criterion |
| SCRAM restart (#82, C2) | A SCRAMmed reactor restarts `reactor.restartTime` s (new, 60 s, 30–300, k = 0) after control is back and its temperature is below hot (an automatic rule, §8); EMP at L5 forces the SCRAM |
| Chord rule (#239) | A path entry may carry `chord` ∈ (0, 1] (the fraction of the edge the line crosses in that cell); a cell resists r = c σ chord and the beam crosses σ chord; default 1 |
| Launch time (F20) | A round fired `at` into the step is launched at `world.t + at` and moved by (dt − at)·v in its first step |
| Deposit then damage (F21) | Written as the rule: a beam deposits its energy, then damages; a cell destroyed in that step takes its share of the room's heat with it (as built) |
| Culling (#222 (7)) | A round or debris farther than `battle.cullDistance` (new, 3000 m, 1000–10 000, k = 1) from every body leaves play; its momentum is booked as `left` so the books still close. `battle.disabledSeconds` (new, 10 s, 3–30, k = 0) replaces the prototype's setting (C9) |
| Findings of #236, #227 and the scenario audit | `world.beamPaths` is cleared when any cell is destroyed; `csdaRange` takes its material and `L0.beam.pstar` checks NIST PSTAR water (7.718 g/cm² at 100 MeV, 1 %); an overheated routed beam bay reports `beam-stopped` with cause `heat`; the ledger header of `tools/m0.js` says a withdrawn scenario is superseded or a specification error and keeps its recorded verdict (E-F10); `L2.reactor.cooled`'s n = 0 meltdown 0.367 s (22 steps) before its reference is explained or fixed before S3 is locked (B-F11); the five reasons of `withdrawn.json` that say "every case passed" of records re-recorded as FAIL get a note (E-F3). #236's "eight withdrawal reasons" was the reviewer's error: no such reason exists (E-F12) |
| Notes (F12, F26) | `data.js` notes describe the current masses; `beambay.efficiency`'s note says it is a maser-era value kept for an accelerator plus neutraliser (a question for L5) |
| Not in this pass | HE contact bursts (F28), debris as a damage channel (F8), EM/IR consumers (F29), buffers in overlapping fields (F18): L4–L5 |

### 13k.2 Constants (approved by the lead designer, for veto)

| Constant | Value | Range | k | Source or reasoning |
|---|---|---|---|---|
| `matter.burnEnergyPerKg` (new) | 3000 J/kg | 1000–10 000 | 0 | L0's armour calibration (30 MJ / 10 t); 1.2 MJ/kg melts steel, so ruin is 0.25 % of the cell's mass melted along the channel |
| `matter.blastPerKg` (new) | 100 J/kg | 30–300 | 0 | L0's armour calibration (1 MJ / 10 t) |
| `thermal.coupled.reactor` (new) | 5.5 MJ/K per cell | 2–20 | 3 | a 50 MW_th PWR's primary water (0.09 t/MW_th, 4.5 t, 19 MJ/K) and vessel steel (0.12 t/MW, 6 t, 2.7 MJ/K) over four cells; an estimate scaled from a 3400 MW_th plant |
| `thermal.coupled.beamBay` | 1.0 MJ/K | 0.5–3 | 3 | 2.5 t of accelerator per cell at 400 J/(kg·K) |
| `thermal.coupled.engine` | 1.4 MJ/K | 0.5–4 | 3 | 3.1 t of machinery at 450 J/(kg·K) |
| `thermal.coupled.shieldGenerator` | 3.2 MJ/K | 1–6 | 3 | 7 t of machinery at 450 J/(kg·K); no real analogue (#202) |
| `thermal.coupled.crewed` (bridge, quarters, turret, missile bay) | 0.6 MJ/K | 0.2–2 | 3 | today's value kept: air (0.15 MJ/K) and fittings; no source found |
| `thermal.coupled.magazine` | 0.6 MJ/K | 0.2–2 | 3 | 900 kg of rounds (0.4 MJ/K) and racks |
| `thermal.coupled.hold`, `.heatSink` (base) | 1.35 MJ/K | 0.5–3 | 3 | 3 t of structure, nothing else; the heat sink's water adds as before |
| `thermal.coupled.armour`, `.railgun` | 4.5 MJ/K | 2–8 | 3 | 10 t of steel |
| `thermal.heatCapacityPerCell`, `armour.burnEnergy`, `armour.blastResistance`, `room.blastResistance`, `hold.blastFactor`, `repair.rate`, `shield.bufferSeconds` | removed | — | — | replaced above |
| `repair.massRate` (new) | 200 kg/s | 50–1000 | 0 | the old 0.02/s on a 10 t cell |
| `shield.buffer` (new) | 1e7 J | 2e6–4e7 | 3 | today's budget × 1 s at T1 |
| `beam.gradient` | 10 MeV/m | 5–20 | **−0.41** | depth in cells tier-invariant (fit of the Bethe range, within 1 % T1–T6) |
| `engine.machineryMass` (new) | 2.7e3 kg per cell | 1.5e3–6e3 | 2 | F-1 vacuum 7.77 MN / 8.4 t |
| `beambay.machineryMass` (new) | 2.5e3 kg per cell | 1e3–6e3 | 1 | 1 t of accelerator per metre (#235's estimate) |
| `cellMass.engine`, `cellMass.beamBay` | derived (structure + machinery) | — | — | F11 |
| `cellMass.reactor` | 1.5e5 kg | 1.0e5–2.0e5 | 3 | 1130 t / (π 5² × 12 m) = 1200 kg/m³ (F24) |
| `rcs.mass` | 200 kg | 50–1000 | **2** | a thruster scales with its force (F11) |
| `reactor.restartTime` (new) | 60 s | 30–300 | 0 | naval reactors restart in minutes (an estimate; big PWRs take hours for xenon) |
| `battle.cullDistance` (new) | 3000 m | 1000–10 000 | 1 | twice the band (#54) |
| `battle.disabledSeconds` (new) | 10 s | 3–30 | 0 | #82 |

### 13k.3 Estimates (T1; `node tools/estimates/pass2.mjs`)

- Burn: hold 1.8 s, engine 3.7 s, beam bay 3.3 s, armour 6 s, crewed 8.9 s, reactor 75 s of a 5 MW beam at contact.
- Blast absorbed per cell: hold 0.30 MJ (2.0 today), crewed 1.48, reactor 12.5, armour 1.0.
- Heat: reactor alone 561 s, beam bay 165 s, engine 868 s, shield generator 496 s (one-sided, no radiators).
- Repair of a third of a cell: hold 5 s, crewed 25 s, reactor 208 s.
- Books: 4800 N·s and 1.92 MJ per M hit; 3200 N·s and 1.71 MJ per M round at g = 1 through the shield.
- Tier: N = 2 depth 0.282 cells at every tier; 5.86 M rounds per buffer at every tier.
- Masses: engine cell 5.7 t (6.1), reactor cell 150 t (125); R1 re-estimated by the script after the data lands (about 950 t, 1.6 g).

### 13k.4 Scenarios

Each locked in a commit of its own before its first canonical run; the engineer lists the withdrawn set (every scenario that reads a removed constant is withdrawn as superseded by #240 with a successor; every other scenario re-records and must still pass).

| # | Name | Setup | Expected (formula) and criterion |
|---|---|---|---|
| S1 | `L0.beam.burn.v4` | 5 MW beam at contact on columns of hold, crewed, armour and reactor cells, T1 and T3 | destruction time of cell 1 in [t, t + dt), t = q m / (P F₁) by the scenario's own stepped sum; T3 times ∝ edge³/edge² |
| S2 | `L2.blast.mass` | a 20 MJ magazine blast with a hold and with a reactor neighbour | each cell absorbs min(share, q_b m) by the scenario's own fill; the excess passes; books within 1e-9 |
| S3 | `L1.heat.coupled` | the one-room races of 13k.3 (reactor, beam bay, engine, shield generator), T1–T6 | time to the threshold one-sided, t = C ΔT / P with C from 13k.2; successors of `L1.reactor.power`, `L1.beambay.heat`, `L1.engine.thrust`, `L1.shield.generator` rows |
| S4 | `L1.repair.mass` | a hold, a crewed and a reactor cell each at 2/3 integrity, repaired alone | full in (m / 3) / massRate s within dt |
| S5 | `L3.hit.books` | an M round into R1's bow row, R1 free; a round through R1's shield at g = 0.6 | R1's momentum change = the impulse the cells took (books within 1e-9 × gross); heat in the hit rooms = the round's lost kinetic energy within 1e-9; the generator's ship takes the field's impulse |
| S6 | `L0.beam.tier` | N = 2 and N = 8 bays into armour columns at T1–T6 | the first cell's fraction and the depth identical across tiers within 2 % (the k = −0.41 fit's error), by the scenario's own Bethe integration |
| S7 | `L0.shield.buffer.tier` | M rounds at g = 1 at T1–T6 | rounds per buffer 5.86 ± 1e-6 at every tier |
| S8 | `L3.mass.props.v5` | R1 at T1 and T6 | mass, centre, inertia from the split masses; thrust per machinery kilogram identical across tiers |
| S9 | `L0.determinism` | `tools/determinism.mjs` in Node and `proto/smoke.mjs` in Chromium | the same event hash (MATCH); no `**` with a non-integer and no `Math.pow`, `Math.sin`, `Math.cos` in `js/` (a grep in the scenario) |
| S10 | `L1.reactor.restart` | a reactor SCRAMmed by lost control, control back at t₁, T below hot | delivers again at t₁ + restartTime within dt; not before; not while hot |
| S11 | `L0.kinetic.chord` | an M round along a 45° line through armour cells (chord 1/√2 each) | depth in cells = the straight depth × √2 within 1e-9 by the round rule with r chord |
| S12 | `L0.beam.pstar` | `csdaRange` with water constants at 100 and 200 MeV | 7.718 and 25.96 g/cm² within 1 % |
| S13 | `L2.beambay.cause` | an overheated beam bay under power routing | `beam-stopped` cause `heat` |
| S14 | `L3.cull` | a round flying out of play, debris likewise | removed beyond cullDistance; momentum booked as `left`; books close |
| S15 | `L1.turret.timing` | a shot at `at` into a step | the round's position after its first step = v (dt − at) within 1e-9 |
| S16 | successors | every L1–L3 heat scenario whose expected value used `thermal.heatCapacityPerCell`, `L3.ship.heat.v2`, the blast and burn scenarios, `L3.mass.props.v4`, `L3.thrust.v4`, `L3.rcs.turn.v4` | identical except the new constants; the engineer lists the real set |
| S17 | `L3.control.rules` (scenario audit Q6-1) | a turret, a shield generator, a reactor and a beam bay each with and without a working bridge; control lost and regained | fires / absorbs / delivers / beams only under control; the `control-lost` and `control-restored` events; thrust applied at the exhaust (a torque appears on R1; it does not when applied at the centre of mass) |
| S18 | `L2.power.fraction` (Q6-2) | a turret, a shield generator, a quarters and a repair party each supplied half their draw | output = fraction × full (draw, budget, life support, repair) within 1e-9; `powered` false at fraction 0 |
| S19 | `L2.layout.invalid` (Q6-3) | overlapping rooms, a room off the grid, a bad rotation, a non-integer cell, each fitting rule | each throws or reports its named rule; a valid layout does not |
| S20 | `L3.r1.pinned` (Q6-4) | R1 at T1 | measured mass, acceleration, 90° turn and recoil per shot against literals computed by `tools/estimates/pass2.mjs` and quoted in the criterion (1e-6): a changed constant fails it, not only the data hash |
| S21 | `L0.kinetic.flatten` (Q6-5) | an M round that stops in a cell | the stop takes min(s, r) with the flattened area; the wrecked round's momentum goes to the ship; literals hand-worked in the criterion (p₀, A₀, S, r, f after cell 1), not an own loop |
| S22 | anchors (Q2) | `L0.beam.pstar` (S12) extended with iron at 200 MeV against the PSTAR table (cited); `L0.kinetic.penetration.v3`'s claim row cites De Marre for 100–150 mm (#236) as a bound, not a formula | within 1 % (PSTAR); the model's 11 cm inside the cited 100–150 mm |

**Conventions from the scenario audit** (`audit/2026-10-21-scenarios.md`, #244): a closed form against the kernel's loop is checked at **1e-12** (float residue 1e-16–1e-13), not 1e-9; a time on the step grid is checked one-sided in [t, t + dt); a check that compares two fields of the same kernel log, or `heat === energy` where the kernel assigns one to the other, is labelled a consistency invariant and never counts towards E3; an `expected()` that re-implements a kernel rule says so ("re-statement") and carries at least one hand-worked literal; no new scenario reads `ctx.scaled` for its expected value where a literal would do. Locked scenarios are not edited; the conventions apply from S1 on.

### 13k.5 Process and cost

One engineer session (opus) on `m0/pass2` with the whole of §13k in its first message; the physics checker (sonnet, blind, from the lock, in parallel with the first canonical run, #241 (1)); the reviewer (sonnet). The lead designer merges with no blocking finding. Estimated cost: raw 20–25 USD, **with #241's ×2.5: 50–60 USD**; the owner is told when it passes 40 (#191).

### 13k.6 Checklist (#241 (1))

- [x] Every number above is printed by `tools/estimates/pass2.mjs` from the kernel at `8392126`.
- [x] Estimates switch on every passed level's rules: the one-room races are one-sided with no radiator (as their L1 rows); the ship race is measured, not estimated.
- [x] Tolerances: S1 in [t, t + dt) (the step); S6 2 % (the fit's error, printed: 0.3 % at T6); S5/S14 1e-9 × gross (the L3 scale, #220); S7 1e-6 (a ratio of two scaled constants).
- [x] Hardware sense-checked: the F-1 in vacuum (925 N/kg); the compartment's density (1200 kg/m³); PWR primary water per MW_th (an estimate scaled from a 3400 MW_th plant: the weakest number here, range 2–20).
- [ ] Open: the crewed rooms' coupled C has no source (kept at today's value); a real linac does not scale with the tier (a stylisation, written in §5.4).

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

1. **Mission 0**, L0 to L6, one branch and PR per level (#151). After L3
   merges, the **mass pass** (§13g, #221), then a **rough feel prototype** (#217): a throwaway page in `proto/`
   on the L3 kernel, played by the owner on the Android phone, to judge the
   battle's pace (E7) and how harsh heat is before L4–L5 lock their
   numbers; its plan is written after L3, with estimates, as an *LD* row.
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
makes it bind at the 6th round within one step; whether real salvos reach
that stays for L5, #214). Signals for L3: power
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

**D pass: real round sizes, partial damage, repair** (2026-10-21; #203 D,
#206, #207; data `9bf66b9`, kernel `7cab27e` and `c63b42e`, runner
`f03e869`; five scenarios, 61 cases, locked at `49355f3` before their
first canonical run; **4 PASS, 1 FAIL** (`L2.lifesupport.routed`); T1,
size M, SI; constants of §13e.2). Every record was re-recorded for the new
data hash. Of the L0–L2 scenarios that passed on `main`, all still PASS
except the two withdrawn below; results moved only where the round's mass
enters (each by the factor 12 or as a float residue): `L0.kinetic.penetration`
(s0 × 12^(1/3)), `L0.kinetic.penetration.v2` and `L0.kinetic.overpen`
(last-digit float), `L0.shield.kinetic` and `.v2` (energies × 12, speeds in
the last digits), `L1.magazine.cookoff` (a full AP magazine 900 MJ, full HE
1.2 GJ), `L1.room.thresholds` (cook-off 1.2 GJ), `L1.turret.fire` (impulse
4800 N·s per shot), `L2.blast.walls`, `L2.shield.buffer`, `L2.size.rule`
(capacity 900 kg, round 6 kg); `L2.ammo.feed` only in its expected values.
Every other record moved only `dataHash` and `code`.

| Scenario | What the numbers say |
|---|---|
| `L1.kinetic.damage` | An M room cell resists 1.545e5 kg/(m·s): S, M and L rounds have depths of 6.765, 10.148 and 15.221 room cells at every tier T1–T6. Through one M quarters (3 cells deep) or one hold (2 deep) every size passes and exits, each cell losing exactly 1/3 per round; the quarters lose 3 of 18 crew per round (9 after three, every passed cell destroyed after the third). Along a line of six quarters the S round stops in cell 7 (loss 0.255), M in cell 11 (0.049), L in cell 16 (0.074); the fourth quarters on the M line loses 1 crew at 0.383 cells' worth of integrity (floor rule). Events: one `cell-damaged` or `cell-destroyed` per cell reached |
| `L1.quarters.repair.v2` | A cell damaged by 0.7123 next to full quarters is whole at 35.62 s, at the radius at 71.23 s, at four radii at 605.5 s; quarters with one cell left take six times longer; with none nothing is repaired. The destroyed second cell stays at 0 through every run (600 s to 3633 s) and never raises `cell-repaired`. Two (c, r) pairs of the v1 grid are left out: their times (356.15 s, 1068.45 s) are whole numbers of steps |
| `L1.repair.breach.v2` | Reactor cell A, damaged by 0.7123 at 1 s, is repaired at 38.85 s (closed form 38.841 s); a destroyed hold cell beside the quarters is not; the next hit (1 of 4) does not breach, the one after (2 of 4) does, and the reactor explodes 10 s later (200 MJ, cause hit-3), once; deaths 0, 1, 1 at the three hits and the explosion takes the last 2 |
| `L2.shield.salvo` | Stopping a 6 kg M round costs **1.7067 MJ** (800 → 266.7 m/s): salvos of 3 and 5 leave 4.88 and 1.47 MJ of the 10 MJ buffer; the **6th round** is slowed only to 388.7 m/s and every later round passes at 800 m/s; the buffer refills in 1 s. The rule now binds within one step at the 6th round; one turret fires 0.5 rounds/s, so whether real salvos reach it stays for L5 (E4 open, #214) |
| `L2.lifesupport.routed` | **FAIL** on one check. (a) Quarters at 320 K beside an idle reactor (5 m) and a heat sink (10 m) pump 39.57 and 79.14 MJ in the exact ratio 1 : 2 (largest error 0 over 36 000 steps), reach 1 mK of the setpoint at 353.17 s (reference 353.17 s) and never drop below 295 K (lowest 295.000238 K). (b) Under routing, quarters switched off keep life support (0.2 MW: peak 295.0010 K; switched on 295.0013 K), so #207 holds; with the reactor switched off nothing is pumped, the quarters reach 338.5 K and are hot at 738.15 s; at 1 MW the crew die at 437.98 s (on), 458.27 s (off) and 327.67 s (no supply), each one-sided against the reference. What fails is the row's **1e-6 K per-second match**: the kernel's explicit Euler differs from the RK4 reference by 2.0e-6 to 5.0e-5 K (largest without supply, where the passive wall carries the whole gradient); the same gaps came out of an independent pre-lock estimate. Every other check passes. **Withdrawn** under #188 (#212 (1)), successor D5b |
| `L2.lifesupport.routed.v2` (D5b, #212) | **PASS**, every case. D5's setup and numbers unchanged (they come from the same kernel and reference): (a) 1 : 2 split with error 0 over 36 000 steps, 1 mK at 353.17 s, 39.57 / 79.14 MJ, lowest 295.000238 K; (b) the largest per-second gap to the RK4 reference is 2.0e-6 K (0.2 MW, on), 2.8e-6 K (off), 2.5e-5 K (no supply, 338.5 K), 1.7e-5, 1.9e-5 and 5.0e-5 K at 1 MW: at most 1.3e-7 relative, **7.6× inside** the 1e-6 relative criterion. Crew die at 437.98 s (on), 458.27 s (off), 327.67 s (no supply), one-sided against the reference |
| `L2.blast.split` (D6, #212) | **PASS**, 3 cases. The magazine (2 MJ capacity) saturates and the rest splits exactly 2 : 1 by wall length (10 m : 5 m) with no neighbour saturated and nothing escaping: (i) HE 8 MJ gives the holds 4 and 2 MJ (integrity 0.5 and 0.75 of their 8 MJ capacity), AP 6 MJ gives 2.667 and 1.333 MJ; (ii) AP: hold 2.667 MJ, bridge 1.333 MJ, every bridge cell at integrity 1/3 and 2 of its 4 crew dead (floor(4 × 8/3 / 4)), one `cell-damaged` (channel blast) per neighbour cell; absorbed + escaped = E to 1e-12 |

**Withdrawn** (`mission0/withdrawn.json`, decision #206, superseded by the
owner's #203 D): `L1.quarters.repair` (its target cell is destroyed and is
now never repaired: 15 of 20 cases fail, the 5 with no quarters cells
left still pass), successor `L1.quarters.repair.v2`; `L1.repair.breach`
(it waits for the repair of a destroyed cell that never comes; its run()
stops on a null event, which `tools/m0.js` now records as a FAIL instead
of aborting), successor `L1.repair.breach.v2`. `regress`: 44 VERIFIED,
7 WITHDRAWN.

**Fixes of #212** (2026-10-21; D5b and D6 written at `78a7101`, locked at `f637d2e` before their first canonical run; `L2.lifesupport.routed` withdrawn, decision #212, successor `L2.lifesupport.routed.v2`): 2 PASS, 10 cases. `regress`: 46 VERIFIED, 8 WITHDRAWN.

Honest reading. Strong: the momentum books of D1 (depth to 1e-9 at six
tiers, the stopping cell's share, the exit momentum), the per-step 1 : 2
split of D5 (a), D5 (b)'s crossing times against an RK4 reference, the
D4 binding round. Close restatements: the repair times of D2 and D3 and
the buffer arithmetic of D4 lock the rules. What the numbers say for the
design: one M round through a compartment now kills a third of the crew
it would have killed before and leaves it repairable; three hits wreck
it; a shield's buffer stops five M rounds of a salvo and slows the sixth.
Signals: the small HE loads of `L2.blast.walls` (2 and 4 rounds) are now
16 and 32 MJ and saturate every room of its clusters, so the split by
wall length before saturation is no longer exercised there, and its
row-hold HE-2 case sits exactly on E = Σ B (16 MJ); D5's 1e-6 K
tolerance is below the kernel's Euler error, a question in the pull
request. Both were answered by #212: D5b's relative tolerance has a
7.6× margin over the measured Euler gap (a check that the tolerance sits
above the step error, not new evidence beyond D5's); D6 brings back the
split by wall length before saturation, but it is a restatement of the
wave-front rule on a two-neighbour graph with exact float arithmetic and
no stepping, so its strength is in exercising the D-pass crew rule for
blast (2 of 4 bridge crew at integrity 1/3), not in the energies.

**L3 the minimal ship, first run** (2026-10-21; #208–#216; data `208955b`,
records re-recorded `1f10e81`, kernel `e5916df` and `4ec77d9`; nine
scenarios, 68 cases, written at `4df036d`, locked at `923bb27` before their
first canonical run; T1 and T6, size M, SI; constants of §13f.4). **1 PASS
(`L3.kinetic.hole`), 2 FAIL, 6 BLOCKED** behind failed dependencies. Of the
68 cases **65 PASS**; the 3 that fail are the two the engineer predicted
before the lock from the documents alone (the plan's tolerance in
`L3.thrust` (b) and its 295.01 K bound in `L3.ship.heat`). The other
verdicts fall on two invariants the engineer wrote into every L3 file and
did not check against float resolution before the lock: the heat books'
1e-9 is taken relative to the heat moved, with no floor at the resolution
of the stored heat Q − Q0 (residuals ≤ 5e-12 of the stored heat, 3.6e-3 J
at most), and the angular books' scale leaves out the gross angular
impulse of a couple fired one way then the other (6.2e-9 of about 2e7
booked in `L3.rcs.turn`). Both are float residues, not physics; the
withdrawals and successors are for the lead designer (questions in the
pull request). The data commit moved only `dataHash` and `code` in every
earlier record, except `L1.engine.thrust` and `L1.room.restart`, which hold
`engine.thrust` (8 → 2 MN); the kernel (holes that resist no round
included) moved none, and every earlier verdict holds (`regress`: 46
VERIFIED + 8 WITHDRAWN).

| Scenario | What the numbers say |
|---|---|
| `L3.mass.props` | All 34 cases match the cell sums to 1e-12. A T1 cell is 1000 kg, a heat sink cell 1573.34 kg. **R1 is 52.267 t** with its centre of mass at (28.733, 16.472) m and I = 1.3114e7 kg·m² (the plan's 52.3 t, (28.73, 16.47), 1.313e7); after 20 rounds fired and the store refilled 52.147 t; after four cells that split nothing 48.267 t; after the cut of row 5, 26.074 t and 20.797 t. A cell, each room and each full room has 216 times the mass and 7776 times the moment of inertia at T6. R1 at T6 is 10 525 t, not 216 × 52.267 t: `radiator.mass` scales with k = 2. FAIL on the heat-books invariant only |
| `L3.thrust` | (a) The symmetric ship accelerates at exactly F / M (142.857 m/s² for 14 t) with ω = 0. (b) R1's thrust line passes **1.4717 m** below its centre of mass: α = 0.22446 rad/s² (12.86 °/s²), ω = α t to 1e-9 at every step, readout **3.902 g**. Against the RK4 reference the semi-implicit Euler heading and position differ by **1.67e-2** relative at 1 s and 1.7e-3 at 10 s (11.279 against 11.260 rad), the scheme's own first-order error dt / t: over the row's 1e-6, as predicted before the lock. BLOCKED |
| `L3.rcs.turn` | One bow–stern couple gives α = **0.3813 rad/s²** (5 MN·m on 1.311e7 kg·m², arms 23.8 + 26.2 m); a bang-bang 90° turn ends at 4.0667 s (244 steps) against 2 √(θ / α) = 4.0595 s, with |ω| ≈ 1e-16 rad/s and the heading at 90.32°; the readout gives the same α and 4.0595 s. Both directions. BLOCKED (heat books and the angular books' scale) |
| `L3.recoil` | **One M shot broadside moves R1 by 0.0918 m/s and turns it by 0.341 °/s**; 20 shots, the store refilled from the magazine between them, 6.834 °/s (each shot a little more as the ship gets lighter: 0.3412 to 0.3421 °/s); forward 0.179 °/s per shot (the gun sits 8.5 m above the centre of mass). The ship's momentum change equals minus the rounds' momenta to 1e-12. The railgun-sized fixture (25 000 N·s) gives 0.4783 m/s, and 0.546 °/s 5 m off the axis. For E4 (#203 C): an M turret on a 52 t ship turns it visibly (7 °/s after 20 shots), so recoil has an effect on a minimal ship; on a 250 t corvette #210 estimates about 0.02 °/s per shot. BLOCKED (heat books) |
| `L3.split.momentum` | The cut leaves a 26.074 t bow (bridge half, magazine, quarters, turret, beam bay, hold) and a 20.797 t stern (engine, reactor, shield generator, half the heat sink), and 5 pieces of debris, 5.397 t: the four cells and the radiator on heat sink cell (4,5). At T1 the fragments move at (9.945, 0.590) and (10.133, −0.681) m/s, both at 0.05 rad/s, the parent's field at their centres of mass; momentum, angular momentum and kinetic energy are kept to 6e-11 N·s, 1.9e-9 kg·m²/s and the last digit, and through the flight after. T6 the same. BLOCKED (heat books) |
| `L3.fragment.scram` | All 5 cases PASS and all invariants hold; BLOCKED behind `L3.split.momentum`. Split: the stern reactor SCRAMs at the cut (1.0167 s, cause `cut-4`), having delivered 7.25 MW (shield 2 + engine 5 + quarters 0.05 + turret 0.2), 456.75 MJ of decay heat to come, 15.219 MJ by 30.5 s later (closed form to 1e-9); the engine stops, the shield goes down; the bow bridge keeps control and its life support, the quarters, magazine and turret lose theirs. The hold's inner row cut: two bodies, nothing stops. The bridge destroyed: SCRAM at the 4th cell (`bridge-4`), one body. #216: quarters joined to the reactor only through the bridge and heat sink keep life support (22.6 MJ pumped); a reactor switched on at demand 0 supplies none (the quarters stay at 299.9 K) |
| `L3.validation` | R1 is valid and each of the seven variants is rejected with exactly its rule (connected, hull, exhaust, fitting-inside, fitting-per-edge, overlap, grid). R1 is valid only under the engineer's reading that its shield generator may carry radiators (a question). FAIL on the heat-books invariant only |
| `L3.ship.heat` | The readout: idle 0.15 MW, cruise 10.9 MW, battle 30.9 MW of heat against **2.81 MW** of radiators at plant hot. Event times match the reference within one step: cruise hot at 509.25 s (shield generator), 513.05 s (reactor), 550.43 s (engine), 737.25 s (heat sink), nothing overheated in 900 s (reactor peak 743.2 K); battle beam bay hot at 102.62 s, **overheated at 177.92 s**, reactor hot at 157.12 s, overheated at 348.70 s, shield generator hot at 194.45 s, engine 230.25 s, heat sink 353.38 s. **FAIL** in cruise and battle on one check: the bridge reaches 295.304 K and 295.742 K. Its only coolant neighbour is the reactor, whose passive wall (250 W/K) leaks 110–130 kW into it at 740–800 K, and with its own 100 kW draw that is more than its 200 kW of life support; the reference agrees to 1 mK, so the row's estimate, not the kernel, is off. Quarters, magazine and turret hold ≤ 295.001 K |
| `L3.kinetic.hole` | **PASS.** An M round along D1's line stops in cell 11 intact and in cell 12 with the 2nd cell destroyed beforehand, with the same stopping loss (0.04922); the hole absorbs nothing and loses nothing; deaths by the floor rule (5/3/3/2 against 3/3/3/1); identical at T6 |

`node tools/perf.js` (E8 baseline, #213; two R1s stepping together, battle
load, Node 22 in the container): **0.05 ms per step without power routing
and 0.11–0.12 ms with it, at T1 and at T6**, a tenth of the 1 ms budget
before combat (L5).

Honest reading. Strong: the mass properties against cell sums at two
tiers and the square–cube ratios; ω = α t at every step and the
semi-implicit Euler's known first-order gap to RK4 (measured, not assumed);
the split's exact conservation of mass, momentum, angular momentum and
kinetic energy with the velocity field; the decay heat after a SCRAM
caused by a split, by the closed form; the heat run of a whole ship
against an independent RK4 reference with every L1, L2 and D-pass rule
(event times within one step). Close restatements: the readout's numbers,
validation's reasons, the hole. What the numbers say for the design: a
minimal ship at 2 MN accelerates at 3.9 g and spins at 12.9 °/s² off its
thrust line, so a ship needs its engines on the centre of mass or RCS to
fly straight; recoil turns a 52 t ship visibly (E4 for recoil is judged at
L5); R1 cannot cruise for ten minutes on 17 radiators without passing
plant hot, and its beam bay, outside the coolant loop, shuts down after
three minutes of firing (the throughput law binds, #205 (8)); a bridge
beside a reactor that runs hot warms above its setpoint (life support too
small for the passive leak plus its draw), the first sign that the bridge
wants a cooler neighbour.

**L3 fixes of #219 and #220** (2026-10-21; v2 files written at `6af9f33`
with the kernel's gross angular impulse booked, `external.Hgross`;
rescaled and extended for #220 at `249fc1e`; locked at `a3a8e6c` before
their first canonical run; no kernel or data change since the first run).
**All seven v2 successors PASS**, and `L3.fragment.scram`, unchanged, now
PASS through its dependency's successor (#188; same rows as its BLOCKED
record). The seven v1 scenarios are withdrawn as specification errors
(#219): the five recorded BLOCKED were re-run unchanged once
`L3.mass.props.v2` passed and now hold FAIL with the same rows, on exactly
the invariants and criteria #219 names. `regress`: 55 VERIFIED + 15
WITHDRAWN. Margins measured before the lock (tolerance over the worst
residue, every case): angular books (1e-9 × net + 1e-12 × gross)
`L3.mass.props.v2` 454 (R1 at T6), `L3.rcs.turn.v2` 3.7e3, `L3.recoil.v2`
3.4e3, `L3.ship.heat.v2` 4.2e4, `L3.thrust.v2` 9.8e4, `L3.split.momentum.v2`
2.4e5 (`L3.validation.v2` books no angular impulse: residue 0); heat books
(max(1e-9 × flow, 1e-10 × Q0)) 1.5e3 (`L3.ship.heat.v2`) to 1.3e5; the
discrete heading 1.8e6; the discrete position 1.6e5; the end time exact.

| Scenario | What the numbers say |
|---|---|
| `L3.mass.props.v2` | The first run's 34 cases, unchanged, with the books rescaled: PASS |
| `L3.validation.v2` | R1 valid, the seven variants rejected with exactly their rule: PASS |
| `L3.rcs.turn.v2` | α = 0.381278 rad/s² both ways; **122 turning + 122 braking firing steps**, the last ending at 4.06667 s = 244 / 60 s; the heading **1.576373 rad** (90.32°) equals the semi-implicit scheme's discrete sum 122² α dt² to 5.6e-16 relative; |ω| ≈ 1e-16 rad/s. The discrete heading catches a wrong step count (one step is 8e-3) or a wrong α, but not explicit against semi-implicit Euler: for a symmetric bang-bang both give n² α dt². PASS |
| `L3.recoil.v2` | The first run's numbers (0.0918 m/s and 0.341 °/s per broadside shot, 6.834 °/s after 20; 0.179 °/s forward; fixture 0.4783 m/s): PASS |
| `L3.split.momentum.v2` | The first run's numbers (26.074 t and 20.797 t, 5 pieces of debris, 5.397 t; conservation at the cut and in flight): PASS |
| `L3.thrust.v2` | (a) the symmetric ship's centre of mass at the discrete x_n = a dt² n(n+1)/2 at every whole second and at step 601 (7178.611 m) to 6.2e-15 (explicit Euler would be off by 2 / (n + 1), 3.3e-2 at 1 s); (b) against RK4 at 5 s and 10 s: position 2.7e-3 and 8.1e-4, heading 3.3e-3 and 1.7e-3, inside 1e-2 and the dt / t of the plan: PASS |
| `L3.ship.heat.v2` | Event times as in the first run; the crewed rooms' peaks match the reference within 0.01 K (bridge 295.304 K cruise, 295.742 K battle) and none reaches crewed hot: PASS |

Honest reading, added to the first run's. The v2 successors restate the
first run's measurements with books sized to float resolution; they add
two checks of the integrator itself (the discrete turn and the discrete
position), which pin the kernel to its scheme to 1e-15 but are close
restatements of semi-implicit Euler, not new physics. The scale of the
angular books stays a float bound, not a physical one: 1e-12 of the gross
angular impulse lets a couple fired both ways leave its rounding, and
`L3.mass.props.v2`'s margin of 454 (R1 at T6) is the tightest. In
`L3.ship.heat.v2`'s battle the reactor is held at a fixed 19.75 MW after
the beam bay shuts down at 178 s, since the scenario has no power routing
(a fixture): the events after that time (reactor overheated at 348.70 s,
heat sink hot at 353.38 s, engine and shield generator hot) are fixture
consequences, not design signals (#220 (4)). The bridge's rise above its
setpoint (life support overwhelmed by a hot reactor's passive leak plus
its own draw) stays a signal (#219 (3)).

**The mass pass: ships of real density** (2026-10-21; #221, #222; data
`4786d79`, kernel `a01756b`, runner `22da3b6` and `7b0f40f`, every record
re-recorded `05aae7f`; five v3 successors and `L3.fragment.rules` written at
`5553e13`, locked at `74493af` before their first canonical run; T1 and T6,
size M, SI; constants of §13g.2). **All six PASS** (5 v3 + `L3.fragment.rules`,
52 cases, all PASS). The re-record moved results only where the new data reaches
them: `L1.engine.thrust` and `L1.room.restart` (`engine.thrust` 2 → 15 MN,
still PASS), `L3.fragment.scram` (its engine's thrust at half throttle,
7.5 MN, and its momentum residues; still PASS) and `L3.ship.heat.v2` (its
momentum residues only: every temperature, event time and peak is
bit-identical; still PASS). Every other L0–L2, D-pass and L3 row is
unchanged. The five L3 v2 scenarios whose expected values compute mass from
`thermal.specificHeat` (`L3.mass.props.v2`, `L3.thrust.v2`,
`L3.rcs.turn.v2`, `L3.recoil.v2`, `L3.split.momentum.v2`) fail: their
`expected()` names a constant #221 removed (the runner now records that as
a FAIL, like a `run()` that throws, #212 (7)); they are withdrawn as
superseded by #221, and their v1 predecessors resolve through the chain
v1 → v2 → v3 (the runner follows it). `L3.fragment.scram`,
`L3.ship.heat.v2`, `L3.validation.v2` and `L3.kinetic.hole` needed no
successor: none computes mass in its expected values. `regress`: **56 VERIFIED + 20 WITHDRAWN**.
Each v3's actual rows hash exactly as its v2's (the same `run()`): only the
expected mass changed. Margins before the lock (tolerance over the worst
residue, every case): angular books `L3.mass.props.v3` 3.6e3 (R1 at T6 after
20 shots; 454 before the mass pass), `L3.rcs.turn.v3` 1.6e4, `L3.recoil.v3`
3.1e4, `L3.thrust.v3` 1.0e5, `L3.split.momentum.v3` 8.6e5,
`L3.fragment.rules` 1.4e6; momentum books ≥ 9.9e4; heat books ≥ 9.9e3; the
RK4 gap of `L3.thrust.v3` (b) 3.0 (heading at 5 s, dt / t, unchanged by
mass) and 3.5 (position at 5 s).

| Scenario | What the numbers say |
|---|---|
| `L3.mass.props.v3` | 34 cases match the cell sums to 1e-12. A T1 cell is **10 000 kg**, a heat sink cell 10 573.34 kg. **R1 is 448.267 t**, centre of mass (29.451, 16.376) m, I = 1.0803e8 kg·m² (§13g.3: 448 t, (29.45, 16.38), 1.08e8); after 20 rounds 448.147 t; after four cells 408.267 t; after the cut 242.074 t and 164.797 t. ×216 in mass and ×7776 in I at T6 for every room alone; R1 at T6 96 061 t against its own sums (`radiator.mass` k = 2). PASS |
| `L3.thrust.v3` | (a) The symmetric ship (140 t) accelerates at exactly F / M = 107.14 m/s² (10.9 g) with ω = 0, on the discrete position to 5.7e-15. (b) R1's thrust line passes **1.376 m** below its centre of mass: α = 0.19110 rad/s² (**10.95 °/s²**), ω = α t at every step, readout **3.412 g**; against RK4 at 5 s and 10 s position 2.8e-3 and 1.1e-3, heading 3.3e-3 and 1.7e-3. PASS |
| `L3.rcs.turn.v3` | One couple: α = **0.46285 rad/s²** both ways (arms 23.05 + 26.95 m); **111 + 111 firing steps** ending at 3.700 s against 2 √(θ / α) = **3.684 s** (0.93 of a step after it, inside the one-sided window); heading 1.584101 rad (90.76°) = 111² α dt²; |ω| ≈ 6e-17 rad/s; readout the same α and 3.684 s. PASS |
| `L3.recoil.v3` | **One M shot broadside moves R1 by 0.01071 m/s and turns it by 0.03959 °/s**; 20 shots 0.7919 °/s (0.03959 to 0.03960 °/s each); forward 0.02196 °/s per shot. The railgun-sized fixture (25 000 N·s): **0.05577 m/s**, and 0.0663 °/s 5 m off the axis. Momentum change = −Σ round momenta to 1e-12. PASS |
| `L3.split.momentum.v3` | The cut leaves a 242.074 t bow and a 164.797 t stern (with contents and fittings; cells alone 240.0 t and 161.1 t) and 5 pieces of debris, 41.397 t (the four cells and the radiator on (4,5)); at T1 the fragments move at (9.931, 0.529) and (10.147, −0.719) m/s, both at 0.05 rad/s, the parent's field after 31 steps of turning; |ΔP| 9.4e-10 N·s and |ΔL| 3.0e-8 kg·m²/s at the cut, kinetic energy to the last digit; T6 the same. PASS |
| `L3.fragment.rules` (#222 (1)) | An RCS on a controlled host: one step of the stern RCS on R1 gives Δv = 0.03718 m/s and Δω = 4.158e-3 rad/s, 1000 J of heat in the engine. After the cut the stern has no bridge: its RCS, ordered to fire for 60 steps, changes neither v nor ω (both exactly 0) and puts no heat in the engine, while the bow RCS fired in the same steps gives the 242 t bow Δv = 0.06885 m/s and Δω = −7.757e-3 rad/s in its first step and 60 kJ of heat. A heat sink split evenly (2 of 4 cells destroyed on a diagonal) works in the fragment holding its lower-indexed survivor: k0 in the bridge's 92.87 t fragment ("low"), k1 in the 52.87 t one ("high", the lighter); its other cell counts in the other fragment's mass and carries nothing: heat sink C, joined only through that cell, keeps its heat bit for bit ("low"), and B and C together keep theirs to ten digits while their live wall carries 2.8e7 J from C to B in 10 s ("high"). PASS |

`node tools/perf.js` (E8, #213): two R1s step in **0.05–0.11 ms without power routing and 0.15–0.19 ms with it, at T1 and at T6, depending on the machine** (mass changes no cost), far under the 1 ms budget. Three kernel mutants (an RCS firing without control, dead-weight cells carrying flows, the tie broken by the highest index) each fail `L3.fragment.rules` in an exploratory run.

Honest reading. The v3 successors restate the v2 measurements with the
mass rule of #221, so they prove the new rule is built as written, not new
physics; `L3.fragment.rules` closes the three kernel rules the L3
reviewer's mutants survived (an RCS firing without control, dead-weight
cells carrying heat, the tie rule), each against a closed form or an exact
conservation. What real density changes in feel: R1 is 8.6 times heavier
(448 t, 80 kg/m³) and its moment of inertia 8.2 times larger, while thrust
went up 7.5 times and RCS force 10 times, so **acceleration falls only from
3.9 g to 3.4 g and a 90° turn quickens from 4.1 s to 3.7 s**: a minimal
ship still dodges and turns fast. **An engine off the centre of mass still
spins R1 at 10.9 °/s²** (12.9 before): the thrust line's 1.4 m offset still
needs RCS or a centred engine. **Recoil is now 8.6 times smaller**: an M
shot turns R1 by 0.040 °/s (0.34 before), 0.79 °/s after 20 shots, which a
couple cancels in 1.5 ms of firing per shot (30 ms for 20); even the railgun-sized
impulse moves R1 by only 0.056 m/s and 0.066 °/s, so recoil now matters
only for the railgun on light ships, as #203 C expected, and E4 for recoil
stays open until L5 measures it in battle. Heat is untouched (heat capacity
is the machinery's, #221): every heat race of L1–L3 records the same
temperatures. A moving ship now carries about ten times the momentum and
kinetic energy (22.5 MJ for R1 at 10 m/s and 0.05 rad/s), which will
matter for debris and collisions (L4). Not tested here: masses at L or S
size, and a split room's heat capacity (which share the dead cells keep),
which no document states.

**The path model: protection is mass, the round is damaged, the beam is
a spinal accelerator** (2026-10-21; #228–#235; data `c2981a5` and
`f220524`, kernel `bcd0544`, P1–P10 written at `7e8dd84` and locked at
`aa186d9` before their first canonical run; T1–T6, SI; constants of
§13i.2). **All 15 new scenarios PASS** (P1–P9 and the six P10 successors).
`regress`: **57 VERIFIED + 34 WITHDRAWN**. The re-record moved results
only where the new rules reach them: every L0–L2 row is unchanged except
the withdrawn ones; `L3.fragment.scram` and `L3.ship.heat.v2` re-record
with new momentum rows (masses) and still PASS; `L3.validation.v2` is
unchanged (the `axis` rule reads the centroid of the ship's cells). Withdrawn
as superseded (14): by #230 `L0.kinetic.penetration`, `.v2`,
`L0.kinetic.overpen`, `L0.beam.falloff`, `L0.beam.burn`, `.v2`; by #232
`L1.kinetic.damage`, `L3.kinetic.hole`; by #234 `L3.mass.props.v3`,
`L3.thrust.v3`, `L3.rcs.turn.v3`, `L3.recoil.v3`, `L3.split.momentum.v3`,
`L3.fragment.rules`. Five of them still PASS on the superseded pure
functions and constants kept for `proto/` v1 (the kernel's rules moved to
their successors); the runner checks that a withdrawn scenario keeps the
verdict it was recorded with. Margins before the lock: the kernel's Bethe
integration (RK4, 2 kg/m² and 1 % of the energy per step) differs from a 10×
finer one by at most 3e-14 against P6's 1e-3; P8's crossings lie 0.10–0.47
of a step from the grid for N = 8, while N = 2 lands on whole steps (6, 12,
18, 24 s: all the energy is in one cell, 30 MJ / 5 MW) and passes on the
1e-9 float slack of #185 (2).

| Scenario | What the numbers say |
|---|---|
| `L0.kinetic.penetration.v3` (P1) | Armour depths **1.479686 / 2.166049 / 3.162261** cells for S / M / L, identical T1–T6 to 1e-9; they pass 1, 2, 3 cells and end 45 / 44 / 43 % flattened; momentum books exact. PASS |
| `L0.kinetic.overpen.v2` (P2) | An M round leaving 1–4 hold cells keeps **0.8817 / 0.7558 / 0.6210 / 0.4762** of its momentum (f 0.06–0.24). PASS |
| `L0.kinetic.wreck` (P3) | At 0.3 S (a function test) S is wrecked in cell 1 and M in cell 2 (f = 1); L stops in cell 3 at f 0.948, not wrecked; the stopping cell takes min(s, r); T1 = T6. PASS |
| `L1.kinetic.damage.v2` (P4) | Crew quarters (σ 592 kg/m²): S and M stop in the **2nd cell** (depths 1.078, 1.498), L in the 3rd (2.191); a hold (120 kg/m²): every size exits keeping 0.627 / 0.756 / 0.839; three M rounds destroy the first quarters cell and kill 4 of 18 crew; T1–T6 identical. PASS |
| `L3.kinetic.hole.v2` (P5) | D1's line of six quarters: the M round stops in **cell 2**, and in cell 3 with the 2nd cell destroyed, with the same stopping loss 0.166153 and f 0.4525; the hole takes nothing and does nothing to the round; T6 the same. PASS |
| `L0.beam.depth` (P6) | 100 and 200 MeV (10 and 20 m bays) leave everything in the first armour cell; 400 MeV **0.43124 / 0.29949 / 0.26927**; in crew cells **0.58744 / 0.41256**; at T6 all in cell 1; a hole shifts the profile one cell exactly; Σ F + exit = 1 to the last bit; CSDA range of 200 MeV in iron **372.54 kg/m²** (373 ± 1 %). PASS |
| `L0.beam.range` (P7) | 5 MW delivered at 0, 600 and 1500 m, the same fractions. PASS |
| `L0.beam.burn.v3` (P8) | Armour column at contact and at 1.5 km, the same: N = 8 (400 MeV) cells destroyed at **13.917, 18.167, 20.450, 30.133 s** (own t 13.913, 18.165, 20.439, 30.124); N = 2 (100 MeV) at 6, 12, 18, 24 s; T3: N = 8 (800 MeV) 21.88–56.48 s, N = 2 12–48 s; heat in each room = energy left there; 30.6 MJ leaves behind the column once N = 8 has holed it. PASS |
| `L1.beambay.length` (P9) | E = 100 / 200 / 400 MeV for N = 2 / 4 / 8 at T1 (×2 at T3) exactly; beam, draw and heat 5 / 12.5 / 7.5 MW (M) and 11.25 / 28.125 / 16.875 MW (L) at T1 for every N; R1 valid; the bay at rows 0–1 rejected by `axis` alone (centre line 3.09), a hold ahead by `bow` alone. PASS |
| `L3.mass.props.v4` (P10) | **R1 full is 850.067 t** (cells 844.1 t; 448 t before), centre of mass (24.589, 16.290) m, I = 1.1171e8 kg·m²; a reactor alone 500 t, quarters 88.8 t, a hold 12 t; ×216 / ×7776 at T6. PASS |
| `L3.thrust.v4` (P10) | R1 at 15 MN: **1.799 g**, α = 0.1735 rad/s² (the thrust line 1.29 m below the centre of mass); the symmetric ship 2.567 g. PASS |
| `L3.rcs.turn.v4` (P10) | α = 0.4476 rad/s²; 113 + 112 firing steps, a 90° turn in **3.75 s** (3.747 s continuous). PASS |
| `L3.recoil.v4` (P10) | One M shot broadside: 0.0056 m/s and **0.050 °/s**; 20 shots 1.005 °/s; forward 0.021 °/s; the railgun-sized fixture 0.029 m/s and 0.064 °/s 5 m off axis. PASS |
| `L3.split.momentum.v4` (P10) | The cut leaves a 587.4 t stern and a 225.7 t bow, 37.0 t of debris; (10.100, −0.269) and (9.746, 0.685) m/s; books to 1e-9. PASS |
| `L3.fragment.rules.v2` (P10) | Stern RCS Δv 0.0196 m/s, Δω 3.30e-3 rad/s per step; the uncontrolled stern does not fire; tie fragments 77.07 t and 17.87 t. PASS |

`node tools/perf.js` (E8, #213), now with each R1's beam on the other's
middle row every step: **0.06–0.07 ms without power routing and 0.10–0.14
ms with it**, at T1 and T6 (beam fractions are cached per hole pattern),
far under the 1 ms budget. `proto/` v1 still runs its smoke test (0
console errors, replay MATCH) on the kept superseded functions; with the
new masses its default battle now ends at 31.07 s (the kernel's `fireRound`
moved), which v2 replaces anyway.

Honest reading. The kinetic scenarios prove the round rule and the mass
law are built as written, against the scenario's own loop; the beam
scenarios prove the Bethe deposit against an independent integration and
the burn against a stepped re-implementation; they do not prove that the
real numbers feel right. What the path model changes: **light structure
no longer lets a round through like a needle** where it is heavy: an M
round stops in the 2nd cell of crew quarters (about eight in the first
version, ten before it) and, by the estimate of 13i.3, in R1's first bridge cell from the
bow, so the reactor behind is safe from a single round; but **holds and
light machinery are thin**: an M round crosses two hold cells keeping 76 %
of its momentum, and a reactor cell (5000 kg/m²) stops any round in a fifth
of a cell. Rounds do flatten (41–52 %), never enough to wreck in the
approved ranges. The beam is now **a surface weapon at R1's 10 m bay**
(100 MeV: all in the first cell, as armour or as a crew room) and reaches
behind armour only with a long spinal bay (40 m for three armour cells),
which costs length and mass, as #234 intended; at T6 a 400 MeV beam stays
in the first cell (the square–cube law, #63, for L6). R1 is almost twice as
heavy (850 t) and dodges at 1.8 g; recoil per shot is a quarter larger in
turn rate than the mass pass's (the centre of mass moved aft, nearer the
reactor). Not tested here: a round or beam in a full ship battle (L4), L or
S rooms' masses, an off-axis beam path through mixed rooms, a heat sink on
a round's path (its σ holds water, while the round's own strength uses
steel's c alone), and the crew of a long beam bay (its crew scales with its
cells under the size rule).

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
