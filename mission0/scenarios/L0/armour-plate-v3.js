import { createWorld, addRoom, addFitting, fireRound, fireBeam, beamEnergy, pathAlong, destroyCell } from '../../../js/rooms.js';
import { beamDeposit } from '../../../js/damage.js';
import { roundGeometry } from '../../../js/projectile.js';
import { withOverrides } from '../../../js/data.js';

const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));

// Successor of L0.armour.plate.v2 (withdrawn as superseded by #278, the L5 kinetic pass, 13n.1 (b) L4): identical but for
// the split of a round's heat between its entries, now by the energy each took ((p_i^2 - p_{i+1}^2) / 2m), not by the
// momentum; only the mount cases read that split.
// L0.armour.plate's setup: a T1 cluster, an M hold at cell (0, 0) (cells (0, 0), (1, 0), (0, 1), (1, 1)) with an
// armour plate on its hull edge at the grid's border, cell (0, 0) side -x. The line runs along row y = 0 from -x:
// grid cells (-1, 0) (off the grid), (0, 0), (1, 0), (2, 0) (empty), so pathAlong gives [plate, hold cell 0, hold
// cell 1]. A line at theta to the plate's normal is given to pathAlong as its direction (cos theta, sin theta).
const LINE = [[-1, 0], [0, 0], [1, 0], [2, 0]];
// The mount cases: two M holds, A at cell (0, 0) and B at cell (2, 0), the plate on their shared wall segment
// between grid cells (1, 0) and (2, 0), mounted on A (cell (1, 0), side +x) or on B (cell (2, 0), side -x); the
// line runs along row y = 0 from +x: (4, 0) (empty), (3, 0), (2, 0), (1, 0), (0, 0), (-1, 0) (off the grid), so the
// path is [B cell 1, B cell 0, plate, A cell 1, A cell 0].
const MOUNT_LINE = [[4, 0], [3, 0], [2, 0], [1, 0], [0, 0], [-1, 0]];
const MEV = 1.602176634e-13;
// Cases: L0.armour.plate's seven (d the plate's thickness, armour.plateThickness by run-time params; chord the plate
// entry's, as the caller may set it), then #258's: rounds and a beam at theta = 45 deg (cos 1/sqrt 2) and at the cap
// (cos 0.02 < d / edge = 0.04); the ruin of the 0.2 m plate (on the step grid: stated as a step count) and of a
// 0.15 m plate (off the grid); the hold's heat capacity with the plate and after its mount cell is destroyed; the
// plate's heat and heat capacity in its mount room, mounted on A or on B.
const CASES = [
  { kind: 'round', d: 0.2, chord: 1, rounds: 1 },
  { kind: 'round', d: 0.2, chord: Math.SQRT1_2, rounds: 1 },
  { kind: 'round', d: 0.1, chord: 1, rounds: 1 },
  { kind: 'round', d: 0.1, chord: 1, rounds: 4 },
  { kind: 'beam', d: 0.2, chord: 1 },
  { kind: 'beam', d: 0.2, chord: Math.SQRT1_2 },
  { kind: 'beam', d: 0.01, chord: 1 },
  { kind: 'round', d: 0.1, chord: 1, rounds: 1, cos: Math.SQRT1_2 },
  { kind: 'round', d: 0.2, chord: 1, rounds: 1, cos: 0.02 },
  { kind: 'beam', d: 0.01, chord: 1, cos: Math.SQRT1_2 },
  { kind: 'ruin', d: 0.2 },
  { kind: 'ruin', d: 0.15 },
  { kind: 'capacity', d: 0.2 },
  { kind: 'mount', d: 0.2, on: 'A' },
  { kind: 'mount', d: 0.2, on: 'B' },
];
const ironBeam = (f) => ({ protonRest: f.protonRestEnergy.value, electronRest: f.electronRestEnergy.value, K: f.betheK.value, ZA: f.ironZOverA.value, I: f.ironMeanExcitation.value, lambda: f.ironInteractionLength.value });
const direction = (cos) => [cos, Math.sqrt(1 - cos * cos)];
// Hand-worked (tools/estimates/l4.mjs, the #258 section): the plate's mass d x 7850 x 25, its heat capacity at
// 450 J/(kg K), the hold's 4 x thermal.coupledHold = 5.4e6 J/K.
const LIT = {
  mass: { 0.2: 39250, 0.15: 29437.5, 0.1: 19625, 0.01: 1962.5 },
  plateC: { 0.2: 17662500, 0.1: 8831250, 0.01: 883125 },
  holdC: 5.4e6,
  burnPerStep: { 0.2: 0.0007077140835102618, 0.01: 0.0073768564011938926 },
  ruin: { 0.2: 23.55, 0.15: 17.6625 },
  ruinSteps: { 0.2: 1413 },
  thinF: [0.5212, 0.4788], thinFull: [0.52117490474434847, 0.47882509525565153],
  sigmaCos: { 0.1: 1110.1576464628795 }, sigmaCap: 39250,
};

function build(ctx, d) {
  const params = withOverrides({ 'armour.plateThickness': d });
  const world = createWorld({ params, edge: ctx.tiers.T1.edge, dt: ctx.dt, grid: ctx.tiers.T1.grid });
  const hold = addRoom(world, 'hold', { id: 'hold', cell: [0, 0] });
  const plate = addFitting(world, 'armour', 'hold', [0, 0], [-1, 0]);
  return { world, hold, plate };
}
const beamOf = (ctx, world) => ({ power: ctx.scaled(ctx.params.beam.power, ctx.tiers.T1.edge), energy: beamEnergy(world, { length: 2 }) });

/** The round rule (13i.1) on resistances r: the scenario's own loop (a re-statement of penetrateRound), from p0, A0, S. */
function ownRound(p0, A0, S, r) {
  let p = p0, f = 0, A = A0;
  const taken = [];
  for (let i = 0; i < r.length; i++) {
    const s = p / A;
    if (s > r[i] && f + r[i] / S < 1) { taken.push(r[i]); p -= r[i] * A; f += r[i] / S; A = A0 / (1 - f); }
    else { taken.push(Math.min(s, r[i])); return { stoppedIn: i, taken, exit: 0 }; }
  }
  return { stoppedIn: -1, taken, exit: p };
}
/** The step in which a plate burning `loss` per step reaches 0: the scenario's own stepped sum, with the kernel's 1e-12 snap (damageCell). */
function ownRuinStep(loss) {
  let integrity = 1, k = 0;
  while (integrity > 0) { k++; const left = integrity - loss; integrity = left > 1e-12 ? left : 0; }
  return k;
}

export default {
  id: 'L0.armour.plate.v3',
  level: 'L0',
  laws: ['an armour plate on a wall segment meets a path once with sigma = d x steel density, by the chord rule (#255, #256, 13l.1)', 'the plate resists a round as a cell does (r = c sigma chord), loses 1 / kinetic.hitsToWreck per passing round and becomes a hole (13l.1)', 'a beam deposits in the plate (beamDeposit with its sigma), the heat goes to the room it is mounted on, and the plate burns by its mass: P F dt / (matter.burnEnergyPerKg x its mass) per step (#240 (1), #258)', 'a line at theta to the plate\'s normal meets sigma / cos theta, capped at cos theta >= d / edge (#258)', 'the plate\'s steel adds mass x thermal.coupledArmour / armour.cellMass to its room\'s heat capacity, which leaves with its share of the heat when the plate is gone (#258)'],
  dependsOn: ['L0.kinetic.chord', 'L0.kinetic.flatten', 'L0.beam.burn.v5'],
  setup: 'L0.armour.plate\'s: a T1 cluster, an M hold at cell (0, 0) with an armour plate (addFitting \'armour\') of armour.plateThickness d = 0.2 m (approved), 0.15, 0.1 or 0.01 m (run-time params) on its hull edge at cell (0, 0), side -x; the path along row y = 0 from -x by the kernel\'s pathAlong (with the line\'s direction at theta to the plate\'s normal: cos theta 1, 1/sqrt 2 or 0.02), the plate entry at chord 1 or 1/sqrt 2; M rounds (one, or four in turn) by fireRound, or steps of a 5 MW beam of an N = 2 bay\'s energy by fireBeam (one step, or every step until the plate is a hole); destroyCell on the plate\'s mount cell; and two M holds A at (0, 0) and B at (2, 0) with a 0.2 m plate on their shared wall mounted on A or on B, an M round along row 0 from +x (#258, 13l.4 A9)',
  measure: 'per round: the path, the plate entry\'s cos, the resistance and sectional momentum each entry took, where the round stopped, the plate\'s integrity, the hold\'s heat, heat capacity and vented heat; per beam step: the fractions, the hold\'s heat, the plate\'s and the cells\' integrity; for the ruin, the step in which the plate becomes a hole, then the hold\'s heat capacity, vented heat and books; for the mount cases, each room\'s heat and heat capacity',
  tolerance: 'closed forms 1e-12; the 4-digit literals of the thin-plate fractions 5e-5 absolute (the checker\'s precision), their full literals 1e-12; books 1e-9 x the gross',
  criterion: 'Every check of L0.armour.plate, except that the plate is now burnt: the path is [plate, hold cell 0, hold cell 1]; sigma = d x 7850 (1570, 785, 78.5 kg/m^2); r = c sigma chord / cos; an M round stops in the 0.2 m plate at chord 1 or 1/sqrt 2 (the hold heated by 1.92 MJ), passes 0.1 m and crosses the hold by the round rule (re-statement), four rounds through 0.1 m leave a hole after the third and the fourth meets sigma 0; a beam step deposits beamDeposit(E, [sigma chord / cos, 120, 120]) (re-statement) as heat in the hold, F = 1 in the 0.2 m plate. New (#258): the plate loses P F dt / (q m) per beam step, q = matter.burnEnergyPerKg = 3000 J/kg (hand-worked: 7.0771408351e-4 for 0.2 m at F = 1; 7.3768564012e-3 for 0.01 m), each hold cell P F_i dt / (q 3000); the thin plate takes 0.5212 and its hold cell 0.4788 (to 4 digits, the checker\'s; 0.52117490474434847 / 0.47882509525565153 at 1e-12); at 45 deg the 0.1 m plate meets 785 sqrt 2 = 1110.16 kg/m^2 (r = 1.7157e6 > s0: the round that passed at the normal stops in it) and the thin plate\'s beam is beamDeposit with 78.5 sqrt 2; at cos 0.02 the 0.2 m plate meets the cap, sigma / (d / edge) = 7850 x 5 = 39 250 kg/m^2; the 0.2 m plate burnt by the 5 MW beam stopping in it becomes a hole in step 1413 (q m / P = 3000 x 39 250 / 5e6 = 23.55 s = 1413 dt exactly, on the step grid, so stated as a step count; the scenario\'s own stepped sum gives the same step), the 0.15 m plate at t_k = k dt in [17.6625, 17.6625 + dt) s (off the grid: 1059.75 steps); the hold\'s heat capacity with a 0.2 m plate is 5.4e6 + 39 250 x 450 = 23 062 500 J/K and one beam step at F = 1 raises it by P dt / 23 062 500 K; when the plate is gone (wrecked, ruined or its mount cell destroyed) the hold\'s capacity returns to 5.4e6 J/K and it vents C_plate (T - 290 K), its books closing (generated = stored + vented, 1e-9); a plate on a shared wall puts its share of a round\'s heat (heat x the energy it took / the energy all took, (p_i^2 - p_{i+1}^2) / 2m with p_i the momentum on entering, L4 of 13n.1 (b)) and its heat capacity in the room it is mounted on, A or B, not the other',
  tunable: ['armour.plateThickness', 'matter.kineticResistance', 'matter.burnEnergyPerKg', 'thermal.coupledArmour', 'thermal.coupledHold', 'armour.cellMass', 'kinetic.roundMass', 'kinetic.muzzleVelocity', 'kinetic.hitsToWreck', 'beam.power', 'beam.gradient'],
  locked: { date: '2026-10-22', hash: '40c9e8b2' },
  cases() {
    return CASES.map((x) => ({ ...x }));
  },
  expected(ctx, c) {
    const f = ctx.fixed, c0 = ctx.params.matter.kineticResistance.value, hits = 3, q = 3000, P = 5e6, dt = ctx.dt, e = 5;
    const sigma = c.d * 7850, mass = c.d * 7850 * e * e, plateC = (mass * 4.5e6) / 1e4, holdC = 4 * 1.35e6;
    const cos = Math.max(c.cos ?? 1, c.d / e), sigmaLine = sigma / cos;
    if (c.kind === 'beam') {
      const E = 100 * MEV, dep = beamDeposit(E, [sigmaLine * c.chord, 120, 120], ironBeam(f));
      return { sigma, sigmaLine, mass, fractions: dep.fractions, heatPerStep: P * (dep.fractions[0] + dep.fractions[1] + dep.fractions[2]) * dt, plate: 1 - (P * dep.fractions[0] * dt) / (q * mass), cells: [1 - (P * dep.fractions[1] * dt) / (q * 3000), 1 - (P * dep.fractions[2] * dt) / (q * 3000)] };
    }
    if (c.kind === 'ruin') {
      const loss = (P * 1 * dt) / (q * mass), tRuin = (q * mass) / P;
      return { mass, loss, tRuin, step: ownRuinStep(loss), plateC, holdC };
    }
    if (c.kind === 'capacity') return { plateC, holdC, C: holdC + plateC, dT: (P * dt) / (holdC + plateC) };
    if (c.kind === 'mount') return { plateC, holdC, heat: 0.5 * 6 * 800 * 800 };
    const m = 6, v = 800, D = Math.cbrt((4 * m) / (Math.PI * 7850 * 4)), A0 = (Math.PI * D * D) / 4, s0 = (m * v) / A0, S = c0 * (m / A0);
    const rHold = c0 * (3000 / 25), out = [];
    let integrity = 1, holdLeft = [1, 1], wreckedAt = null;
    for (let k = 0; k < c.rounds; k++) {
      const rPlate = integrity > 0 ? c0 * sigmaLine * c.chord : 0, r = [rPlate, holdLeft[0] > 0 ? rHold : 0, holdLeft[1] > 0 ? rHold : 0];
      const res = ownRound(m * v, A0, S, r);
      const loss = (i) => (r[i] === 0 ? 0 : (res.stoppedIn === -1 || i < res.stoppedIn ? 1 : res.taken[i] / r[i]) / hits);
      { const L = loss(0); integrity = integrity - L > 1e-12 ? integrity - L : 0; if (integrity === 0 && wreckedAt === null) wreckedAt = k; }
      for (const i of [1, 2]) if (i < res.taken.length) { const L = loss(i); holdLeft[i - 1] = holdLeft[i - 1] - L > 1e-12 ? holdLeft[i - 1] - L : 0; }
      out.push({ r, taken: res.taken, stoppedIn: res.stoppedIn, plate: integrity });
    }
    return { sigma, sigmaLine, s0, rounds: out, wreckedAt, plateC, holdC, literal: { sigma: { 0.2: 1570, 0.1: 785 }[c.d], r: c0 * ({ 0.2: 1570, 0.1: 785 }[c.d] / cos) * c.chord } };
  },
  run(ctx, c) {
    const f = ctx.fixed, edge = ctx.tiers.T1.edge;
    const roundOf = () => { const m = ctx.scaled(ctx.params.kinetic.roundMass, edge), v = ctx.scaled(ctx.params.kinetic.muzzleVelocity, edge), { A } = roundGeometry(m, f.steelDensity.value, f.roundLengthToDiameter.value); return { mass: m, velocity: v, area: A }; };
    if (c.kind === 'mount') {
      const params = withOverrides({ 'armour.plateThickness': c.d });
      const world = createWorld({ params, edge, dt: ctx.dt, grid: ctx.tiers.T1.grid });
      const A = addRoom(world, 'hold', { id: 'A', cell: [0, 0] }), B = addRoom(world, 'hold', { id: 'B', cell: [2, 0] });
      const plate = c.on === 'A' ? addFitting(world, 'armour', 'A', [1, 0], [1, 0]) : addFitting(world, 'armour', 'B', [2, 0], [-1, 0]);
      const C0 = { A: A.heat.C, B: B.heat.C }, h0 = { A: A.heat.generated, B: B.heat.generated };
      const path = pathAlong(world, MOUNT_LINE, null, [-1, 0]);
      const res = fireRound(world, roundOf(), path, 'round');
      const shape = path.map((x) => (x.plate ? 'plate' : `${x.room.id}:${x.cell}`));
      return { shape, mountedOn: plate.room, C: C0, gain: { A: A.heat.generated - h0.A, B: B.heat.generated - h0.B }, heats: res.heats, impulse: res.impulse, entry: res.entry, heat: res.heat, stoppedIn: res.stoppedIn };
    }
    const { world, hold, plate } = build(ctx, c.d);
    const path = pathAlong(world, LINE, null, c.cos === undefined ? null : direction(c.cos)).map((x) => (x.plate ? { ...x, chord: c.chord ?? 1 } : x));
    const shape = path.map((x) => (x.plate ? 'plate' : `hold:${x.cell}`)), cos = path[0].cos;
    const books = () => ({ C: hold.heat.C, Q: hold.heat.Q, Q0: hold.heat.Q0, generated: hold.heat.generated, vented: hold.heat.vented, T: hold.heat.Q / hold.heat.C });
    const C0 = hold.heat.C;
    if (c.kind === 'beam') {
      const Q0 = hold.heat.generated, res = fireBeam(world, beamOf(ctx, world), path, 'beam');
      return { shape, cos, sigma: plate.thickness * f.steelDensity.value, mass: plate.mass, fractions: res.fractions, heat: hold.heat.generated - Q0, plate: plate.integrity, cells: hold.cells.map((x) => x.integrity), C0 };
    }
    if (c.kind === 'ruin') {
      const beam = beamOf(ctx, world);
      let step = null, before = null, fractions = null;
      for (let k = 1; k <= 3000 && step === null; k++) {
        before = books();
        const res = fireBeam(world, beam, path, 'beam');
        if (k === 1) fractions = res.fractions;
        if (plate.destroyed) step = k;
      }
      return { step, t: step * ctx.dt, fractions, mass: plate.mass, C0, before, after: books(), cells: hold.cells.map((x) => x.integrity) };
    }
    if (c.kind === 'capacity') {
      const T0 = hold.heat.Q / hold.heat.C, b0 = books();
      fireBeam(world, beamOf(ctx, world), path, 'beam');
      const b1 = books();
      destroyCell(world, hold, 0, 'test');
      return { C0, T0, b0, b1, after: books(), plateGone: true };
    }
    const r0 = roundOf(), rounds = [];
    for (let k = 0; k < c.rounds; k++) {
      const b = books(), h0 = hold.heat.generated, res = fireRound(world, r0, path, `round-${k + 1}`);
      rounds.push({ r: res.r, taken: res.absorbed, stoppedIn: res.stoppedIn, plate: plate.destroyed ? 0 : plate.integrity, heat: hold.heat.generated - h0, s0: res.s0, before: b, after: books() });
    }
    const destroyedAt = world.log.events.filter((e) => e.type === 'plate-destroyed').map((e) => e.cause);
    return { shape, cos, sigma: plate.thickness * f.steelDensity.value, rounds, destroyedAt, mass: plate.mass, C0 };
  },
  compare(e, a, c, ctx) {
    const rest = 290, checks = {};
    const closesBooks = (b) => Math.abs(b.generated - (b.Q - b.Q0) - b.vented) <= 1e-9 * (b.generated + Math.abs(b.Q - b.Q0) + b.vented + 1);
    // The plate gone in the step from b0 to b1: the hold back to its cells' capacity, the plate's share vented at the temperature it left at (b1's: venting keeps T).
    const vents = (b0, b1, plateC) => close(e.holdC, b1.C, 1e-12) && close(plateC * (b1.T - rest), b1.vented - b0.vented, 1e-9) && closesBooks(b1);
    if (c.kind === 'mount') {
      const other = c.on === 'A' ? 'B' : 'A', ip = a.shape.indexOf('plate');
      const took = a.impulse.map((imp, i) => a.entry[i] * a.entry[i] - (a.entry[i] - imp) * (a.entry[i] - imp)), all = took.reduce((x, y) => x + y, 0);
      const plateShare = (a.heat * took[ip]) / all; // L4 of 13n.1 (b): the energy it took, p_i^2 - p_{i+1}^2 (the 1 / 2m cancels)
      Object.assign(checks, {
        'path: B cell 1, B cell 0, plate, A cell 1, A cell 0': a.shape.join(' ') === 'B:1 B:0 plate A:1 A:0',
        'the plate is mounted on the case\'s room': a.mountedOn === c.on,
        'the round stops in the plate; all its 1.92 MJ is heat (hand-worked)': a.stoppedIn === ip && close(e.heat, a.heat, 1e-12),
        'the plate\'s heat share goes to its mount room': close(plateShare, a.heats[ip], 1e-12) && close(a.heats.reduce((x, h, i) => x + (i === ip || a.shape[i].startsWith(c.on) ? h : 0), 0), a.gain[c.on], 1e-12),
        'the other room gets only its own cells\' heat': close(a.heats.reduce((x, h, i) => x + (a.shape[i].startsWith(other) ? h : 0), 0), a.gain[other], 1e-12) && a.gain[c.on] > a.gain[other],
        'the plate\'s heat capacity is in its mount room only (hand-worked)': close(e.holdC + e.plateC, a.C[c.on], 1e-12) && close(e.holdC, a.C[other], 1e-12),
      });
      return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ') };
    }
    if (c.kind === 'ruin') {
      Object.assign(checks, {
        'the beam stops in the plate (F = 1)': a.fractions[0] === 1,
        'the plate\'s mass d x 7850 x 25 (hand-worked)': close(LIT.mass[c.d], a.mass, 1e-12),
        'ruin time q m / P (hand-worked)': close(LIT.ruin[c.d], e.tRuin, 1e-12),
        'a hole in the step of the scenario\'s own stepped sum': a.step === e.step,
        'the hold cells untouched until then': a.cells.every((x) => x === 1),
        'its capacity leaves with its share of the heat; books close': vents(a.before, a.after, e.plateC),
      });
      if (LIT.ruinSteps[c.d] !== undefined) checks['on the step grid: a hole in step 1413 (23.55 s / dt, hand-worked)'] = a.step === LIT.ruinSteps[c.d] && e.step === LIT.ruinSteps[c.d];
      else checks['off the grid: the hole at t_k in [t, t + dt)'] = a.t >= LIT.ruin[c.d] && a.t < LIT.ruin[c.d] + ctx.dt && (a.step - 1) * ctx.dt < LIT.ruin[c.d];
      return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ') };
    }
    if (c.kind === 'capacity') {
      Object.assign(checks, {
        'the hold with the plate: 23 062 500 J/K (hand-worked)': close(23062500, a.C0, 1e-12) && close(e.C, a.C0, 1e-12),
        'one beam step at F = 1 raises T by P dt / C': close(e.dT, a.b1.T - a.T0, 1e-9),
        'the mount cell destroyed: the plate\'s capacity leaves with its share of the heat': close(e.holdC, a.after.C, 1e-12) && close(e.plateC * (a.b1.T - rest), a.after.vented - a.b1.vented, 1e-9) && closesBooks(a.after),
      });
      return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ') };
    }
    Object.assign(checks, { 'path: plate, then the hold\'s cells in order': a.shape.join(' ') === 'plate hold:0 hold:1', 'sigma = d x 7850 (hand-worked)': close(c.d * 7850, a.sigma, 1e-12), 'the plate entry\'s cos theta': close(c.cos ?? 1, a.cos, 1e-12) });
    if (c.kind === 'beam') {
      Object.assign(checks, {
        'fractions = beamDeposit(E, [sigma chord / cos, 120, 120]) (re-statement)': e.fractions.every((F, i) => Math.abs(F - a.fractions[i]) <= 1e-12),
        'heat in the hold = P sum F dt': close(e.heatPerStep, a.heat, 1e-12),
        'the plate burns P F dt / (q m) (#258)': close(1 - e.plate, 1 - a.plate, 1e-12) && a.plate < 1,
        'each hold cell burns P F_i dt / (q 3000)': e.cells.every((x, i) => close(1 - x, 1 - a.cells[i], 1e-12) || (x === 1 && a.cells[i] === 1)),
      });
      if (c.d === 0.2) checks['hand-worked: F = 1 in the 0.2 m plate, its burn 7.0771408351e-4, the hold\'s cells untouched'] = a.fractions[0] === 1 && a.cells.every((x) => x === 1) && close(LIT.burnPerStep[0.2], 1 - a.plate, 1e-12);
      else if (c.cos === undefined) checks['hand-worked: thin plate 0.5212 / 0.4788 (4 digits), 0.52117490474434847 / 0.47882509525565153 (1e-12), its burn 7.3768564012e-3'] = Math.abs(a.fractions[0] - LIT.thinF[0]) <= 5e-5 && Math.abs(a.fractions[1] - LIT.thinF[1]) <= 5e-5 && close(LIT.thinFull[0], a.fractions[0], 1e-12) && close(LIT.thinFull[1], a.fractions[1], 1e-12) && close(LIT.burnPerStep[0.01], 1 - a.plate, 1e-12);
      else checks['at 45 deg the thin plate meets more than at the normal (F0 > 0.5212)'] = a.fractions[0] > LIT.thinFull[0];
    } else {
      Object.assign(checks, {
        'each round by the round rule with r = c sigma chord / cos (re-statement)': e.rounds.every((x, k) => a.rounds[k] && x.stoppedIn === a.rounds[k].stoppedIn && x.r.every((r, i) => close(r, a.rounds[k].r[i], 1e-12) || (r === 0 && a.rounds[k].r[i] === 0)) && x.taken.every((t, i) => close(t, a.rounds[k].taken[i], 1e-12) || (t === 0 && a.rounds[k].taken[i] === 0))),
        'the plate\'s integrity after each round': e.rounds.every((x, k) => (x.plate === 0 ? a.rounds[k].plate === 0 : close(x.plate, a.rounds[k].plate, 1e-12))),
        'hand-worked sigma and r of the plate': close(e.literal.sigma, a.sigma, 1e-12) && close(e.literal.r, a.rounds[0].r[0], 1e-12),
        'the plate\'s mass d x 7850 x 25': close(c.d * 7850 * 25, a.mass, 1e-12),
        'the hold with the plate: 5.4e6 + m 450 J/K (hand-worked)': close(LIT.holdC + LIT.plateC[c.d], a.C0, 1e-12),
      });
      if (c.d === 0.2 && c.cos === undefined) checks['hand-worked: stops in the plate, taking s0, the hold heated by 1.92 MJ'] = a.rounds[0].stoppedIn === 0 && close(a.rounds[0].s0, a.rounds[0].taken[0], 1e-12) && close(1.92e6, a.rounds[0].heat, 1e-12);
      if (c.rounds === 4) {
        checks['a hole after the third round; the fourth meets sigma 0'] = a.destroyedAt.length === 1 && a.destroyedAt[0] === 'round-3' && a.rounds[3].r[0] === 0 && e.wreckedAt === 2;
        checks['the wrecked plate\'s capacity leaves with its share of the heat; books close'] = vents(a.rounds[2].before, a.rounds[2].after, e.plateC);
      }
      if (c.cos === Math.SQRT1_2) checks['hand-worked: at 45 deg the 0.1 m plate meets 785 sqrt 2 = 1110.16 kg/m^2 and stops the round that passes it at the normal'] = close(LIT.sigmaCos[0.1] * ctx.params.matter.kineticResistance.value, a.rounds[0].r[0], 1e-12) && a.rounds[0].stoppedIn === 0;
      if (c.cos === 0.02) checks['hand-worked: at cos 0.02 the cap, 7850 x 5 = 39 250 kg/m^2'] = close(LIT.sigmaCap * ctx.params.matter.kineticResistance.value, a.rounds[0].r[0], 1e-12) && a.rounds[0].stoppedIn === 0;
    }
    return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ') };
  },
  display(r) {
    const a = r.actual, k = r.case.kind;
    if (a.error) return { expected: k, actual: `error ${a.error}` };
    if (k === 'beam') return { expected: `F ${r.expected.fractions.map((x) => x.toPrecision(12)).join(' ')}; plate ${r.expected.plate.toPrecision(12)}`, actual: `F ${a.fractions.map((x) => x.toPrecision(12)).join(' ')}; hold heat ${a.heat.toFixed(3)} J; plate ${a.plate.toPrecision(12)}; cos ${a.cos}` };
    if (k === 'ruin') return { expected: `hole in step ${r.expected.step} (q m / P = ${r.expected.tRuin} s)`, actual: `hole in step ${a.step} at ${a.t.toPrecision(12)} s; hold C ${a.after.C} J/K, vented ${(a.after.vented - a.before.vented).toFixed(3)} J` };
    if (k === 'capacity') return { expected: `C ${r.expected.C} J/K, dT ${r.expected.dT.toExponential(6)} K`, actual: `C ${a.C0} J/K, dT ${(a.b1.T - a.T0).toExponential(6)} K; after the mount cell: C ${a.after.C} J/K, vented ${(a.after.vented - a.b1.vented).toFixed(3)} J` };
    if (k === 'mount') return { expected: `plate heat and C in ${r.case.on}`, actual: `gain A ${a.gain.A.toFixed(1)} J, B ${a.gain.B.toFixed(1)} J; C A ${a.C.A}, B ${a.C.B} J/K` };
    return { expected: r.expected.rounds.map((x) => `stop ${x.stoppedIn}, plate ${x.plate.toFixed(6)}`).join('; '), actual: a.rounds.map((x) => `stop ${x.stoppedIn}, plate ${x.plate.toFixed(6)}, r0 ${x.r[0].toExponential(6)}, heat ${x.heat.toFixed(1)} J, C ${x.after.C}`).join('; ') };
  },
};
