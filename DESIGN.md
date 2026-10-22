# Duct Tape Navy: Mostly in One Piece — Design

Status: designed 2026-10-20; **Mission 0 L0–L3, the D pass, the mass pass, the path model and prototype v2 are merged** (`regress`: 57 VERIFIED + 29 WITHDRAWN + 5 RETIRED); the documents' consolidation (#241 (5)) and physics pass 2 (§13k, #240) are merged; L4 is planned (§13l: L4a then L4b), no game yet. Mission 0 (§13) comes
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
| Damage channels | **Kinetic** (momentum: each cell takes part by its resistance; `fireRound` receives the round's velocity **relative to the hull** it hits (#242, superseding #137's 'relative velocity not counted' and #202 F's deferral): ships at rest give the muzzle velocity; L4 and L5 pass the relative velocity, as prototype v2 does), **thermal** (absorbed beam energy, which also becomes heat in the target room), **blast**, **EMP** (#137, #138) |
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
or a field, and a room's perimeter caps its neighbours (#18). Example, measured at L2 (#200, #201): a running reactor beside a magazine or crewed rooms leaves them at 295 K while life support runs, and they reach only 318–338 K in 15 minutes without it; the cook-off temperature of a magazine is 450 K.

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
| Bridge | 2×2 | inside | provides control; little power, **own backup supply** (#147); destroyed, **overheated or switched off**: it gives no control and every reactor SCRAMs (decapitation includes heat, #185 (6)) |
| Reactor | 2×2, 3×3 | inside | power and much heat; SCRAM on control loss, decay heat; breach when heavily damaged; meltdown when critical |
| Engine | 2×3 | exhaust on the aft hull, **exhaust must be clear** | a self-fuelled torch (#203 A): thrust from its own fuel, auxiliary power and heat from the ship; exhaust very IR-bright; thrust through the CoM recommended, not required |
| Magazine | 2×2, 3×3 (the L magazine, #201 (5)) | inside | ammunition by contents, fed through walls; explodes by the ammunition left: the propellant dominates, HE adds about a third (#215); **detonates when any of its cells is destroyed while it holds rounds** (#185 (6); the kernel tests the room's rounds), so with `kinetic.hitsToWreck` hits wrecking a cell this rule ended every duel of prototypes v1 and v2 (#233, §13j.6 in `HISTORY.md`) (#233) |
| Shield generator | 2×2, 3×3 | anywhere; a plant room that may carry fittings (#219) | shield field; EM-bright while absorbing; absorbing makes heat |
| Crew quarters | 3×2 | inside | houses crew, sets crew capacity (#60; the rule that each room's crew must be housed is a build-time constraint built at L4, §5.5); repair field by surviving cells (#51) |
| Beam bay | 2×N, 3×N (a linear accelerator, #234) | along the axis, bow face open | much power, very much heat; the longer, the deeper its beam reaches; its firing window stays open while firing; **its crew follows the size rule by its cell count** (12 for N = 8, #236 (4)) |
| Kinetic turret | 2×2, 3×3 | one side on the hull | rounds and recoil; ammunition and some power |
| Spinal railgun | N×2 along the ship's axis (x) when it is built at L5 (#236 (6); `data.js` still holds [2, N]) | on the axis, fires forward | longer barrel, faster round; axial recoil; very much power |
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
| Armour | stops | a steel plate on a hull edge or a shared wall segment, never a deck (#256, §13l.1); its mass by its area, heavy, tiers |
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
clear exhaust (#57); **crew capacity** (#60): quarters house the crew and every room needs its crew placed, a build-time constraint with no kernel rule yet (R1 needs 20 crew and houses 18); it is built at L4 with R1 given what it needs (#220 (5)); live physics readout and dry run (#58); palette, drag
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
conflicts resolve as position, then facing, then dodging (#40). Prototype v2's "range" (§13j.2) is #38's engagement-range slot and its "facing bow-on / broadside" is #38's facing; #38's position slot (which side of the enemy: bow / flank / stern) is not built.

| Decision in battle | Owner |
|---|---|
| Distance, side of the enemy, movement style, dodging, facing, firing style, when to open fire, default target, power and repair priority, heat response, emission, auto-scan | standing order |
| RCS recoil compensation, point defence target, repair order, reactor containment first, dark fragments, each shot's ammunition type | automatic |
| Which zone to scan, which room to target, which preset | player verb |

**Disabled** (#82, #255): no weapon able to fire for ~10 s, whatever the engine does (`battle.disabledSeconds`; 'able' is defined in §13l.1), or the
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
| Crew | Named, seated at stations, no walking; die per destroyed cell and in proportion to the integrity lost (#182, #206), all at once at critical heat (#18b); last words, then silence; lifesigns; KIA list; memorial wall; permanent death; replacements cost credits (#49–#52, #65, #88) |
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
| L4 Ship vs static target | every capture route reaches Disabled (EMP and surrender at L5, #252); the cascade tree is right |
| L5 Ship vs ship | no dominant build; degenerate builds punished |
| L6 Scaling | T1–T6: square–cube, small rounds vs capital armour |

Each constant is tuned at the lowest level where it acts (#128). Output is
text: time series, a per-second battle log from L4, and **expected (formula)
vs actual, PASS/FAIL** for every scenario; "many runs" means sweeping
initial conditions, since a seed repeats exactly (#129). Accepted risk: the
feel of the real game stays unverified until after L5 (#130); the throwaway
prototypes judge the battle's pace and the levers only (#217).

**Scenario spec** (#144): `id`, `level`, `laws`, `dependsOn`, `setup`,
`run`, `measure`, `expected`, `tolerance`, `criterion`, `locked` (date and
hash), `tunable`. Folders `mission0/scenarios/` and `mission0/results/`;
`MISSION0.md` is the ledger generated from the results. Tunable constants
carry approved `min`–`max` ranges (#145). The 1e-9 relative slack on both bounds of a one-sided window is a float tolerance, not a criterion change; from L2 on no case lands on a whole number of steps unless it tests that (#185 (2), #177).

**Units**: SI throughout the simulation (#163).

**Exit criteria** (#164), all eight required:

| | Criterion |
|---|---|
| E1 | Every L0–L6 scenario PASSes its locked criterion, or is **withdrawn** (#188, #200, #245): for a specification error named in a decision row, or as superseded by a numbered decision that changes a law, a model or a constant (never to escape a failing kernel: a withdrawal needs the row, and an LD row may supersede only what #180 lets the lead designer decide). A withdrawn scenario stays locked; its record **at the time of withdrawal** is kept with whatever verdict it had (PASS or FAIL) and is never re-recorded after; it is listed in `mission0/withdrawn.json` with its decision; a successor that tests the replacement law (or the same law, for a specification error) with the same setup where the law allows it PASSes its own locked criterion. A withdrawn scenario counts through its **chain of successors** to the one that stands, each link locked, no loop, the last recorded PASS (#225 (2)). A **retired** scenario (a withdrawn one whose constants or pure functions were removed from the kernel) is listed in `withdrawn.json` with the removal's decision, not run, its last record frozen, and counted apart, never in E1's pass count (#237 (7), #245) |
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

**L4** (ship versus a static target; #252, #253): planned 2026-10-22, §13l:
one target per capture route (R1, T-neck, T-hot, T-dry), Disabled and
destroyed as kernel rules, the battle loop with time of flight, the
per-second log and the cascade tree; in two passes, L4a (the kernel
obligations) and L4b (the loop and the routes).

**Agentic operation** (#131–#136): parallel within a level, gated between
levels; runner, verifier (independent, re-runs from the command line only),
analyst, integrator (the only writer of `data.js` and the ledger); criteria
locked before running; overrides instead of edits; no conclusion without a
re-runnable command; multi-agent waves only with the lead designer's go-ahead (#180);
agents tune within approved ranges, the lead designer decides criteria and
constants outside them, the owner decides direction and changes to a law (§13b); the feel and phone playtests are never
delegated; the kernel and scenario framework are written first by one
agent; nightly regression.

## 13b. Roles

| Role | Does | Never |
|---|---|---|
| Lead designer | discusses with the owner; keeps `DESIGN.md`, `DECISIONS.md` | reviews its own code |
| Engineer | builds a level as designed; one branch, one PR | changes the design (asks in the PR) |
| Reviewer | reviews a PR against `DESIGN.md` and `CLAUDE.md`; re-runs; comments | edits, approves, merges |
| Physics checker | derives expected results blind, posts them, then compares | sees the answer first |
| Design partner (#247) | the owner's sounding board: discusses, computes with the kernel, writes `IDEAS.md` rows | decides, or touches anything else |

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
| State | Each room stores heat Q (J); its temperature is T = Q / C, absolute, with C = cells × the room type's coupled heat capacity (`thermal.coupled<Class>`, replaced `thermal.heatCapacityPerCell` in physics pass 2, #240, §13k.1). Rooms start at `FIXED.restTemperature` (290 K). Space is at 3 K, taken as 0 |
| Generation | Each room adds the heat its state generates (reactor: heatPerPower × delivered power; beam bay: draw − beam power; shield generator: draw + absorbed; engine: draw × heatFraction; turret: heatPerShot per shot; bridge and quarters: their draw) |
| Radiator | A radiator on a hull segment of a room radiates εσA T⁴ of **that room's** heat (Stefan–Boltzmann, real σ, ε = `FIXED.radiatorEmissivity` = 0.9). Its IR brightness is the same number (#102, #143) |
| Conduction | Between rooms through shared walls: **L2**, not L1 |
| Thresholds | Per room class, three temperatures: **hot** (function degrades: not modelled at L1 beyond the event), **overheated** (the room shuts itself down: no function, no working heat, but a reactor keeps its decay heat, #187; it restarts when T falls below hot), **critical** (the crew in the room die; a magazine cooks off; a reactor melts down) |
| Two classes | **Plant rooms** (reactor, beam bay, shield generator, engine): hot 600 K, overheated 800 K, critical 1000 K. Their temperature is the plant's working temperature; the crew at their stations die when the plant is critical. **Crewed rooms** (bridge, crew quarters, turret, missile bay, empty hold): 330 / 350 / 380 K. **Magazine**: 330 / 350 / 450 K (cook-off). Consequence, measured at L2 (#200, #201): crewed rooms and magazines beside a running reactor stay at 295 K while life support runs (§13d.1) and reach only 318–338 K in 15 minutes without it; a magazine cooks off at 450 K |
| Integration | Explicit Euler at `simStep`; stable while dt × 4εσAT³ / C ≪ 1 (2e-3 at 1000 K with the values below) |
| Invariant (E2, counts for E3 now, #174) | Per room and per run: heat generated = heat radiated + heat stored (+ heat moved, from L2), within max(1e-9 × the largest flow, 1e-10 × the room's heat at the start): the second term is the float resolution of a large stored heat (#219 (4)) |
| Decay heat (#81, #205 (6)) | A SCRAM adds a decay-heat term of `reactor.decayFraction` of the thermal power at SCRAM, decaying with `reactor.decayTime`. Decay heat from earlier shutdowns keeps running after a restart and each new SCRAM adds its own: the terms accumulate (physical, recorded) |
| Magazine detonation (#91, #185 (6)) | Besides cooking off at its critical temperature, a magazine detonates when any of its cells is destroyed while it holds rounds (§5.2) |

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
| Life support (#201) | Each crewed room (bridge, quarters, turret, missile bay) and each magazine keeps its own air cool: while it is powered (the bridge on its backup, #147) and above `FIXED.lifeSupportSetpoint` (295 K), it **pumps** heat out of itself into the coolant rooms sharing a live wall with it, split by wall length, at most `lifeSupport.capacityPerCell` × surviving cells W and never below the setpoint within a step. A heat pump works against the gradient, so it pushes into a hotter coolant room. With no coolant neighbour, or unpowered, it does nothing: the room has only its passive walls and its own radiators. It is ship service, not the room's machinery: it **keeps running while the room is shut down** (overheated or switched off), as long as the room is powered (#205). Under power routing a room counts as powered for life support while it is joined through live walls (through any rooms) to a reactor able to produce (not shut down, not destroyed, demand above 0), whatever its own request: a switched-off or overheated room, or a turret with no rounds, keeps it (#207). The pump's own draw and heat are **deferred**: it draws nothing and adds no heat yet (#205 (3), #207 (1)); an open obligation (§17). Enemy beams that heat the room directly (#138) can overwhelm it; the heat it pumps loads the coolant loop, so a reactor beside crewed rooms runs hotter |
| Power (`js/graph.js`) | Reactors produce up to their output (L1); consumers draw their L1 draw. Power flows through any room (no conduit rooms, #12) along live walls, each with capacity `power.wallCapacity` × L. Consumers are served in **priority order** (the power-priority order of #38; at L2 a list given by the scenario, then room id): each consumer in turn gets the most additional flow the residual network allows (augmenting paths found by breadth-first search in room-id order, so the result is deterministic). A consumer that receives a fraction f of its draw works at f: every rate-like output and its heat × f (a beam at f × power, a turret at f × its fire rate, a shield at f × its budget). The bridge keeps its backup supply (#147); a reactor delivers only what is routed |
| Ammunition | A magazine feeds only rooms that share a live wall with it, no routing through other rooms (#18; magazines must touch the guns they feed, so a bomb sits beside every gun). Each wall carries at most `ammo.wallFeed` × L kg/s of rounds of the consumer's size, in the magazine's loading order. A turret holds a **ready store** of `turret.readyRounds` rounds of its own size (#201 (5), #207); it fires from the store and the feed refills it. Its sustained rate is min(fire rate, feed / round mass) |
| Blast between rooms | An internal explosion of energy E (a magazine or reactor, L1) first fills its own room up to that room's blast capacity B = surviving cells × `matter.blastPerKg` × cell mass (replaced `room.blastResistance` and `hold.blastFactor` in physics pass 2, #240; before: a fixed energy per cell, × a hold factor for a hold; from L4, Σ remaining integrity × that resistance, #216); the excess then spreads as a wave front from the **whole damaged region** (#169, #205): in each round, the excess is split among every unsaturated room touching any saturated room, by shared wall length, each filling up to its capacity; what no room can take escapes to space. Within a room the energy spreads over its cells in proportion to their remaining integrity (#258; 'evenly' while every cell is whole); a cell is destroyed when its share reaches its resistance. Books: absorbed + escaped = E exactly; with every room reached, absorbed = min(E, Σ B), escaped = max(0, E − Σ B) (#184) |
| Shield overlap (#170) | Fields add, each generator paying from its own budget (#99). In each step, a beam at point j asks generator i for a_ij = P_j × B_i g_ij / Σ_k B_k g_kj, capped so that Σ_i a_ij ≤ min(P_j, Σ_i B_i g_ij) (L0 for one generator). If a generator's asks Σ_j a_ij exceed its budget B_i (× its power fraction), every ask to it is scaled by B_i / Σ_j a_ij; the point then absorbs the sum of what it was granted, with no second round in the same step. **No generator ever absorbs more than its budget**: this removes the double counting of #170. Each generator heats by what it pays (L1). How the impulse buffers of overlapping generators share one round is **deferred to L4**, with rounds in overlapping fields (#205 (7), #201 (5)): until then the kernel throws on such a round |
| Shield buffer (E4) | The buffer (`shield.buffer` in joules, k = 3, replaced budget × `shield.bufferSeconds` in physics pass 2, #240) pays the energy of rounds stopped (L0), drains when rounds arrive faster than it refills, and refills at the budget left unused by continuous beams. L2 shows it binding under a salvo; L5 decides whether real salvos ever reach it, or it is cut (#177, E4) |
| Repair sharing (#99, #185 (6)) | A quarters' repair budget is R = `repair.massRate` × surviving fraction (kilograms per second; a cell's integrity rate is R / its mass; replaced `repair.rate` in physics pass 2, #240). A damaged cell j in range asks q_j = R g(r_j) (L1); if Σ q_j > R, every ask is scaled by R / Σ q_j. Overlapping quarters add, each paying its own budget. One cell alone is repaired exactly as at L1 |
| Size rule (#185 (4), #187 (4)) | Per-cell quantities scale with the cell count (L = 9/4 of M): heat capacity, magazine capacity, reactor explosion energy, crew (rounded per cell: 7 per cell at T2 where 6.75 unrounded, 42 in a quarters, #214 (1)). Rate-like quantities scale with the footprint (9/4 of M): power, draw, thrust, budget (L1). Per-round quantities follow the round: an L turret fires rounds of (3/2)³ the M mass at 2/3 the M rate, heat per shot × (3/2)³ |

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
| Shield buffer | Unchanged rule; with the real round, stopping an M round costs 1.71 MJ, so a 10 MJ buffer binds at the **6th** round arriving in one step (the old 0.5 kg round: the 71st), or above 5.9 rounds/s for longer. One M turret fires 0.5/s, so the rule is proven but real salvos may never reach it: E4 for `shield.buffer` (physics pass 2; was budget × `shield.bufferSeconds`) stays open until L5 (#214) |

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
| Destroyed cells | A destroyed cell (integrity 0, D pass) is a hole: it carries no structure, control, power, ammunition or heat (L2), and **resists no round** (a round passes it at no cost; #212) and its mass leaves the ship as **debris** with the velocity of its point (momentum kept; debris as obstacles is L4, #9); **debris takes its share of the room's heat with it**: the cell's share of the heat capacity and of the heat leaves as `vented`, the temperature unchanged (#214 (9), #219 Q6; a heat sink's cell vents its share above rest, #198). A damaged cell keeps its whole mass |
| Structure and fragments (`js/graph.js`) | Surviving cells connect through every edge they share, inside a room and across live walls. When the surviving cells fall into several connected sets, each becomes a fragment: a rigid body with its own mass properties and the parent's velocity field (v of its new centre of mass, the same ω), so mass, momentum, angular momentum and kinetic energy are conserved exactly. A room whose surviving cells fall into two fragments works in the fragment holding most of them (tie: the lower cell index) and **keeps one heat store, in that working fragment**; its other cells are dead weight: they carry mass only, no heat capacity and no flows (#225 (3), #219 Q9) |
| Control (#12, #81, #147) | A room is controlled while a path of live walls joins it to a surviving, working bridge (not shut down, switched on; L1) in its fragment (connectivity only, through any rooms). A room that loses control loses its function (L1 `controlled`): an engine stops, a gun stops firing, a reactor **SCRAMs** (decay heat follows, #81). A fragment without the bridge goes dark; destroying the bridge SCRAMs every reactor (decapitation); an overheated or switched-off bridge gives no control either, so **heat can decapitate** (#185 (6), #189 (3)). The bridge keeps its backup supply. **Regaining control** (`control-restored`, rooms.js): a room that is joined again by live walls to a bridge that gives control works again; the bridge itself regains control when it has surviving cells, is not shut down and is switched on. **A SCRAMmed reactor stays SCRAMmed in today's kernel** (it is not restarted by regaining control); the restart of #82 ("the enemy must restart") is built in physics pass 2 (§13k) At L3 control and structure run over the same live walls, so control is lost only with the bridge or by a split (the "cut the power walls" route of #82 is power, L2) |
| Life support in fragments | §13d.1 as amended by #207: a room keeps life support while joined to a reactor able to produce; a dark fragment's crewed rooms lose it, the bridge keeps it on its backup |
| Validation (`js/layout.js`, #57) | A ship undocks only if: every room connects to the bridge through live walls; every hull room (beam bay, turret, missile bay, engine) has an open edge, and an engine's exhaust face is open with **no cell aft of it** in its rows (clear exhaust); a fitting sits on an open edge of a room that is not inside, at most one per edge (#15); no room overlaps another or leaves the drydock grid (`TIERS` grid). **Inside** (bridge, reactor, magazine, quarters; not the shield generator, #219) means the room carries no fitting; it may touch the hull. Each failure names its rule |
| Readout (#58) | The shipyard's physics readout is computed from the same functions: M, centre of mass, I, acceleration in g with every engine at full throttle (`FIXED.standardGravity`), angular acceleration from every RCS couple, and the heat balance at a stated load against the radiators' capacity at plant hot |

Angular-momentum books (E2 at L3): the residue stays within 1e-9 × the net angular impulse booked + 1e-12 × the gross impulse (a couple fired both ways nets to little; #219 (4), #220 (1)).

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
| Cell matter | A cell on a path is its mass spread over its face: **areal density σ = cell mass / edge²**, iron-equivalent by mass. A heat sink's water counts in σ; a magazine's rounds do not (they weigh on the ship but not on a path: a magazine's σ is 120 kg/m² with or without its 900 kg of rounds), as the kernel has it; a round's own strength uses steel's c, whatever the cell holds. A destroyed cell is a hole: σ = 0 (#212 (5)) |
| Kinetic resistance (#232) | A cell resists **r = c × σ**, with one constant c = `matter.kineticResistance` (m/s), the value of armour steel already calibrated (L0's armour cell: 6.181e5 kg/(m·s) over 400 kg/m², c = 1545.4 m/s). It replaces `armour.kineticResistance` and `room.kineticResistance`. Known simplification, accepted by the owner: thin spaced plates resist a hard round less per kilogram than one thick plate, so light rooms are a little too protective |
| Round damage (#230) | The round takes **the same sectional momentum the cell takes, against its own strength** S = c × ρ_steel × L (L its pristine length: per kilogram of steel, a round is as strong as armour). Its damage f grows by (sectional momentum the cell took) / S; damage **flattens it at constant volume**: A = A₀ / (1 − f), its momentum unchanged by f. At each cell, with s = p / A on entry: if s > r and f + r / S < 1, it passes (the cell takes r, p falls by r·A, f grows by r / S); otherwise it stops there, the cell takes min(s, r), f grows by that / S, capped at 1 (f = 1: the round is **wrecked**; its remaining momentum goes to the ship like a stopped round's). A hole takes nothing and does nothing to the round. Cell losses are the D pass's (#206): a passed cell 1 / `kinetic.hitsToWreck`, the stopping cell (taken / r) / `kinetic.hitsToWreck`. Momentum books: p₀ = Σ r·A over passed cells + the stop's remaining p + p on exit |
| Shield and rounds | The shield slows a round by a field, not by contact: no round damage (unchanged) |
| Tumble | Left out; in `IDEAS.md` with sloped armour (#6), after prototype v2's helm (#230) |
| Beam bay (#234) | **An axis room 2 × N cells** (M; 3 × N for L), N ≥ 2, lying along the ship's axis rows (its rows hold strictly the mean row of the cells of rooms joined to a bridge, and its x-span is at least its y-span; rules `axis` and `bow`, #236) with its bow face open, like the spinal railgun: a linear accelerator. Its particles' kinetic energy is **E = `beam.gradient` × N × edge** (10 MeV/m: a 10 m bay gives 100 MeV, a 40 m bay 400 MeV). Its power, draw and heat are as at L1, whatever N (a longer bay gives the same power at a lower current). R1's 2 × 2 bow beam bay is such a room with N = 2 |
| Beam deposit (#229) | Neutral hydrogen atoms of energy E: inside matter each is a proton; survivors lose energy by the **Bethe formula** (no shell or density correction): dE/dX = K (Z/A) (1/β²) [½ ln(2 mₑc² β²γ² T_max / I²) − β²], T_max = 2 mₑc² β²γ² / (1 + 2γ mₑ/M + (mₑ/M)²), X the areal density crossed, iron (Z/A 0.46557, I 286 eV); a fraction dX / λ_I of the survivors has a **nuclear interaction** (λ_I = 1321 kg/m², iron) and leaves its remaining energy in that cell (a simplification: the real shower spreads forward over about λ_I). Cell i receives the fraction F_i of P; what is left leaves the ship. F is recomputed when a path cell becomes a hole. The gradient (10 MeV/m) and the current (12.5 mA at 5 MW and 400 MeV) are **optimistic by 2–10× against real linacs** (ESS: about 6 MeV/m), inside the ranges; the top of the range, 20 MeV/m, is about 3× the real figure (#236) |
| Beam range (#230) | **No falloff** at battle range: all of P arrives at 0.6–1.5 km. The Gaussian maser falloff (`beam.focusRange`, `FIXED.beamWaistPerHalfCell`) is superseded |
| Beam damage and heat | Cell i loses integrity at P·F_i / (`matter.burnEnergyPerKg` × cell mass) per second (physics pass 2, #240, replaced one `armour.burnEnergy` for any cell: 30 MJ melts about 25 kg of steel, at about 1.2 MJ/kg from rest, an estimate) and is destroyed at 1; P·F_i is heat in cell i's room (#138). The shield absorbs first, at the entry point, as at L2 |
| Not in this pass (done since) | Blast resistance stayed a fixed energy per cell in the path model; physics pass 2 tied it to mass (`matter.blastPerKg`, #240; §13k.1) |
| Kernel | New pure functions in `js/damage.js` (`penetrateRound`, `beamDeposit`); **numerical-method constants, not game numbers** (#236 (5)): `PATH_STEP_MAX`, `PATH_STEP_REL` and `STOP_ENERGY` in `js/damage.js` (the Bethe integrator's step limits and the energy below which a particle leaves its rest in the cell), the Simpson count in `js/field.js`, and the float snaps in `js/rooms.js`; `armour.kineticResistance`, `beam.focusRange` and `FIXED.beamWaistPerHalfCell` were kept marked SUPERSEDED (#236 (1)) and **were removed from `data.js` in prototype v2** (#237 (7)); `fireRound` takes the round's velocity relative to the hull (§4); `fireRound` uses the round rule; a `fireBeam` in `js/rooms.js`; cell masses per type in `js/rooms.js` and `js/layout.js` (the axis beam bay's footprint and validation). The superseded pure functions (`penetrate`, `beamDeliveredFraction`, `burnThrough`) **stay** for the withdrawn scenarios and the prototype |

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
| Helm | three **standing orders** (§8), executed by an autopilot STAND-IN for L4's `helm.js`: **range** close 600 / hold 900 / open 1500 m (the #54 band; thrust along the line of sight into a dead band); **facing** bow-on / broadside; **dodge** off / on (the throttle's sign flipped at seeded random intervals across the line of sight). Conflicts resolve as #40: range, then facing, then dodging; the autopilot holds heading with the RCS against the thrust torque and turns with the couple. Interval, dead band and gains are prototype settings in `proto/config.js`, never game numbers: `proto/config.js` holds prototype settings only (the enemy script, separation, `DISABLED_SECONDS`), and no number that belongs to the game (#217 as read by #237) |
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
| Burn by mass (F1) | A cell on a beam's path loses integrity at P·F_i / (q × cell mass) per second, q = `matter.burnEnergyPerKg` (new, k = 0), calibrated on L0's armour cell (30 MJ / 10 t = **3000 J/kg**); `armour.burnEnergy` is removed. A hold cell is ruined by 9 MJ, a crewed cell by 44 MJ, a reactor cell (150 t) by 450 MJ (90 s of a 5 MW beam; 6 s before this pass) |
| Blast by mass (F3, #240 (6)) | A cell absorbs q_b × cell mass of blast, q_b = `matter.blastPerKg` (new, k = 0), calibrated on armour (1 MJ / 10 t = **100 J/kg**); `armour.blastResistance`, `room.blastResistance` and `hold.blastFactor` are removed (no physics for a free-volume buffer was written; a hold cell absorbs 0.3 MJ, a reactor cell 15 MJ). #18c's "hold as a blast buffer" is lost and recorded as such; the hold keeps its conduction factor (air and bulkheads, passive-wall physics) |
| Heat capacity by coupled mass (F9, #240 (1)) | A room's C = cells × `thermal.coupled<Class>` J/K, one value per room type in 13k.2 (the part that heats on the race's timescale), replacing the single `thermal.heatCapacityPerCell`; a heat sink's water adds as before. Races: reactor alone to overheated **561 s** (61 today), beam bay to hot 165 s (99), engine 868 s (372), shield generator at 6 MW absorbed 496 s (93); the whole-ship races scale with their slowest room (R1's 9 min with shields up becomes roughly 20–40 min: measured by the successor of `L3.ship.heat.v2`). If play then needs faster races, #223's first rung applies (constants within ranges), never the old 1 t value |
| Repair by mass (F13) | Repair restores `repair.massRate` kg/s of a cell's mass (new, k = 0, 200 kg/s = the old rate × an armour cell); `repair.rate` is removed. A third of a hold cell in 5 s, of a crewed cell in 25 s, of a reactor cell in 250 s |
| Books close at the target (F4, F5) | `fireRound` applies the momentum the cells took (Σ impulse) to the body holding them, at the hit cells; the round's lost kinetic energy is heat in the rooms that took momentum, in proportion (1.92 MJ per M hit, about 0.8 K in a four-cell room). Momentum and energy books close between two ships to 1e-9 × gross |
| The shield's books (F16, F17, #240 (2)) | The momentum the field removes from a round (3200 N·s per M round at g = 1) is applied to the body holding the generator, at the generator; the energy stays heat in the generator (as built). For a beam the field removes particles (power), not energy per particle: the survivors' depth is unchanged (stated, F17) |
| Tier-invariant beam depth (F10, #240 (4)) | **As planned**: `beam.gradient` scales with k = −0.41 so that a bay of N cells reaches the same depth in cells at every tier. **Found false at the first run** (#248): the power law holds the N = 2 depth only within 2.2 % (T4), and no exponent holds a deep bay, because the nuclear interaction length is a constant of nature (1321 kg/m²) while a cell's areal density grows with the tier: at T6 an N = 8 bay leaves 88 % of its energy in the first cell against 43 % at T1 (measured 0.882 / 0.431). S6 is withdrawn as the lead designer's specification error. **The rule now (#249)**: a bay of N cells at any tier fires the energy whose CSDA range in iron, in armour cells of that tier, equals the T1 bay's (`beamEnergy` solves it by bisection on `csdaRange` to 1e-12; `beam.gradient` keeps its T1 meaning, k = 0); the deposit profile's drift from nuclear interactions is real and reported. Successor `L0.beam.tier.v2`: CSDA depth identical T1–T6 within 1e-9 for N = 2 and 8; the first-cell fractions printed |
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
| `thermal.coupledReactor` (new) | 5.5 MJ/K per cell | 2–20 | 3 | a 50 MW_th PWR's primary water (0.09 t/MW_th, 4.5 t, 19 MJ/K) and vessel steel (0.12 t/MW, 6 t, 2.7 MJ/K) over four cells; an estimate scaled from a 3400 MW_th plant |
| `thermal.coupledBeamBay` | 1.0 MJ/K | 0.5–3 | 3 | 2.5 t of accelerator per cell at 400 J/(kg·K) |
| `thermal.coupledEngine` | 1.4 MJ/K | 0.5–4 | 3 | 3.1 t of machinery at 450 J/(kg·K) |
| `thermal.coupledShieldGenerator` | 3.2 MJ/K | 1–6 | 3 | 7 t of machinery at 450 J/(kg·K); no real analogue (#202) |
| `thermal.coupledCrewed` (bridge, quarters, turret, missile bay) | 0.6 MJ/K | 0.2–2 | 3 | today's value kept: air (0.15 MJ/K) and fittings; no source found |
| `thermal.coupledMagazine` | 0.6 MJ/K | 0.2–2 | 3 | 900 kg of rounds (0.4 MJ/K) and racks |
| `thermal.coupledHold`, `thermal.coupledHeatSink` (base) | 1.35 MJ/K | 0.5–3 | 3 | 3 t of structure, nothing else; the heat sink's water adds as before |
| `thermal.coupledArmour`, `thermal.coupledRailgun` | 4.5 MJ/K | 2–8 | 3 | 10 t of steel |
| `thermal.heatCapacityPerCell`, `armour.burnEnergy`, `armour.blastResistance`, `room.blastResistance`, `hold.blastFactor`, `repair.rate`, `shield.bufferSeconds` | removed | — | — | replaced above |
| `repair.massRate` (new) | 200 kg/s | 50–1000 | 0 | the old 0.02/s on a 10 t cell |
| `shield.buffer` (new) | 1e7 J | 2e6–4e7 | 3 | today's budget × 1 s at T1 |
| `beam.gradient` | 10 MeV/m | 5–20 | **0** (#249; the plan's −0.41 was withdrawn, #248) | the T1 gradient; the energy at a tier is solved so the CSDA depth in armour cells equals T1's |
| `engine.machineryMass` (new) | 2.7e3 kg per cell | 1.5e3–6e3 | 2 | F-1 vacuum 7.77 MN / 8.4 t |
| `beambay.machineryMass` (new) | 2.5e3 kg per cell | 1e3–6e3 | 1 | 1 t of accelerator per metre (#235's estimate) |
| `cellMass.engine`, `cellMass.beamBay` | derived (structure + machinery) | — | — | F11 |
| `cellMass.reactor` | 1.5e5 kg | 1.0e5–2.0e5 | 3 | 1130 t / (π 5² × 12 m) = 1200 kg/m³ (F24) |
| `rcs.mass` | 200 kg | 50–1000 | **2** | a thruster scales with its force (F11) |
| `reactor.restartTime` (new) | 60 s | 30–300 | 0 | naval reactors restart in minutes (an estimate; big PWRs take hours for xenon) |
| `battle.cullDistance` (new) | 3000 m | 1000–10 000 | 1 | twice the band (#54) |
| `battle.disabledSeconds` (new) | 10 s | 3–30 | 0 | #82 |

### 13k.3 Estimates (T1; `node tools/estimates/pass2.mjs`)

- Burn: hold 1.8 s, engine 3.4 s, beam bay 3.3 s, armour 6 s, crewed 8.9 s, reactor 90 s of a 5 MW beam at contact (the first version quoted the old 6.1 t and 125 t cells, #248).
- Blast absorbed per cell: hold 0.30 MJ (2.0 before), crewed 1.48, reactor 15, armour 1.0.
- Heat: reactor alone 561 s, beam bay 165 s, engine 868 s, shield generator 496 s (one-sided, no radiators).
- Repair of a third of a cell: hold 5 s, crewed 25 s, reactor 250 s.
- Books: 4800 N·s and 1.92 MJ per M hit; 3200 N·s and 1.71 MJ per M round at g = 1 through the shield.
- Tier: 5.86 M rounds per buffer at every tier (measured exactly). N = 2 depth 0.282 cells at every tier was the plan's claim; measured drift 1.2–2.2 % (T2–T6), and −21 % for N = 8 at T6 (#248).
- Masses: engine cell 5.7 t (6.1), reactor cell 150 t (125); R1 **950.5 t, 1.61 g**, 90° in 3.80 s, −0.0499 °/s per M shot (measured; the heat sink's water adds 2.9 t).

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
| S16 | successors | every L1–L3 heat scenario whose expected value used the old heat capacity (removed), `L3.ship.heat.v2`, the blast and burn scenarios, `L3.mass.props.v4`, `L3.thrust.v4`, `L3.rcs.turn.v4` | identical except the new constants; the engineer lists the real set |
| S17 | `L3.control.rules` (scenario audit Q6-1) | a turret, a shield generator, a reactor and a beam bay each with and without a working bridge; control lost and regained | fires / absorbs / delivers / beams only under control; the `control-lost` and `control-restored` events; thrust applied at the exhaust (a torque appears on R1; it does not when applied at the centre of mass) |
| S18 | `L2.power.fraction` (Q6-2) | a turret, a shield generator, a quarters and a repair party each supplied half their draw | output = fraction × full (draw, budget, life support, repair) within 1e-9; `powered` false at fraction 0 |
| S19 | `L2.layout.invalid` (Q6-3) | overlapping rooms, a room off the grid, a bad rotation, a non-integer cell, each fitting rule | each throws or reports its named rule; a valid layout does not |
| S20 | `L3.r1.pinned` (Q6-4) | R1 at T1 | measured mass, acceleration, 90° turn and recoil per shot against literals computed by `tools/estimates/pass2.mjs` and quoted in the criterion (1e-6): a changed constant fails it, not only the data hash |
| S21 | `L0.kinetic.flatten` (Q6-5) | an M round that stops in a cell | the stop takes min(s, r) with the flattened area; the wrecked round's momentum goes to the ship; literals hand-worked in the criterion (p₀, A₀, S, r, f after cell 1), not an own loop |
| S22 | anchors (Q2) | `L0.beam.pstar` (S12) extended with iron at 200 MeV against the PSTAR table (cited); `L0.kinetic.penetration.v3`'s claim row cites De Marre for 100–150 mm (#236) as a bound, not a formula | within 1 % (PSTAR); the model's 11 cm inside the cited 100–150 mm |

**Conventions from the scenario audit** (`audit/2026-10-21-scenarios.md`, #244): a closed form against the kernel's loop is checked at **1e-12** (float residue 1e-16–1e-13), not 1e-9; a time on the step grid is checked one-sided in [t, t + dt); a check that compares two fields of the same kernel log, or `heat === energy` where the kernel assigns one to the other, is labelled a consistency invariant and never counts towards E3; an `expected()` that re-implements a kernel rule says so ("re-statement") and carries at least one hand-worked literal; no new scenario reads `ctx.scaled` for its expected value where a literal would do; a timed case is placed **off the step grid** (its expected time not a whole number of steps), so the window tells step n from n + 1 (checker N1, #248); a copied successor re-derives its time windows and literals on the new timescale (#248). Locked scenarios are not edited; the conventions apply from S1 on.

### 13k.5 Process and cost

One engineer session (opus) on `m0/pass2` with the whole of §13k in its first message; the physics checker (sonnet, blind, from the lock, in parallel with the first canonical run, #241 (1)); the reviewer (sonnet). The lead designer merges with no blocking finding. Estimated cost: raw 20–25 USD, **with #241's ×2.5: 50–60 USD**; the owner is told when it passes 40 (#191).

### 13k.6 Checklist (#241 (1))

- [x] Every number above is printed by `tools/estimates/pass2.mjs` from the kernel at `8392126` (**with the old masses in `data.js`: three numbers were stale, corrected above; a plan's script must carry the planned values as overrides, #248**).
- [x] Estimates switch on every passed level's rules: the one-room races are one-sided with no radiator (as their L1 rows); the ship race is measured, not estimated.
- [x] Tolerances: S1 in [t, t + dt) (the step); S6 2 % (**the fit's error was never printed: the script printed the bisection factor, not the power law's error; 0.3 % was asserted, not computed — the gate's first failure, #248**); S5/S14 1e-9 × gross (the L3 scale, #220); S7 1e-6 (a ratio of two scaled constants).
- [x] Hardware sense-checked: the F-1 in vacuum (925 N/kg); the compartment's density (1200 kg/m³); PWR primary water per MW_th (an estimate scaled from a 3400 MW_th plant: the weakest number here, range 2–20).
- [ ] Open: the crewed rooms' coupled C has no source (kept at today's value); a real linac does not scale with the tier (a stylisation, written in §5.4).

## 13l. L4 plan: ship versus a static target (#252, #253, #255, #256)

L4 proves #127's level: **every capture route reaches Disabled and the
cascade tree is right**, on a target that does not manoeuvre. The owner
chose (#252) one target layout per route that R1 cannot show, and moved
the two routes that need L5 mechanics (EMP needs a warhead, surrender an
enemy's personality) to L5. Built in two passes, each its own branch and
pull request: **L4a** (the kernel obligations of §17 due now, and armour
on walls, #255, #256) then **L4b**
(the battle loop and the routes), L4b on L4a merged. Every number below is
printed by `node tools/estimates/l4.mjs` (#241 (1)); the checklist is
§13l.6.

### 13l.1 Rules

| Rule | Statement |
|---|---|
| Battle (`js/battle.js`, L4b) | Two ship worlds in one frame: an **attacker** and a **static target** (no helm: it holds its heading on its RCS and never thrusts; it fires only when its case says so). Rounds are kernel objects with a time of flight: launched by a turret, moved each step, tested against the target's hull along their segment; the cells a round's line crosses, in order, with the chord rule (#239), make its path; `shieldRound` at the hull entry point, then `fireRound` with the round's velocity **relative to the hull** (#242). A beam hits along the firing bay's axis line at once (#230). The loop calls `cull()` every step (§17 item 26). No `Math.random`; one seed per battle (#7); `helm.js` waits for L5 |
| Placement of the attacker | at rest, 900 m from the target's centre of mass on a bearing the case names, bow-on to it (the #54 band; the beam is spinal, #234; the 900 m is a default of `createBattle` until L5's helm gives the opening range a constant, #267); its turret aims at **the centre of the target room's first surviving cell** (cell-index order; static: no lead): a room's centre is a grid vertex, so a line through it would cross two of its four cells and the route would stall (#267; the engineer and the blind checker found it alike); the spinal beam needs the bay's axis through the aim point, so a constant-free time-optimal heading controller turns the attacker there and holds both ships' headings (a stand-in for L5's `helm.js`) |
| Able to fight (Disabled, #82 as amended by #255) | A weapon room is **able** while it is not destroyed, is controlled, is not shut down, is active, and is joined through live walls to a reactor that can produce (controlled, not SCRAMmed, not shut down, not destroyed); a turret also needs a round in its ready store or **a magazine with rounds sharing a live wall with it** (the wall its feed crosses, `feedAmmo`; not any room path: a turret cut off from its magazine by a destroyed wall runs dry, B13, #267). The event that takes a ship's last able weapon is the one named by the **first failing condition of that rule in its order** (destroyed, control, shut down, active, power, ammunition): Disabled's parent in the cascade tree (#267). A ship with **no able weapon** for `battle.disabledSeconds` (10 s) is **Disabled**, whether or not its engine works (#255: a ship that cannot fire is a prize however it flies): the battle ends, the ship is captured, and the loot is what is left (#83) |
| Armour on walls (#255, #256, L4a) | Armour (#15) is a steel plate of thickness d on a **hull edge segment or a shared wall segment** (one edge of one cell). A path that crosses the segment meets σ = d × `FIXED.steelDensity` once, with the chord rule (#239), before the next cell; the plate resists a round as a cell does (r = c σ chord), loses 1 / `kinetic.hitsToWreck` per round that passes it and becomes a hole at 0; a beam deposits in it (beamDeposit with σ), that heat goes to the room it is mounted on, and it **burns by the one law** like a cell: it loses P F dt / (`matter.burnEnergyPerKg` × its mass) of its integrity per step (#240 (1), #258; a 0.2 m plate lasts 23.5 s under a 5 MW beam). A line crossing a plate at an angle θ to its normal meets **σ / cos θ** (the line-of-sight thickness), capped at the cell's edge length of steel (cos θ ≥ d / edge) (#258); ricochet and tumble stay out (#6). A residue of integrity at or below 1e-12 counts as 0 (the snap `damageCell` uses; #260): a 0.2 m plate under a 5 MW beam is a hole in step 1413 exactly. The plate's steel **adds its heat capacity to its room's** (its mass × `thermal.coupledArmour` / `armour.cellMass`, 450 J/(kg·K), #258), the consumer `thermal.coupledArmour` lacked (#248 Q13). A plate belongs to the room it is mounted on and leaves with that cell; when another cell of its room is destroyed, the plate's steel stays with the room and only the cell's own share of the heat leaves (#260). In a **cluster** (L2, no ship) a destroyed cell keeps its heat capacity and heat; in a **ship**, and in a heat sink, the cell's share leaves with it as debris (#198, #219 Q6; stated here for both, #260). Its mass, d × steel density × edge × edge (the segment's area: edge long, one cell high), joins the body of the room it is mounted on (centre, inertia) and leaves as debris when it is wrecked. **Only walls carry plates, never decks**: the model is 2D and no path crosses a floor or a ceiling, so a deck plate would be mass that nothing in the model can meet (#256). Thickness `armour.plateThickness` (new, 0.2 m, 0.01–0.4, k = 1) |
| Destroyed (#83) | A reactor's or a magazine's **explosion** ends the battle with the ship destroyed (checked before Disabled in the same step). **Too many pieces**: the ship is also destroyed when its largest fragment holds less than `battle.wreckFraction` (new, 0.5 of the ship's mass at undock, 0.3–0.8, k = 0) |
| Per-second log (#129) | One line per whole second of battle time per ship: position, heading, velocity, each room's mean integrity, temperature, power fraction and state (controlled, shut down, SCRAMmed); and every event since the last line with its cause. `node tools/battle.js <case>` prints it; its hash is the battle's (E2: same seed and inputs → same hash) |
| Cascade tree (#41) | Every event carries a cause that is either a **root** (a shot id, a beam id, `heat`, `launch`) or the id of an earlier event of the same battle (`explosion:magazine` already has this form; L4b gives every event an id and every derived event its parent's id). The tree is printed with the log; an event whose cause is neither is an error |
| Crew capacity (#60, #220 (5), §17 item 9) | A build-time rule in `validateShip`: the crew the rooms require (Σ `crewRequired` of every crewed room) must not exceed the berths of the quarters (cells × `quarters.crewPerCell`). R1 needs 20 and has 18 berths: `quarters.crewPerCell` 3 → **4** (inside its approved 1–8; 6 m² of a 25 m² cell per sleeper, a warship's berthing) gives 24. The kernel's crew counts are otherwise unchanged |
| Blast capacity from remaining integrity (#216 (3), §17 item 8, L4a) | A room's blast capacity is Σ over its surviving cells of integrity × `matter.blastPerKg` × cell mass (today: surviving cells × the same, ignoring damage). A damaged room absorbs less and passes more |
| Rounds in overlapping fields (#205 (7), F18, §17 item 12, L4a) | The round meets the summed strength g = min(1, Σ g_i) and the summed buffers; the energy the field removes is charged to each generator in proportion to its buffer × g_i (the beam rule of §13d.1); no generator pays more than its buffer (the shortfall is solved once more with what was paid, no third round); each generator's ship takes the impulse of its share, at the generator. With generators on different bodies, each share's books use **its own body's hull velocity at the round's point** (the round's velocity relative to that hull, #242): the heats are then each Galilean-invariant, and their sum is not one world-frame energy loss (#258 (11), #260); the ship's gain includes its spin, J²/2M + L²/2I. The kernel stops throwing on such a round |
| Kernel fixes (L4a) | `shieldRound`'s heat books the ship's kinetic-energy gain J²/2M like `fireRound` (§17 item 25, one rule for both); `csdaRange`'s last step ends exactly at the stop energy, so the range is continuous in energy (§17 item 27); a reactor meltdown case from about 960 K at the coupled heat capacity (§17 item 22) |
| Pace after armour (#255) | When L4a merges, the lead designer re-measures pace with `tools/estimates/pace.mjs` on R1c with the real plate mass, bow-on and broadside, under #255's Disabled, and reports to the owner before L4b is locked. `proto/battle.js` gets plates on its paths and R1c in L4a (a prototype change; §17 item 28's smoke-test race is fixed with it) |
| Tools (L4a, #257) | `tools/mutate.js`: `--jobs 0` and negatives rejected (reviewer 1); the report's header says CHANGED means an output moved, not that a criterion noticed (reviewer 4); mutations for the `beamPaths` clearing and `csdaRange`'s material (reviewer 5); `recordHash` described as the record as it stood when the hash was added (reviewer 3). L4a's pull request runs `tools/mutate.js` once on its head (#246 (1)) |
| Prototype (L4b, #264) | `proto/` runs on L4b's kernel: R1d is the default layout; the end panel shows the **cascade tree** of the battle (B8's tree, from the kernel's events: the root shot or beam, then each event it caused, indented; the KIA list stays first, #41), so the owner reads why a battle ended without the replay; `proto/measure.mjs` judges the end by the kernel's Disabled rule (#255) |
| Shipyard readout (#225 (5), §17 item 10, L4a) | `readout` on a blueprint before `enableShip` gives the same mass, centre and inertia as after it |
| Moved to L5 (this plan, #253) | the EMP and surrender routes (#252); debris as an obstacle to shots (#9); magazines lasting a 3–6 minute battle (#92, needs both ships firing); life support's own draw and heat (§17 item 14: no L4 route depends on it); the outside blast field (§17 item 5) |

### 13l.2 Targets

Each target is validated by `validateShip` (with the crew rule) and stated
in `mission0/targets.js` (L4b), read by the scenarios and the estimate
script. R1 is §13f.2's.

| Target | Layout (T1, cells [x0, x1) × [y0, y1)) | Route it shows |
|---|---|---|
| R1 | §13f.2 | decapitation (its bridge is open from −y), mission kill; the magazine and the reactor as **kill** routes (destroyed) |
| R1c (#256) | R1 with plates of `armour.plateThickness` on the 8 wall segments around its magazine (a citadel: 314 t at 0.2 m; R1c 1264.5 t, 1.21 g at T1) | the pace measure (#255, #260); R1 stays as it is for every locked scenario |
| **R1d** (#261, the owner's pace lever) | R1c plus five plates around its turret: the four hull segments (8,5)+y, (9,5)+y, (9,4)+x, (9,5)+x and its wall to the beam bay (9,4)−y; 1 460 784.06 kg, **1.047 g**, centre (30.685, 17.248) m, I 2.707267e8 kg·m² (`tools/estimates/l4.mjs`) | **the reference ship of L4b and of the prototype**: the kill routes through a citadel (B6), the mission kill against a plated turret (B2), the pace measure. A note for L5: against a deliberate shot on a static R1d the citadel is **five M rounds thick** (a stopped round still costs the plate 0.215 of its integrity), so the magazine kill moves from 6 s to 18 s by rounds and 29.5 s by beam; in duels it held because no script aims at it. Thickness within its range (0.01–0.4 m) is the lever if that is too thin |
| T-neck | engine [0,3)×[2,4) rotated 90°, reactor [3,5)×[2,4), shield generator [3,5)×[0,2), heat sink [3,5)×[4,6), **hold [5,7)×[2,4)** (the neck, open from −y and +y), bridge [7,9)×[2,4), magazine [9,11)×[2,4), beam bay [11,13)×[2,4), quarters [7,10)×[4,6), turret [10,12)×[4,6) | **split at a choke point** and **cut the power walls**: one cut through the neck leaves the bridge half without a reactor (no power) and the reactor half without a bridge (SCRAM). In this kernel the two routes of #82 are one mechanism, since power, control and structure share the live walls (#192): stated, not a defect |
| T-gun | R1 with its beam bay replaced by a hold (the turret its only weapon, a crewed room with low heat thresholds, #182) | **overheat**: the beam held on the turret shuts it down by heat before it is ruined; **run it dry**: it fires its turret broadside until the ready store and the magazine are empty (#91). Under #255 the engine does not count, so one layout shows both |

### 13l.3 Estimates (T1; `node tools/estimates/l4.mjs`)

The script models the attacker as a fire schedule along axis-aligned lines
(one M round every 2 s, a 5 MW beam), with no time of flight; the
scenarios use the battle loop, so their times sit within a time of flight
(1.125 s at 900 m) and a step of these.

- R1, decapitation: rounds into the bridge's columns from −y, every weapon and the engine lost at 22.0 s, **Disabled 32.0 s** (12 shots; the bridge and 0.11 of the quarters); the beam 32.9 s; rounds with the shield on 48.0 s.
- R1, mission kill (beam bay and turret, #255): rounds 36.0 s (18 shots), beam 44.2 s, both 23.1 s; rooms wrecked: those two only.
- R1, kill routes: rounds into the reactor breach it at 82 s, **destroyed** at 92 s; the beam 222 s; rounds through the hold into the magazine: **destroyed at 6.0 s** (4 shots).
- T-neck: rounds into the neck's column 5: split at 6.0 s, **Disabled 16.0 s** (3 shots; no crew lost); the naive order (beam bay first) is not Disabled in 120 s.
- T-gun, overheat: the beam on the turret's rows from +x: turret shut down by heat at 22.7 s with **0.17** of its integrity left, Disabled 32.7 s. Heat wins over burn in a crewed room only narrowly (burn 44 MJ per cell against 33 MJ per cell to overheated): reported, a #223 rung-1 question for L5, not a criterion.
- T-gun, run dry: 154 rounds (4 ready + 150 in a full HE magazine) at 0.5/s: the last at 306.0 s, **Disabled 316.0 s** ((n − 1) / rate + dt + 10 s).
- R1d (kernel at `5a837af`): decapitation 32.0 s (its bridge is open as R1's); magazine through the hold and one plate: rounds **18.0 s** (10 shots: five into the plate, three into the first cell, the explosion), beam 29.5 s; mission kill (beam bay, then the plated turret): rounds 46.0 s, beam 67.8 s; reactor 92.0 s (unchanged).
- Pace (for L5's E7, not an L4 criterion): against a target that neither moves nor fires back, a capture takes 16–86 s and a kill 6–222 s.

**Pace measured after L4a** (#260; `node tools/estimates/pace.mjs --layout R1|R1C --facing bow|broadside`, kernel at `2e265ae`, Disabled by #255, 10 seeds, median seconds at 600 / 900 / 1500 m): R1 bow-on 25 / 7 / 114, broadside 54 / 34 / 100, nearly every end a magazine; **R1c** bow-on 55 / 59 / 107, broadside 65 / 65 / 144, every end a capture with the magazine intact; the beam bay (4 light cells, bow face open) is lost at 15–37 s on both sides, then the turret. Levers within the approved ranges on R1c, broadside: `kinetic.hitsToWreck` 5: 149 / 204 / 248; 8: 332 / 354 / 466 (bow-on 227 / 227 / 302 with stalemates); `turret.fireRate` 0.25: 225 / 217 / 400. A layout lever, **R1d** (R1c plus five plates around the turret: its four hull segments and its wall to the beam bay; 1460.8 t, 1.05 g; an estimate in the prototype's scratch copy, not committed): bow-on 139 / 131 / 210, broadside **215 / 244 / 306**. Hit rates 85–100 % throughout. Put to the owner (the frame of #260).

### 13l.4 Scenarios

Each locked in a commit of its own before its first canonical run, under
§13k.4's conventions (closed forms at 1e-12; timed cases off the step grid
and one-sided in [t, t + dt); consistency invariants labelled and never
counted for E3; re-statements declared with a hand-worked literal).

| # | Pass | Name | Setup | Expected and criterion |
|---|---|---|---|---|
| A1 | L4a | `L2.blast.integrity` | a magazine blast beside a hold at full integrity and at 1/3 | capacity Σ integrity × q_b × m (hand-worked literal); the damaged hold absorbs 1/3 and passes the rest; books within 1e-9 |
| A2 | L4a | `L2.shield.overlap.round` | an M round at a point inside two fields (g = 0.6 and 0.5), buffers full, then one buffer nearly empty | strength min(1, 1.1); shares ∝ buffer × g; no generator pays past its buffer; impulse to each generator's ship ∝ its share; books 1e-9 |
| A3 | L4a | `L3.shield.energy` | an M round stopped by R1's field, R1 free | generator heat = the round's lost kinetic energy − R1's kinetic-energy gain, within 1e-12 relative of the hand-worked value |
| A4 | L4a | `L0.beam.csda.continuous` | `csdaRange` across 1000 energies around each step-count change at 10–400 MeV | no jump above 1e-12 relative between neighbours |
| A5 | L4a | `L1.reactor.meltdown.coupled` | a reactor alone held near 960 K at the coupled C | meltdown at the time t = C ΔT / P off the step grid, one-sided |
| A6 | L4a | `L4.readout.blueprint` | R1's readout before and after `enableShip` | mass, centre, inertia equal within 1e-12 |
| A7 | L4a | `L4.crew.capacity` | R1 at crewPerCell 3 and 4; a ship with no quarters | 3: rejected (20 > 18); 4: valid; no quarters: rejected |
| A8 | L4a | survivors of `tools/mutate.js` (`mission0/mutations/2026-10-22-b7c4290.txt`, #257) that L4a's rules touch or that #257 names: `k1.chord.beamIgnored`, `k1.deposit.damageFirst`, `f1.ctl.bridgeShutdown`, `f1.thrust.atCentre` (an engine whose exhaust centre is off its room centre's row), `e1.rep.crewBack`, `d1.shov.bufferOverlapAllowed` (A2), `f1.dest.damagedLosesMass`, `d1.cond.secondOrder` (a closed form that pins explicit Euler) | one scenario or case each; `node tools/mutate.js --only <ids>` reports each KILLED on the L4a head; the bridge switched off emits its own `control-lost` with cause `off` (#257 Q2, a kernel fault) |
| A9 | L4a | `L0.armour.plate` | an M round and a 5 MW beam across a plate of 0.2 m on a hold wall, at chord 1 and 1/√2; three rounds | σ = 1570 kg/m² (hand-worked); the round after the plate by the round rule with r = c σ chord; the plate a hole after `hitsToWreck` passing rounds; the beam's deposit in the plate as heat in its room |
| A10 | L4a | `L3.r1c.props` | R1c at T1 | mass 1 264 534 kg (R1's literal + 314 000 kg), 1.21 g, centre and inertia by the plates' segment centres; literals from `tools/estimates/l4.mjs` |
| A11 | L4b (moved, #258) | `L4.disabled.rule` | a ship whose weapons are all lost with its engine working; one with a turret left and no engine | Disabled after 10 s; not Disabled (#255) |
| B1 | L4b | `L4.route.decapitate` | R1, attacker on bearing −y, rounds at the bridge | Disabled exactly `battle.disabledSeconds` / dt steps after the step in which the bridge's last cell is destroyed (a count of steps); that step itself against the scenario's own count of shots and hits; no explosion; cause root a shot |
| B2 | L4b | `L4.route.missionKill` | R1, beam bay then turret | Disabled with the engine working (#255); wrecked rooms exactly those two plus what the paths crossed |
| B3 | L4b | `L4.route.split` | T-neck, rounds at the neck; the naive order | split: two bodies, momentum within 1e-9 × gross, Disabled at t_split + 10 s; naive: not Disabled in 120 s |
| B4 | L4b | `L4.route.overheat` | T-gun, the beam on the turret | the turret's ability lost by `shutdown` (cause `heat`), not destruction; Disabled |
| B5 | L4b | `L4.route.dry` | T-gun firing broadside, nobody shooting | Disabled at step (n − 1) / (rate dt) + 1 + 10 / dt exactly, n = ready + magazine rounds (literal 316.02 s at T1: a count of steps, discrete by nature, so exact rather than off the grid) |
| B6 | L4b | `L4.kill.magazine`, `L4.kill.reactor` | R1, rounds into the magazine; into the reactor; **R1d**, rounds into the magazine through its citadel, and the beam | destroyed (not Disabled) at the explosion's step; breach countdown 10 s for the reactor; R1d: the shot count to the first magazine cell destroyed (literal 10: the two hold cells, repaired between shots, go at shot 4, the plate at shot 6, the magazine's first cell at shot 10; the plan's "five stopped rounds, then three" omitted the hold and the repair, #267) and the beam's time in [t, t + dt) by the scenario's own stepped sum |
| B7 | L4b | `L4.kill.pieces` | a target cut into fragments so the largest holds 0.45 / 0.55 of the mass | destroyed / not destroyed |
| B8 | L4b | `L4.cascade` | B1 and B6 | every event's cause resolves to a root; B1's tree: shot → cell-destroyed (bridge) → control-lost (each room), with scram under the reactor's control-lost and Disabled under the turret's (the able rule's order, #267) |
| B9 | L4b | `L4.log` | B1 twice | one log line per whole second per ship; the two runs' hashes equal (E2) |
| B10 | L4b | `L4.relative` | the target drifting away at 100 m/s along the line | `fireRound` receives 700 m/s (#242); the penetration of a 700 m/s round |
| B11 | L4b | `L4.cull` | a round that misses the static target | removed beyond 3000 m from every body; momentum booked `left`; books close |
| B12 | L4b | `L4.e8` | B1 at T1 | mean wall time per step under 1 ms in Node (E8, #213), printed with the machine; T6 at L6 |
| B13 | L4b | `L4.disabled.rule` (A11 moved, #258) | a ship whose weapons are all lost with its engine working; one with a turret left and no engine; one whose only magazine is cut off from its turret by a destroyed wall | Disabled after 10 s; not Disabled; Disabled once the ready store is empty (#255) |
| B14 | L4b | `L2.plate.vent` (the survivor `l4f.plate.cellVentsPlate`, #260) | a heat sink carrying a 0.2 m plate loses a cell that is not the mount | capacity 3.79125e7 J/K after (hand-worked: 4 × 2.7e7 − 2.7e7 + 1.7663e7), not 3.34969e7; the heat vented is the cell's share only |
| B15 | L4b | `L3.shield.nobody` | `shieldRound` when the generator's body is not among the ship's bodies (a fragment removed by culling) | the old fallback: the whole energy as the generator's heat, no impulse (re-review NB2, #260) |

### 13l.5 Process and cost

L4a: one engineer session (opus) on `m0/l4a` from `main`, then the
physics checker (blind, from the lock; sonnet) and the reviewer (sonnet).
L4b: one engineer session (opus) on `m0/l4b` from `main` (L4a merged at
`2e265ae`), the blind physics checker from the lock for B3, B5, B6, B10,
B11, B13–B15 (the loop's physics; #241 (4)), the reviewer. Raw estimate:
L4b 18–25 USD (a battle loop is a kind of work not done before in the
kernel); with #246 (4)'s ×4: **70–100 USD**. The record so far: pass 2
raw 20–25 → 42.9; `tools/mutate` 7–11 → 7.9; L4a 15–22 → ≥ 17.6, so two
of the last three passes landed within 1.5× and the factor is probably
high (#262). L4a cost ≥ 17.57 USD against 45–70.
Pass 2 cost 42.93 against 50–60 estimated. The owner is told before each
pass starts (#191: past 40 USD).

### 13l.6 Checklist (#241 (1))

- [x] Every number in 13l.3 is printed by `tools/estimates/l4.mjs` from the kernel at `47a1696` (the plan) and re-printed at `5a837af` after L4a (the R1d rows; crew 44 with four berths per cell, the L4a routes unchanged to the step). `battle.wreckFraction` is new and not reached by any estimate.
- [x] Every passed rule on: routing, control and SCRAM, breach and detonation, blast through walls, fragments, life support, the shield's buffer (decapitation with the shield on), heat thresholds; the attacker's time of flight is off (stated, 1.125 s).
- [x] Tolerances: timed cases one-sided in [t, t + dt) off the grid; books 1e-9 × gross (#220); closed forms 1e-12; A4's 1e-12 against `csdaRange`'s own step error is the fix's claim, measured by the scenario.
- [x] Hardware: 4 berths per cell (6 m² each) against warship berthing; the neck is a 2 × 2 hold (10 m wide, 3 t per cell).
- [ ] Open: overheat against burn in crewed rooms is narrow (0.17 integrity left): reported for L5's tuning; T-gun's case is a criterion on the cause of the last lost ability, not on how much is left. The citadel is five rounds thick against a deliberate shot (13l.2): a fact for L5, not an L4b criterion.

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

## 17. Open obligations

Open questions and obligations that decisions leave to a later level or pass.
Each line names its decision and when it is due; a closed one is removed.

1. **Chapter design** waits for Mission 0 (#125). Due: after Mission 0.
2. Player-facing names of factions and named ships (current names are
   working names; #160, #161). Due: with the content.
3. Economy prices: measured with `tools/campaign.js` (#126–#129). Due: after
   Mission 0.
4. A store and trademark check of the title (#162). Due: before any public
   release.
5. What carries a blast's impulse at a distance in vacuum: fragments and
   debris, not a shockwave (#46, #141, #169); nothing in the kernel
   implements an outside field. Due: L5 (#253).
6. E4 for the shield buffer (`shield.buffer` since physics pass 2, was `shield.bufferSeconds`): the D pass proves the rule, not that real
   salvos reach it (#214 (8)). Due: judged at L5.
7. E4 for recoil: kept in the physics, cut if it has no measured effect
   (#203 (C)). Due: judged at L5.
11. A culling rule for debris and rounds in flight (#222 (7)). Built in pass 2 (`cull`); the loop calls it in L4b (item 26).
14. Life support's own draw and heat (#205 (3), #207 (1): promised for L3,
    not built). Due: L5 (the L4 plan moved it, #253: no L4 route depends on it).
24. The PSTAR iron CSDA value at 200 MeV, cited, for S22's iron row (#248
    Q5). Due: when someone can reach NIST.
26. `cull()` is called by the kernel's consumer, not by `step()`; a
    consumer that never calls it keeps rounds forever (PR #54 reviewer 9).
    Due: L4b's battle loop calls it (§13l.1, B11).
31. Bow-on duels with plated turrets stall (4–7 of 10 at 900 s in the pace
    measure, #260): suspected in the prototype's Fire / Cool script, not the
    kernel. Due: read at L4b (the loop's log shows what each ship does).
32. The citadel is five M rounds thick against a deliberate shot (§13l.2,
    #262); whether the information law and dodging make that enough is
    L5's measure. Due: the L5 plan.
35. Loop rules no L4b scenario exercises (#267, the reviewer's N4, N5, N7
    and the engineer's Q12): a path of holes only is not a hit; the chord
    of an oblique line (every L4b line is within 0.01 rad of an axis);
    a grazed cell still loses a full 1 / `kinetic.hitsToWreck` (an exploit
    for aim logic; with item 34); the opening range 900 m is a default of
    `createBattle`, not a constant; one id space for shot events. Due:
    L5's loop with moving ships (its plan carries cases for each).
36. T-neck and T-gun carry no fittings (as `tools/estimates/l4.mjs`
    builds them), so a T-gun spins under its own recoil (#267, engineer
    Q9): give them RCS and radiators when a target must hold its heading
    or fire for long. Due: the L5 plan, with the targets it reuses.


30. **Room size S** (#62 promised S/M/L at every tier; `ROOMS` has M and
    L only; the design partner's finding, #259). Open with it: whether S
    is one cell (linear 1/2, so the size rule gives a quarter of M) while
    `FIXED.sizeLinear.S` = 2/3 sets the S round and the shield's
    `kineticStop`; and whether a weapon room's mass follows its volume
    (118 kg/m³, a 59 t M turret) or its contents (structure + a mount, as
    the engine and beam bay already do, #243 F11). Due: the L5 plan
    decides (build variety for E5 and E6); not before, unless L4b's pace
    measure needs a lighter ship.

33. **The information law has no level** (the design partner, #265): no
    row of §13's table proves #24–#28 (passive d², active d⁴ that reveals
    the scanner, scanning by zone with memory, layout variants), and E3
    needs a proof scenario for every kept law. Decided: the **L5 plan**
    builds `sensors.js` and the knowledge model first (the enemy of §9
    reads only its knowledge model), with scenarios; §17 item 32 rests on
    it. The owner agreed (#266). Due: the L5 plan.
34. **A passed cell loses a flat 1 / `kinetic.hitsToWreck`** (#206, the D
    pass), whatever its mass; only the stopping cell loses by what it took
    (`js/rooms.js`, `fireRound`). The D pass predates the one law (#240
    (1)) and physics pass 2 did not revisit it: a hold cell and a reactor
    cell are dug through alike (the design partner's measure, #265). The
    one-law reading is damage = the energy the cell took / (q × its mass),
    as a beam burns. **Measured on the kernel (#266)**: a passing M round
    leaves a cell only the energy its resistance takes, 0.23 MJ in the
    first of a column of hold cells (0.43 in the design partner's column),
    1.12 MJ in a bridge cell, all 1.92 MJ in a reactor cell where it
    stops; and since that energy is ∝ r ∝ the cell's mass, the energy
    reading makes **every passed cell about 40 rounds to ruin whatever
    its mass** (a reactor cell, stopping the round, 234): light cells
    become nearly immune to rounds that pass them, and a magazine (3 t of
    structure; its rounds do not count in the cell's mass) would take some
    20–40 passing rounds while one through a real propellant store is
    enough. So the pass must answer, before any estimate: what a passing
    round ruins (the hole it makes is mass-blind; the machinery or
    contents it crosses are not), and **whether a magazine detonates by a
    destroyed cell (today) or by the energy deposited in its contents**
    (the owner's question, #266). Decided by the owner: a pass of its own,
    estimated under the gate, decided at the L5 plan together with #261's
    R1d in one pace study. Due: the L5 plan.

37. **Missiles, point defence and the railgun are built nowhere yet**
    (the owner, #268): the kernel has no missile (seeker + warhead, §6,
    #97, #98, #142 EMP), no point defence (#93), and the railgun is data
    only (#236 (6)); the missile bay is a room with crew and mass. §13's
    table names none of them, yet L5 (no dominant build; E5, E6), the
    EMP and surrender routes moved there (#252), the Swarm named ship
    (#121) and the information counters (#27, #149) all need them. Due:
    the L5 plan builds them as room physics with scenarios before ship
    versus ship, or Mission 0 cannot claim E3–E6.

## 18. Decisions in force

One row per decision of `DECISIONS.md`, #1–#241, with its status today (#241 (5)). **current**: stands as written; **superseded by #n**: replaced; **partly superseded by #n (what remains)**; **report**: the row records a result or a process step, not a rule; **owner question open**: waits for the owner; **current (unchecked)**: not checked against the current text. The log itself is append-only and unchanged, so a row there may still read as if it stood. Compiled from the documents audit (B1, H), the decisions' own "supersedes" words and the current text of this file; the lead designer reviews it.

| # | Decision | Status |
|---|---|---|
| 1 | PvE, 1v1 first; ships built from rooms on a grid | current |
| 2 | The player builds and sets orders; three verbs in battle; pause allowed | current |
| 3 | Plain HTML/CSS/JS ES modules, Cloudflare Pages, static server | current |
| 4 | Borrow the shape of the real law, tune the constant | current |
| 5 | Kept laws: inertia, recoil, CoM shift, heat and radiators, infrared, inverse-square, time of flight, square–cube | partly superseded by #203 (C), #230 (what remains: the kept-law list; recoil kept but the "hard recoil" claim withdrawn, beams do not fall off at battle range) |
| 6 | Cut: ½mv² as damage, decompression thrust, I²R; sloped armour deferred | current |
| 7 | No dice: hit or miss by trajectories | partly superseded by #240 (3) (what remains: the player's ship and trajectories never draw from the seed; the enemy's decisions may) |
| 8 | Four kernel models: rigid body, per-room heat, falloff fields, projectiles | current |
| 9 | Hits by trajectory: first cell on the path, over-penetration loses momentum, debris blocks | current (unchecked) |
| 10 | Scale rule: nothing smaller than a compartment occupies a cell | current |
| 11 | Three placement layers: rooms, shared walls, hull edge | current |
| 12 | Graphs on shared walls; capacity ∝ wall length; no conduit rooms | current |
| 13 | Fragments: a split ship becomes rigid bodies, momentum conserved | partly superseded by #81 (what remains: the fragment and momentum rule; the reactor breach is replaced by SCRAM) |
| 14 | The room list and footprints | partly superseded by #201 (5), #234, #236 (6) (what remains: the room list and placement rules; L magazine 3×3, axis rooms 2×N, railgun N×2) |
| 15 | Six fittings, one per hull edge segment | current |
| 16 | Rooms take damage per cell; function ∝ surviving cells | current |
| 17 | Firing arcs blocked by the ship’s own rooms | current |
| 18 | No combo table: every synergy is a flow or a field | current |
| 18b | Three heat thresholds per room; critical kills the crew | current |
| 18c | Empty holds conduct heat poorly (insulator, blast buffer) | current |
| 19 | Starter weapons: beam, kinetic, missile | partly superseded by #229, #230 (what remains: three starter weapons; the beam has no falloff at battle range) |
| 20 | EMP is a missile warhead; tractor beam and mines deferred; ramming and boarding cut | current |
| 21 | Shield: an absorption rate plus a small buffer; absorbed energy is heat | current |
| 22 | Attack/defence matrix | partly superseded by #230 (what remains: the matrix; the beam is not weak at range, it is certain at every range) |
| 23 | The enemy’s outer silhouette is always visible | current |
| 24 | Passive sensing ∝ 1/d², active scan ∝ 1/d⁴ and reveals the scanner | current |
| 25 | Scanning by zone; positions remembered; room state needs passive tracking | current |
| 26 | The enemy scans you too | current |
| 27 | Counters: jammer, scan-proof plating, running cold, heat decoys | current |
| 28 | Puzzle ships have layout variants so scanning stays necessary | current |
| 29 | Five puzzle ships, each testing one law | current |
| 30 | Every battle has a physical clock | current |
| 31 | Measurement: the intended answer wins ≥ 3 of 4 variants | current |
| 32 | Modes: ladder and roguelite | current |
| 33 | Intact salvage; the first intact room of a type unlocks it | current |
| 34 | Hull tiers; repairs per cell cost credits; ships never lost permanently | current |
| 35 | Roguelite environments each change one constant of one law | current |
| 36 | Coverage rule: every in-battle decision has one owner | current |
| 37 | Automatic layer of decisions | current |
| 38 | Standing orders: 12 slots in 4 groups | current (the position slot, which side of the enemy, is not built) |
| 39 | Presets bundle the orders; the verb switches presets | current |
| 40 | Helm conflicts: position, then facing, then dodging | current |
| 41 | Report: KIA list first, cascade tree, deterministic kill-cam | current |
| 42 | Kernel without DOM; renderer reads the player’s knowledge; two RNG streams | current |
| 43 | File layout (foundation, kernel, meta, presentation) | current |
| 44 | Order of work 0.1–0.6 | superseded by #125 (Mission 0) |
| 45 | Art direction hybrid: pixel rooms, smooth effects | current |
| 46 | Every effect has a physical cause; per-law visual signatures | current |
| 47 | Automatic slow-mo with a zoom into the breached room | current |
| 48 | Readability overlays; Canvas 2D performance rules | current |
| 49 | Crew do not walk; when a room is destroyed its crew die | partly superseded by #182, #206 (what remains: no walking, no orders, permanent death; crew die per destroyed cell and in proportion to integrity lost) |
| 50 | Permanent death; memorial wall; sober tone | current |
| 51 | Quarters repair rooms within a radius | partly superseded by #203 (D), #206 (what remains: the quarters’ repair field; repair restores damaged cells only) |
| 52 | Building is a moral choice (magazine beside a crew compartment) | current |
| 53 | One scale; ships fight 4–8 ship lengths apart | partly superseded by #240 (5) (what remains: one scale for simulation and drawing) |
| 54 | Starting numbers (T1): 5 m cell, 30×14, engagement 0.6–1.5 km, battle 3–6 min | partly superseded by #240 (5) (what remains: all numbers; the “4–8 ship lengths at every tier” sentence dropped) |
| 55 | Camera fits both ships | current |
| 56 | Free-form shipyard inside a drydock, templates | current |
| 57 | Validation: an invalid ship never undocks | current |
| 58 | Live physics readout and dry run | current |
| 59 | Shipyard controls | current |
| 60 | Crew capacity: quarters set the total, each room needs its crew | current (the rule is built at L4, #220 (5)) |
| 61 | Cells scale with the tier; cell count roughly constant | current |
| 62 | Every tier offers S/M/L | current |
| 63 | Room stats from scaling formulas, not hand tables | current |
| 64 | Own local grid per ship; armour scales with the cell | current |
| 65 | Casualty lists group the crew | current |
| 66 | Primary device: an Android phone, battle in landscape | current |
| 67 | Touch rules, 44–48 px targets | current |
| 68 | Performance budget is the phone’s | current |
| 69 | PWA, offline after first load | current |
| 70 | Playwright phone tests; every playtest also on the owner’s phone | current |
| 71 | Economy rules: reward the core skill, never stuck, always a sink | current |
| 72 | Sources and sinks of credits | current |
| 73 | Rooms are owned items; rearranging free | current |
| 74 | Prices from a formula in data.js | current |
| 75 | Rooms belong to a tier; trade-in | current |
| 76 | Free emergency repair after a loss | current |
| 77 | A free beginner corvette | current |
| 78 | Beaten ships replayable for half the reward | current |
| 79 | No bonus for sparing enemy crew | current |
| 80 | Ships are fail-safe: losing the bridge does not blow up the ship | current |
| 81 | SCRAM: a reactor without control shuts down; decay heat follows | current |
| 82 | Disabled: one condition, many routes | current (a SCRAMmed reactor does not restart in today’s kernel; physics pass 2, §13k) |
| 83 | The loot is whatever is left; Destroyed defined | current |
| 84 | The same condition defeats the player | current |
| 85 | Puzzle ships have a kill route and a harder capture route | current |
| 86 | Scripts may strike colours; personality per ship | current |
| 87 | A captured ship is commissioned only if the drydock has its tier | current |
| 88 | Crew on a dark fragment are recovered after a win | current |
| 89 | Ammunition is finite for kinetics and missiles | current |
| 90 | Reloading between battles is free | current |
| 91 | Out of ammunition counts toward Disabled; a magazine explodes by what is left | partly superseded by #215 (what remains: attrition route and the explosion scaling with the ammunition left; HE is not “far more” than AP) |
| 92 | Magazines last a disciplined 3–6 minute battle | current (tuned at L4) |
| 93 | Point defence in two fittings | current |
| 94 | Rule for an ammunition type | current |
| 95 | The player sets magazine contents; shot type chosen automatically | current |
| 96 | Kinetic round types: Standard, AP, HE, Sabot, Flak | current |
| 97 | Missiles = seeker + warhead | current |
| 98 | Starter ammunition and unlocks by salvage | current |
| 99 | One rule for every field: finite budget, falloff, overlaps add | current |
| 100 | Firing window of a shield | current |
| 101 | Jamming jams your own sensors; burn-through | current |
| 102 | Infrared sees only the surface | current |
| 103 | Shields do not block scans; absorbing shields are EM-bright | current |
| 104 | A craft is a reusable missile | current |
| 105 | Reused rules for craft | current |
| 106 | Four new rules for carriers | current |
| 107 | Hangar bay: the biggest bomb aboard | current |
| 108 | Carriers add no new verbs | current |
| 109 | Carrier limits: about 24 craft per side | current |
| 110 | Carriers after Mission 0: enemy boss first, player’s at T5 | current |
| 111 | Symmetry: the enemy plays by the player’s rules | current |
| 112 | No information cheating; one knowledge model per side | current |
| 113 | Same physics, same delays | current |
| 114 | Tell rule: a visible precursor for every special mechanic | current |
| 115 | Deterministic enemy decisions | partly superseded by #240 (3) (what remains: the same state gives the same decision; a stand-in may draw from the seeded stream) |
| 116 | No learning across battles; intel journal | current |
| 117 | Personality is four parameters | current |
| 118 | Factions are bundles of defaults | current |
| 119 | Three factions to start | current |
| 120 | Wildcard drawn once from the seed; nothing random during the battle | partly superseded by #240 (3) (what remains: the player’s ship and hit-or-miss are never random) |
| 121 | Term “named ship” for players | current |
| 122 | Difficulty only from mechanics; seven levers | current |
| 123 | The difficulty curve is measured | current |
| 124 | One standard difficulty, assists, Ironman | current |
| 125 | Mission 0 before any content | current |
| 126 | Mission 0 is text only | current |
| 127 | Bottom-up levels L0–L6 | current |
| 128 | Each constant tuned at the lowest level where it acts | current |
| 129 | Output: expected vs actual, PASS/FAIL | current |
| 130 | Accepted risk: the feel unverified until after L5 | partly superseded by #217 (what remains: the real game’s feel stays unverified until after L5) |
| 131 | Mission 0 is an agentic data-gathering exercise | current |
| 132 | Roles: runner, verifier, analyst, integrator | current |
| 133 | Guardrails; a multi-agent wave needs the owner’s go-ahead | partly superseded by #180 (the wave’s go-ahead is the lead designer’s; criteria locked before running, overrides, re-runnable commands remain) |
| 134 | Autonomy line: what agents decide alone, what needs the owner | partly superseded by #180 (the owner-approval parts; never-delegated items remain) |
| 135 | Kernel and framework written first by one agent | current |
| 136 | Nightly regression | current (the task runs nightly, STATUS.md) |
| 137 | Kinetic damage is momentum; relative velocity not counted | partly superseded by #242 (the relative velocity counts; momentum stays) |
| 138 | Beams heat what they hit | current |
| 139 | Stopping rounds costs the shield budget and becomes heat | current |
| 140 | Ships have no propellant limit | partly superseded by #203 (A) (what remains: no propellant limit; engines are self-fuelled torches) |
| 141 | Explosions: through walls inside, a radial field outside | current (the outside field is not built; what carries it is §17 item 5, due L4–L5) |
| 142 | No separate EMP room | current |
| 143 | Radiators follow Stefan–Boltzmann | current |
| 144 | Scenario spec | current |
| 145 | Approved ranges for every tunable constant | partly superseded by #180 (the lead designer approves ranges) |
| 146 | Remaining topics before writing the docs | report |
| 147 | The bridge has its own backup supply; decapitation only by destroying it | partly superseded by #185 (6) (what remains: the backup supply; an overheated or switched-off bridge also decapitates) |
| 148 | The missile bay holds a ready store | current |
| 149 | Heat decoys are munitions | current |
| 150 | CLAUDE.md of the new repo | current |
| 151 | Git flow: one branch and one PR per level; the owner merges | partly superseded by #178, #180 (who merges), #218 (documentation PRs); one branch per level remains |
| 152 | No rendering code until Mission 0 exits | current (exception: #217) |
| 153 | No sound travels in vacuum; four sources | current |
| 154 | Android haptics | current |
| 155 | Synthesised sound | current |
| 156 | Events carry what sound needs | current |
| 157 | No music in battle | current |
| 158 | Setting: a privateer | current |
| 159 | The captain | current |
| 160 | Tone rule | current |
| 161 | Narrative direction | current |
| 162 | Title: Duct Tape Navy: Mostly in One Piece | current (store and trademark check open, §17 item 4) |
| 163 | SI units | current |
| 164 | Mission 0 exits only when all eight hold | partly superseded by #188, #200 (E1), #213 (E8) (what remains: E2–E7) |
| 165 | L0 scenarios (materials) | partly superseded by #230 (what remains: the kinetic, blast and shield scenarios; the beam scenarios are withdrawn) |
| 166 | L0 approved ranges | partly superseded by #206, #230, #232, #235 (values: CONSTANTS.md is current) |
| 167 | No AI checks its own work: four roles | partly superseded by #178, #180 (what remains: the four roles; the lead designer, not the owner, merges) |
| 168 | Retroactive review of L0 | report |
| 169 | Blast spreads as a wave front | current |
| 170 | Shield budget counted once | current |
| 171 | shield.kineticStop computed exactly | current |
| 172 | shield.radius is the half-strength radius | current |
| 173 | “AP M penetrates 2–3 cells” met; L0 AP is the plain steel round | current |
| 174 | Weak checks: locked criteria stay, stronger v2 follow; invariants true by construction do not count for E3 | current |
| 175 | Lock coverage; the step and burn limit in data.js | current |
| 176 | L0 v2 criteria approved | partly superseded by #206, #230 (some v2 scenarios withdrawn) |
| 177 | Pending L0 ranges approved | current |
| 178 | Claude merges after the owner approves | superseded by #180 |
| 179 | STATUS.md is the hand-over between chats | current |
| 180 | Approval tiers: the owner decides direction, the lead designer the rest | partly superseded by #191, #218 (what remains: the tiers; the spending cap and “documentation straight to main” changed) |
| 181 | L1 scenarios | partly superseded by #185 (1), #206 (what remains: the plan; rows withdrawn and replaced) |
| 182 | Per-room heat model; two threshold classes; integrity | current |
| 183 | L1 constants and ranges | partly superseded by #206, #210, #221, #235 (values: CONSTANTS.md is current) |
| 184 | Process items at the start of L1 | current |
| 185 | Answers to the L1 engineer: size rule, kernel readings now design | current; report in part (audit H) |
| 186 | L1 costs and order of checks | current; report in part (audit H) |
| 187 | Answers to the L1 physics checker | current (unchecked) |
| 188 | E1 amended: a scenario withdrawn for a specification error does not block E1 | current |
| 189 | Answers to the L1 reviewer | current |
| 190 | The engineer’s three readings of #189 accepted | partly superseded by #206 (a destroyed cell stays destroyed for the battle) |
| 191 | Spending is a guideline, not a cap | current |
| 192 | Layout and walls for L2 | current |
| 193 | The L2 flow models | partly superseded by #200, #201 (conduction), #205 (7) (buffer sharing deferred) |
| 194 | L2 scenarios | partly superseded by #200, #201 (rows withdrawn and replaced) |
| 195 | L2 constants and ranges | partly superseded by #201, #206 (values: CONSTANTS.md is current) |
| 196 | L2 process | current |
| 197 | The owner’s answers on heat; heat sink adopted | partly superseded by #200 (what remains: the heat sink; the harshness answer (1) replaced) |
| 198 | Heat sink room | current |
| 199 | Cofferdam | superseded by #201 (4) (deferred to IDEAS.md) |
| 200 | Heat moves along the coolant loop; crew rooms and magazines insulated | current |
| 201 | The coolant-loop model and the L2 answers | partly superseded by #214 (8) (what remains: the model and answers; the buffer binds at the 6th round, not the 71st) |
| 202 | Sense check of every mechanic so far | partly current: (F) superseded by #242, (E) by #221; A–D decided in #203 |
| 203 | The four sense-check proposals approved | partly superseded by #229 (B) (what remains: A, C, D) |
| 204 | Answers to the L2 heat-v2 engineer | current; report in part (audit H) |
| 205 | Answers to the L2 physics checker | current; report in part (audit H) |
| 206 | The D pass specified | partly superseded by #232, #235 (what remains: the 6 kg round, partial damage, repair; the kinetic resistances are replaced by the mass law) |
| 207 | Answers to the L2 reviewer; L2 merged | partly superseded by #200, #201 (its heat numbers); report in part (audit H) |
| 208 | L3 models | partly superseded by #221, #232 (cell mass; what remains: rigid body, thrust, RCS, recoil, fragments, control, validation) |
| 209 | L3 scenarios on R1 | partly superseded by #219, #221, #234 (rows withdrawn and replaced) |
| 210 | L3 constants and ranges | partly superseded by #221 (specificHeat removed; thrust, RCS re-tuned) |
| 211 | L3 process | current |
| 212 | Answers to the D-pass engineer | current |
| 213 | E8: 1 ms per simulation step in Node | current |
| 214 | Answers to the D-pass physics checker | current; report in part (audit H; (6) is the question #215 answers) |
| 215 | A magazine’s explosion: propellant dominates, HE adds a third | current |
| 216 | Answers to the D-pass reviewer; D pass merged | current; report in part (audit H) |
| 217 | A rough feel prototype after L3 | current |
| 218 | Fewer documentation pull requests | current |
| 219 | Answers to the L3 engineer | current |
| 220 | Answers to the L3 physics checker and Q13 | current |
| 221 | Ships of real density | partly superseded by #232, #234, #235 (what remains: real density, thrust and RCS re-tuned; the single structure cell mass is replaced by cell mass per room type) |
| 222 | Answers to the L3 reviewer; L3 merged | current; report in part (audit H) |
| 223 | When play is not fun, a ladder | current |
| 224 | The feel prototype’s plan | partly superseded by #237 (ships’ behaviour, estimate, scope of v1) |
| 225 | Answers to the mass-pass engineer and reviewer; mass pass merged | current; report in part (audit H) |
| 226 | The prototype is hosted as a private claude.ai page | current |
| 227 | The feel prototype’s first build and answers | current; report in part (audit H) |
| 228 | Every interaction is symmetric | current |
| 229 | The beam is a neutral particle beam that strikes inner rooms | current |
| 230 | Round damage, no tumble yet, no beam falloff | current |
| 231 | The path model’s build pass | partly superseded by #234, #235 (beam.particleEnergy, armour.kineticResistance replaced; what remains: the Bethe deposit and the round rule) |
| 232 | Protection is the mass on the path | current |
| 233 | The feel prototype merged; why the owner always lost | current; report in part (audit H) |
| 234 | The beam bay is a spinal accelerator; real masses at the low end | current |
| 235 | The path model revised | current |
| 236 | The path model merged; answers | current; report in part (audit H) |
| 237 | Prototype v2’s plan | partly superseded by #239 (its estimate of 30–90 s for a duel at 900 m) |
| 238 | Independent audits at fixed milestones | current |
| 239 | Prototype v2 merged; answers | current |
| 240 | The audits’ seven questions | current (built as physics pass 2, §13k) |
| 241 | Process after the audits: plan gate, sessions, documents | current |
| 242 | The documents consolidated; the kinetic velocity relative to the hull | current (supersedes #137's clause and #202 F) |
| 243 | Physics pass 2 planned (§13k) | current (being built) |
| 244 | Answers to the scenario audit; S17–S22 and the conventions | current |
| 245 | E1 amended again: withdrawal by decision whatever the verdict; the record frozen; retired | current (amends #188, #200, #237 (7)) |
| 246 | Prevention after the audits: lint, mutation tool, supersedes rule, ×4, the owner's page | current |
| 247 | The design partner role; when the lead designer's chat is replaced; the decision frame | current |
| 248 | Pass 2's first run: S6 withdrawn (the plan's tier law false); the engineer's twelve withdrawals; answers | current |
| 249 | Beam depth tier-invariant for electronic stopping only (CSDA-exact, drift reported) | current (amends #240 (4)) |
| 250 | Pass 2's fix rounds: every withdrawn record frozen; answers to the reviewer; sessions notify the lead designer | current |
| 251 | Physics pass 2 merged (PR #54); answers to the re-review | current |
| 252 | L4's routes: one target per route R1 cannot show; EMP and surrender move to L5 | current (amends #127's L4 scope) |
| 253 | The L4 plan (§13l): L4a and L4b, targets, Disabled and destroyed rules, `battle.wreckFraction`, `quarters.crewPerCell` 4 | current |
| 254 | After v2's playtest: no v3 yet; pace measured first (scan time, armour over the magazine, layout); L4a goes ahead | current |
| 255 | Armour on walls built (option A) and Disabled without the thrust condition (the design partner's (c)) | current (partly supersedes #82: the thrust condition) |
| 256 | Armour plates on wall segments only, not decks (2D); R1c the reference with a 0.2 m citadel; pace re-measured after L4a | current |
| 257 | `tools/mutate.js` merged (PR #56); answers to its engineer and reviewer; survivors for L4a | current |
| 258 | Answers to L4a (PR #58): plates burn by mass, σ / cos θ, plate heat capacity; A11 to L4b; `L2.layout.invalid` and `L0.armour.plate` withdrawn; fix round | current |
| 259 | Room size S is #62's open obligation (§17 item 30); decided at the L5 plan | current |
| 260 | L4a merged (PR #58); answers to the fix round's checker and re-review; pace measured on R1c (65 s) and R1d (215–306 s) | current |
| 261 | R1d (turret plated) is the pace lever and L4b's reference ship | current |
| 262 | The L4b plan amended (R1d, B13–B15, the citadel's five rounds, §17 cleaned) | current |
| 263 | The owner's phone replays MATCH (hash `fe22bc2511c8b573`): the kernel is deterministic across engines; §17 item 23 closed | current |
| 264 | L4b go (the owner); the prototype's end panel shows the cascade tree | current |
| 265 | Answers to the design partner: the information law is built at L5 (§17 item 33); the flat 1/hitsToWreck on passed cells is an oversight against #240 (1), a pass for the L5 plan (item 34) | current |
| 266 | The owner: sensors and the knowledge model open the L5 plan; kinetic damage by the one law is a pass decided there; the magazine's detonation rule and the energy a passing round leaves go into that plan | current |
| 267 | L4b merged (PR #62); answers to its engineer, checker and reviewer; the aim point, the feed clause, Disabled's parent | current |
| 268 | Missiles, point defence and the railgun have no level (the owner's finding); the L5 plan builds them before ship versus ship | current |
