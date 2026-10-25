# Duct Tape Navy: Mostly in One Piece — Design

Status: designed 2026-10-20; **Mission 0 L0–L3, the D pass, the mass pass, the path model and prototype v2 are merged** (`regress`: 57 VERIFIED + 29 WITHDRAWN + 5 RETIRED); the documents' consolidation (#241 (5)) and physics pass 2 (§13k, #240) are merged; L4 is merged (§13l); **L5 is planned** (§13n: five passes, #277, #278), no game yet. Mission 0 (§13) comes
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
   clock (#30): today heat and ammunition; a stalemate when neither ship
   takes new cell damage for X s (planned, X from the baseline); a scenario
   clock after Mission 0 (#337). Outcomes are counted apart: win, loss,
   escape, stalemate (#336); the sweep breaks ties by survival (#338).
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
| Damage channels | **Kinetic** (momentum: each cell takes part by its resistance; `fireRound` receives the round's velocity **relative to the hull** it hits (#242, superseding #137's 'relative velocity not counted' and #202 F's deferral; a charged field slows the round in the same frame, the hit body's, never the generator's, #327): ships at rest give the muzzle velocity; L4 and L5 pass the relative velocity, as prototype v2 does), **thermal** (absorbed beam energy, which also becomes heat in the target room), **blast**, **EMP** (#137, #138) |
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
| Magazine | 2×2, 3×3 (the L magazine, #201 (5)) | inside | ammunition by contents, fed through walls; explodes by the ammunition left: the propellant dominates, HE adds about a third (#215); **detonates when a round enters one of its standing cells at `magazine.detonationSpeed` or faster while it holds rounds** (#273 (c), built by L5a, #278, #283); a destroyed cell alone no longer detonates it (the rule of #185 (6), which ended every duel of prototypes v1 and v2, #233, §13j.6 in `HISTORY.md`, is superseded by #278); its explosion is a blast through its walls, not a destroyer by itself (#274); one magazine per weapon type, a railgun's inert |
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
clear exhaust (#57); **crew capacity** (#60): quarters house the crew and every room needs its crew placed, a build-time rule of `validateShip` since L4a (#253: `quarters.crewPerCell` 4, so R1's 20 crew have 24 berths); live physics readout and dry run (#58); palette, drag
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
conflicts resolve as position, then facing, then dodging (#40). Prototype v2's "range" (§13j.2) is #38's engagement-range slot and its "facing bow-on / broadside" is #38's facing; #38's position slot (which side of the enemy: bow / flank / stern) is built (`ORDERS.movement.position`, L5d; corrected by #356). None of the three presets was designed for play (#347): the designed menu comes with the phases plan (#352–#354).

| Decision in battle | Owner |
|---|---|
| Distance (`range`), side of the enemy (`position`), movement style (`style`), dodging (`dodging`), facing (`facing`), firing style (`firing`), when to open fire (`openFire`), default target (`target`), power and repair priority (`priority`, `repair`), heat threshold and response (`heat`), emission (`emission`), auto-scan (`autoScan`), the engine's throttle (`throttle`, inside a preset only) | standing order |
| RCS recoil compensation, point defence target, repair order, reactor containment first, dark fragments, each shot's ammunition type | automatic |
| Which zone to scan (`scan`), which room to target (`target`), which preset (`preset`) | player verb |

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
| L5 Ship vs ship | no dominant build; degenerate builds punished; everything §13m marks planned L5a–e (the senses, the weapons, the enemy, E5–E7); five passes, §13n (#277, #278) |
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
| E7 | The median reference battle lasts 3–6 minutes, counting only **two-sided** battles (both ships take damage, #329) |
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

**L4** (ship versus a static target; #252–#267): planned 2026-10-22, §13l,
**merged the same day** (L4a PR #58, L4b PR #62): one target per capture
route (R1, R1d, T-neck, T-gun), armour plates on walls, Disabled and
destroyed as kernel rules, the battle loop with time of flight, the
per-second log and the cascade tree; E8 0.15–0.29 ms per step.

**Agentic operation** (#131–#136): parallel within a level, gated between
levels; runner, verifier (independent, re-runs from the command line only),
analyst, integrator (the only writer of `data.js` and the ledger); criteria
locked before running (a pre-lock run for crashes and setup errors only, every
edit after it listed in the pull request, #273); overrides instead of edits; no conclusion without a
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
rules living in one place only; **§13m against §4–§9 and the kernel: every
element the design names has a row and a true status**, #275; sense), (b) **process** (where errors
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
| Magazine detonation (#91, #185 (6), superseded by #278) | Besides cooking off at its critical temperature, a magazine detonates when a round enters one of its standing cells at `magazine.detonationSpeed` or faster (§5.2, #273 (c), L5a); until L5a it detonated when any of its cells was destroyed while it held rounds |

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
| Cell mass (#202 E; **superseded by #221 from the mass pass, §13g**) | A cell's mass and its heat capacity are one number: m = C / `thermal.specificHeat` (600 J/(kg·K), a steel-and-aluminium structure), so an M cell at T1 is **1 t** and the exponent is C's (k = 3). A heat sink cell is a cell plus the water that holds its extra capacity: m + (`heatsink.capacityFactor` − 1) × C / `FIXED.waterSpecificHeat` (4186 J/(kg·K)): 1.57 t. Contents add their real mass: a magazine its rounds (900 kg full, D pass), a turret its ready rounds, each **at its room's centre** (a point mass; stated by #287 after the L5m checker's F1). Fittings add `radiator.mass` and `rcs.mass` at their edge's midpoint |
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
| Helm | three **standing orders** (§8), executed by an autopilot STAND-IN for L5's `helm.js`: **range** close 600 / hold 900 / open 1500 m (the #54 band; thrust along the line of sight into a dead band); **facing** bow-on / broadside; **dodge** off / on (the throttle's sign flipped at seeded random intervals across the line of sight). Conflicts resolve as #40: range, then facing, then dodging; the autopilot holds heading with the RCS against the thrust torque and turns with the couple. Interval, dead band and gains are prototype settings in `proto/config.js`, never game numbers: `proto/config.js` holds prototype settings only (the enemy script, separation, `DISABLED_SECONDS`), and no number that belongs to the game (#217 as read by #237) |
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
| `thermal.coupledCrewed` (bridge, quarters, turret, missile bay) | 0.6 MJ/K | 0.2–1 (0.2–2 until #291) | 3 | today's value kept: air (0.15 MJ/K) and fittings; no source found |
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
| S9 | `L0.determinism.v2` (#311; `L0.determinism` withdrawn) | `tools/determinism.mjs` in Node and `proto/smoke.mjs` in Chromium; `tools/mathcheck.mjs --chromium` for `util.js`'s functions | the same event hash (MATCH); no `**` with a non-integer and no `Math` member in `js/` but the exact or correctly rounded ones (`abs`, `ceil`, `floor`, `round`, `trunc`, `sign`, `min`, `max`, `sqrt`, `fround`, `imul`, `clz32`, the constants): `atan2`, `cbrt`, `hypot`, `sin`, `cos`, `exp`, `log`, `pow` come from `js/util.js` (a grep in the scenario) |
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
| Placement of the attacker | at rest, 900 m from the target's centre of mass on a bearing the case names, bow-on to it (the #54 band; the beam is spinal, #234; the 900 m is `battle.openingRange`, 500–2000 m, k = 1, the L4 fix round of #270 (9); a case may still pass its own distance); its turret aims at **the centre of the target room's first surviving cell** (cell-index order; static: no lead): a room's centre is a grid vertex, so a line through it would cross two of its four cells and the route would stall (#267; the engineer and the blind checker found it alike); the spinal beam needs the bay's axis through the aim point, so a constant-free time-optimal heading controller turns the attacker there and holds both ships' headings (a stand-in for L5's `helm.js`) |
| Able to fight (Disabled, #82 as amended by #255) | A weapon room is **able** while it is not destroyed, is controlled, is not shut down, is active, and is joined through live walls to a reactor that can produce (controlled, not SCRAMmed, not shut down, not destroyed); **the Disabled timer starts at the first evaluation, the battle's creation being step 0** (a ship without an able weapon at creation is Disabled in step 600, one that loses it after creation one step later; #276); a turret also needs a round in its ready store or **a magazine with rounds of its size sharing a live wall with it** (the wall its feed crosses, `feedAmmo`; not any room path: a turret cut off from its magazine by a destroyed wall runs dry, B13, #267). The event that takes a ship's last able weapon is the one named by the **first failing condition of that rule in its order** (destroyed, control, shut down, active, power, ammunition): Disabled's parent in the cascade tree (#267). A ship with **no able weapon** for `battle.disabledSeconds` (10 s) is **Disabled**, whether or not its engine works (#255: a ship that cannot fire is a prize however it flies): the battle ends, the ship is captured, and the loot is what is left (#83) |
| Armour on walls (#255, #256, L4a) | Armour (#15) is a steel plate of thickness d on a **hull edge segment or a shared wall segment** (one edge of one cell). A path that crosses the segment meets σ = d × `FIXED.steelDensity` once, with the chord rule (#239), before the next cell; the plate resists a round as a cell does (r = c σ chord), loses 1 / `kinetic.hitsToWreck` per round that passes it and becomes a hole at 0; a beam deposits in it (beamDeposit with σ), that heat goes to the room it is mounted on, and it **burns by the one law** like a cell: it loses P F dt / (`matter.burnEnergyPerKg` × its mass) of its integrity per step (#240 (1), #258; a 0.2 m plate lasts 23.5 s under a 5 MW beam). A line crossing a plate at an angle θ to its normal meets **σ / cos θ** (the line-of-sight thickness), capped at the cell's edge length of steel (cos θ ≥ d / edge) (#258); ricochet and tumble stay out (#6). A residue of integrity at or below 1e-12 counts as 0 (the snap `damageCell` uses; #260): a 0.2 m plate under a 5 MW beam is a hole in step 1413 exactly. The plate's steel **adds its heat capacity to its room's** (its mass × `thermal.coupledArmour` / `armour.cellMass`, 450 J/(kg·K), #258), the consumer `thermal.coupledArmour` lacked (#248 Q13). A plate belongs to the room it is mounted on and leaves with that cell; when another cell of its room is destroyed, the plate's steel stays with the room and only the cell's own share of the heat leaves (#260). In a **cluster** (L2, no ship) a destroyed cell keeps its heat capacity and heat; in a **ship**, and in a heat sink, the cell's share leaves with it as debris (#198, #219 Q6; stated here for both, #260). Its mass, d × steel density × edge × edge (the segment's area: edge long, one cell high), joins the body of the room it is mounted on (centre, inertia) and leaves as debris when it is wrecked. **Only walls carry plates, never decks**: the model is 2D and no path crosses a floor or a ceiling, so a deck plate would be mass that nothing in the model can meet (#256). Thickness `armour.plateThickness` (new, 0.2 m, 0.01–0.4, k = 1) |
| Destroyed (#83, amended by #274) | A reactor's **explosion** ends the battle with the ship destroyed (checked before Disabled and before pieces in the same step). A reactor explodes **at once, with no countdown, when its last cell is destroyed** (`ON_CELL_DESTROYED.reactor`, built since L1; stated by #282 after the L5a checker found it undocumented); a breach (`reactor.breachFraction` of its cells destroyed) starts the `reactor.breachCountdown` otherwise. A **magazine's explosion** is, from the L5 kinetic pass on, a blast through its walls by §13d.1 (its charge the ammunition left) and nothing more: the ship is destroyed only by the rules below, the reactor or the crew (#274; until that pass the kernel still ends the battle on it, as L4's `L4.kill.v2` records). **Too many pieces**: the ship is also destroyed when its largest fragment holds less than `battle.wreckFraction` (new, 0.5 of the ship's mass at undock, 0.3–0.8, k = 0) |
| Per-second log (#129) | One line per whole second of battle time per ship: position, heading, velocity, each room's mean integrity, temperature, power fraction and state (controlled, shut down, SCRAMmed); and every event since the last line with its cause. `node tools/battle.js <case>` prints it; its hash is the battle's (E2: same seed and inputs → same hash) |
| Books across two ships (the L4 fix round, the physics audit's B1–B4 and L4, #270) | The hit's momentum follows the round's velocity **relative to the hull** (#242) at the point each kernel call books the hull at: `shieldRound` at the entry point, `fireRound` at the first entry with matter. Summed over both ships (bodies, debris, rounds in flight, `ship.left`, `battle.spent`) the momentum book closes against thrust and RCS at 1e-9 of gross (`L4.books.two`, still and spinning target). **Stated stand-ins until L5's loop** (§17 item 35): the impulse acts at the cell's centre, not on the line, so a hit does not conserve angular momentum (B2); energy is not booked across the two ships, a shot creates its energy (B3); a stopped round's mass stays in `spent`, out of play (B4); a round's energy is split between cells by the impulse each took, not by the energy each lost (L4) |
| Plate heat (the physics audit's U3, #270) | A plate's whole steel is coupled to its room's air in the step it is heated: the deposit and the burn go to the room's heat store at once. A stated stand-in (a 0.2 m plate's own thermal time is minutes) until a plate carries its own heat, with item 34's kinetic pass or later |
| Cascade tree (#41) | Every event carries a cause that is either a **root** (a shot id, a beam id, `heat`, `launch`) or the id of an earlier event of the same battle (`explosion:magazine` already has this form; L4b gives every event an id and every derived event its parent's id). The tree is printed with the log; an event whose cause is neither is an error |
| Crew capacity (#60, #220 (5), §17 item 9) | A build-time rule in `validateShip`: the crew the rooms require (Σ `crewRequired` of every crewed room) must not exceed the berths of the quarters (cells × `quarters.crewPerCell`). R1 needs 20 and has 18 berths: `quarters.crewPerCell` 3 → **4** (inside its approved 1–8; 6 m² of a 25 m² cell per sleeper, a warship's berthing) gives 24. The kernel's crew counts are otherwise unchanged |
| Blast capacity from remaining integrity (#216 (3), §17 item 8, L4a) | A room's blast capacity is Σ over its surviving cells of integrity × `matter.blastPerKg` × cell mass (today: surviving cells × the same, ignoring damage). A damaged room absorbs less and passes more |
| Rounds in overlapping fields (#205 (7), F18, §17 item 12, L4a) | The round meets the summed strength g = min(1, Σ g_i) and the summed buffers; the energy the field removes is charged to each generator in proportion to its buffer × g_i (the beam rule of §13d.1); no generator pays more than its buffer (**the reading, #276**: the shares are of min(ask, Σ buffers); a generator over its buffer pays the buffer and the shortfall is solved once more with what was paid, no third round); each generator's ship takes the impulse of its share, at the generator. With generators on different bodies, each share's books use **its own body's hull velocity at the round's point** (the round's velocity relative to that hull, #242): the heats are then each Galilean-invariant, and their sum is not one world-frame energy loss (#258 (11), #260); the ship's gain includes its spin, J²/2M + L²/2I. The kernel stops throwing on such a round |
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
| R1, R1c, R1d **after L5m** (#285, #287) | the turret by its mount (4975 kg cells) | R1 **911 234.057 kg**, 1.679 g; R1c **1 225 234.057 kg**, 1.248 g, centre (27.532010, 15.597919) m, I 1.68909391e8 kg·m²; R1d **1 421 484.057 kg**, 1.076 g, centre (30.28879, 17.03403) m (the successors' hand-worked literals, the blind checker's and the reviewer's own models agreeing); the figures in the two rows above and in §13k.3 and §13l.7 are those before L5m |
| **R1d** (#261, the owner's pace lever) | R1c plus five plates around its turret: the four hull segments (8,5)+y, (9,5)+y, (9,4)+x, (9,5)+x and its wall to the beam bay (9,4)−y; 1 460 784.06 kg, **1.047 g**, centre (30.685, 17.248) m, I 2.707267e8 kg·m² (`tools/estimates/l4.mjs`) | **the reference ship of L4b and of the prototype**: the kill routes through a citadel (B6), the mission kill against a plated turret (B2), the pace measure. A note for L5: against a deliberate shot on a static R1d the citadel is **five M rounds thick** (a stopped round still costs the plate 0.215 of its integrity), so the magazine kill moves from 6 s to 18 s by rounds and 29.5 s by beam; in duels it held because no script aims at it. Thickness within its range (0.01–0.4 m) is the lever if that is too thin |
| T-neck | engine [0,3)×[2,4) rotated 90°, reactor [3,5)×[2,4), shield generator [3,5)×[0,2), heat sink [3,5)×[4,6), **hold [5,7)×[2,4)** (the neck, open from −y and +y), bridge [7,9)×[2,4), magazine [9,11)×[2,4), beam bay [11,13)×[2,4), quarters [7,10)×[4,6), turret [10,12)×[4,6) | **split at a choke point** and **cut the power walls**: one cut through the neck leaves the bridge half without a reactor (no power) and the reactor half without a bridge (SCRAM). In this kernel the two routes of #82 are one mechanism, since power, control and structure share the live walls (#192): stated, not a defect |
| T-gun | R1 with its beam bay replaced by a hold (the turret its only weapon, a crewed room with low heat thresholds, #182) | **overheat**: the beam held on the turret shuts it down by heat before it is ruined; **run it dry**: it fires its turret broadside until the ready store and the magazine are empty (#91). Under #255 the engine does not count, so one layout shows both |
| From L5m (#286) | the turret by its mount (#285) | **mission kill on R1d** (+y, rounds at the beam bay then the turret: its plates stop the round before the citadel; Disabled at 61.1 s in the probe, engine working); **overheat through R1's bridge** (−y, the beam on the bridge: one cell burnt at 10.0 s, the bridge shut down by heat at 23.0 s, control lost, every reactor SCRAMmed, Disabled at 33.0 s with `heat` the root); R1 from +y is **destroyed** (a round passes the light turret into the magazine at 469 m/s) and T-gun's turret burns out before it overheats: both kept as recorded cases of what a layout costs |

### 13l.3 Estimates (T1; `node tools/estimates/l4.mjs`)

The script models the attacker as a fire schedule along axis-aligned lines
(one M round every 2 s, a 5 MW beam), with no time of flight; the
scenarios use the battle loop, so their times sit within a time of flight
(1.125 s at 900 m) and a step of these.

- R1, decapitation: rounds into the bridge's columns from −y, every weapon and the engine lost at 22.0 s, **Disabled 32.0 s** (12 shots; the bridge and 0.11 of the quarters); the beam 32.9 s; rounds with the shield on 48.0 s.
- R1, mission kill (beam bay and turret, #255): rounds 36.0 s (18 shots), beam 44.2 s, both 23.1 s; rooms wrecked: those two only.
- R1, kill routes: rounds into the reactor breach it at 82 s, **destroyed** at 92 s; the beam 222 s; rounds through the hold into the magazine: **destroyed at 6.0 s** (4 shots).
- T-neck: rounds into the neck's column 5: split at 6.0 s after 3 shots (7 fired by the Disabled time), **Disabled 16.0 s** (no crew lost); the naive order (beam bay first) is not Disabled in 120 s.
- T-gun, overheat: the beam on the turret's rows from +x: turret shut down by heat at 22.7 s with **0.17** of its integrity left, Disabled 32.7 s. Heat wins over burn in a crewed room only narrowly (burn 44 MJ per cell against 33 MJ per cell to overheated): reported, a #223 rung-1 question for L5, not a criterion.
- T-gun, run dry: 154 rounds (4 ready + 150 in a full HE magazine) at 0.5/s: the last at 306.0 s, **Disabled 316.0 s** ((n − 1) / rate + dt + 10 s).
- R1d (kernel at `5a837af`): decapitation 32.0 s (its bridge is open as R1's); magazine through the hold and one plate: rounds **18.0 s** (10 shots: five into the plate, three into the first cell, the explosion), beam 29.5 s; mission kill (beam bay, then the plated turret): rounds 46.0 s, beam 67.8 s; reactor 92.0 s (unchanged).
- Pace (for L5's E7, not an L4 criterion): against a target that neither moves nor fires back, a capture takes 16–86 s and a kill 6–222 s.

**Pace measured after L4a and re-measured on the L4b kernel** (#260, #269; `node tools/estimates/pace.mjs --layout R1|R1C|R1D`, kernel at `5c54eb6`, Disabled by #255, 10 seeds, median seconds at 600 / 900 / 1500 m): R1 bow-on 25 / 7 / 102, broadside 54 / 34 / 100, nearly every end a magazine; **R1c** bow-on 53 / 51 / 102, broadside 65 / 61 / 141, every end a capture with the magazine intact; the beam bay (4 light cells, bow face open) is lost at 15–37 s on both sides, then the turret. Levers within the approved ranges on R1c, broadside (L4a kernel, #260): `kinetic.hitsToWreck` 5: 149 / 204 / 248; 8: 332 / 354 / 466 (bow-on 227 / 227 / 302 with stalemates); `turret.fireRate` 0.25: 225 / 217 / 400. **R1d** (R1c plus five plates around the turret, §13l.2; the owner's lever, #261): bow-on **104 / 102 / 195**, broadside **215 / 244 / 306** (the L4a-kernel figures 139 / 131 / 210 bow-on that #261 was put with are superseded: the L4b loop aims and ends differently, the documents audit's finding 7). Hit rates 84–100 % throughout; the enemy is the prototype's fixed script (§13j.2), so these are pace figures, never balance.

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
| A4 | L4a | `L0.beam.csda.continuous` (six sampled changes) and its successor `L0.beam.csda.sweep` (every one of the 754 changes at 10–400 MeV, #258 (9)) | `csdaRange` at adjacent floats around each step-count change | no jump above 1e-12 relative between neighbours (measured 1.0e-15) |
| A5 | L4a | `L1.reactor.meltdown.coupled` | a reactor alone held near 960 K at the coupled C | meltdown at the time t = C ΔT / P off the step grid, one-sided |
| A6 | L4a | `L4.readout.blueprint` | R1's readout before and after `enableShip` | mass, centre, inertia equal within 1e-12 |
| A7 | L4a | `L4.crew.capacity` | R1 at crewPerCell 3 and 4; a ship with no quarters | 3: rejected (20 > 18); 4: valid; no quarters: rejected |
| A8 | L4a | survivors of `tools/mutate.js` (`mission0/mutations/2026-10-22-b7c4290.txt`, #257) that L4a's rules touch or that #257 names: `k1.chord.beamIgnored`, `k1.deposit.damageFirst`, `f1.ctl.bridgeShutdown`, `f1.thrust.atCentre` (found an equivalent mutant: an exhaust face spans its room's rows, #258 (6)), `e1.rep.crewBack`, `d1.shov.bufferOverlapAllowed` (A2), `f1.dest.damagedLosesMass`, `d1.cond.secondOrder` (a closed form that pins explicit Euler) | one scenario or case each; `node tools/mutate.js --only <ids>` reports each KILLED on the L4a head; the bridge switched off emits its own `control-lost` with cause `off` (#257 Q2 did not reproduce: the event existed, `L3.control.bridge` now pins it, #258 (7)) |
| A9 | L4a | `L0.armour.plate.v2` (its first form, `L0.armour.plate`, asserted no burn and was withdrawn as the lead designer's error, #258 (1)) | an M round and a 5 MW beam across a plate of 0.2, 0.15, 0.1 or 0.01 m on a hold wall, at chord 1 and 1/√2 and at cos θ 1, 1/√2, 0.02; rounds until the plate is a hole; the beam until the plate is ruined; a plate on a shared wall mounted on either room | σ = 1570 kg/m² (hand-worked); a 0.2 m plate stops an M round and loses 0.215 of its integrity; the thin plate's fractions 0.5212 / 0.4788; the plate burns P F dt / (q m) per step and the 0.2 m plate is a hole in step 1413 (the 1e-12 snap); its heat and heat capacity in its mount room |
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
kernel); with #246 (4)'s ×4: **70–100 USD**. **Outcome**: L4a ≥ 17.57
USD (a lower bound: the engineer's cost before a worker restart is not
reported) against the plan's raw 10–14 (#253; the "15–22" that once stood
here was a later re-estimate, not the plan's); L4b 23.98 USD against raw
18–25 (1.1 on the midpoint). The cost factors are answered with the L4
process audit (#270: #267's factor change is withdrawn, #246 (4) stands; the
ratio of actual to raw per pass is in `LEDGER.md`). Pass 2 cost 42.93 against 50–60 estimated. The owner is told before each
pass starts (#191: past 40 USD).

### 13l.6 Checklist (#241 (1))

- [x] Every number in 13l.3 is printed by `tools/estimates/l4.mjs` from the kernel at `47a1696` (the plan) and re-printed at `5a837af` after L4a (the R1d rows; crew 44 with four berths per cell, the L4a routes unchanged to the step). `battle.wreckFraction` is new and not reached by any estimate.
- [x] Every passed rule on: routing, control and SCRAM, breach and detonation, blast through walls, fragments, life support, the shield's buffer (decapitation with the shield on), heat thresholds; the attacker's time of flight is off (stated, 1.125 s).
- [x] Tolerances: timed cases one-sided in [t, t + dt) off the grid; books 1e-9 × gross (#220); closed forms 1e-12; A4's 1e-12 against `csdaRange`'s own step error is the fix's claim, measured by the scenario.
- [x] Hardware: 4 berths per cell (6 m² each) against warship berthing; the neck is a 2 × 2 hold (10 m wide, 3 t per cell).
- [ ] Open: overheat against burn in crewed rooms is narrow (0.17 integrity left): reported for L5's tuning; T-gun's case is a criterion on the cause of the last lost ability, not on how much is left. The citadel is five rounds thick against a deliberate shot (13l.2): a fact for L5, not an L4b criterion.

### 13l.7 Scenario-hygiene round (#271; the L4 scenario audit of #270)

The owner's direction (2026-10-22): every remaining audit finding is fixed,
not filed. This round fixes the scenario audit's findings (§17 item 39)
on one engineer session (opus) on `m0/l4-hygiene` from `main` after the
L4 fix round (PR #64) merges; the blind physics checker (sonnet) derives
the new hand-worked literals from the lock; the reviewer (sonnet). **No
kernel physics and no constant changes**: a kernel change found necessary
is a question in the pull request. Every number below is printed by `node
tools/estimates/hygiene.mjs` from the kernel at `ec3d222`, a kernel
reading unless marked hand-worked; the checker derives the physics ones
blind. The first round under #270 (3)'s checklist lines and (4)'s "Pre-lock
runs" section.

**Lock discipline.** A locked scenario is never edited: each one below is
withdrawn (frozen, #245, `mission0/withdrawn.json` naming #271 and the
successor) and replaced by a `.v2` successor that keeps every check of the
original and adds what the finding asks. A scenario that gains only a
label still gets a successor (the lock is the file's hash).

| Successor | Finding | What the successor adds (the original's checks kept) |
|---|---|---|
| `L4.route.decapitate.v2` | U1, N2 | the bridge's last cell is destroyed by **shot-12**, 12 shots launched and 12 hits by that step (the plan said "four bridge cells × 3 hits, every round stopping in the bridge": **wrong reasoning, right number** (#276): a round passes one bridge cell and stops in the second, and 12 arises only with the quarters' repair between shots, 10 without; the checker's stepped model with the aim rule, the repair field and the 2 s rate reproduces 12, 19, 4, 4 and 46, so the counts are derivable but not by cells × hits); the 600-step gap a literal in `expected()`; `kinetic.hitsToWreck` leaves `tunable` |
| `L4.route.missionKill.v2` | U1, N3 | the turret's last cell by **shot-19** (19 launched); the Disabled step pinned as a literal (kernel-read, labelled) |
| `L4.route.split.v2` | U1, C2, TOL1 | the split by **shot-4** (4 launched, 4 hits); the naive case asserts the beam bay destroyed and the turret able at 120 s; the momentum tolerance **1e-12 × gross** (residues on record 6.1e-18 and 6.1e-16 relative) |
| `L4.route.overheat.v2` | U3, N3 | the target fires (`targetFire`, its turret fed): **no shot of the target after its turret's shutdown step** (the firing gate of `turret()`, the survivor `c1.thr.turretWorksShutdown`); the shutdown time t satisfies the hand-worked one-sided bound **t ≥ C_surv ΔT / (P_beam + P_own)** with C_surv the heat capacity of the cells surviving at the shutdown (a kernel reading: 2 of 4, C 1.2 MJ/K), ΔT 60 K (290 → `thermal.crewedOverheated` 350), P_beam 5 MW (the beam's whole deposit lands in the turret: fraction 1.000), P_own = `turret.heatPerShot` × `turret.fireRate` = 150 kW: **13.98 s**; with every cell 27.96 s, above the kernel's 22.88 s, which is why the surviving cells count; the step (1373 without the target firing; **1344**, 22.4 s, with it, as locked) pinned, labelled kernel-read; the checker's sharper schedule bound, cells burning one by one at q m / P = 8.88 s each, is 21.38 s (#276) |
| `L4.kill.v2` | U1, N1, N2 | R1's magazine cell by **shot-4** (4 launched), R1's reactor breached by **shot-46** (46 launched; 51 in all); `reactor.breachCountdown`'s 600 steps a literal; `shot-10` relabelled kernel-read |
| `L4.kill.pieces.v2` | TH2, N2 | a third case: column 10 cut, the largest fragment **exactly 0.5** of 80 cells (40 cells), **not destroyed** (the rule is "less than"); 0.5 a literal in `expected()` |
| `L4.disabled.rule.v2` | N2 | the 600-step gap a literal |
| `L4.e8.v2` | C3 | the mean ms per step and the machine recorded in the row (`actual`), the criterion unchanged (under 1 ms) |
| `L4.cascade.v2` | C1 | `battleTree` on B2–B5, R1d and the beam case (no dangling parent); in B1 the Disabled event's parent is the turret's `control-lost` (#267 (3)) |
| `L4.hit.oblique` (new) | U2 | B1's battle with the attacker on the numeric bearing [sin 20°, −cos 20°] (not axis-aligned): the first hit's path bridge:0 > bridge:2 > reactor:3 > heatSink:1 > heatSink:3 with the second entry's chord below 1 (r 894 141 against 914 856 kg/(m s) at chord 1: **chord 0.9774** hand-worked from the line's geometry through the cell, 0.977357 by the scenario's own slab geometry, 0.97738 by the checker's; the r literal itself is kernel-read: 914 856 × 0.9774 is 894 180, not 894 141 (#276); the line is 19.37° off the axis, not 20°, because the gun sits 10 m beside the bay's axis), the round passing one entry and stopping in the second; 13 hits and 0 misses to Disabled at step 2106 (kernel-read); and a **holes-only** case: the bridge and quarters destroyed before the first shot, the turret aimed at the bridge's centre as a world point: 6 shots, **0 hits, 3 misses** by step 601 (the survivor `l4b.hit.holesHit`; the misses hand-worked from the time of flight) |
| `L4.relative.v2` | T1 | one literal for the 700 m/s round: passed 1, stopped in entry 1, f 0.4073762457, momentum left 0 on the path bridge:0 > bridge:2 > quarters:0 > quarters:3 with r 914 855.62 per entry and s₀ 1 372 160.548 (the checker derives f from the round rule) |
| `L3.shield.nobody.v2` | T2 | the heat check relabelled a consistency invariant (§13k.4), not hand-worked |
| `L0.beam.csda.sweep.v2` | T3 | the count 754 relabelled a regression pin; `csdaSteps` is 229 at 10 MeV and 983 at 400 MeV with ranges 1.9311 and 1164.24 kg/m²: **the ranges are independent** (the checker's own integration with a 1 MeV stop energy matches to 1e-8), **the step counts are pins** (the step rule and the stop energy live only in `js/damage.js`, #276); the identity 754 = 983 − 229 is the independent part |
| `L2.beam.chord.v2` | N4 | F₂ at chord 0.5: **0.620219371646** (the second cell; the first 0.379780628354), 1e-12: **a kernel-read pin, not hand-worked** (#276): the checker's exact model, F₂ = e^(−60/1321) · E(R₀ − 60) / E₀ with R₀ = 112.6415 kg/m² and E(R₀ − 60) = 64.9039 MeV, gives 0.620219371686, 4.0e-11 away (the integrator's error); the plan's label was the lead designer's error; a successor states the formula at 1e-9 |
| `L2.repair.crew.v2` | TH1, `e1.rep.destroyedRepairable` | losses of **0.9** (0 deaths) and **1.6** cells (1 death, floor), hand-worked floor(4 × loss / 4); a destroyed cell beside a damaged one is not repaired |
| `L2.shield.overlap.round.v2`, `L3.shield.bodies.v2` | TOL1 | impulse tolerances 1e-12 × gross where the residue on record is 1e-14..1e-11 (the engineer reads the records) |
| `L3.beam.deposit.v2` | TOL2 | the vented check keeps a stated tolerance: the vent is a difference of two terms of about 4e8 J for a result of 2.1e4 J (residue on record 1.05e-12 relative: 1e-12 would fail on the float), so **1e-11 with the reason named** (the plan first said "a sum over steps": wrong, the case is one step; the scenario's reason is the right one, #276) |
| Survivors read, not necessarily fixed | — | `i1.rd.stopsOnEqual` (an exact-equality case where the round rule's L0 scenario lives, if one fits), `f1.ctl.bridgeBackup` (what it changes; a case in `L3.control.bridge`'s successor if a rule is uncovered), `k1.beamPaths.neverCleared` (**root cause reported** in the pull request; a scenario only if a real gap) |

**Mutations**: `--only` on the rules touched before the review (`c1.thr.turretWorksShutdown`, `l4b.hit.holesHit`, `l4b.hit.chordOne`, `l4b.wreck.fraction04`, `e1.rep.destroyedRepairable` expected KILLED); the full run after the review (#270 (5)).

**Cost**: raw 10–15 USD (engineer 7–10, checker 2–3, reviewer 1–2); with #246 (4)'s ×2.5 (a repeated kind of work: a scenario fix round) **25–38 USD**; the lead designer's own expectation 12–18 (#270 (2)). The owner was told before the round started.

**Checklist** (#241 (1), with #270 (3)):

- [x] Every number above is printed by `tools/estimates/hygiene.mjs` at `ec3d222`; kernel readings are labelled.
- [x] Every passed rule on (the scenarios keep their originals' checks).
- [x] Tolerances against the method's error and float resolution: 1e-12 × gross where the residue is 1e-14..1e-11; `L3.beam.deposit`'s 1e-11 named (a sum over steps); N3 one-sided.
- [x] Damage channels × new resisting object: none (no new object).
- [x] Locked scenarios against new validation rules: none (no new rule).
- [x] The script line behind each number: the section numbers (1)–(9) of `hygiene.mjs`.
- [x] Hardware sense-checked: nothing new.

## 13m. Coverage: every element of the design and the level that proves it (#269)

One row per element the design names (§4–§9 and the exit criteria), with
what the kernel holds today and the Mission 0 level that proves or plans
it. Written after the owner found, playing the prototype, that no level
had ever listed the weapon set (#268) or the senses (#265): the level table
of §13 names physics by room, this table names everything. **Status**
is one of: **proven** (a VERIFIED scenario), **built, measured only**
(in the kernel, no proof scenario yet), **planned Ln** (in a plan or in
§17 with a level), **after Mission 0** (by a decision), **not built**
(cut or deferred by a decision). A row whose status names no level and no
decision is a lint failure (`tools/lint-docs.mjs`, check 8): nothing may
sit in no plan again. Each plan updates this table in the same commit.

### A. Physics laws and channels (§4)

| Element | Today | Proof | Status |
|---|---|---|---|
| Inertia, moment of inertia (#208) | `body.js`, rebuilt on loss | `L3.mass.props.v5`, `L3.r1.pinned`, `L3.destroyed.mass` | proven L3 |
| Recoil, Newton 3 (#5, #203 C) | turret recoil, RCS | `L3.recoil.v5`, `L3.hit.books` | proven L3; E4 judged at L5c (the railgun, §17 item 7) |
| Centre-of-mass shift | `rebalance` | `L3.split.momentum.v5`, `L3.fragment.rules.v3` | proven L3 |
| Heat and radiators, Stefan–Boltzmann (#143); the coolant loop (#200) | `heat.js`, conduction, life support | `L1.radiator.*`, `L2.heat.*`, `L2.lifesupport.*`, `L1.heat.coupled.v2` | proven L1–L2 |
| Infrared seen from outside (#102): surfaces only | `sensors.js`: every working panel at its room's `irBrightness` and the exhaust's jet power are point IR sources; rooms without a panel are IR-dark | `L1.sensor.passive`, `L2.sensor.memory`, `L2.sensor.posture` | proven L5b |
| Inverse-square passive, distance⁴ active (#24) | passive P A / (4π d²) ≥ `sensor.sensitivity`; a zone resolves after `sensor.scanTime` (d / `sensor.scanRange`)⁴ | `L1.sensor.passive`, `L1.sensor.active`, `L0.sensor.tier` | proven L5b |
| Time of flight | `battle.js` rounds | `L4.route.decapitate` (arrival steps), `L4.relative` | proven L4 |
| Square–cube, tiers (#63, #240 (4)) | `scaled(k)`; plates k = 1; `beamEnergy` | `L0.beam.tier.v2`, `L0.shield.buffer.tier`, `L3.mass.props.v5` (T6) | proven for the pass-2 rules; the rest planned L6 (the physics audit's T1–T4, #270) |
| Fail-safe reactors: SCRAM, decay heat, restart (#81, #82) | built | `L1.reactor.scram.v2`, `L1.reactor.restart`, `L3.fragment.scram.v2` | proven L1, L3 |
| Kinetic channel: momentum per cell, the path model, relative velocity (#137, #230, #242) | built | `L0.kinetic.*`, `L3.kinetic.hole.v2`, `L4.relative` | proven L0–L4; a passed cell's loss by its chord proven L5a (`L0.kinetic.chord.loss.v2`, #273 (b), #283) |
| Thermal channel: beam deposit and burn (#229, #240 (1)) | built | `L0.beam.*`, `L3.beam.deposit`, `L0.armour.plate.v2` | proven L0–L4 |
| Blast channel, inside (#141, #169) | built | `L0.blast.surface.v4`, `L2.blast.*` | proven L0–L2 |
| Blast outside the hull (#141, §17 item 5) | an HE warhead or round stopped at a plate bursts outside: nothing enters (fragments carry nothing beyond the hull) | `L2.missile.warheads.v2`, `L0.rounds.types` | proven L5c |
| EMP channel (#138, #142: a warhead) | a field of the shield's shape by section (#292): a reactor in reach SCRAMs, another powered room shuts for `emp.outageTime`; the buffer pays first | `L2.missile.warheads.v2` | proven L5c |
| Shields: absorb, buffer, the field (#21, #99, #139) | built | `L0.shield.*`, `L1.shield.generator.v3`, `L2.shield.*`, `L3.shield.*` | proven L0–L4 |
| Engines as self-fuelled torches (#140, #203 A) | thrust, draw, heat | `L1.engine.thrust.v3`, `L3.thrust.v5` | proven L1, L3 |
| Crew die per cell, by integrity, at critical heat (#49, #18b, #206) | built | `L1.kinetic.damage.v2`, `L2.repair.crew`, `L1.room.thresholds.v3` | proven L1–L2 |
| No dice (#7, #240 (3)) | the seeded stream only | `L0.determinism.v2` (#311; Node = Chromium = the owner's phone, #263) | proven |

### B. Rooms (§5.2)

| Room | Today | Proof | Status |
|---|---|---|---|
| Bridge (control, backup supply, decapitation) | built | `L1.bridge.control.v2`, `L3.control.rules`, `L3.control.bridge`, `L4.route.decapitate` | proven L1–L4 |
| Reactor (power, SCRAM, breach, meltdown) | built | `L1.reactor.*`, `L4.kill` (reactor) | proven L1–L4 |
| Engine | built | `L1.engine.thrust.v3`, `L3.thrust.v5` | proven |
| Magazine (contents, feed, cook-off, detonation) | built | `L1.magazine.cookoff.v2`, `L2.ammo.feed`, `L4.kill` (magazine) | proven; detonation by a round's entry speed proven L5a (`L2.magazine.detonation`, `L1.magazine.cookoff.v3`, #273 (c), #283); one magazine per weapon type proven L5a (`L2.magazine.types.v2`) |
| Shield generator | built | `L1.shield.generator.v3`, `L2.shield.*` | proven |
| Crew quarters (berths, repair field) | built | `L1.quarters.repair.v3`, `L2.repair.*`, `L4.crew.capacity` | proven |
| Beam bay (spinal accelerator) | built | `L1.beambay.*`, `L2.beambay.cause`, `L0.beam.tier.v2` | proven |
| Kinetic turret | built; mass by its mount since L5m (`structure.cellMass` + `turret.machineryMass`, #285) | `L1.turret.fire`, `L1.turret.timing.v2`, `L4.route.*`, `L0.turret.mount` | proven; its mass by its mount proven L5m (#287) |
| Spinal railgun (#236 (6)) | a slug of `railgun.roundMass` at `railgun.muzzleVelocity` √(N / 2) along the axis, fed from a slug magazine, its draw over the reload, recoil on the axis | `L1.railgun.fire`, `L0.railgun.slug`, `L3.railgun.recoil` | proven L5c |
| Missile bay (#148: ready store, launch, explodes by its missiles) | the store refilled from a missile magazine by mass, one launch per `missilebay.launchInterval`, explodes by its missiles (warhead + fuel); launches without a power test today (§17 item 46) | `L1.missilebay.launch`, `L2.magazine.types.v3` | proven L5c |
| Empty hold (insulates; blast buffer gone, #240 (6)) | built | `L2.heat.*` (hold factor), `L2.blast.integrity` | proven |
| Heat sink (#197, #198) | built | `L2.heatsink.*`, `L2.plate.vent` | proven |
| Hangar bay (#107), jammer (#27), auxiliary bridge (#13) | nothing | none | after Mission 0 (carriers #110; counters #27) |

### C. Fittings (§5.3)

| Fitting | Today | Proof | Status |
|---|---|---|---|
| Armour plate (#15, #255, #256) | built, walls and hull | `L0.armour.plate.v2`, `L3.r1c.props`, `L4.kill` (R1d) | proven L4 |
| Radiator | built | `L1.radiator.*` | proven |
| RCS | built | `L3.rcs.turn.v5` | proven |
| Point defence, kinetic (#93) | `pd.fireRate` flak rounds from `pd.ammo`, led on the missile, bursting at closest approach over `flak.radius`, within `pd.range` and the segment's half-plane | `L1.pd.kinetic.v2`, `L2.pd.swarm` | proven L5c |
| Point defence, laser (#93) | `pdLaser.power` on the missile in arc and range, no falloff, draw at `beambay.efficiency` | `L1.pd.laser`, `L2.pd.swarm` | proven L5c |
| Sensor antenna (#24: scan, needs a control path) | built: a fitting of `sensor.mass` on an open edge; a scan needs its host controlled and powered and draws `sensor.scanPower` as heat there | `L3.sensor.control`, `L1.sensor.active` | proven L5b |
| Scan-proof plating (#27), decoy launcher (#149) | nothing | none | after Mission 0 (#27, #149: later modules) |

### D. Shipyard and validation (§5.5)

| Rule | Today | Proof | Status |
|---|---|---|---|
| Connected to the bridge, hull rooms on the hull, axis, bow clear, exhaust clear, fitting rules | `validateShip` | `L3.validation.v2`, `L2.layout.invalid.v2` | proven |
| Crew capacity (#60) | `validateShip` | `L4.crew.capacity` | proven L4 |
| Live readout before undock (#58) | `readout` | `L4.readout.blueprint` | proven L4 |
| Room size S (#62) | an S footprint of one cell (quarters and missile bay 2 × 1, engine 1 × 2, beam bay and railgun 1 × N); rate-like quantities by cell count | `L2.size.s` | proven L5c |
| Dry run against a dummy, templates, drag and drop, mirror, export (#56–#59) | nothing | none | after Mission 0 (presentation) |

### E. Weapons, defence, ammunition (§6)

| Element | Today | Proof | Status |
|---|---|---|---|
| Beam: no falloff, deposit along the path, heat | built; a beam into a ship with no body deposits nothing, its passed energy escaped (#327) | `L0.beam.*`, `L2.beambay.cause`, `L4.beam.nobody` | proven |
| Kinetic: time of flight, momentum along the path, recoil | built | `L0.kinetic.*`, `L4.route.*` | proven |
| Missile = seeker + warhead (#97): flight, guidance, impact | `js/missile.js`: `missile.acceleration` for `missile.burnTime`, then coasting; flown on the shooter's world; its body's impulse and heat at impact | `L0.missile.flight`, `L2.missile.warheads.v2` | proven L5c |
| Seekers IR, radar, anti-radiation, designated (#97) | each from the shooter's model only; nothing resolved: the silhouette's centre | `L2.missile.seekers.v2` | proven L5c |
| Warheads HE, penetrator, EMP (#97, #142) | HE a contact burst with `he.coupling` and the blast through walls; the penetrator by the round rule (228 m/s in a 900 m battle: it stops in R1's first crewed cell, #298); EMP by section | `L2.missile.warheads.v2` | proven L5c |
| Point defence against munitions | missiles only, nearest first, within `pd.range`; saturation (the Swarm's law) is an L5e measure (#299) | `L1.pd.kinetic.v2`, `L1.pd.laser`, `L2.pd.swarm` | proven L5c (the rules); planned L5e (the throughput measure) |
| Firing window in the shield (#100) | a segment a side's own round crosses or its beam fires through is open for that step | `L4.shield.window` | proven L5c |
| Ammunition finite, reloaded between battles (#89, #90); running dry counts toward Disabled (#91) | built | `L2.ammo.feed`, `L4.route.dry` | proven |
| Magazines last a disciplined 3–6 minute battle (#92) | measured only (T-gun 316 s) | none | planned L5e (the reference battle, E7) |
| Round types Standard / AP / HE / Sabot / Flak (#96) | `ROUNDS`: each one parameter traded and its price (AP's rate, Sabot's recoil, HE's depth, #295) | `L0.rounds.types` | proven L5c |
| Each shot's type chosen against a scanned target (#95) | HE on a hull-face room, AP on a room behind a cell, Standard otherwise and on a zone, from the model | `L4.rounds.choice` | proven L5c |
| Carriers (#104–#110) | nothing | none | after Mission 0 |

### F. Information (§7)

| Element | Today | Proof | Status |
|---|---|---|---|
| Free information: the outer silhouette always visible (#23) | the model's silhouette (standing cells, hull segments, poses) at every range before any scan | `L1.sensor.active` | proven L5b |
| Passive IR and EM, distance² (#24, #102) | panels and the exhaust (IR), a scanning antenna and an absorbing shield (EM), resolved at d⁻² | `L1.sensor.passive`, `L2.sensor.reveal`, `L2.sensor.posture` | proven L5b |
| Active scan by zone, distance⁴, reveals the scanner, remembered (#24, #25) | 3 × 2 zones of the occupied box, each revealing its own cells; the scanner EM-bright; positions kept, state only by re-scan or passive IR | `L1.sensor.active`, `L2.sensor.reveal`, `L2.sensor.memory` | proven L5b |
| Jamming, burn-through (#101) | nothing | none | after Mission 0 (#27: later module) |
| Shields EM-bright while absorbing, do not block scans (#103) | the generator's absorbed power this step (a beam's `s.em` and the buffer's payment for rounds, #290) is an EM point source; scans pass the field | `L2.sensor.shield`, `L2.sensor.posture` | proven L5b |
| Symmetry: the enemy scans too; one knowledge model per side; the renderer and the enemy read only theirs (#26, #42, #112) | one model per side when the battle's `knowledge` is on; the attacker's aim reads only its model; plan advancement still reads the truth until L5d (#290 (1)) | `L4.target.known`, `L2.sensor.reveal` | proven L5b (the model); proven L5d (the enemy and the helm read only it, the plan advances by it: `L4.plan.model`, `L4.loop.symmetric`, `L4.enemy.decide`) |
| Layout variants per named ship (#28) | nothing | none | after Mission 0 (content); the wildcard draw built in L5d (`enemy.js`), its case proven L5e1 (`L4.enemy.wildcard`, #324) |

### G. Battle (§8)

| Element | Today | Proof | Status |
|---|---|---|---|
| Standing orders, 12 slots (#38): movement (range, position, style, dodging) | `js/helm.js` (#301, #302, #307) | `L4.helm.range`, `L4.helm.conflict`, `L4.helm.dodge`, `L4.helm.style`, `L4.helm.drift`, `L4.helm.race` (#335) | proven L5d; race L5 (item 55) |
| The helm's layers: pilot (heading and throttle to RCS and engines; reports the ship's acceleration and turn), navigator (goals to heading and throttle), gunnery and systems (the owner, #333) | `js/pilot.js`, `js/navigator.js`, `js/helm.js` (#335) | `L4.pilot.turn180`, `L4.pilot.thrust`, `L4.helm.race`, `L4.helm.yield`, `L4.pilot.retry`, `L4.helm.yield.exact` | proven L5 (item 55, PR #105; item 58, PR #107) |
| Standing orders: firepower (facing, firing style, open fire, target priority) | `js/helm.js` | `L4.helm.dodge`, `L4.orders.fire` | proven L5d |
| Standing orders: energy (power and repair priority, heat discipline) | `js/helm.js`, `routePower`, `repairGrants` (#307) | `L2.power.flow` (priority), `L4.orders.energy`, `L4.orders.repair` | proven L5d |
| Standing orders: emission (posture, auto-scan) | `js/helm.js` with `sensors.js` | `L4.enemy.decide`, `L4.orders.fire` | proven L5d |
| Presets (#39) and the preset verb | `PRESETS` in `data.js`, the preset verb | `L4.orders.fire`, `L4.play.replay` | proven L5d |
| Helm conflicts: position, facing, dodging (#40) | `js/helm.js` | `L4.helm.conflict` | proven L5d |
| Verb: scan a zone | a battle's `scans` input (side, antenna, zone, time); one command scans one zone and stops when it resolves (#290 (4)) | `L4.target.known`, `L3.sensor.control` | proven L5b (a case input); proven L5d (the player's verb, `L4.play.replay`; the enemy's auto-scan, `L4.enemy.decide`) |
| Verb: target a room | the prototype (tap); the loop's aim at a room | `L4.route.*` (the attacker's aim) | proven L4 (the kernel side) |
| Automatic rules: RCS recoil compensation, point-defence target, repair order, reactor containment first, dark fragments, each shot's ammunition type | RCS, repair order, the point-defence target (nearest in arc and range, L5c) and each shot's type (L5c) built; the rest nothing | `L3.rcs.turn.v5`, `L2.repair.shared.v2` | partly proven; point-defence target and the shot's type planned L5c; containment first and dark fragments proven L5e1 (#324: `L2.repair.containment`, `L3.fragment.dark`) |
| **Disabled** (#82, #255) | built | `L4.disabled.rule` | proven L4 |
| Route: cut the power walls / split at a choke point (one mechanism, #253) | built | `L4.route.split` | proven L4 |
| Route: decapitate | built | `L4.route.decapitate` | proven L4 |
| Route: mission kill | built | `L4.route.missionKill.v3` (on R1d since L5m; R1 from +y is destroyed through its magazine, a recorded case) | proven L4; on R1d proven L5m (#286, #287) |
| Route: overheat | built | `L4.route.overheat.v3` (through R1's bridge since L5m; T-gun's turret burns out first, a recorded case) | proven L4; through the bridge proven L5m (#286, #287); it rests on `thermal.coupledCrewed`, a constant with no source (§17 item 43) |
| Route: run it dry | built | `L4.route.dry` | proven L4 |
| Route: EMP (forces a SCRAM, the enemy restarts) | `empBurst` by section (#292) | `L4.route.emp.v2` | proven L5d |
| Route: surrender (strikes its colours, #85, #86) | `battle.js` (#303) | `L4.route.surrender.v2` | proven L5d |
| Destroyed: a reactor explosion, too many pieces (#83); a magazine explosion as a blast only (#274) | built as #83 | `L4.kill`, `L4.kill.pieces` | proven L4 for #83; the magazine's blast as a blast only proven L5a (`L4.kill.v3`: R1's full magazine wrecks the reactor, which ends the ship by its own explosion, #282 (1), #283) |
| Loot: whatever is left (#83); the same condition for the player (#84); crew on a dark fragment recovered (#88) | nothing (campaign) | none | after Mission 0 (campaign, `run.js`) |
| Report (#41): KIA list, cascade tree, timeline, what the enemy scanned, heat, salvage, kill-cam | the cascade tree and the log in the kernel; the prototype's end panel | `L4.cascade`, `L4.log` | the tree and the log proven L4; the rest after Mission 0 (presentation) |

### H. Enemies (§9) and ship versus ship

| Element | Today | Proof | Status |
|---|---|---|---|
| The enemy runs the same automatic layer, orders, presets and verbs (#111) | `js/enemy.js` | `L4.enemy.decide`, `L4.route.escape` | proven L5d |
| No information cheating, same delays, deterministic, no learning (#112–#116) | the model-only reads (the reviewer's check), seeded dodging only | `L4.enemy.decide` (same seed, same log hash), `L4.play.replay` | proven L5d |
| Personality: aggression, patience, caution, resolve (#117) | `js/enemy.js` (#306 (4)) | `L4.enemy.decide`, `L4.route.surrender.v2`, `L4.route.escape`, `L4.route.escape.edge` | proven L5d (the levers; their values are content) |
| Factions, wildcard, named ships, difficulty (#118–#124) | nothing | none | after Mission 0 (content); the wildcard mechanism built L5d, its case proven L5e1 (`L4.enemy.wildcard`, #324) |
| Ship versus ship: no dominant build, degenerate builds punished (E5, E6) | the prototype duel only (measured, scripted) | none | planned L5e (`tools/sweep.mjs`, #277) |
| The reference battle (E7) | the prototype's R1d duel, measured | none | planned L5e (#277 O2) |

### I. Exit criteria (§13)

| Criterion | Status at L4 |
|---|---|
| E1 (every scenario passes or is withdrawn with a successor) | holds for L0–L4: 107 VERIFIED + 87 WITHDRAWN + 5 RETIRED |
| E2 (invariants: hash, momentum, heat, no NaN) | proven per scenario at L0–L4; the two-ship momentum book is planned L4 (the L4 fix's `L4.books.two`, #270); energy and angular momentum across two ships proven L5a (`L4.books.energy`, `L4.books.angular.v2`, #283; a shield field's impulse at its generator stays a stand-in, §17 item 35) |
| E3 (every kept law proven) | the rows above marked proven (F, E, G and H by L5b–L5d, #309; the plume, containment first, dark fragments and the wildcard's case by L5e1, #324); **not yet**: the rows planned L5e2 (ship versus ship, E5–E8, the point-defence throughput, magazines lasting the battle) |
| E4 (every attribute has a measured effect) | judged at L5c for recoil and the shield buffer (§17 items 6, 7); `thermal.coupledArmour` has its consumer since L4a |
| E5, E6 (builds; underdog paths) | planned L5e: needs E and F above, room size S (D); the budget is mass at undock (#277 O1) |
| E7 (3–6 minutes median, two-sided battles, #329) | planned L5e2 on the rebuilt reference builds (#330): the reference battle is §13n.1 (e) (#277 O2); R1d duels 104–306 s under the prototype's script |
| E8 (1 ms per step) | T1 proven (`L4.e8`, 0.15–0.29 ms); T6 planned L6 |

## 13n. L5 plan: senses, the kinetic pass, weapons, the enemy, ship versus ship (#277, #278; the owner's answers are §13n.7)

L5 proves §13's level (**no dominant build; degenerate builds punished**,
E5–E6), the median reference battle of E7, and everything §13m marks
**planned L5**: the information law (F), missiles, point defence, the
railgun, the round types and the firing window (E), the standing orders,
presets and verbs as kernel rules (G), the enemy and the two routes moved
from L4 (H, #252), room size S (D), the kinetic-damage pass (§17 items 34,
41; #273, #274) and the stand-ins of §17 item 35. Nothing of it exists in the
kernel today (§13m, #265, #268). It is built in **five passes** and one
mass pass, each its own branch and pull request on the one before, each
under the plan gate (#241 (1) with #270 (3) and #275 (2)), in this order,
because each reads the one before: **L5a** the kinetic pass (the damage law
every later measure runs on), **L5m** mass pass 2 (#279, #280, #281: **the turret**
as structure plus its mount, from a cited source, as the engine and beam
bay already are, #243 F11; the reactor keeps its mass on the sources, the
missile bay and the railgun get theirs in L5c with their rooms; it re-pins
R1 and R1d, makes the turret a light room an M round passes whole (σ 592 →
199 kg/m², (9)), and must precede the pace study, every measure by mass, E5
and E6 above all, and every scenario that pins a penetration), **L5b** senses and the
knowledge model (what the enemy and the seekers read), **L5c** weapons (missiles, point defence, the railgun, round types,
the firing window, S footprints), **L5d** the helm and the enemy (the moving
loop with both ships firing), **L5e** ship versus ship (the reference set,
E5–E7). Every number below is printed by `node tools/estimates/l5.mjs`
(its sections (1)–(8) are named at each number; `--set` for a constant in
`data.js`, `--plan` for one proposed here); where the kernel has the physics
(the round rule, the blast through walls, radiator power, the loop) the
number is the kernel's, elsewhere it is the stated formula's. The checklist
is §13n.6.

### 13n.1 Rules

**(a) Senses and the knowledge model (L5b; `js/sensors.js`, the antenna fitting; #23–#28, #101–#103, #112)**

| Rule | Statement |
|---|---|
| Sources | Each side's **IR sources** are what the kernel radiates: every radiator panel at its room's temperature (`irBrightness`, 9.0 kW at 290 K, 165 kW at plant hot; (1)) and the engine's exhaust at full thrust (jet power = thrust × `engine.exhaustVelocity` / 2 × throttle, 75 GW at T1: new constant, the torch's exhaust velocity; #203 A). Hull faces radiate nothing in the heat books (L1–L4: radiators only) and so show nothing: **a room without a panel is IR-dark**, which is #102's "deep reactors are invisible until heat reaches the hull" with the panel as the hull. **EM sources**: a scanning antenna (`sensor.scanPower`, 100 kW while scanning) and an absorbing shield (its absorbed power, `s.em`, already computed, #103). Everything is a point source at its fitting's or room's position |
| Passive (d⁻², #24) | An antenna fitting (one per hull segment, on a room with a control path to the bridge; passive needs no power, active does) receives P × `sensor.area` / (4π d²) from each source of the other side and **resolves** it when that is at least `sensor.sensitivity`: the source's position (the panel's segment, the exhaust face, the antenna's segment, the generator's room) and, for IR, its temperature class (rest / hot / overheated / critical by the room's thresholds). The silhouette (the occupied cells' outline and the hull segments) is free at every range (#23). Ranges at T1 (1): a panel at rest to 1.7 km, at plant hot to 7.3 km, a scanning antenna to 5.6 km, an absorbing shield to 40 km, the exhaust to 5000 km: the exhaust and an absorbing shield are beacons, cold panels fade at the top of the band. **Running cold** (the emission posture of #38) is engine off, shield off, no scan |
| Active (d⁻⁴, by zone, #24, #25) | The other ship's occupied bounding box is split into **3 × 2 zones** (bow, middle, stern × upper, lower; R1 11 × 6 cells gives zones of 4 × 3). One antenna with power scans one zone at a time; a zone **resolves** after `sensor.scanTime` × (d / `sensor.scanRange`)⁴ seconds of scanning at distance d (4 s at 900 m, 0.79 s at 600 m, 30.9 s at 1500 m; the whole ship 4.7 / 24 / 185 s; (1)), the radar law (echo ∝ d⁻⁴, integration time ∝ the inverse; `sensor.scanRange` k = 1 so a zone at the same distance in cells takes the same time at every tier, #273 (3)). A resolved zone gives the knowledge model every room of the zone (type, size, cells, plates on its segments) and their integrity at that step; **positions are remembered** for the battle, state is not: integrity and temperature after the scan come only from a re-scan or from passive IR on the room's panels (#25). While it scans the antenna is EM-bright (`sensor.scanPower`), so the other side resolves the scanner's segment passively before the scan resolves a zone (5.6 km against 900 m; (1)): the design's asymmetry, and the anti-radiation seeker's target |
| The knowledge model (#26, #42, #112) | One per side, in `sensors.js`: the silhouette, the resolved zones with their rooms and the step of the scan, the IR and EM sources resolved this step and their last known position, and the shots and hits the side itself made (where its rounds entered). **The enemy (`enemy.js`), the helm's target rules and the renderer read only their side's model**, never the other world. Targeting: the verb "target a room" and every standing order that names a room pick from the model's known rooms; a weapon may also be laid on a **zone** (its silhouette centre), which is a physical shot at whatever is there (#95's "the default against an unscanned one"). A hit's path is known to the shooter only where its own model knows the cells |
| Jamming, burn-through (#101), decoys (#149), scan-proof plating (#27) | Not built at L5 (§13m: after Mission 0, later modules): a jammer is a d⁻² EM source that raises the other side's sensitivity floor, burn-through the range where the d⁻⁴ echo rises above it; both reuse the two laws above and add no law. No constant for them now (E4) |
| Events | `scan-started`, `zone-resolved` (zone, rooms), `source-resolved` (kind, position) for presentation and sound (#156) |
| L5b's precisions (#289, after the probe) | **The antenna** is a fitting on an open edge of a room that is not placed inside, under `fittingProblem`'s rules (one fitting per edge is "one per hull segment"); `validateShip` gains no rule; its mass `sensor.mass` (new, 1000 kg, 250–4000, k = 2, an estimate: 250 kg/m² of aperture) at its edge's midpoint. **A scan** needs the host room controlled (a control path to the bridge) and powered; it draws `sensor.scanPower` from the host while it scans, heat in the host as every consumer's draw; progress on a zone accumulates dt / (`sensor.scanTime` × (d / `sensor.scanRange`)⁴) each step with d from the antenna's edge midpoint to the zone's centre (world, that step) and resolves at 1; it resets when the antenna changes zone or loses power or control. Passive needs only the antenna's cell standing. **Zones**: the other ship's occupied box at undock in its grid, column bounds x₀ + ⌈i W / 3⌉ (i = 0…3, stern to bow), row bounds y₀ + ⌈j H / 2⌉ (j = 0…2), zone id 3 j + i (R1 and R1d: 4, 4, 3 × 3, 3; the rooms each reveals are printed by section (1)); the zone's centre is its rectangle's centre on the body that holds its first cell. **A resolved zone reveals its own cells** (room id and type, integrity, plates on their segments) and nothing of other zones; a room is known once one of its cells is; the aim point of a known room is its first known surviving cell. **Sources** are points: a panel at its edge's midpoint (its room's `irBrightness` / its panels), the exhaust at the exhaust face's centre (thrust × `engine.exhaustVelocity` / 2 × throttle, a live engine only), a scanning antenna at its edge's midpoint, a shield at its generator room's centre while `s.em` > 0; no occlusion and no facing at L5b. **The knowledge model is a battle setting** (`knowledge: true`): with it off, as in every locked L4 case, nothing changes (the probe: 116 of 116 rows unchanged); with it on each side has a model, the silhouette (its standing cells and hull segments, with the other ship's pose) at every range, and a plan's room the model does not know is aimed at the centre of the zone the case names. L5d makes the model mandatory for the helm and the enemy (H1 decides the L4 records then). **Events** go to the observer's log, room the antenna's host: `scan-started` (zone; root `scan-<n>`, the side's n-th scan), `zone-resolved` (zone, rooms; its parent the scan-started), `source-resolved` (kind, position) on the step a source turns resolved, root `sense`; `isRoot` takes both roots |
| L5b as built (#290; PR #84, `js/sensors.js`) | **A shield's EM** is the power its generator absorbs in the step, a beam's (`s.em`) and the buffer's payment for rounds (its `roundEm`, paid / dt) alike: #103's "while absorbing" names no channel, and a shield that stops rounds is lit by them (S9 rests on it; `roundEm` is not enumerable so no record moved: L5c, which touches the shield for the firing window, makes it enumerable and re-records). **One scan command scans one zone**: the antenna stops when the zone resolves and a re-scan is a new command (S4, S9); L5d's auto-scan order issues the next. **Partial power**: a scan under a browned-out host progresses at the full rate and radiates the full `sensor.scanPower` (the heat is the power delivered); scaling both by the host's power fraction (#193) is built in L5d with the power-priority order, when brown-out is a thing a battle does (§17 item 45). **Plan advancement reads the truth** (`firstStanding`) with the model on; only the aim reads the model: L5d's target rules advance by the model (a room is lost to its shooter when its model knows no standing cell of it) and the model keeps no reference to the other world (§17 item 45). A zone's first cell is its first occupied cell row by row from its low row, its pose the body holding it, else the main body's; a zone without occupied cells resolves and reveals nothing. The exhaust's power is the engine's **actual** thrust × `engine.exhaustVelocity` / 2 (throttle, surviving fraction and power fraction included: the rule's formula for an intact engine on full power). `received` is the best of the side's antennas; the event's room is the first antenna that resolves the source; a battle with the model senses once at creation (silhouette and passive, no scan), so `source-resolved` events at t = 0 |

**(b) The kinetic pass (L5a; #273 (b) (c), #274, §17 items 34, 35, 36, 39, 41)**

| Rule | Statement |
|---|---|
| A passed cell loses by its chord (#273 (b)) | A cell or plate a round passes loses **chord / `kinetic.hitsToWreck`** of its integrity (today the flat 1 / `hitsToWreck`); the cell it stops in loses (taken / r) / `hitsToWreck` as today, with r already chord-scaled. At chord 0.9774 (`L4.hit.oblique`) the loss is 0.3258 for 0.3333; a graze at chord 0.05 costs 0.0167 (2). A plate's chord is the line-of-sight reading of #258 (σ / cos θ), unchanged |
| The magazine detonates by residual speed (#273 (c)) | A magazine with rounds detonates when a round **enters one of its cells at a speed at or above `magazine.detonationSpeed`** (new, 400 m/s, 200–600, k = 0; **the first rung-1 lever of the pace study K7**: the threshold decides which screens work, 400 a crewed cell, 500 also a shield generator cell and two beam bay cells, 650 also two holds, 750 also one hold, and the owner chooses it on K7's table before L5b's lock, #277; the round rule's momentum on entering that entry over the round's mass, whether it stops there or passes). A destroyed cell alone no longer detonates it; a magazine whose last cell is destroyed loses its rounds as debris, no explosion; cook-off at `thermal.magazineCritical` stays. At 400 m/s (2): an M round through a hold enters at 705 m/s (R1's column 8: **one shot**, against four today), through two holds 605, through a shield generator cell 485, down R1's bow row through the beam bay 431: all detonate; **through one crewed cell it enters at 333 m/s and does not**; a 0.2 m plate stops it (no entry). An L round enters at 489 m/s after a crewed cell: detonates. So the screens that work are a crewed room against M rounds and a plate against all, and the information law decides whether the shot is deliberate (item 32) |
| A magazine's explosion is a blast (#274) | `checkEnd` no longer ends the battle on a magazine's explosion; the blast through walls (§13d.1) stands; the ship is destroyed by a reactor's explosion or by pieces (`battle.wreckFraction`). **A reactor inside the blast's reach ends the ship in the same step** by its own explosion (its last cell destroyed, §13l.1's Destroyed row): on R1 and R1d the end is named the reactor's explosion, not pieces (#282, the L5a engineer's Q1 and the checker's D1; the plan's estimate did not model the chained reactor). **Finding** (2, the kernel's blast): R1's full magazine (150 HE rounds, 1.2 GJ) against R1's whole blast capacity of 94 MJ wrecks every room, kills all 44 crew and leaves no fragment over 0.5: **destroyed by pieces** on R1 and R1d alike, and the ratio is tier-invariant (the charge and the cells both k = 3), so #274's "a capital ship loses a compartment" does not follow from today's constants at any tier: a full magazine is thirteen ships' worth of blast. What #274 does change: a magazine holding under about 12 rounds (94 MJ) wrecks neighbours, not the ship; the player's loadout (#95) and the S magazine (one cell, 37 rounds, 300 MJ) are the levers; `kinetic.chargeEnergy`'s range (2–20 MJ) does not reach it. The owner accepted it as the physics (#277 O4: HMS Hood); no constant changes here |
| One magazine per weapon type (#274's lever) | `loadMagazine` takes a **weapon type** with the size: `turret` rounds (by round type, (c)), `railgun` slugs, `missile`s. A weapon is fed only by a magazine of its type sharing a live wall with it (`feedAmmo`, #267 (2)). A railgun's magazine holds steel slugs and **does not explode** (no propellant: `magazineContents` energy 0); a missile magazine explodes by its missiles' warheads plus fuel (`missile.warheadEnergy` + ½ m v_burnout² per missile, (c)). `magazineContents` energy stays `chargeEnergy` (+ `he.blastEnergy` for HE) per turret round |
| A room without crew (new; #60, #18b) | A room that requires crew and has none left (its crew died at critical heat with its cells intact, or by blast) is **unmanned**: no function, as if shut down, and `unmanned` joins the able rule after `heat` (its parent the `crew-died` event). Today a crewless turret keeps firing (nothing in `rooms.js` reads `room.crew` for function): a gap the pass closes. A ship with no crew anywhere has no able weapon and is Disabled; it is **not** destroyed (#277 O3: this is what #274's "no crew" meant) |
| The stand-ins of §17 item 35 (B2, B3, B4, L4) | B2: a hit's impulse acts **on the line of action** (the midpoint of the round's chord through the cell, or the plate's crossing point), not at the cell's centre, so the two-ship **angular** momentum book closes (1e-9 × gross like the linear one, #220); B3: the battle books **energy** across the two ships (muzzle energy = the round's kinetic energy + recoil energy; each hit's loss = heat + the hull's gain; a round's energy at `left`), closing at 1e-9 × gross; B4: a stopped round's mass **joins the body it stops in** (rebalance), `spent` keeps only what left play; L4: a round's heat is split between entries by the **energy each took** ((p_i² − p_{i+1}²) / 2m per entry), not by impulse. Successors of `L3.hit.books`, `L4.books.two`, `L3.shield.energy` where their records move (the engineer lists them; the originals withdrawn as superseded by this row's decision) |
| Targets with fittings (§17 item 36) | `mission0/targets.js` gains **T-neck2** and **T-gun2**: the L4 layouts with four RCS and the radiators R1 carries where their rooms allow, for L5's cases that hold a heading or fire for long; T-neck and T-gun stay as locked (their records read them) |
| Hygiene residue (§17 item 39) | Fixed in the successor of every scenario this pass withdraws ((b) `L4.kill.v2`'s magazine cases → `L4.kill.v3` under the two rules above, with the shot that detonates R1's magazine (1) and R1d's (7: the two hold cells, the plate at shot 6, the round through the hole at shot 7, (2)) and the end by pieces; (d), (f) when `L3.shield.energy` and `L3.shield.nobody.v2` get successors for B2–L4; (g) the tie-break stated in §13l.1 as the kernel's order, no code). (a), (c), (e) stay listed until their files are touched (L5c for (a)) |
| The pace study (#266: one study for R1d and this pass) | After **L5m** merges (#281: the turret's new mass moves the mission-kill route) the lead designer runs `tools/estimates/pace.mjs --layout R1D` (the prototype judged by the kernel's Disabled and destroyed rules, a `proto/` change in this pass: the magazine's explosion no longer ends it) with the two rules above, bow-on and broadside at 600 / 900 / 1500 m, and reports to the owner before L5b's lock: whether R1d with its citadel and the threshold keeps E7's band (L4b: broadside 215–306 s, bow-on 102–195 s, §13l.3); if not, `magazine.detonationSpeed` within its range and `armour.plateThickness` are the rung-1 levers (#223) |
| The pace study's result (#288; `node tools/estimates/pace.mjs --layout R1|R1D --set magazine.detonationSpeed=400|500|600`, kernel at `7f75027`, 10 seeds, medians in s at 600 / 900 / 1500 m, destroyed of 10 in brackets) | **R1** at 400: bow 45 (1) / 17 (6) / 50 (8), broadside 25 (9) / 38 (1) / 100 (9): 34 of 60 destroyed; at 500: 30 of 60 (bow as at 400; broadside 33 (6) / 38 (0) / 100 (9)); at 600: bow 45 / 33 / 68, broadside 51 / 38 / 131, 2 of 60 destroyed. **R1d** at every threshold: bow 61 / 55 / 146, broadside 157 / 213 / 289; destroyed 3 / 1 / 0 of 60 at 400 / 500 / 600. The threshold decides whether an unscreened magazine is a kill route (and on R1 moves the duration a little, bow 900 m 17 → 33 s, broadside 600 m 25 → 51 s, every R1 cell under 131 s); it does nothing to a citadel. **The owner chose 400** (#288, option A): one crewed cell screens an M round, two holds do not (605 m/s), three do (497 m/s). R1d bow-on after L5m is under E7's band (55–146 s against 180–360): noted, judged at L5e with the reference battle (#277 O2) |

**(c) Weapons (L5c; #93, #96, #97, #100, #142, #148, #236 (6), #268)**

| Rule | Statement |
|---|---|
| Spinal railgun (§5.2, #236 (6)) | An axis room **N × 2** (M; N ≥ 2, like the beam bay's rule), bow face open, fires a steel slug of `railgun.roundMass` (new, 10 kg, 5–20, k = 3; `roundLengthToDiameter` long) forward along the axis at `railgun.muzzleVelocity` × √(N / 2) (new, 2000 m/s for N = 2, 1500–2500 (#54), k = 0; constant acceleration along the barrel, no constant), at most `railgun.fireRate` (new, 0.1 /s, 0.05–0.3, k = −1), fed by a railgun magazine on a live wall (slugs, no ready store). Each shot draws ½ m v² / `railgun.efficiency` (new, 0.3, 0.1–0.6, k = 0) over the reload (a capacitor is not modelled: the draw is spread over 1 / fireRate), the rest is heat in the room (plant class, coolant loop). Recoil −m v along the axis at the room's centre (#5). At T1 (3): N = 2 gives s₀ 4.65e6 kg/(m s) (2.96 × an M round), passes three crewed cells, **enters a magazine behind a bridge at 1078 m/s** (detonates; the Lance's law) and a reactor cell stops it; 6.67 MW mean draw and 4.67 MW of heat at 0.1 /s (plant hot alone in 1196 s); recoil on R1d 1.4 cm/s per shot (E4 on recoil is judged here, §17 item 7: expected cut as a visible effect, kept in the books). N = 4: 2828 m/s, 13.3 MW; N = 6: 3464 m/s, 20 MW (the whole reactor) **Counters (#295, the design partner's gap)**: (1) **a plate at 0.4 m** (`armour.plateThickness`'s top) stops every slug N = 2–6 ((3) with `--set armour.plateThickness=0.4`), at 78.5 t a plate against 39.3 t at 0.2 m (R1d's thirteen: +510 t); (2) **its axis**: it fires only along its ship's axis, so the flank and stern positions of #38 deny it while a turret tracks, and its ship turns 90° in 5.7 s (R1d, (5)) against a 0.45 s time of flight that dodging cannot beat; (3) **its rate and heat**: 0.1 /s and 4.67 MW of heat (plant hot alone in 1196 s), a third of the reactor. Measures: W2 gains the 0.4 m case (hand-worked by the round rule); L5e's sweep reports the Lance's win rate by the opponent's position slot (a measure, no criterion) |
| Missile bay (#148) and missiles (#97) | The 3 × 2 hull room holds a **ready store** of `missilebay.readyMissiles` (new, 2, 1–6, k = 0) refilled from a missile magazine on a live wall at `ammo.wallFeed`'s rate by mass, and launches one per `missilebay.launchInterval` (new, 2 s, 1–10, k = 0) from its open face. It explodes by the missiles inside (its store's warheads and fuel, #148). A **missile** is a kernel munition like a round: mass `missile.mass` (new, 200 kg, 100–500, k = 3), launched at the ship's velocity from the face, thrust along its own heading at `missile.acceleration` (new, 30 m/s², 10–100, k = 0) for `missile.burnTime` (new, 20 s, 10–40, k = 0; its fuel, not tracked otherwise), then coasting; it flies on the shooter's world like a round (moved each step, culled, tested against the other hull along its segment); its hp follows the one law, `matter.burnEnergyPerKg` × its mass (0.6 MJ; no constant); its exhaust is an IR source (its jet power, the same formula as the engine's) so a missile is seen passively from launch. **A missile's body at impact** (all of it for HE and EMP, the rest beyond the penetrator) is a stopped projectile of its mass at its speed: its momentum goes to the hull's body at the entry point and its kinetic energy is heat in the hit cell, by the round rule's own accounting for a stopped round (#296: 46 kN s at 232 m/s, ten M rounds' worth; nothing is "spent" against the books). Flight from rest (4): 600 / 900 / 1500 m in 6.3 / 7.7 / 10.0 s at 190 / 232 / 300 m/s (#54's 8–15 s) |
| Seekers, warheads, EMP (#97, #142) | Game rules only, each one line in `data.js`'s notes: a **seeker** picks the missile's aim point each step from its own side's knowledge model (a), one kind per missile type (IR: a resolved IR source; radar: a resolved zone's centre, scanning itself and so EM-bright; anti-radiation: a resolved EM source; designated: the room its ship targets); with nothing resolved it flies at the silhouette's centre; IR and anti-radiation pick the nearest source of their band resolved this step, radar the nearest resolved zone's centre, and a radar missile radiates `sensor.scanPower` (#296, as built). A **warhead** acts at the hit cell by a channel the kernel already has: HE is a contact burst of `missile.warheadEnergy` (new, 20 MJ, 5–50, k = 3) with `he.coupling` at the face and §13d.1's blast through walls from there (the outside blast of §17 item 5 is this face rule: fragments carry nothing beyond the hull); the penetrator is the round rule with `missile.penetratorMass` (new, 50 kg, 20–100, k = 3) at the impact speed; **EMP disables a section, not the ship** (the owner, #292, superseding the whole-ship reading of this row and of #97's "forces a SCRAM, capture"): a field of #99's shape with budget `missile.empEnergy` (new, **2 MJ**, 2–40, k = 3) and `emp.radius` (new, **20 m**, 20–80, k = 1); every **powered room** whose centre receives a dose of at least `emp.scramDose` (new, **1.47 MJ**, 0.2–5, k = 2) is hit: a reactor **SCRAMs** (then `reactor.restartTime`, #243), any other room **shuts down for `emp.outageTime`** (new, 5 s, 2–8, k = 0; below `battle.disabledSeconds`, so an outage alone never ends a battle: a reactor's SCRAM or a bridge's decapitation does); the shield's buffer at the burst point pays first like a round. Reach r = R √(E / D − 1) = **12.0 m, 2.4 cells** (4). Numbers (4): the HE burst puts 10 MJ into the hull (a crewed cell absorbs 1.48, a reactor cell 15); the penetrator at 232 m/s is 0.59 of an M round (one crewed cell from 900 m of flight; **in a battle at 900 m it flies about 870 m from the bay's face and arrives at about 228 m/s, under the 230.1 m/s a crewed cell needs, and stops in the first cell**: #298, L5c's fix round; it passes one cell from 1500 m, and `missile.penetratorMass` 20–100 kg is the lever, judged at L5e); on R1 a burst at a hull segment reaches the reactor from 6 of its 38 segments, the bridge from 4, both weapons from 2, the engine from 10; a missile at the silhouette's centre from −y bursts on the bridge's face and reaches reactor, bridge and shield generator (a capture: R1's reactor and bridge sit on its −y hull), from +y only heat sink and quarters, from the bow only the beam bay, from the stern only the engine; a charged buffer absorbs the whole 2 MJ anywhere on R1 (its farthest hull point is 37.5 m from the generator, g = 0.53, 5.3 MJ of cover): **the EMP route is the counter to running cold, and it needs the scan** (the designated seeker on a known reactor or bridge; placement is a shipyard choice) |
| Point defence (#93, two fittings) | Both engage **missiles only**, in the arc of their hull segment (the outward half-plane) **and within `pd.range`** (#296), the nearest incoming first (an automatic rule, §8); the kinetic fitting needs no power (its host controlled and up), the laser its host's power; a flak burst doses every missile of that side by its distance; the lead is on the missile's velocity (#296, as built). **Kinetic**: `pd.fireRate` M flak rounds (new, 2 /s, 1–4, k = −1) from its own store `pd.ammo` (new, 40, 20–100, k = 0; refilled between battles, #90), each a round with lead on the missile that bursts at closest approach with `he.blastEnergy` over a field of radius `flak.radius` (new, 10 m, 5–20, k = 1); the missile dies when the dose reaches its hp (within 15.3 m, (4)); its miss is physical (the missile's acceleration over the flak's flight, 3.75 m in 0.5 s). **Laser**: `pdLaser.power` (new, 1 MW, 0.3–3, k = 2) on the missile while in arc, no falloff (#230), draw at `beambay.efficiency`, heat in its room; a missile dies in hp / P = 0.6 s. Six missiles 0.5 s apart from 900 m: the counts each fitting kills inside `pd.range` are hand-worked by W9 from the missiles' kinematics and the kill times (#296: the plan's "4 and 5 over the last 2.6 s" assumed a window the rule did not have); the Swarm's law is munitions against point-defence throughput |
| Round types (#94, #96) | Five entries of one table `ROUNDS` in `data.js`, each the M round with **one parameter traded**: Standard (as today); AP (length × `rounds.apLength` 1.5, 1.2–2: thinner, higher s₀ and S, no burst); HE (steel × `rounds.heSteel` 0.5, 0.3–0.8 of the mass, the rest `he.blastEnergy` as a contact burst at the stopping cell: shallower, a blast); Sabot (mass × `rounds.sabotMass` 0.5, 0.3–0.8 at velocity × `rounds.sabotVelocity` 1.3, 1.1–1.6: less recoil, less momentum, a flatter flight); Flak (point defence's round). A magazine holds one type per load slot; **the shot's type is chosen automatically against a resolved target** (#95): HE on a room on the hull face, AP on a room behind at least one cell, Standard otherwise and on a zone. The estimate prints each type's depth in crewed cells and its magazine-entry speed (section (10), #295). **Prices and counters (#295, #94)**: by the round rule AP and Sabot as first planned were strictly better than Standard (the same recoil and count, deeper or flatter), so each pays: **AP's length is paid with its rate** (`turret.fireRate` / `rounds.apLength`: 0.33 /s for M, a longer round rams slower; no constant); **Sabot's velocity with its recoil** (the sabot petals leave the muzzle with the penetrator: the gun's impulse is the full round's mass × v, 1.3 × a standard round's, and the magazine holds a sabot round at the full mass, so no more rounds); **HE's burst with depth** (s₀ 0.79 × M, momentum 0.5). Numbers (10): Standard passes 1 crewed cell, enters a magazine behind a hold at 705 m/s and behind a crewed cell at 333 (no detonation); AP (s₀ 1.31 × M) 728 and **444 m/s (detonates: #288's one-cell screen is Standard-only)**; HE 681 and 212; Sabot (s₀ 1.03 × M, time of flight × 0.77: R1d's dodge in it 4.0 m for 6.7) 921 and 452 (detonates); a 0.2 m plate stops all four. **Counters, one per type**: Standard — a crewed screen before the magazine (or a plate); AP — a plate, the only screen; HE — a plate (the burst lands outside the hull, and fragments carry nothing beyond it); Sabot — a plate, and the recoil it costs its shooter. No type is strictly better: Standard keeps the most momentum into its stopping cell at the least recoil and the full rate |
| Firing window (#100) | A round or beam leaving its own ship never meets its own field (in the L4 loop a round is tested against the other ship's hull only, so this clause holds by construction: the open segment is the rule to build, #295); while it crosses its own field's hull segment (one step for a round, every step for a firing beam) that segment is **open**: a round of the other side entering through it in that step meets no field. No constant |
| Room size S (§17 item 30, #62, #259) | Every 2 × 2 room gets an **S footprint of one cell** (quarters and missile bay 2 × 1; engine 1 × 2 with the exhaust face; beam bay and railgun 1 × N): the kernel's size rule applies (`cellRatio` 1/4: power, crew, capacity, explosion; **every rate-like quantity by cell count over M's at the same length**, S 1/4 and L 9/4 alike, #296; a turret's rounds by `sizeLinear` as built: S rounds at 0.75 /s). Munition sizes keep `FIXED.sizeLinear` (2/3): the room's ratio is its cell count, the round's its linear size, two different things, stated (#259 (1)). **Mass by contents** (#280, #281): the turret in L5m (structure plus `turret.mountMass`); the **missile bay** here, as structure plus a launcher of 13.5 t per M bay (range 12.2–15.2 t, the Mk 41 tactical module and its siblings; secondary only, flagged in its note, #281 (3)); the **railgun** here at `cellMass.railgun` as today (no source found for a launcher or its pulsed power; volume only: 32 MJ of pulsed power fits a 20 ft container, so the N = 2 gun's 67 MJ store fits its own cells, #281 (4)); the reactor unchanged (#281 (1)). `buildShip` threads a blueprint room's `size` to `addRoom` (today it drops it: the probe of #295 built an "S" reactor with four cells). Numbers (6): S reactor 150 t and 5 MW; throughput per cell S 1.33, M 0.75, L 0.75 kg/s; an R1 on an S reactor weighs 500 t at 3.06 g: **E6's 60 %-budget ship exists only with S rooms** |
| L5c as built (#296, #298; PR #88) | **`he.coupling` is a flat burst efficiency**: the fraction of a contact burst's energy that enters the hull at any stopping entry, a hull face or an interior cell (the rest vents through the entry channel; a stand-in, #298: §13d.1 defined it for an open face and the kernel applies it everywhere a round stops). **A missile's body joins the hull before its warhead acts** (so an HE burst never turns it into debris, #298). **Point defence reads a missile's true position within `pd.range`** (an automatic rule of the fitting's own sensor, not the ship's knowledge model, #298). **HE**: the round's flying and stored mass is its steel (3 kg; a magazine slot still counts a full round's mass), the burst only where it stops, outside the hull at a plate (nothing enters), the HE warhead the same. **EMP's "powered room"**: a room with a power function joined through live walls to a producing reactor, plus the bridge on its backup; a switched-off generator counts; holds, magazines, heat sinks and the missile bay (no draw) are immune (the bay's draw and cook-off: §17 item 46). **Legacy magazine slots** (`apMass`, `heMass`) fly as Standard; typed rounds come from the `rounds` load. **The window's events** go to a battle-level log (`battle.log`) until L5d's symmetric loop folds them into the sides' logs (H1 re-records). `roundEm` stays non-enumerable until L5d (item 45 (c) moved). W3's Δv is 0.013894 m/s on R1d-L (1 439 484 kg; the plan's 0.0137 was on the pre-L5m R1d) and its spin is not 0: R1d-L's centre of mass sits 2 m off the bore (#296) |
| Damage channels × new resisting objects (#270 (3)) | A **missile** in flight: kinetic (none: too fast for flak's lead, by design, no rule), beam (a PD laser or the spinal beam: energy / (q × mass)), blast (flak: dose ≥ hp), heat (none). A **railgun room**: as a plant cell of `cellMass.railgun` (every channel by mass, #240 (1)). A **slug**: the round rule (steel). The firing window: no object |

**(d) The helm and the enemy (L5d; `js/helm.js`, `js/enemy.js`; #36–#40, #111–#117, #252, #273 (5))**

| Rule | Statement |
|---|---|
| The moving loop | `battle.js` becomes symmetric: two **sides** with the same step (aim, helm, beams in, step, beams out, launch, fly rounds and missiles, point defence, cull, end), each firing at the other; the attacker/target asymmetry of L4 stays as a case setting (a static side has no helm). Two ids spaces become one (§17 item 35); the loop's energy and angular books (b) hold with both ships moving. The L4b scenarios keep passing (their target has no helm and their attacker's plan is a standing order) |
| Standing orders (#38): 12 slots | `helm.js` executes them each step from the side's knowledge model: *movement* engagement range (close / hold / open = `helm.rangeClose` 600, `helm.rangeHold` 900, `helm.rangeOpen` 1500 m, new, k = 1, the #54 band), position (bow / flank / stern of the enemy, by its silhouette's heading), style (hold / orbit / strafe), dodging (off / on: the throttle's sign across the line of sight flipped on the seeded stream for the enemy, on a fixed schedule for the player, #240 (3)); *firepower* facing (bow-on / broadside), firing style (salvo / ripple: every weapon at once, or spread over the reload), open fire (in range / sure hit: a lead within one cell of the aim point over the time of flight), default target priority (weapons / power / bridge / nearest, from known rooms, else the zone with the most unknown cells); *energy* power priority (the list `routePower` already takes), repair priority (the quarters' field order), heat discipline (a threshold fraction of hot and the response: weapons hold / shield off / engine off); *emission* posture (cold / normal / full: engine, shield, scans as (a)), auto-scan (off / on: scan the nearest unresolved zone). Conflicts resolve position, then facing, then dodging (#40): each is a wanted heading or thrust; the later one yields where they disagree. The heading controller is L4b's (no constant); thrust is the engine at the throttle the orders ask |
| Presets (#39) | A preset is a full set of the 12; three ship with the kernel (Fire, Cool, Evade as prototype v2 named them, as data in `data.js`); the verb switches presets, never a slot. The player's verbs in Mission 0 are inputs of a case (scan zone k at t, target room r at t, preset p at t) |
| The enemy (#111–#117) | `enemy.js` is the **same automatic layer and orders** plus a decision each `enemy.decisionInterval` (new, 1 s, 0.25–5, k = 0): which zone to scan (the auto-scan rule), which room to target (the priority order, from its model), which preset (a when → do table on its own state: heat above its caution threshold → Cool; buffer below it → Evade; else Fire). **Personality** (#117) is four numbers in [0, 1] that set the thresholds: aggression → the engagement range and open-fire rule; patience → zones resolved before the first targeted shot (0 to 6); caution → the heat and buffer thresholds for Cool and Evade; resolve → the surrender rule below. Deterministic, no learning, same delays: its decisions draw from the seeded stream only for dodging (#240 (3)). The wildcard (#120) is a personality draw at battle start from the seed: the mechanism, no content |
| Surrender (#85, #86, #273 (5)) | A ship with no able weapon strikes its colours at `battle.disabledSeconds` × resolve after losing its last (#303; resolve 0 strikes at once; at resolve 1 the timers coincide and Disabled ends it: it fights the whole timer hoping a weapon comes back, an overheated turret cools, a cut wall is repaired); the event `surrender` ends the battle as a capture (the same loot, #83) with its own end kind. The route of #82 that L4 moved (#252) |
| The EMP route (#252, #292) | An EMP warhead on a ship with shields down SCRAMs the reactors **in its reach** (60 s to restart > 10 s: Disabled, a capture, when every reactor is in reach or the bridge is, which decapitates) and shuts the other rooms in reach for `emp.outageTime` (5 s): a bow burst takes both of R1's weapons out for 5 s and ends nothing, a stern burst stops its engines for 5 s (the escape coupling, IDEAS.md's tracking mines); the shield is the counter; the scan is the prerequisite |
| Play harness (`tools/play.mjs`, #277; L5d, after the knowledge model and the verbs exist) | A **text interface** on one side of a battle: every `n` seconds (an argument) it prints that side's knowledge model as text (the silhouette, the resolved zones and rooms, the sources resolved, its own heat, buffer, ammunition and able weapons) and reads one verb from stdin (`scan <zone>`, `target <room>`, `preset <name>`, or nothing); the other side is the enemy of this pass; at the end it prints the cascade tree and the per-second log and the replay line `tools/duel.js --seed … --inputs …`. No LLM in the code, no network, no key: the player is whoever types, so an agent session (the exploit hunter of #134, sonnet, 2–5 USD a hunt) plays it reading only the text of its knowledge model (#42), and the owner can play it before any rendering exists. A result without its replay line does not count (`CLAUDE.md`) |
| **Escape** (the owner, #293: an outcome; its cost no loot and mission failed, ship and crew kept; the enemy may escape by personality) | A side whose movement order is **`disengage`** (the fourth value of the range slot: thrust away along the line of sight, stern to the enemy) **escapes** when the separation has exceeded `battle.cullDistance` (3000 m at T1, k = 1: beyond it nothing can hit, rounds are culled) **and kept growing for `battle.disabledSeconds` (10 s) of consecutive steps counted only beyond that distance** (#293: the widening runs after the distance passes 3000 m, so a loop-around at the edge is not an escape; no new constant); the event `escaped` ends the battle with its own end kind naming the side; both ordering it: the first to order; neither: no escape, the battle runs to its limit. The enemy orders `disengage` when its heat or its buffer crosses its caution threshold while it still has thrust and **resolve < 0.5**; at resolve ≥ 0.5 it fights to the surrender timer. Numbers (hand-worked from the kernel's constants, §13n.3 (5)): R1 (1.68 g) leaves R1d (1.08 g) from 900 to 3000 m in 26.7 s, a pursuer without thrust in 16.0 s, equal ships never separate; a 5 s stern EMP (#292) on an equal pursuer gives the runner 82 m/s and 206 m, then 3000 m in about 28 s more, and the escape 10 s after that; a 5 MW beam held on the runner's engine burns its six cells (5.7 t each, 17.1 MJ) in about 20.5 s, so running from an intact beam ship at 900 m fails: escape needs the pursuer's beam or engines out, or range. E5 counts an escape as a **loss** for the side that escapes; E7 escapes end early and the sweep flags any build whose escape rate passes 25 % as it flags ends under 60 s |
| Magazines lasting the battle (#92, §17 item 42) | Measured, not a criterion: the rounds each side fires in the reference battle (e) against `magazine.capacity`; tuned at L5e within its range if a disciplined battle runs dry before minute 3 |
| L5d's amendment (#301, after the probe) | **The knowledge setting stays a case setting; orders and the enemy require it.** The L4b–L5c cases keep the setting they were locked with: a case's `plan` is a **test input** (the kernel's validation of routes), read from the truth when the case's knowledge is off and from the shooter's model when it is on; `helm.js`'s target rules and `enemy.js` read only the model, and `createBattle` refuses orders or an enemy with knowledge off. **The probe** (a scratch tree, nothing recorded; `tools/estimates/l5d-probe.diff` with its command; baseline 140 of 140 PASS): with the model forced on and nothing scanned (P1) 16 of 140 rows fail (routes stall at zone centres, books cases change); with every zone revealed once at t = 0 and aims by the model (P2) 17 move, 15 of them failing (the shooter keeps firing at cells its model still shows standing); with the model re-revealed every step (P3, the model = the truth) only the 7 cases locked with knowledge on move; the other 133, every battle case locked with knowledge off among them, are unchanged: the sensing step and its events move nothing, and H1 holds with the plan as a test input. **Plan advancement by the model** (§17 item 45 (a)) applies to plans with knowledge on: a plan room is lost to its shooter when its model knows the room and no standing cell of it (an unknown room stays the target, aimed at the case's zone); the missile plan the same; the probe (P4): **140 of 140 rows unchanged**. **The helm's laws, no prototype setting** (prototype v2's `AUTOPILOT` settings retire): the **range order** flies the wanted range rate ṙ* = −sign(e) a (√(2 \|e\| / a + t₁₈₀²) − t₁₈₀), e the range error, a the ship's acceleration at the preset's throttle, t₁₈₀ its 180° turn on the RCS couple (both from `readout`: a ship that must turn its engine round to brake brakes that much earlier), and takes the heading and the engine from when \|e\| > `helm.rangeBand` or the relative velocity's error from (ṙ* along the line of sight, 0 across it) exceeds a t₁₈₀ (a dodge's drift) until \|e\| ≤ `helm.rangeBand` with the relative speed at most `helm.rangeBand` / t₁₈₀ (#302, superseding #301's engagement clause); the engine opens at the preset's throttle × max(0, cos of the heading error) (the wanted component, no tolerance); **facing** bow-on points the bow along the line of sight, broadside the nearer beam; **dodging** (broadside only: bow-on it yields to facing, #40, #237) turns to the other beam with the engine open, flipping at intervals drawn on the seeded stream in [`helm.dodgeMin`, `helm.dodgeMax`] (new, 6 s, 2–10, and 14 s, 6–30, k = 0: prototype v2's values, the ones the owner played, #263) for the enemy and at their midpoint for the player (#240 (3)); **the turret leads** on the other ship's velocity as its model's silhouette gives it (the intercept of a round at muzzle speed with a point at constant relative velocity, the smallest positive root: prototype v2's formula, now kernel); **open fire 'sure hit'** fires when ½ × the other ship's acceleration across the line of sight (from its last three silhouette poses) × t_f² is under one cell edge. **What L5b and L5c left** (§17 items 44–46) is built in L5d: the scan's progress and radiated power × the host's power fraction (45 (b)); a case with plates in the model, R1d scanned (45 (d)); successors of S4, S5 and S6 closing the checker's gaps (45 (e)); the model keeps no reference to the other world, the battle senses with both (45 (a)); every missile bay fires by its orders (45 (g)); **the missile bay draws power as the turret does, launches only when joined to a producing reactor, cooks off at `thermal.magazineCritical` by its store as a magazine does, and so is a powered room for EMP** (46); every k = 0 constant read through `tierScaled` (44; no row moves). **Escape and dodge by the integrator's sum** (the kernel integrates v then x: after n steps from rest x = a dt² n (n + 1) / 2, ahead of ½ a t² by ½ a t dt): R1 from a pursuer at rest passes 3000 m at step 958 and escapes at 1558; from R1d thrusting after it at steps 1600 and 2200 (§13n.3 (11); the kernel driven by hand agrees to the step); H4's misses at 900 m are **10.42 / 6.68 m** on the L5m masses (the plan's 10.0 / 6.5 were the pre-L5m ships). **#293's frame corrected**: "running from an intact beam ship at 900 m fails" holds only with the runner's shield down and a pursuer that closes after the engine dies: driven by hand with no helm, with the runner's shield up the 5 MW beam never reaches the engine and R1 escapes R1d at step 1907 (31.8 s), and with shields down the engine burns out at 22.45 s, 2075 m apart ((11)); **H11's records with R1d under a helm on Fire** (#306): shield up, 3000 m at step 1155 and `escaped` at 1755; shield off, 1253 and 1853: the runner passes 3000 m before the engine burns out; so H11's second case is kernel-read and labelled, and the sweep's escape-rate flag (> 25 %, (e)) is the measure. **The prototype page on the L5d kernel** (the owner's ask, 2026-10-23): after L5d merges, one engineer session (`proto/l5d`, opus) replaces `proto/battle.js`'s own loop by the kernel's symmetric loop: the player's side driven by the page's three verbs (scan a zone of the silhouette, target a known room, switch preset), the enemy by `enemy.js` at personality 0.5 (the standard enemy, (e)); the page **draws the enemy as the player's model knows it** (the silhouette, the resolved zones' cells, the resolved sources; §7, #42: the renderer reads only its side's model); both ships R1d-A (R1d with the hold's antenna); `proto/replay.mjs` replays the page's export through `tools/duel.js`'s inputs; `proto/smoke.mjs` with zero console errors; the stand-in `AUTOPILOT` and `SCRIPT` removed. The lead designer republishes the page with the Artifact tool (`js/` beside it, the import prefix `../js/` rewritten to `./js/`, as version 6). Never a Mission 0 result (#217) |
| L5d as built (#303, #306; PR #94) | **Surrender** `battle.disabledSeconds` × resolve (#303). **Position**: the wanted point at the range order's R* on the named side of the other ship by its silhouette's heading (flank the nearer), on the braking curve. **Style** (#307, superseding #306 (3)): hold keeps #302's tests; orbit wants a tangential speed v_t = `helm.rangeBand` / t₁₈₀ counter-clockwise, strafe the same with its sense flipping on the dodge schedule; with either the position slot is ignored, the range order engages when \|e\| > band or the deviation from (ṙ*, v_t) is at least v_t, and lets go when \|e\| ≤ band and the deviation is at most a dt. **Repair priority** (#307): `none` (proportional sharing, the presets' default) or a room-type list granting a quarters' budget whole-cell in order. **Escape** counts only steps on which the side's `disengage` stands (#307). **Readings**: open fire in range = within `battle.cullDistance`; the heat fraction (T − 290 K) / (hot − 290 K) of the hottest room; emission full re-scans the zone resolved longest ago; t₁₈₀ = 2√(π/α) with α the smaller couple on the flown body now; a ship with no couple does not engage the range order (#306 (8)). **Presets** (data): Fire, Cool, Evade, each the twelve slots and a throttle 0.5 / 0 / 1; their power priority puts shield and guns before the beam bay and engine. **The enemy's mappings** (#117's content): aggression ≥ 2/3 close, ≥ 1/3 hold, else open; ≥ 0.5 fire in range, else sure hit; Cool when the heat fraction > 1 − caution, Evade when the buffers' fraction < caution; patience holds every weapon until ⌊6p⌋ zones; `disengage` a sticky override of the range slot, cancelled when withdrawn (#306 (7)). **The bay** draws `turret.powerDraw`; it and a missile magazine cook off with `missile.warheadEnergy` per missile for every warhead type (#306 (10)). **The repair field** takes g(r) at a damaged cell's room centre (#309 (2)). **Strafe and dodging** draw their intervals from one seeded stream in turn (#309 (4)). **Not built**: a shield field's impulse on the round's line (§17 item 35) and a missile's body against a charged field (§17 item 48) |
| The position law (#315, L5e1; supersedes #306 (2)'s position law) | Bow, stern and flank want the point on the circle of radius R* about the other ship, moved from the own bearing toward the named one by at most `helm.positionLead` (60°): P = X + R* (cos φ_P, sin φ_P), φ_P = φ + clamp(wrap(φ* − φ), ±lead); the named bearing still from the other's silhouette heading (flank the nearer side). The path circles at R* instead of crossing the other ship (no collision model, #20). Case: `L4.helm.separation` (the minimum separation of the main bodies ≥ 150 m in five duels) |
| The prototype page as built (#310–#312; PR #96, feel-6) | `proto/` drives the kernel's `createBattle`/`tick` as `tools/duel.js`'s `createDuel` (mirrored in `proto/duel.js`: `tools/duel.js` imports `node:fs`): both ships R1d-A, knowledge on, the player on Fire with the three verbs as the kernel's inputs (tap a known room: target; tap elsewhere on the enemy's grid: scan that zone; Fire / Cool / Evade), the enemy `enemy.js` at 0.5; the enemy drawn only from the player's model (the end panel's cascade tree is the one debrief read of the enemy's log); the export carries `tools/duel.js`'s replay line and `proto/replay.mjs` replays it; the prototype's autopilot, script and the levers the kernel no longer has removed. `L0.determinism.v2`'s duel is this loop's (seed 7, Evade from t = 0) |

**(e) Ship versus ship (L5e; E5–E7; the reference set)**

| Rule | Statement |
|---|---|
| Budget (E5, E6; #277 O1, #279) | A build's budget is its **price by #74's formula with the type factor proportional to the room's M-cell mass**, so until Mission 0 ends price ∝ mass at undock (the readout's, plates and contents included): a 60 %-budget ship is a 60 %-mass ship, and with the same engine it accelerates about 1.7 times harder, a property of the underdog nobody has to write as a rule. Stated cost of this choice (#279): a tonne of armour prices as a tonne of reactor (R1d's 510 t of plates are 35 % of its price), which the economy pass after Mission 0 (§17 item 3) revisits; the reactor's 63 % of R1's mass is 63 % of its price, so **E5 and E6 are measured only after mass pass 2 (L5m)**. R1d 1460.8 t, R1 950.5 t, R1 on an S reactor 500.5 t (6) |
| The reference set (E5) | Four builds on R1d's budget ± 5 %, each centred on one weapon and validated by `validateShip`, in `mission0/builds.js`: **R2** (R1d with an antenna and one point-defence fitting: the gunboat), **Lance** (an N = 4 railgun for the beam bay and turret, a slug magazine), **Swarm** (two missile bays, a missile magazine, two point-defence fittings, no turret), **Furnace** (an N = 6 beam bay, two shield generators, no turret). The exact layouts are the pass's first commit, printed by the estimate script with their masses; the lead designer locks them before the round-robin |
| **The engine's plume** (the owner, #297: the jet has an effect; built in L5e; until then the exhaust is an IR source only, a recorded simplification beside #140) | Behind each live engine at throttle, a cone of half-angle `engine.plumeHalfAngle` (new, 30°, 10–45, k 0; no source: a fusion torch's plume) carries the jet's power, thrust × `engine.exhaustVelocity` / 2 × throttle (75 GW at T1), at intensity P / (π (d tan θ)²) on its axis; it acts on **fittings only** (radiator panels, antennas, point defence) of the other ship inside the cone, each burning by the beam's deposit rule (q × its mass), **never on a hull cell** (the owner's mechanism C: the outcome barely depends on the half-angle for panels and antennas — at 900 m a panel dies in 0.03–1.0 s and an antenna in 0.13–4.1 s across 10–45°; an 8 t point-defence mount in 1.0–33 s, so the angle still matters for it). Play (corrected by #304: panels radiate by T⁴ and matter only once a ship is hot, the first room hot at 1059.5 s with them against 988.9 s without, `tools/estimates/radiators.mjs`): strip antennas → blind, strip point defence → missiles land, strip radiators → hotter only in a long fight; the pursuer offsets by d tan θ (520 m at 900 m, 30°: 7.9 s for R1); the runner pays with its bow weapons turned away and its own heat. Scenario at L5e: `L4.engine.plume` (a pursuer straight behind at 900 m: its bow panels die in ⌈0.34 s / dt⌉ steps at 30°, its antenna in 1.4 s, hand-worked; offset by 520 m: nothing; a hull cell never). If L5e's sweep shows the plume too weak, B (the outermost hull cell too) is proposed then |
| Escape in E5 (#293) | An escape is a loss for the side that escapes in every count of E5 and E6 |
| The degenerate four, now six (E5; #297, #305) | **Brick** (plates on every wall, one S turret), **Glass** (a railgun and a reactor, the least quarters and no plates), **Porcupine** (four S turrets, two magazines), **Fortress** (three shield generators, one turret), **Engine boat** (#297: two engines, one turret, the plume its weapon, running and turning its stern to the enemy), **Cold Brick** (#305: R1d's hull and plates with no radiator panel, IR-dark while its engine is off, a heat store for the battle's length; if it does not lose, the levers are `radiator.area` and the coupled heat capacities): each on R2's budget; each must **lose ≥ 3 of 4** against R2 (the 4 are the three ranges plus a broadside opening, under the standard enemy) |
| The six underdog pairs (E6) | One pair per path, the 60 %-budget ship against R2 with the intended orders and with R2's own: mission kill (the beam bay first), cascade (the reactor's wall: T-neck's lesson), information (a cold ship with an antenna against a scanning one), time window (a heat sink and a long beam against a shield), attrition (a Porcupine of S turrets against a plated R2), mechanism counter (point defence against the Swarm). Each must win with the tactic and lose without it (4 variants as above) |
| The reference battle (E7; #277 O2) | R2 against each of the four, both on the standard enemy (personality 0.5 each), at the three ranges and both openings: the **median of the two-sided battles' ends** (both ships take cell damage; #329) is in 3–6 minutes. The pace figures of §13l.3 (R1d 102–306 s under the prototype's script) are the prior |
| Search harness (`tools/sweep.mjs`, #277; L5e, before E1–E3 are locked) | A **deterministic best-response search** (no LLM, no `Math.random`; `worker_threads` for the cores): from the standard orders, each side in turn changes **one slot** of its twelve (the slot's values from `data.js`), keeps the set that wins most against the other's current set over the three ranges, two openings and the seeds, and the other side answers; three rounds; over every pair of the reference and degenerate builds. It reports every build's win rate, **flags any build or order set that wins above 75 %** (E5's number) and **any end under 60 s**, each with the cascade tree of its fastest win and its replay line: the prototype's "aim the magazine, 7 s" is what it must find on its own. E5's `L5.e5.reference` and `L5.e5.degenerate` run on its output; E6 keeps its fixed pairs (a tactic is designed, not searched). Size (8): about 8 builds × 16 single-slot variants × 3 ranges × 2 openings × 4 seeds × 3 rounds ≈ 9000 battles at about 3 s each on the L4 loop's 0.18 ms per step: 8 hours on one core, under an hour on eight. What it cannot see: an order set outside the slot grid and a sequence of preset switches in time (the play harness's hunter does) |
| Measures as scenarios | `L5.e5.reference`, `L5.e5.degenerate`, `L5.e6.<path>` × 6, `L5.e7.median`, `L5.e8.missiles` (a Swarm battle at T1 under 1 ms per step; (8): the L4 loop runs 0.18 ms), **`L5.route.throughput`** (a measure, #291: R1 and R1d with their panels and heat sinks shot away, cooked by their own reactor and weapons under a real enemy; whether Disabled comes by heat); each prints its table and its PASS/FAIL against the exit criterion's number; `tools/duel.js <build> <build> [--range] [--seed] [--inputs]` replays any cell of the sweep or any played battle |

### 13n.2 Constants (proposed by the lead designer, for veto; T1 values; `approved: true` as the plan's, #272 (2))

| Constant | Value | Range | k | Source or reasoning |
|---|---|---|---|---|
| `sensor.area` | 4 m² | 1–16 | 2 | one antenna's aperture, a phone-sized fitting on a 5 m segment: an estimate |
| `sensor.sensitivity` | 1e-3 W | 1e-4–1e-2 | 2 | the least received power an antenna resolves; chosen so a cold panel fades at 1.7 km (the band's top) and a hot one holds to 7 km |
| `sensor.scanPower` | 100 kW | 20–500 | 2 | a ship radar's peak (an AN/SPY-1 is a few MW mean over a far larger array); EM-bright |
| `sensor.scanTime` | 4 s | 2–10 | 0 | one zone at the reference range: six zones in 24 s, a quarter of a 100 s duel |
| `sensor.scanRange` | 900 m | 500–2000 | 1 | the reference range, `battle.openingRange`'s band; k = 1 (#273 (3)) |
| `sensor.mass` | 1000 kg | 250–4000 | 2 | one antenna fitting, 250 kg/m² of aperture: an estimate, no source (#289) |
| `engine.exhaustVelocity` | 10 km/s | 3–30 | 0 | a fusion torch's jet (chemical 4.5, nuclear-thermal 9, fusion 10–100+); its jet power is the exhaust's IR |
| `magazine.detonationSpeed` | 400 m/s | 200–600 | 0 | between an M round after one crewed cell (333) and after a shield generator cell (485): a crewed screen protects against M rounds, not L |
| `railgun.roundMass` | 10 kg | 5–20 | 3 | the US Navy prototype's slug |
| `railgun.muzzleVelocity` | 2000 m/s | 1500–2500 | 0 | #54's band, for N = 2; × √(N / 2) |
| `railgun.fireRate` | 0.1 /s | 0.05–0.3 | −1 | 6 rounds a minute, a prototype's rate |
| `railgun.efficiency` | 0.3 | 0.1–0.6 | 0 | a pulsed-power train's wall-plug efficiency |
| `missilebay.readyMissiles` | 2 | 1–6 | 0 | #148 |
| `missilebay.launchInterval` | 2 s | 1–10 | 0 | one tube reloading from the store |
| `missile.mass` | 200 kg | 100–500 | 3 | a light anti-ship missile |
| `missile.acceleration` | 30 m/s² | 10–100 | 0 | 3 g: 8–15 s of flight at the band (#54) |
| `missile.burnTime` | 20 s | 10–40 | 0 | its fuel, the only accounting of it |
| `missile.warheadEnergy` | 20 MJ | 5–50 | 3 | 10 M HE rounds; ten times an M HE round's burst |
| `missile.penetratorMass` | 50 kg | 20–100 | 3 | a steel rod of the round's shape |
| `missile.empEnergy` | 2 MJ (10 in #278) | 2–40 | 3 | the floor of its range: a section's reach, 12 m with the two below (#292) |
| `emp.radius` | 20 m (40 in #278) | 20–80 | 1 | the floor of its range; the shield's field shape (#292) |
| `emp.scramDose` | 1.47 MJ (1 in #278) | 0.2–5 | 2 | the control electronics' tolerance, an estimate; k = 2 with the room's face; chosen with E and R for a 12 m reach (#292) |
| `emp.outageTime` | 5 s | 2–8 | 0 | a powered room in an EMP's reach is shut down this long; under `battle.disabledSeconds` (10 s) so an outage alone never ends a battle (#292) |
| `pd.fireRate` | 2 /s | 1–4 | −1 | an autocannon's useful rate against a few missiles |
| `pd.ammo` | 40 rounds | 20–100 | 0 | #93: can be exhausted in 20 s |
| `flak.radius` | 10 m | 5–20 | 1 | a fragmentation burst's half-strength radius |
| `pd.range` | 600 m | 300–1500 | 1 | point defence engages a missile only within this range of the fitting: a laser's spot and tracking, a flak round's reach (#296: without it a laser killed every missile from launch and W9 could not be written) |
| `pd.mass` | 8000 kg | 4000–12000 | 2 | one kinetic point-defence fitting: the 76/62 SR mount without ammunition, 7.9 t, the source of `turret.machineryMass` (#281 (2)); a gun that fires M flak rounds on a pedestal (#295) |
| `pdLaser.mass` | 4000 kg | 2000–8000 | 2 | one laser point-defence fitting: a 1 MW laser's optics and power conditioning; an estimate, no source (#295) |
| `pdLaser.power` | 1 MW | 0.3–3 | 2 | a fifth of a spinal beam; kills a missile in 0.6 s |
| `rounds.apLength`, `rounds.heSteel`, `rounds.sabotMass`, `rounds.sabotVelocity` | 1.5, 0.5, 0.5, 1.3 | 1.2–2, 0.3–0.8, 0.3–0.8, 1.1–1.6 | 0 | the one parameter each type trades (#94) |
| `helm.rangeClose`, `helm.rangeHold`, `helm.rangeOpen` | 600, 900, 1500 m | 300–800, 600–1200, 1000–2500 | 1 | #54's band; prototype v2's values |
| `enemy.decisionInterval` | 1 s | 0.25–5 | 0 | the enemy's cadence; the same delay the player's taps have |
| `helm.rangeBand` (#302) | 100 m | 25–300 | 1 | the range order's dead band: it engages beyond it and lets go inside it at a relative speed under band / t₁₈₀; prototype v2's dead band, the one the owner played (#263) |
| `helm.dodgeMin`, `helm.dodgeMax` (#301) | 6 s, 14 s | 2–10, 6–30 | 0 | the interval between dodge flips, drawn on the seeded stream for the enemy, their midpoint for the player: prototype v2's values, the ones the owner played (#263); a broadside ship needs 5–8 s to turn to the other beam (§13n.3 (5)) |
| `engine.plumeHalfAngle` (L5e, #297) | 30° | 10–45 | 0 | the half-angle of the exhaust's cone; no source for a fusion torch (chemical nozzles 10–20°, vacuum plumes wider); 30° is the row where a plate would be "nearly immune" and the pursuer's offset at 900 m is 520 m |
| No change | `kinetic.hitsToWreck`, `armour.plateThickness`, `battle.disabledSeconds` | — | — | levers for the pace study, not changed here |

### 13n.3 Estimates (T1; `node tools/estimates/l5.mjs`; sections in brackets)

- (1) Passive ranges: a cold panel 1.7 km, a hot panel 7.3 km, a scanning antenna 5.6 km, an absorbing shield 40 km, the exhaust at full thrust 5000 km. A zone 0.79 / 4.0 / 30.9 s at 600 / 900 / 1500 m, six zones 4.7 / 24 / 185 s; one zone at 900 m is 3.6 times of flight.
- (2) M round entry speeds: after a hold 705, two holds 605, a shield generator cell 485, two beam bay cells 431, one crewed cell **333** m/s; a plate stops it. R1's magazine: one shot from the hold side (four today); R1d's: the seventh (ten today). Chord loss 0.3258 at 0.9774. The full magazine's blast: every room wrecked, crew 0 / 44, destroyed by pieces on R1 and R1d (1.2 GJ against 94 MJ).
- (3) Railgun N = 2: 2000 m/s, s₀ 2.96 × M, three crewed cells, 1078 m/s into a magazine behind a bridge, stopped by a reactor cell; 6.67 MW mean, 4.67 MW heat, plant hot alone in 1196 s; recoil 1.4 cm/s on R1d.
- (4) Missiles: 6.3 / 7.7 / 10.0 s of flight, 190 / 232 / 300 m/s at impact; hp 0.6 MJ; HE 10 MJ into the hull; the penetrator 0.59 × M (from 900 m of flight; in battle at 900 m about 228 m/s and no cell passed, #298); EMP reaches 12.0 m (2.4 cells) shields down: on R1 the reactor from 6 of 38 hull segments, the bridge from 4, both weapons from 2, the engine from 10; nothing behind a charged buffer anywhere on R1 (#292); kinetic PD kills within 15.3 m, 20 s of fire; laser 0.6 s per missile; six missiles over 2.6 s: 4 (laser) or 5 (kinetic) killed.
- (5) Dodge over a time of flight at 600 / 900 / 1500 m: R1 4.4 / 10.0 / 27.7 m, **R1d 2.9 / 6.5 / 18.1 m** (a cell 5 m): the plated ship barely dodges at 900 m; 90° on the RCS 3.80 / 5.83 s.
- (6) S reactor 150 t, 5 MW; throughput per cell S 1.33 / M 0.75 / L 0.75 kg/s; R1 on an S reactor 500.5 t at 3.06 g.
- (7) The L4 loop on the head: B1 Disabled 33.117 s (step 1987), R1d's magazine destroyed 19.100 s (step 1146), unchanged.
- (8) 0.181 ms per step on the L4 loop (budget 1 ms).
- (11) L5d (#301): by the integrator's sum, R1 passes 3000 m from a pursuer at rest at step 958 (½ a t² gives 15.973 s, the sum 15.967 s) and escapes at 1558; from R1d thrusting at 1600 and 2200; driven by hand on today's loop the kernel agrees to the step; R1d's beam on R1's engine: shields up, the engine intact and R1 escapes at step 1907; shields down, the engine burnt out at 22.45 s, 2075 m apart. Dodge misses from rest over the time of flight at 600 / 900 / 1500 m: R1 4.63 / 10.42 / 28.94 m, R1d 2.97 / 6.68 / 18.55 m.

### 13n.4 Scenarios (each locked in a commit of its own, under §13k.4's conventions and #273's pre-lock rule)

| # | Pass | Name | Setup | Expected and criterion |
|---|---|---|---|---|
| K1 | L5a | `L0.kinetic.chord.loss` | an M round through hold cells at chords 1, 0.9774, 0.5, 0.05 | each passed cell loses chord / `hitsToWreck` (hand-worked literals 0.3333, 0.3258, 0.1667, 0.0167) at 1e-12; the stopping cell as today |
| K2 | L5a | `L2.magazine.detonation` | an M round into a magazine through a hold, through a crewed cell, through a plate; an L round through a crewed cell; the threshold swept 200–600 | detonates iff the entry speed ≥ the threshold: 705 / 333 / none / 489 m/s (hand-worked from the round rule); a destroyed magazine cell alone: no explosion; cook-off unchanged |
| K3 | L5a | `L4.kill.v3` (successor of `L4.kill.v2`'s magazine cases, withdrawn under this row) | R1 and R1d from −y at the magazine | R1: shot-1 detonates (one hit), R1d: shot-7 (the two hold cells by shot 4, the plate's fifth stopped round at shot 6, the hole at shot 7: kernel-read, labelled); the end `destroyed` by **pieces**, not by the explosion; the reactor case unchanged |
| K4 | L5a | `L2.magazine.types` (`.v2` withdrawn under #296 for `.v3`: its missile row said `loadMagazine` throws until L5c) | a railgun magazine, a missile magazine, a turret magazine | the turret is fed only by its type; the slug magazine's energy 0; `magazineContents` per type |
| K5 | L5a | `L1.room.unmanned` | a turret whose crew die at critical heat with its cells intact | no shot after the `crew-died` step; `unmanned` in the able rule with that parent |
| K6 | L5a | `L4.books.energy`, `L4.books.angular` | B1's battle and a spinning target | energy across the two ships closes at 1e-9 × gross; angular momentum at 1e-9 × gross + 1e-12 (B2); a stopped round's mass in the hull's body (B4); heat split by energy (L4) at 1e-12 |
| K7 | L5a | `L4.pace.r1d` (a measure, not a criterion) | `pace.mjs` R1d bow-on and broadside at the three ranges, 10 seeds | the medians printed and recorded in the row's note |
| K8 | L5a | successors | every scenario whose record moves under B2–L4 (the engineer lists them, withdrawn as superseded by the row) | identical except the new books |
| S1 | L5b | `L1.sensor.passive` | one antenna against one panel at 290 and 600 K and against an exhaust at the three ranges | resolved iff P A / (4π d²) ≥ sensitivity (hand-worked: 1695 m, 7255 m) |
| S2 | L5b | `L1.sensor.active` | one antenna scanning one zone of R1 at 600 / 900 / 1500 m (d from the antenna's edge midpoint to the zone's centre, hand-worked from the cells, #289) | resolved at step ⌈t / dt⌉ with t = 4 (d / 900)⁴ s, one-sided [t, t + dt); the zone's cells, rooms and integrities in the model; nothing of other zones; the silhouette in the model at every range before any scan (#23) |
| S3 | L5b | `L2.sensor.reveal` | the scanner scanned back | the scanner's antenna segment resolved by the other side before its zone resolves (EM at d⁻²) |
| S4 | L5b | `L2.sensor.memory` | a zone resolved, then a cell destroyed, then a re-scan | the model keeps the old integrity until the re-scan; a panel's temperature class tracks passively |
| S5 | L5b | `L2.sensor.shield` | an absorbing shield at 900 m | its generator's room resolved as an EM source while it absorbs, not after (#103); scans pass the field |
| S6 | L5b | `L3.sensor.control` | an antenna on a room cut from the bridge | no scan (needs a control path); passive still resolves |
| S7 | L5b | `L4.target.known` | the L4 attacker with an antenna on its hold and `knowledge: true`, the plan's turret on R1's magazine, the case naming a zone that holds it; the zone unresolved then resolved | before: the shot goes to the zone's centre; after: to the room (the hit's path differs: kernel-read, labelled) |
| S8 | L5b | `L0.sensor.tier` | S2 at T1 and T3 | the same zone at the same distance in cells resolves in the same step (k = 1) |
| S9 | L5b | `L2.sensor.posture` | a ship running cold (engine off, shield off, no scan) against one at full (engine at throttle 1, shield on, scanning), the cold ship's turret firing at the full one's shield (a shield is an EM source only while it absorbs, #103) | the cold ship's sources: panels only; the full one's: exhaust and antenna resolved, the shield in the steps it absorbs |
| W1 | L5c | `L1.railgun.fire` | an N = 2 and an N = 4 railgun alone, fed, routed | muzzle speed 2000 / 2828 m/s (hand-worked), rate 0.1 /s, draw 6.67 / 13.3 MW mean, heat to plant hot one-sided (1196 s for N = 2 alone) |
| W2 | L5c | `L0.railgun.slug` | the slug through crewed, plate and reactor columns; a 0.4 m plate (`--set`-free: the case builds the plate at the range's top through run-time params) for N = 2, 4, 6 (#295) | passed 3 crewed cells; 1078 m/s into a magazine behind a bridge; stopped by a reactor cell; the 0.4 m plate stops every slug (the round rule, hand-worked) |
| W3 | L5c | `L3.railgun.recoil` | one shot on R1d-L | Δv 0.013894 m/s along the axis (20 kN s over R1d-L's 1 439 484 kg less the slug, hand-worked; the plan's 0.0137 was the pre-L5m R1d, #296) and a spin of (r × J) / I with R1d-L's centre of mass 2.0 m off the bore (kernel-read r and I, labelled; #298) |
| W4 | L5c | `L1.missilebay.launch` | a bay with its store and magazine | one launch per interval; the store refilled by the feed; the bay's explosion energy by its store |
| W5 | L5c | `L0.missile.flight` | a missile from rest to 600 / 900 / 1500 m | arrival step by ½ a t² one-sided; speed a t; coasting after burnTime |
| W6 | L5c | `L2.missile.seekers` | each seeker kind against a target with one resolved source of its kind and one without | the aim point is the source; with nothing resolved, the silhouette centre |
| W7 | L5c | `L2.missile.warheads` (withdrawn under #296 for `L2.missile.warheads.v2`: the body's impulse and heat, the penetrator through the battle's warhead path) | HE, penetrator and EMP on R1's hull, each flown by `createBattle` | HE: the face coupling then the blast's absorbed table (hand-worked for the hit room); penetrator: the round rule at 232 m/s (one crewed cell); EMP (#292): a burst on R1's −y face under the reactor SCRAMs it and shuts the bridge and shield generator for `emp.outageTime` (their centres within 12.0 m, hand-worked from the field), nothing farther; a bow burst shuts the beam bay only; nothing behind a charged buffer; a room's outage ends at `emp.outageTime` one-sided |
| W8 | L5c | `L1.pd.kinetic`, `L1.pd.laser` | one missile into each fitting's arc; one outside it | killed at the flak's closest approach ≤ 15.3 m (hand-worked) / after 0.6 s in the beam; the store counts down; outside the arc nothing |
| W9 | L5c | `L2.pd.swarm` (#296) | six missiles 0.5 s apart from 900 m into one fitting of each kind, `pd.range` 600 m | the kills of each fitting hand-worked from the missiles' kinematics inside the range and the kill times (laser hp / P = 0.6 s each in turn; kinetic one flak per 1 / `pd.fireRate`, each killing at its closest approach), the rest hit; the laser's kill steps checked (the `l5c.laser.power` mutant) |
| W9b | L5e (#299: moved out of L5c) | `L5.e6.mechanism` carries the Swarm's law | the Swarm's bays against R2's one point-defence fitting at the bay's own cadence | measured, not a criterion in L5c: at 1 MW and 600 m a laser kills six missiles launched 2 s apart with none landing (fix round 2's hand-working and run); `pd.range` and `pdLaser.power` are the rung-1 levers if the Swarm never lands |
| W8b | L5c | `L1.pd.kinetic.v2` (successor of `L1.pd.kinetic`, withdrawn under #298: its dose law was not enforced) and `L2.missile.seekers.v2` (successor of `L2.missile.seekers`, withdrawn under #298: its IR and anti-radiation points restated the selector) | as the originals, plus a crossing missile whose bursts fall beyond the kill radius; the hand-worked IR point (panel 8's midpoint (17.5, 0)) and anti-radiation point (the antenna's (42.5, 0)) on the target's pose | the dose Σ E / (1 + (dᵢ / 10)²) at 1e-12 over the recorded bursts, a burst beyond 15.275 m killing nothing by itself; the aim points at 1e-9 m |
| W10 | L5c | `L0.rounds.types` | each round type through crewed cells and into a magazine; a turret firing each type | depth and entry speed by the round rule with the type's parameter (hand-worked: Standard 705 / 333, AP 728 / 444, HE 681 / 212, Sabot 921 / 452 m/s behind a hold / a crewed cell); HE's burst at the stopping cell; Sabot's recoil × 1.3 (the full round's mass, #295); AP's rate 0.33 /s; a 0.2 m plate stops all four |
| W11 | L5c | `L4.rounds.choice` | a resolved hull room, a resolved deep room, an unresolved zone | HE, AP, Standard chosen (#95) |
| W12 | L5c | `L4.shield.window` | both ships' shields on, a round and a beam of each side | own rounds unshielded; the other's round through the open segment in that step unshielded, in the next step shielded |
| W13 | L5c | `L2.size.s` | an S turret, S reactor, S magazine, S quarters | power 5 MW, crew 1, capacity 1/4, S rounds at 0.75 /s; `validateShip` accepts the footprints |
| W14 | L5c | `L4.e8.weapons` | the loop with six missiles and two PD fittings | under 1 ms per step |
| H1 | L5d | `L4.loop.symmetric` | every standing battle case (L4b–L5c) replayed on the symmetric loop, each with the knowledge setting it was locked with, its `plan` a test input (#301) | every record's rows unchanged (the probe of #301: P3 and P4, 140 of 140); the target static (no helm, no orders) |
| H2 | L5d | `L4.helm.range` | hold at each range from 900 m (R1 and R1d, at rest) | the distance settles under #301's law: from the step the range order lets go (the relative velocity within a t₁₈₀ of the wanted one) it does not take the engine again while nothing pushes; the settling step and the overshoot kernel-read and labelled; no constant |
| H3 | L5d | `L4.helm.conflict` | position stern against facing bow-on against dodge | resolved in #40's order (the wanted headings compared) |
| H4 | L5d | `L4.helm.dodge` | R1 and R1d dodging at 900 m against a lead-aimed turret (#301: the lead on the silhouette's velocity), the dodger starting its push at the shot | the round lands 10.42 / 6.68 m from the aim point on the L5m masses, hand-worked by the integrator's sum a dt² n (n + 1) / 2 over the round's whole steps of flight (§13n.3 (11); the plan's 10.0 / 6.5 were pre-L5m), at one step's ½ a t dt |
| H5 | L5d | `L4.orders.fire` | open fire in range / sure hit; salvo / ripple; target priority from a partial model | the first shot's step by the rule; the room chosen by the priority among known rooms |
| H6 | L5d | `L4.orders.energy` | heat discipline at a threshold; power priority | the response at the step the fraction is crossed; `routePower`'s list applied |
| H7 | L5d | `L4.enemy.decide` | the enemy at four personalities against R1d | the zones scanned before the first targeted shot = ⌊6 × patience⌋; the preset switch at its caution threshold; the same seed, the same log hash (E2) |
| H8 | L5d | `L4.route.surrender` | the enemy at resolve 0, 0.5, 1 losing its last weapon | `surrender` at 10 × resolve s (#303), one-sided, for resolve 0 and 0.5; resolve 1: Disabled at 10 s; the capture's loot the same |
| H9 | L5d | `L4.route.emp` | an EMP missile on a ship with shields down and with them up, at the reactor, at the bow and at the stern (#292) | at the reactor: SCRAM, Disabled at 10 s, a capture; at the bow: both weapons shut for 5 s, no end; at the stern: the engines stop for 5 s, thrust 0 then back; nothing behind the buffer |
| H11 | L5d | `L4.route.escape` (#293, #301) | R1 ordered `disengage` from 900 m, starting stern-on (no turn in the hand-working), against R1d with its engines shut and against R1d thrusting after it with no weapon; then against R1d intact under the hold order, the runner's shield up and down; the enemy at resolve 0.25 and 0.75 with its buffer drained below caution | the first two by the integrator's sum (§13n.3 (11)): the separation passes 3000 m at step 958 / 1600 and `escaped` 600 steps later (1558 / 2200), exact; the intact pursuer: kernel-read and labelled (with the runner's shield up the beam does not reach the engine, (11)), the criterion that `escaped` fires on the first step the rule's condition holds on the recorded separation series and never before; resolve 0.25 orders `disengage`, 0.75 does not |
| H10 | L5d | `L4.loop.rules` (§17 item 35) | holes-only path, oblique chords, one id space, the stand-ins (b) with both ships moving | each rule's case as §13l.7 did for the static loop |
| H12 | L5d | `L1.missilebay.power` (§17 item 46, #301) | a bay joined to a producing reactor, the same bay cut from it, the bay's store at `thermal.magazineCritical`, an EMP burst on the bay | launches only while joined; its draw as the turret's rule gives (hand-worked); cook-off by its store's warheads and fuel (`bayContents`, hand-worked); shut for `emp.outageTime` by a dose ≥ `emp.scramDose` |
| H13 | L5d | `L2.sensor.memory.v2`, `L2.sensor.shield.v2`, `L3.sensor.control.v2` (successors of S4, S5, S6 under #301, the L5b checker's gaps, §17 item 45 (e)); `L2.sensor.brownout` (45 (b)); `L4.target.plates` (45 (d)) | as the originals, plus: S4's class order and the rest → hot transition, S5's absorption at its last step, S6's draw while control is lost; a scan under a host at power fraction f; R1d scanned | the gaps checked as the checker listed; progress and radiated power × f (hand-worked from the d⁴ law); the plates of R1d's scanned zones in the model with their integrity |
| H14 | L5d | `L4.play.replay` (#277, #301) | a battle played through `tools/play.mjs` with a fixed input file (scan, target, preset at stated times) against the enemy at personality 0.5 | the replay line `tools/duel.js --seed … --inputs …` gives the same battle hash and end; the knowledge model's text holds nothing of the other world beyond what it resolved (no room, cell or source it did not resolve) |
| H15 | L5d (#306, #307) | `L4.helm.style` | R1 at rest 900 m from a static R1d, style hold, orbit, strafe | orbit and strafe engage on step 1 (hand-worked: the deviation equals v_t); orbit's bearing advances counter-clockwise over 60 s, never turning back by more than one step's change (kernel-read, labelled); strafe's sense flips every 600 steps, exact; hold as #302 |
| H19 | L5d (#307) | `L4.orders.repair` | two damaged rooms under one quarters' budget, repair priority `none` and an explicit list | `none`: proportional, as today; the list: the listed room's cells repaired first, whole-cell, hand-worked from the repair rate |
| H20 | L5d (#308) | `L4.route.escape.reorder` | a runner orders `disengage`, withdraws it while the separation grows beyond 3000 m, orders it again | `escaped` 600 steps after the re-order step, not earlier (hand-worked from the integrator's sum) |
| H16 | L5d (#306) | `L4.helm.drift` | a broadside dodger at its range order's point, dodging until its drift exceeds a t₁₈₀; the player's flip interval; a ship with thrust and no RCS couple | the range order engages on the step the drift passes a t₁₈₀ (hand-worked from the integrator's sum), not before; the player's flips every (`helm.dodgeMin` + `helm.dodgeMax`) / 2 = 10 s, exact steps; no NaN and no engagement without a couple |
| H17 | L5d (#306) | `L4.plan.model` | the attacker's plan room destroyed in the truth while its model, unscanned since, shows it standing; then re-scanned | the turret keeps the room as its target until the zone re-resolves, then advances (kernel-read steps, labelled); with knowledge off the truth advances it at once |
| H18 | L5d (#306) | `L4.route.escape.edge` | the enemy at resolve 0.25 with its buffer intact; a runner whose separation stalls beyond 3000 m before widening again; a runner that withdraws `disengage` | no order; the widening count resets on the stall (escape 600 steps after the restart, exact); no escape after the order is withdrawn |
| H9′ | L5d (#306) | `L4.route.emp.v2` (successor of `L4.route.emp`, withdrawn under #306) | as H9, its bow case's text corrected (the burst on the beam bay's face) | as H9, plus the shielded case: the buffer pays the EMP's 2 MJ and the generator's heat rises by it (1e-9 relative) |
| E1 | L5e | `L5.e5.reference`, `L5.e5.degenerate` | the round-robin; the degenerate four | no build above 75 %; each degenerate ≤ 1 of 4 |
| E2 | L5e | `L5.e6.<path>` × 6 | the six pairs | wins with the tactic ≥ 3 of 4, loses without ≥ 3 of 4 |
| E3 | L5e | `L5.e7.median` | the 24 reference ends | median in [180, 360] s |
| E4 | L5e | `L5.e8.missiles` | a Swarm against R2 at T1 | under 1 ms per step |
| M1 | L5m | successors of the 15 scenarios the probe of #285 fails (`L3.r1.pinned`, `L3.mass.props.v5`, `L3.r1c.props`, `L4.readout.blueprint`, `L3.recoil.v5`, `L3.thrust.v5`, `L3.rcs.turn.v5`, `L3.split.momentum.v5`, `L3.fragment.rules.v3`, `L3.destroyed.mass`, `L3.shield.energy`, `L4.cascade.v3`, `L4.hit.oblique.v2`, `L4.route.missionKill.v2`, `L4.route.overheat.v2`) | as each original, with the turret by its mount | every check of the original kept; mass, centre and inertia literals hand-worked from the cell masses (R1 911.2 t, R1c 1225.234 t, R1d 1421.484 t at T1: (9)); battle literals kernel-read and labelled; the 15 that move and still pass re-record (as pass 2 and #272) |
| M2 | L5m | `L0.turret.mount` (new) | an M round through an M turret's two cells, and through R1d's turret plate first | σ = (3000 + 1975) / 25 = 199 kg/m² (hand-worked); the round passes both cells (exit speed by the round rule, hand-worked); the plate stops it |

### 13n.5 Process and cost

One engineer session (opus) per pass on `m0/l5a-kinetic`, `m0/l5b-senses`, `m0/l5c-weapons`, `m0/l5d-helm`, `m0/l5e-duels`, each from `main` after the one before merges; the blind physics checker (sonnet) from each lock on the kernel physics (K1–K6, S1–S8, W1–W12, H4, H8–H10; L5e's measures are statistics: the checker only on any kernel change it carries); the reviewer (sonnet) always; `--only` mutations before each review, the full run after; the pace study (K7) by the lead designer between L5a and L5b; a light audit (a–d) before L5e's plan is locked (#238's milestone "before each level's plan" is this plan; a second light audit before the duels is the lead designer's choice, 5–8 USD). The owner is told before each pass (#191: L5 passes 40 USD at its second pass).

| Pass | Raw (USD) | Kind | Rule (#246 (4)) | Lead designer's expectation (#270 (2)) |
|---|---|---|---|---|
| L5a kinetic | 11–16 (engineer 8–11, checker 2–3, reviewer 1–2) | repeated (a kernel physics pass) | ×2.5: 28–40 | 14–20 |
| L5m mass pass 2, the turret (#280, #281, #285) | 10–15 (engineer 7–10, checker 2–3, reviewer 1–2; 15 successors, the probe of #285) | repeated | ×2.5: 25–38 | 12–18 |
| L5b senses | 15–21 (12–16, 2–3, 1–2) | new | ×4: 60–84 | 20–30 |
| L5c weapons | 27–39 (23–32, 3–5, 1–2; #292's outage rule and #295's cases added) | new | ×4: 108–156 | 36–57 |
| L5d helm and enemy, with `tools/play.mjs` (re-costed by #301 after the probe: escape #293 +2–4, items 44–46, H12–H14, `tools/duel.js` +4–6) | 33–47 (engineer 28–40 with the play harness 4–6, checker 4–5, reviewer 1–2; was 26–36) | new | ×4: 132–188 | 40–52 |
| The prototype page on the L5d kernel (the owner's ask, #301; `proto/l5d` after L5d merges) | 5–7 (engineer 4–6, reviewer 1) | repeated (a prototype rework) | ×2.5: 13–18 | 6–8 |
| L5e ship versus ship, with `tools/sweep.mjs` | 25–36 (16–22, 2–3, 1–2; the sweep 6–9) | new | ×4: 100–144 | 33–54 |
| **L5** | **125–179** (113–161 before #301) | | **462–660** | **160–237** (150–228 before #301; the ratios on record are 0.65–1.74 of raw, L5a–L5c; fix rounds included as 15–30 % of engineering; the two harnesses 10–15 raw, #277; mass pass 2 10–15 raw, #285) |

Time: five sequential passes, each an engineer session of 2–4 hours plus a checker and a reviewer of about an hour, and the lead designer's answers and merge: about **three days** with the account's five-hour limit (#246; the hygiene round lost a session to it), two if nothing stalls.

### 13n.6 Checklist (#241 (1), #270 (3), #275 (2))

- [x] Every number in §13n.3 is printed by `tools/estimates/l5.mjs` at `29ce028` (sections (1)–(8) named at each number; kernel readings and formula values labelled in the script's output).
- [x] Every passed rule on: the round rule with chords and plates, the blast through walls from remaining integrity, radiator power by T⁴, the L4 loop with time of flight; the proposed rules are modelled on the kernel's own functions (`penetrateRound`, `detonateMagazine`, `radiatorPower`).
- [x] Tolerances: closed forms at 1e-12; timed cases one-sided in [t, t + dt) off the grid (S2's 0.79 / 4.00 / 30.86 s are not whole steps; W5's √(2d/a) neither); books at 1e-9 × gross (+ 1e-12 angular, #220); E5–E7 are counts, exact.
- [x] Damage channels × new resisting objects: the table in §13n.1 (c).
- [x] Locked scenarios against new validation rules: the S footprints add sizes, no rule; `L2.layout.invalid.v2` and `L3.validation.v2` are run against the pass's `validateShip` before W13's lock.
- [x] The script line behind each number: the section numbers in §13n.3.
- [x] Hardware sense-checked: a 10 kg slug at 2 km/s is the Navy prototype (32 MJ); 3 g for a missile is low for a real one (10–30 g) and chosen for #54's 8–15 s; 100 kW of scan power is a destroyer's radar at a tenth; a fusion torch at 10 km/s; the 1.2 GJ magazine is 225 kg of propellant, HMS Hood's lesson.
- [x] §13m rows this plan proves (updated to "planned L5a–e" with #278; each pass's exit turns its rows "proven"): A infrared, inverse-square, blast outside, EMP; B railgun, missile bay; C point defence (two), antenna; D room size S; E missiles, seekers, warheads, point defence, firing window, magazines lasting, round types, shot choice; F all seven; G standing orders (four rows), presets, helm conflicts, scan verb, automatic rules, EMP route, surrender route, destroyed by #274; H all five; I E2 energy, E3, E4, E5, E6, E7, E8 missiles. L5 exits only when none says "planned".
- [x] L5b probed before its engineer (#285's lesson, #289): the antenna fitting, the sources and the passive step in a scratch copy, run by `tools/m0.js cov`: **116 of 116 rows unchanged** (the data hash moves, a re-record as every pass); the knowledge model a battle setting so no locked case moves; R1d's free edges for an antenna are its hold's six; the cost of §13n.5 stands.
- [x] **L5b exits** (#290): S1–S9 PASS at `3b2bd51`; regress on the merge in #290; §13m's L5b rows read proven L5b; the §13n.5 cost 11.62 USD against raw 15–21.
- [x] L5c probed before its engineer (#295): the data and validation surface (S footprints, the planned constants with #292's values, a `ROUNDS` table, the point-defence fitting types, the new events) in a scratch copy, `tools/m0.js cov`: **125 of 125 rows unchanged**; `validateShip` takes S footprints without a new rule; `buildShip` drops a room's `size` (to thread); the cost stands at raw 27–39.
- [x] **L5c exits** (#299): W1–W14 less W9b (moved to L5e as a measure) PASS at `a4005d4`; `regress` on the merge 140 VERIFIED + 140 WITHDRAWN + 5 RETIRED; §13m's L5c rows read proven L5c; 39.06 USD against raw 27–39.
- [x] L5d probed before its engineer (#301): the knowledge setting four ways in a scratch tree (`tools/estimates/l5d-probe.diff`), `tools/m0.js cov` against a 140-of-140 baseline: the model forced on 16 fail; revealed once 17 move; refreshed to the truth only the 7 knowledge-on cases move; plan advancement by the model 140 of 140 unchanged. H1 can be built as amended (the plan a test input); H4's literals were pre-L5m (10.42 / 6.68 m now); H11's hand-working needs the integrator's sum and its intact-pursuer case cannot be hand-worked (the shield, the helm): kernel-read; every number in (11) printed by `tools/estimates/l5.mjs` section (11). Re-costed: raw 33–47 and the page 5–7 (§13n.5).
- [x] **L5d exits** (#309): H1–H20 and H9′ PASS at `dc50c56`; `regress` on the merge 161 VERIFIED + 145 WITHDRAWN + 5 RETIRED; §13m's L5d rows read proven L5d, three moved to L5e by #309 (containment first, dark fragments, the wildcard's case); ≥ 47.92 USD against raw 33–47.
- [x] L5d's checklist at its lock (#275 (2)): every passed rule on (the symmetric loop with both sides' sensing, PD, missiles and the window); tolerances: escape and dodge by the integrator's sum (one step's ½ a t dt where a closed form is quoted), books at 1e-9 × gross; hardware: no new hardware (the helm flies the fittings L3–L5c built; `helm.dodgeMin`/`Max` are a pilot's choice, not hardware); damage channels: no new resisting object (the bay's cook-off uses the magazine's); **the §13m rows L5d proves**: G standing orders (four rows), presets, helm conflicts, the scan verb, automatic rules, the EMP route, the surrender route; H the enemy, no information cheating, personality, the wildcard mechanism; F the knowledge model read by the enemy and the helm; B the missile bay's draw and cook-off (item 46); L5d exits only when none of them says "planned L5d".
- [ ] Open: the threshold's value (K7, the owner's choice on the pace table, #277); the penetrator warhead is weak at 3 g (0.59 × M), by design until the Swarm's measure says otherwise; `beambay.efficiency` as a laser PD's (#243 F26) unresolved; `sensor.sensitivity` has no source beyond the chosen band.

### 13n.7 What the owner decided (#277, 2026-10-22, each as recommended; the frame of #247 (3) as it was put)

**Answers**: O1 (A) mass at undock; O2 (A) the median of R2 against the four; O3 the second reading (unmanned rooms; a crewless ship is Disabled and captured); O4 the physics accepted; O5 the go, pass by pass. Two of the estimate's findings read as absurd to the owner: the one-shot magazine (answered by the threshold table in §13n.1 (b): the threshold is chosen on K7's pace table) and the reactor at 63 % of R1 (option A chosen: every mass inside its approved range, #234; the S reactor is the underdog's choice; B, `cellMass.reactor` at its floor, and C, heavier rooms, each a small pass that re-pins R1, stay as levers). The two harnesses, `tools/sweep.mjs` and `tools/play.mjs`, were the owner's ask.

- **O1 Budget for E5 and E6**: (A) **mass at undock** (recommended: the one law's quantity, the readout shows it, plates count; the reactor is 63 % of R1 so a 60 % ship needs an S reactor, which is the underdog's physics), (B) cell count (plates free: a Brick is cheap, the criterion weak), (C) a price formula now (economy design before Mission 0, §17 item 3). Reversible: the measures re-run under another budget (one session, 5–10 USD).
- **O2 The reference battle for E7**: (A) **the median of R2 against the four reference builds** at three ranges and two openings, standard enemy (recommended: what "the reference set" means for E5 too), (B) R2 against R2 only (6 ends; a mirror says less). Reversible: a re-run.
- **O3 "No crew" in #274**: did it mean a Destroyed rule (a crewless hulk is destroyed) or what the plan builds (a crewless room is unmanned, a crewless ship Disabled and captured, #83's loot)? The plan builds the second; a Destroyed rule is one line more.
- **O4 The magazine's blast** (§13n.1 (b)): under today's constants a full magazine destroys any ship by pieces at every tier, so #274 changes the end only for a magazine under about 12 rounds; the levers are the loadout and the S magazine, both the player's, not a constant. Accept as the physics (recommended: HMS Hood), or direct a smaller `kinetic.chargeEnergy` range (a law's constant below its approved range is the owner's).
- **O5 The go, pass by pass** (#191): L5a 28–40 by the rule, 14–20 expected; L5b 60–84 / 20–30; L5c 104–148 / 35–55; L5d 104–144 / 36–51; L5e 100–144 / 33–54; L5 in all 396–560 / 138–210 USD, about three days (416–590 / 148–225 with mass pass 2, #280). Each pass has its own go.

### 13n.8 L5e1: the rules and the tools before ship versus ship is measured (#315, #316)

L5e is split (the owner's B, #315): **L5e1** builds what E5–E7 need and fixes what the probes found; then the lead designer's **pace study** on the real builds (a stop point: if rung 1 cannot bring E7's median into 3–6 minutes, the question goes to the owner before L5e2); then **L5e2** measures E5–E8 (§13n.1 (e), §13n.4's E1–E4, W9b, `L5.route.throughput`). Every number below is printed by `node tools/estimates/l5e1.mjs` (sections in brackets) from the kernel at `main` or from the stated formula.

**Rules L5e1 builds**

| Rule | Statement |
|---|---|
| The position law (#315) | 13n.1 (d)'s row "The position law": the point on the circle of R*, `helm.positionLead` 60°. On the current kernel the five duels come within 33.4 / 111.4 / 51.1 / 55.2 m (1); the lead designer's scratch patch gives 367.2–900.0 m |
| The plume (#297, #304) | 13n.1 (e)'s row as written, with the intercepted area stated: **a fitting intercepts the plume over one hull segment's face, edge² (25 m² at T1, k = 2)**, the area #297's frame used for every fitting. At 900 m on the axis, 30°: 75.0 GW, a cone of radius 519.6 m, 88.42 kW/m²; a radiator panel is ruined in 0.339 s (21 steps), an antenna in 1.357 s (82), a kinetic point-defence mount in 10.857 s (652), a laser one in 5.429 s (326) (2). The plume never touches a hull cell. Its IR source is unchanged |
| Reactor containment first (#37) | #37's words in full: "crew repair order follows the power priority list; reactor containment always first". A damaged reactor's cells take the repair budget **before** the repair-priority slot's list or its proportional share (#307), whatever the order says; the rest is shared as now. Physical cause: the crew go to the containment first; nothing else changes (the breach countdown and its explosion are #81's) |
| Dark fragments (#37 "fragments without the bridge", #81) | A fragment that keeps no bridge cell has no control: its reactor SCRAMs (#81; the restart needs control back, which a fragment never gets), its weapons hold, its engines and RCS stop, its scans end; it emits only its heat. L5e1 states what the kernel already does and pins it; whatever does not hold is built |
| A simultaneous end (#315) | When both sides meet an end condition in the same step (the exact mirror: both reactors and magazines explode at step 1613, 26.88 s (4)), the battle ends as a **draw**: `ended.kind = 'draw'`, both sides named. In E5's win rates a draw counts half a win for each; in E6 a draw is not a win. Replaces the kernel's processing order, which no decision chose, as the end's tie-break |
| A missile's body and a charged field (§17 item 48) | The field's kinetic rule acts on a missile as on a round of the missile's mass and velocity, its cross-section from `roundGeometry` at steel density and the round's length-to-diameter (a stand-in: the hardest sectional momentum for the field; stated); successors of the moved cases (`L2.missile.warheads.v2`, `L4.route.emp.v2`) |
| A shield's impulse on the line of action (§17 item 35) | The field's impulse on a round acts on the round's line of action at the field's surface, as B2 (#278) does for a hull hit, so the angular book closes with shields up; one id space for shot events; the two-ship book case with a charged field stopping rounds (the survivor `l4x.books.missingTerm`) |
| No event without a change of state (§17 item 51) | `cell-damaged` is emitted only when a cell's integrity changes; `L4.loop.symmetric` declares the records it replays in `dependsOn` |
| The weak checks (§17 item 50) | Successors when `js/helm.js` is touched, which this pass does: orbit's and strafe's tangential speed and strafe's reversal, the no-couple engine shut, the repair slot's fallback order and its validation, `L4.route.escape.reorder`'s header, the `1e-9` margins named float resolution |
| The builds (`mission0/builds.js`, 13n.1 (e)) | R2, the reference four (R2, Lance, Swarm, Furnace) on R1d's budget ± 5 % and the degenerate six (Brick, Glass, Porcupine, Fortress, Engine boat, Cold Brick) on R2's ± 5 %, each passing `validateShip`, masses printed; the engineer's layouts, **locked by the lead designer before the pace study** |
| `tools/sweep.mjs` (13n.1 (e)) | As specified there; L5e1 builds it and proves it deterministic; the full run is the pace study's and L5e2's |

**Constants**: `helm.positionLead` (new, 60°, 30–90°, k 0, #315) and `engine.plumeHalfAngle` (13n.2, 30°, 10–45°, k 0), approved as the plan's (#272 (2)). No other constant moves in L5e1; the pace study tunes within approved ranges only.

**Scenarios** (each locked in a commit of its own before its first canonical run, #273; the blind physics checker on J3, J7, J8, J9)

| # | Scenario | Setup | Criterion |
|---|---|---|---|
| J1 | `L4.helm.separation` | the five duels of (1), each to its end or 300 s | the minimum separation of the main bodies ≥ 150 m (half of `helm.rangeClose`'s lowest approved value) in every duel; the old law fails 4 of 5 |
| J2 | `L4.helm.conflict.v2` | `L4.helm.conflict`'s four cases | the stern case's heading and throttle worked from the new law (the probe: 5π/6, 0.5); the other three as before |
| J3 | `L4.engine.plume` | R1d-A at full throttle, a pursuer straight behind at 900 m; the same offset by 520 m | on the axis the bow panels ruined at step 21, the antenna at step 82 (one-sided [t, t + dt)); offset: no fitting loses integrity; no hull cell ever does |
| J4 | `L2.repair.containment` | a ship with a damaged reactor and a damaged turret, repair priority [turret] | the reactor's cells take the budget first; the turret only what is left |
| J5 | `L3.fragment.dark` | a split that leaves a fragment with a reactor and no bridge | its reactor SCRAMs in the step of the split, no restart; its weapons, engines, RCS and scans stop; its EM emission 0 |
| J6 | `L4.enemy.wildcard` | the wildcard draw on seeds 1–4 | the four numbers are `personalityOf`'s draws on the battle's stream (`enemy.js`), each in [0, 1); the same seed gives the same draw, two seeds differ |
| J7 | `L4.end.simultaneous` | the exact mirror of (4) | a draw at step 1613, both sides named |
| J8 | `L2.missile.field` | a missile against a charged field, and the moved successors | the field's kinetic rule on the stated cross-section; heat booked |
| J9 | `L4.books.field` | two ships, a charged field stopping rounds | the angular book closes at 1e-9 × gross (+ 1e-12) with shields up |
| J10 | `L4.events.change` | a cell grazed below float resolution | no `cell-damaged` without a change of integrity |
| J11 | §17 item 50's successors | as item 50 | as item 50 |
| J12 | `L4.builds.valid` (withdrawn by #344; successor `L4.builds.valid.v2`) | every build of `mission0/builds.js` | `validateShip` passes; the masses within the budgets above |
| J13 | `L4.sweep.determinism` | `tools/sweep.mjs` on a small grid (2 builds, 2 slots, 1 range, 1 seed) | two runs and 1 against 4 workers give the same table hash |

**Process and cost** (#246 (4); the ratio table in `LEDGER.md`: L5c 1.18, L5d ≥ 1.20 on raw)

| Item | Raw | Kind | By the rule | Expected |
|---|---|---|---|---|
| L5e1: engineer 15–22 (kernel rules, builds, sweep), checker 2–3, reviewer 1–2, a fix round 2–3 | 20–30 | new (the sweep, the builds) | ×4: 80–120 | 24–36 |
| The pace study (the lead designer's runs; no session) | 0 | — | — | 0 |
| L5e2: engineer 7–10 (E5–E8 measures on the sweep), checker 1–2, reviewer 1, a fix round 1 | 10–14 | new (measures by sweep) | ×4: 40–56 | 12–17 |
| L5e in all | 30–44 | | 120–176 | 36–53 |

The rule's figure is up from #315's frame (104–152) by the three §17 items (35, 48, 51) and the position law added after the probe; the expectation is within the frame's 35–55. Sessions: one engineer (opus, branch `m0/l5e1`), the blind physics checker (sonnet) on J3, J7–J9, the reviewer (sonnet).

**Checklist** (#241 (1), #275 (2), #309's lesson)

- [x] Every passed rule on: the symmetric loop, sensing, PD, missiles, the window, the helm and the enemy (the estimate runs `createDuel` and `createBattle` with knowledge on).
- [x] Tolerances: the plume's times one-sided in [t, t + dt) (21 / 82 / 652 / 326 steps); the separation a floor with a factor 2.4 margin on the probe's worst (367.2 m); books at 1e-9 × gross; the draw at its step, exact.
- [x] Hardware: no new hardware; the plume is the existing engine's jet; `helm.positionLead` is a pilot's choice.
- [x] Numbers recomputed from the kernel (sections (1), (3), (4)) or the stated formula on the kernel's constants (2).
- [x] **The §13m rows L5e1 proves, each against the scenario list**: automatic rules, *containment first* (J4) and *dark fragments* (J5); the wildcard's case (J6, the rows "Layout variants per named ship" and "Factions, wildcard…" for the mechanism); the plume (J3, E3's row); point defence's throughput stays L5e2's (W9b); **not** L5e1's: E5, E6, E7, magazines lasting the battle (L5e2).
- [ ] Open: J5's clauses (SCRAM in the step of the split, scans end, EM 0) are read from #81 and §13d.1, not run on the kernel: the engineer's first commit runs them and asks if any does not hold; J8's cross-section is a stated stand-in, its source after Mission 0.
- [x] **L5e1 exits** (#324): J1–J13 with their successors PASS at `7a4fe57`, plus plume occlusion (`L4.engine.plume.shadow`, `.v2`); `regress` 174 VERIFIED + 159 WITHDRAWN + 5 RETIRED; `l5e1.*` 21 of 21 KILLED; §13m's L5e1 rows proven; J5's clauses held on the kernel (no rule built); the builds locked.

### 13n.9 §17 item 55: the helm's layers and the broadside race (#333, #335)

The broadside mirror race (§17 item 55, #331) is greedy pursuit: each ship chases a point fixed to the other's current bow, and a ship under a range order points its bow along its thrust. The helm behaviour suite (`tools/estimates/helm-suite.mjs`, the design partner's proposal) judges a law on the whole duel grid at once: R2, Lance, Swarm, Furnace, each mirror and each against R2, 600 / 900 / 1500 / 2500 m, bow and broadside, default orders, strafe and orbit, seed 1 (168 battles); four properties: (1) separation ≥ 150 m while both ships can manoeuvre (thrust, an RCS couple, a throttle above 0, engines given a tenth of their draw), (2) no race (each main body's speed at the end ≤ 2 × the braking curve's from the larger of the opening range and `helm.rangeOpen`, plus `helm.rangeBand`), (3) spinal bearing ≥ 10 % of the battle within 2°, (4) a battle with cell damage on both ships ends by 600 s. (3) and (4) mostly measure the builds (#330), not the helm.

**The probe** (PR #104's builds `1d7845e`; runners `session_018CzG2efzqJLEh5utTmS1AX`, `session_01JEsqkpArJ9unCs6ng4gGCF`, `session_01S9x8RHyzN6aW5YiUmiYCVn`; scratch diffs in `tools/estimates/`):

| Law | Any property fails | Separation | Race | `regress` (today 175 VERIFIED) |
|---|---|---|---|---|
| today | 118 / 168 | 12 | 19 | — |
| L1 (`pace-race-probe.diff`): the lead dropped after 15 s engaged without closing by a band, restored after 30 s let go | 102 | 7 | 3 | 9 MISMATCH, 3 fail |
| P2 (`pace-race-p2.diff`): L1 + the lead only at range + the turn sense kept past 90° | 92 | 2 | 1 | 11 MISMATCH, 4 fail |
| **P3** (`pace-race-p3.diff`): P2 + the pilot's thrust at its engines' delivered power | **86** | **0** | **2** | **12 MISMATCH, 3 fail** |

Under L1 a yield reset at let-go does not cure the race; a patience of 10, 15 or 20 s all cure it; a reset of 30 s gives the same cells as none. P3's two race cells are Furnace v R2 under orbit or strafe after R2 lost most of its mass (the cap is computed at the start). A fourth candidate (P4: the lead also only when settled) fixed Furnace mirror 1500 m bow on the locked builds but broke R2 mirror 2500 m bow (50 m): not taken. What P3 leaves is §17 item 57.

**Rules** (the owner's layers, #333; the laws, #335)

| Rule | Statement |
|---|---|
| The layers | `js/pilot.js`: **the pilot** takes a wanted heading and a throttle and drives the RCS (`holdHeading`, moved from `js/battle.js`) and the engines, and reports what the ship can do now (`shipDynamics`: acceleration from the thrust its engines are given, t180 on the RCS couple). `js/navigator.js`: **the navigator** takes goals (the range R* or `disengage`; the aspect: position, style, facing, dodging; the throttle) and returns a wanted heading and throttle (#40's order: movement, facing, dodging). `js/helm.js` turns the orders into the navigator's goals each step and keeps gunnery and systems (aim, open fire, shield, power and repair priority, scans). A later phase layer or a manual mode replaces only the goals or the navigator's output (recorded per step like a verb); nothing manual is built (#323, #2). The split itself moves nothing: its commit runs `regress` with every scenario VERIFIED |
| The turn sense (pilot) | A turn of more than 90° toward the wanted heading keeps the sense it started in until the error is within 90°: d is taken in that sense (d ± 2π). At an error of exactly 180° the wanted heading's jitter otherwise flips the bang-bang every few steps and the ship never turns (mirrors from a bow opening pass through each other). No constant: 90° is where the shorter turn is unambiguous |
| The delivered thrust (pilot) | The pilot's acceleration counts each live engine's thrust × its footprint × its surviving fraction × the power fraction it was given at the last step it was asked to thrust (1 until then): a starved engine (the fire preset routes power to engines last) reports none, so the braking curve and the order's engagement use the thrust the ship has (the report expires after `helm.thrustRetry` not asked: #340, §13n.10) |
| The position at range (navigator) | The position's lead (#315) applies only while \|r − R*\| ≤ `helm.rangeBand`; outside it the point is on the own bearing at R* (the range first, then the position): the other ship's bow is read only once the range is held |
| The position yields (navigator) | While the range order is engaged with a lead, if the distance to its point has not fallen by `helm.rangeBand` within `helm.positionPatience` (15 s), the position yields (no lead) and stays yielded until the order has been let go for `helm.positionReset` (30 s) |

**Constants**: `helm.positionPatience` (new, 15 s, 10–20 s, k 0; the probe: 10, 15 and 20 s each cure the race) and `helm.positionReset` (new, 30 s, 30–60 s, k 0; 0 s does not cure it; 30 s and never give the same cells); a pilot's choice, no hardware. No other constant moves.

**Scenarios** (each locked in a commit of its own before its first canonical run, #273; the blind physics checker on K1–K3)

| # | Scenario | Setup | Criterion |
|---|---|---|---|
| K0 | — | the layers' commit, no rule changed | `regress`: 175 VERIFIED + 159 WITHDRAWN + 5 RETIRED, every record unchanged |
| K1 | `L4.pilot.turn180` | one ship at rest, the wanted heading its heading + π, jittered ±0.005 rad by step parity (a test input) | within 1° of the wanted heading by 1.2 × t180 (the bang-bang's time for π is t180 = 2√(π/α)), the sense of ω never reversing while the error is past 90°; today: never turns |
| K2 | `L4.pilot.thrust` | a ship whose power priority puts its engine last, its load giving the engine a fraction f in (0, 1), and a case with f = 0 | the pilot's acceleration = Σ thrust·footprint·surviving·f / M at 1e-12 relative, f from `routePower`'s budget worked by hand; 0 for the starved case |
| K3 | `L4.helm.race` | R2 mirror (R2 unchanged by #330), the standard enemy, default orders, seed 1, bow and broadside, 600 / 900 / 1500 / 2500 m, to 600 s | the suite's (1) and (2) in all 8 cells; today fails 6 (race at broadside 600–2500, separation at bow 1500 and 2500), P3 0 |
| K4 | `L4.beam.nobody.v2` | successor of `L4.beam.nobody` (#245, #327; it pins step 9524 of one battle, which any helm change moves): a beam into a target whose last cell an explosion takes in the step, found under the new helm or constructed | #327's criteria at the new step |
| K5 | re-records | `L0.determinism.v2`, `L4.helm.range`, `L4.helm.separation`, `L4.helm.style.v2`, `L4.loop.rules`, `L4.orders.energy`, `L4.play.replay`, `L4.route.escape`, `L4.sweep.determinism.v2` (still pass, results moved); `L4.loop.symmetric` and `.v2` after K4 (they replay the standing battle scenarios) | criteria unchanged; each listed in the PR with its old and new result |
| K6 | `L4.helm.yield` (#339) | constructed, the navigator's timing: a range order engaged under the position law whose point does not close by `helm.rangeBand`; then the order let go (test inputs, stated in the setup) | the position yields at engagement + ⌈`helm.positionPatience` / dt⌉ steps (± 1), stays yielded while engaged, and is restored at let-go + ⌈`helm.positionReset` / dt⌉ steps (± 1), not before; `item55.position.yield` and `.reset` each fail it |

`regress` at the PR head: 179 VERIFIED + 160 WITHDRAWN + 5 RETIRED (175 − 1 withdrawn + 5 new, K6 by #339). Mutations `item55.*` (turn sense, delivered thrust, at range, yield, reset), `--only`, all KILLED. The engineer reports the helm suite's table at the PR head on the locked builds and on PR #104's (information, not a criterion).

**Process and cost**: one engineer (opus, branch `m0/helm55`), the blind physics checker (sonnet) on K1–K3, the reviewer (sonnet), a runner for `regress` and the suite. Raw: engineer 6–9, checker 1–1.5, reviewer 1–1.5, a fix round 1–2: 9–14; × 1.24: **11–17 USD**. #246 (4)'s figure (a repeated kind, × 2.5): 22–35, shown beside it (#270 (2)).

**Checklist** (#326)

- [x] **§13m rows**: "The helm's layers" (new, planned item 55) and "Standing orders: movement" (K3 added); the separation row stays `L4.helm.separation` (re-recorded).
- [x] **The probe**: P3 on PR #104's builds, the whole suite and `regress` (the table above); the regress tally counted as before − withdrawn + new.
- [x] **Tolerances**: K1's 1.2 × t180 against a discrete bang-bang's few steps (dt 1/60 s against R2's t180 of 8.12 s); K2 at 1e-12 relative (one product); K3's floors with margins on P3's worst (P3 on R2's eight cells: separation ≥ 600 m against 150; end speeds ≤ 45 m/s against caps of 188–256; the 2500 m bow cell fails only (4), not K3's).

### 13n.10 §17 item 58: the starved-thrust latch and the yield clocks' `RES` (#340)

Under #335's delivered thrust a starved engine reports 0 until it is next asked to thrust, and a navigator that reads 0 never asks: the report latches (PR #105's checker H1, reviewer finding 1). The yield's and the reset's clocks compare without `RES` (#308 (2)), so a yield or a reset can land one step late.

**The probe** (`ld/pace` `69c1dda`; runners `session_01YWf1ajvoEXsTuTsQYyJLuJ` ((a), (b)) and `session_01Ha7xt16iTrMgjaV6B8Txbh` ((c)); the lead designer's `tools/estimates/item58-flip.mjs` and `item58-k7.mjs`; diffs in `tools/estimates/`):

| Candidate | Latched battles (of 168) | Starved asks (suite, steps) | Engagement flips (suite) | K7's starvation, 600 steps: asks; first ask after power returns | `regress` (today 179 VERIFIED) |
|---|---|---|---|---|---|
| today | 1 (Swarm mirror 2500 m bow strafe, 5 s) | 1 | 7315 | 1; never | — |
| (a) `item58-a.diff`: when not asked, the reactors' spare power against full draw | 0 | — | — | — | 9 MISMATCH; K2 and K3 fail (locked) |
| (b) `item58-b.diff`: a starved report expires after one step not asked | 0 | 2 | 7178 | 300 (every second step); step 600 | 7 MISMATCH (b alone), every locked criterion passes but the two replays' |
| **(c)** `item58-c.diff`: a report expires after `helm.thrustRetry` (1 s) not asked; `RES` on the two clocks | **0** | **1** | **7241** | **10; step 610** | **6 results moved** (`L0.determinism.v2`, `L4.helm.race`, `L4.helm.separation`, `L4.sweep.determinism.v2`, `L4.loop.symmetric`, `.v2`), every locked criterion passes but the two replays' (rows hashes); the new constant moves every record's data (179) |

(a) is out: it breaks two locked scenarios and ignores priority and walls. (b) cures the latch, but under sustained starvation the navigator engages and lets go at alternate steps and the heading chatters between the range order's and the facing's (300 asks in 10 s on K7's setup): absurd behaviour, though rare in the suite. (c) asks a starved engine once a second and finds returning power within a second.

**Rules**

| Rule | Statement |
|---|---|
| The delivered thrust (pilot; supersedes #335's "the last step it was asked to thrust (1 until then)") | Each live engine counts at the power fraction it was given at the last step it was asked to thrust; once it has not been asked for `helm.thrustRetry`, the report expires and the engine counts at 1 (as before its first ask). A starved engine therefore reports 0 for at most `helm.thrustRetry`, then the navigator may ask again and the router's answer is read afresh |
| The yield clocks (navigator) | The yield's and the reset's comparisons take `RES` (1e-9 s, float resolution, #308 (2)), as the strafe's and the dodge's do: with t = n dt at dt 1/60 s, 32 of 120 engagement steps (60–179) land the yield one step late today, 40 of 120 the reset (L = E + 1740); none with `RES` |

**Constant**: `helm.thrustRetry` (new, 1 s, 0.5–2 s, k 0): how long a pilot trusts a starved report before trying the throttle again; a pilot's choice, no hardware. Below 0.5 s the retry is a chatter at the RCS's time scale (R2's t180 8.1 s); above 2 s a ship sits out a power return for longer than a dodge interval. No other constant moves.

**Scenarios** (each locked in a commit of its own before its first canonical run, #273; the blind physics checker on K7)

| # | Scenario | Setup | Criterion |
|---|---|---|---|
| K7 | `L4.pilot.retry` | T1, R2 v R2 at 2500 m on bearing +x, knowledge on, the standard enemy both sides, seed 1 (`item58-k7.mjs`); the target's reactor demand 0.1 for steps 0–599 (2 MW: the fire preset's shield takes it all, the engine gets 0), then 1 (test inputs) | (i) while starved, between two steps at which the engine is asked there are at least ⌈`helm.thrustRetry` / dt⌉ − 1 steps not asked (no chatter), and it is asked at least once in each ⌈`helm.thrustRetry` / dt⌉ + 1 steps after its first ask (no latch); (ii) after the demand returns at step 600, the engine is asked by step 600 + ⌈`helm.thrustRetry` / dt⌉; (iii) at the end of that step the pilot's acceleration = Σ thrust · footprint · surviving · f / M with f the fraction the router gave, worked by hand, at 1e-12 relative. Today fails (i) and (ii) (asked once, never again); (b) fails (i) |
| K8 | `L4.helm.yield.exact` | K6's construction (the navigator alone, battle.t = n dt) at each engagement step E = 60…179 and each let-go step L = E + 1740 (test inputs) | Y − E = ⌈`helm.positionPatience` / dt⌉ + 1 = 901 (the clock starts at E + 1, the first step that reads the order as engaged, as K6's hand-working) and B − L = ⌈`helm.positionReset` / dt⌉ = 1800, **exactly** at every E (K6's ± 1 tightened by `RES`); today 32 and 40 of 120 land one step late (corrected before the lock: the plan said 900 and 20, PR #107) |
| K9 | re-records | every record (the new constant changes `js/data.js`); the six whose results move, each listed in the PR with its old and new result: `L0.determinism.v2`, `L4.helm.race`, `L4.helm.separation`, `L4.sweep.determinism.v2`, then `L4.loop.symmetric` and `.v2` last (they replay the others' rows hashes) | criteria unchanged; any other moved result is a stop and a question |

`regress` at the PR head: **181 VERIFIED + 160 WITHDRAWN + 5 RETIRED** (179 − 0 withdrawn + 2 new). Mutations `item58.latch` (the report never expires), `item58.chatter` (it expires after one step) and `item58.res` (either clock without `RES`), `--only`, each KILLED (K7 kills the first two, K8 the third). The engineer reports the helm suite's failing-cells line and `item58.mjs`'s last line at the PR head (information).

**Process and cost**: one engineer (opus, branch `m0/pilot58` from `ld/pace`), the blind physics checker (sonnet) on K7 (setup and inputs only), the reviewer (sonnet), a runner for `regress` on the merge. Raw: engineer 3–5, checker 0.5–1, reviewer 1–1.5, a fix round 0–1, runner 0.3–0.5: 5–9; × 1.24: **6–11 USD**. #246 (4)'s figure (a repeated kind, × 2.5): 13–22, shown beside it (#270 (2)).

**Checklist** (#326)

- [x] **§13m rows**: "The helm's layers" gains K7 and K8 at the merge (proven L5, item 58); no row is planned for it now, so lint check 10 holds before the scenarios exist.
- [x] **The probe**: (a), (b), (c) on the suite and on K7's setup; `regress` under (a), (b) and (c); the helm suite under (c): any property fails in 87 of 168 cells (today 85; separation 1, race 0, as today); the tally counted as before − withdrawn + new.
- [x] **Tolerances**: K7's step counts are integers from ⌈`helm.thrustRetry` / dt⌉ = 60, with (i)'s − 1 and + 1 for the ask's own step; (iii) at 1e-12 relative (one product, as K2); K8 exact because `RES` (1e-9 s) is five orders above t's float error at 600 s (about 1e-13 s) and seven below dt.

### 13n.11 The tools pass: the baseline's columns (#342 (3), #351)

No kernel change: `js/` is not touched, so no physics checker (#241). The baseline runner (`STATUS.md`) runs once, after this pass merges, with every column the owner asked for (#336–#338, #347, #349).

**Outcomes, one function** (`tools/sweep.mjs` exports it; `pace-e7.mjs` and `pace-verbs.mjs` copy it beside `resultOf`, as today, since importing `sweep.mjs` in a worker starts its worker loop). For each side, a battle's outcome is one of: **win** (the other side ends destroyed, Disabled or surrendered), **loss** (this side does), **escape** (this side escaped), **let go** (the other escaped), **draw** (#315: both end in one step), **stalemate** (`ended.kind === 'stalemate'`, #337 (D); not in the kernel yet, counted when it comes), **no end** (none by `--limit`). E5's score is unchanged by #336: a win 1, a draw ½, everything else 0, so an escape is no longer the other side's win (#293's scoring, superseded by #336). **Survival** = every outcome but a loss and a draw (#336: wins, escapes, stalemates; let go and no end added by #351 (1), each also printed apart). **Crew alive** = Σ `room.crew` over the side's rooms at the battle's end, as the `draw` event counts it.

**`tools/sweep.mjs`**: (a) the best response ranks a side's tries by wins, then survival, then crew alive (#338); a full tie keeps the current set, then the first in slot order, as today; (b) every pair's line and the `--json` table carry each side's counts of the seven outcomes, survival and crew alive; each build's line its survival rate beside its win rate; (c) the flags (above 75 %, an end under 60 s) unchanged.

**`tools/estimates/pace-e7.mjs`**: (a) per battle the outcome for each side, the time of the first `hot` event on each side (`-` if none) and, when the battle ends in a win or loss, the longest quiet gap: the longest interval with no `cell-damaged` event on either ship, reported twice, from t = 0 (the approach included) and from the first `cell-damaged` (between damages and to the end); (b) the summary: the seven outcomes counted apart, survival per side, and **per pair** the median and the minimum of the first hot room's time over the battles where one occurred (with the count), and the maximum and the median of both quiet gaps over the battles ending in a kill (#337 (A), (D): X is set from that maximum).

**`tools/estimates/pace-verbs.mjs`**: (a) `--menu prototype|designed` (default `prototype`): `prototype` tries `PRESETS` (Fire, Cool, Evade) as today and prints the label "verb leverage on the prototype's three presets, not a designed menu (#347); not comparable like for like with a designed menu"; `designed` replaces the three preset verbs by the player build's menu entries, `MENUS[build]` from `js/data.js` (#348), or from `--menu-file <json>` (the same shape: `{ <build>: [{ name, phase, slots }] }`, for the gap-7 derivation before `MENUS` exists); with neither it stops with that message. A menu verb sets the side's orders to Fire's with the entry's slots over them, the assignment the kernel's `preset` verb makes, done by the tool between `tick`s at the verb's step (no kernel change; the tool prints that a menu verb is not in `battle.verbs`). (b) **#349's rates** per pair and in total: the **save rate**, over the cells whose baseline is a player loss, the trials that end in a player win, escape, let go, stalemate or no end (survival); the **error rate**, over the cells whose baseline is a player win, the trials that end in a player loss; each printed as `k of n trials (c cells)`; cells whose baseline is neither are counted apart. The old flip counts stay.

**Amendment (#356, after an audit; the engineer merges `ld/pace`)**: (1) `pace-verbs.mjs` prints #349's rates three times: over all cells, over the mirror cells (player build = enemy build) and over the rest, since an exact mirror always ends against A (53 of #328's 80 flips are in the R2 mirror, `tools/estimates/out/verbs-every10.txt`). (2) `tools/lint-docs.mjs` gains check 11: every slot of `js/data.js` `ORDERS` and every key of `PRESETS.fire` is named in backticks in §8's decision table, and every verb `js/battle.js`'s `verb()` accepts is named in its player-verb row; and check 12: every **Checklist** of a plan from §13n.12 on carries a "**Player decisions**" item (#355). The engineer may write `tools/lint-docs.mjs`.

**Fix round (#361, after PR #109's review: 0 blocking, 4 non-blocking)**: (1) **U3** `L4.sweep.scoring.survival` (new; U1 stands, but its tries cannot tell the survival key, the lead designer's design error): three tries tied on wins with survival 3 / 2 / 3 and crew 8 / 14 / 9, so the ranking picks the third (survival beats crew 14; crew 9 beats 8); and `tally` on mirrored inputs (each result with A and T swapped) gives side T the counts side A had. Locked in a commit of its own before its first canonical run. Mutations `tools.sweep.noSurvivalKey` (the ranking by wins then crew) and `tools.sweep.tallySideA` (`tally` reads side A whatever its argument), each KILLED by U3. (2) Lint check 12 fails a plan section from §13n.12 on that has no checklist it can match. (3) An information run that prints a first-hot time (any pair, `--limit` up to 1500 s; #304 puts the first hot room near 1059 s, so 600 s may show none), or the statement that none occurs by 1500 s. (4) Merge `ld/pace` (PR #104 merged, `ec26788`); re-record `L4.sweep.determinism.v2` (both PRs moved it) and the records that replay it if they move, each listed. `regress` expected 184 VERIFIED + 161 WITHDRAWN + 5 RETIRED (182 on the merged `ld/pace`, + U1, + U3; superseded by #362's count). Mutations `--only` the two new ones plus the four of the first round.

**Q2's answer (#362)**: on the merged code `L4.sweep.determinism.v2`'s ordering clause fails (PR #104's Lance with #336's escape rule: both sides choose `disengage`, A escapes at 32.72 s at 1500 m and 39.53 s at 600 m, the shorter first), so byArrival could no longer be killed by it. It is **withdrawn** (#245, frozen) for **U4** `L4.sweep.determinism.v3`: v2's setup, criterion and hand-working with the slot `openFire` in place of `range` (`--builds R2,Lance --slots openFire --ranges 1500,600 --seeds 1 --openings bow --rounds 1`; the lead designer's probe at PR #109's `204dcf9`: both sets standard, 1500 m destroyed A at 48.62 s, 600 m destroyed A at 23.07 s, the longer first). Locked in a commit of its own before its first canonical run; `l5e1.sweep.byArrival` must be KILLED by it. `regress` then 185 VERIFIED + 162 WITHDRAWN + 5 RETIRED (184 − v2 + v3, recount if a replaying record moves).

**`tools/mutations.json`**: `item58.res.reset` (#350): the reset's clock in `js/navigator.js` without `RES`; K8 kills it (40 of 120). `tools.sweep.escapeWin` (an escape counted as the other side's win, #293's scoring) and `tools.sweep.noTie` (the ranking by wins alone): `L4.sweep.scoring` kills both. `l5e1.sweep.byArrival` keeps a valid target (re-targeted if its line moves).

**Scenarios** (locked in a commit of its own before its first canonical run, #273)

| # | Scenario | Setup | Criterion |
|---|---|---|---|
| U1 | `L4.sweep.scoring` | the exported outcome and ranking functions on constructed results (test inputs, no battle): one result of each end kind for each side, and three tries tied on wins (survival 2 / 3 / 3, crew 10 / 8 / 12) | each side's outcome as the table above; E5's score 1 / ½ / 0 as above; the ranking picks the third try (wins tie, survival tie, crew 12) and, with crew equal, the first of the two by slot order |
| U2 | re-records | `L4.sweep.determinism.v2` (the probe: the ranking moves nothing on its grid; the table's new fields change its hash), and whatever replays its row (`L4.loop.symmetric`, `.v2` if they do), each listed in the PR with old and new | criteria unchanged; any other moved result is a stop and a question |

`regress` at the PR head: **182 VERIFIED + 160 WITHDRAWN + 5 RETIRED** (181 − 0 withdrawn + 1 new), after the builds' PR #104 adds its own (the engineer recounts on the merged `ld/pace`). Mutations `--only item58.res.reset,tools.sweep.escapeWin,tools.sweep.noTie,l5e1.sweep.byArrival`, each KILLED.

**Information** (no criterion): the engineer prints, at the PR head, `pace-e7.mjs --pairs Lance:R2 --ranges 900 --openings bow,broadside` and `pace-verbs.mjs --pairs Lance:R2 --ranges 900 --times 0,10` (both menus, `designed` with a two-entry `--menu-file` fixture), so the reviewer can re-run them.

**Process and cost**: one engineer (opus, branch `m0/tools` from `ld/pace`; may write `tools/sweep.mjs`, `tools/estimates/pace-e7.mjs`, `pace-verbs.mjs`, `tools/mutations.json`, the new scenario, the re-recorded records, `CHANGELOG.md`; not `js/`, not `DESIGN.md` or `DECISIONS.md`), the reviewer (sonnet), a runner for `regress` on the merge. Raw: engineer 2.5–4, reviewer 0.8–1.2, a fix round 0–1, runner 0.3–0.5: 3.6–6.7; × 1.24: **4.5–8.5 USD** (the amendment of #356 adds about 0.5–1). #246 (4)'s figure (a repeated kind, × 2.5): 9–17, shown beside it (#270 (2)); the lead designer expects about 6.

**Checklist** (#326)

- [x] **§13m rows**: none moves; "Ship versus ship (E5, E6)" and "The reference battle (E7)" stay planned L5e (this pass builds the instruments, not the measure); lint check 10 is unaffected.
- [x] **The probe**: #338's ranking and #336's escape rule applied to `tools/sweep.mjs` on a scratch tree (`ld/pace` `5d2b4da`), `node tools/m0.js verify L4.sweep.determinism.v2`: VERIFIED (same results, same data): the ranking and the escape rule alone move nothing on its grid; the table's new outcome fields change its table hash, so U2 expects its re-record.
- [x] **Tolerances**: none in floats; every count is an integer and T1 compares exactly; the quiet gaps and hot times are event times (multiples of dt), printed to 0.1 s.

## 14. Architecture

| Layer | Files (planned) |
|---|---|
| Foundation | `data.js` (every number, ranges, scaling exponents, text), `util.js` (vectors, seeded RNG with separate simulation and effects streams), `events.js` |
| Kernel (no DOM) | `layout.js`, `graph.js`, `body.js`, `heat.js`, `rooms.js`, `field.js`, `projectile.js`, `damage.js`, `sensors.js`, `pilot.js`, `navigator.js`, `helm.js`, `crew.js`, `enemy.js`, `battle.js` |
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
14. Life support's own draw and heat (#205 (3), #207 (1): promised for L3,
    not built). Due: L5 (the L4 plan moved it, #253: no L4 route depends on it).
24. The PSTAR iron CSDA value at 200 MeV, cited, for S22's iron row (#248
    Q5). Due: when someone can reach NIST.
31. Bow-on duels with plated turrets stall (4–7 of 10 at 900 s in the pace
    measure, #260): suspected in the prototype's Fire / Cool script, not the
    kernel. Due: the L5 plan (the helm and the Fire / Cool script are
    replaced there).
32. The citadel is five M rounds thick against a deliberate shot (§13l.2,
    #262) under today's damage rule; item 34's pass changes that count
    (an energy reading would cost a 117.8 MJ plate 1.6 % per stopped
    round). Whether the information law and dodging make it enough is
    L5's measure. Due: the L5 plan, with item 34.
30. **Room size S** (#62 promised S/M/L at every tier; `ROOMS` has M and
    L only; the design partner's finding, #259). Open with it: whether S
    is one cell (linear 1/2, so the size rule gives a quarter of M) while
    `FIXED.sizeLinear.S` = 2/3 sets the S round and the shield's
    `kineticStop`; and whether a weapon room's mass follows its volume
    (118 kg/m³, a 59 t M turret) or its contents (structure + a mount, as
    the engine and beam bay already do, #243 F11). Decided at the L5 plan
    (#278): S footprints of one cell in L5c; mass by contents (#281, on
    the sources the design partner checked): the turret in **L5m**
    between L5a and L5b, the missile bay (secondary source, flagged) and
    the railgun (no source found) in L5c, the reactor unchanged. Due:
    L5m and L5c. L5m merged (#287): the turret by its mount; the missile bay and the railgun in L5c.

33. **The information law has no level** (the design partner, #265): no
    row of §13's table proves #24–#28 (passive d², active d⁴ that reveals
    the scanner, scanning by zone with memory, layout variants), and E3
    needs a proof scenario for every kept law. Decided: the **L5 plan**
    builds `sensors.js` and the knowledge model first (the enemy of §9
    reads only its knowledge model), with scenarios; §17 item 32 rests on
    it. The owner agreed (#266). Due: the L5 plan.
35. Loop rules no L4b scenario exercises (#267, the reviewer's N4, N5, N7
    and the engineer's Q12): a path of holes only is not a hit; the chord
    of an oblique line (every L4b line is within 0.01 rad of an axis);
    a grazed cell still loses a full 1 / `kinetic.hitsToWreck` (an exploit
    for aim logic; with item 34); one id space for shot events; and the
    four stand-ins of §13l.1's two-ship books row (B2 the line of action,
    B3 energy across ships, B4 the stopped round's mass, L4 the split of a
    round's energy; #270). The opening range is `battle.openingRange`
    since the L4 fix round (#270 (9)). **Built by L5a** (#278, #282): the
    chord-scaled loss, B2 (the impulse on the line of action), B3 (energy
    across ships), B4 (a stopped round joins its body), L4 (heat split by
    energy). **Still open**: a shield field's impulse acts at its generator,
    so the angular book closes only with shields down (#282 (9)); one id
    space for shot events; a two-ship book case with a charged field stopping rounds (the survivor `l4x.books.missingTerm` since B4, #284). Due: L5d's symmetric loop.
37. **Missiles, point defence and the railgun are built nowhere yet**
    (the owner, #268): the kernel has no missile (seeker + warhead, §6,
    #97, #98, #142 EMP), no point defence (#93), and the railgun is data
    only (#236 (6)); the missile bay is a room with crew and mass. §13's
    table names none of them, yet L5 (no dominant build; E5, E6), the
    EMP and surrender routes moved there (#252), the Swarm named ship
    (#121) and the information counters (#27, #149) all need them. Due:
    the L5 plan builds them as room physics with scenarios before ship
    versus ship, or Mission 0 cannot claim E3–E6.
38. **Tiers** (the L4 physics audit's T1, T3, T4 and Q3, #270):
    `battle.disabledSeconds` k = 0 is five shot intervals at T1 and 0.83
    at T6; `repair.massRate` k = 0 against cell mass k = 3 makes repair
    dead at T6; the T6 citadel takes 11 rounds against T1's 10; and the
    owner's "one battle" is **the same battle in cells** (#273: k = 1 on
    `battle.openingRange` stays; ranges scale with the edge). Due: L6
    (tier scaling).
39. **Scenario hygiene** (the L4 scenario audit, #270): **done by the
    hygiene round** (§13l.7, PR #67, #276), except this residue, wording
    inside locked texts and three relabels the plan left out: (a) the
    `L2.beam.chord.v2` F literals labelled hand-worked (kernel-read pins;
    the checker's formula at 1e-9 goes into a successor), (b)
    `L4.route.decapitate.v2`'s "4 × 3" reasoning and `L4.hit.oblique`'s
    "914 856 × 0.9774 = 894 141" arithmetic (both numbers right), (c)
    `L0.beam.csda.sweep.v2`'s "the checker derives the step counts", (d)
    the audit's N1 relabels in `L3.shield.energy`, `L3.r1c.props` and
    `L4.readout.blueprint` (kernel output quoted as hand-worked), (e) the
    two redundant guards `c1.thr.turretWorksShutdown` (killable only by an
    unrouted L1 turret case) and `e1.rep.destroyedRepairable` (a cell
    destroyed mid-step after its grant; no world builds it), (f)
    `L3.shield.nobody.v2`'s closed form (g = 0.996109, 3187.55 N·s,
    268.742 m/s) stated but not checked, (g) the tie-break among weapons
    losing ability in the same step and B3's `control-lost:heatSink`
    parent (the kernel's `lastCut` order, to be stated). Due: successors
    in L5's first pass that touches each file; the full mutation run after
    the merge records (e).
40. **Process after the L4 block** (the process audit, #270): the plan
    checklist's three new lines (a damage-channels table for every new
    resisting object; every locked scenario run against a new validation
    rule before the lock; the script line behind each quoted number) are
    applied first in the L5 plan; the engineer's pull request carries a
    "Pre-lock runs" section; the full mutation run goes after the review;
    `LEDGER.md` carries the ratio table. Due: the L5 plan and its first
    pass; the wording of the pre-lock rule is the owner's (F4).
42. **What §13l.1 moved to L5 without an obligation** (the documents
    audit's 12, #271): the EMP route (a warhead, with item 37), the
    surrender route (the enemy's personality; #273: a script may strike
    its colours once Disabled by #255, the engine no longer counts),
    debris as an obstacle to shots (#9) and magazines
    lasting a 3–6 minute battle with both ships firing (#92, needed by
    E7). Due: the L5 plan names the pass of each.

43. **The overheat route rests on an unsourced heat capacity** (the L5m
    blind checker's F5 and F4, #287): `thermal.coupledCrewed` is 0.6 MJ/K
    per crewed cell, 41 J/(kg·K) for a 14.8 t bridge cell and 121 J/(kg·K)
    for a 4975 kg turret cell, against 450 J/(kg·K) for the steel of plates,
    armour and engines; at a mass-consistent value a 5 MW beam burns any
    crewed cell out long before the room reaches 350 K, and the overheat
    route through the bridge (#286) would not exist; T-gun's turret already
    burns out 2.3 K short of its overheat threshold. Physically the beam's
    heat lands in the cell's matter, not its air, so "overheat by beam" may
    be an artefact; the throughput law's own route (radiators and heat
    sinks shot away, the ship cooked by its own reactor and weapons) is
    the physical one. Also from L5m: `L0.turret.mount` checks no cell
    losses (F2); the overheat bound is loose, 14.1 s against 22.98 s (F3;
    two cells' burn gives 21.5 s); the oblique literal 899 708 truncated
    (reviewer 4); no battle-level check that a shut-down turret fires
    nothing (reviewer 2). Due: a frame to the owner before L5d's routes
    and E6's overheat path are measured (whether the overheat route is
    the beam's or the radiators'); the scenario items with the next pass
    that touches each file.
    **Decided (#291, the owner's option 1)**: `thermal.coupledCrewed` stays
    0.6 MJ/K and its range narrows to 0.2–1 MJ/K (the route holds only below
    about 1 MJ/K: `tools/estimates/item43.mjs` (2)); the owner's condition:
    **L5e measures the throughput law's own route** on R1 and R1d (radiators
    and heat sinks shot away, the ship cooked by its own reactor and weapons)
    and reports whether it reaches Disabled (today it does not: the ship
    generates 27.8 MW at full fire against 2.81 MW its 17 panels shed at
    plant hot, the beam bay shuts itself down at 287 s with or without its
    panels, and no crewed room passes 295 K; `item43.mjs` (1)).

44. **Constants with k = 0 are read by `.value`, not through `scaled()`**
    (the L5b checker's N7, #290): `sensors.js` reads `sensor.scanTime` and
    `engine.exhaustVelocity` so, as `rooms.js` reads twelve others
    (`magazine.detonationSpeed`, `kinetic.hitsToWreck`, `reactor.restartTime`,
    …). A nonzero k set in `data.js` for any of them would be ignored by the
    code and no tier scenario would notice. Due: every read through
    `tierScaled` (a no-op at k = 0, so no record moves) or a lint that lists
    the `.value` reads against `data.js`'s k, in the next hygiene round.
    **Planned in L5d** (#301: every k = 0 read through `tierScaled`, no row
    moves).
45. **What L5b leaves to L5d and L5c** (#290): (a) plan advancement and
    every target rule read the model, not `firstStanding`; the model keeps
    no reference to the other world (its `other` field); (b) a scan's progress
    and radiated power scale with the host's power fraction (#193); (c)
    the shield's `roundEm` enumerable with a re-record (L5c, the firing window);
    (d) a case with plates in the model (R1d scanned), which L5c's W11 needs;
    (e) the check gaps the checker listed: S4's class order and the
    rest → hot transition, S5's "the shield still absorbs at step 249", S6's
    draw while control is lost (successors when their files are touched);
    (f) `L4.e8.v2`'s per-step time re-measured on an idle machine: done in
    the #291 re-record, 0.13–0.15 ms per step (0.242 ms was under a parallel
    regress; the criterion is 1 ms); (g) from L5c (#299): the plan drives
    only the first missile bay (`js/battle.js`, the plan's missile entry); the
    symmetric loop fires every bay by its orders; the missile plan's
    `firstStanding` reads the truth like the turret's and the beam's (a).
    **Planned in L5d** (#301): (a) with knowledge on (the probe: 140 of 140
    rows unchanged), (b), (d), (e) as successors and (g); H13.

46. **The missile bay's draw and cook-off** (#296, L5c's engineer Q6 and
    Q13): the bay has no power draw, so an EMP burst never reaches it, and
    no cook-off rule, so its store of warheads at critical heat does not
    explode as a magazine's rounds do. Due: a draw (as the turret's) and
    the magazine's cook-off rule on the bay, with cases, in the next pass
    that touches the bay (L5e's Swarm, or earlier if the EMP-against-Swarm
    path is measured). Also (#299, the reviewer's finding 5): the bay
    launches with no power test (`js/rooms.js`) while `weaponStates` counts
    a bay cut from a producing reactor as unable, so a cut-off bay still
    launches while its ship may read Disabled; decided: a bay needs to be
    joined to a producing reactor to launch, built with its draw in L5d.
    **Planned in L5d** (#301, H12): the draw, the power test, the cook-off,
    and so the bay as a powered room for EMP.

47. **L5c's scenario notes** (the blind checker's items 7–8, #298; due when
    their files are touched): `L1.railgun.fire` samples the draw at step 0
    only, not the energy per reload; `L0.missile.flight` does not compare the
    position at the arrival step with ½ a (k dt)²; `L4.shield.window` checks
    "slowed" only as a strict inequality where the shield law gives 495.904
    and 481.72 m/s; `L1.missilebay.launch` counts 32 kg in transit as out of
    the magazine; `L1.pd.laser`'s kill sits on the float boundary (36 ×
    1e6 / 60); the penetrator's margin is 1 % (230.2 m/s against 232.4 from
    rest, and under it in battle). From the reviewer (#299): `heatRate`
    gives the railgun's heat while `firing` whether or not it is able (the
    readout's load only); `js/sensors.js`'s inline burn test against
    `missile.js`'s `burning()`; a missile killed in a step is skipped by the
    hit test in the same step (a tie goes to the defender: deterministic,
    now stated). The flak's "physical miss" (½ a t² over the flak's flight)
    is ≲ 1 m against a homing missile, whose acceleration lies along the
    line of sight; the law stays as the mechanism and has no reachable case
    with the seekers built; a burst's dose beyond the kill radius (16.24 m,
    0.55 MJ on a salvo neighbour) is exercised by L5e's saturation measure.

48. **A missile's body and a charged shield** (#306 (6), the L5d blind
    checker's finding 2): the body joins the hull whatever the field does,
    against §4 (a shield stops kinetic energy at a cost in heat); the
    field's kinetic rule needs the body's cross-section, which nothing
    defines yet. Due: L5e, before the Swarm's measures (missiles against a
    shielded R2), with successors of the cases whose records move
    (`L2.missile.warheads.v2`, `L4.route.emp.v2`).

49. **The pace on the symmetric loop** (the design partner's runs on PR
    #94 at `f7433ee`, re-run by the lead designer; `node tools/duel.js
    --seed 1 --limit 600`, R1d-A against R1d-A at 900 m, Fire against the
    enemy at 0.5): the enemy is destroyed at **25.08 s** on every seed (20
    shots, 20 hits; Fire is bow-on without dodging, so the seed draws
    nothing); `--range 600` Disabled at 66.85 s, `--range 1500` 52.2 s,
    `--range 2500` a surrender at 107.2 s, patience 0 (`--personality
    0.5,0,0.5,0.5`) 23.08 s; hit rates about 99 %. E7 asks a 3–6 minute
    median; the 104–306 s of §13m and §13n.3 were prototype v2's script.
    Information, not a failure of L5d (E7 is L5e's criterion). Due: L5e's
    plan, which measures it on the reference set before any lever, the
    rung-1 levers in order being the presets' facing and dodge (data),
    `kinetic.hitsToWreck` and `armour.plateThickness`, then
    `magazine.detonationSpeed` (the owner's choice of 400, #288: the owner
    decides a change); and the prototype page task, whose owner will see
    battles of under a minute with Fire's defaults.

50. **L5d's scenario notes** (#309; the fix rounds' blind checker 5–8
    and light re-review 1, 3, 4): `L4.helm.style` asserts orbit's sense
    but not its tangential speed (mean within a stated tolerance of
    `helm.rangeBand` / t₁₈₀) nor strafe's actual reversal; `L4.route.emp.v2`
    asserts the booked 2 MJ, not the generator room's heat against a
    control; `L4.helm.drift`'s no-couple case does not assert that the
    engine stays shut; `L4.orders.repair` does not observe the fallback
    order of unlisted rooms, and the slot accepts any string as `none`;
    `L4.route.escape.reorder`'s header misstates the step a non-reset count
    would escape (1558, not 1501); the `1e-9` margins in `js/helm.js` want
    a comment naming them float resolution. Due: successors when their
    files are next touched (L5e's helm work).
51. **Events below float resolution and a scenario that reads other
    records** (#311, PR #97's review 1, 2): `damageCell` emits
    `cell-damaged` for a loss of ~1e-17 with the integrity still 1, so
    whether a repaired cell sits at exactly 1 or one ulp below decides an
    event, and a one-ulp move changes the event count and every hash
    over events (the determinism duel 30 → 27); `L4.loop.symmetric`
    compares against other scenarios' recorded rows hashes with
    `dependsOn: []`, so it proves "the loop equals the latest records",
    and fails until they are re-recorded. Due: a minimum loss for an event
    (or no event without a change of state) and the dependency declared,
    when `js/rooms.js`'s damage or the scenario is next touched (L5e).
52. **The pace study's first questions** (#317, the design partner's runs
    with #315's law): the pace is bimodal (11 of 16 duels end in 23–75 s
    at 95–100 % hits; 5 last 307–323 s at 17–21 % hits, where the enemy
    closes and the ships circle at R*): measure which openings and orders
    give relative motion before asking for a new mechanism; and a close
    order overshoots R* by about 230 m (362–372 m at 600 m; #306 accepted
    163–170 m): whether it matters for E7. **The owner's measure of a lever
    (#318)**: beside E7's median, (a) the first hit on the losing ship as a
    share of the battle, (b) the hits needed to kill, (c) how it ends;
    quiet-phase levers (opening range up to 2500 m with
    `battle.cullDistance` at twice it, relative motion, point defence, scan
    time) before toughness (`kinetic.hitsToWreck`); and (#319) (d) verb
    leverage, the share of battles one player verb flips, and (e) the
    decisions available per battle. Due: the pace study after L5e1.
53. **A beam into a ship with no body** (the pace study, 2026-10-24): `js/battle.js`
    `beamsOut` reads `mainBody(T).x` after a step in which T's reactor
    explosion destroyed every cell, before the end is judged: a TypeError
    (`node tools/estimates/pace-verbs.mjs --builds Lance --ranges 600
    --openings bow`, R2 targeting the shield, step 9524). **Done** (#327,
    PR #103, `L4.beam.nobody`).
54. **The energy book has no beam term** (PR #103's blind checker, #327):
    `battleEnergy` (`js/battle.js`) counts kinetic energy, heat, shots,
    work and internal energy, but not a beam's escaped energy, which
    `fireBeam` only returns; a deposit into a missing room would not show.
    Due when `js/battle.js`'s books are next touched (L5e2 at the latest).
56. **Missiles fly pure pursuit** (PR #104): no lead, so a missile passes
    about 50 m behind a target accelerating at about 5 m/s² (Swarm mirror,
    600 m broadside, missile 1, t 8.9 s). A guidance-law question: not probed, so
    not in item 55's pass; the same class as item 57.
    **Waits** (#342): on the locked builds point defence kills 79 of 104
    missiles; saturation, not pursuit, limits the Swarm now.

57. **Two pilots on one relative variable** (the helm suite under P3, #335): each
    side flies the relative range and velocity as if the other were passive;
    when both correct the same error the effort doubles (overshoot, or a race
    when they disagree). P3 leaves 86 of 168 cells failing a property, most of
    them the builds' (#330), and two race cells whose cap ignores mass loss.
    The design partner's candidate: a navigator that leads the other ship's
    motion (as gunnery's intercept) and caps the relative speed; judged on the
    suite. Due before L5e2's measures if the builds' tables show it.
    Not the phases' pursuit (#346): at equal acceleration a pursuing law only
    delays an escape.
59. **The builds' choices without a mutation** (PR #104's reviewer, #359):
    `builds2.swarmTurret` (the Swarm's S turret held: (ii) 3 / 8 without it),
    `builds2.furnaceBay` (L bay to M: R2 hurt 2 / 8) and the Lance RCS
    relocation have no entry in `tools/mutations.json`; the Swarm's
    penetrator warhead is deliberately unpinned (an HE variant gives the same
    counts under (i) and (ii)). Due: added and run `--only` by the next pass
    that touches `mission0/builds.js`, or at L5's exit run, whichever first.

## 18. Decisions in force

One row per decision of `DECISIONS.md`, #1 to the last row, with its status today (#241 (5)). **current**: stands as written; **superseded by #n**: replaced; **partly superseded by #n (what remains)**; **report**: the row records a result or a process step, not a rule; **owner question open**: waits for the owner; **current (unchecked)**: not checked against the current text. The log itself is append-only and unchanged, so a row there may still read as if it stood. Compiled from the documents audit (B1, H), the decisions' own "supersedes" words and the current text of this file; the lead designer reviews it.

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
| 15 | Six fittings, one per hull edge segment | current (armour on any wall segment too, #255, #256) |
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
| 82 | Disabled: one condition, many routes | partly superseded by #255 (the thrust condition is gone; the routes remain) |
| 83 | The loot is whatever is left; Destroyed defined | current, amended by #274 (a magazine explosion is a blast, not a destroyer) |
| 84 | The same condition defeats the player | current |
| 85 | Puzzle ships have a kill route and a harder capture route | current |
| 86 | Scripts may strike colours; personality per ship | current; its "no weapons and no engines" read as Disabled (#255) by #273 |
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
| 127 | Bottom-up levels L0–L6 | current (L4's scope amended by #252; the weapon set and the senses had no row, #265, #268) |
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
| 218 | Fewer documentation pull requests | partly superseded by #325 (one per pass, not per block; the rest current) |
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
| 241 | Process after the audits: plan gate, sessions, documents | partly superseded by #326 (the checklist's list; the rest current) |
| 242 | The documents consolidated; the kinetic velocity relative to the hull | current (supersedes #137's clause and #202 F) |
| 243 | Physics pass 2 planned (§13k) | current (being built) |
| 244 | Answers to the scenario audit; S17–S22 and the conventions | current |
| 245 | E1 amended again: withdrawal by decision whatever the verdict; the record frozen; retired | current (amends #188, #200, #237 (7)) |
| 246 | Prevention after the audits: lint, mutation tool, supersedes rule, ×4, the owner's page | partly superseded by #322 (the cost factors) and #326 (the full mutation run per merge; the rest current) |
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
| 267 | L4b merged (PR #62); answers to its engineer, checker and reviewer; the aim point, the feed clause, Disabled's parent | current, except its cost-factor clause (withdrawn by #270; #246 (4) stands) |
| 268 | Missiles, point defence and the railgun have no level (the owner's finding); the L5 plan builds them before ship versus ship | current |
| 269 | §13m, the coverage table: every element of the design and the level that proves it (the owner's direction); lint check 8 | current |
| 270 | Answers to the four light audits before L5: #267's factor change withdrawn, the ledger's ratio table, the plan checklist's three lines, the L4 fix round (B1, `L4.books.two`, `battle.openingRange`), stand-ins stated, §17 items 38–41, five questions to the owner | partly superseded by #326 (the checklist lines, the full run per merge; the rest current) |
| 271 | The scenario-hygiene round (§13l.7): every finding of the L4 scenario audit fixed by successors, under the plan gate; §17 item 42 (the owner: fix every audit finding) | current |
| 272 | The L4 fix round merged (PR #64): the hit's momentum along the relative velocity at the first entry with matter, `L4.books.two`, `battle.openingRange`; answers to its engineer and reviewer | current |
| 273 | The owner's five answers: detonation rule (c), passed-cell loss by chord (b), one battle is the same battle in cells (k = 1), the pre-lock rule reworded, surrender once Disabled | current |
| 274 | A magazine explosion is a blast through its walls, not a destroyer by itself (the owner; amends #83); built at L5's kinetic pass | current |
| 275 | Prevention after the weapons gap (#268): lint check 9 (every room, fitting, weapon, round type and topic has a §13m row), the plan checklist's §13m line and the level-exit rule, the documents audit's §13m scope, the owner's "not built yet" line | partly superseded by #326 (the checklist line; the rest current) |
| 276 | The scenario-hygiene round merged (PR #67): 20 scenarios, 19 withdrawn; answers to its engineer, blind checker and reviewer; four plan wordings corrected; the residue in §17 item 39 | current |
| 277 | The owner's answers to the L5 plan (budget by mass, the reference battle, unmanned rooms, the magazine's blast accepted, the go), option A on the reactor's share, two exploit harnesses, the lead designer's role file | current |
| 278 | The L5 plan (§13n): five passes L5a–L5e, 26 constants, 52 scenarios, the unmanned rule, `magazine.detonationSpeed` (new) as the first pace lever, the lint's §13n skip | current |
| 279 | The owner: the budget of E5 and E6 is #74's price with the type factor proportional to the M-cell mass until Mission 0 ends (option A); the reactor's share stays a question: mass pass 2 before E5 and E6, its sources gathered by the design partner | current |
| 280 | Mass pass 2 (L5m) planned between L5a and L5b: reactor, turret, railgun, missile bay as structure plus contents with cited sources; the full mutation run on `29ce028` recorded (131 killed, 21 changed, 58 survived, 12 stale) | current |
| 281 | Mass pass 2 on the sources: the reactor kept (no split without a 20 MWe source), the turret by its mount in L5m, the missile bay by a secondary source and the railgun unchanged in L5c; a secondary source allowed only when no primary exists, flagged; the pace study after L5m | current (amends #279 (2) and #280 (1)) |
| 282 | Answers to L5a (PR #73): its engineer's ten questions, the blind checker's four discrepancies, the reviewer's findings; a fix round (K4's feed case, K1's stopping cell, B2's projection); the reactor's immediate explosion stated | current |
| 283 | L5a merged (PR #73): the kinetic pass, its fix round; answers to the fix round's engineer and re-review; §17 items 34, 36, 41 closed; §13m rows proven L5a | current |
| 284 | The full mutation run on the L5a merge: 138 killed, 9 changed, 46 survived; one new survivor, a coverage gap for L5d | report |
| 285 | The owner chose L5m now at the corrected cost (option A); the L5m plan: `turret.machineryMass` (new), 15 successors, one new scenario | current (amends #281 (6)) |
| 286 | Answers to L5m's route question: mission kill moves to R1d, overheat to R1's bridge; R1 from +y and T-gun's turret kept as cases; data.js notes corrected in the pass | current |
| 287 | L5m merged (PR #78): the turret by its mount; answers to its two engineers, the blind checker and the reviewer; contents at the room's centre stated; §17 item 43 (the overheat route rests on an unsourced heat capacity) | current |
| 288 | The owner kept `magazine.detonationSpeed` at 400 m/s after the pace study; the pace table; the full mutation run on the L5m merge | current |
| 289 | L5b probed (116 of 116 rows unchanged) and made buildable: the antenna fitting and `sensor.mass` (new), scan rules, zones by ceiling bounds revealing their own cells, point sources, the knowledge model a battle setting, events and roots; S2, S7, S9 amended before any lock | current |
| 290 | L5b merged (PR #84): the senses and the knowledge model; answers to its engineer, blind checker and reviewer; a shield's EM counts rounds; one scan per command; partial power and plan advancement by the model to L5d (§17 item 45); k = 0 reads (§17 item 44) | current |
| 291 | §17 item 43 decided (the owner's option 1): `thermal.coupledCrewed` kept, its range 0.2–1 MJ/K; L5e measures the throughput law's own overheat route (`L5.route.throughput`); `tools/estimates/item43.mjs` | current |
| 292 | EMP disables a section, not the ship (the owner): `missile.empEnergy` 2 MJ, `emp.radius` 20 m, `emp.scramDose` 1.47 MJ (reach 12 m), `emp.outageTime` (new, 5 s) on every powered room in reach; W7 and H9 reworded before L5c's lock | current (amends #278's EMP) |
| 293 | Escape is a battle outcome (the owner): a loss for the escaper (no loot, mission failed, ship and crew kept); the enemy may escape by personality; the rule is option (1) with the 10 s of widening counted beyond `battle.cullDistance`; H11 in L5d | current |
| 294 | The full mutation run on the L5b merge: 149 KILLED, 7 CHANGED, 45 SURVIVED, 2 STALE (re-targeted: 150 / 7 / 46 / 0), no new survivor; `thermal.coupledCrewed`'s range in `data.js` with a clean re-record | report |
| 295 | L5c probed (125 of 125 rows unchanged): PD masses (new), AP pays with its rate and Sabot with its recoil, the counter per round type and the railgun's three counters (W2's 0.4 m case, an L5e measure), `buildShip` threads `size`; L5c raw 27–39 | current |
| 296 | Answers to L5c's engineer (PR #88): `pd.range` (new); K4's `.v2` and W7 withdrawn for successors; a missile's body books its impulse and heat; S by cell count; the as-built confirmations; a fix round | current |
| 297 | The engine's plume has an effect (the owner): fittings only (mechanism C), built in L5e with `engine.plumeHalfAngle` (new) and `L4.engine.plume`; the exhaust is IR-only until then (recorded beside #140); the Engine boat joins E5's degenerate builds | current |
| 298 | Answers to L5c's fix round and blind checker: `he.coupling` a flat burst efficiency; the body joins before the warhead; PD reads true positions within its range; `L1.pd.kinetic` and `L2.missile.seekers` withdrawn for successors; `L2.pd.saturation` (three bays); the penetrator's 228 m/s in battle; a second fix round | current |
| 299 | L5c merged (PR #88): weapons; answers to its two fix rounds and the reviewer; W9b's saturation an L5e measure; the bay's power test and every bay driven by orders in L5d; §13m's L5c rows proven | current |
| 300 | The full mutation run on the L5c merge: 186 KILLED, 6 CHANGED, 45 SURVIVED, 0 STALE of 237; no new survivor; `i1.mass.railgun` now killed | report |
| 301 | L5d probed and its plan amended: the knowledge setting stays a case setting (orders and the enemy require it); the helm's laws (`helm.dodgeMin`, `helm.dodgeMax` new); hand-working by the integrator's sum; #293's escape frame corrected on the shield; the prototype page on the L5d kernel after L5d; items 44–46 in L5d (H12–H14); re-costed | partly superseded by #302 (the range order's engagement; the rest current) |
| 302 | The range order engages beyond `helm.rangeBand` (new, 100 m) or at a dodge's drift and lets go inside it at a slow relative speed (hysteresis); on the L5d engineer's question | current |
| 303 | Surrender `battle.disabledSeconds` × resolve after the last able weapon is lost (resolve 1: Disabled); on the L5d engineer's second question, correcting #278's wording | current |
| 304 | #297's reason corrected: stripping radiators does not overheat a ship inside a battle (first room hot at 1059.5 s with panels, 988.9 s without); the plume's value is the antenna and point defence; L5e's plume measure reports it; #297's mechanism unchanged | current |
| 305 | The Cold Brick (no radiator panel, IR-dark with its engine off) joins E5's degenerate builds; levers `radiator.area` and the coupled heat capacities if it does not lose | current |
| 306 | Answers to L5d's engineer, checker and reviewer: the range cycle accepted; position, style and repair laws; the readings, presets and enemy mappings as design content; the field's impulse and a missile's body against a field deferred (§17 items 35, 48); a fix round (H15–H18, H9's successor) | partly superseded by #307 (the style and repair clauses) and #315 (the position law; the rest current) |
| 307 | The style slot (orbit and strafe ignore the position slot; engage at a deviation ≥ v_t, let go within a dt), repair priority `none` by default, and the escape count only while ordered; on the fix round's questions | current |
| 308 | H20 pins the escape count's reset on a re-order; the 1e-9 float margin on "at least v_t" confirmed | current |
| 309 | L5d merged (PR #94): the helm and the enemy, H1–H20 and H9′; three §13m rows the plan gave L5d without a case moved to L5e; the fix rounds' weak checks in §17 item 50 | report |
| 310 | The prototype page on the kernel loop (PR #96); `L0.determinism`'s duel on the kernel loop; cross-engine `Math` differences fixed in its own pass `m0/det-math` | current |
| 311 | `m0/det-math` merged (PR #97): `util.js`'s deterministic `atan2`, `cbrt`, `hypot` (with the existing `exp`, `log`, `pow`), `tools/mathcheck.mjs`, `L0.determinism.v2`; the review's findings in §17 item 51 | current |
| 312 | The prototype page on the L5d loop merged (PR #96, feel-6); `L0.determinism.v2` on the kernel-loop duel; `tools/mutate.js` serialises v2; the mutation run on a pinned worktree | report |
| 313 | The thin-skin idea's three kernel rules (skin mass, fittings on the skin, the silhouette as its outline): none in L5e; the idea waits until after Mission 0 | current |
| 314 | The full mutation run on L5d's merge: 269 mutations, 221 KILLED, 12 CHANGED, 36 SURVIVED, 0 STALE; no new survivor; ten catalogue entries re-anchored | report |
| 315 | L5e split into L5e1 (rules, builds, sweep), a pace study, L5e2 (measures) (the owner's B); the position law on the circle of R* (`helm.positionLead` new, 60°); `L4.helm.separation` | current |
| 316 | L5e1 planned (§13n.8): containment first and dark fragments from #37, a simultaneous end is a draw, the plume's intercepted area edge², items 35, 48, 50, 51, builds and sweep; J1–J13; L5e 120–176 by the rule, 36–53 expected | current |
| 317 | L5e1's go (the owner); the pace study measures the bimodal pace first; a close order's overshoot (≈ 230 m) printed by J1, §17 item 52 | current |
| 318 | The pace study judges the battle's shape (first hit on the loser as a share, hits to kill, the end; quiet-phase levers before toughness: the owner); `battle.openingRange` a lever up to 2500 m (range 500–3000), `battle.cullDistance` at twice it | current |
| 319 | The command-level idea in `IDEAS.md` (waiting); the pace study also measures verb leverage and the decisions available per battle | current |
| 320 | Ship classes (the owner): six classes, the player can rise to a capital, the underdog beats up to two classes larger, forms by faction and free building; the two-class measure is L6's (mixed classes), put to the owner as an exit criterion when L6 is planned | current |
| 321 | Process audit opened; process v2 at L5e1's merge; two tracks and slim documents at Mission 0's exit (the owner's direction) | current |
| 322 | Runner sessions for heavy jobs; one cost range, raw × 1.24 (the measured median), beside the expectation; a short brief; hand-over at each block or 350k tokens, on opus (the owner) | current |
| 323 | Mission 0 through L6 before any playable slice (the owner); a steering mode would need a new helm input and a change to #2 | current |
| 324 | L5e1 merged: the position law, the plume with occlusion, containment first, dark fragments, a simultaneous end as a draw, items 35/48/50/51, builds (locked) and sweep | report |
| 325 | Process v2: rows ≤ 800 B, `BRIEF.md`, a slim reading order, a five-line owner block, the lead designer's cost in the ledger, no third regress on a documents-only merge, one documentation PR per pass; two items to the owner (the plan checklist, the full mutation run's frequency) | current |
| 326 | The plan checklist three items (§13m rows, probe, tolerances) and lint check 10 (§13m to scenarios); the full mutation run only at a level's exit or on STALE/CHANGED, by a runner (the owner) | current |
| 327 | §17 item 53 merged: a beam into a ship with no body; the field slows a round in the hit body's frame; `L4.beam.nobody` | current |
| 328 | The pace study measured: E7 38 s; rung 1 reaches 230 s only by misses (hits to kill 41, a third unended); verbs mostly harm; E7 to the owner | report |
| 329 | E7: rebuild the reference builds first; E7 counts only two-sided battles; A and B wait; the verb finding re-measured (the owner) | current |
| 330 | The reference builds' rebuild: each specialist kills its mirror and damages R2 (`L4.builds.lethal`); measures open at 2500 m too | partly superseded by #343 (Furnace's (i) a measured count) |
| 331 | The builds' rebuild stopped: the broadside mirror race (§17 item 55), missiles in pure pursuit (item 56), Furnace against shields; an S secondary turret to the owner; an L beam bay allowed | current |
| 332 | A secondary S turret: only if a specialist still fails #330 after item 55, at most one, recorded with and without (the owner) | current |
| 333 | The helm in layers: pilot, navigator (goals set from above), gunnery and systems; a manual mode later replaces only the navigator's output; nothing manual built (the owner) | current |
| 334 | Battle phases (contact, range, position and control, finish; a strategy is a preset and an exit condition per phase; decision points from a menu): after item 55 and the builds, before L5e2's E5–E7 (the owner; #329's B) | current (its timing: #341) |
| 335 | Item 55's pass: the layers; the pilot keeps its turn sense past 90° and reports the thrust its engines are given (the report's expiry: #340); the position's lead only at range and yielding after 15 s without closing until 30 s let go (two new helm constants); the helm suite; K0–K5 (§13n.9) | partly superseded by #340 (all stands but the report's "1 until then": it now expires) |
| 336 | Outcomes counted apart (win / loss / escape / stalemate); E5's win rate unchanged (escape or stalemate no win); a survival column for E6 and the phases (the owner) | current |
| 337 | The clock: none new now (heat, ammunition; the baseline reports the first hot room); a scenario clock with its tell after Mission 0; a stalemate after X s without new cell damage on either ship, X set by the lead designer from the baseline (the owner) | current |
| 338 | The sweep ranks order sets by wins, then survival, then crew alive; a stalemate 0 in E5, #315's draw a half (the owner; built with #336) | current |
| 339 | Item 55's answers: K0 holds with a grep-only move; the fourteen stale mutations re-targeted; the yield read as P3's code; K6 `L4.helm.yield` added (K3 does not see the yield or the reset) | current |
| 340 | Item 58's pass: a delivered-thrust report expires after `helm.thrustRetry` (new, 1 s) not asked, so a starved engine is asked again once a second; `RES` on the yield's and reset's clocks; K7 `L4.pilot.retry`, K8 `L4.helm.yield.exact`, K9 re-records (§13n.10; supersedes #335's "1 until then" clause only) | current (K8's literal amended by #350) |
| 341 | Battle phases planned now, in parallel with the builds: gaps 1, 3, 4 first; gap 7 and every phases measure after the builds lock (the owner; #334's timing) | current |
| 342 | The builds resume before item 58's merge (merged and re-checked before their lock); item 56 waits (point defence, not pursuit, limits the Swarm: 79 of 104 killed); a tools pass for the baseline's columns before the baseline (#336–#338) | current |
| 343 | Furnace's mirror does not end (two M shields absorb its beam whole in 7 of 8 cells, #345): recorded as a measured count in `L4.builds.lethal`'s (i), not a criterion; (i) for Lance and Swarm, (ii) for all three; no M turret, no beam change before the baseline | current |
| 344 | `L4.builds.valid` withdrawn for `L4.builds.valid.v2`: the builds' shapes as #330, #332 and #343 allow (one S turret at most on Lance and Swarm; the Swarm's point defence free; Furnace's bay of any size) | current |
| 345 | #343's mechanism corrected: in 7 of 8 Furnace mirror cells the two M shields let none of the beam through (no cell damage by 600 s); only 600 m broadside passes about 9 % | current |
| 346 | Phases gaps 1, 3, 4 probed: an escape at equal acceleration is physics (no pursuing navigator; the range attacker is an acceleration margin); contact is weapons tight (`openFire: tight`) at range open from a 1500 or 2500 m opening; its exit is zones resolved, or no antenna left, or own ship damaged | current |
| 347 | The phases plan includes a designed preset menu per build and per phase, with the contact preset; the baseline's verb-leverage column is labelled as measured on the prototype's three presets, not compared like for like (the owner) | current (the baseline's verb column dropped: #357) |
| 348 | The menu: per build, the contact preset plus at most three of the sweep's distinct best-response order sets against the reference builds, phase-tagged by range, recorded as `MENUS` in `js/data.js`; `PRESETS` unchanged; `pace-verbs.mjs --menu`; derived after the builds' lock with gap 7 | current (a break-off entry always added: #353) |
| 349 | Verb leverage is reported as a save rate (player-losing cells turned to a win, escape or stalemate) and an error rate (player-winning cells turned to a loss), per pair and in total, with cell and trial counts; built in the tools pass (the owner; the lead designer) | current |
| 350 | Answers at PR #107's merge: K8's 901 / 1800; `item58.res.reset` in the tools pass; K7's loose bounds for a successor when `js/pilot.js` is next touched; §17 item 58 closed | current |
| 351 | The tools pass (§13n.11): one outcome function (seven outcomes per side; survival = all but a loss or a draw, let go and no end included and printed apart); #337's two columns in `pace-e7.mjs`; `pace-verbs.mjs --menu prototype|designed` with `--menu-file`, #349's rates; `L4.sweep.scoring`; `item58.res.reset`; the phases plan moves to §13n.12 | current |
| 352 | Postures (`IDEAS.md`) frame the designed menu; a best response outside its class's admissible postures goes to the owner; four gaps (throttle slot, which weapons fire, defences target, shield budget) probed for the phases plan; the player's Command verbs and the stand-off default open (the owner) | current (its (3) decided: #353, #354) |
| 353 | The player's Command verbs: break off is a menu entry always added outside #348's derivation (range `disengage`), valued by #349's save rate; strike colours after Mission 0 (the owner; amends #348) | current |
| 354 | The stand-off is the phased captain's default posture (start and return; leaving it is the Command decision); which of the three is an order from the menu; #346's contact preset its first instance; measured against the stalemate (the owner) | current |
| 355 | From L5e2 on (the lead designer: from §13n.12 on), every plan's checklist has a fourth item: the player decisions the pass changes or measures, their owner in §8 (#36), and #349's save and error rates on the designed menu, or "none" stated (the owner; amends #326) | current |
| 356 | The audit's points: #349's rates also reported apart for mirror and non-mirror cells; §8 corrected (position is built) and its table named by slot for lint checks 11 and 12 (tools pass); the pace numbers stale until the baseline; the work on the current decision layer re-measured with the designed menu | current |
| 357 | The baseline reduced to X, the first hot room, outcomes counted apart and the builds ship versus ship (no verb column, no like-for-like role); the reference without phases is the one-phase plan on the designed menu (the owner) | current |
| 358 | After the builds' lock: gap 7 and §13n.12 in parallel; the candidate slots decided and built before #348's derivation, which runs once on the final slot set; then the one-phase and with-phases measures on the designed menu (the owner) | current |
| 359 | Answers at PR #104's merge: 0 blocking, 5 non-blocking; the three moved records explained; the builds' missing mutations as §17 item 59 (the Swarm's warhead deliberately unpinned); J12 marked withdrawn | current |
| 360 | #337's X provisional: re-checked against the one-phase and with-phases measures' longest quiet gap, read with the stalemate off, before E7 is judged; X's range must exceed the battle limit | current |
| 361 | PR #109's fix round: U3 `L4.sweep.scoring.survival` (survival against crew; T's tally) with two mutations; lint check 12 fails an unmatched checklist; a first-hot information run; merge `ld/pace` and re-record | current |
| 362 | `L4.sweep.determinism.v2` withdrawn for `.v3` (slot `openFire` in place of `range`): after PR #104 and #336 both sides disengage and the shorter battle ends first, so byArrival was no longer killable | current |
| 363 | Gap 7: no range attacker among the reference four (accelerations within 3.6 %); a position attacker by turn margin against Lance (t180 10.69 s against 7.43–8.12) is measured in §13n.12, no role assigned before; no build changed | current |
| 364 | A phase names what is contested: passed through by its exit conditions when nobody contests it; at equal acceleration the range phase is a trade (held stern on only); §13n.12 measures pass-through and a margin's range attack (Engine boat, an estimate-only variant) (the owner) | current |
