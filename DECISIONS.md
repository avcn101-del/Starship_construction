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
| 169 | **Blast spreads as a wave front** (kept as built): the excess flows from the damaged region to all its unsaturated neighbours at once, by shared wall length, rather than filling cells one at a time, because a blast is a pressure wave. Reports separate **damaged** (any energy) from **destroyed** (≥ its resistance): a 2 MJ burst destroys 1 cell and damages 4. A contact burst on an open face also **vents part of its energy to space** (#141): a provisional constant `he.coupling` (the fraction that enters the hull), modelled from the L0 v2 scenarios |
| 170 | **Shield budget double counting** (found by the physics checker): each point of the field can absorb up to budget × g(r), so simultaneous hits at different points could together absorb more than the budget, against #99. **L2 must resolve it before L2 starts** |
| 171 | **`shield.kineticStop` is computed exactly** as one S round's sectional momentum at T1 (no hand rounding), so an S round is stopped at full strength by definition; its range stays 0.5×–2× of that value |
| 172 | **`shield.radius` is the half-strength radius** of g(r) = 1 / (1 + (r / radius)²) (confirms the L0 reading of #166) |
| 173 | **"AP M penetrates 2–3 cells" (#166) is met** by passing 2 cells and stopping in the 3rd. Round types (#96) are not modelled until munitions are built; until then L0's "AP" is the plain steel round |
| 174 | **Weak checks**: the locked L0 criteria stay as they are; **stronger v2 scenarios** are added with criteria the owner approves. Heat invariants that hold by construction **do not count towards E3** until L1 gives heat somewhere to go |
| 175 | **Lock coverage and stray numbers**: records also carry a hash of each scenario's `run()`; the simulation step and the burn time limit move into `data.js`; new scenarios draw their inputs from data (#144) |
| 176 | **L0 v2 criteria approved** (beside the locked L0 scenarios, not replacing them): **`L0.blast.surface.v2`**: the energy vented at the open face is exactly (1 − coupling) × E; absorbed + escaped + vented = E; damaged and destroyed reported apart; damage non-increasing with grid distance from the burst; the damaged region symmetric about the burst row while it does not reach a plate edge. **`L0.beam.burn.v2`**: one-sided time, expected ≤ actual < expected + one step; heat ≥ burn energy and the excess below one step's energy. **`L0.kinetic.penetration.v2`**: the continuous depth s0 / R against the formula, relative 1e-9, every tier and size. **`L0.shield.point.v2`**: beam powers from `data.js` (0.5×, 1×, 2×, 6× the M beam, so the M beam itself is run); no heat invariant (#174). **`L0.shield.kinetic.v2`**: an S round stopped exactly with the computed `kineticStop`; `kineticStop` swept 0.5×–2×: S is stopped only at ≥ 1×, and exit velocity is non-increasing as it rises. **`he.coupling`** (the fraction of a contact burst's energy that enters the hull): 0.5, approved range 0.2–0.8, k = 0. Claude does not know the real value for a starship; it is a constant to tune, not a measurement |

## 9d. Review roles (decided after L0)

| # | Decision |
|---|---|
| 167 | **No AI checks its own work.** Until L0 one session wrote every decision, document and line of code and also checked them (self-confirmation, shared blind spots, context loss). **Four roles, each its own session, handing over through GitHub**: **lead designer** (discusses with the owner, keeps `DESIGN.md` and `DECISIONS.md`, never reviews its own code), **engineer** (builds a level as designed, one branch and PR; never changes the design, asks instead), **reviewer** (read-only, reviews a PR against `DESIGN.md` and `CLAUDE.md`, re-runs, comments on the PR), **physics checker** (derives each scenario's expected result **blind**, before reading the code, posts it on the PR, then compares). Reviewers receive artifacts, never the author's conclusions. Roles are defined in `.claude/agents/`. The owner decides and merges, and keeps the playtests. A reviewer may run on a different model to reduce shared blind spots |
| 168 | **Retroactive review of L0**: a reviewer reviews PR #1 and a physics checker re-derives the seven L0 formulas |

## 9e. L0 approvals, merging and hand-over (2026-10-21)

| # | Decision |
|---|---|
| 177 | **L0 pending items approved as proposed**: the four provisional ranges (`armour.blastResistance` 1 MJ, 0.3–3 MJ; `armour.burnEnergy` 30 MJ, 10–100 MJ; `room.kineticResistance` 6.75e4, 3e4–1.4e5; `shield.bufferSeconds` 1 s, 0.2–5 s) become approved, the buffer still having to show a measured effect by L2 or be cut (E4); the fixed constants (steel density, rounds 4 diameters long, S and L at 2/3 and 3/2 of M, beam waist 1/√2 of half a cell, shield falloff exponent 2, simulation step 1/60 s, burn time limit 3600 s) are approved; the rule **continuous beams meet the shield's rate, its buffer catches impulses** is approved (this resolves the physics checker's mismatch on `L0.shield.point.v2`, which modelled the buffer filling under a beam because the rule lived only in DESIGN §17.6); the engineer's three locked v2 readings are approved; the knife-edge result (coupling 0.5 × 2 MJ = exactly the blast resistance) is accepted, and **new scenarios place no case exactly on a threshold unless they test that threshold**. The `approved` flags in `js/data.js` are flipped by the engineer at the start of L1 |
| 178 | **Claude merges pull requests after the owner approves each merge** (supersedes the "owner merges" part of #151) |
| 179 | **Hand-over between chats**: `STATUS.md` holds the current state (open PRs, pending approvals, running sessions, scheduled tasks, next steps, lessons) and is updated at the end of every working block, so a new chat with Claude can resume from the repository alone. Scheduled check-ins belong to the chat that made them; a new chat re-creates its own from `STATUS.md` |

## 9f. Approval tiers and the L1 plan (2026-10-21)

| # | Decision |
|---|---|
| 180 | **Approval tiers.** The owner decides **direction only**: the vision and pillars, the three core laws, the player's verbs and loop, adding, removing or changing a physics law or an exit criterion, what is built next and what is cut, setting, tone and story, spending caps, and anything the lead designer flags as uncertain or irreversible. **Everything technical the lead designer decides and records**: scenarios, criteria and formulas, constants, ranges and scaling exponents, models that implement a decided law, architecture and files, process and tooling, new constants an engineer introduces, the go-ahead for agent sessions within the cap, and **merging a pull request once the reviewer and the physics checker report no blocking finding**. Each such decision is still a row here, marked *LD*, and listed in `STATUS.md` for the owner, who can veto it afterwards (a veto is a new row). Spending cap until changed: **20 USD of sessions per Mission 0 level**; beyond it the lead designer asks. Documentation-only commits by the lead designer go straight to `main`; code always goes through a pull request and the reviewer. Supersedes the owner-approval parts of #134, #145 and #178. Reason (the owner's words): the owner follows the technical proposals anyway and wants to spend their attention on direction |
| 181 | *LD* **L1 scenarios** (`DESIGN.md` §13c.2): `L1.radiator.cooling`, `L1.radiator.steady`, `L1.room.thresholds`, `L1.reactor.power`, `L1.reactor.scram`, `L1.reactor.breach`, `L1.magazine.cookoff`, `L1.turret.fire`, `L1.shield.generator`, `L1.engine.thrust`, `L1.quarters.repair`, `L1.bridge.control`, `L1.beambay.heat`. The **beam bay joins L1** (not in #127's eight): its heat is the Furnace's mechanic and the throughput law's main heat source, one more scenario on the same model. Threshold crossings are one-sided (expected ≤ actual < expected + dt), closed forms to 1e-9, no case on a threshold unless it tests it (#177); every scenario checks the heat invariant, no NaN, and the event fields of #156. Honest scope: no conduction, no radiator cooling a reactor (it is placed inside), no shared repair budget, no recoil spin, no control paths, no feed through walls (L2, L3) |
| 182 | *LD* **Per-room heat model** (§13c.1): T = Q / C absolute, C = cells × capacity per cell, rooms start at 290 K, radiators dump their room's heat by εσAT⁴ with real σ and ε = 0.9, explicit Euler at the step. **Two threshold classes**: plant rooms (reactor, beam bay, shield generator, engine) 600 / 800 / 1000 K, their temperature being the plant's working temperature, the crew at their stations dying when the plant is critical; crewed rooms (bridge, quarters, turret, missile bay, hold) 330 / 350 / 380 K; magazine 330 / 350 / 450 K (cook-off). Overheated shuts the room down, it restarts below hot. Consequence to measure at L2: a crewed room on a working reactor's wall cooks unless a hold insulates it (#18c), the intended layout pressure. Cells carry an **integrity** in [0, 1] (passed by a round: 0; blast: minus absorbed / resistance; repair raises it). **Crew die per destroyed cell** (`crewPerCell` each; #49 refined) and all at once at critical heat (#18b). The heat invariant (generated = radiated + stored) now counts towards E3 (#174) |
| 183 | *LD* **L1 constants and approved ranges** (T1, size M; §13c.3): heat capacity 6e5 J/K per cell (2e5–2e6, k=3); the thresholds above (ranges in §13c.3, k=0); radiator area 25 m² per segment (10–100, k=2), emissivity 0.9 and σ fixed; reactor power 20 MW (5–50, **k=2**, matching its consumers so a layout's power balance is tier-invariant; the square–cube law lives in mass and hull area, #63), heat per power 1.0 (0.5–3), decay fraction 0.07 (0.03–0.15), decay time 900 s (300–1800), breach fraction 0.5 (0.25–0.75), breach countdown 10 s (3–30), explosion energy 200 MJ (50 MJ–1 GJ, k=3); beam bay efficiency 0.4 (0.2–0.8); shield generator draw 2 MW (0.5–10, k=2); engine thrust 8 MN (2–30, k=2), draw 10 MW (2–40, k=2), heat fraction 0.3 (0.1–1); turret fire rate 0.5 /s (0.2–2, k=−1), draw 200 kW (50 kW–1 MW, k=2), heat per shot 0.3 MJ (0.1–1, k=3); round charge energy 0.5 MJ (0.2–2, k=3); magazine capacity 75 kg (25–250, k=3); crew per quarters cell 3 (1–8, k=2), quarters draw 50 kW (10–200, k=2); repair rate 0.02 /s (0.005–0.1), radius 30 m (10–80, k=1); bridge draw 100 kW (20–500, k=2), backup unlimited (#147); crew required per room (k=2) as listed. Rate-like constants of an L room are 9/4 of M. Reading at T1: a reactor alone overheats in 61 s, a beam bay shuts down at 163 s, a shield generator under an M beam at 175 s, an engine is hot after 6 min, a turret after 11 min |
| 184 | *LD* **Process items at the start of L1** (from the v2 review): from L1 the lock hash covers the whole scenario file except its `locked:` line (L0 locks stay); `shield.kineticStop` is derived inside `withOverrides` (#171 as intended); `blast()`'s coupling argument is required; the `approved` flags of #177 flip to true; new kernel files `js/heat.js`, `js/rooms.js`, `js/events.js` and a `ROOMS` table in `data.js`; branch `m0/l1-rooms`. For L2: the blast scenarios add the closed forms `escaped = max(0, cE − N·B)` and `absorbed = min(cE, N·B)` |

## 9g. L1 review answers (2026-10-21, after PR #5)

| # | Decision |
|---|---|
| 185 | *LD* **Answers to the L1 engineer's questions (PR #5).** (1) `L1.radiator.steady` stays locked and recorded as **FAIL**: the plan's 3600 s is under two time constants and its "below critical" filter on a crewed room leaves one case; the lead designer's specification error, not the kernel's. A **`L1.radiator.steady.v2`** on an idle M beam bay (plant class, hull room) replaces it for E3: P ∈ {0.1, 0.5, 1, 2 MW} × n ∈ {1, 2, 4}, cases with T_ss below the plant critical; (a) started **at T_ss**, over 600 s the temperature stays within 1e-6 relative of T_ss and radiated power = IR brightness = P within 1e-6 (the fixed point of Stefan–Boltzmann); (b) started at rest, over 3600 s the temperature rises every step, never exceeds T_ss, and T_ss − T shrinks every step (monotone approach). (2) The **1e-9 relative slack** on both bounds of a one-sided window is a float tolerance, not a criterion change, and stays; from L2 on no case lands on a whole number of steps unless it tests that (extends #177); §16 says which L1 cases pass through the slack. (3) The ninth room of `L1.room.thresholds` is the **empty hold**; the missile bay and the spinal railgun are data only until their levels; the railgun's threshold class is **plant**. (4) **Size rule**: quantities per cell scale with the cell count (energy stored, explosion energy, capacity, crew, with crew rounded), rate-like quantities with the cell count (power, draw, thrust, budget), per-round quantities with the round (an L turret fires rounds of (3/2)³ the mass at 2/3 the rate, k = −1 in size as in tier, heat per shot × (3/2)³); only the data rule at L1, measured from L2. (5) Crew counts round to integers at every tier; the k-th destroyed cell kills floor(k·crew/N) − floor((k−1)·crew/N). (6) The kernel interpretations are accepted and are now design: every output and draw in proportion to surviving cells (#16); a magazine detonates when any cell holding rounds is destroyed; quarters do not repair themselves and need power; every damaged cell in range is repaired at the full field rate until L2 shares the budget; an overheated or switched-off bridge gives no control, so **heat can decapitate** (consistent with #18b); a turret draws power while it has a round left; decay heat is integrated with its closed form over each step; a reactor's heat shutdown starts decay heat like a SCRAM and restarts below hot; rooms have an `active` switch. (7) Corrected reading: a freely firing turret overheats at 16 min, shuts down and never reaches critical alone. (8) A reactor SCRAMmed at full from rest crosses overheated (shutdown event) and does not melt down: as intended. (9) The **data hash covers `PARAMS`, `FIXED` and `ROOMS`** from now; L0 and L1 are re-recorded (only `dataHash` moves) |
| 186 | *LD* **L1 costs and order of checks**: the engineer session cost 6.65 USD; the physics checker runs on PR #5 as opened (blind derivation from §4, §5, §13c.1 and §13c.3, never §13c.2 before phase 2), the engineer's fixes of #185 land on the same branch meanwhile, and the reviewer runs on the final head. Spending for L1 stays under the 20 USD cap of #180 |
| 187 | *LD* **Answers to the L1 physics checker (PR #5, 2026-10-21).** (1) Blocking `L1.radiator.steady`: handled by #185 (v2). (2) Closed one-sided windows: #185 (2). (3) `L1.radiator.cooling`'s 1e-3 is ~230× looser than its Euler error (4.4e-6): the locked v1 stays; `L1.radiator.steady.v2` pins Stefan–Boltzmann at 1e-6 (a wrong area or emissivity of 1e-5 fails it), so no cooling v2. (4) **Size rule timing**: #185 (4) is data only at L1; the L1 kernel keeps one explosion energy per room type (an L reactor explodes at 200 MJ like an M one) and the locked `L1.reactor.breach` stays valid; the size rule enters the kernel at the start of L2 together with a scenario that tests it. (5) Wording: at overheated a room loses its function and its own working heat, **a reactor keeps its decay heat** (any shutdown starts decay heat, as the kernel does). Consequence for L2, recorded as a signal: an M reactor that overheats at full power has 1.26 GJ of decay heat to come against 0.48 GJ of margin to critical, so **without cooling through its walls it always melts down after an overheat**; heat discipline must act before overheated (#18b), and L2 measures whether wall conduction to radiator rooms saves it. (6) Checks that restate the code (magazine counts, breach k = ceil(fN), recoil m·v without propellant gas) are accepted as locks of the rule, as in L0 (#174); recoil from propellant gas is not modelled (borrowed in shape, #4). (7) Decay-heat tolerance 1e-3 is loose but the 0.0167 s meltdown window already separates integration schemes. (8) **A scenario withdrawn for a specification error** stays locked and recorded with its FAIL, is listed in `mission0/withdrawn.json` with its successor and the decision that withdrew it, and `verify` and `regress` report it as WITHDRAWN instead of MISMATCH; whether E1 counts it as passed is an exit-criterion question for the owner |
| 188 | **E1 amended (the owner, 2026-10-21, as recommended)**: a scenario **withdrawn for a specification error** does not block E1, on three conditions: it stays locked and recorded with its FAIL; it is listed in `mission0/withdrawn.json` with the decision that withdrew it; and a successor scenario that tests the same law PASSes its own locked criterion. A withdrawal is never a way around a failing kernel: it needs a decision row that names the specification error. E1 now reads: every L0–L6 scenario PASSes its locked criterion, or is withdrawn under these conditions. First case: `L1.radiator.steady` → `L1.radiator.steady.v2` (#185, #187) |
| 189 | *LD* **Answers to the L1 reviewer (PR #5, 2026-10-21).** Blocking: (1) **Destroyed count after repair**: a room's destroyed count is the number of its cells **currently** at integrity 0 (a repaired cell no longer counts); the breach test uses it. Crew do not come back: the k-th destroyed cell uses k = cells currently destroyed, and a room's cumulative deaths never exceed its crew. New scenario `L1.repair.breach` (§13c.2 row 14). (2) **Lock bypass**: the line stripped from the L1+ lock hash must contain only `locked: {…}` or `locked: null` with an optional trailing comma; any other text on that line is an error, so valid files keep their hashes. Which lock rule applies is decided by the scenario's **folder** (`mission0/scenarios/L0/` keeps the old rule), and a scenario whose `level` differs from its folder is an error. Not blocking, fixed now because they are cheap and L2 builds on them: (3) shutdown, restart and heat decapitation get a locked scenario `L1.room.restart` (row 15); the bridge raises `control-restored` when it restarts; the locked `L1.bridge.control` law text "decapitation only by destruction" is superseded by #185 (6), noted in §16. (4) A room that has exploded never explodes or melts down again. (5) The turret fires on accumulated time (the step remainder carries over), not on a whole-step interval, so `1 + floor(rate·t)` holds over the whole approved rate range; the L-size turret stays half-implemented until L2 (#187 (4)). (6) `tools/m0.js` checks each `withdrawn.json` entry: the successor exists, is locked and is recorded PASS, and `decision` is a decision number (`#n`). (7) The data hash also covers `TIERS` and `BASE_EDGE`; L0 and L1 are re-recorded (only `dataHash` moves). (8) The PR body is brought up to date with the head. (9) The `L1.reactor.scram` case started at 600 K sits on the plant hot threshold (#177): the lock stays, §16 says so; §13c.3 notes that `data.js` flattens `thermal.plant.*` to `thermal.plantHot` etc. and `rooms.<type>.crewRequired` to `crewRequired.<type>`. No physics checker on the two new scenarios: their expected forms are the closed forms the checker already verified for L1 (cooling, breach fraction, repair rate); the reviewer re-checks the final head |
| 190 | *LD* **The engineer's three readings of #189 (PR #5, head `fd815ce`) are accepted.** (1) A destroyed cell **stays destroyed until repair brings it back to integrity 1**; partial repair does not make it count as surviving (#189 (1) said "currently at integrity 0", which contradicted its own row 14: one second of repair would have lifted the cell above 0). Outputs still scale with surviving cells (#16). (2) In `L1.room.restart` the bridge's two radiators are a **test fixture**, like the external heat source: an inside room cannot carry radiators (#57); at L2 a bridge cools through its walls, and L2 must show its restart by conduction. (3) `L1.turret.fire` passes over the approved rate range except where a measurement time lands exactly on a shot time (rate 1 and 2 against t = 9.5, 99.5, 399.5 s are not such cases for 0.5 but are for 1 and 2): this is the scenario's choice of times, not a kernel defect; no v2; an override sweep of `turret.fireRate` must use measurement times off the shot grid. The one whole-step case in `L1.repair.breach` (explosion at breach + 600 steps) tests the countdown itself and is allowed by #177. L1 cost so far: 16.7 USD of the 20 USD cap |
| 191 | **Spending is a guideline, not a cap (the owner, 2026-10-21).** The owner is on a Max plan until the end of October, so passing 20 USD of sessions in a level is not a problem; keep cost in mind. Supersedes the cap of #180: the lead designer keeps 20 USD per level as a **soft guideline**, reports every session's model and cost in `STATUS.md` and each level's total to the owner, picks the cheaper model where the role allows (sonnet for reviewer, physics checker and nightly runs; opus for the engineer), and never blocks work on the figure alone; a level that runs past about twice the guideline is mentioned to the owner with the reason |

## 9h. L2 plan (2026-10-21)

| # | Decision |
|---|---|
| 192 | *LD* **Layout and walls for L2** (`DESIGN.md` §13d.1): rooms on a cell grid, rotated 0° or 90°, never overlapping; a shared wall is every pair of edge-adjacent cells, its length = pairs × edge; an open edge carries at most one radiator (#15); power, ammunition and heat cross only **live** edges (both cells surviving), blast crosses every edge |
| 193 | *LD* **The L2 flow models** (§13d.1): conduction G = `conduction.wall` × L × harmonic mean of the rooms' conductivity factors (hold 0.1), Euler with flows from the start of the step; power by **priority-ordered max flow** through any room (#12), capacity `power.wallCapacity` × L, a consumer at fraction f works at f; ammunition only from a magazine to rooms sharing a live wall with it (no routing), `ammo.wallFeed` × L kg/s, turrets fire from a ready store; blast between rooms fills each room up to its capacity and passes the excess by wall length (#169), holds absorb `hold.blastFactor` × more; **shield overlap resolves #170**: each generator's asks are scaled so it never pays more than its budget, no second round in a step; the shield buffer is shared the same way and must show its effect under a salvo (E4); repair asks are scaled to each quarters' budget (#99, #185 (6)); the size rule of #185 (4) enters the kernel (#187 (4)) |
| 194 | *LD* **L2 scenarios** (§13d.2): `L2.heat.pair`, `L2.heat.chain`, `L2.heat.neighbour`, `L2.reactor.cooled`, `L2.power.flow`, `L2.ammo.feed`, `L2.blast.walls`, `L2.shield.overlap`, `L2.shield.buffer`, `L2.repair.shared`, `L2.size.rule`, `L2.bridge.conduction`. Where coupled rooms have no closed form, the scenario carries **its own reference integrator** (RK4 at dt / 10, from `data.js` and §13d.1 only) and the tolerance is the kernel's Euler error. The expected outcomes were estimated by the lead designer before locking (lesson of #185) |
| 195 | *LD* **L2 constants and approved ranges** (§13d.3): conduction 4e3 W/(K·m) (1e3–2e4, k=1); hold conductivity factor 0.1 (0.02–0.3); power wall capacity 2 MW/m (0.5–5, k=1); ammunition feed 0.06 kg/(s·m) (0.02–0.3, k=1); turret ready store 4 rounds (2–10); ordinary room blast resistance 0.5 MJ per cell (0.2–2, k=3); hold blast factor 4 (2–10). Reading: an M reactor at full power overheats in 61–278 s depending on its cooled neighbours, and one neighbour prevents the meltdown of #187 (5); at a quarter power it cooks a neighbouring magazine in about 3 min and its quarters' crew in about 2.4 min, unless a hold separates them. **The harshness of reactor adjacency is put to the owner** as a feel question (#196) |
| 196 | *LD* **L2 process**: branch `m0/l2-clusters`, files `js/layout.js` and `js/graph.js` (§14), every L0 and L1 scenario VERIFIES unchanged, scenarios locked in their own commit before the first canonical run, physics checker blind from §13d.1 and §13d.3, reviewer on the final head. Open to the owner, not blocking the build: how harsh should it be to put crew beside a running reactor? Default: crew die within one battle at a quarter of the reactor's power unless a hold separates them (#52: building is a moral choice); the softer option is a lower `conduction.wall` inside its range, so either answer is a constant, not a redesign |
| 197 | **The owner's answers on heat (2026-10-21), as the lead designer recommended.** (1) The harshness of reactor adjacency stays at its default (#196): crew beside a running reactor die within one battle unless something separates them; building is a moral choice (#52). (2) The **heat sink room** leaves the idea registry and is built at L2: it passes the four gates (serves the throughput law; opens the time-window path: fire hot for longer, then pay later; readable as a room that glows as it fills; reuses the heat model with two constants). (3) The **cofferdam**, a strip of empty hold one cell wide, is added: real ships put void spaces between machinery and crew, and a strip gives that protection without spending a 2×2 hold. The owner's understanding, recorded: every shared wall is a bulkhead; heat flows through each wall by its length and the temperature difference, falling as the rooms converge; destroying a cooling neighbour shortens a reactor's clock (dependency law) |
| 198 | *LD* **Heat sink**: footprint 2×2 (M) and 3×3 (L), placement anywhere, plant threshold class (600 / 800 / 1000 K, events only, no function to lose), no crew, no power; heat capacity per cell × `heatsink.capacityFactor` 5 (2–10), conductivity factor `heatsink.conductivityFactor` 3 (1–5). **A destroyed heat sink cell vents its share of the stored heat to space**, (C / n)(T − T_rest), and the room's capacity falls by one cell: the temperature does not jump, the buffer shrinks (losing it is the dependency; it is not a heat bomb). Estimate: a reactor feeding an M beam bay overheats in 421 s beside a heat sink, 166 s beside an ordinary room. Scenarios `L2.heatsink.buffer`, `L2.heatsink.loss` (`DESIGN.md` §13d.2 rows 13, 14) |
| 199 | *LD* **Cofferdam**: a room type of footprint 1×N (N = 2–6), placement anywhere, the hold's conductivity and blast factors and threshold class, no crew, no power. Estimate: a 1×2 cofferdam between a reactor at a quarter power and crew quarters keeps the quarters at 342 K (a 2×2 hold: 331 K; nothing: crew dead at about 2.4 min). Scenario `L2.cofferdam` (§13d.2 row 15). Rows 13–15 are built on `m0/l2-clusters` after the first canonical run of rows 1–12, locked in their own commit, before the review |

## 9i. Heat that makes sense, and a sense check of the other mechanics (2026-10-21)

| # | Decision |
|---|---|
| 200 | **Heat moves along the machinery's coolant loop; crew rooms and magazines are insulated (the owner, 2026-10-21, as the lead designer recommended).** The owner asked whether the heat model makes physical sense. It did not, in one place: one temperature per room meant equipment temperature in plant rooms and air temperature in crewed rooms, and a 10 m wall passed 40 000 W/K between them, about 160 times a real steel bulkhead with air on both sides (≈ 250 W/K); crew beside a reactor died in 2.4 min where a real ship takes about 80 min. Now: heat flows fast only between **coolant rooms** (plant rooms and heat sinks: their coolant loop runs through the bulkheads); every other wall leaks passively; crewed rooms and magazines are cooled by **life support**. Supersedes #197 (1): the harshness question is answered by physics, not taste. The L2 scenarios that test the replaced rule stay locked and recorded and are **withdrawn under #188, extended to "superseded by an owner's design decision"**, each with a passing successor. The owner also asked that every other mechanic be sense-checked the same way (#202) |
| 201 | *LD* **The coolant-loop model and the L2 answers.** (1) Rules and constants in `DESIGN.md` §13d.1 and §13d.3: coolant walls `conduction.wall` × L × harmonic mean of coolant factors (heat sink 3); passive walls `conduction.passive` 25 W/(K·m) (5–100, k=1) × L × harmonic mean of passive factors (hold 0.1); life support pumps a powered crewed room's or magazine's heat above 295 K into its coolant neighbours, at most `lifeSupport.capacityPerCell` 50 kW (10–200 kW, k=2) × surviving cells. Estimates over whole runs (the lesson of #185, repeated in L2 by the lead designer's own errors below): a reactor beside a magazine or quarters keeps them at 295 K with life support and at 318–338 K after 15 min without; a 5 MW enemy beam on quarters kills the crew in 68 s, 1 MW in about 425 s, 0.2 MW never. (2) **Specification errors of the lead designer** in the first L2 run: `L2.heat.chain` (a tolerance tighter than the kernel's own Euler error, and a < 15 % claim that is 43 %), `L2.heat.neighbour` (c) ("below critical through 900 s" was estimated only until the reactor overheated; decay heat kept flowing). Both withdrawn under #188 and replaced. (3) Withdrawn as superseded by #200 if they no longer pass under it: `L2.heat.pair`, `L2.bridge.conduction`. Successors: `L2.heat.pair.v2`, `L2.heat.chain.v2`, `L2.heat.neighbour.v2`, `L2.bridge.conduction.v2`, plus `L2.lifesupport` (§13d.2 rows 1b, 2b, 3b, 12b, 16). (4) The **cofferdam** (#199) is deferred to `IDEAS.md`: under #200 it has no heat role left, and as a blast buffer the 2×2 hold already exists; row 15 is withdrawn before it was written. The heat sink (#198) stays: it lives in the coolant loop; row 13 (a) uses a coolant neighbour. (5) Answers to the L2 engineer (PR #15): re-recording L0/L1 when only `dataHash` and `code` move is the accepted path; the size rule applies in clusters only, a room outside a cluster is a test harness (accepted split, revisited at L3 when ships replace clusters); there is no L quarters (3×2 only), crew ties round half up; the L magazine is 3×3; the ready store is 4 rounds of the turret's size; "magazine falls by the rounds fed" is the right reading; rounds through overlapping shields are deferred to L4 (no L2 case needs them); the added cases (small HE loads, 20 MW beams, N = 80) stay; the boundary cases and kernel readings (a)–(e) are accepted; the disclosed pre-lock glimpse of two `L2.heat.chain` lines is accepted (they matched the engineer's independent pre-lock estimate and no criterion moved). (6) The shield buffer binds only at round 71 of a salvo: E4 stays open for it at L5 |
| 202 | *LD* **Sense check of every mechanic so far** (the owner's request, #200), against real magnitudes. **Holds up**: radiators (Stefan–Boltzmann; 25 m² at 300 K ≈ 10 kW, an ISS panel ≈ 14 kW); IR and active scans (d², d⁴); SCRAM and decay heat (≈ 7 %); laser-like efficiency 40 %; power through bulkheads (20 MW over 10 m at 10 kV is 2 kA of cable); ammunition hoists only into adjacent rooms; a full HE magazine (≈ 90 kg TNT) destroying a corvette; crew numbers; the compressed ranges as a declared stylisation (#53); shields as the one science-fiction premise. **Inconsistent, for the owner** (direction): (A) **engines**: 8 MN from 10 MW of electricity would need an exhaust velocity of 2.5 m/s; a ship gains about 6–36 times more kinetic energy than its engines draw. Proposed: the engine is a self-fuelled torch whose fuel is not tracked (#140 reworded); the electricity runs its pumps and magnets; its exhaust carries its own heat away (already "very IR-bright"). (B) **beams**: a 600 m focus range with a 1.8 m waist is a 16 mm wavelength, a millimetre-wave maser, not an optical laser (≈ 10 000 km); proposed: beams are masers, which also explains why they heat what they hit (#138). (C) **recoil**: an M round's impulse (400 N·s) moves a ship by 1e-4 m/s and spins it by 4e-6 rad/s, invisible, as recoil on real warships is; "off-axis guns spin the ship" (#5) does not hold at these masses; proposed: recoil stays in the physics but is expected to matter only for the spinal railgun; L3 measures it and E4 cuts it if it has no effect. (D) **kinetic damage and repair**: a 27 mm, 0.5 kg round destroys every 5 m compartment cell it passes and kills its crew, and a crew quarters rebuilds a destroyed compartment in 50 s; proposed before L4: rounds sized like real naval guns for the tier (an M round at T1 ≈ 76 mm, 6 kg), a hit damages a cell partly (several hits to wreck a compartment), and repair restores damaged cells only (destroyed ones wait for the drydock). **Fixed by the lead designer** (technical, for veto): (E) at L3 a cell's mass and its heat capacity come from one number, C = m × c_p: about 1 t per 5 m cell (a thin-skinned spacecraft with no gravity loads), so a T1 corvette is about 250 t, not the 1500 t assumed in #183's reading; L1's heat capacity already equals 1 t × 600 J/(kg·K); engine thrust is re-tuned at L3 within its range. (F) The ships' relative velocity is ignored (#137): manoeuvring at 1 g for 30 s gives 294 m/s against an 800 m/s muzzle velocity; acceptable while ships hold their range, checked at L5 |
| 203 | **The owner approves the four sense-check proposals of #202 (2026-10-21).** **(A) Engines are self-fuelled torches**: thrust from their own fuel, not tracked (rewords #140, "reactor-powered drives"); the ship's electricity runs only their pumps and magnets; the exhaust carries the jet's heat away; engine thrust is re-tuned at L3 for the ship mass of #202 (E), no L1 number changes. **(B) Beams are millimetre-wave masers** (the wavelength the 600 m focus range implies); this also explains why they heat what they hit (#138); no number changes. **(C) Recoil** stays in the physics (Newton 3) but #5's "kinetic weapons recoil hard; off-axis guns spin the ship" is withdrawn as a claim: at real masses only the spinal railgun's slug is expected to matter; L3 measures recoil and E4 cuts it if it has no measured effect. **(D) Kinetic damage and repair**, before L4: rounds sized like real naval guns for their tier (an M round at T1 about 6 kg, about 60 mm as a solid steel round; the L0 ranges are re-approved by the lead designer around it); a hit damages a room cell **partly** (several hits wreck a compartment; crew die in proportion to the integrity lost); **repair restores damaged cells only**, a destroyed cell waits for the drydock (amends #51). The lead designer specifies D as its own pass after L2 merges and before L3, because it touches L0 constants and L1's repair; L0 and L1 scenarios that test the replaced rules are withdrawn as superseded (#188, #200) with passing successors |
| 204 | *LD* **Answers to the L2 heat-v2 engineer (PR #15, head `e40d1af`).** (1) `L2.lifesupport` compares its crossing times with its reference integrator instead of the row's closed form: accepted; the row's closed form left out the passive wall and the quarters' draw stopping at overheated (crew die at 439 s at 1 MW, not 425 s). (2) `L2.bridge.conduction.v2` restarts after 230.6 s, not about 480 s: the row's estimate kept the bridge drawing power while shut down, against the L1 rule; the criterion (reference integrator, 1e-3) is unchanged and right. Both are the lead designer's estimate errors: the estimates applied the new rule but not every L1 rule still acting; **from now on an estimate is made with every rule of every passed level switched on**. (3) `tools/m0.js` resolves a withdrawn dependency through its successor (otherwise `L2.reactor.cooled` was blocked behind `L2.heat.pair`): accepted. (4) A heat sink with no cell left reads the rest temperature instead of 0 / 0: accepted. (5) The two withdrawn spec-error scenarios were re-recorded under the new kernel so they "fail exactly as recorded"; their FAIL under the replaced rule stays in git history: accepted. (6) The magazine–turret wall is passive now, so the heat it carries falls from about 23 MJ to 0.5–2 MJ over 600 s; `L2.ammo.feed` still passes; noted for L3. Verified by the lead designer at `e40d1af`: `regress` 42 VERIFIED + 5 WITHDRAWN; no L0 or L1 scenario file changed. L2 cost so far 19.73 USD (engineers) |
| 205 | *LD* **Answers to the L2 physics checker (PR #15, head `e40d1af`; no blocking finding, all 15 scenarios matched blind).** (1) The blast wave front spreads from the **whole damaged region** each round, as #169 says and the kernel does; §13d.1 reworded (it differs from a per-room reading in one recorded case only). (2) Heat books are kept **relative to the rest temperature** for a lost heat-sink cell: the cell vents (C/n)(T − T_rest) to space and its rest-temperature baseline (C/n) T_rest leaves with it, so the temperature does not jump (#198's intent); recorded as the convention. (3) **Life support keeps running in a shut-down room while the room is powered**: it is ship service, not the room's machinery (a real ship keeps air conditioning on in a tripped compartment); the pump's own work is not yet added as heat, revisited when life support draws routed power at L3. (4) The stale estimates of rows 8, 12b and 16 are corrected in §13d.2. (5) The knife-edge cases (overlap asks equal to the budget, repair asks equal to R, T_a on a plant threshold) pass with the float slack and stay; new levels avoid them (#177). (6) Decay heat from earlier shutdowns keeps running after a restart and each new SCRAM adds its own 7 %: physical, recorded; `L2.reactor.cooled`'s n = 0 meltdown margin (7.4e-4 of 1e-3) is thin and must be re-checked if `reactor.decayTime` or the step is tuned. (7) Buffer sharing across overlapping generators is deferred to L4 with rounds in overlapping fields (#201 (5)); the partial last round pays the energy the buffer has left (the L0 `stopRound` rule). (8) Life support loads the coolant loop: a reactor beside crewed rooms runs hotter (at half power it is still rising at 900 s, 950–966 K): **a signal for L3**, where radiator rooms and the coolant chain must carry this load. (9) An L magazine holds 44 L rounds (0.75 kg of capacity unusable); there is no L quarters. Physics checker cost 2.82 USD |
| 206 | *LD* **The D pass specified** (`DESIGN.md` §13e; #203 D): an M round at T1 is 6 kg (a real light naval gun), and every quantity tied to the round scales with it so that every penetration depth and feed ratio of L0–L2 is unchanged (resistances × 12^(1/3), magazine capacity, wall feed and propellant charge × 12; HE warhead and heat per shot unchanged, with reasons); kinetic damage stays momentum but takes 1 / `kinetic.hitsToWreck` (3) of a cell's integrity per pass, so three hits wreck a cell, and crew die in proportion to integrity lost; repair restores damaged cells only, a destroyed cell waits for the drydock (amends #51). Consequences estimated with every rule on: the shield buffer binds at the 6th M round of a salvo (E4 met for `shield.bufferSeconds`); recoil per M shot rises 12×, so on a 250 t ship 20 shots turn it by about 0.35 °/s (L3 measures). Four scenarios D1–D4; `L1.quarters.repair` and `L1.repair.breach` are withdrawn as superseded by #203 with D2, D3 as successors. Branch `m0/d-damage`, after L2 merges |
| 207 | *LD* **Answers to the L2 reviewer (PR #15, head `e40d1af`; no blocking finding); L2 merged.** (1) **Life support under power routing** (finding 1): the kernel ties life support to the room's routed power fraction, so a room whose request is 0 (switched off, overheated, or a turret with no rounds) loses it under routing, against #205 (3). No L2 scenario routes power to a crewed room, so nothing failed. Rule: under routing, a room's life support runs while the room is joined through live walls (through any rooms) to a reactor able to produce (not shut down, not destroyed, demand above 0), whatever its own request; it draws nothing yet (#205 (3)), and at L3 it gets its own draw in the priority order. Without routing the scenario's `powered` flag stays. **Fixed in the D pass** (`DESIGN.md` §13e): same kernel file, built before L3, the first level that routes power through crewed rooms; scenario D5 `L2.lifesupport.routed`. (2) **Untested life-support rules** (finding 2): the split by live wall length and the setpoint clamp move no criterion (every L2 case has one coolant neighbour, and the clamp's undershoot is about 1.4 mK); D5 (a) checks the split 1 : 2 over 5 m and 10 m walls to 1e-9 at every step and "never below 295 K" to 1e-9 K. (3) `DESIGN.md` §16 (finding 3): the first L2 block is marked superseded by #200 and #201 where it states heat numbers of the replaced wall rule; the open life-support signal is answered by #205 (3) and (1). (4) Minor: §13d.1 now reads a ready store of `turret.readyRounds` rounds of the turret's own size (#201 (5), as built); `ventCell`'s n = surviving + 1 is moot once a destroyed cell is never repaired (D pass); the books identity imported from the kernel is accepted, the independent checks being Σ flows = 0 and the reference integrators. **D5 estimates** (every L0–L2 rule on, Euler at 1/60 s, over the whole run, #204): (a) quarters at 320 K, powered and active (its 50 kW draw heats it), idle reactor over 5 m, heat sink over 10 m: within 1 mK of 295 K at 353 s, 39.6 MJ pumped into the reactor and 79.1 MJ into the sink, then held at 295.00024 K, never below 295 K; (b) routed, reactor at demand 0.25 over 10 m, external 0.2 MW for 900 s: active peak 295.0013 K, switched off 295.0010 K, reactor off (no supply) 338.5 K, hot at 738 s, nothing pumped; at 1 MW crew die at 438 s (active), 458 s (switched off), 328 s (no supply), matching `L2.lifesupport` (439.2 s and 327.9 s). Verified by the lead designer at `e40d1af`: `node tools/m0.js regress` 42 VERIFIED + 5 WITHDRAWN, exit 0. **L2 is merged into `main`.** Reviewer cost 1.34 USD; **L2 total 23.89 USD** (engineers 19.73, physics checker 2.82, reviewer 1.34) |


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
