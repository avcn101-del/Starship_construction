# Changelog

## Unreleased — 2026-10-24 — item 55's answers (#339)

- #339: K0 accepted with a grep-only move; stale mutations re-targeted
  in PR #105; the yield read as P3's code; K6 `L4.helm.yield` added to
  §13n.9 (179 VERIFIED expected).

## Unreleased — 2026-10-24 — outcomes counted apart and the clock (#336, #337)

- #336 (the owner): win / loss / escape / stalemate counted apart; E5's
  win rate unchanged; a survival column. #337 (the owner): no new clock
  now; a scenario clock after Mission 0; a stalemate after X s without
  new cell damage, X the lead designer's from the baseline. `DESIGN.md`
  §3 and §18; `IDEAS.md` merged from `ideas/phase-gaps`.
- #338 (the owner): the sweep ranks by wins, then survival, then crew
  alive; a stalemate scores 0 in E5, #315's draw a half.

## Unreleased — 2026-10-24 — battle phases: gaps and the owner's choices

- `IDEAS.md` (battle phases): twelve gaps from the design partner's probe
  and the owner's choices on a clock (no new clock now; a scenario clock
  after Mission 0; a stalemate after X s without cell damage) and on
  outcomes counted apart; on `ideas/phase-gaps`.

## Unreleased — 2026-10-24 — the room-variants idea

- `IDEAS.md`: the design partner's room-variants idea from the owner's
  discussion (one physical trade per room in three families: stored
  energy, rate, reach; a turret's ready store filled by phase); on
  `ideas/room-variants`.

## Unreleased — 2026-10-24 — §17 item 55's plan (#333–#335)

- #333 (the owner): the helm in layers, pilot, navigator, gunnery and
  systems. #334 (the owner): battle phases, after item 55 and the builds,
  before L5e2's E5–E7; `IDEAS.md` merged from `ideas/battle-phases`.
- #335: item 55's pass, `DESIGN.md` §13n.9 (the probe P3 on the helm
  suite, `tools/estimates/helm-suite.mjs`; K0–K5); §17 items 56 and 57;
  §13m row "The helm's layers"; §14 adds `pilot.js` and `navigator.js`.

## Unreleased — 2026-10-24 — the battle-phases idea

- `IDEAS.md`: the design partner's battle-phases idea from the owner's
  discussion (contact, range, position and control, finish; attack or
  defence in each; decision points chosen from a menu at a chosen depth),
  combining the presets-by-archetype and command-level ideas; on
  `ideas/battle-phases`.

## Unreleased — 2026-10-24 — the owner on the S turret (#332); the hull-fill idea

- #332: a specialist may carry at most one secondary S turret only if it
  still fails #330's (i) or (ii) after §17 item 55; recorded with and
  without it.
- `IDEAS.md`: the design partner's hull-fill rule (a thin skin, holds
  scaled by area share; after Mission 0, #313), merged from
  `ideas/hull-fill`.

## Unreleased — 2026-10-24 — §17 item 53: a beam into a ship with no body

- `js/battle.js` `beamsOut`: a target whose every cell the step destroyed
  has no body; the beam meets no matter (an empty path), deposits nothing
  and all it passed leaves play as `fireBeam`'s `escaped`. The throw at
  step 9524 of the pace study's R2 v Lance (600 m, bow, target shield) is
  gone. `L4.beam.nobody` (locked) records it.
- `js/rooms.js` `shieldRound`: a round's speed through a field is relative
  to the body it hit; its hull velocity came from the paying generator's
  body, and the energy book leaked when the two were different fragments
  (9.3 kJ at step 8452 of `L4.beam.nobody`; the lead designer's answer on
  PR #103). `L0.determinism.v2` re-recorded (the grep's line numbers).
  `tools/mutations.json`: `item53.beam.nobody`, `item53.field.hullFrame`.

## Unreleased — 2026-10-24 — process: the plan checklist and the mutation run (#326)

- The plan checklist is three items (§13m rows, probe, tolerances);
  `tools/lint-docs.mjs` check 10: every scenario a §13m row names exists,
  every proven row names one. The full `tools/mutate.js` run only at a
  level's exit or on STALE/CHANGED, by a runner (`CLAUDE.md`, the agents).

## Unreleased — 2026-10-24 — an idea from the owner's discussion

- `IDEAS.md` (the design partner): command level (watch, captain, hands-on;
  rewind and branch in the dry run), with verb leverage and the battle's
  shape measured on `main` `ca57372`; nothing built.

## Unreleased — 2026-10-24 — L5e1: the rules and the tools before ship versus ship (#315, #316)

- `js/helm.js`: the position law (`helm.positionLead`, 60°): the wanted point
  rides the circle of R* (#315); the repair slot refuses anything but `none`
  or a list of room types; the `1e-9` margins named float resolution; a
  `heatResponse` override (the sweep's).
- `js/battle.js`: the engine's plume (`engine.plumeHalfAngle`, 30°; fittings
  only, `fitting-ruined`); a simultaneous end is a draw (`draw`); a missile's
  body meets a charged field as a round (§17 item 48); a static attacker may
  hold `attackerHeading`; a magazine `load: { size }`.
- `js/rooms.js`: reactor containment first in the repair grants (#37); a
  field's impulse on the round's line of action, in the hit body's frame
  (§17 item 35; the frame fixes a momentum leak on fragments); no
  `cell-damaged` / `plate-damaged` without a change of integrity (§17 item
  51); `burnFitting`. `js/sensors.js`: a ruined panel or antenna works no more.
- `mission0/builds.js` (R2, Lance, Swarm, Furnace; Brick, Glass, Porcupine,
  Fortress, Engine boat, Cold Brick), `tools/sweep.mjs`,
  `mission0/probes/l5e1-j5.mjs`; J1–J13 and the successors; `tools/mutations.json`
  (`l5e1.*`, seven entries re-anchored).
- Fix round (PR #101's review, the physics checker, the lead designer's
  answer 3): `js/battle.js` the plume's occlusion (a fitting behind its own
  hull is shadowed); `L4.engine.plume.shadow`; successors
  `L4.engine.plume.v2`, `L2.missile.field.v2`, `L4.books.field.v2`,
  `L4.sweep.determinism.v2` (their originals withdrawn, frozen);
  `tools/mutations.json` `l5e1.plume.noShadow`, `.shadowTouch`, `.noCone`
  re-anchored.

## Unreleased — 2026-10-24 — L5e1 planned (#316)

- `DESIGN.md` §13n.8 (L5e1: rules, J1–J13, cost, checklist), §13m's rows;
  `tools/estimates/l5e1.mjs`; `DECISIONS.md` #316, §18.

## Unreleased — 2026-10-24 — L5e split; the position law (#315)

- `DECISIONS.md` #315: the owner's B (L5e1, a pace study, L5e2); the
  position slot's wanted point rides the circle of R* (`helm.positionLead`,
  60°), so ships no longer fly through each other; `DESIGN.md` §13n.1 (d), §18.

## Unreleased — 2026-10-24 — the mutation run on L5d's merge (#314)

- `mission0/mutations/2026-10-24-761e5e4.txt`: 269 mutations, 221 KILLED,
  12 CHANGED, 36 SURVIVED; `tools/mutations.json`: ten entries re-anchored.

## Unreleased — 2026-10-24 — the thin-skin idea (#313)

- `IDEAS.md`: "A thin skin over the rooms, with cosmetic paint" (the design
  partner, `ideas/hull-skin`). `DECISIONS.md` #313: its three kernel rules
  wait until after Mission 0; `DESIGN.md` §18.

## Unreleased — 2026-10-23 — the prototype page on the L5d loop merged (#312)

- PR #96 (feel-6): the page on the kernel's symmetric loop; `L0.determinism.v2`
  re-recorded on its duel (Node = Chromium `5de002fe`). `tools/mutate.js`
  serialises `L0.determinism.v2`. `DESIGN.md` §13n.1 (d), §18.

## Unreleased — 2026-10-23 — the feel prototype on the L5d kernel (#301 (5))

- `proto/` rebuilt on the kernel's symmetric loop (`feel-6`): the page
  drives `js/battle.js`'s `createBattle` / `tick` as `tools/duel.js`'s
  `createDuel` (both ships R1d-A, knowledge on, the player on Fire, the
  standard enemy of `js/enemy.js`); `proto/battle.js`'s own loop, the
  stand-in `AUTOPILOT` and the enemy's `SCRIPT` removed, with the levers
  the kernel no longer has (magazine, layout, turrets, range / facing /
  dodge orders); shield budget and hits to wreck stay as run-time overrides.
  The three verbs (scan a zone, target a known room, switch preset) enter
  as the kernel's inputs. The enemy is drawn from the player's knowledge
  model only; the player's ship from its own world. The export carries the
  seed, the inputs and the `tools/duel.js` replay line; `proto/replay.mjs`
  replays it through `tools/duel.js`. `proto/measure.mjs` rewritten on the
  duel; `proto/smoke.mjs` uses each verb once.
- `L0.determinism`'s duel moves to the kernel loop (`proto/duel.js`
  `duelHash`: seed 7, Evade from t = 0, 60 s); `tools/determinism.mjs` and
  the scenario's `setup` text say so (its `measure` is in the L0 lock and
  stays); cases, expected, compare and invariants unchanged. Its canonical re-record **FAILs**: Node and
  Chromium differ, from `Math.atan2` in the kernel (`js/helm.js`,
  `js/battle.js`); a question for the lead designer in the pull request.
## Unreleased — 2026-10-23 — the prototype page and cross-engine determinism (#310)

- `DECISIONS.md` #310: the prototype page on the L5d loop (PR #96) waits
  for `m0/det-math`, which replaces the kernel's implementation-approximated
  `Math` functions by deterministic ones; `DESIGN.md` §18.
## Unreleased — 2026-10-23 — Deterministic atan2, cbrt and hypot (PR #96's finding)

- `js/util.js`: `cbrt` (fdlibm `s_cbrt.c`), `atan2` (fdlibm's reduction
  and polynomial with y / x and the reduced argument in double-double,
  rounded once: fdlibm's own `atan2` errs by up to 1.23 ulp) and `hypot`
  as `Math.sqrt(a*a + b*b)` (|a|, |b| ≤ 1e150, no overflow; 1.13 ulp
  measured). `atan2` takes 0 or magnitudes in [1e-100, 1e100] and throws
  outside, as `sin` does. Every `Math.atan2`, `Math.cbrt` and `Math.hypot`
  in `js/` uses them; nothing else in the kernel changes.
- `tools/mathcheck.mjs`: `atan2`, `cbrt`, `exp`, `log` and `hypot` against
  an exact BigInt reference over 10^5 seeded inputs each (max 0.61, 0.66,
  0.84, 0.77 ulp; `hypot` 1.13, stated); `--chromium` checks Node and
  Chromium give the same bits on every input.
- `L0.determinism.v2` (locked in `1a8e71a`): the same hash part and a grep
  for every `Math` member except the exact or correctly rounded ones;
  `L0.determinism` withdrawn under it, frozen. The duel's Node hash moves
  27f10ee0 → ad3e4e15 (30 → 27 events: `hypot`'s last bit in the repair
  rate moves when a cell's integrity drops below 1), MATCH in Chromium.
- Re-recorded (last-bit moves, all far inside 1 % of their tolerances):
  `L4.helm.range`, `L4.helm.style`, `L4.loop.rules`, `L4.shield.window`,
  and `L4.loop.symmetric` (it replays `L4.helm.style`'s rows hash).

## Unreleased — 2026-10-23 — L5d merged: the helm and the enemy (#309)

- Kernel (PR #94): the symmetric loop, `js/helm.js` (twelve standing
  orders, presets, the range order, style, lead, surrender, escape),
  `js/enemy.js` (personality, wildcard draw, surrender, disengage), the
  missile bay's draw, power test and cook-off, `tools/play.mjs`,
  `tools/duel.js`; 7 new constants (`helm.*`, `enemy.decisionInterval`);
  H1–H20 and H9′, five withdrawals with successors. `DECISIONS.md` #309;
  `DESIGN.md` §13m's L5d rows proven (three moved to L5e), §13n.1 (d),
  §13n.6, §17 item 50, §18; `CONSTANTS.md` regenerated; `LEDGER.md`
  (L5d ≥ 47.92 USD, ratio ≥ 1.20).

## Unreleased — 2026-10-23 — L5d probed and planned (#301–#308)

- #308: H20 `L4.route.escape.reorder`; the float margin confirmed.
- #307: the style slot, repair priority and the escape count, on the L5d
  fix round's questions; H15 restated, H19 new. `DESIGN.md` §13n.1 (d),
  §13n.4, §18.
- `DESIGN.md` §17 item 49: the pace on the symmetric loop (R1d-A duels
  23–107 s on PR #94's head; E7's question for L5e).
- `IDEAS.md` restructured (the design partner, `3fabc06`, the owner's ask):
  an index table, one section per worked idea, the short lists for ideas not
  yet worked, deferred or rejected, and moved out; the same 18 ideas, stale
  text citing the decisions since.
- `IDEAS.md` (the design partner, `3eb77de`): the hull radiates, fed by
  cooling manifolds, with a heat-sink cascade; a law call for the owner
  later, nothing built now.
- #306: answers to L5d's engineer, blind checker and reviewer; a fix round
  (H15–H18, `L4.route.emp.v2`). `DESIGN.md` §13n.1 (d) ("L5d as built"),
  §13n.4, §17 item 48, §18.
- #305: the Cold Brick joins E5's degenerate builds (the design partner's
  proposal); `DESIGN.md` §13n.1 (e), §18.
- #304: #297's reason corrected (radiators do not overheat a ship inside a
  battle; the design partner's check, `tools/estimates/radiators.mjs`); L5e's
  plume measure reports it. `DESIGN.md` §13n.1 (e), §18.
- #303: the surrender timer is `battle.disabledSeconds` × resolve (the
  L5d engineer's second question); `DESIGN.md` §13n.1 (d), H8, §18.
- #302: the range order's engagement (`helm.rangeBand`, new), on the L5d
  engineer's early question; `DESIGN.md` §13n.1 (d), §13n.2, §18.
- `DESIGN.md` §13n.1 (d) (the row "L5d's amendment"), §13n.2
  (`helm.dodgeMin`, `helm.dodgeMax`), §13n.3 (11), §13n.4 (H1, H2, H4, H11
  reworded; H12–H14 new), §13n.5 (re-costed; the prototype page's
  session), §13n.6, §17 items 44–46, §18. `DECISIONS.md` #301.
  `tools/estimates/l5.mjs` section (11) (escape and dodge by the
  integrator's sum; the escape cases driven by hand on today's kernel);
  `tools/estimates/l5d-probe.diff` (the probe's patch and command).
  `STATUS.md`: this lead designer chat took over.
- `IDEAS.md` (the design partner, `4670d7a`): the battle screen, an outside
  view plus a knowledge panel, the layout the owner chose from the mockups;
  presentation, after Mission 0, nothing built now. Two follow-ups to the
  same row (`0701f39`: a tell strip, a dynamic camera, a zone zoom;
  `d506a7c`: the outside hull drawn smooth, the inside kept on the cell
  grid, adding to #45).

## Unreleased — 2026-10-23 — The mutation run on the L5c merge (#300)

- `DECISIONS.md` #300: the full mutation run on `c1b2c4a`
  (`mission0/mutations/2026-10-23-c1b2c4a.txt`): 186 KILLED, 6 CHANGED,
  45 SURVIVED, 0 STALE of 237; no new survivor. `DESIGN.md` §18.

## Unreleased — 2026-10-23 — L5c merged: weapons (#299)

- Kernel (PR #88): the spinal railgun, the missile bay and missiles
  (`js/missile.js`), seekers and warheads with EMP by section, point
  defence (`js/defence.js`) with `pd.range`, the round types and the
  shot's choice, the firing window, S footprints, the missile body's
  impulse and heat; 30 new constants; scenarios W1–W14 less W9b, four
  successors. `DECISIONS.md` #299: answers to the second fix round and the
  reviewer; W9b an L5e measure; the bay's power test and every bay by
  orders in L5d. `DESIGN.md` §13m's L5c rows proven, §13n.4 (W3, W9b),
  §13n.6, §17 items 45–47, §18. `LEDGER.md` (L5c 39.06 USD, ratio 1.18).

## Unreleased — 2026-10-23 — L5c fix round 2 (#298)

- Scenarios: `L1.pd.kinetic.v2` (successor of `L1.pd.kinetic`: the dose law
  enforced, the dose at the kill the sum of E / (1 + (d_i / flak.radius)^2)
  over the bursts at 1e-12) and `L2.missile.seekers.v2` (successor of
  `L2.missile.seekers`: the hand-worked final IR point (17.5, 0) and
  anti-radiation point (42.5, 0) on the target's pose). Both predecessors
  withdrawn under #298. The crossing case of #298 (1) and `L2.pd.saturation`
  (W9b) are not built: questions in pull request #88.
- `mission0/targets.js`: `missileShip3` (R1-M3, three missile bays).
  `tools/mutations.json`: `l5c.flak.doseExponent`, `l5c.seeker.panelPosition`.

## Unreleased — 2026-10-23 — L5c fix round (#296)

- `js/data.js`: `pd.range` (600 m, 300–1500, k 1; `approved: true` as the
  plan's, #272 (2)). `js/defence.js`: point defence engages a missile only
  within `pd.range` of the fitting (in its arc, nearest first, as built).
- `js/battle.js`: a missile's body at impact (all of it for HE and EMP, the
  rest beyond the penetrator) joins the hull's body at the first entry
  (`embedRound`, the round rule's stopped-round accounting): its momentum to
  that body, the kinetic energy the join loses heat in the entry's room;
  nothing booked as spent.
- Scenarios: `L2.magazine.types.v3` (successor of `.v2`, the missile row on
  the built rule), `L2.missile.warheads.v2` (successor of W7: the body's
  impulse and heat, the penetrator through the battle's warhead path),
  `L2.pd.swarm` (W9, at the bay's own cadence with a store of six). `.v2`
  and W7 withdrawn under #296. `tools/mutations.json`: `l5c.pd.range`,
  `l5c.missile.bodyImpulse`.

## Unreleased — 2026-10-23 — Answers to L5c's fix round and checker (#298)

- `DECISIONS.md` #298: `L1.pd.kinetic` and `L2.missile.seekers` withdrawn
  for successors (the dose law, the hand-worked seeker points);
  `L2.pd.saturation` (three bays); `he.coupling` a flat burst efficiency;
  the body before the warhead; point defence's own sensor; the penetrator's
  228 m/s in battle; §17 item 47; a second fix round. `DESIGN.md` §13n.1 (c),
  §13n.3, §13n.4, §17, §18.

## Unreleased — 2026-10-23 — The engine's plume (#297)

- `DECISIONS.md` #297: the jet has an effect (the owner): fittings only,
  built in L5e with `engine.plumeHalfAngle` (new, planned) and
  `L4.engine.plume`; IR-only until then; the Engine boat in E5.
  `DESIGN.md` §13n.1 (e), §13n.2, §18.

## Unreleased — 2026-10-23 — Answers to L5c's engineer (#296)

- `DECISIONS.md` #296: `pd.range` (new, 600 m); `L2.magazine.types.v2` and
  `L2.missile.warheads` withdrawn for successors; a missile's body books
  its impulse and heat; S rooms by cell count; the as-built confirmations;
  §17 item 46 (the missile bay's draw and cook-off); a fix round.
  `DESIGN.md` §13n.1 (c), §13n.2, §13n.3, §13n.4 (K4, W7, W9), §17, §18.

## Unreleased — 2026-10-23 — L5c: weapons (DESIGN.md §13n.1 (c), §13n.4 W1–W14)

- `js/data.js`: the L5c constants of §13n.2 (`railgun.*`, `missilebay.*`
  with the launcher's mass, `missile.*`, `emp.*`, `pd.*`, `flak.radius`,
  `pdLaser.*`, `rounds.*`; `approved: true` as the plan's, #272 (2)); the
  `ROUNDS` table (Standard, AP, HE, Sabot, Flak), `SEEKERS`, `WARHEADS`;
  S footprints for every room; the railgun a spinal room (N × 2, hull,
  axis, bow clear); the missile bay structure plus launcher.
- `js/rooms.js`: S rooms by their cell count; the railgun (slug, draw,
  heat, recoil, fed from a railgun magazine); the missile bay (ready store,
  feed, launch, explosion by its store); missile magazines; typed rounds
  (one type per slot, AP's rate, Sabot's recoil and petals, HE's burst);
  `contactBurst`, `empBurst` and the EMP outage; point-defence fittings.
- `js/missile.js` (new): flight, seekers. `js/defence.js` (new): point
  defence. `js/battle.js`: the railgun, missiles and point defence in the
  loop, the shot's type against its target, the firing window, the books
  with missiles and flak; `buildShip` threads `size`, `length` and `load`.
  `js/sensors.js`: missiles as sources; an outage stops a scan.
  `js/events.js`: the new events and roots.
- Scenarios W1–W8, W10–W14 (15 files; W9 waits on a question).
  `mission0/targets.js`: R1d-L, R1-M. `tools/mutations.json`: 30 L5c
  rules; 16 entries re-anchored on the rewritten lines.

## Unreleased — 2026-10-23 — L5c probed and its plan amended (#295)

- `DECISIONS.md` #295: the probe (125 of 125 rows unchanged), `pd.mass` and
  `pdLaser.mass` (new), AP's rate and Sabot's recoil as their prices, the
  counter per round type and the railgun's counters (W2's 0.4 m case, an
  L5e measure), `buildShip` to thread `size`; L5c raw 27–39. `DESIGN.md`
  §13n.1 (c), §13n.2, §13n.4 (W2, W10), §13n.5, §13n.6, §18.

## Unreleased — 2026-10-23 — The overheat route (#291), EMP by section (#292), escape (#293), the mutation run (#294)

- `DECISIONS.md` #294: the full mutation run on the L5b merge `928725c`
  (`mission0/mutations/2026-10-23-928725c.txt`): 149 KILLED, 7 CHANGED,
  45 SURVIVED, 2 STALE; the two stale mutations re-targeted at the lines L5b
  rewrote (`tools/mutations.json`): one KILLED, one SURVIVED as before.
  `js/data.js`: `thermal.coupledCrewed` 0.2–1 MJ/K (#291); every passing
  scenario re-recorded. `DESIGN.md` §17 item 45 (f), §18.

- `DECISIONS.md` #293: escape as a battle outcome (the owner): the
  `disengage` order, the rule beyond `battle.cullDistance` for
  `battle.disabledSeconds` counted beyond it, the enemy's rule by resolve,
  a loss in E5; H11 `L4.route.escape` in L5d's plan. `DESIGN.md` §13n.1 (d),
  (e), §13n.4, §18. `tools/estimates/l5.mjs` (3) prints the plate thickness
  it uses.

- `DECISIONS.md` #291: the owner's option 1 on §17 item 43 with a condition;
  `thermal.coupledCrewed`'s range 0.2–1 MJ/K (`js/data.js`, every passing
  scenario re-recorded); `L5.route.throughput` as an L5e measure;
  `tools/estimates/item43.mjs`. #292: EMP disables a section: 2 MJ / 20 m /
  1.47 MJ (12 m reach), `emp.outageTime` (new, 5 s); W7 and H9 reworded;
  `tools/estimates/l5.mjs` (4) prints the section reach on R1. `DESIGN.md`
  §13k.2, §13n.1 (c), (d), (e), §13n.2, §13n.3, §13n.4, §17 item 43, §18.
  `IDEAS.md`: the tracking-mines idea (the design partner, `00864e8`).

## Unreleased — 2026-10-23 — L5b merged: the senses and the knowledge model (#290)

- `js/sensors.js` (new): IR and EM point sources, passive resolution at
  d⁻², 3 × 2 zones scanned at d⁴ revealing their own cells, one knowledge
  model per side, the events `scan-started`, `zone-resolved`,
  `source-resolved`. The antenna fitting (`sensor.mass`); `knowledge` and
  `scans` as battle settings; seven constants in `js/data.js` (`sensor.*`,
  `engine.exhaustVelocity`). Scenarios S1–S9 (`L1.sensor.passive`,
  `L1.sensor.active`, `L2.sensor.reveal`, `L2.sensor.memory`,
  `L2.sensor.shield`, `L3.sensor.control`, `L4.target.known`,
  `L0.sensor.tier`, `L2.sensor.posture`); every passing scenario
  re-recorded on the new data hash (PR #84).
- `DECISIONS.md` #290: answers to the engineer, the blind checker and the
  reviewer. `DESIGN.md` §13n.1 (a) "L5b as built", §13m's nine L5b rows
  proven, §13n.6, §17 items 44–45, §18. `LEDGER.md` costs (11.62 USD,
  ratio 0.65). `CONSTANTS.md` regenerated.

## Unreleased — 2026-10-23 — L5b: senses and the knowledge model (#278, #289)

- `js/sensors.js` (new): each side's sources (radiator panels by
  `irBrightness`, an engine's exhaust at thrust x `engine.exhaustVelocity`
  / 2, a scanning antenna, an absorbing shield), passive resolution at
  d^-2 against `sensor.sensitivity`, scans by 3 x 2 zones at d^4, the
  knowledge model per side (silhouette, resolved zones and their cells,
  sources, own shots and hits) and the events `scan-started`,
  `zone-resolved`, `source-resolved` (roots `scan-<n>` and `sense`).
- Kernel: the `antenna` fitting (`addFitting`, `sensor.mass` at its edge's
  midpoint); a scanning antenna's draw joins its host's `powerRequest` and
  is heat in the host; a shield's payment for a round counts as its EM
  brightness over that step (`roundEm`, read with `s.em`); `createBattle`
  takes `knowledge` (default off), `scans` and `plan.zone`, `buildShip` an
  `origin`; `tick` senses only with `knowledge` on. With it off no locked
  row moves (116 of 116 unchanged); every passing scenario re-recorded on
  the new data hash.
- `js/data.js`: `sensor.area`, `sensor.sensitivity`, `sensor.scanPower`,
  `sensor.scanTime`, `sensor.scanRange`, `sensor.mass`,
  `engine.exhaustVelocity`, approved as the plan's (#272 (2)).
- Scenarios S1-S9 (`L1.sensor.passive`, `L1.sensor.active`,
  `L2.sensor.reveal`, `L2.sensor.memory`, `L2.sensor.shield`,
  `L3.sensor.control`, `L4.target.known`, `L0.sensor.tier`,
  `L2.sensor.posture`), locked and passing; `mission0/targets.js` gains
  `HOLD_ANTENNA` and `SENSOR_SHIPS`; seven mutations in
  `tools/mutations.json`.

## Unreleased — 2026-10-23 — L5b probed and made buildable (#289)

- `DECISIONS.md` #289: the probe of L5b (116 of 116 rows unchanged) and the
  lead designer's precisions to §13n.1 (a): the antenna fitting and
  `sensor.mass` (new), the scan's power, progress and reset, the zone
  bounds and what a zone reveals, point sources, the knowledge model as a
  battle setting, the events' roots. `DESIGN.md` §13n.1 (a), §13n.2, §13n.4
  (S2, S7, S9), §13n.6, §18. `tools/estimates/l5.mjs` section (1) prints
  the zones and the antenna's mass. `STATUS.md`: the new lead designer chat.

## Unreleased — 2026-10-23 — The pace study after L5m (#288)

- `DECISIONS.md` #288: the owner kept `magazine.detonationSpeed` at 400 m/s;
  the pace table on R1 and R1d at 400, 500 and 600 m/s (three corrections
  by the design partner); the full mutation run on `afa73b4`
  (`mission0/mutations/2026-10-23-afa73b4.txt`). `DESIGN.md` §13n.1 (b), §18.

## Unreleased — 2026-10-23 — L5m merged (#287)

- `DECISIONS.md` #287: L5m merged (PR #78); answers to its engineers,
  blind checker and reviewer. `DESIGN.md` §13f.1 (contents at the room's
  centre), §13l.2 (the masses after L5m), §13m's turret and route rows
  proven L5m, §17 item 43 (the overheat route's heat capacity), §18.
  `LEDGER.md` costs and ratio 1.21; `tools/estimates/l5.mjs`'s key renamed.

## Unreleased — 2026-10-23 — L5m: the routes the turret's mount moves (#286)

- Scenarios: `L4.route.missionKill.v3` (the mission kill on R1d from +y:
  Disabled in step 3666 with the engine working, the turret's last cell by
  shot-26; R1 from +y kept as a case destroyed by its magazine, the round
  entering at v_rel − 331.493 m/s, about 468.5 m/s, by shot-9 in step 1026),
  `L4.route.overheat.v3` (overheat through R1's bridge from −y: the bridge
  shut down by heat in step 1379, above the bound C_surv ΔT / (P_beam +
  P_own) = 14.118 s, control lost, the reactor SCRAMmed, Disabled with
  `no-control` in step 1979, the root `heat`; T-gun's turret kept as a case
  the beam destroys, Disabled in step 1411) and `L4.cascade.v4` (B2 and B4
  replaced by these). Their predecessors withdrawn under #286.
- `js/data.js`, notes only: `cellMass.crewed` no longer names the turret;
  `battle.openingRange` cites #270 (9); `cellMass.reactor` says its 1130 t
  compartment is a secondary, contested source (#281 (1)). No value, range
  or exponent changed; every standing scenario re-recorded (data hash).

## Unreleased — 2026-10-23 — L5m's route question answered (#286)

- `DECISIONS.md` #286: mission kill on R1d, overheat through R1's bridge;
  R1 from +y and T-gun's turret kept as cases. `DESIGN.md` §13l.2's target
  table, §13m's route rows, §18.

## Unreleased — 2026-10-22 — Stale text after L5a (the design partner's finding)

- `DESIGN.md` §5.2's magazine row and §13c's detonation row say the rule
  L5a built (#278, #283); `STATUS.md`'s next steps and next boundary;
  `.claude/agents/design-partner.md` reads §13m and §13n instead of §13k.

## Unreleased — 2026-10-22 — L5m, mass pass 2: the turret by its mount (#285)

- `js/data.js`: `turret.machineryMass` (new, 1975 kg per cell, 1750–2500,
  k = 3, approved as the plan's, #272 (2)): the OTO Melara 76/62 Super
  Rapid's 7.9 t over an M turret's four cells; `ROOMS.turret.cellMass` is
  `['structure.cellMass', 'turret.machineryMass']`, as the engine's. A turret
  cell is 4975 kg (was 14 800), σ 199 kg/m²: an M round passes both turret
  cells and exits at 468.5 m/s. R1 911 234.057 kg, R1c 1 225 234.057 kg,
  R1d 1 421 484.057 kg at T1. The heat capacity stays
  `thermal.coupledCrewed`.
- Scenarios (`DESIGN.md` §13n.4 M1, M2): `L0.turret.mount` (new) and twelve
  successors, literals hand-worked from the cell masses: `L3.r1.pinned.v2`,
  `L3.mass.props.v6`, `L3.r1c.props.v2`, `L4.readout.blueprint.v2`,
  `L3.recoil.v6`, `L3.thrust.v6`, `L3.rcs.turn.v6`, `L3.split.momentum.v6`,
  `L3.fragment.rules.v4`, `L3.destroyed.mass.v2`, `L3.shield.energy.v2`,
  `L4.hit.oblique.v3`; their originals withdrawn under #285; 100 scenarios
  re-recorded. `L4.cascade.v3`, `L4.route.missionKill.v2` and
  `L4.route.overheat.v2` fail on the change (their routes change) and wait
  on the designer.
- `tools/mutations.json`: `l5m.turret.crewed`, `l5m.turret.noMachinery`,
  `l5m.turret.mountValue`. `CONSTANTS.md` regenerated.

## Unreleased — 2026-10-22 — L5m planned (#285)

- `DECISIONS.md` #285: the owner chose L5m now at its corrected cost; the
  plan (`turret.machineryMass`, M1's 15 successors, M2). `DESIGN.md` §13m's
  turret row, §13n.4 M1–M2, §13n.5's cost table, §18. `tools/estimates/l5.mjs`
  section (9) prints R1c and R1d.

## Unreleased — 2026-10-22 — The mutation run on the L5a merge (#284)

- `mission0/mutations/2026-10-22-1048743.txt`: 193 mutations, 138 killed;
  one new survivor (`l4x.books.missingTerm`), a gap recorded in §17 item 35.

## Unreleased — 2026-10-22 — L5a merged (#283)

- `DECISIONS.md` #283: L5a merged (PR #73) with its fix round; answers to
  the fix round's engineer and re-review. `DESIGN.md` §13m's kinetic,
  magazine, destroyed and E2 rows proven L5a; §17 items 34, 36, 41
  closed; §18. `LEDGER.md`: costs and the ratio row (1.74).

## Unreleased — 2026-10-22 — L5a fix round (#282 (7))

- `js/battle.js` `lineOfAction`: a round at rest relative to the hull no
  longer divides by zero (its entries act at its own position); the fixed
  point throws if it has not converged after its 20 iterations.
- Successors `L2.magazine.types.v2` (a railgun-typed magazine holding turret
  rounds: the turret is not fed and not able), `L0.kinetic.chord.loss.v2`
  (a 16-cell column: chord 0.5 stops in cell 13, chord 0.05 exits at
  722.52 m/s, hand-worked) and `L4.books.angular.v2` (a target spinning at
  1 rad/s; every hit impulse on the round's line of action to 1e-9 of the
  edge); the three originals withdrawn under #282. The comment slips of K2,
  K3, R1d's shot-4 and B3 noted in the successors' headers.
- `mission0/mutations/`: the four `l5a.feed` / `l5a.line` mutants re-run.

## Unreleased — 2026-10-22 — Answers to L5a (#282)

- `DECISIONS.md` #282: answers to the L5a engineer, the blind checker and
  the reviewer of PR #73; a fix round (K4's feed case, K1's stopping
  cell, B2's projection); the reactor's immediate explosion stated in
  `DESIGN.md` §13l.1; §13n.1 (b) and §17 item 35 reworded; §18 row 282.
- `IDEAS.md`: the design partner's "reactor shield mass from the layout"
  (waiting, #281). `LEDGER.md`: the L5a sessions.

## Unreleased — 2026-10-22 — Mass pass 2 on the sources (#281)

- `DECISIONS.md` #281: the reactor keeps its mass (no 20 MWe source to
  split it); the turret becomes structure plus a 7.9 t mount in L5m (an M
  round now passes it whole); the missile bay by a flagged secondary
  source and the railgun unchanged in L5c; the pace study after L5m.
  `DESIGN.md` §13n, §17 item 30, §18; `tools/estimates/l5.mjs` section (9).

## Unreleased — 2026-10-22 — Mass pass 2 planned; the budget by price ∝ mass (#279, #280)

- `DECISIONS.md` #279 (the owner: #74's price with the type factor ∝ the
  M-cell mass until Mission 0 ends; the reactor's share open; sources
  for mass pass 2 through the design partner) and #280 (L5m between L5a
  and L5b; the mutation run on `29ce028` recorded). `DESIGN.md` §13n's
  pass list, budget and room-size rows, cost table; §17 item 30; §18.
- `STATUS.md`: the previous chat finished; L5a running.

## Unreleased — 2026-10-22 — L5a: the kinetic pass (#278)

- `js/rooms.js`: a passed cell loses chord / `kinetic.hitsToWreck`
  (#273 (b)); a magazine with rounds detonates when a round enters a
  standing cell of it at `magazine.detonationSpeed` or more (#273 (c), a
  `detonation` event, the explosion its child); a destroyed magazine cell
  no longer detonates it and its last cell loses the rounds as debris;
  `loadMagazine` takes a weapon type (`turret`, `railgun` slugs with no
  energy, `missile` a TODO that throws until L5c); a room that requires
  crew and has none is `unmanned` (no function, as if shut down; a new
  `unmanned` event); B2 the impulse at each entry's point on the round's
  line of action, B3 energy books (`world.ship.energy`), B4 `embedRound`
  (a stopped round joins its body), L4 the heat split by the energy each
  entry took.
- `js/battle.js`: a magazine's explosion no longer ends the battle
  (#274); `unmanned` in the able rule after `heat`, its parent the
  `crew-died` event; a turret fed only by a turret magazine; `lineHit`
  gives each entry its point, `strike` the line of action and B4;
  `battleEnergy`, `battleAngular`.
- `js/data.js`: `magazine.detonationSpeed` (400 m/s, 200–600, k = 0,
  approved as the plan's); `CONSTANTS.md` regenerated.
- `mission0/targets.js`: T-neck2 and T-gun2 (§17 item 36).
- `proto/battle.js`: the end by the kernel's rules (a magazine's
  explosion ends nothing by itself).
- Scenarios K1–K6 (`L0.kinetic.chord.loss`, `L2.magazine.detonation`,
  `L4.kill.v3`, `L2.magazine.types`, `L1.room.unmanned`,
  `L4.books.energy`, `L4.books.angular`) and eleven K8 successors; twelve
  scenarios withdrawn as superseded by #278; every other standing
  scenario re-recorded on the new data hash.
- `tools/mutations.json`: 19 `l5a.*` mutations; 15 stale ones
  re-anchored on the new text (same edits).

## Unreleased — 2026-10-22 — The L5 plan (#277, #278)

- `DECISIONS.md` #277 (the owner: O1–O5 as recommended, option A on the
  reactor's share, `tools/sweep.mjs` and `tools/play.mjs`) and #278 (the
  plan, *LD*); `DESIGN.md` §13n recorded with the two harnesses and the
  threshold table, §13m's rows marked planned L5a–e, §13's level table and
  status line, §18 rows 277 and 278; `STATUS.md`.

## Unreleased — 2026-10-22 — The L5 plan drafted

- `DESIGN.md` §13n: L5 in five passes (L5a the kinetic pass, L5b senses
  and the knowledge model, L5c weapons, L5d the helm and the enemy, L5e
  ship versus ship), rules, 26 proposed constants with ranges and
  exponents, estimates, 52 scenarios, process and cost, the checklist
  with the §13m rows, and the five items for the owner (§13n.7).
- `tools/estimates/l5.mjs`: the plan's estimate script (run-time overrides
  and `--plan` for the proposed constants); findings: an M round through
  one crewed cell enters a magazine at 333 m/s, through a hold at 705; a
  full magazine's blast (1.2 GJ) destroys R1 by pieces under #274; R1d
  dodges 6.5 m in a 900 m time of flight.
- `tools/lint-docs.mjs`: §13m ends at the next heading (it read §13n as
  §13m); the constants check skips §13n until L5 builds them (as §13k).
- `.claude/agents/lead-designer.md`: the lead designer's role file, which
  `CLAUDE.md` named and the repository lacked (the owner asked, 2026-10-22).
- `STATUS.md`: the new lead designer chat; the owner's block.

## Unreleased — 2026-10-22 — The scenario-hygiene round merged (#276)

- `DECISIONS.md` #276: answers to the engineer, the blind checker and the
  reviewer of PR #67; four wordings of `DESIGN.md` §13l.7 corrected (the
  F literals are kernel-read pins, shot-12's mechanism, the oblique r
  arithmetic and 19.37°, the csda step counts as pins); §13l.1 states the
  overlapping-field shares and the Disabled timer's start; §17 item 39
  closed with its residue; `LEDGER.md` costs and ratio.

## Unreleased — 2026-10-22 — Prevention after the weapons gap (#275)

- `tools/lint-docs.mjs` check 9: every room, fitting, weapon, round type
  and information topic of `DESIGN.md` §5–§7 and every room type of
  `js/data.js` must have a row in §13m. `CLAUDE.md`: the plan checklist
  lists the §13m rows a pass proves; a level exits only when no row still
  says "planned" for it. §13b: the documents audit reads §13m. `STATUS.md`:
  the owner's "Not built yet" line.

## Unreleased — 2026-10-22 — A magazine explosion is a blast (#274)

- `DECISIONS.md` #274 (the owner, amending #83): a magazine's explosion is
  a blast through its walls; the ship is destroyed only by the existing
  rules; built at L5's kinetic pass. `DESIGN.md` §13l.1's Destroyed row,
  §13m, §17 item 41, §18 rows 83 and 274.

## Unreleased — 2026-10-22 — The owner's five answers (#273)

- `CLAUDE.md`: the pre-lock rule reworded (a run before the lock for
  crashes and setup errors only; edits after it listed in the pull request;
  literals from the formula); `.claude/agents/engineer.md` follows.
- `DESIGN.md` §17 items 38, 41, 42: one battle is the same battle in cells
  (k = 1), detonation rule (c) and the chord-scaled passed-cell loss for the
  kinetic pass, surrender once Disabled; §18 rows 86 and 273.
## Unreleased — 2026-10-22 — The scenario-hygiene round built (#271, `m0/l4-hygiene`)

- Seventeen `.v2` successors of §13l.7's table, each keeping every check
  of its locked original: the key shot of each L4b route pinned (B1
  shot-12 hand-worked; B2 shot-19, B3 shot-4, R1 shot-4 and shot-46,
  R1d shot-10 kernel-read), the 600-step gaps and 0.5 as literals, B4
  with the target firing and its shutdown bounded by C_surv ΔT / P, the
  naive split's state, `battleTree` on every L4b battle, E8's time in
  the row's note, the 700 m/s round's literals, T2 and T3 relabelled,
  F₂ at chord 0.5, the crew floor at 0.9 and 1.6 cells and a destroyed
  cell not repaired, the 0.50 share, impulse books at 1e-12 × gross,
  `L3.beam.deposit`'s vent at a named 1e-11.
- New `L4.hit.oblique`: a line 20° off the axis (the second entry's
  chord 0.9774) and a line through holes only (no hit, 3 misses).
- The last row's survivors: `L0.kinetic.flatten.v2` (a round with s = r
  stops, `i1.rd.stopsOnEqual`) and `L3.control.bridge.v2` (a routed
  bridge draws from its backup, `f1.ctl.bridgeBackup`);
  `k1.beamPaths.neverCleared` is an equivalent mutant (the cache key
  carries every entry's areal density, 0 for a hole).
- Nineteen originals withdrawn under #271, frozen; `tools/mutate.js
  --only` report in `mission0/mutations/`.

## Unreleased — 2026-10-22 — The scenario-hygiene round planned (#271)

- `DESIGN.md` §13l.7: the L4 scenario audit's findings fixed by seventeen
  successors and one new scenario, under the plan gate;
  `tools/estimates/hygiene.mjs` prints every number; §17 item 39 due now,
  item 42 (what §13l.1 moved to L5 without an obligation); §18 row 271.

## Unreleased — 2026-10-22 — The four light audits before L5 answered (#270)

- `DECISIONS.md` #270: #267's cost-factor change withdrawn (#246 (4)
  stands); `LEDGER.md` gains the estimates-against-actuals table and the
  audits' costs; the plan checklist gains three lines; the engineer's pull
  request carries a "Pre-lock runs" section (`.claude/agents/engineer.md`).
- `DESIGN.md` §13l.1: the two-ship books row (the L4 fix round: momentum
  along the relative velocity, `L4.books.two`, `battle.openingRange`;
  B2–B4 and L4 as stated stand-ins) and the plate-heat stand-in (U3);
  §17 items 38–41 (tiers, scenario hygiene, process, plates and the
  passed cell); §18 rows 267 and 270.
- Five questions to the owner: the magazine's detonation rule, the passed
  cell's loss, the tier scale of a battle, the pre-lock rule's wording,
  surrender (#86) against Disabled (#255).

## Unreleased — 2026-10-22 — L4b merged; answers; the coverage table (#265–#269)

- `DESIGN.md` §13m: the coverage table, one row per design element with
  the level that proves or plans it (#268, #269); `tools/lint-docs.mjs`
  check 8 fails on an element in no plan.
## Unreleased — 2026-10-22 — L4 fix round: B1 and the opening range (#270 (9), #272)

- **`js/battle.js`** (finding B1 of `audit/2026-10-22-l4-physics.md`): a
  hit's momentum exchange runs along the round's velocity relative to the
  hull, in the body frame, for `shieldRound` and `fireRound` alike;
  `lineHit` still decides whether and where a round hits. Each call takes
  the round's world velocity relative to the hull at the point it books
  the hull at (the entry point for the field; the first entry with matter,
  a cell's centre or a plate's midpoint, for `fireRound`), so the `u0` it
  rebuilds is the round's own velocity and a passing round flies on with a
  consistent `u1`. The two-ship linear book closes at 5e-15 of gross (was
  2.2e-5). `battleMomentum`'s gross counts debris, left and spent.
- **`L4.books.two`** (B16): B1's battle, and the same with the target
  spinning (0.05 rad/s) and drifting across the line of fire (20 m/s);
  the two-ship book at 1e-9 × gross at every hit and at the end.
- **`battle.openingRange`** (T2, §17 item 35): 900 m, 500–2000, k = 1,
  approved (#270 (9)); `createBattle`'s default distance and the prototype's
  start separation read it. `CONSTANTS.md` regenerated; every passing
  scenario re-recorded on the new data hash.
- Mutations `l4x.dir.bodyFrame`, `l4x.books.missingTerm`, `l4x.range.k0`.

## Unreleased — 2026-10-22 — L4b merged; answers (#265–#267)

- `DESIGN.md` §13l.1: the turret aims at the first surviving cell's
  centre; a turret is fed by a magazine sharing a live wall; Disabled's
  parent is the first failing condition of the able rule. §17 items 33–36
  (the information law's level, kinetic damage by the one law, the loop
  rules L4b leaves uncovered, fittings for T-neck and T-gun). #267 lowers
  the cost factors to ×1.5 / ×2.5.

## Unreleased — 2026-10-22 — Mission 0 L4b: the battle loop (#253, #255, #258, #261, #262, #264)

- **`js/battle.js`** (§13l.1): two ship worlds in one frame, an attacker
  (R1d) at rest 900 m from a static target on a named bearing, bow-on. The
  target holds its heading on its RCS and never thrusts. Rounds are the
  kernel's own (`world.ship.rounds`, moved by `step`): after each step a
  round's segment is tested against the other hull; the cells its line
  crosses (with chords, at most 1; a corner touch left out) and the plates
  it crosses (`plateEntry`, σ / cos θ) make its path; `shieldRound` at the
  entry point, then `fireRound` at the speed relative to the hull (#242). A
  round that passes flies on with the velocity `fireRound` left it; one
  stopped is booked in `battle.spent`. The spinal beam hits along the bay's
  axis line, turned onto the aim by the attacker's RCS (time-optimal
  bang-bang, no constant). `cull` every step with both ships' bodies.
- **Able, Disabled, destroyed** (#255, #83): `weaponStates` (not destroyed,
  controlled, not shut down, active, joined to a reactor that can produce;
  a turret fed by its store or a magazine over a live wall); Disabled after
  `battle.disabledSeconds` with no able weapon, whatever the engine does;
  destroyed by a reactor's or magazine's explosion (checked first) or when
  the largest piece holds under **`battle.wreckFraction`** (new, 0.5,
  0.3–0.8, k = 0) of the undock mass. The end is an event (`disabled`,
  `destroyed`) in the ship's log.
- **Cascade tree** (#41): every event has an `id` and a `parent` (a root:
  a shot id, a beam id, `heat`, `launch`; or an earlier event).
  `events.js` `within`, `cascadeTree`, `treeLines`; rooms remember the
  events that took their state (`room.marks`). `cause` keeps its meaning.
- **Per-second log** (#129): one line per whole second per ship, an end
  line; its hash is the battle's (`battleHash`, E2).
  `node tools/battle.js <case>` prints a case's log and trees.
- Kernel: `shieldRound`'s old fallback (no generator body: the payment as
  heat, no impulse, #260 NB2); `fireRound` returns the round's world
  velocity before and after (`u0`, `u1`); `cull(world, others)`.
- **Targets** in `mission0/targets.js`: R1, R1c, R1d, T-neck, T-gun;
  `tools/estimates/l4.mjs` reads them (its output unchanged) and prints the
  loop's literals.
- **Scenarios B1–B15** locked in `e5c67dc` before their first run: 107
  PASS. E8 at T1: about 0.2–0.3 ms per step.
- **Prototype** (#264): the kernel's end rules, R1d by default, the end
  panel shows the cascade tree after the KIA list; `PROTO_VERSION` feel-5.
- 16 mutations for L4b's rules in `tools/mutations.json`.

## Unreleased — 2026-10-22 — The L4b plan amended (#261, #262)

- The owner chose R1d (R1c with its turret plated) as the pace lever and
  L4b's reference ship (#261). `DESIGN.md` §13l: R1d's numbers, B13–B15
  (the Disabled rule, the plate vent, the shield fallback), the citadel's
  five rounds against a deliberate shot, §17 cleaned of what L4a and
  physics pass 2 closed. `tools/estimates/l4.mjs` prints R1c and R1d and
  their routes through the kernel's own `pathAlong`.

## Unreleased — 2026-10-22 — Mission 0 L4a fix round (#258)

- **Plates burn by mass** (#258 (1)): a plate on a beam's path loses
  P F dt / (`matter.burnEnergyPerKg` × its mass) of its integrity per step,
  deposit first, then damage, like a cell; a 0.2 m plate (39 250 kg) under a
  5 MW beam that stops in it is a hole in step 1413 (23.55 s).
- **σ / cos θ** (#258 (2)): a line crossing a plate at θ to its normal meets
  σ / cos θ, capped at cos θ ≥ d / edge. New `plateEntry` (rooms.js) gives
  the entry with its `cos`; `pathAlong` takes the line's direction;
  `entryArealDensity` applies it; the prototype's paths pass their
  direction. Ricochet and tumble stay out.
- **The plate's heat capacity** (#258 (3)): its mass × `thermal.coupledArmour`
  / `armour.cellMass` (450 J/(kg·K)) joins its room's (`heat.addCapacity`)
  and leaves again, venting its heat above rest (`heat.ventCapacity`), when
  the plate is wrecked, ruined or its mount cell destroyed; a destroyed
  cell's vented share leaves the plates' capacity out. The note of
  `thermal.coupledArmour` names this consumer (data hash moved).
- **`shieldRound` on two bodies** (#258 (11), reviewer N5): each body that
  holds paying generators keeps its own books (its part of the round at its
  own hull velocity, in its own frame); one body is unchanged to the bit.
- **Prototype** (N6): `crossedCells` reports the cell where a line leaves
  the grid, so a plate on that segment joins the path.
- **`regress`** (N9): a recorded FAIL that is not withdrawn is printed as a
  FAIL line and counted.
- **Withdrawn** (#258): `L2.layout.invalid` (superseded by #253's crew rule;
  successor `L2.layout.invalid.v2`) and `L0.armour.plate` (specification
  error; successor `L0.armour.plate.v2`), each frozen with its record.
- **New scenarios** (lock `7399706`): `L0.armour.plate.v2`,
  `L0.beam.csda.sweep` (all 754 step-count changes, worst 1.0e-15),
  `L3.shield.bodies`; `tools/estimates/l4.mjs` prints their literals.
- **Mutations** (N8): 14 new (A5, the plate's chord, cos and cap, burn, heat
  capacity, mount room, the two-body books); 9 entries rewritten for the new
  code.

## Unreleased — 2026-10-22 — Mission 0 L4a: armour on walls, R1c and the kernel obligations (#253, #255–#257)

- **Armour plates** (`DESIGN.md` §13l.1, #255, #256): `addFitting(world,
  'armour', room, cell, side)` puts a steel plate of `armour.plateThickness`
  (new, 0.2 m, 0.01–0.4, k = 1, approved by the lead designer in #256) on a
  hull edge (the fitting rules hold) or a shared wall segment (any room, so
  the magazine's citadel; `layout.plateProblem`, rules `plate-wall` and
  `fitting-per-edge`). `pathAlong` and `plateBetween` put a plate on a path
  where the line crosses its segment, before the next cell; `fireRound`
  resists it with r = c × d × steel density × chord and damages it like a
  cell (`plate-damaged`, `plate-destroyed`); `fireBeam` deposits in it as
  heat in the mounting room (no burn: §13l.1 names none, asked in the PR).
  Its mass (d × 7850 × edge²) sits at the segment's midpoint on the body of
  its cell and leaves as debris when wrecked. No deck plates.
- **R1c** (§13l.2): R1 with the 8 plates around its magazine; 1 264 534.057
  kg, 1.2096 g; `tools/estimates/l4.mjs` prints its centre and inertia
  outside the kernel's plate code (A10's literals).
- **Crew capacity** in `validateShip` (rule `crew`, `layout.crewCapacity`);
  `quarters.crewPerCell` 3 → 4 (#253): R1 needs 20 and berths 24.
- **Kernel fixes** (§17 items 8, 12, 25, 27): blast capacity from remaining
  integrity (a room loses the absorbed fraction of each cell's remaining
  integrity); rounds in overlapping fields (summed strength and buffers,
  payment ∝ buffer × g, capped, solved once more; impulse by payment at each
  generator; the kernel no longer throws); `shieldRound`'s heat is the
  round's lost kinetic energy less the ship's gain, one rule with
  `fireRound`; `csdaRange`'s last step is cut where it lands on the stop
  energy (continuous: 2e-14 between neighbours at every sampled step-count
  change), and `csdaSteps` reports the step count.
- **Scenarios** (16, locked in `6feb7e0`, all PASS): A1 `L2.blast.integrity`,
  A2 `L2.shield.overlap.round`, A3 `L3.shield.energy`, A4
  `L0.beam.csda.continuous`, A5 `L1.reactor.meltdown.coupled`, A6
  `L4.readout.blueprint`, A7 `L4.crew.capacity`, A9 `L0.armour.plate`, A10
  `L3.r1c.props`; A8: `L3.control.bridge`, `L2.repair.crew`,
  `L3.destroyed.mass`, `L2.conduction.euler`, `L2.beam.chord`,
  `L3.beam.deposit`; and `L2.layout.invalid.v2`, the proposed successor of
  `L2.layout.invalid` (re-recorded FAIL: its hull blueprint has no quarters
  and now also fails the crew rule; the withdrawal is the lead designer's).
  A11 (`L4.disabled.rule`) is not built: Disabled is an L4b kernel rule.
- **Tools** (#257): `tools/mutate.js` rejects `--jobs 0` and negatives and
  its report says CHANGED is an output that moved, not coverage; the
  `recordHash` comment says it is the record as it stood when the hash was
  added; stale catalogue entries rewritten for the new code (the overlap
  survivor now mutates the overlap rule itself), 18 new mutations (every L4a
  rule, the `beamPaths` clearing, `csdaRange`'s material).
- **Prototype**: `proto/battle.js`'s paths cross plates; R1c is a layout of
  the loadout panel; `proto/smoke.mjs` waits two frames before its first tap
  (§17 item 28). The determinism hash moved with the crew counts.

## Unreleased — 2026-10-22 — The L4 plan (#252, #253)

- `DESIGN.md` §13l: L4 (ship versus a static target) planned in two passes,
  L4a (kernel obligations of §17) and L4b (the battle loop, Disabled and
  destroyed as kernel rules, the per-second log, the cascade tree, one
  target per capture route: R1, T-neck, T-hot, T-dry). EMP and surrender
  move to L5 (the owner, #252).
- `tools/estimates/l4.mjs`: the plan's estimates on a static R1 and the
  three target variants (#241's plan gate).
- Planned constants: `battle.wreckFraction` (new, 0.5), `armour.plateThickness`
  (new, 0.2 m), `quarters.crewPerCell` 3 → 4; not yet in `data.js` (the L4
  engineers enter them).
- After the owner's playtest of prototype v2 (#254, #255, #256): armour is a
  plate on any wall segment (walls only, not decks, in 2D); Disabled no
  longer needs the engine to be lost; R1c (R1 with a 0.2 m citadel) is the
  reference for the pace re-measure. `tools/estimates/pace.mjs` added.

## 0.9.1 — 2026-10-22 — Coverage by mutation as a tool (#246 (1)); the frozen record's hash

- **`tools/mutate.js`** (`DESIGN.md` §17 item 21): applies each mutation of
  `tools/mutations.json` (`{ id, rule, file, old, new }`) to a scratch copy
  under the system's temporary directory, never the working tree, and runs
  every scenario `regress` reports VERIFIED there. Classes: STALE (`old` not
  found exactly once), KILLED (a verdict not PASS, or a throw), CHANGED
  (every verdict PASS, a result differs from its record), SURVIVED, TIMEOUT.
  A changed data hash alone is not a kill. `--jobs`, `--timeout`, `--only`,
  `--rule`, `--out`, `--catalogue`, `--no-fail-fast`; it checks an
  unmutated baseline first. Exit code 0 unless the tool fails.
- **The catalogue**: the scenario audit's 86 surviving mutations (Appendix 2)
  with their `old` text recovered in full from today's source (seven
  rebuilt where the line changed or the audit's text stops before the
  change, two disambiguated; each says so in a `note`), the ten planned-but-unrun mutations of its Q6, and 27 for
  physics pass 2's rules (§13k.1) and S17–S21: 123 in all. The first run
  (`mission0/mutations/2026-10-22-b7c4290.txt`): 55 killed, 13 changed a
  recorded result, 55 survived, none stale.
- **`node tools/m0.js cov [--fail-fast]`**: the coverage run `mutate.js`
  uses; nothing recorded, one `COV {...}` line per scenario (verdict,
  results as recorded, data hash as recorded). `L0.determinism` (a fixed
  port) runs last, under a lock shared by parallel copies.
- **The frozen record's own hash** (§17 item 29): every `withdrawn.json`
  entry carries `recordHash`, the hash of its record's stable JSON;
  `verify` and `regress` compare it for frozen and retired entries, so a
  later re-record cannot pass. The records are unchanged.

## 0.9.0 — 2026-10-22 — Physics pass 2: one law, closed books, tiers, determinism (#240, #243)

- **One law for everything that resists** (`DESIGN.md` §13k.1): beam burn by
  the cell's mass (`matter.burnEnergyPerKg`, 3000 J/kg), blast by the cell's
  mass (`matter.blastPerKg`, 100 J/kg; the hold's blast factor is gone), heat
  capacity by the room type's thermally coupled mass (`thermal.coupled*`,
  named in `ROOMS` like the cell mass), repair by mass (`repair.massRate`,
  200 kg/s).
- **Books close at the target**: a round's impulse goes to the body holding
  the hit cells, at those cells, and the energy the system lost is heat in
  the rooms in proportion to the momentum each took; the shield's removed
  momentum pushes the generator's ship.
- **Tiers**: `shield.buffer` in joules (k = 3),
  engine and beam bay cells as structure + machinery
  (`engine.machineryMass` k = 2, `beambay.machineryMass` k = 1), `rcs.mass`
  k = 2, the reactor cell 150 t. R1 at T1: 950.5 t, 1.61 g, a 90° turn in
  3.80 s.
- **Determinism of sin, cos, exp, log and pow**: `js/util.js` has ports of
  fdlibm's sin and cos (the y-form and the three reduction refinements:
  within 1 ulp, deterministic), exp and log (equal to V8's on the reviewer's 2.1 M arguments), an
  integer power and a deterministic `pow`; `scaled()` and `body.js` use
  them. `tools/determinism.mjs` hashes a fixed 60 s **beam-only** duel in
  Node (and in Chromium with `--chromium`); `proto/smoke.mjs` checks the
  hashes MATCH. The hash does not cover `fireRound` or `shieldRound`, and
  the kernel still calls `Math.hypot` and `Math.cbrt` (the prototype
  `Math.atan2`): ported if a phone's hash differs (`DESIGN.md` §17 item 23).
  `proto/detmath.js` is removed.
- The SCRAM restart (`reactor.restartTime`, 60 s, automatic); the chord of a
  path entry; a round launched at `world.t + at`; `cull()` and
  `battle.cullDistance`, `battle.disabledSeconds` (read by the prototype);
  the beam path cache cleared when a cell is destroyed; `csdaRange` takes its
  material (water's Z/A and I in `FIXED`); an overheated beam bay reports
  `beam-stopped` with cause `heat`; the ledger header reworded (E-F10).
- Removed: `thermal.heatCapacityPerCell`, `armour.burnEnergy`,
  `armour.blastResistance`, `room.blastResistance`, `hold.blastFactor`,
  `repair.rate`, `shield.bufferSeconds`, `cellMass.engine`,
  `cellMass.beamBay`.
- Scenarios: S1–S22 (§13k.4) and 39 successors, locked at `4f39a0e`; 41
  scenarios withdrawn as superseded by #240 (`mission0/withdrawn.json`).
- **The engineer's twelve withdrawals** (#248; specification errors found at
  the first canonical run): `L1.room.thresholds.v2`, `L1.engine.thrust.v2`,
  `L1.reactor.power.v2`, `L1.shield.generator.v2`, `L1.heat.coupled`,
  `L1.repair.mass`, `L1.turret.timing`, `L2.heatsink.buffer.v2`,
  `L2.heatsink.loss.v2`, `L2.blast.walls.v2`, `L2.heat.chain.v3`,
  `L3.cull`; their twelve successors, locked at `c9224e2`:
  `L1.room.thresholds.v3`, `L1.engine.thrust.v3`, `L1.reactor.power.v3`,
  `L1.shield.generator.v3`, `L1.heat.coupled.v2`, `L1.repair.mass.v2`,
  `L1.turret.timing.v2`, `L2.heatsink.buffer.v3`, `L2.heatsink.loss.v3`,
  `L2.blast.walls.v3`, `L2.heat.chain.v4`, `L3.cull.v2`.
- `tools/estimates/pass2.mjs` runs on the new data (the removed constants as
  literals) and prints R1 (section 8). The prototype is `feel-4`.
- **Beam depth tier-invariant for electronic stopping only** (#248, #249;
  fix round 1): `beam.gradient` back to k = 0 (its T1 meaning); `beamEnergy`
  solves, by bisection on `csdaRange` to 1e-12 and cached per N on the
  world, the energy whose CSDA range in iron, in armour cells of the tier,
  equals the T1 bay's (N = 8: 400 MeV at T1, 1383 MeV at T6; the first cell
  takes 43 % at T1 and 88 % at T6, reported). `L0.beam.tier` withdrawn
  (#248), `L0.beam.burn.v4` and `L1.beambay.length.v2` superseded (#249);
  successors `L0.beam.tier.v2`, `L0.beam.burn.v5`,
  `L1.beambay.length.v3`. A withdrawn entry marked `frozen` keeps its
  withdrawal-time record (#245 guard (2)).
- **Every withdrawn record frozen** (#250; fix round 2): the 41 scenarios
  superseded by #240 get back their PASS records of `f68185a` (re-recorded
  FAIL in error, reviewer finding 1); the other 44 withdrawn entries are
  frozen as they stand. `run`, `verify` and `regress` never re-run a
  withdrawn scenario; `checkWithdrawn` refuses an unfrozen one. The twelve
  #248 entries cite #248.

## 0.8.5 — 2026-10-22 — E1 amended (#245), prevention (#246), the design partner (#247)

- `.claude/agents/design-partner.md`: the owner's sounding board, read-only,
  writing only `IDEAS.md`; `DESIGN.md` §13b and `CLAUDE.md` name the fifth
  role; `STATUS.md` says when the lead designer's chat is replaced.

- `DESIGN.md` §13 E1: withdrawal by a numbered decision whatever the
  recorded verdict, the withdrawal-time record frozen, the retired state;
  three guards against withdrawing a failing kernel.
- `tools/lint-docs.mjs` (decision and section references, constants named
  in DESIGN, §18 coverage, CONSTANTS.md, withdrawn.json, the supersedes
  rule); run by the nightly regression. §18 rows 242–246; §17 item 21
  (`tools/mutate.js`); `STATUS.md` opens with the owner's five lines.

## 0.8.4 — 2026-10-22 — Documents consolidated (#241 (5), #242)

- New `HISTORY.md`: the plans and measured results of each Mission 0 pass,
  moved verbatim from `DESIGN.md` (§13c.2–4, §13d.2–4, §13e.2–3, §13f.3–5,
  §13g, §13h, §13i.2, §13i.4–5, §13j.1, §13j.3, §13j.5–6, §15, §16); each
  moved section is one pointer line in `DESIGN.md`.
- New `CONSTANTS.md`, generated from `js/data.js` by `tools/constants.mjs`:
  the only table of values and ranges. `README.md` no longer copies it;
  `DESIGN.md` §5.1 points to it.
- New `LEDGER.md`: the sessions table, per-level totals and usage-limit
  note, moved verbatim from `STATUS.md`.
- `DESIGN.md`: the stale text the documents audit found is corrected where
  it stands (status line, names, room sizes, decapitation, crew deaths,
  who approves a wave, the accepted-risk line, the reactor-beside-magazine
  example, shield buffers, the cell-matter row); the rules that lived only
  in a decision row or the kernel are written into the rules tables;
  §15 is three lines; §17 is the open obligations; new §18 is the table of
  the decisions in force.
- `IDEAS.md`: the blast-resistance row cites #232 and §13i.1; a row for the
  tractor beam and mines (#20).
- Rules restated or decided in the pass: the kinetic velocity rule (the
  relative velocity counts, #242); the gradient caveat and the
  numerical-method constants in §13i.1; the helm's orders mapped to #38's
  slots in §8; `proto/config.js` holds prototype settings (§13j.2).
- `tools/constants.mjs` prints full precision (reviewer N8); README's
  status line updated.
- No code, no number changed.

## 0.8.3 — 2026-10-22 — Physics pass 2 planned (#243)

- `DESIGN.md` §13k and `tools/estimates/pass2.mjs`: one law for burn,
  blast, heat capacity and repair; closed books at the target and at the
  shield; tier-invariant beam depth and an energy buffer; machinery masses
  split from structure; a deterministic kernel; the SCRAM restart; the
  chord rule; culling. Sixteen scenarios with estimates.

## 0.8.2 — 2026-10-22 — The audits' answers (#240, #241)

- #240 (the owner): one law for everything that resists, heat by the
  thermally coupled mass; the shield a recorded exception to #228; no dice
  amended for the enemy's decisions; tier-invariant depths and an energy
  buffer; "ship lengths" dropped; blast by mass; a 15 USD cap per audit
  session. `DESIGN.md` §2, §4, §12, §13b.
- #241 (process): the plan gate (estimate script, checklist), explicit
  session templates, checker only when kernel physics changes, documents
  split (`HISTORY.md`, `LEDGER.md`, no constants copy in `README.md`);
  `CLAUDE.md` updated; `.claude/agents/auditor.md` added.

## 0.8.1 — 2026-10-21 — Prototype v2 merged (PR #51, #239)

- PR #51 merged through the lead designer's branch after the reviewer
  found no blocking finding; `DESIGN.md` §13j corrected (the 0.24 g unit
  error, the enemy's bow-on dodge) and §13j.6 added with the measure
  (bow-on hold 900: 7.1 s; broadside: 9–108 s) and the sin/cos finding;
  answers to the engineer and reviewer in #239.

## 0.8.0 — 2026-10-21 — Prototype v2: a helm and physical misses (#237)

- Data (`DESIGN.md` §13j.2, #236 (1)): `armour.kineticResistance`,
  `beam.focusRange` and `FIXED.beamWaistPerHalfCell` removed from
  `js/data.js`; the superseded pure functions (`penetrate`, `burnThrough`,
  `beamDeliveredFraction`) stay. No other kernel change.
- Mission 0: the five withdrawn L0 scenarios that read them
  (`L0.kinetic.penetration`, `.v2`, `L0.beam.falloff`, `L0.beam.burn`,
  `.v2`) are **retired** in `mission0/withdrawn.json` (`retired: true`,
  `retiredDecision` #237, `retiredReason` naming the removed constant);
  their files, locks and last records are unchanged. `tools/m0.js`:
  `regress` and `verify` list a retired scenario as RETIRED without running
  it and print the counts (VERIFIED + WITHDRAWN + RETIRED); `run` skips it
  so its record stays; the ledger marks it.
- Records: the data hash covers `PARAMS` and `FIXED`, so the 86 scenarios
  `regress` runs were re-run canonically on the new data; verdicts, rows,
  `run()` and criterion hashes are unchanged (only the data hash and the
  code field moved). `MISSION0.md` regenerated.
- Prototype v2 (`proto/`, `PROTO_VERSION` 'feel-3'; §13j.2): rounds and
  beams on the path model's kernel (`shieldRound` at the hull entry point,
  `fireRound` and `fireBeam` along the cells the line crosses, found by a
  grid traversal in the target's body frame); a STAND-IN autopilot flying
  three standing orders (range close 600 / hold 900 / open 1500 m, facing
  bow-on / broadside, dodge off / on, in #40's order) with the engine and
  the RCS fittings; rounds launched by the kernel's `shot` at the shooter's
  velocity plus the muzzle velocity toward a lead point, tested each step
  against the target's hull, culled 3 km from the midpoint; the spinal beam
  along the ship's axis, possibly a miss. v1's Gaussian beam, `burnThrough`
  and bow-armour stand-ins are gone. `proto/detmath.js` (STAND-IN): the
  same `Math.sin` and `Math.cos` in every engine (Node's V8 and Chromium
  141 differ in the last bit for about 3 % of arguments), so a phone export
  replays MATCH. `proto/measure.mjs` runs seeds 1–10 at each range order.
- The page: a world strip above v1's head-up grids (both ships to scale
  with heading and velocity, rounds in flight, beams landing or missing,
  the range, hits and misses); on each grid an arrow where rounds entered
  and the beam where it lands; the loadout panel loses bow armour and gains
  the range, facing and dodge orders and the seed (shown, +1 at every
  Restart, editable, in the battle's corner and the export); the stand-ins
  list names the enemy's script and every preset's throttle (#233).
- Export and replay as v1 with the seed and the orders (and each side's
  shots, hits and misses in the end); `replay.mjs --every` prints the helm;
  `smoke.mjs` checks the seed on the panel, in the battle and in both
  exports, and seed + 1 after Restart; `proto/README.md` rewritten (run,
  loadout, play, the physics of the orders, the view, stand-ins, measure).

## 0.7.2 — 2026-10-21 — Prototype v2 planned (#237)

- `DESIGN.md` §13j: the plan for prototype v2 (a helm as three standing
  orders run by a stand-in autopilot, physical misses from time of flight
  and lead, the path model's `fireRound` and `fireBeam` along the cells a
  line crosses, a seed per Restart, the three superseded constants removed
  and the five withdrawn L0 scenarios that read them retired), with the
  kernel's own numbers (R1 850 t at 1.80 g; 5 / 11 / 31 m of dodge over
  the time of flight at 600 / 900 / 1500 m; R1's magazine open from three
  sides). Documentation only.
- `DESIGN.md` §13b, #238: independent read-only audits (documents,
  process, physics as one system, scenario quality) at fixed milestones;
  the first three started today on `audit/docs`, `audit/physics`,
  `audit/scenarios`.

## 0.7.1 — 2026-10-21 — The path model merged (PR #48, #236)

- PR #48 merged after the physics checker and the reviewer found no
  blocking finding; `DESIGN.md` §13i text corrected (axis rule, the armour
  sentence, N = 2 burn times); findings for the next kernel pass in #236.

## 0.7.0 — 2026-10-21 — Mission 0: the path model (#228–#235)

- Data (§13i.2, #235): new `matter.kineticResistance` 1545.4 m/s
  (750–3125, k=0); cell masses by room type (`structure.cellMass` 3 t,
  structure only; new `cellMass.crewed` 14.8 t, `.reactor` 125 t, `.engine`
  6.1 t, `.beamBay` 5.5 t, `.shieldGenerator` and `.railgun` 10 t,
  `armour.cellMass` 10 t; k=3) named by each room in `ROOMS`;
  `beam.gradient` 10 MeV/m in J/m (5–20 MeV/m, k=0); real FIXED constants
  for a proton in iron (CODATA, PDG) in SI; `room.kineticResistance`
  removed. The beam bay is a spinal room (`spinal: { min: 2 }`, placement
  axis and bow clear), its footprint its default length.
  `armour.kineticResistance`, `beam.focusRange` and
  `FIXED.beamWaistPerHalfCell` are marked superseded and kept only because
  `proto/` v1 and the withdrawn scenarios read them, until prototype v2
  (the lead designer's decision on this pass; no kernel use).
- Kernel (§13i.1): `js/damage.js` gains the pure functions
  `penetrateRound` (the round rule: the round takes what each cell takes,
  flattens at constant volume, is wrecked at f = 1; exact momentum books),
  `betheStopping`, `csdaRange` and `beamDeposit` (Bethe without shell or
  density correction, nuclear interactions leaving their energy in place;
  RK4 in areal density); `penetrate`, `burnThrough` and
  `beamDeliveredFraction` stay for the withdrawn scenarios and `proto/`.
  `js/rooms.js`: a cell's mass by its type, `cellArealDensity` (σ, 0 for a
  hole), `roundStrength`, `fireRound` on the round rule with r = c σ,
  `beamEnergy` (gradient × N × edge) and `fireBeam` (per step: P·F_i as heat
  in each cell's room, P·F_i·dt / `armour.burnEnergy` as integrity loss,
  channel `thermal`; fractions recomputed when a path cell becomes a hole);
  `addRoom` takes a spinal room's `length`. `js/heat.js`: `depositHeat`.
  `js/layout.js`: `roomFootprint`; validation rules `axis` (a spinal room
  lies along x and its rows hold the ship's centre line, the mean row of the
  cells of rooms joined to a bridge) and `bow` (no cell ahead of its bow
  face).
- Tools: `tools/m0.js` checks that a withdrawn scenario keeps the verdict it
  was recorded with (a withdrawn scenario on a kept superseded function can
  still pass); `tools/perf.js` adds each R1's beam on the other's middle row.
- Scenarios P1–P10 (§13i.4), written and committed unlocked: P1
  `L0.kinetic.penetration.v3`, P2 `L0.kinetic.overpen.v2`, P3
  `L0.kinetic.wreck`, P4 `L1.kinetic.damage.v2`, P5 `L3.kinetic.hole.v2`, P6
  `L0.beam.depth`, P7 `L0.beam.range`, P8 `L0.beam.burn.v3`, P9
  `L1.beambay.length`, P10 `L3.mass.props.v4`, `L3.thrust.v4`,
  `L3.rcs.turn.v4`, `L3.recoil.v4`, `L3.split.momentum.v4` and
  `L3.fragment.rules.v2` (v3 / v1 identical except the masses of §13i.2).
- Locked at `aa186d9` before the first canonical run; all 15 PASS. Every
  record re-recorded on the new data (the first canonical run was stopped
  and repeated after three notes in `data.js` were reworded, which moves the
  data hash; criteria and locks unchanged). Withdrawn as superseded (14):
  by #230 `L0.kinetic.penetration`, `.v2`, `L0.kinetic.overpen`,
  `L0.beam.falloff`, `L0.beam.burn`, `.v2`; by #232 `L1.kinetic.damage`,
  `L3.kinetic.hole`; by #234 the five L3 v3 mass scenarios and
  `L3.fragment.rules`. `regress`: 57 VERIFIED + 34 WITHDRAWN.
- `DESIGN.md` §16: the path model's measured block. `MISSION0.md`
  regenerated.

## 0.6.6 — 2026-10-21 — The path model revised (#234, #235)

- The beam bay becomes a spinal accelerator whose length sets its particle
  energy; room types take their real cell mass at the low end (the owner,
  #234). `DESIGN.md` §13i rewritten (#235): one kinetic constant, a mass
  table with sources, scenarios P1–P10; §5 and §6 rows updated.

## 0.6.5 — 2026-10-21 — The feel prototype merged (PR #42); protection is mass (#232, #233)

- `proto/` merged after a light review with no blocking finding (#233).
- The owner's decision #232: a cell resists in proportion to its mass on
  the path; room types get their real cell mass (§13i to be revised).

## 0.6.4 — 2026-10-21 — The path model planned (#230, #231)

- The owner's decisions on the path model (#230): rounds are damaged by
  what they hit and flatten; tumble and sloped armour wait in `IDEAS.md`;
  the beam does not fall off at battle range; for the beam only mass counts.
- `DESIGN.md` §13i: the path model's build pass (rules, constants,
  estimates, scenarios P1–P8, withdrawals); §2 and §6 updated.

## 0.6.3 — 2026-10-21 — The beam becomes a neutral particle beam (#229)

- `DESIGN.md` §6: the beam is a neutral particle beam that reaches rooms
  behind armour (the owner, #229); its numbers wait for the path model.
- `IDEAS.md`: the plasma toroid gun (MARAUDER), waiting.
- `DESIGN.md` §13h: the second 13h.4 renumbered 13h.5.

## 0.6.2 — 2026-10-21 — The prototype published; the symmetric principle (#227, #228)

- `DESIGN.md` §2: every interaction is symmetric (the owner, #228).
- `DESIGN.md` §13h.4: what the first prototype build showed; loadout panel
  and Export / replay.
## proto feel-2b — 2026-10-21 — Export and replay for the feel prototype (#217, #224), throwaway

- `proto/`: an **Export** button in the top bar and on the end panel. It
  pauses the battle and copies one line of JSON (version, seed, loadout,
  the player's inputs by step, where the battle stands, the event count and
  hash, a per-room summary of first hot, overheated and wrecked), with a
  selectable text box when the phone's clipboard refuses. About 10 kB for a
  15-minute battle with one input a second.
- `proto/replay.mjs` (new): rebuilds the battle headless from an export,
  prints the full event log and each room's temperature peak (`--every S`:
  temperature, integrity and shields every S seconds), and checks the end
  and the event hash: MATCH or MISMATCH. `proto/export.js` (new) holds the
  export and its hash for both.
- `proto/smoke.mjs` changes target, switches presets, exports mid-battle
  and at the end, and requires MATCH from `replay.mjs` on both. No change
  to `js/`, `tools/`, `mission0/` or `data.js`.

## proto feel-2a — 2026-10-21 — The feel prototype's loadout panel (#217, #223), throwaway

- `proto/`: a loadout panel before each battle and from Restart, applied to
  both ships alike and shown in the corner during the battle: magazine (HE
  full, AP full, HE half, AP quarter, by mass), bow armour (none, 1, 2
  cells; a `STAND-IN` by L0's penetration and burn rules), layout (R1 or
  R1-B, checked with the kernel's `validateShip`), shield budget (10, 5,
  20 MW) and hits to wreck (3, 5) as run-time overrides within their
  approved ranges, turrets on or off. Defaults give the same event hash as
  before.
- `proto/measure.mjs` takes the loadout as flags and prints the event hash
  and what destroyed a ship; `proto/smoke.mjs` also drives the panel and
  saves `proto/screens/loadout.png`.
- `main` merged in (the mass pass, #225, #226). No change to `js/`,
  `tools/`, `mission0/` or `data.js`.

## proto feel-1 — 2026-10-21 — The feel prototype (#217, #224), throwaway

- `proto/` (new, DESIGN.md §13h): a canvas page of two R1s at 900 m on the
  unchanged L3 kernel and the mass pass's masses: tap an enemy room to
  target it, presets Fire / Cool / Evade, time ×1/×2/×4, a seeded scripted
  enemy, the end at Disabled (#82) or destruction. Every kernel import uses
  `../js/`; prototype settings live in `proto/config.js`; every stand-in is
  marked `STAND-IN` in code and listed on screen. Never a Mission 0 result.
- `proto/measure.mjs`: one R1-versus-R1 battle headless, both sides
  scripted. `proto/smoke.mjs`: Playwright at 844 × 390, zero console errors.
- No change to `js/`, `tools/`, `mission0/` or `data.js`.

## 0.6.1 — 2026-10-21 — The mass pass merged; answers (#225, #226)

- The mass pass (PR #40, head `24435a7`) merged into `main` after review
  (#225); `regress`: 56 VERIFIED + 20 WITHDRAWN.
- `DESIGN.md` §13f: L3's mass-dependent numbers marked superseded by §13g.
- The prototype is hosted as a private claude.ai page (#226, the owner).

## 0.6.0 — 2026-10-21 — Mission 0: the mass pass, ships of real density (#221, #222)

- Data (#221, the owner; ranges by the lead designer): new
  `structure.cellMass` 1e4 kg per M cell at T1 (3e3–3e4 kg, k=3);
  `thermal.specificHeat` removed; `engine.thrust` 2 → 15 MN (4–60 MN, k=2);
  `rcs.force` 100 kN → 1 MN (0.3–5 MN, k=2); all approved.
  `ROOMS.shieldGenerator` is placed `anywhere` instead of carrying the
  `fittings` override (#219 (1), #222 (2)).
- Kernel (§13g.1): a cell's mass is `structure.cellMass` (scaled, k=3); a
  heat sink cell adds (`heatsink.capacityFactor` − 1) × C /
  `FIXED.waterSpecificHeat`; heat capacity unchanged. `readout` works on a
  blueprint before `enableShip` (#222 (4)); the `fittings` override is gone
  from `js/layout.js` and `js/rooms.js`. `tools/perf.js` takes the
  magazine's and the turret's loads from `data.js` (#222 (3)).
- `tools/m0.js`: a dependency on a withdrawn scenario, and the check of
  `mission0/withdrawn.json`, follow a chain of successors to the one that
  stands (v1 → v2 → v3, #188, #221).
- `tools/m0.js`: a case whose `expected()` throws is recorded as a FAIL
  with the error, like a `run()` that throws (#212 (7)): the superseded L3
  formulas name the removed `thermal.specificHeat`.
- Every L0–L3 record re-recorded for the new data. Results moved only in
  `L1.engine.thrust` and `L1.room.restart` (`engine.thrust` 2 → 15 MN, both
  still PASS) and in L3: the five v2 scenarios whose formulas compute mass
  from `thermal.specificHeat` (`L3.mass.props.v2` FAIL, its four dependants
  BLOCKED until their v3 successors pass), their v1 predecessors, and
  `L3.fragment.scram` (thrust and momentum residues; still PASS).
  `L3.validation.v2` and `L3.kinetic.hole` unchanged.
- `mission0/scenarios/L3/`: five v3 successors (`L3.mass.props.v3`,
  `L3.thrust.v3`, `L3.rcs.turn.v3`, `L3.recoil.v3`,
  `L3.split.momentum.v3`), each its v2 with only the mass rule changed, and
  the new `L3.fragment.rules` (#222 (1)); locked before their first
  canonical run: all six PASS. The five v2s are withdrawn as superseded by
  #221 (`mission0/withdrawn.json`); every L3 scenario re-run canonically
  through the new successors. `MISSION0.md` regenerated.
- `DESIGN.md` §16: the measured mass-pass block. `regress`: 56 VERIFIED +
  20 WITHDRAWN; `tools/perf.js` 0.05–0.16 ms per step.
## 0.5.2 — 2026-10-21 — The prototype plan and the not-fun ladder (#223, #224)

- `DESIGN.md` §2: when play is not fun, tune constants, then combine the
  existing physics, only then change a law (the owner).
- `DESIGN.md` §13h: the feel prototype's scope, stand-ins and estimate.

## 0.5.1 — 2026-10-21 — L3 merged; reviewer answers (#222)

- L3 (PR #35, head `f8d31c6`) merged into `main` after the physics checker
  (#220) and the reviewer (#222) reported no blocking finding; `regress`:
  55 VERIFIED + 15 WITHDRAWN.
- `DESIGN.md` §13f.1: control needs a working bridge; §13g: the mass pass
  also carries `L3.fragment.rules` and three small fixes.

## 0.5.0 — 2026-10-21 — Mission 0 L3: the minimal ship (#208–#222)

- Data (#210, approved by the lead designer): `thermal.specificHeat`
  600 J/(kg·K) (400–900, k=0); `FIXED.waterSpecificHeat` 4186 J/(kg·K) and
  `FIXED.standardGravity` 9.80665 m/s²; `engine.thrust` re-tuned 8 → 2 MN
  (range re-approved 0.5–8 MN, k=2; #203 A); new `rcs.force` 100 kN
  (30–500 kN, k=2), `rcs.powerDraw` 200 kW (50 kW–1 MW, k=2), `rcs.mass`
  200 kg (50–1000 kg, k=3) and `radiator.mass` 250 kg (100–1000 kg, k=2).
  `ROOMS.shieldGenerator.fittings: true`: the engineer's reading of R1
  (§13f.2 puts six radiators on it, §13f.1 lists it as inside); a question
  in the L3 pull request. Every earlier record re-recorded for the new data
  hash (see the pull request for what moved).
- Kernel (§13f.1, #208): new `js/body.js` (mass properties from cells as
  squares plus point masses, the rigid body, semi-implicit Euler, impulses,
  the velocity field kept when a part leaves, momentum kept when rounds move
  inside, momentum books). `js/rooms.js`: `addFitting` (radiators and RCS on
  open edges, with mass), `enableShip`, engine thrust at the exhaust face,
  RCS forces through their host room (power, control, heat), recoil
  (−m u d at the turret, rounds in flight), turrets that hold fire, debris
  for every mass that leaves (a destroyed cell takes its heat with it,
  #214 (9)), fragments with the parent's velocity field, control over live
  walls with SCRAM on its loss (turrets, shields and beams now also stop
  without control), and the shipyard `readout` (#58). A destroyed cell
  resists no round (#212 (5)). `js/graph.js`: structure components, control
  reach, live walls only within a room's working fragment. `js/layout.js`:
  fitting rules and `validateShip` (#57). No earlier record moved.
- `tools/perf.js`: milliseconds per step for two R1s at T1 and T6 (E8, #213).
- `mission0/scenarios/L3/`: the nine scenarios of §13f.3 on R1, locked
  before their first canonical run: 65 of 68 cases PASS; 1 PASS, 2 FAIL,
  6 BLOCKED (see §16 and the pull request: two predicted specification
  differences and two float-scale flaws in the engineer's invariants).
  `DESIGN.md` §16 gets the measured L3 block; `MISSION0.md` regenerated.
- Fixes of #219 and #220: `js/body.js` and `fixtureImpulse` also book
  the gross angular impulse (`external.Hgross`, Σ |q × F dt|); no record
  moved. Seven v2 scenarios in `mission0/scenarios/L3/*-v2.js`: heat books
  within max(1e-9 × flow, 1e-10 × the room's starting heat), angular books
  within 1e-9 × net + 1e-12 × gross (#220 (1)); `L3.rcs.turn.v2` also
  asserts the discrete turn (122 + 122 firing steps, heading 1.576373 rad)
  and `L3.thrust.v2` (a) the discrete position (#220 (2)). Locked before
  their first canonical run: all seven PASS. The seven v1 scenarios are
  withdrawn under #188 (`mission0/withdrawn.json`, decision #219); the five
  recorded BLOCKED were re-run unchanged and hold FAIL with the same rows.
  `L3.fragment.scram` re-run unchanged: PASS. `DESIGN.md` §16 gets the v2
  results; `MISSION0.md` regenerated.
## 0.4.5 — 2026-10-21 — Ships of real density (#221)

- `DESIGN.md` §13g: the mass pass: 10 t per cell (the owner), heat
  capacity unchanged, thrust 15 MN and RCS 1 MN, estimates and the
  scenarios it supersedes.

## 0.4.4 — 2026-10-21 — Answers to the L3 physics checker (#220)

- `DESIGN.md` §13f: angular books 1e-9 × net + 1e-12 × gross; two v2
  files assert the discrete turn and the discrete position; a feed keeps
  angular momentum.

## 0.4.3 — 2026-10-21 — Answers to the L3 engineer (#219)

- `DESIGN.md` §5.2, §13f.1: the shield generator may carry fittings.
- `DESIGN.md` §13f.3: v2 successors for seven L3 scenarios (two criteria of
  the lead designer, the engineer's invariant scales).

## 0.4.2 — 2026-10-21 — A feel prototype after L3; fewer docs PRs (#217, #218)

- `CLAUDE.md`, `DESIGN.md` §15: after L3, a rough throwaway feel prototype
  in `proto/` for the owner's phone (the owner).
- Process: one documentation pull request per working block.

## 0.4.1 — 2026-10-21 — The D pass merged; reviewer answers (#216)

- The D pass (PR #24, head `4b754b1`) merged into `main` after the physics
  checker (#214) and the reviewer (#216) reported no blocking finding;
  `regress`: 46 VERIFIED + 8 WITHDRAWN.
- `DESIGN.md`: §13e.1 states the interim (a destroyed cell still resists
  until L3); §13f row 6 gets two cases for #207; §13d.1 notes the blast
  capacity of damaged cells from L4; §16's salvo wording corrected (#214).

## 0.4.0 — 2026-10-21 — Mission 0 D pass: real round sizes, partial damage, repair (#203 D, #206, #207)

- Data (#206, approved by the lead designer): `kinetic.roundMass` 6 kg
  (2–20, k=3), `armour.kineticResistance` 2.7e5 × 12^(1/3) (3e5–1.25e6),
  `room.kineticResistance` 6.75e4 × 12^(1/3) (7e4–3.2e5), both computed
  exactly in `data.js`; `magazine.capacity` 900 kg (300–3000),
  `ammo.wallFeed` 0.72 kg/(s·m) (0.24–3.6), `kinetic.chargeEnergy` 6 MJ
  (2–20 MJ); new `kinetic.hitsToWreck` 3 (1–8, k=0).
  `shield.kineticStop` stays derived from the S round (#171).
- `js/rooms.js`, `js/events.js`: partial kinetic damage (#206). `fireRound`
  sends a round along a path of room cells: each cell resists
  `room.kineticResistance` (L0's `penetrate`), a passed cell loses
  1 / `hitsToWreck` of its integrity, the cell it stops in (s_left / R) /
  `hitsToWreck`; a cell is destroyed at 0 (a residue of 1e-12 or less
  counts as 0). A damaged cell raises `cell-damaged` (channel, cell,
  integrity). Crew die in proportion to integrity lost: cumulative deaths
  floor(crew × (cells − Σ integrity) / cells), never more than the crew,
  never undone (a quotient within 1e-9 of a whole number counts as it);
  with whole cells destroyed this is L1's rule. Repair restores damaged
  cells only; a destroyed cell stays destroyed (replaces #190 (1)).
- `js/rooms.js`: life support under power routing (#207). With routing on,
  a crewed room or magazine counts as powered for life support while it is
  joined through live walls (through any rooms) to a reactor able to
  produce (switched on, not shut down, SCRAMmed or destroyed, demand above
  0), whatever its own request; it draws nothing for it. Without routing
  the `powered` flag stays; the bridge keeps its backup. A switched-off
  reactor now routes no power (it already generated none).
- `tools/m0.js`: a case whose `run()` throws is recorded as a FAIL (its
  actual value is the error, plus a failing invariant "run() completes in
  every case") instead of stopping the runner. `L1.repair.breach` throws
  under the D kernel (its destroyed cell A is never repaired, so it waits
  for a `cell-repaired` event that never comes); it must stay recorded
  with a FAIL to be withdrawn (#188). Scenarios that do not throw record
  exactly as before.
- Scenarios D1–D5 (`DESIGN.md` §13e.3), written and run for crashes only
  before the lock: `L1.kinetic.damage`, `L1.quarters.repair.v2`,
  `L1.repair.breach.v2`, `L2.shield.salvo`, `L2.lifesupport.routed`, each
  with its expected values from `data.js`, closed forms or its own RK4
  reference integrator (D5). Added beyond the rows: D1 also fires along a
  line of six quarters (18 cells) so every size stops inside it and the
  stopping cell is measured; D2 leaves out the two (c, r) pairs whose repair
  time is a whole number of steps (#185 (2)); D3 adds the v1 heating of the
  wreck; D5 (a) also checks the heat pumped into each neighbour.
- Locked at `49355f3` (only the `locked:` lines), then the first
  canonical run: D1–D4 PASS; **D5 `L2.lifesupport.routed` FAILs** one
  check, the row's 1e-6 K per-second match against its RK4 reference (the
  kernel's Euler error is 2.0e-6 to 5.0e-5 K, as estimated before the
  lock); every other D5 check passes.
- L0, L1 and L2 re-recorded with the new data: every scenario that passed
  still passes except `L1.quarters.repair` and `L1.repair.breach`, now
  withdrawn as superseded by #203 (decision #206) with successors
  `L1.quarters.repair.v2` and `L1.repair.breach.v2`. `regress`:
  44 VERIFIED + 7 WITHDRAWN. `DESIGN.md` §16: the D pass block;
  `MISSION0.md` regenerated.
- Fixes of #212, after merging `main`: D5b `L2.lifesupport.routed.v2`
  (D5 with its (b) per-second match at 1e-6 relative, both directions)
  and D6 `L2.blast.split` (one HE or AP round in an M magazine beside an
  M hold over 10 m and a hold or bridge over 5 m: the 2 : 1 split before
  saturation and the D-pass crew rule for blast), written and run for
  crashes only, locked at `f637d2e`, then run: both PASS.
  `L2.lifesupport.routed` withdrawn under #188 (decision #212, successor
  `L2.lifesupport.routed.v2`). `regress`: 46 VERIFIED + 8 WITHDRAWN.
## 0.3.7 — 2026-10-21 — Magazine explosion wording (#215)

- `DESIGN.md` §5.2: a magazine explodes by the ammunition left; the
  propellant dominates, HE adds about a third (the owner).

## 0.3.6 — 2026-10-21 — Answers to the D-pass physics checker (#214)

- `DESIGN.md` §13e.1: the shield buffer binds at the 6th round within one
  step; E4 for it stays open until L5.

## 0.3.5 — 2026-10-21 — E8's budget (#213)

- `DESIGN.md` §13: E8 is 1 ms per simulation step in Node for a T1 and a
  T6 1v1 (the owner).

## 0.3.4 — 2026-10-21 — Answers to the D-pass engineer (#212)

- `DESIGN.md` §13e.3: D5 withdrawn for a tolerance under the Euler error,
  successor D5b `L2.lifesupport.routed.v2`; new D6 `L2.blast.split`.
- `DESIGN.md` §13f: a destroyed cell resists no round (L3), scenario
  `L3.kinetic.hole`.

## 0.3.3 — 2026-10-21 — The L3 plan (#208–#211)

- `DESIGN.md` §13f: the minimal ship: cell mass from heat capacity, a 2D
  rigid body, thrust, RCS, recoil, debris and fragments with momentum
  conserved, control and SCRAM in a fragment, validation, the readout,
  the reference ship R1 with estimates, 8 scenarios, the L3 constants
  (`engine.thrust` re-tuned to 2 MN), and the E8 budget put to the owner.

## 0.3.2 — 2026-10-21 — Mission 0 L2 merged; reviewer answers (#207)

- L2 (`m0/l2-clusters`, PR #15, head `e40d1af`) merged into `main` after
  the physics checker (#205) and the reviewer (#207) reported no blocking
  finding; `regress`: 42 VERIFIED + 5 WITHDRAWN.
- `DESIGN.md` §13d.1: under power routing a room keeps life support while
  joined through live walls to a reactor able to produce (#207); the ready
  store is `turret.readyRounds` rounds of the turret's own size.
- `DESIGN.md` §13e: the D pass also carries that fix and scenario D5
  `L2.lifesupport.routed` (split by wall length, setpoint clamp, routed
  life support), with estimates.
- `DESIGN.md` §16: the first L2 block is marked superseded by #200 and
  #201 where it states heat numbers of the replaced wall rule.

## 0.3.1 — 2026-10-21 — Heat along the coolant loop, life support, the heat sink (#198, #200, #201)

- Data: `conduction.passive` (25 W/(K·m), 5–100, k=1),
  `lifeSupport.capacityPerCell` (50 kW, 10–200 kW, k=2),
  `FIXED.lifeSupportSetpoint` (295 K), `heatsink.capacityFactor` (5,
  2–10) and `heatsink.conductivityFactor` (3, 1–5), all approved; the
  heat sink room (2×2 M, 3×3 L, anywhere, plant class, no crew, no power);
  every room type is `coolant` (reactor, beam bay, shield generator,
  engine, railgun, heat sink) or `passive`, and crewed rooms and magazines
  carry life support; the hold's 0.1 factor applies on passive walls. No
  cofferdam (deferred, #201 (4)). L0 and L1 re-recorded for the new data
  hash: only `dataHash` and `code` moved.
- `js/heat.js`, `js/rooms.js`: coolant walls (two coolant rooms) keep
  `conduction.wall` with the harmonic mean of coolant factors; every other
  wall is passive. Life support pumps a powered crewed room's or magazine's
  heat above 295 K into its coolant neighbours by live wall length, at most
  the capacity per surviving cell, never below the setpoint within a step;
  the bridge runs it on its backup. Books: `pumped` (part of `conducted`)
  and `vented`; generated + conducted = radiated + vented + stored. A
  destroyed heat sink cell vents (C / n)(T − T_rest) to space (a
  `heat-vented` event), its capacity falls by one cell and T stays; an
  emptied heat sink reads as the rest temperature.
- `tools/m0.js`: a dependency listed in `withdrawn.json` counts through
  its successor (#188), so `L2.reactor.cooled` is not blocked by the
  withdrawn `L2.heat.pair`.
- Seven new L2 scenarios (§13d.2 rows 1b, 2b, 3b, 12b, 13, 14, 16), locked
  before their first canonical run, all PASS. Withdrawn: `L2.heat.chain`
  and `L2.heat.neighbour` (specification errors, #201 (2)), `L2.heat.pair`
  and `L2.bridge.conduction` (superseded by #200).
- `regress`: 42 VERIFIED + 5 WITHDRAWN.

## 0.3.0 — 2026-10-21 — Mission 0 L2: pairs and clusters

- Data (#195): `conduction.wall`, `conduction.holdFactor`,
  `power.wallCapacity`, `ammo.wallFeed`, `turret.readyRounds`,
  `room.blastResistance`, `hold.blastFactor`, all approved; the hold names
  its conductivity and blast factors in `ROOMS`; an L magazine (3×3) for
  `L2.size.rule`. Every L0 and L1 record re-recorded for the new data
  hash: only `dataHash` and `code` moved.
- New `js/layout.js` (grid at the tier's edge, placement and rotation,
  shared walls, open edges, centres) and `js/graph.js` (priority-ordered
  max flow over live walls, ammunition feed into turret ready stores).
- `js/heat.js`: conduction through live walls (harmonic mean of the
  conductivity factors, flows from the start of the step); books carry
  `conducted` for rooms in a cluster.
- `js/rooms.js`: `createWorld({ grid })` makes a cluster; rooms placed with
  `cell` and `rotation`; power routing (`enablePowerRouting`), consumers at
  the fraction they receive; blast between rooms (wave front by wall
  length, `world.blasts`); shield beams at points without double counting
  (`setBeams`, #170) and the impulse buffer with refill (`shieldRound`);
  repair asks scaled to each quarters' budget; the size rule in a cluster.
  A room without a layout behaves exactly as at L1.
- 12 L2 scenarios (§13d.2), locked before their first canonical run:
  10 PASS, `L2.heat.chain` and `L2.heat.neighbour` FAIL on the plan's own
  claims (see `DESIGN.md` §16 and the pull request).
- `regress`: 37 VERIFIED + 1 WITHDRAWN.

## 0.2.2 — 2026-10-21 — L1 reviewer answers #189 landed

- Kernel (`js/rooms.js`, #189 (1)): a room's destroyed count is the cells
  destroyed **now**; a cell stays destroyed from integrity 0 until repair
  brings it back to 1, so a repaired cell no longer counts towards the
  breach test, and crew deaths per destroyed cell use k = cells destroyed
  now, capped by the crew aboard.
- Kernel (#189 (4)): a room that has exploded never melts down or
  explodes again on reaching critical.
- Kernel (#189 (5)): the turret fires on accumulated time, each shot
  inside the step that holds its due time, at that time; the last
  round's draw stops at its due time. `1 + floor(rate t)` holds at e.g.
  `turret.fireRate=1.3`; canonical results unchanged.
- Kernel (#189 (3)): the bridge raises `control-restored` when it gives
  control again; `control-lost` from heat carries the cause `overheat`.
- `tools/m0.js` (#189 (2)): for L1 and later the stripped `locked:` line
  may hold only `locked: null` or the lock object, with an optional
  trailing comma, otherwise the command fails; the lock rule is chosen by
  the scenario's folder, and a `level` that differs from the folder is an
  error. Valid files keep their lock hashes.
- `tools/m0.js` (#189 (6)): `verify`, `regress` and `ledger` check every
  `withdrawn.json` entry (successor exists, locked, recorded PASS;
  decision `#n`). (#189 (7)): the data hash also covers `TIERS` and
  `BASE_EDGE`; every record re-recorded, only `dataHash` and `code` moved.
- New `L1.repair.breach` and `L1.room.restart` (§13c.2 rows 14, 15),
  locked before their first canonical run, both PASS.
- Results: L0 12/12 VERIFIED; L1 15 VERIFIED + 1 WITHDRAWN.

## 0.2.1 — 2026-10-21 — L1 answers #185 and #187 landed

- `tools/m0.js`: the data hash of a record covers `PARAMS`, `FIXED` and
  `ROOMS` (#185 (9)); every L0 and L1 record re-recorded, only `dataHash`
  and `code` moved (criterion, results and run() hashes unchanged).
- `ROOMS.railgun.thermalClass` is `'plant'` (#185 (3)).
- Withdrawn scenarios (#187 (8)): `mission0/withdrawn.json` lists a
  scenario withdrawn for a specification error with its successor and
  decision; `verify` and `regress` report it as WITHDRAWN while it still
  fails exactly as recorded (any other difference is a MISMATCH);
  `regress` includes it; the ledger names the successor. First entry:
  `L1.radiator.steady` → `L1.radiator.steady.v2` (#185).
- New `L1.radiator.steady.v2` (#185 (1)), locked before its first
  canonical run: 22 cases, PASS. No kernel change (`addRoom` already takes
  a start temperature).
- Results: L0 12/12 VERIFIED; L1 13 VERIFIED + 1 WITHDRAWN.
- `DESIGN.md` §16: the v2 numbers, the withdrawal, the 19 one-sided times
  that pass only through the 1e-9 slack, named (the earlier count of
  18 + 5 was wrong), and the #187 (5) signal for L2.

## 0.2.0 — 2026-10-21 — Mission 0 L1: one room alone

- Process items of #184: from L1 the lock hash covers the whole scenario
  file except its `locked:` line (L0 keeps its rule, chosen by level);
  `shield.kineticStop` derived inside `withOverrides`; `blast()` requires
  its coupling (the locked `L0.blast.surface` run now passes 1); the
  `approved` flags of #177 flipped to true.
- `data.js`: the L1 constants of `DESIGN.md` §13c.3 with approved ranges
  (#183), new `FIXED` values (Stefan–Boltzmann, rest temperature,
  radiator emissivity, repair falloff exponent) and a `ROOMS` table.
- Kernel: `js/events.js` (event list, #156 fields), `js/heat.js`
  (per-room heat, radiators by T⁴, thresholds, books), `js/rooms.js` (the
  nine rooms' behaviours); `util.stepsAtLeast` for whole-step timers.
- Thirteen L1 scenarios, locked before their first canonical run: 12 PASS,
  `L1.radiator.steady` FAILs (the room has not settled after 3600 s; a
  design question). The first run also caught a kernel bug (a repaired
  cell reported one step early), fixed and re-run.
- L0 re-run canonically: 12/12 PASS, same criterion and result hashes
  (data hash moved with the new constants).
- `DESIGN.md` §16: the L1 numbers and an honest reading; `README.md`
  constants table regenerated from `data.js`; ledger regenerated.

## 0.1.4 — 2026-10-21 — approval tiers and the L1 plan

- Decision #180: the owner decides direction; the lead designer decides and
  records everything technical, and merges after a clean review.
- Decisions #181–#184 and `DESIGN.md` §13c: the L1 plan (nine rooms, the
  per-room heat model with two threshold classes, 13 scenarios, constants
  with approved ranges, the process items from the L0 v2 review).
- `CLAUDE.md` rules updated for #180; `STATUS.md` hand-over kept current.
- PR #1 (L0) and PR #2 (review roles) merged; nightly regression (#136)
  scheduled.

## 0.1.3 — 2026-10-21 — L0 v2 scenarios

- `he.coupling` in `data.js` (0.5, approved 0.2–0.8, k = 0): the fraction
  of a contact burst's energy that enters the hull (#169, #176).
- `blast()` takes the coupling as an explicit argument (default 1), so the
  locked `L0.blast.surface` run is unaffected; it reports the vented
  energy.
- Five v2 scenarios beside the seven locked L0 scenarios (#176):
  `L0.blast.surface.v2`, `L0.beam.burn.v2`, `L0.kinetic.penetration.v2`,
  `L0.shield.point.v2`, `L0.shield.kinetic.v2`; inputs from `data.js`,
  locked before their first canonical run; all PASS.
- L0 re-run: 12/12 PASS; the seven locked hashes and results are
  unchanged (the data hash moves with the new constant).
- `DESIGN.md` §16: the v2 numbers and an honest reading; `README.md`
  tweakable values include `he.coupling`; ledger regenerated.

## 0.1.2 — 2026-10-20 — L0 review fixes

- `shield.kineticStop` is computed exactly in `data.js` as one S round's
  sectional momentum at T1, with the arithmetic of `projectile.js`; an S
  round is stopped at full strength by definition (#171).
- The simulation step (1/60 s) and the burn time limit (3600 s) move into
  `data.js`; `burnThrough` takes the limit from its caller (#175).
- `tools/m0.js`: records carry `runHash`, a hash of the scenario's
  `run()`; `verify` checks it; the ledger shows it and the unapproved
  constants each verdict depends on (#175).
- `DESIGN.md` §16 corrected: the blast destroys 1 cell and damages 4; the
  shield's full absorption of an M beam is an inference, not a measurement;
  the first independent re-run was the reviewer's; L0's "AP" is the plain
  steel round (#173); the blast criterion does not pin the spreading law.
- `README.md` tweakable values regenerated from `data.js` (S and L size
  factors shown exactly as 2/3 and 3/2).
- L0 re-run: 7/7 PASS, verified; lock hashes unchanged.

## 0.1.1 — 2026-10-20 — review roles

- Decisions #167–#168: four roles (lead designer, engineer, reviewer,
  physics checker), each its own session, handing over through pull
  requests; a retroactive review of L0.
- Role definitions in `.claude/agents/`; `CLAUDE.md` gains a Roles section.

## 0.1.0 — 2026-10-20 — Mission 0, L0 materials

- Decisions #163–#166: SI units, the eight Mission 0 exit criteria, the L0
  plan (sectional-momentum penetration, Gaussian beams) and its ranges.
- `tools/m0.js`: the Mission 0 runner (run, lock, verify, regress, ledger).
  Criteria are hashed and locked; overrides are exploratory and refused
  outside approved ranges; records carry the command that reproduces them.
- Kernel for L0: `js/util.js`, `js/data.js`, `js/projectile.js`,
  `js/damage.js`, `js/field.js`.
- Seven L0 scenarios, locked before their first run; all PASS and verify.
- Measured in `DESIGN.md` §16; constants awaiting approval in §17.

## 0.0.0 — 2026-10-20 — the design

- The design discussion is recorded in `DECISIONS.md` (#1–#162).
- Base documents written from it: `DESIGN.md` (the current design),
  `CLAUDE.md` (working rules), `IDEAS.md` (the idea registry), `README.md`,
  `MISSION0.md` (the empty results ledger).
- No code yet. The next step is Mission 0, level L0, after its exit
  criteria and its approved ranges are agreed (`DESIGN.md` §17).
