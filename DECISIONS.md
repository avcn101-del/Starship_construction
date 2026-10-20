# DECISIONS — working log

This is the memory of the design discussion that started 2026-10-20. Every
row was agreed with the owner. On 2026-10-20 the base documents were written
from rows #1–#162: **`DESIGN.md` is now the current design** and the source
of truth; this file stays the dated, append-only log of what was decided and
why. A new decision is appended here **and** reflected in `DESIGN.md` in the
same commit.

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
| 5 | **Kept**: inertia and moment of inertia; recoil (Newton 3: kinetic recoils hard, beams barely, off-axis guns spin the ship); centre-of-mass shift when rooms are lost; heat and radiators (heat leaves only by radiation, radiators on the outer hull); infrared signature (hot ships are easier to **detect passively**; active scanning does not depend on heat); inverse-square falloff (beams, passive sensing, jamming); projectile time of flight; **square–cube law** (bigger ships have less hull surface per volume) |
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
| 13 | Fragments: a ship split by the structure graph becomes several rigid bodies, momentum conserved. **Superseded by #81 (SCRAM)**: a reactor that loses control shuts down instead of breaching, so a fragment without the bridge goes dark and drifts (no power, so no thrust either). An auxiliary bridge is a later module |
| 14 | **Rooms (11)**: Bridge 2×2; Reactor 2×2, 3×3; Engine 2×3 (exhaust on the aft hull; thrust through the CoM is **recommended, not validated**: off-axis thrust simply spins the ship); Magazine 2×2 (feeds through shared walls, chain explosion); Shield generator 2×2, 3×3; Crew quarters 3×2 (repair radius); Beam bay 2×2, 3×3; Kinetic turret 2×2, 3×3; **Spinal railgun 2×N** along the axis (longer barrel = faster round; recoil through CoM pushes back, does not spin; fires forward only); Missile bay 3×2; Empty hold 2×2 (cheap, light, structure, buffer). **Later rooms** (decided elsewhere): Hangar bay (#107), Jammer (#27), Auxiliary bridge (#13). No separate EMP room (#142) |
| 15 | **Fittings (6 at start)**, **one per hull edge segment**: Armour (tiers), Radiator, RCS (better far from CoM), Point defence kinetic, Point defence laser (#93), Sensor antenna. Later: Scan-proof plating (#27). A fitting takes power and control from the room it is mounted on. The hull surface is the scarcest resource |
| 16 | Rooms take damage **per cell**; function scales with surviving cells |
| 17 | **Firing arcs are blocked by the ship's own rooms** |
| 18 | **No combo table: every synergy is a flow or a field.** Four flows through shared walls, each proportional to wall length: power, ammunition feed, heat, blast. Fields: shield, repair, jamming, datalink. (An explosion travels through walls inside the ship and as a radial field outside it, #141.) Good and bad adjacencies emerge (reactor beside a beam bay: full power; reactor beside a magazine: heat conducts in and the rounds **cook off**; an empty hold as a blast buffer). A room's perimeter caps its neighbours, so diminishing returns are geometric. Hand-made combos are added only if the harness shows builds are too alike. The reactor wants to be deep inside but its heat only leaves through radiators on the hull, so it needs a chain of rooms to the hull: real spacecraft thermal design |
| 18b | **Three heat thresholds for every room**: hot (function degrades), overheated (the room shuts itself down; heat discipline normally acts first), critical (cells take damage and **the crew in the room die**; magazines cook off, reactors melt down). People can die because a room is cooked, not only because it is holed |
| 18c | **Empty holds conduct heat poorly**: an insulator and a blast buffer, so isolating for safety and cooling well are a real trade-off |

## 4b. Data model (the schema every decision maps to)

Three kinds of entity. **Blocks** (rooms and fittings) have stored
attributes. **Munitions** (rounds, missiles, craft) have their own. **Ships
have only derived values** (CoM, moment of inertia, acceleration, turn rate,
heat and power balance, signatures, firing arcs, coverage). Every numeric
attribute is a **base value plus a scaling exponent k** on the cell edge
(mass k=3, area k=2, length k=1), which is how #61–#64 live in the data.

| # | Block group | Attributes |
|---|---|---|
| 1 | Geometry | type, size, tier, placement rule, orientation |
| 2 | Mass and structure | density, hp per cell, price, scaling exponents |
| 3 | **Resistances** | one per damage channel: **kinetic** (momentum), **thermal** (beam energy), **blast**, **EMP** |
| 4 | **Wall channels** (6) | structure and control: **connectivity only**; power, ammunition, heat, blast: **capacity coefficient** × shared wall length |
| 5 | Power | produced, consumed per state |
| 6 | Ammunition | capacity, contents, feed rate |
| 7 | **Thermal** | heat generated per state, **heat capacity** (temperature = heat / capacity), conductivity, three temperature thresholds, radiator **area and emissivity** (T⁴, #143) |
| 8 | Fields | type, budget, radius, **falloff exponent** (2 passive and jamming, 4 active scan) |
| 9 | Signatures | EM when active, radar reflectivity; IR is derived from surface temperature |
| 10 | Control, crew, failure | provides or requires control; crew required and housed; behaviour on power loss, control loss (SCRAM for reactors), destruction (explosive energy), overheating |
| + | Action | weapon (calibre, launch energy, barrel length, fire rate, traverse), engine (thrust, exhaust direction), sensor (scan strength), hangar (launch rate, capacity) |

**Munition**: mass, launch velocity, seeker, warhead (damage channel and
energy), signature, hp (for point defence), fuel (delta-v), reusable, pilot.

Physics check: inertia, MoI and CoM (group 2 plus position); recoil
(munition mass × velocity); heat, radiators, T⁴ (group 7); surface IR (group
9 from 7); inverse-square and distance⁴ (group 8 exponent); time of flight
(munition); square–cube (scaling exponents); SCRAM and fail-safe (group 10).
Every kept law has a home. Each attribute must earn its place with a
measured effect in Mission 0; an attribute with none is cut.

## 4c. Physics answers found by the schema cross-check

| # | Decision |
|---|---|
| 137 | **Kinetic damage is momentum**: each cell takes part of the round's momentum (by its kinetic resistance) and the round stops when none is left. The ships' relative velocity is **not** counted (consistent with cutting ½mv², #6) |
| 138 | **Beams heat what they hit**: absorbed beam energy becomes heat in the target room (how the Furnace cooks a crew without penetrating) |
| 139 | **Stopping kinetic rounds costs the shield** budget and becomes heat, like everything a shield stops (consistent with #21) |
| 140 | **Ships have no propellant limit** (reactor-powered drives), a deliberate simplification; only craft have a delta-v budget (#106) |
| 141 | **Explosions**: inside a ship they travel through shared walls (blast channel); outside it they are a radial field acting on fragments, craft and nearby ships |
| 142 | **No separate EMP room**: the EMP warhead (#97) does that job. One fewer room to balance; reversible |
| 143 | **Radiators follow Stefan–Boltzmann**: radiated power ∝ area × emissivity × T⁴, and IR brightness follows the same law. Running hot dumps heat far faster but is far more visible; the emission posture gains a physical basis |

## 4d. Block profiles (qualitative; numbers come from Mission 0)

| Room | Produces | Consumes | Stores | Field, signature | On control loss or destruction |
|---|---|---|---|---|---|
| Bridge | control | little power (has its own **backup supply**, #147) | — | low | destroyed: every reactor SCRAMs, the ship goes dark |
| Reactor | **power, much heat** | — | — | IR only once heat reaches the hull | control loss: SCRAM then decay heat; heavy damage: containment breach; critical: meltdown |
| Engine | thrust, heat | power | — | **exhaust very IR-bright** | no power or control: zero thrust |
| Magazine | ammunition feed through walls | — | **ammunition by contents** | — | destroyed or critical heat: **explodes by the ammunition left** |
| Shield generator | **shield field** | power by budget | — | **EM-bright while absorbing** | no power: field off; absorbing makes heat |
| Crew quarters | **repair field** by surviving cells | little power | **crew** | — | destroyed: many crew die, repair lost |
| Beam bay | beam, **very much heat** | **much power** | — | bright while firing; firing window stays open | no power: ceases fire |
| Kinetic turret | rounds, **recoil** | ammunition, some power | — | muzzle flash | no ammunition or power: ceases fire |
| Spinal railgun | very fast rounds, axial recoil | **very much power**, ammunition | — | very bright when firing | no power: ceases fire; a long target |
| Missile bay | missiles | missiles from the magazine | **a small ready store** (#148) | tube opens on launch | destroyed: the missiles inside explode |
| Empty hold | — | — | — | — | structure only; **poor heat conduction, absorbs blast** |

Later rooms: Hangar (craft, fuel and ammunition: the biggest bomb), Jammer
(jamming field, very EM-bright, jams its own sensors), Auxiliary bridge
(weaker control).

| Fitting | Job | Consumes | Resistance, hp | Signature |
|---|---|---|---|---|
| Armour | stops | — | **high kinetic**, medium blast and thermal; heavy | — |
| Radiator | dumps its room's heat (T⁴) | — | **low hp** (thin panel) | **IR-bright, T⁴** |
| RCS | torque = distance × force | power | low | small puffs |
| Point defence kinetic | flak against munitions | its own small ammo store | low | — |
| Point defence laser | against munitions | power, heat | low | bright when firing |
| Sensor antenna | active scan and passive sensing; needs a control path to the bridge | power | low | **EM-bright when scanning** |

Later fittings: Scan-proof plating (lowers the radar reflectivity of the
room behind it); Decoy launcher (#149).

| # | Decision |
|---|---|
| 147 | **The bridge has its own backup supply**: it keeps control when its power is cut. Decapitation happens only when the bridge is destroyed, so "cut the power" and "decapitate" stay distinct routes (#82) |
| 148 | **The missile bay holds a small ready store**, refilled from the magazine through the shared wall; it explodes by the missiles inside it |
| 149 | **Heat decoys are munitions** fired from a later **decoy launcher** fitting: an IR signature imitating a radiator, no warhead. Munition schema, no new rule |

## 5. Weapons and defence

| # | Decision |
|---|---|
| 19 | **Starter weapons**: Beam (instant, falloff, heavy power and heat, precise when scanned); Kinetic (time of flight, strongest recoil, penetrates along its path); Missile/torpedo (slow, self-propelled, guided by its seeker, by default IR which hunts radiators and engine exhaust (#102); surface splash, chain risk in its bay); Point defence (shoots missiles). Weapons come in **sizes** (small/medium/large: damage, recoil, slower traverse when large, heat concentration, hp, target size) |
| 20 | **EMP** is a missile warhead (#97), not a separate room (#142): it forces a SCRAM, disabling without destroying. Tractor beam and mines deferred. Ramming and boarding cut |
| 21 | **Shield = energy screen**: an absorption **rate** set by its power, plus a small buffer for spikes. Absorbed energy becomes **heat**. Kinetic rounds lose a fixed amount of momentum (small rounds stopped, railgun passes reduced). Generators project a falloff field; gaps where coverage does not overlap are layout weak points. No four-facing shields |
| 22 | Attack/defence matrix: beam stopped by shield, weak at range; kinetic stopped by armour, dodged at range; missile stopped by point defence, misled by decoys or running cold. No defence stops everything. This is static physics for puzzle design, not bridge-sim's learning counter table |

## 5a. Fields and their interactions

| # | Decision |
|---|---|
| 99 | **One rule for every field** (shield, repair, jamming): each source has a **finite budget** spread over its coverage with falloff; where fields overlap they **add**, each source paying from its own budget. Shield overlap is therefore **depth vs breadth** (a hit in the overlap is shared by both generators, each heating by its share; deep and redundant but smaller coverage and more gaps), not waste. Supersedes "two emitters too close waste power" |
| 100 | **Firing window**, local only: the shield opens a small hole **only at the point where your own round crosses its coverage**, the size of the round plus a margin, **only while the round passes**. Kinetic: an instant flash. Missiles and craft: at the tube or hangar door as they leave (and as craft return). **Beams keep their hole open for as long as they fire.** Only enemy rounds travelling back along your line of fire get in: a precise target ("shoot down the barrel of a firing gun"), hardest on beams |
| 101 | **Your jammer also jams your own sensors**: you cannot jam and scan actively at once. **Burn-through**: active scan falls off with distance⁴, jamming with distance²; close enough, the scan burns through (the Ghost is revealed only by closing in) |
| 102 | **Infrared sees only the surface.** Deep reactors are invisible until their heat conducts to the hull. **IR seekers hunt radiators and engine exhaust**, not reactors (corrects an earlier statement). Radiators are your own IR beacons; heat decoys work by imitating one |
| 103 | **Shields do not block scans**, but a shield that is absorbing is **EM-bright**; the cold posture turns shields off for a reason |

## 5b. Ammunition

| # | Decision |
|---|---|
| 89 | **Ammunition is finite** for kinetic weapons and missiles; beams need none (limited by power and heat). Sustain becomes a new row of the attack/defence matrix: beam sustainable but hot, kinetic a stock, missiles few and precious |
| 90 | **Reloading between battles is free**: ammunition is an in-battle resource, not a credit sink |
| 91 | Out of ammunition counts toward **Disabled** (attrition becomes a capture route). A magazine's explosion scales with the ammunition left in it, and with its contents (HE far more than AP). A bigger magazine holds more and is a bigger bomb |
| 92 | The "open fire" order now also saves ammunition. Harness check: default magazines last a disciplined 3–6 minute battle and run dry around minute 4 when firing freely |
| 93 | **Point defence comes as two fittings**: kinetic (flak, a small ammo store that can be exhausted) and laser (power and heat, competes with shields and beams) |
| 94 | **Rule for an ammunition type**: it changes one physical parameter and pays with another; it has a best and a worst target; it has one counter; it serves a core law. No type is strictly better |
| 95 | **Who chooses ammunition**: the player sets the magazine's contents in the shipyard; each shot's type is chosen **automatically** against a scanned target (armour → AP, exposed fitting → HE), the default against an unscanned one. Switching type costs a reload time |
| 96 | **Kinetic rounds**: Standard; AP (dense core, deep, almost no blast; wasted through thin rooms); HE (surface blast, poor penetration; best against exposed fittings, the corvette's answer to a capital); Sabot (lighter, faster, **less recoil** for the same launch energy, less damage); Flak (proximity fragmentation, anti-missile). No kinetic EMP round (too small a payload) |
| 97 | **Missiles = seeker + warhead.** Seekers: IR (default; countered by running cold, heat decoys); radar (active; countered by jammers, scan-proof plating); anti-radiation (homes on emitters: jammers, scanning sensors, shield generators; countered by going silent); designated (flies to the room you target; needs your scan and antenna; the capture tool). Warheads: HE (default), penetrator (deep and narrow, reactor killer), **EMP** (forces a SCRAM, no hull damage, capture) |
| 98 | **Starter ammunition**: kinetic Standard, AP, HE; missile IR + HE. Sabot, flak, the other seekers and warheads unlock by salvaging them from puzzle ships that use them (e.g. the Ghost gives anti-radiation). 4 seekers × 3 warheads = 12 missiles from 7 unlocks |

## 5c. Carriers

| # | Decision |
|---|---|
| 104 | **A craft is a reusable missile**: at a carrier's scale a fighter is the size of a missile, so craft use the **projectile model** with guidance (the same seekers), plus an hp pool, fuel, payload and a **named pilot**, and they fly home. Craft size scales with the carrier's tier, like rooms. No grid per craft (light on a phone) |
| 105 | Reused unchanged: weapons and payloads (kinetic, missiles, torpedoes), ammunition from the **carrier's magazines** through the shared wall with the hangar, point defence and flak against craft, crew rules (a lost craft is a dead pilot) |
| 106 | **Four new rules only**: **launch and recovery cycle** (the hangar door launches so many craft a minute; returning craft must rearm and refuel; throughput); **datalink** (a field from the carrier; jammed craft fall back to a weaker autonomous mode; information, burn-through); **fuel** (a delta-v budget, the rocket equation at its simplest; out of fuel = cannot return; throughput); **Air wing orders** |
| 107 | **Hangar bay**: a room that must touch the hull (launch door). Craft rearming and refuelling inside make it **the biggest bomb aboard**: the **Midway window** (hit the carrier as its strike returns) emerges from the launch cycle and the explosion-by-contents rule |
| 108 | **No new verbs**: scan a zone → a **recon drone** flies there and scans at close range (burn-through without bringing the carrier close); target a room → **bombers** strike it; switch preset → the air wing changes mission. **Air wing orders (4 slots)**: mission (CAP / strike / recon / escort), recall threshold (fuel or ammunition), wave size (all at once / small waves), on datalink loss (autonomous / return) |
| 109 | Risks and limits: a cap of ~24 craft per side, measured with `--perf` under phone emulation; at fit view craft are dots with trails (slow-mo zoom brings them close) |
| 110 | **Order of work: after Mission 0.** First an **enemy carrier** as a puzzle boss; the player's carrier at drydock T5 |

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
| 33 | **Intact salvage** (detailed by #83, the loot is whatever is left): destroying gives scrap (credits); disabling recovers intact rooms; the first intact room of a new type **unlocks** it |
| 34 | Hull size opens in tiers; the square–cube law keeps bigger from being strictly better. Repairs per cell cost credits. **Ships are never lost permanently** |
| 35 | Roguelite environments each change **one constant of one law**: nebula (scan weaker), near a star (radiators worse, IR background noise), asteroid belt (trajectories blocked, cover), gravity well (background pull) |

## 7b. Economy

| # | Decision |
|---|---|
| 71 | Three rules (bridge-sim lessons: one loss emptied the purse; credits piled up once everything was bought): the economy **rewards the core skill** (precise disabling pays more than wrecking); the player is **never stuck**; there is **always something to spend on** |
| 72 | Sources: puzzle reward; scrap from destroyed enemy rooms (little); intact rooms (much); prize money for a captured ship. Sinks: rooms and fittings of unlocked types; per-cell repair; crew replacements; **drydock tier upgrades** (the biggest sink, lasting to the end) |
| 73 | **Rooms are owned items**, counted by type, size and tier (three M reactors at T1 = up to three on the hull). Rearranging is free; a removed room returns to the inventory; intact salvage goes straight to it. **A room destroyed in battle is not lost**: it is repaired per cell |
| 74 | Prices come from a formula (cells × tier factor × type factor) in `data.js` |
| 75 | **Rooms belong to a tier** (cell sizes differ). Moving up a tier means buying rooms at the new size; old-tier rooms can be **traded in** for part of their value |
| 76 | **Emergency repair is free after a loss**: bridge, one reactor, enough engines to move, one weapon. Everything else is paid |
| 77 | **A beginner corvette is always free**: T1 template, cannot be sold, always repaired for free, kept beside the main ship |
| 78 | **Beaten ladder ships can be fought again for half the reward** (the farm; the roguelite pays score only) |
| 79 | **No bonus for sparing enemy crew**: intact salvage already rewards disabling, and paying per life spared would price death and break the sober tone |

## 7c. Capture and reactors

| # | Decision |
|---|---|
| 80 | Ships are fail-safe, as real ones are: losing the bridge does not blow up the ship |
| 81 | **SCRAM**: a reactor that loses control shuts down automatically (power to zero, the ship goes dark). It keeps producing **decay heat** for a while: with radiators it cools safely; with none left it overheats, melts down, then explodes. A reactor **damaged** heavily breaches its containment (short countdown, explosion). **Big explosions come only from damage** (reactor, magazine) or from overheating, never from losing control. Aiming away from reactors and magazines is part of capture play |
| 82 | **One condition, many routes. Disabled** = the enemy has no weapon able to fire **and** no thrust for ~10 s, or it strikes its colours. The battle then ends with the ship captured. Routes: cut the power walls; decapitate (bridge lost, every reactor SCRAMs); split it at a choke point (the bridge half with no reactor dies); mission kill (all weapons and engines); EMP (forces a SCRAM, the enemy must restart); heat it until it must cease everything; surrender |
| 83 | **The loot is whatever is left**: a disabled ship is always captured, yielding its intact rooms (to the inventory), its blueprint and prize money. Precise fighting captures a ship; sloppy fighting captures a wreck. **Destroyed** happens only when a reactor or magazine explodes or the ship breaks into too many pieces: scrap plus any dark fragments that did not explode, recovered after the battle |
| 84 | The same condition applies to the player: your ship disabled is a loss |
| 85 | Puzzle ships have **two answers**: a kill route and a harder capture route. Capturing is slower while the battle's physical clock keeps running |
| 86 | Puzzle scripts may **strike colours** when hopeless (no weapons and no engines); some ships fight to the end. Personality per ship |
| 87 | A captured ship can be **commissioned only if your drydock has its tier**; otherwise it is broken up into the inventory (its rooms wait for that tier) or sold for prize money |
| 88 | **Your crew on a dark fragment survive and are recovered after a win** ("Recovered: 14 crew of Section 4") |

## 8. Standing orders and battle

| # | Decision |
|---|---|
| 36 | **Coverage rule**: every in-battle decision has exactly one owner: an automatic rule (one right answer), a standing order (answer depends on the opponent), or a player verb (judgement in the moment). Every new law goes through this table |
| 37 | **Automatic**: RCS recoil compensation; point defence picks the nearest missile; crew repair order follows the power priority list; reactor containment always first; fragments without the bridge |
| 38 | **Standing orders (12 slots in 4 groups)**. Movement: engagement range, position relative to the enemy (bow / flank / stern), movement style (hold / orbit / strafe), dodging (never / missiles only / always). Firepower: facing, firing style (salvo / ripple), open fire (in range / sure hit), default target priority. Energy: power and repair priority, heat discipline (threshold and response: cease fire or back off). Emission: emission posture (cold / normal / full), auto-scan (on / off). Shields follow the emission posture |
| 39 | **Presets** bundle the orders ("Cold approach", "Gun duel", "Flank"); the in-battle verb switches presets, never single slots. The harness sweeps presets |
| 40 | Helm conflict resolution, fixed order: **position, then facing, then dodging**. The report records which order yielded |
| 41 | **Report**: the **KIA list first**; the **cascade tree** (each damage event carries its cause); timeline of scans and targets; what the enemy scanned of you; heat graph; salvage and unlocks; kill-cam replay (deterministic re-simulation from seed + player inputs) |

## 8b. Enemy AI

| # | Decision |
|---|---|
| 111 | **Symmetry**: the enemy plays by the player's rules. Four layers: automatic (same), standing orders and presets (same 12 slots; each puzzle ship has its own presets), **verbs** (the enemy script chooses among the same three: scan a zone, target a room, switch preset), puzzle mechanics (designer-only actions: charge a superweapon, call reinforcements, strike colours). Scripts use bridge-sim's when → do engine and hold only what the automatic layer cannot do: mechanics, personality, conditional reactions (bridge-sim lesson: the Brawler) |
| 112 | **No information cheating**: the enemy knows only what it has scanned; it never reads your true layout or your standing orders. One knowledge model per side |
| 113 | Same physics, same delays (scan time, target switch delay, heat limits) |
| 114 | **Tell rule**: every special mechanic has a **physical precursor visible to passive sensors** at least a few seconds before it happens (a charging superweapon glows on EM and heats up; hangar doors open) |
| 115 | Deterministic: the same state gives the same decision. Variety comes from layout variants |
| 116 | **No learning across battles** (bridge-sim measured and cut it); reactions within a battle are fine (e.g. switching ammunition after seeing your armour). The player keeps an **intel journal** per ship class: tells seen, presets used, personality; never the layout (it varies) |
| 117 | **Personality is data, four parameters**: aggression, patience, caution, resolve. They only tune existing thresholds and presets. Resolve ties to capture: low resolve is easy to capture, possibly with less loot |
| 118 | **Factions are bundles of defaults** over existing systems, not new systems: a personality range, preferred technology, **one signature mechanic** (through a core law), a surrender culture, visuals and voice (hull colours, crew naming, comms tone). A ladder chapter is a faction; the roguelite varies by faction; the intel journal is per faction |
| 119 | **Three factions to start**, one per core law: a throughput faction (heat and beams), a dependency faction (armour and kinetics), an information faction (stealth and missiles). The five puzzle ships are split among them |
| 120 | **Wildcard** (the occasional curve ball) is **drawn once at battle start from the battle's seed**; nothing random happens during the battle (replay and harness still work). It can change the magazine (e.g. radar seekers instead of IR), shift personality within the faction's range, pick a rare preset, or add one unusual room. Rules: **never on the first ladder encounter**; on in replays and the roguelite; **detectable** (the tell rule and scanning apply, so scanning first is rewarded); **the harness measures wildcard variants** and the intended answer, after adapting by scanning and switching presets, must still win |
| 121 | Terms: "puzzle ship" is the internal design term (an enemy built around an answer), not a quest. **Player-facing term: "named ship"** (each has its own name and personality, e.g. *the Furnace*) |

## 8c. Difficulty

| # | Decision |
|---|---|
| 122 | **Difficulty comes only from mechanics; no hidden stat multipliers** (bridge-sim: +4% a win compounded fourfold in 4v4; damage checks never forced a role). Seven levers, all visible and learnable: laws tested per ship (one, then two combined); concealment (none → jammer, scan-proof plating); physical clock (wide → tight); wildcard (off → on); enemy tier relative to yours; environment (roguelite); personality |
| 123 | The difficulty curve is **measured**: the harness per named ship (intended vs naive), `tools/campaign.js` across the ladder. A chapter is harder than the last only when the numbers say so |
| 124 | **One standard difficulty plus assist options** that change the player's side, never the enemy's stats: game speed (e.g. 0.75×, useful on a phone), longer tells, extended clock; and **Ironman** (no pause, one save) for a harder game. The harness measures the standard difficulty |

## 9. Architecture

| # | Decision |
|---|---|
| 42 | Kernel without DOM (runs in Node). **The renderer reads only the player's knowledge model, never the truth.** Every damage event carries its cause id. Two RNG streams: simulation and effects (bridge-sim §8 v0.31: drawing consumed the sim's `Math.random`) |
| 43 | Files. Foundation: `data.js`, `util.js`, `events.js`. Kernel: `layout.js`, `graph.js`, `body.js`, `heat.js`, `field.js`, `projectile.js`, `damage.js`, `sensors.js`, `helm.js`, `crew.js`, `enemy.js` (bridge-sim's when → do engine, enemy only), `battle.js`. Meta: `campaign.js`, `run.js`. Presentation: `renderer.js`, `effects.js`, `ui.js`, `shipyard.js`, `report.js`. Tools: `tools/harness.js` (Node), `tools/campaign.js` (Node), `tools/smoke.js` (Playwright) |
| 44 | ~~Order of work 0.1–0.6~~ **superseded by Mission 0 (§9b)**: foundations are proven bottom-up in text before any rendering; chapters are content added on top of a proven foundation |

## 9b. Mission 0: foundations first, text only

| # | Decision |
|---|---|
| 125 | **Mission 0 comes before any content**: build the ship systems and prove the balance and physics bottom-up. Theory differs from practice, so every law is checked against numbers. Chapters come only after Mission 0 exits. (A chapter 1 draft was discussed and **not adopted**; chapter design waits for Mission 0) |
| 126 | **Text only**: no rendering, no graphics; a Node command-line tool, data first |
| 127 | **Bottom-up levels**, each built only on levels that passed: **L0 materials** (round vs plate, beam vs plate, a point in a shield field); **L1 one room alone** (reactor, radiator, magazine, turret, shield generator, engine, crew quarters, bridge); **L2 pairs and clusters** through shared walls (power vs wall length, cook-off time, hold insulation, shield overlap sharing); **L3 minimal ship** (smallest valid ship with each room type once: CoM, MoI, recoil spin, split momentum, SCRAM in a fragment); **L4 ship vs a static target** (each capture route reaches Disabled; cascade tree correct); **L5 ship vs ship** (no dominant build; degenerate builds punished); **L6 scaling** (same layout T1–T6: square–cube, small rounds vs capital armour) |
| 128 | **Each constant is tuned at the lowest level where it acts** (radiator capacity at L1, not in battle) |
| 129 | **Output**: time-series tables; from L4 a per-second battle log (positions, room hp, heat, power, events with their cause chain); every scenario prints **expected (from a formula), actual, PASS/FAIL**. Running "1000 times" means sweeping initial conditions (distance, angle, relative velocity, layout variant, personality, wildcard, a constant over a range), since a seed repeats exactly; sensitivity to a small change (e.g. 5° of start angle) flags an over-sensitive law |
| 130 | Accepted risk: the first time the game is seen is after L5, so the feel (HANDOFF's biggest unknown) is unverified until then |
| 131 | **Mission 0 is an agentic data-gathering exercise**, run in parallel. Determinism makes any result re-runnable from its seed and command line; text output is objective. Within a level scenarios fan out in parallel; between levels there is a gate (a pipeline) |
| 132 | Roles: **runner** (runs scenarios and sweeps, writes JSON with the command line); **verifier** (independent: re-runs from the command line, checks the expected formula, checks no criterion changed after it was locked; receives only the command and criterion, never the runner's conclusion); **analyst** (summaries, sensitivity, tuning proposals); **integrator** (the only writer of `data.js` and the results ledger) |
| 133 | Guardrails: **criteria are locked before running** (the bridge-sim rule "a criterion stated before the measurement"); agents tune constants by **run-time overrides**, never by editing files (bridge-sim's `--eval`); a conclusion without a re-runnable command does not count; each wave has an agent cap, and a multi-agent wave runs only with the owner's explicit go-ahead |
| 134 | **Autonomy line**. Agents alone: run, re-run, report, tune constants **within ranges the owner approved**, flag anomalies, hunt exploits. Owner approval: new criteria, constants outside the approved ranges, **changing a law**, anything that touches `DECISIONS.md`. Never delegated: the feel of play, playtests on the owner's phone, design decisions when a law fails |
| 135 | **The kernel and the scenario framework are written first, coherently, by one agent**; parallel agents come in afterwards to fill and run scenarios |
| 136 | **Nightly regression**: a scheduled task re-runs every passed scenario each night, so a change that breaks a proven law is caught the next morning (bridge-sim: a frozen fight the smoke test never reached) |
| 144 | **Scenario spec** (one data file per scenario): `id` (e.g. `L1.reactor.steady-heat`), `level`, `laws`, `dependsOn` (the gate between levels), `setup` (from data, never hand-coded), `run`, `measure`, `expected` (a formula over `data.js` constants), `tolerance`, `criterion` (within tolerance, inequality, or win rate), `locked` (date and a hash of the criterion, checked by the verifier), `tunable` (constants an agent may tune and their range). Folders: `mission0/scenarios/`, `mission0/results/` (JSON with the command line); `MISSION0.md` is the ledger generated from the results |
| 145 | **Approved ranges**: every tunable constant in `data.js` carries `min`–`max`. Claude proposes the initial ranges per level; the owner approves them once; agents then tune freely inside them |
| 146 | Remaining topics before writing the docs, in order: working rules for the new repo's `CLAUDE.md`, sound, game title |
| 150 | **`CLAUDE.md` of the new repo**, built on bridge-sim's. **Kept**: every balance number in `data.js`; one responsibility per file; events for presentation; docs and `CHANGELOG.md` updated in the same commit; honest reporting; short imperative commit subjects with a why-body; no build tooling, `package.json`, linters or test frameworks unless asked. **Dropped**: `file://` and classic scripts, LCARS, bridge calls, bridge-sim's balance targets, the visual-quality rule (returns after Mission 0). **Added**: `DECISIONS.md` is the source until `DESIGN.md` is written from it; changing a law needs the owner; new ideas pass the four gates and the coverage table; ES modules, no build, no npm; **the kernel never touches the DOM**; **no `Math.random` in the simulation** (seeded RNG only; effects have their own stream); the renderer and the enemy read only their knowledge model; every attribute follows §4b with `min`–`max` and a scaling exponent; no hidden stat multipliers; Mission 0 discipline (#133); the autonomy line (#134); before finishing, run every passed Mission 0 scenario (after Mission 0, also the phone-viewport smoke test); docs and code in English, discussion with the owner in Vietnamese mixed with English |
| 151 | **Git flow**: when the base docs are written, create `main` and make it the default branch; **one branch and one PR per Mission 0 level**; the owner reviews and merges |
| 152 | **No rendering code until Mission 0 exits** (enforces text-only; agents drift towards visuals) |

## 9c. Mission 0 exit criteria and L0 (agreed before L0 started)

| # | Decision |
|---|---|
| 163 | **SI units** in the simulation (kg, m, s, J, W, K): expected formulas are textbook physics, and the decided numbers (#54) are already SI. Constants are tuned within ranges; units stay real |
| 164 | **Mission 0 exits only when all eight hold** (locked like any criterion): **E1** every L0–L6 scenario PASSes its locked criterion; **E2** invariants hold on every sweep (same seed → same log hash; momentum conserved at splits; heat generated = heat radiated + heat stored; no NaN); **E3** every kept physics law has at least one passing proof scenario; **E4** every schema attribute has a measured effect, or it is cut before exit; **E5** no dominant build: no build, fuzzer-made included, wins more than **75%** against the reference set, and every degenerate build loses ≥ 3 of 4 against the reference ship on the same budget; **E6** all six underdog paths work: for each, a ship on **60%** of the budget beats one on 100% with the intended tactic and loses without it; **E7** the median reference battle lasts 3–6 minutes; **E8** a T1 and a T6 1v1 battle cost at most **a quarter of the phone's frame budget** per step in Node; the exact milliseconds are set at L3 when first measured, approved by the owner, then locked |
| 165 | **L0 scenarios (materials)**: `L0.kinetic.penetration`, `L0.kinetic.overpen`, `L0.blast.surface`, `L0.beam.falloff`, `L0.beam.burn`, `L0.shield.point`, `L0.shield.kinetic`. Kinetic penetration uses **sectional momentum** (momentum per cross-section, p/A), as real armour penetration does: calibre and armour both scale with the cell edge (k = 1), so rounds and armour **of the same tier balance by themselves** (raw momentum would scale k = 3 and big guns would overwhelm big armour). Beams follow a **Gaussian beam**: nearly flat within the focus range, then 1/d², as real lasers fall off |
| 166 | **L0 approved ranges (T1, size M)**: round mass 0.5 kg (0.2–2, k=3); muzzle velocity 800 m/s (500–1000, k=0); armour kinetic resistance per cell set so an AP M round penetrates 2–3 cells (0.5×–2×, k=1); HE blast energy 2 MJ (0.5–5 MJ, k=3); beam power 5 MW (1–20 MW, k=2); beam focus range 600 m (300–1500 m, k=1); shield budget 10 MW absorbed (2–40 MW, k=2); shield field radius 40 m (20–80 m, k=1); momentum a shield stops per round equal to one S round's (0.5×–2×, k=1) |

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

## 10b. Sound (after Mission 0; principles fixed now)

| # | Decision |
|---|---|
| 153 | **No sound travels in vacuum.** Four sources only: **your own ship through the hull** (dull impacts, the hull groaning before it splits, machinery hum, the reactor beating like a heart); **comms** (crew voices, reports, last words); **alarms** (escalating with the three heat thresholds, breach alarms); **sensor sonification** (the bridge computer turns what the sensors detect into sound, like a sonar operator), which **obeys the information law**: an explosion nobody detects is silent. Silence is the strongest sound (last words, the signal cut, then nothing); SCRAM is the heartbeat slowing to a stop |
| 154 | **Android haptics**: the phone vibrates with the force of each hit on your ship (felt through the hull, consistent with hearing through it); can be turned off |
| 155 | **Synthesised sound** (Web Audio API, no sample files): lighter for the offline PWA, and sounds follow physical parameters (calibre, energy, distance) |
| 156 | **Simulation events carry what sound needs** (energy, distance, damage channel, room, crew aboard), fixed from Mission 0 so the kernel need not change later |
| 157 | **No music in battle**, only hull sound and silence; music in the hangar and the memorial |

## 10c. Setting, captain and tone

| # | Decision |
|---|---|
| 158 | **Setting: a privateer** under a letter of marque, living on prize money (fits capture, prize money, factions, salvage). Rejected: salvager (hard to justify constant fighting), naval officer (navies do not pay their own repairs) |
| 159 | **The captain** (the owner's words): fights for the underdogs; practical, cynical, with a moral code that is a little funny; knows what is right and will do right, but that does not mean they cannot fight dirty. The mechanics already say this: the six underdog paths, the dirty tricks (cold approach, decoys, shooting down a firing barrel, power cuts, EMP, capture for loot), and a moral code that is the player's choice, never paid for (#79) |
| 160 | **Tone rule, Firefly-style**: the captain's voice is dry, cynical and funny; **death stays heavy** (#49, #50). A joke is how the captain carries a loss, never the game making light of it. **Dark comedy** in comms and crew lines |
| 161 | **Narrative direction**: dark comedy with **plot twists**. Story is content, written after Mission 0 like the chapters; it adds no mechanics. Firefly is a reference for tone only: no names, terms or phrases taken from it |
| 162 | **Title: Duct Tape Navy: Mostly in One Piece.** A battered navy patched with tape, whose ships are *mostly* still whole: the joke names the signature mechanic (ships breaking into fragments) and hints at the cost (the missing piece had people in it). Quick web searches found no game with this name; a store and trademark check is needed before any public release |

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

Named crew with veterancy; escape pods; sound carried through the hull
(only your own ship is heard, enemy explosions are silent); **surrendered
enemy crew joining yours** as replacements; **beam modes** (focused: narrow,
intense, short, deep; wide: weaker, covers more); **battery / capacitor**
room (store power for a burst: a time window); **heat sink** room (store
heat for a while, then it must be vented: a time window). The last two were
proposed in an early room list the owner rejected and were never approved. (Rescuing crew on dark
fragments moved to #88.)

## 13. Still open

Moved to `DESIGN.md` §17 (open questions) when the base documents were
written. Every topic of the original list is decided: shipyard and tiers
(§11b), schema (§4b, §4d), combos (#18), enemy AI (§8b), difficulty (§8c),
economy structure (§7b), working rules (#150–#152), sound (§10b), setting,
tone and title (§10c, #162); chapter 1 waits for Mission 0 (#125).
