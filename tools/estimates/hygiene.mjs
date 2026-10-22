// tools/estimates/hygiene.mjs — the lead designer's estimates for the L4
// scenario-hygiene round (DESIGN.md 13l.7, #271; the L4 scenario audit of
// #270, audit/2026-10-22-l4-scenarios.md). Reads js/ and mission0/ only;
// changes nothing; never a canonical run (#241 (1)):
//   node tools/estimates/hygiene.mjs [--set group.name=value ...]
// Prints, from the kernel at the current head: (1) the shot that takes each
// route's key cell and the shots fired by then (the literals U1 asks for),
// (2) B4's lower bound on the turret's shutdown time, C dT / P with the whole
// beam power and with the kernel's deposited fraction, against the kernel's
// shutdown step (N3), (3) the kill-pieces share at exactly wreckFraction
// (TH2), (4) the crew deaths at 0.9 and 1.6 cells lost (TH1), (5) the
// beam-chord fractions at chord 0.5 (N4), (6) the recorded residues behind
// TOL1 and TOL2 against the tolerances proposed. A number printed here is a
// kernel reading; the blind physics checker derives the physics ones.
import fs from 'node:fs';
import { withOverrides, FIXED, TIERS } from '../../js/data.js';
import { createBattle, tick, largestFraction, mainBody } from '../../js/battle.js';
import { createWorld, addRoom, damageCell, destroyCell, cellAt, pathAlong, fireBeam, beamEnergy, roomTemperature, survivingCells } from '../../js/rooms.js';
import { TARGETS, ATTACKER } from '../../mission0/targets.js';

const args = process.argv.slice(2), overrides = {};
for (let i = 0; i < args.length; i++) if (args[i] === '--set') { const [k, v] = args[++i].split('='); overrides[k] = Number(v); }
const params = withOverrides(overrides);
const dt = FIXED.simStep.value, stepOf = (t) => Math.round(t / dt);
const line = (s) => console.log(s);

// (1) U1: the shot that takes each route's key cell, and the shots fired by that step.
line('# (1) Shots per route (U1): the shot whose arrival destroys the key cell; shots launched by that step; the end');
const routes = [
  { name: 'B1 decapitation (R1, -y, turret -> bridge)', target: 'R1', bearing: '-y', plan: { turret: ['bridge'] }, key: (ev, T) => survivingCells(T.room('bridge')) === 0 && [...ev].reverse().find((e) => e.type === 'cell-destroyed' && e.room === 'bridge') },
  { name: 'B2 mission kill (R1, +y, turret -> beamBay, turret)', target: 'R1', bearing: '+y', plan: { turret: ['beamBay', 'turret'] }, key: (ev, T) => survivingCells(T.room('beamBay')) === 0 && survivingCells(T.room('turret')) === 0 && [...ev].reverse().find((e) => e.type === 'cell-destroyed' && (e.room === 'turret' || e.room === 'beamBay')) },
  { name: 'B3 split (T-neck, -y, turret -> hold)', target: 'T-neck', bearing: '-y', plan: { turret: ['hold'] }, key: (ev, T) => T.world.ship.bodies.length > 1 && [...ev].reverse().find((e) => e.type === 'cell-destroyed') },
  { name: 'B6 R1 magazine (-y)', target: 'R1', bearing: '-y', plan: { turret: ['magazine'] }, key: (ev) => ev.find((e) => e.type === 'cell-destroyed' && e.room === 'magazine') },
  { name: 'B6 R1 reactor (-y)', target: 'R1', bearing: '-y', plan: { turret: ['reactor'] }, key: (ev) => ev.find((e) => e.type === 'breach') },
  { name: 'B6 R1d magazine (-y)', target: 'R1d', bearing: '-y', plan: { turret: ['magazine'] }, key: (ev) => ev.find((e) => e.type === 'cell-destroyed' && e.room === 'magazine') },
];
for (const r of routes) {
  const b = createBattle({ params, attacker: ATTACKER, target: TARGETS[r.target], bearing: r.bearing, plan: r.plan });
  const T = b.target; let key = null, shotsAt = null;
  while (!b.ended && b.step < 7200) {
    tick(b);
    if (!key) { key = r.key(T.world.log.events, T) || null; if (key) shotsAt = b.shots; }
  }
  const hitsBy = key ? new Set(b.hits.filter((h) => stepOf(h.t) <= stepOf(key.t)).map((h) => h.id)).size : null;
  line(`${r.name}: key event ${key ? `${key.type}:${key.room || ''} at step ${stepOf(key.t)} by ${key.cause}` : 'none'}; shots launched by then ${shotsAt}; hits by then ${hitsBy}; end ${b.ended ? `${b.ended.kind} at step ${b.ended.step} (${b.ended.why || b.ended.by || ''})` : 'none'}; shots in all ${b.shots}`);
}

// (2) N3: B4's shutdown time against C dT / P.
line('\n# (2) B4 overheat (T-gun, +x, beam on the turret): the turret\'s shutdown against the lower bound C dT / P');
{
  const b = createBattle({ params, attacker: ATTACKER, target: TARGETS['T-gun'], bearing: '+x', plan: { beam: ['turret'] } });
  const T = b.target, t = T.room('turret'), C = t.heat.C, T0 = roomTemperature(t), Tc = params.thermal.crewedOverheated.value, P = params.beam.power.value;
  let shutdown = null, fraction = null, Q0 = t.heat.Q;
  while (!b.ended && b.step < 18000) {
    tick(b);
    if (fraction === null && b.beam && b.beam.result) { const path = b.beam.hit.path, F = b.beam.result.fractions; fraction = path.reduce((s, x, i) => s + (x.room && x.room.id === 'turret' ? F[i] : 0), 0); }
    if (!shutdown) { const e = T.world.log.events.find((x) => x.type === 'shutdown' && x.room === 'turret'); if (e) { shutdown = e; shutdown.surviving = survivingCells(t); shutdown.Q = t.heat.Q; } }
  }
  const dT = Tc - T0, tp = params.turret, own = tp.heatPerShot.value * tp.fireRate.value; // the turret's own heat while it holds ammunition (rooms.js heatRate), M at T1
  line(`C ${C} J/K, T0 ${T0} K, crewedOverheated ${Tc} K, dT ${dT} K, beam ${P} W, fraction deposited in the turret along the beam's path (kernel) ${fraction === null ? 'none' : fraction.toPrecision(6)}; the turret's own heat turret.heatPerShot x turret.fireRate = ${own} W`);
  const Cs = shutdown ? C * shutdown.surviving / t.cells.length : C; // the heat store is the surviving cells' (a cell destroyed by the burn takes its capacity away): a kernel reading
  line(`lower bound C dT / (beam + own) with every cell: ${(C * dT / (P + own)).toFixed(3)} s; with the ${shutdown ? shutdown.surviving : '?'} cells surviving at the shutdown (C ${Cs} J/K): ${(Cs * dT / (P + own)).toFixed(3)} s; kernel shutdown ${shutdown ? `${shutdown.t.toFixed(4)} s (step ${stepOf(shutdown.t)}, cause ${shutdown.cause})` : 'none'}; the turret's books at the end: Q - Q0 ${(t.heat.Q - Q0).toExponential(4)} J, generated ${t.heat.generated.toExponential(4)}, radiated ${t.heat.radiated.toExponential(4)}; end ${b.ended ? `${b.ended.kind} at ${b.ended.t.toFixed(3)} s` : 'none'}`);
}

// (3) TH2: the share exactly at wreckFraction.
line('\n# (3) Kill by pieces at the threshold (TH2): the 20-hold strip cut at one column');
{
  const STRIP = { rooms: Array.from({ length: 20 }, (_, i) => ({ id: `h${String(i).padStart(2, '0')}`, type: 'hold', cell: [2 * (i % 10), 2 * Math.floor(i / 10)] })), fittings: [] };
  for (const cut of [[10], [9, 19], [11]]) {
    const b = createBattle({ params, attacker: ATTACKER, target: STRIP, bearing: '-y', validate: false });
    const w = b.target.world;
    for (const x of cut) for (let y = 0; y < 4; y++) { const at = cellAt(w, [x, y]); destroyCell(w, at.room, at.index, 'launch'); }
    tick(b);
    line(`cut column(s) ${cut.join(', ')}: largest share ${largestFraction(w, b.target.undock)} (wreckFraction ${params.battle.wreckFraction.value}); end ${b.ended ? `${b.ended.kind} (${b.ended.by})` : 'none'}`);
  }
}

// (4) TH1: crew deaths at a loss just under and over one cell.
line('\n# (4) Crew deaths (TH1): floor(crew x loss / cells) at 0.9 and 1.6 cells lost on a 4-crew, 4-cell bridge');
for (const loss of [0.9, 1.2, 1.6]) {
  const world = createWorld({ params, edge: TIERS.T1.edge, dt, grid: TIERS.T1.grid });
  const bridge = addRoom(world, 'bridge', { id: 'bridge', cell: [0, 0] });
  addRoom(world, 'quarters', { id: 'quarters', cell: [2, 0] });
  const parts = [Math.min(loss, 0.6), Math.min(Math.max(loss - 0.6, 0), 0.6), Math.max(loss - 1.2, 0)];
  parts.forEach((p, i) => { if (p > 0) damageCell(world, bridge, i, p, `hit-${i + 1}`, 'kinetic'); });
  const deaths = world.log.events.filter((e) => e.type === 'crew-died' && e.room === 'bridge').reduce((x, e) => x + e.deaths, 0);
  line(`loss ${loss} cells: hand floor(4 x ${loss} / 4) = ${Math.floor(loss)}; kernel deaths ${deaths}, crew ${bridge.crew}`);
}

// (5) N4: the beam-chord fractions.
line('\n# (5) Beam chord (N4): the fractions at chord 1 and 0.5 (100 MeV, 5 MW, two hold cells of 120 kg/m^2)');
for (const chord of [1, 0.5]) {
  const world = createWorld({ params, edge: TIERS.T1.edge, dt, grid: TIERS.T1.grid });
  addRoom(world, 'hold', { id: 'hold', cell: [0, 0] });
  const path = pathAlong(world, [[-1, 0], [0, 0], [1, 0], [2, 0]].slice(1, 3), [chord, chord]);
  const res = fireBeam(world, { power: 5e6, energy: beamEnergy(world, { length: 2 }) }, path, 'beam');
  line(`chord ${chord}: F ${res.fractions.map((x) => x.toPrecision(12)).join(' ')}`);
}

// (6) TOL1, TOL2: recorded residues against the tolerances.
line('\n# (6) Residues on record (TOL1, TOL2) against the tolerance in force and the one proposed (1e-12 x gross; 1e-12 relative)');
const rec = (id) => JSON.parse(fs.readFileSync(new URL(`../../mission0/results/${id}.json`, import.meta.url), 'utf8'));
try { for (const row of rec('L4.route.split').rows) if (row.actual.split) line(`L4.route.split ${JSON.stringify(row.case)}: dP ${row.actual.split.dP.toExponential(2)} / gross ${row.actual.split.gross.toFixed(0)} = ${(row.actual.split.dP / row.actual.split.gross).toExponential(2)}; in force 1e-9 x gross = ${(1e-9 * row.actual.split.gross).toExponential(2)}; proposed 1e-12 x gross = ${(1e-12 * row.actual.split.gross).toExponential(2)}`); } catch (e) { line(`L4.route.split: ${e.message}`); }
for (const id of ['L2.shield.overlap.round', 'L3.shield.bodies', 'L3.beam.deposit']) {
  try { const r = rec(id); for (const row of r.rows) line(`${id} ${JSON.stringify(row.case)}: actual ${JSON.stringify(row.actual).slice(0, 300)}`); } catch (e) { line(`${id}: ${e.message}`); }
}

// (7) U2: an oblique line of fire (chord < 1 on the loop's path) and a line through holes only (no hit).
line('\n# (7) Oblique shots and holes (U2): B1\'s battle with the attacker 20 degrees off the -y axis; then the bridge destroyed before the first shot');
{
  const a = 20 * Math.PI / 180, bearing = [Math.sin(a), -Math.cos(a)];
  const b = createBattle({ params, attacker: ATTACKER, target: TARGETS.R1, bearing, plan: { turret: ['bridge'] } });
  while (!b.ended && b.step < 3600) tick(b);
  const chords = b.hits.slice(0, 3).map((h) => h.path.join(' > '));
  line(`bearing [${bearing.map((x) => x.toFixed(6)).join(', ')}]: ${b.hits.length} hits, ${b.misses.length} misses in ${b.step} steps; end ${b.ended ? `${b.ended.kind} at step ${b.ended.step}` : 'none'}; first paths: ${chords.join(' | ')}`);
  const r0 = b.hits[0] ? b.hits[0].r : null;
  line(`first hit's entries (r per entry, the kernel): ${r0 ? r0.map((x) => Number(x).toPrecision(6)).join(', ') : 'none'}; passed ${b.hits[0] ? b.hits[0].passed : '-'}, stopped in ${b.hits[0] ? b.hits[0].stoppedIn : '-'}`);
  try {
    const { worldPoint } = await import('../../js/body.js');
    const h0 = createBattle({ params, attacker: ATTACKER, target: TARGETS.R1, bearing: '-y', plan: { turret: ['bridge'] } });
    const centre = worldPoint(mainBody(h0.target), h0.target.room('bridge').position); // the bridge's centre as a world point
    const h = createBattle({ params, attacker: ATTACKER, target: TARGETS.R1, bearing: '-y', plan: { turretPoint: centre, turret: [] } });
    for (const id of ['bridge', 'quarters']) { const r = h.target.room(id); for (let i = 0; i < r.cells.length; i++) destroyCell(h.target.world, r, i, 'launch'); }
    while (!h.ended && h.step < 1200) tick(h);
    line(`bridge and quarters destroyed before the first shot, the turret aimed at the bridge's centre (world point [${centre.map((x) => x.toFixed(3)).join(', ')}]): ${h.shots} shots, ${h.hits.length} hits, ${h.misses.length} misses in ${h.step} steps; end ${h.ended ? `${h.ended.kind} at step ${h.ended.step} (${h.ended.why || ''})` : 'none'}; first hit path ${h.hits[0] ? h.hits[0].path.join(' > ') : 'none'}`);
  } catch (e) { line(`holes case: the kernel threw: ${e.message}`); }
}

// (8) T1: the round rule at 700 m/s relative to the hull (L4.relative's case), the kernel's reading.
line('\n# (8) The round at 700 m/s relative (T1): what the kernel\'s round rule gives on R1\'s bridge line');
{
  const { aimPoint } = await import('../../js/battle.js');
  const { worldPoint } = await import('../../js/body.js');
  const b = createBattle({ params, attacker: ATTACKER, target: TARGETS.R1, bearing: '-y', plan: { turret: ['bridge'] } });
  const A = b.attacker, turret = A.room('turret'), tb = mainBody(b.target);
  const S = worldPoint(mainBody(A), turret.position), P = aimPoint(b.target, b.target.room('bridge')), D = [P[0] - S[0], P[1] - S[1]], L = Math.hypot(D[0], D[1]);
  tb.v = [100 * D[0] / L, 100 * D[1] / L];
  while (!b.hits.length && b.step < 600) tick(b);
  const h = b.hits[0];
  line(`speed ${h.speed} m/s, s0 ${((b.round.mass * h.speed) / b.round.area).toPrecision(12)} kg/(m s), path ${h.path.join(' > ')}, r per entry ${h.r.map((x) => Number(x).toPrecision(8)).join(', ')}, passed ${h.passed}, stopped in ${h.stoppedIn}, f ${Number(h.f).toPrecision(10)}, momentum left ${Number(h.momentum).toPrecision(10)}`);
}

// (9) T3: csdaSteps at both ends of the sweep, with the range and the step it uses.
line('\n# (9) csdaSteps (T3): the count at 10 and 400 MeV and what it is made of');
{
  const { csdaSteps, csdaRange } = await import('../../js/damage.js');
  const iron = { protonRest: FIXED.protonRestEnergy.value, electronRest: FIXED.electronRestEnergy.value, K: FIXED.betheK.value, ZA: FIXED.ironZOverA.value, I: FIXED.ironMeanExcitation.value, lambda: FIXED.ironInteractionLength.value };
  const MEV = 1.602176634e-13;
  for (const mev of [10, 100, 400]) { const s = csdaSteps(mev * MEV, iron); line(`${mev} MeV: csdaSteps ${JSON.stringify(s).slice(0, 200)}; csdaRange ${csdaRange(mev * MEV, iron)} kg/m^2`); }
}
