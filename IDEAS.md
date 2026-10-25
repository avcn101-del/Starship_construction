# IDEAS — the idea registry

Ideas that are **not built**. An idea is built only when it passes the four
gates (`DESIGN.md` §2: serves a core law, opens or strengthens an underdog
path, readable on screen, reuses an existing model) and has an owner in the
coverage table (`DESIGN.md` §8). Moving an idea out of this file is a
decision: log it in `DECISIONS.md` and reflect it in `DESIGN.md`.

Layout (restructured 2026-10-23 at the owner's request, same content): an
index, one line per idea; one section per worked idea with fixed headings;
short ideas not yet worked; then the deferred and the moved-out lists, each
with its decision. Status is one of: waiting, deferred (#n), rejected (#n),
adopted (#n). "Claimed" gates are the idea's own claim, never a measure.

## Index

| Idea | Law it serves (claimed) | Gates claimed: law · underdog · readable · reuses | The measure that decides | Status |
|---|---|---|---|---|
| [Reactor shield mass from the layout](#reactor-shield-mass-from-the-layout) | dependency, throughput | yes · yes · yes · yes | not stated | waiting (#281) |
| [Tracking mines laid by a standing order](#tracking-mines-laid-by-a-standing-order) | information, throughput | yes · yes · yes · yes | not stated | waiting |
| [Presets by ship archetype](#presets-by-ship-archetype) | not claimed | – · yes · yes · yes | not stated | waiting |
| [The battle screen: outside view and knowledge panel](#the-battle-screen-outside-view-and-knowledge-panel) | information (on screen) | – · – · yes · yes | the owner's feel on the phone | waiting |
| [The hull radiates, fed by cooling manifolds](#the-hull-radiates-fed-by-cooling-manifolds) | throughput, dependency, information | yes · yes · yes · yes | share of L5e battles in which a side reaches plant hot, with and without the heat-sink cascade | waiting |
| [A thin skin over the rooms, with cosmetic paint](#a-thin-skin-over-the-rooms-with-cosmetic-paint) | information | yes · – · yes · yes | the owner's feel on the phone; after Mission 0, E5 and E6 on skinned builds | waiting (#313) |
| [Command level: watch, captain, hands-on](#command-level-watch-captain-hands-on) | not claimed (a way to play, not a law) | – · yes · yes · yes | verb leverage (the share of battles a player verb flips) and the battle's shape (quiet share, hits to kill), then the owner's feel on the phone | waiting |
| [Ship classes: roles, forms and factions](#ship-classes-roles-forms-and-factions) | dependency, throughput, information (one per faction) | yes · yes · yes · yes | E6 against ships two classes larger (proposed) | waiting |
| [Battle phases: decision points, attack and defence](#battle-phases-decision-points-attack-and-defence) | information, throughput, dependency (one per phase) | yes · yes · yes · yes | verb leverage and the battle's shape with and without phases on the rebuilt builds, outcomes counted apart (win, loss, escape, stalemate), then the owner's feel on the phone | waiting |
| [Room variants: one physical trade per room](#room-variants-one-physical-trade-per-room) | dependency, throughput, information (one family per axis) | yes · yes · yes · yes | no variant dominant in the sweep (E5), each winning some matchup; the phase fill order beating always-full and always-low | waiting |
| [Blast resistance from mass](#not-yet-worked) | not stated | not checked | not stated | waiting (#232, `DESIGN.md` §13i.1) |
| [Tumble and sloped armour](#not-yet-worked) | not stated | not checked | not stated | waiting (#230) |
| [Plasma toroid gun (MARAUDER)](#not-yet-worked) | not stated | not checked | not stated | waiting |
| [Named crew with veterancy](#not-yet-worked) | not stated | not checked | not stated | waiting |
| [Escape pods](#not-yet-worked) | not stated | not checked | not stated | waiting |
| [Surrendered enemy crew join yours](#not-yet-worked) | not stated | not checked | not stated | waiting |
| [Beam modes (focused / wide)](#not-yet-worked) | not stated | not checked | not stated | waiting |
| [Battery / capacitor room](#not-yet-worked) | not stated | not checked | not stated | waiting |
| [Cofferdam (a 1×N empty hold)](#deferred-and-rejected) | — | — | — | deferred (#201) |
| [Tractor beam and mines](#deferred-and-rejected) | — | — | — | deferred (#20) |
| [Heat sink room](#moved-out-adopted) | throughput | passed (see its line) | — | adopted (#197) |
| [Sound carried through the hull](#moved-out-adopted) | — | — | — | adopted (#153) |
| [Rescuing crew on dark fragments](#moved-out-adopted) | — | — | — | adopted (#88) |

## Waiting: worked ideas

### Reactor shield mass from the layout

*From the owner's discussion, 2026-10-22.*

- **Mechanism.** A reactor's shield mass would follow how far its crewed rooms
  are: a 4π shield for crew beside it, a shadow cone for crew far behind it, so
  keeping the crew away buys a lighter, faster ship with an exposed reactor.
- **Numbers and sources** (#281; quotes gathered by another AI, checked for
  consistency by the design partner, not re-run): an SP-100-class shadow
  shield on a 70 m boom 12–20 t against a 4π shield at 3 m 35–45 t (NASA
  TM-101403, Table III); a 10 MWe NEP system with a shadow shield at 9.9 kg/kWe
  (NASA TM-105212) against the M reactor's 30 kg/kWe (600 t for 20 MWe).
- **Gates claimed, not measured.** Dependency and throughput (the crew's
  safety hangs on distance or on mass, and mass costs acceleration: R1 911 t
  with the reactor at 66 %, #281); an underdog path (a long, light ship against
  a compact, heavy one); readable in the shipyard (shield mass and crew
  distance on the readout); reuses the falloff field (exponent 2, #99)
  attenuated by the mass on the path (#230).
- **Risks and what it touches.** No radiation or dose in the kernel yet: a
  field from the reactor and a dose per crewed room is new behaviour; no
  source splits a 20 MWe plant into core and shield (#281); it changes R1's
  mass and so its pinned scenarios.
- **The measure that decides.** Not stated.
- **Links.** #281, #99, #230.

### Tracking mines laid by a standing order

*From the owner's discussion, 2026-10-23.*

- **Problem it answers.** Lay mines and run: a privateer's way to make a
  stronger pursuer pay.
- **Mechanism.** A mine is a missile (#97, seeker + warhead) with a dormant,
  cold phase: IR-dark until a target comes in reach, then its motor lights
  (the tell, #114) and it homes to contact. One standing order,
  `mines: off / when pursued / always`; the field's shape comes from the
  movement style already in #38 (a wake when running, a cluster on hold, a ring
  on orbit, a line on strafe), so no pattern list.
- **Numbers** (hand-worked from the kernel's constants, not re-run as a tool:
  R1 911 t, `engine.thrust` 15 MN, 1.68 g; R1d 1.08 g). A pursuer holding range
  crosses a mine dropped at its quarry's position after 8.5 / 10.5 / 13.5 s at
  600 / 900 / 1500 m, meeting it at 141 / 172 / 222 m/s (R1d: 10.7–16.9 s,
  113–178 m/s); a mine dropped without a motor stays with the dropper's
  velocity at release, and a burst at a distance does nothing in vacuum (no
  shock wave, #141), so it must reach contact.
- **Gates claimed, not measured.** Information (a cold mine is found only by
  an active scan, which reveals the scanner) and throughput (mines come from
  the magazine); an underdog path (a mechanism counter to a brawler that must
  close; a time window against #30's clock); readable (one's own field drawn in
  the wake, the enemy's only where scanned); reuses the missile, point defence
  and the senses of L5b–L5c.
- **Since decided.** The two questions this idea raised were decided: EMP
  disables a section, not the ship (#292: a powered room in reach shuts down
  for `emp.outageTime`, 5 s), and escape is a battle outcome (#293). Under
  #293's rule a stern EMP burst gives an escape about 38 s after the burst in
  the frame's example, not 28 (the design partner's earlier 16 s for a pursuer
  left with no thrust, 900 → 3000 m by R1, was hand-worked and assumed the
  thrust lost for good).
- **Risks and what it touches.** Missiles and point defence are built (L5c,
  #299); an enemy that pursues is L5d's; equal ships never separate, so a mine
  helps an escape only if it takes the pursuer's thrust; a mine is a missile
  fired early, so it must earn a difference (no launch signature in battle,
  area denial); the tell's warning at about 170 m/s of closing speed is a few
  seconds at most, against point-defence timing; mines beyond
  `battle.cullDistance` (3000 m) leave play; IFF against one's own mines.
- **The measure that decides.** Not stated.
- **Links.** Takes up the mines half of "Tractor beam and mines" (#20) as a
  proposal; that line is left as it is. #292, #293; the presets idea's *Lay &
  run*.

### Presets by ship archetype

*From the owner's discussion, 2026-10-23.*

- **Mechanism.** The player sees mostly presets: three to five named presets per ship, chosen for its
  archetype; the 12 slots of #38 open only in an advanced view, for players
  who tune their own. Each preset is a set of slot values, data only (#39), as
  factions are bundles of defaults (#118). Examples, under working names only
  (#161: no name or term from another work in the game): a **light, cheap
  smuggler** lives on acceleration (R1 at 1.68 g leaves R1d at 1.08 g from 900
  to 3000 m in 26.7 s, #293's frame): *Slip away* (disengage, cold, dodging on),
  *Sting* (close, salvo, engines targeted, then Slip away), *Lay & run* (needs
  the tracking-mines idea); a **gunship with a spinal railgun, missiles and
  point defence**: *Keel gun run* (bow-on, railgun, open fire on a sure hit),
  *Spread* (open range, missile salvo against point-defence throughput, the
  Swarm law of §13n.3 (4)), *Knife fight* (close, broadside, point defence and
  turrets).
- **Gates claimed.** Readable (a named preset says the ship's plan in one
  word; the in-battle verb already switches presets, #2); an underdog path per
  archetype (each preset is the path its hull can reach: escape and time
  window for the light ship, mission kill for the gunship); reuses the orders
  of L5d with no new model.
- **Risks and what it touches.** Content: after Mission 0, beyond the three
  presets L5d ships with the kernel; a preset may use only slots that exist
  (*Lay & run* waits for the mines idea; a "flip and burn" facing that follows
  the thrust is not a slot of §13n.1 (d)); a "play dead" preset (cold, weapons
  hold, shield off) depends on whether a held weapon is still "able" under
  §13l.1: if not, the ship is Disabled after `battle.disabledSeconds`; every
  preset adds combinations the harness sweeps (#39), so three to five per
  ship; the advanced view is presentation work.
- **The measure that decides.** Not stated.
- **Links.** #38, #39, #118, #293; the tracking-mines idea.

### The battle screen: outside view and knowledge panel

*From the owner's discussion, 2026-10-23.*

- **Problem it answers.** Which battle screen: the owner's choice among three
  mockups (https://claude.ai/artifact/Uo1izqpFm5HptAU6h13SD2, layout C; A
  showed both ships as deck plans, B the enemy's blueprint alone), after the
  owner's Bridge Sim.
- **Mechanism.** Seen from above, the main view draws both ships from
  **outside** (#55 kept: the camera fits both), the outside **smooth**, not
  cell squares (the owner: plating with shading, a smooth outline along the
  hull's edge and panel lines, as Bridge Sim draws it), while the inside (one's
  own deck plan, the knowledge panel) stays on the cell grid because targeting
  is by room; this adds to #45 (pixel-art rooms, smooth effects) without
  changing it. The outside shows hull plating in the salvaged sides' colours,
  radiators glowing by temperature, the engine's IR plume, holes where cells
  are destroyed, fragments and debris drifting and tumbling (the kernel's
  fragments and debris), shield flashes only while absorbing (#46). The
  **inside** of the enemy is a separate knowledge panel, its blueprint drawn
  only as far as scanned (L5b's knowledge model; a hole seen from outside is
  marked on it), where the player scans zones and targets rooms; a strip shows
  one's own heat, shield, rooms lost and KIA, and opens one's own ship (deck
  plan, crew, KIA) as a tab. A breach triggers #47's slow-motion zoom on the
  outside view. Three refinements (layout C2 of the mockup): (1) a **tell
  strip** beside the panel, one chip per precursor passive sensors see
  (turning, IR rising, scanning you; #114), because a 40 px ship cannot show a
  tell, while its physical cause still shows in the outside view (RCS puffs, a
  radiator reddening); (2) a **dynamic camera** that leans toward the enemy and
  zooms as the range closes (as Bridge Sim's camera does), so the view is not
  mostly empty space at 900 m; a camera choice, not a change of scale in the
  physics; (3) a **zone zoom** in the panel: the whole ship small with the
  selected zone framed, that zone magnified below for tapping, since a hull
  near the full 30 × 14 grid falls to about 8 px a cell in the panel; one's
  own status moves to the top bar.
- **Gates claimed.** Readable (what the eye sees is the outside, what the
  player knows is the panel: the information law on screen); reuses the
  kernel's fragments, debris, heat and senses; no new mechanic.
- **Risks and what it touches.** Presentation, after Mission 0. Scale: at
  900 m on a phone landscape screen R1 (55 m) is about 40–44 px long, so the
  outside view is for watching, not for tapping: targeting needs the panel
  (rooms 40 px at 20 px a cell for R1's 11 × 6; larger hulls need zoom or a
  larger panel); the panel's place on screen, its size against #66's 44–48 px
  touch targets, the tell strip's chips (which precursors, how many), the
  camera's zoom law and the look of the plating are not measured; the
  patchwork colours may clutter a 40 px hull (perhaps a light tint outside,
  full detail on one's own tab); two places to watch (view and panel) may tire
  the eye.
- **The measure that decides.** The owner judges the feel on the phone (never
  delegated).
- **Links.** #45, #46, #47, #55, #66, #114.

### The hull radiates, fed by cooling manifolds

*From the owner's discussion, 2026-10-23.*

- **Problem it answers.** Radiators barely matter inside a battle. #304
  (re-run by the lead designer as `node tools/estimates/radiators.mjs`): R1 at
  full throttle, shield on, reactor at full demand, the first room hot at
  1059.5 s with its 17 panels against 988.9 s without; at 180 / 360 s within
  2 K. #305: the panels radiate 0.15 / 2.80 / 8.86 MW at 290 / 600 / 800 K
  against about 25 MW made; an R1 with no panel passes `validateShip` and is
  IR-dark whenever its engine is off. The design partner's further figures,
  computed from the kernel's capacities (`buildShip` of R1, the rooms'
  `heat.C`; scratch work, no committed script, not re-run): the coolant loop
  holds 74.2 MJ/K and its time constant is 28–223 min; a 30 s Cool at 600 K
  sheds about 1.1 K. So heat is a per-battle budget.
- **Mechanism.** The radiator fitting becomes a **cooling manifold**: a room's
  open hull edges radiate at the room's temperature (a dark coating,
  emissivity about 0.9) while a live manifold on that room pumps coolant behind
  its skin; without one, only a weak passive leak. Figures (the design
  partner's count of R1's layout and T⁴ by hand, not re-run): R1 has 38 open
  hull edges (950 m², twice its panels): 6.3 MW at 600 K, 19.9 MW at 800 K,
  so a hot ship nears balance at full burn (equilibrium about 850–960 K, by
  which edges join the loop), and losing manifolds while hot overheats it in
  minutes. **A cascade with the heat sink** (the owner's): the sink is 27 of
  the loop's 74.2 MJ/K; at 25 MW, +200 K takes 594 s intact, 378 s without the
  sink, 275 s without the sink and the shield generator; shooting the sink,
  then the manifolds, cooks the enemy.
- **Gates claimed, not measured.** Throughput (heat a flow once hot);
  dependency (a small fitting, a large effect); information (the hull glows by
  the room behind it, a deep reactor stays dark, a section going dim is a
  tell); an underdog path (cascade: sink, manifolds, overheat; facing chooses
  which manifolds are exposed); readable (glowing hull sections); reuses the
  heat model (T⁴ per hull segment, as a panel radiates today).
- **Alternatives weighed in the discussion.** Keep radiators as they are (heat
  a budget; #297's reason "strip radiators → overheat" is corrected by #304,
  and the radiator-less "Cold Brick" joins E5's degenerate builds by #305);
  remove radiators (loses most of the IR layer of the information law); larger
  sci-fi panels (one constant beyond its range); venting coolant (water about
  3 MJ/kg, hydrogen about 8.7 MJ/kg but 14 times the volume); a heat pump
  (about 17 MW of work to lift 25 MW from 600 to 1000 K, beyond a 20 MW
  reactor). These figures are standard physical constants applied by hand,
  not re-run.
- **Risks and what it touches.** Replaces a proven model (radiator panels,
  L1–L2 scenarios move) and a §4 law's wording: the owner's call, the lead
  designer's model and cost. Only enriches play if battles reach plant hot;
  if they rarely do, the idea only tidies the shipyard. One manifold per room
  may be too binary (redundancy: two). Unverified: whether the reactor's waste
  heat follows the power used or its demand setting (the runs held demand at
  1); the coating's emissivity; `thermal.plantOverheated` (650–950 K) against
  the equilibrium.
- **Consequences found after.** (1) L5c's IR seeker homes on the **nearest**
  resolved panel or exhaust, not the hottest (`js/missile.js`), so a hotter
  ship is resolved from farther but not hit where it is hottest, and a burning
  engine's exhaust is always resolved; under this idea a room whose manifold
  is lost goes **dim** (its heat trapped inside) while the rooms still cooled
  glow. (2) The cascade ends at Disabled before the crew die: an overheated
  reactor shuts down, no weapon is able, the battle ends; after it the prize's
  life support stops (the bridge keeps its backup) and its crewed rooms and
  magazine heat through passive walls (a hand estimate, not re-run: about
  0.05 K/s from an 800 K neighbour over a 10 m wall, crew at 380 K in about
  25–30 min, a magazine at 450 K in about 50 min): a campaign beat (restore
  the prize's cooling or lose its crew and perhaps the prize; #79: no bonus
  for sparing them). (3) Life support pumps heat into the coolant loop at no
  cost (§17 item 14 defers its draw and heat): lifting heat from 295 K into an
  850–960 K loop costs about twice the heat moved even for an ideal pump, so
  this idea makes item 14 matter. (4) Under a thin skin (the next section),
  the skin itself becomes the radiating surface and the panels go: the
  balance lies between 594 and 892 K on R1, by which of the skin's faces
  radiate (figures there).
- **The measure that decides.** The share of L5e battles in which a side
  reaches plant hot, with and without the heat-sink cascade.
- **Links.** #297, #304, #305, #79; the heat sink room (#197).

### A thin skin over the rooms, with cosmetic paint

*From the owner's discussion, 2026-10-23; revised 2026-10-24 into one rule
(the earlier variants are listed under the alternatives).*

- **Problem it answers.** A ship drawn by its cells is asymmetric and reads
  as a jumble; the owner, looking at the outside-view mockups
  (https://claude.ai/artifact/9gMtu29eGWWFvee9F7pNvs): no spaceship looks
  like that. The rooms stay blocks inside; the outside should have a ship's
  shape.
- **Mechanism.** (1) A **form**: a smooth, symmetric outline around every
  room, covered by a **thin skin**, a real 1 mm sheet that stops nothing.
  (2) **The fill rule**: the rooms first; every other 5 m square inside the
  skin with a share f of its area inside it becomes a **hold scaled by f**
  (mass, heat capacity, blast and kinetic resistance all × f, since
  everything that resists follows the cell's mass, #240 (1)) when f is at
  least a threshold (about 0.25, the lead designer's constant); a smaller
  sliver stays **empty space under the skin**. (3) **Cosmetic paint** on the
  skin only (liveries, decals, salvaged patchwork, duct-tape patches), never
  a change of shape, as an FPS skin leaves the hitbox alone. (4) **Cutaway**:
  your own ship drawn with its rooms under the skin, the enemy's rooms only
  in zones you have scanned (an information layer like #48's overlays, not
  light). (5) A skin is **optional** in a blueprint: without one, a ship is
  exactly today's kernel. The skin carrying the manifolds is the previous
  section's idea, kept apart.
- **Numbers.** Kernel: `buildShip`, `readout`, `validateShip` and
  `penetrateRound` on `ld/l5d`; skin areas, the fill and balances by scratch
  scripts, not committed, not re-run.
  - R1 is 911.2 t, 1.68 g on 15 MN. Its skin, at least 0.60 m clear of every
    cell: 3938 m², 773 m² of it the edges; 17.7 t in 1 mm titanium
    (aluminium melts at 933 K, below the manifold balances; steel 30.9 t).
    The fill: 8 full holds and 38 partial (f 0.01–0.95), 57.7 t; with the
    threshold 0.25, 18 slivers (5.6 t) stay empty: 52.1 t kept, 1.68 →
    1.56 g with the skin.
  - A slender layout of R1's same ten rooms (two decks, engine and beam bay
    on the axis) passes `validateShip`: 70 × 20 m, 910.2 t, 1.68 g, I 146e6
    against R1's 93e6 kg·m²; bow-on 20 m instead of 30, broadside 70 instead
    of 55; every room touches the hull, so a broadside reaches its reactor
    and magazine. Its skin 3622 m², 16.3 t; its fill 2 full and 40 partial
    holds, 34.6 t, 21.1 t kept at 0.25: 1.68 → 1.61 g.
  - The skin's planform costs about 120 kg per m² of fill (5 m deep at the
    hold's 24 kg/m³): a skin hugging the rooms is light, a bulging one heavy,
    a price read on the shipyard's readout, no stat (#122).
  - It stops nothing (1 mm titanium is 4.5 kg/m² on a path, a 0.2 m plate
    1570); an M round crossing one full hold keeps 88 % of its momentum.
- **Gates claimed, not measured.** Information (the free silhouette is the
  form, so the layout stays hidden until scanned; passive IR still sees hot
  sections); readable (a ship's shape; your rooms in the cutaway); reuses
  the cell model (a hold with a mass share), the path model and the
  knowledge model. No underdog path is claimed.
- **Alternatives weighed in the discussion.** A skin drawn with no physics
  and its own shape (a round crossing a drawn hull without effect, #46; a
  silhouette other than the one the enemy knows, #23). A thick shell with
  mass (an HE round would burst on it, outside the rooms, #141; not run).
  The gaps of a stepped grid form filled with whole S holds (no kernel
  change; R1 939.0 t, but 9 of 21 fittings lose their open edge) or with
  wall cells of the room beside them (+30 t, all radiators kept on the
  walls). The fill cells cut to the skin as polygons (exact, but polygon
  geometry in the path model). A 1 m or finer sub-grid (two resolutions,
  more cells for E8; under 1 px at the battle view's 0.72 px/m). Slivers
  merged into the nearest hold (the same cells; dropping them is simpler).
  The fill rule above keeps the grid and adds one number per cell.
- **Risks and what it touches.** After Mission 0 with #313's rules: count
  the skin's mass; mount fittings on the skin over their room (the fill
  covers rooms' open edges; the smooth outline is shorter, R1's 155 m
  against 190 m of open cell edges, so fewer mounting places); #313's third
  rule (the silhouette as the skin) is mostly met by the fill, the empty
  slivers aside. Kernel: a cell's mass share f (1 by default), the fill
  rule and threshold in `validateShip`. Because the skin is optional,
  today's scenarios stay as they are (about 160 of the 338 scenario files on
  `ld/l5e1` at `e6cf62e` use R1, R1c or R1d); new ones cover skinned ships.
  Balance, measured by E5 and E6 with `tools/sweep.mjs`: HE may weaken (it
  bursts in the fill); a skinned build must not dominate. A hit on a
  partial hold outside the drawn curve is drawn at the nearest skin point
  (a few metres at most, at corners).
- **Consequences found after.** Found while drawing the look in the same
  mockup. (1) Black-body glow is nearly invisible at the game's
  temperatures: about 6e-7 cd/m² at 600 K, 0.0075 at 800 K, 2.6 at 1000 K,
  against sunlit plating of about 5000 at 1 AU (Planck with the eye's
  photopic curve, ε 0.9); a glow shows in shadow or under a far star, and
  the first visible red is `thermal.plantOverheated`'s 800 K. (2) A star as
  the key light, with no fill light (shadows are black), plus the ship's
  own lights; starlight adds 0.34–1.35 MW at 1 AU (1.3–5.4 % of 25 MW),
  which the kernel's 0 K space leaves out. (3) Lights leak knowledge: lit
  windows show which room has power and taped patches show repaired cells,
  so on the enemy they are drawn only where scanned; patchwork paint must
  not follow room borders, or it draws the layout. (4) Real radiators are
  white: little sunlight absorbed, high IR emissivity.
- **The measure that decides.** The owner's feel on the phone (never
  delegated); after Mission 0 (#313), the lead designer's cost of the
  kernel changes and E5 and E6 on skinned builds.
- **Links.** #15, #23, #45, #46, #48, #122, #141, #240, #256, #313; the
  battle screen (outside view and knowledge panel); the hull radiates
  (cooling manifolds); ship classes (forms and factions).

### Command level: watch, captain, hands-on

*From the owner's discussion, 2026-10-24.*

- **Problem it answers.** The owner wants to choose how involved to be:
  sometimes to watch his own ship fight on its orders, sometimes to command
  closely; and wants the feel of *The Expanse* and *Firefly*: tension and
  drama, "not two ships duking it out to the death; sometimes one volley ends
  it". Both are captains who give orders while a pilot flies, which is #2
  (the player never steers).
- **Mechanism.** One setting, three levels, all on the player's own ship.
  (1) **Watch**: the player's ship fights on its standing orders while an
  automatic captain switches its presets and scans; that captain is
  `js/enemy.js` run for the player's side with a personality the player
  sets (the kernel already runs both sides as enemies: #315's probe); the
  player may pause, speed up, and take command at any moment by using a
  verb. (2) **Captain**: today's three verbs (#2). (3) **Hands-on**: a few
  more orders, each an existing standing-order slot made a live order
  (flip and burn = the range slot, launch a salvo = the firing slot, hold
  fire = heat discipline, repair here = the repair slot); this moves a
  decision's owner in the coverage table (§8, #36). And (4) **rewind and
  branch** in the dry run (#56) only, never in the campaign: the kernel is
  deterministic (E2; `tools/duel.js --seed --inputs` replays a battle), so a
  replay stopped at a moment can be continued with a different verb, the
  "try it and learn why" the owner enjoys.
- **Numbers.** `main` `ca57372`, R1d-A against R1d-A in `tools/duel.js`
  (player Fire, enemy 0.5 unless stated); scratch scripts over
  `createDuel`, `tick` and `battle.hits` / `battle.ended`, not committed, not
  re-run by anyone else.
  - **Verb leverage today** (one verb at t = 0, 26 variants per setup: target
    each of the 10 rooms, scan each of the 6 zones, scan + target the
    magazine, preset Evade / Cool, Evade at 10 s): default, 8 of 26 keep the
    win and 18 lose it; `--personality 0.5,0,0.5,0.5` only 3 of 26 change
    the result (a scan of zone 2 wins); `--personality 1,0,0.5,0.5` the
    results spread widely (win or loss, destroyed, surrender or Disabled,
    25–316 s); `--range 1500` only the presets change it, both to a loss.
    In 3 of 4 setups the best play is **no verb**, and Evade loses 4 of 4:
    today Watch would beat Captain.
  - **The battle's shape** (13 duels: the default; `--personality`
    1,0,.5,.5 / 0,0,.5,.5 / .5,0,.5,.5 / .5,1,.5,.5 / .5,.5,1,.5 / .5,.5,0,1;
    `--range` 600 / 1500 / 2500; `--wildcard --seed` 2, 3, 5): today a
    median of 58 s, the first hit on the losing ship at 1–3 s, 12–52 hits to
    kill (median 29), 10 of 13 ended by an explosion: a slugfest from the
    first second with a sudden end. `--set kinetic.hitsToWreck=8`: a median
    of 155 s but 24–144 hits to kill (median 62): longer by toughness, more
    of a slugfest. #315's position law (re-implemented in a scratch copy of
    `js/helm.js`, its five minimum separations reproduced exactly): a
    median of 41 s; its four long duels (307–323 s at 17–21 % hits) fizzle
    to a surrender with no hit in their last 10 s. **From 2500 m under
    #315's law: the first hit at 31 s of 74 s, 23 hits, an explosion**: the
    shape the owner describes comes from the approach.
  - Rate of fire is in the kernel already (`js/data.js`: the M turret 0.5 /s,
    the railgun 0.1 /s, kinetic point defence 2 /s, AP slower by
    `rounds.apLength`); a real 76 mm naval gun with a shell of about 6 kg
    fires 80–120 rounds a minute (from memory, not checked), so 30 a minute
    is slow, and a faster gun would shorten battles.
- **Gates claimed, not measured.** No law (a way to play). Underdog: a
  moment where the player's judgement wins (the time-window path) needs
  verbs with positive leverage. Readable: one setting; Watch needs no new
  screen. Reuses: `enemy.js` for the player's side, the existing slots, the
  deterministic replay.
- **Alternatives weighed in the discussion.** More verbs only (more taps on
  a phone in landscape, a 3–6 minute battle in real time: Hands-on needs
  pause or slow motion); watching AI-only battles without the player's ship
  (the owner: his own ship); rewind in the campaign (cheating: dry run only).
- **Risks and what it touches.** The levels must not be ranked: if Watch
  wins (as the numbers above show today), commanding is pointless; if
  Hands-on wins by far, Watch is a trap; verbs need positive but bounded
  leverage. Hands-on changes the coverage table (§8, #36) and comes close to
  #2 (orders, never a stick): the owner's call. E5–E6 assume the player's
  side plays its standing orders; with Watch the reference player is an
  automatic captain, which the sweep already is. For the shape: E7 measures
  only the median length; the owner's taste is tension then a decisive
  volley, so levers that add toughness (`kinetic.hitsToWreck`) go the wrong
  way, and levers that lengthen the quiet phase (opening range, relative
  motion, point defence, scan time) the right one; `battle.cullDistance`
  (3000 m, also #293's escape threshold) caps the opening range: the lead
  designer's.
- **The measure that decides.** In the pace study and L5e2: (a) verb
  leverage, the share of battles in which a player verb flips the result,
  and the decisions available per battle; (b) the battle's shape beside
  E7's median: the first hit on the losing ship as a share of the battle,
  the hits needed to kill, how it ends; then (c) the owner's feel on the
  phone in Watch and Captain. Thresholds are the lead designer's.
- **Links.** #2, #36, #56, #117 (personality), #130 (the feel unverified
  until after L5), #293, #297, #315, #317 (§17 item 52); the presets by
  archetype above; E2, E7.

### Ship classes: roles, forms and factions

*From the owner's discussion, 2026-10-24.*

- **Problem it answers.** What each of the six classes (#61, `DESIGN.md`
  §5.4) is for, and which hull forms serve which way of playing, with
  variety. Inspiration mixed from EVE (a role per class, specialised
  variants, a silhouette that tells class and role), The Expanse (hard
  physics: acceleration as a weapon, point defence against missile salvos,
  spinal railguns, utilitarian hulls) and Firefly (lived-in, patched,
  smuggling, a crew as a family); no name or term taken from any of them
  (#161).
- **The owner's direction in the discussion** (for the lead designer to log
  as the owner's): keep the six classes; the player can rise to a capital;
  the underdog beats a ship up to **two classes** larger; hull forms come
  both as faction families and from free building.
- **Mechanism.**
  - Roles, a proposal: T1 Corvette, the poor privateer's start, lives by
    dodging, scanning first and running (forms: courier, gunboat, picket);
    T2 Frigate, the privateer's workhorse, fast enough to dodge and armed
    enough to hurt a destroyer (hunter, escort heavy with point defence,
    tramp freighter); T3 Destroyer, the first class with a long spinal,
    hunts small ships (lance, torpedo boat, a screen against corvettes);
    T4 Cruiser, the independent all-rounder of the middle game (line,
    sensor, raider); T5 Battleship, armour and firepower, cannot dodge,
    many dependency chains (fortress, broadside line, furnace); T6 Capital,
    the campaign's set pieces and the player's last step (dreadnought, a
    mobile base; carriers after Mission 0, #104–#110).
  - Faction families, one per core law (#118, #119): dependency in compact
    forms with deep rooms (disc, fortress); throughput in hot forms with a
    large plant far from the crew (dumbbell, furnace; the skin's manifolds
    glow); information in slender, cold forms (lance, slender). The same
    family from corvette to capital, so a silhouette tells the faction and
    the law, and so the underdog path to try. The named ships (#29) fit the
    families.
  - The player: free building as the shipyard already allows (#56, #59
    mirror), the skin generated around the layout (the thin-skin section, after
    Mission 0 by #313; an algorithm still to design). Capturing a faction's ship intact unlocks
    its form templates and livery, as the first intact room unlocks its type
    (#33), so the privateer's hull becomes a patchwork of the liveries it
    took (cosmetic only, C4).
  - A form gives no stat (#122): forms differ only by physics (inertia,
    rooms exposed, radiating area, bow-on width).
- **Numbers.** Kernel: R1's layout built at every tier with `buildShip` and
  `readout` (`ld/l5d`); the rest by scratch scripts, not committed, not
  re-run.
  - R1 by class: T1 55×30 m, 911 t, 1.68 g; T2 83×45 m, 3033 t, 1.13 g; T3
    110×60 m, 7145 t, 0.86 g; T4 165×90 m, 23 981 t, 0.57 g; T5 220×120 m,
    56 699 t, 0.43 g; T6 330×180 m, 190 902 t, 0.29 g (mass by edge³, thrust
    by edge²).
  - Distance moved during a round's flight across 900 m at 800 m/s (1.1 s):
    10.4 / 7.0 / 5.4 / 3.5 / 2.7 / 1.8 m from T1 to T6: a corvette leaves
    about two of its cells, a capital stays put. Within one class the
    opening range scales with the cell (`battle.openingRange`, k = 1), so
    the dodge in cells is the same at every tier; the gap shows only
    between classes.
  - Six forms of 44 cells each, uniform mass per cell (a relative
    comparison only: it gives the slender layout 328e6 kg·m² where the
    kernel gives 146e6), as length × width, bow-on width, a rough 90° turn
    on 1 MN couples, hull-edge area and cells with no hull edge: lance
    110×10 m, 10 m, 5.1 s, 1200 m², 0; slender 70×20, 20, 3.8, 900, 18;
    wedge 60×30, 30, 3.9, 900, 16; disc 40×35, 35, 3.6, 750, 26; catamaran
    50×30, 30, 4.1, 1200, 4 (the link between its hulls is a choke point);
    dumbbell 75×20, 20, 4.8, 1050, 10.
  - Against one 0.2 m plate of the target's class (`penetrateRound`): an M
    round at 800 m/s stops at every gap (65 % of the plate's resistance at
    the same class, 43–48 % one class up, 32 % two up); a railgun slug at
    2000 m/s passes at the same class (48 % of its momentum left), one class
    up passes when the cell ratio is 0.75 (T2→T3, T4→T5: 30 % left) and is
    wrecked at 0.67 (T1→T2, T3→T4, T5→T6), two classes up it stops (96 %).
    A capital's plated walls are proof against a ship two classes smaller.
  - Plates are heavy: R1c's 8 plates are 314 t, a third of R1's own 911 t,
    at every class, so a big ship can plate few walls.
- **Gates claimed, not measured.** Each faction serves its core law; the
  underdog path is the point (two classes up, by the paths below); readable
  (silhouette tells class, faction and law); reuses the kernel's models (no
  stat per form or faction).
- **Alternatives weighed in the discussion.** Fewer classes; a capital as a
  boss only; an underdog gap of one class. The owner chose six classes, a
  playable capital and two classes.
- **Risks and what it touches.** Two classes up cannot be a gunfight: the
  winning paths must be the unplated walls found by scanning, HE on fittings
  (#96: the corvette's answer to a capital), heat through the manifolds and
  the heat sink, EMP missiles, the time window and attrition; whether they
  win needs a measure (E6, in L5e2 by #315), the lead designer's. A playable capital
  touches the drydock tiers' economy (#72, #87), E8 at T6 (L6) and the
  battle screen at mixed classes (at 0.72 px/m a corvette is 40 px beside a
  capital's 238). Escape and surrender exist since L5d; forms that need
  what is not built: mines (an idea above), jammers, decoys, carriers and a
  cargo economy (after Mission 0).
- **The measure that decides.** Proposed: E6 extended to ships two classes
  larger, the intended underdog answer winning at least 3 of 4 variants as
  the named-ship rule asks (`DESIGN.md` §2); the faction families and the
  look by the owner's feel on the phone.
- **Links.** #29, #33, #56, #59, #61, #62, #64, #72, #77, #87, #96, #104,
  #118, #119, #122, #161; the thin skin (hull forms, the skin around free
  layouts).

### Battle phases: decision points, attack and defence

*From the owner's discussion, 2026-10-24 (the design partner). Combines and
would replace [Presets by ship archetype](#presets-by-ship-archetype) and
[Command level](#command-level-watch-captain-hands-on) if adopted.*

- **Problem it answers.** Today's orders are flat: one set holds for the
  whole battle, and the enemy changes preset only by reflex (heat above its
  caution → Cool, buffer below it → Evade, else Fire; `js/enemy.js`). Nothing
  knows whether a position is won before it fires for the kill. The owner's
  analogy is a jiu-jitsu match: takedown, then position control, then the
  submission. Asking for the submission from the wrong position loses: two
  ships both chasing the other's bow is §17 item 55's race. Verbs have no
  positive leverage because nothing in the battle is a judgement call: 78 of
  the 80 one-verb flips in `tools/estimates/out/verbs-every10.txt` go
  against the player, and only a preset switch ever helped.
- **Mechanism.** A battle has four phases, judged by each side from **its
  own knowledge model** (two sides may disagree; the information law):
  (0) **contact**: who sees whom, what the other is, engage or not; (1)
  **range**: reach my range, deny the other its own; (2) **position and
  control**: the aspect my weapons need and the other's do not have (#17's
  arcs, the plume behind it), then strip what keeps it fighting back
  (antenna, point defence, radiators, engines); (3) **finish**: a route of
  §8 (kill, Disabled, decapitate, run dry, surrender), or capture for the
  prize (#83). **In every phase a side attacks or defends** (who has the
  edge comes from physics: acceleration decides who chooses the range, turn
  rate and arcs the position, sensors the contact). The defender's options
  are physical too: open the range or disengage, go cold, dodge, power to
  the shield, containment first; a defence that succeeds sends the battle
  **back** a phase (a reversal), so phases go both ways. **Tapping out**
  (disengage, #293; strike colours, #303) is open in every phase.
  A **strategy** is, per phase, one preset (the existing slots of #38, data
  only, #39) and its exit condition, at an **aggression level** (cautious /
  balanced / aggressive: how early to commit, how much risk to take). The
  shipyard proposes the strategies a build can actually fly (its weapons ×
  its defences: a spinal weapon never flies broadside, dodging needs
  broadside, #40) and the player may edit them simply; the twelve slots
  only in an advanced view.
  **Command depth, chosen moment to moment, not as a setting**: (a) auto:
  an automatic captain (`js/enemy.js` run for the player's side, its
  personality set in the shipyard) moves through the phases; (b) the
  player takes a **decision point**: commit to the next phase now, hold for
  a better one, or fall back, chosen from a short menu of the options that
  build can fly in that phase (the preset verb, #2); (c) micro: target a
  room, scan a zone (the other two verbs). Taking one decision leaves the
  rest on auto. A decision point is a choice from a menu, not a script (#2,
  the owner's reading).
- **Numbers.** On `ld/pace` `a000616`, from `js/data.js` and
  `node mission0/builds.js`; formulas, not battles, unless stated.
  - **The favourite range comes from physics, not from the weapon's name.**
    A missile from rest (`missile.acceleration` 30 m/s² for 20 s, target at
    rest) spends inside a point-defence mount's `pd.range` (600 m): 4.5 s
    when launched at 300 m, 6.3 s at 600 m (the worst: the whole flight
    inside), 3.3 s at 900 m, 2.3 s at 1500 m, 1.7 s at 2500 m; at
    `pd.fireRate` 2 /s that is about 9, 13, 6.5, 4.5 and 3.3 flak rounds
    per mount (`node -e` on t = √(d / 15)). Close range helps the defence;
    the missile boat's best range is a band, capped by pure pursuit's misses on a target that
    accelerates (§17 item 56: about 50 m behind at 5 m/s²). Where the band
    lies needs a battle run after item 56.
  - **Who attacks the range phase.** The four reference builds accelerate at
    1.044–1.076 g (a 3 % spread), so none can choose the range: the range
    phase has no attacker by build (item 55's race is between mirrors; that the
    equal acceleration causes it is not measured).
    The Engine boat (2.115 g) and Brick or Glass (0.34–0.35 g) are the
    builds with a clear range role.
  - **The verbs today** (`tools/estimates/out/`, #328): 45 of 455 one-verb
    battles at t = 0 flip the result, 43 against the player; the only verb
    that helped is `preset evade` (2). There are three presets in all
    (`fire`, `cool`, `evade`, `js/data.js`).
  - **The shape the owner wants** (#318): phases 0–2 are the quiet, tense
    part, phase 3 the decisive volley, so E7's length would come from
    approach and position, not from toughness (`kinetic.hitsToWreck` 8: a
    median of 74 s at 34 hits to kill, the wrong way).
- **Gates claimed, not measured.** Law: each phase's edge is a core law
  (information in contact, throughput in the range and the volley,
  dependency in control). Underdog: the six paths of §2 become phase plans
  (mission kill and cascade in control, time window and attrition by
  defending and reversing, information in contact). Readable: the phase and
  who holds the edge on screen; one named strategy per decision point.
  Reuses: presets, the twelve slots, `enemy.js`'s decision clock and
  when → do table (#111), the knowledge model; no new physics.
- **Alternatives weighed in the discussion.** More verbs as live slots
  (Volley, Burn, Go dark, Power, Evade): rejected by the owner as a list
  without a rationale; Volley (`firing: salvo`) pays only against a
  defence with a rate cap (point defence, a shield's absorption), so it
  belongs to a matchup's strategy, not to every ship. A setting of
  Watch / Captain / Hands-on: replaced by depth chosen moment to moment.
- **Risks and what it touches.** (1) If the automatic captain moves
  through the phases too well, a player's decision can only harm, today's
  finding again: verbs need positive but bounded leverage, and auto,
  decision points and micro must not be ranked. (2) E5–E7 and the sweep
  (`tools/sweep.mjs`'s best response over order sets) measure a different
  strategy space once phases exist: measured before, they are measured
  again. (3) A one-phase plan must reproduce today's behaviour exactly, so
  no locked scenario moves (a helm change moved 9–11 under L1 and P2). (4)
  The navigator of item 55 must take goals (range, aspect) from above, so
  the phase layer sits on it without rework. (5) Defence that reverses a
  phase can stall a battle (the 21–28 unended strafe battles of #328):
  tapping out and the cull distance must still end it.
- **When** (the design partner's reading for the owner, 2026-10-24): after
  item 55 and the rebuilt builds, before L5e2 measures E5–E7: the runner's
  planned re-measure of E7 and the verbs on the new builds is the baseline
  without phases; the same measures with phases decide. It answers
  #329's B (a rung-2 mechanism: combinations of the physics and the orders
  already built). Not inside item 55 (its navigator is still being probed);
  not after Mission 0 (E5–E7 would be proven on a game without phases).
  Cost (the design partner's guess, the lead designer's to cost): raw 8–14
  USD, × 1.24: 10–17; L5d, the helm and the enemy, cost ≥ 47.92.
- **The measure that decides.** With and without phases on the same builds:
  verb leverage (the share of battles a decision point flips toward the
  player, and against), E7's median and the shape (#318: the first hit on
  the loser as a share of the battle, hits to kill, the end), the number of
  distinct strategies each build flies in the sweep's best responses; then
  the owner's feel on the phone. Thresholds are the lead designer's.
- **Gaps found, and the owner's choices** (the owner's discussion with the
  design partner, 2026-10-24, later; on `ld/pace` `eebc3fc`, the locked
  builds of `mission0/builds.js`, not PR #104's). Method for every battle
  number below: the probe script at the end of this section (`node
  /tmp/pg.mjs <A> <T> <A's range> <T's range> <A's throttle>`, run from the
  repository root): both sides fly standing orders only (no `js/enemy.js`),
  each on the other's bow, bow-on, at rest, 900 m, seed 1, weapons live, to
  600 s. One seed and one opening: a reading, not a measure.
  The principle: a phase works only if each side can tell it from its own
  model, it has a physical attacker and defender, every move costs
  something, and a one-phase plan is today's behaviour.
  1. **No pursuit.** Against a pursuer under `close`, a side under
     `disengage` escapes in 5 of 16 pairs of the four reference builds
     (Lance mirror 86.3 s; Lance v Furnace 65.8 s; Furnace mirror 99.9 s;
     Furnace v R2 and v Lance 542.8 s) at 1.044–1.076 g each. `close`
     approaches R* (600 m) and holds it; it does not chase. Assumed, not
     traced: the braking curve to R* caps the pursuer's speed, so escape at
     equal acceleration is the law's, not physics'. The range phase's
     attacker needs a pursuing navigator (item 57's candidate).
  2. **Running costs heat** (good): Furnace running from R2, the hottest
     room's fraction of hot 0.30 at 120 s, 0.99 at 480 s. One pair.
  3. **No contact phase from a bow-on opening.** Lance ends R2 and Swarm,
     either way round, at 0.3 s (4 pairs), running or not: the silhouette
     is free at every range (#23) and only `js/enemy.js` has patience
     (first shot after floor(6 × patience) zones); the twelve slots have no
     weapons-tight value. Contact needs that order on both sides and a
     stated opening.
  4. **Exit conditions must be read from the model**, which holds no own
     hits, and a silhouette of standing cells and outline only, no
     fittings (`js/sensors.js` `silhouette`): "the other's point defence
     or antenna is gone" is known only when its EM or IR source stops or a
     re-scan resolves it, at 4 · (d / 900 m)⁴ s a zone (0.8 s at 600 m, 4 s
     at 900, 31 s at 1500). Each exit condition names the model's fields.
  5. **The enemy's personality overrides every preset** (`js/enemy.js`
     `overrides`: the range slot and open fire by aggression): with phases
     aggression becomes the exit conditions' level (#334), and the
     one-phase plan keeps the override exactly.
  6. **Unmeasured risks**: phases flipping at a threshold need a dwell (as
     `helm.positionPatience`); without loot in Mission 0 the finish's kill
     or capture differ only in speed; the decision point's contract (pause
     or not, the time before auto takes it, how many per battle, #319 (e)).
  7. **No position attacker by build either**: t180 of the four reference
     builds 7.15–8.16 s (Furnace the fastest, 12 %); Glass 5.24 s, Engine
     boat 2.115 g. Neither range nor position has an attacker among the
     four; #330's rebuild asks lethality, not a phase role.
  8. **A clock** (#30, in force, no §13m row, nothing in the kernel). Four
     pairs (Lance and Furnace, `hold` against `close`) do not end by 600
     s: they settle at 357–570 m, beam against shield; their last
     `cell-damaged` is at 0.3–6.4 s (the Furnace mirror none); the hottest
     room reaches 0.73 (Lance) to 0.94 (Furnace) of hot by 480 s. Heat
     (beam ships) and ammunition (kinetic, #92) are the kernel's clocks,
     longer than E7's 3–6 minutes. **The owner's choice**: (A) now, no new
     clock, the baseline measures the time to the first hot room per pair;
     (B) after Mission 0, a scenario clock as #30 names it (reinforcements,
     a charging weapon), with its tell (#114); (D) **a stalemate**: when no
     cell of either ship takes new damage for X s, both break off and the
     battle ends drawn (`battle.js` counts it, as Disabled's and escape's
     clocks; no side is named the defender). X is the lead designer's,
     from the baseline: above the longest quiet gap of the battles that do
     end in a kill (not measured; the slow mode of #317 lasts 307–323 s at
     17–21 % hits). Under (D) the four pairs above end by 6.4 s + X.
     Propellant (dropping #140's untracked fuel) only if the baseline shows
     running or holding drags battles out.
  9. **The measure scores running as a loss** (`tools/sweep.mjs`: an escape
     is a loss for the side that escapes, #293; the standard enemy, resolve
     0.5, never disengages, at resolve < 0.5 only). **The owner's choice**:
     outcomes counted apart, win / loss / escape / stalemate: E5's win
     rate unchanged (an escape or a stalemate is no win), and a survival
     column (wins, escapes and stalemates, with the crew alive) for E6's
     underdog and for the phases' measure.
  10. **The sweep's search grows about four times**: today one order set
     over every preset, 19 single-slot neighbours a round (each varied
     slot's values − 1 over `ORDERS`); per phase 76, before exit conditions
     and aggression. Cost linear in neighbours assumed.
  11. **Repair reverses slowly**: one cell at the full field (cell mass /
     `repair.massRate` 200 kg/s): turret 25 s, engine 29 s, beam bay 28 s,
     shield 50 s, bridge 74 s; half at 30 m. The fast mode ends in 23–75 s:
     a repair reversal only in slow battles. A formula.
  12. **The automatic captain is not symmetric**: the enemy's dodge
     intervals draw from the seeded stream; the player's side never draws
     (#240 (3)) and dodges at the interval's midpoint (`js/helm.js`
     `dodgeInterval`), so the same captain flies differently by side.
  Due before the phases plan: the owner's 8 and 9 (answered above); the
  lead designer's 1, 3, 4, 7. The rest are risks to measure.
  The probe script (save as `/tmp/pg.mjs`):

  ```js
  const R = (p) => import(new URL(p, `file://${process.cwd()}/`));
  const [{ withOverrides }, { createBattle, tick, mainBody }, { heatFraction, shipDynamics }, B] = await Promise.all(['js/data.js', 'js/battle.js', 'js/helm.js', 'mission0/builds.js'].map(R));
  const [an, tn, ra, rt, tha] = process.argv.slice(2);
  const b = createBattle({ params: withOverrides({}), attacker: B[an], target: B[tn], bearing: '+x', distance: 900, seed: 1, knowledge: true,
    orders: { A: { range: ra, throttle: +tha }, T: { range: rt, throttle: 1 } } });
  const dyn = b.sides.map((s) => shipDynamics(b, s)), d = () => { const [p, q] = b.sides.map((s) => mainBody(s).x); return Math.hypot(p[0] - q[0], p[1] - q[1]); };
  console.log(b.sides.map((s, i) => `${s.name} ${(dyn[i].a / 9.80665).toFixed(3)} g t180 ${dyn[i].t180.toFixed(2)} s`).join(' | '));
  while (!b.ended && b.t < 600) { tick(b); if (b.step % 7200 === 0) console.log(`t ${b.t.toFixed(0)} d ${d().toFixed(0)} heat ${b.sides.map((s) => heatFraction(s.world).toFixed(2)).join(' ')}`); }
  const dmg = b.sides.map((s) => { const e = (s.world.log.events || s.world.log).filter((x) => x.type === 'cell-damaged'); return `${s.name} cell-damaged ${e.length}, last ${e.length ? e[e.length - 1].t.toFixed(1) : '-'} s`; }); console.log(dmg.join(' | '));
  console.log(b.ended ? `${b.ended.kind} ${b.ended.side} at ${b.ended.t.toFixed(1)} s` : 'no end by 600 s');
  ```
- **Probe: a contact phase held at range** (the owner's question "go
  straight to phases, would it fix the pace?", with the design partner,
  2026-10-25; on `ld/pace` `bad2c9f`, valid on `d80cf84`: documents only
  between them; the locked builds, not PR #104's). Method: E7's cell as
  `tools/estimates/pace-e7.mjs` (both sides the standard enemy, `STD`),
  checked against it on R2 v Lance 900 m bow (12.2 s, cells 2/24, both
  tools); 7 pairs (R2 against R2, Lance, Swarm, Furnace; the Lance, Swarm
  and Furnace mirrors) × 900 / 1500 / 2500 m × bow / broadside, seed 1,
  `battle.cullDistance` 5000 m, to 600 s; phases emulated in the probe
  script below, nothing in `js/`. One seed, emulated phases, old builds: a
  reading, not a measure.
  1. **Weapons tight alone does not move the pace.** Patience 1.0 on both
     sides (the first shot after all 6 zones, against 3 at 0.5): the first
     release only 8–13 s later (both still close to `helm.rangeHold` 900 m,
     where a zone takes 4 s); the fight after the first cell damage 31 → 34
     s (median); two-sided battles **27 → 18 of 42** (the side that sees
     everything first wins with one volley).
  2. **A contact phase held at range gives 3–6 minutes.** Two phases:
     `range: open` (1500 m) with patience 1.0 until 6 zones resolve, then
     `range: close`. In 22 of 42 both sides finish contact, after 111–190
     s (the formula: 6 × 4 · (1500 / 900)⁴ = 185 s with one antenna); 16 of
     those 22 end, at **169–324 s (median 227 s)**; the finish after the
     later commit 0–2 s in 5 (one volley), 37–142 s in 11. By opening: 13
     of 14 at 1500 m finish contact, 8 of 14 at 2500 m, 1 of 14 at 900 m.
     The quiet time comes from the d⁴ scan law, a physical cause.
  3. **An exit condition must survive the loss of a sensor** (gap 4).
     Opening from 900 m, both ships turn stern-on and the other's plume
     ruins the antenna (#297; traced in one case, R2 mirror 900 m bow: the
     antenna `ruined` at 65.9 s near 1500 m, no cell damaged; the other 19
     cells where a side never finishes contact are not traced): "6 zones
     resolved" then never holds and neither side fires by 600 s. Running
     stern-on also blinds the pursuer: a defender's move with a cost.
  4. **The builds still stall** (#330's job): the Lance and Furnace
     mirrors finish contact and do not end by 600 s (beam against shield).
  The probe script (save as `/tmp/pp.mjs`; `node /tmp/pp.mjs <A> <T>
  <range> <bow|broadside> <seed> <patience> <cull> [phase]` from the
  repository root; one JSON line a battle):

  ```js
  // Run from the repository root: node /tmp/pp.mjs <A> <T> <range m> <bow|broadside> <seed> <patience> <cull m> [phase]
  const R = (p) => import(new URL(p, `file://${process.cwd()}/`));
  const [{ withOverrides }, { createBattle, tick }, { BUILDS }] = await Promise.all(['js/data.js', 'js/battle.js', 'mission0/builds.js'].map(R));
  const [a, b, range, opening, seed, pat, cull, mode] = process.argv.slice(2), bs = opening === 'broadside';
  const P = { aggression: 0.5, patience: +pat, caution: 0.5, resolve: 0.5 }; // the standard enemy on both sides (pace-e7.mjs), patience varied
  const x = createBattle({ params: withOverrides({ 'battle.cullDistance': +cull }), attacker: BUILDS[a], target: BUILDS[b], distance: +range, seed: +seed,
    knowledge: true, bearing: bs ? '+y' : '+x', ...(bs ? { attackerHeading: 0 } : {}), enemy: { A: P, T: P } });
  const sides = [['A', x.attacker], ['T', x.target]], ph = { A: 0, T: 0 }, rel = { A: null, T: null };
  if (mode === 'phase') for (const [, s] of sides) s.helm.override = { ...s.helm.override, range: 'open' }; // contact: hold at helm.rangeOpen
  while (!x.ended && x.t < 600) {
    tick(x);
    for (const [k, s] of sides) {
      if (mode === 'phase' && !ph[k] && s.model.resolved.size >= 6) { ph[k] = x.t; s.helm.override = { ...s.helm.override, range: 'close' }; } // commit
      if (rel[k] === null && s.helm.released) rel[k] = x.t;
    }
  }
  const dmg = (s) => { const L = s.world.log; return (L.events ?? L).filter((e) => e.type === 'cell-damaged'); };
  const [dA, dT] = sides.map(([, s]) => dmg(s)), first = [...dA, ...dT].map((e) => e.t).sort((p, q) => p - q)[0] ?? null;
  console.log(JSON.stringify({ a, b, range: +range, opening, pat: +pat, mode: mode || '', kind: x.ended ? x.ended.kind : 'none', T: +x.t.toFixed(2),
    commit: [ph.A, ph.T].map((v) => +v.toFixed(1)), release: [rel.A, rel.T], zones: sides.map(([, s]) => s.model.resolved.size), dmg: [dA.length, dT.length], first }));
  ```
- **Links.** #2, #17, #36, #38, #39, #40, #83, #111, #117, #293, #303,
  #315, #318, #319, #323, #328, #329, #30, #92, #114, #140, #240; §17 items 55, 56, 57; the presets by
  archetype and the command level above.

### Room variants: one physical trade per room

*From the owner's discussion, 2026-10-24 (the design partner).*

- **Problem it answers.** The design has progression (unlocks by intact
  salvage #33, owned rooms #73, prices by formula #74, drydock tiers #72,
  #75) but no word on upgrades. A "+ready rounds 4 → 10" upgrade would be a
  stat table, against #63 (stats from scaling formulas) and #122 (no
  stat multipliers). The owner's question started from the turret: the OTO
  Melara 76/62 the turret's mount comes from (#285) fires up to 120 rounds a
  minute (Leonardo's datasheet) where `turret.fireRate` is 30 (0.5 /s,
  approved 0.2–2), and the Compact mount holds 80 ready rounds (Wikipedia)
  where `turret.readyRounds` is 4 (approved 2–10, no cited source).
- **Mechanism.** A variant of a room trades one physical quantity for
  another, never strictly better, as #94 asks of a round type (one parameter
  traded, a best and a worst target, a counter, a core law). A variant is
  an owned item (#73) priced by the formula (#74). **At most one trade axis
  per room, two or three marks on it**, the axis taken from one of three
  families, each a core law: (1) **stored energy ↔ the risk of exploding**
  (dependency); (2) **rate ↔ heat and power** (throughput); (3) **reach or
  size ↔ signature and fragility** (information). Size S/M/L (#62) and tier
  stay as they are; a variant is a second axis. **Phase use (the owner):**
  a turret's ready store gets a fill order (low / full) in each phase's
  preset of the battle-phases idea: low while far, full before the commit,
  so the final phase can dump a long burst; filling takes the feed's time,
  so the ship carries the charge on the hull while it closes.
- **Numbers.** On `ld/pace` `35535fb`, `js/data.js`'s values; formulas,
  not battles (one `node --input-type=module -e` over `PARAMS`).
  - **Already in the kernel or the design** (not new): size S/M/L; the beam
    bay's and the railgun's length N (the railgun's slug at v √(N / 2));
    **the missile bay explodes by the missiles inside (#148)**, 56 MJ each
    (20 MJ warhead + ½ · 200 kg · (30 m/s² · 20 s)² of fuel): 2 ready 112
    MJ, 6 ready 336 MJ, the turret's case already built for the bay; point
    defence kinetic (40 rounds, 20 s at 2 /s) or laser (1 MW); plates
    (thickness ↔ 39.25 t each); magazine contents, round types, seeker ×
    warhead.
  - **Turret** (stored energy; rate): 6 MJ of propellant a round
    (`kinetic.chargeEnergy`): 4 ready rounds 24 MJ, 80 ready 480 MJ, a full
    magazine of 150 rounds 900 MJ; 0.3 MJ of heat a shot: 150 kW at 0.5 /s,
    600 kW at 2 /s; 80 rounds' heat 24 MJ against about 84 MJ to bring an M
    turret from 295 K to `thermal.crewedHot` 330 K (4 cells × 0.6 MJ/K × 35
    K, life support ignored). The feed (`ammo.wallFeed` 0.72 kg/(s·m)): a
    5 m wall 0.6 rounds/s, 80 rounds in 133 s; 10 m 1.2 /s, 67 s; the
    approved maximum 3.6 on 5 m 3 /s, 27 s. A burst of 80 at 2 /s lasts 40 s.
  - **Engine** (rate): thrust × 1.5 with machinery × 1.5 adds 8.1 t to R2
    and takes it from 1.069 g to 1.595 g, drawing 15 MW of the reactor's 20:
    while it burns, the weapons starve (the range phase's lever).
  - **Antenna** (reach): `sensor.scanRange` 900 → 1800 m takes a zone at
    1500 m from 30.9 s to 1.9 s (the contact phase's lever). The kernel does
    not tie the scan range to the antenna's size: a rule to add.
  - **Shield** (rate): `shield.buffer` 10 MJ against `shield.budget`
    10 MW, split differently for one mass: a large buffer holds a volley, a
    fast rate holds a beam; the counter of a fire-rate variant.
  - **Radiator** (size): 25 m² for 250 kg, IR ∝ area. **RCS** (rate): force
    ↔ power and mass, the turn rate (the position phase's lever).
    **Reactor**: the shield mass against crew distance, the reactor-shield
    idea above (#281). **Beam bay**: `beambay.efficiency` 0.4 (60 % of its
    power to heat) ↔ machinery mass.
  - **No axis worth building**: the bridge and the hold.
- **Gates claimed, not measured.** Law: each axis is one family's law.
  Underdog: a cheaper hull buys the one trade that beats a richer ship's
  build (an antenna that out-scans it, an engine that chooses the range).
  Readable: the readout shows the trade (mass, acceleration, power, the
  charge on the hull). Reuses: every quantity is a constant already in
  `js/data.js`; the trade moves it along its approved range with its cost.
- **Alternatives weighed in the discussion.** "+N" stat upgrades (rejected:
  #63, #122); a real 80-round ready store as the default (a 40 s burst with
  no wait: the magazine wall stops mattering and the battle turns into a
  slugfest, against #318); refilling only when close (not possible: 133 s
  for 80 rounds on today's wall).
- **Risks and what it touches.** (1) Three rules are new to the kernel: a
  turret's ready store detonates as a magazine does (`js/rooms.js`
  `detonate` covers magazines and missile bays only), the scan range from
  the antenna, the shield's buffer and rate split. (2) Each variant
  multiplies the build space: E5's sweep is measured again. (3) The fill
  order is a decision only if four things hold: the store can explode, it
  is large, the feed is slow, and the enemy can see and target the turret
  (information law). If "always full" still wins every matchup in the
  sweep, it is an automatic rule (#36), not an order. (4) Historical
  precedent (from memory, not checked): at Jutland, 1916, British
  battlecruisers kept charges outside their magazines to fire faster, and
  three blew up.
- **When** (the design partner's reading): after Mission 0, with
  progression; the turret's ready-store detonation could come earlier for
  consistency with the missile bay (#148), the lead designer's call; no
  exit criterion needs it.
- **The measure that decides.** In the sweep on builds with variants: no
  variant dominant (E5's 75 %), each variant winning some matchup; for the
  fill order, "late fill by phase" beating both "always full" and "always
  low" in some matchups; then the owner's feel in the shipyard.
- **Links.** #18, #33, #36, #62, #63, #71, #72, #73, #74, #75, #94, #122,
  #148, #193, #281, #285, #318, #334; battle phases; the reactor shield mass.

## Not yet worked

Each line as recorded, unchanged: why it is interesting · gate risk.

- **Blast resistance from mass** — waiting (#232, `DESIGN.md` §13i.1). Blast,
  like rounds and beams, would then follow the mass of a cell (#232) · not in
  the path model; needs its own estimate.
- **Tumble and sloped armour (#6)** — waiting (#230). A round hitting
  obliquely is turned by the off-centre contact force and presents more area;
  angling the ship becomes a lever, as with real tank armour · needs a facing
  the player controls (prototype v2's helm) and an estimate of the effect.
- **Plasma toroid gun (MARAUDER)** — waiting. An energy "bullet": a
  magnetically self-confined plasma ring that bursts on contact (#228) · few
  public numbers; lifetime and range at 0.6–1.5 km unverified; a surface
  effect, not penetration; the beam role went to the particle beam (#229).
- **Named crew with veterancy** — waiting. Attachment to people beyond their
  names · a new system (crew XP); bridge-sim cut crew manning.
- **Escape pods** — waiting. Crew flee before a breach; drama with a cause ·
  needs crew movement, which the owner rejected. (Not the ship's escape of
  #293.)
- **Surrendered enemy crew join yours** — waiting. Replacements with a story ·
  a new system; touches the economy of replacements.
- **Beam modes (focused / wide)** — waiting. Beams gain a choice like
  ammunition · beams already have an identity (no ammunition).
- **Battery / capacitor room** — waiting. Store power for a burst: a time
  window · proposed in a rejected early room list, never approved.

## Deferred and rejected

- **Cofferdam (a 1×N empty hold)** — deferred (#201). Real ships' void space
  between machinery and crew · its heat role vanished under the coolant-loop
  model (#200); a blast buffer only, which the 2×2 hold already is.
- **Tractor beam and mines** — deferred (#20), when ramming and boarding were
  cut · not yet checked against the four gates. Its mines half is taken up by
  "Tracking mines laid by a standing order" above.

## Moved out (adopted)

- **Heat sink room** — adopted (#197, built at L2). Store heat for a while,
  then vent: a time window · passed the four gates (throughput law;
  time-window path; glows as it fills; the heat model with two constants).
- **Sound carried through the hull** — adopted (#153) as a principle in
  `DESIGN.md` §11: only your own ship is heard; the audio itself waits for
  Mission 0.
- **Rescuing crew on dark fragments** — adopted (#88). A different ending to a
  fragment's last words.
