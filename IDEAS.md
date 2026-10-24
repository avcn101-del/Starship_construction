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
| [A thin skin over the rooms, with cosmetic paint](#a-thin-skin-over-the-rooms-with-cosmetic-paint) | information | yes · – · yes · yes | the owner's feel on the phone; the cost of three kernel rules | waiting |
| [Command level: watch, captain, hands-on](#command-level-watch-captain-hands-on) | not claimed (a way to play, not a law) | – · yes · yes · yes | verb leverage (the share of battles a player verb flips) and the battle's shape (quiet share, hits to kill), then the owner's feel on the phone | waiting |
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

*From the owner's discussion, 2026-10-23.*

- **Problem it answers.** A ship drawn by its cells is asymmetric and reads
  as a jumble; the owner, looking at the outside-view mockups
  (https://claude.ai/artifact/9gMtu29eGWWFvee9F7pNvs): no spaceship looks
  like that. The rooms stay blocks inside; the outside should have a ship's
  shape.
- **Mechanism.** Three parts. (C3) A **thin skin**: a smooth, symmetric
  outline around every cell, a real 1 mm sheet that stops nothing, so the
  physics stays the rooms' own thin walls. (C4) **Cosmetic paint** on that
  skin only: liveries, decals, salvaged patchwork, duct-tape patches; never
  a change of shape, as an FPS skin leaves the hitbox alone. (Cutaway) Your
  own ship is drawn with its rooms under the skin, because you know them;
  the enemy's rooms appear only in the zones you have scanned (an
  information layer like #48's overlays, not light). With the cooling
  manifolds of the previous section, the skin radiates and the panels go.
- **Numbers.** Kernel: `buildShip` and `readout` on `ld/l5d`; skin areas,
  masses and balances by scratch scripts, not committed, not re-run.
  - R1 is 911.2 t, 1.68 g on 15 MN. A smooth skin around its 44 cells, at
    least 0.60 m clear of every cell: 3938 m², 773 m² of it the edges. In
    1 mm titanium 17.7 t (1.68 → 1.65 g); aluminium would be 10.6 t but
    melts at 933 K, below the manifold balances; steel 30.9 t.
  - It stops nothing: 1 mm of titanium is 4.5 kg/m² on a path, against a
    0.2 m plate's 1570 kg/m².
  - A slender layout of R1's same ten rooms (two decks, the engine and the
    beam bay on the axis) passes `validateShip`: 70 × 20 m, 910.2 t, 1.68 g,
    13 radiators; I 146e6 against R1's 93e6 kg·m² (a 90° turn in about
    2.6 s against 2.3 s, a rough constant-torque estimate). Bow-on it shows
    20 m instead of 30, broadside 70 instead of 55; every room touches the
    hull (R1's reactor and magazine have no open edge, here 3 and 4), so a
    broadside reaches them. Its skin: 3622 m², 0.66 m clear, 16.3 t in
    titanium.
  - The skin as a radiator (ε 0.9, about 25 MW made, the whole area at one
    temperature, an upper bound): the balance is 1036 K with the 17 panels
    (425 m², 2.8 MW at 600 K, as #305), 847 K on R1's open edges (950 m²),
    892 K on the skin's edges (773 m²), 594 K if its top and bottom faces
    radiate too (3938 m²). Only the skin over plant rooms runs hot (22 of
    the 44 cells), so the ship's real balance lies above these.
- **Gates claimed, not measured.** Information (the free silhouette becomes
  the skin's outline, so the layout stays hidden until scanned; passive IR
  still sees the hot sections); readable (a ship's shape; your rooms in the
  cutaway, the enemy's only where scanned); reuses the path model (a sheet
  of known areal mass), the knowledge model and the heat model. No underdog
  path is claimed.
- **Alternatives weighed in the discussion.** (A) A skin drawn with no
  physics and a shape other than the cells': a round would cross a drawn
  hull without effect (#46) and the drawn silhouette would differ from the
  one the enemy knows (#23); the owner chose C3 + C4 instead. (B) A thick
  separate shell with mass: by the rules as written (#141), an HE round
  would burst on it, outside the rooms, where an outside blast does nothing
  (spaced armour), so HE would become nearly useless; not run. (C2) The gaps
  of a symmetric grid form filled with wall cells of the room beside them,
  3 t each: R1 plus 10 wall cells is 54 cells, +30 t, 1.62 g, all 17
  radiators kept if 9 move onto a wall's outer face; still stepped at 5 m.
  (C1) The gaps filled with S holds, no kernel change: 9 of R1's 21
  fittings lose their open edge (`fittingProblem`), the engine all four of
  its radiators.
- **Risks and what it touches.** Three kernel rules, the lead designer's:
  count the skin's mass; mount a fitting on the skin over its room
  (radiators or manifolds, RCS, the turret, the sensor antenna) instead of
  on the room's own edge, which moves IR sources and fitting hits by up to
  about 10 m; and make the free silhouette (`L1.sensor.active`) the skin's
  outline instead of the cells', or the enemy knows a cell shape the player
  cannot see. The outline must enclose every cell and come from the layout,
  or be chosen as a hull form in the shipyard (presentation, after Mission
  0). A destroyed cell tears the skin above it. With manifolds, which faces
  radiate decides whether plant hot is ever reached.
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
  delegated); the lead designer's estimate of the three kernel rules' cost.
- **Links.** #15, #23, #45, #46, #48, #141, #256; the battle screen (outside
  view and knowledge panel); the hull radiates (cooling manifolds).

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
