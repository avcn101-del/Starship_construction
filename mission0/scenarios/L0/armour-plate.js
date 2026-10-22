import { createWorld, addRoom, addFitting, fireRound, fireBeam, beamEnergy, pathAlong } from '../../../js/rooms.js';
import { beamDeposit } from '../../../js/damage.js';
import { roundGeometry } from '../../../js/projectile.js';
import { withOverrides } from '../../../js/data.js';

const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));

// A T1 cluster: an M hold at cell (0, 0) (cells (0, 0), (1, 0), (0, 1), (1, 1)) with an armour plate on its hull
// edge at the grid's border, cell (0, 0) side -x. The line runs along row y = 0 from -x: grid cells (-1, 0) (off
// the grid), (0, 0), (1, 0), (2, 0) (empty), so pathAlong gives [plate, hold cell 0, hold cell 1].
const LINE = [[-1, 0], [0, 0], [1, 0], [2, 0]];
// Cases: d the plate's thickness (armour.plateThickness, run-time params; 0.2 m the approved value, 0.1 m so an
// M round passes it, 0.01 m so a beam crosses it), chord the plate entry's, rounds how many M rounds in turn.
const CASES = [
  { kind: 'round', d: 0.2, chord: 1, rounds: 1 },
  { kind: 'round', d: 0.2, chord: Math.SQRT1_2, rounds: 1 },
  { kind: 'round', d: 0.1, chord: 1, rounds: 1 },
  { kind: 'round', d: 0.1, chord: 1, rounds: 4 },
  { kind: 'beam', d: 0.2, chord: 1 },
  { kind: 'beam', d: 0.2, chord: Math.SQRT1_2 },
  { kind: 'beam', d: 0.01, chord: 1 },
];
const ironBeam = (f) => ({ protonRest: f.protonRestEnergy.value, electronRest: f.electronRestEnergy.value, K: f.betheK.value, ZA: f.ironZOverA.value, I: f.ironMeanExcitation.value, lambda: f.ironInteractionLength.value });

function build(ctx, d) {
  const params = withOverrides({ 'armour.plateThickness': d });
  const world = createWorld({ params, edge: ctx.tiers.T1.edge, dt: ctx.dt, grid: ctx.tiers.T1.grid });
  const hold = addRoom(world, 'hold', { id: 'hold', cell: [0, 0] });
  const plate = addFitting(world, 'armour', 'hold', [0, 0], [-1, 0]);
  return { world, hold, plate };
}

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

export default {
  id: 'L0.armour.plate',
  level: 'L0',
  laws: ['an armour plate on a wall segment meets a path once with sigma = d x steel density, by the chord rule (#255, #256, 13l.1)', 'the plate resists a round as a cell does (r = c sigma chord), loses 1 / kinetic.hitsToWreck per passing round and becomes a hole (13l.1)', 'a beam deposits in the plate (beamDeposit with its sigma) and the heat goes to the room it is mounted on (13l.1)'],
  dependsOn: ['L0.kinetic.chord', 'L0.kinetic.flatten'],
  setup: 'a T1 cluster: an M hold at cell (0, 0) with an armour plate (the kernel\'s addFitting \'armour\') of armour.plateThickness d = 0.2 m (approved), 0.1 m or 0.01 m (run-time params) on its hull edge at cell (0, 0), side -x; the path along row y = 0 from -x built by the kernel\'s pathAlong, the plate entry at chord 1 or 1/sqrt 2; M rounds (one, or four in turn) by fireRound, or one step of a 5 MW beam of an N = 2 bay\'s energy by fireBeam (13l.4 A9)',
  measure: 'per round: the path (pathAlong), the resistance and sectional momentum each entry took, where the round stopped, the plate\'s integrity, the hold\'s heat and cells; per beam step: the fractions each entry received and the hold\'s heat',
  tolerance: 'closed forms 1e-12; the hand-worked literals 1e-12 (sigma, r) and 1e-9 (the derived ones)',
  criterion: 'the path is [plate, hold cell 0, hold cell 1] (the plate before the cell, on the segment the line crosses). Hand-worked: sigma = 0.2 x 7850 = 1570 kg/m^2 (0.1 m: 785; 0.01 m: 78.5), r = c sigma chord with c = matter.kineticResistance (1545.4 m/s): 2.4263e6 (chord 1), 1.7157e6 (1/sqrt 2), 1.2131e6 (0.1 m) kg/(m s); an M round (6 kg, 800 m/s, s0 = 1.568e6) stops in the 0.2 m plate at either chord (s0 < r), taking s0, the plate losing (s0 / r) / 3 of its integrity and the hold taking all 1.92 MJ as heat; through 0.1 m it passes (the plate takes r and loses 1/3), then crosses the hold\'s cells by the round rule (the scenario\'s own loop, re-statement); four rounds through 0.1 m: the plate at 2/3, 1/3, a hole after the third (plate-destroyed), the fourth meets sigma 0 there. The beam (5 MW, 100 MeV from an N = 2 bay): the plate takes F = beamDeposit(E, [sigma chord, 120, 120])[0] of P (re-statement through the kernel\'s pure beamDeposit); at 0.2 m F = 1 exactly (the CSDA range of 100 MeV in iron, 112.6 kg/m^2, is less than 1570 x 1/sqrt 2), so the hold gains P dt of heat per step and its cells nothing; the plate is not burnt (13l.1 names no burn for a plate) (#255, #256)',
  tunable: ['armour.plateThickness', 'matter.kineticResistance', 'kinetic.roundMass', 'kinetic.muzzleVelocity', 'kinetic.hitsToWreck', 'beam.power', 'beam.gradient'],
  locked: null,
  cases() {
    return CASES.map((x) => ({ ...x }));
  },
  expected(ctx, c) {
    const f = ctx.fixed, c0 = ctx.params.matter.kineticResistance.value, sigma = c.d * 7850, hits = 3;
    if (c.kind === 'beam') {
      const E = 100 * 1.602176634e-13, dep = beamDeposit(E, [sigma * c.chord, 120, 120], ironBeam(f));
      return { sigma, fractions: dep.fractions, heatPerStep: 5e6 * (dep.fractions[0] + dep.fractions[1] + dep.fractions[2]) * ctx.dt, literalF: c.d === 0.2 ? 1 : null };
    }
    const m = 6, v = 800, D = Math.cbrt((4 * m) / (Math.PI * 7850 * 4)), A0 = (Math.PI * D * D) / 4, s0 = (m * v) / A0, S = c0 * (m / A0);
    const rHold = c0 * (3000 / 25), out = [];
    let integrity = 1, holdLeft = [1, 1];
    for (let k = 0; k < c.rounds; k++) {
      const rPlate = integrity > 0 ? c0 * sigma * c.chord : 0, r = [rPlate, holdLeft[0] > 0 ? rHold : 0, holdLeft[1] > 0 ? rHold : 0];
      const res = ownRound(m * v, A0, S, r);
      const loss = (i) => (r[i] === 0 ? 0 : (res.stoppedIn === -1 || i < res.stoppedIn ? 1 : res.taken[i] / r[i]) / hits);
      { const L = loss(0); integrity = integrity - L > 1e-12 ? integrity - L : 0; }
      for (const i of [1, 2]) if (i < res.taken.length) { const L = loss(i); holdLeft[i - 1] = holdLeft[i - 1] - L > 1e-12 ? holdLeft[i - 1] - L : 0; }
      out.push({ r, taken: res.taken, stoppedIn: res.stoppedIn, plate: integrity });
    }
    return { sigma, s0, rounds: out, literal: { sigma: { 0.2: 1570, 0.1: 785 }[c.d], r: c0 * { 0.2: 1570, 0.1: 785 }[c.d] * c.chord } };
  },
  run(ctx, c) {
    const { world, hold, plate } = build(ctx, c.d), f = ctx.fixed, edge = ctx.tiers.T1.edge;
    const path = pathAlong(world, LINE).map((x) => (x.plate ? { ...x, chord: c.chord } : x));
    const shape = path.map((x) => (x.plate ? 'plate' : `hold:${x.cell}`));
    const Q0 = hold.heat.generated;
    if (c.kind === 'beam') {
      const energy = beamEnergy(world, { length: 2 }), res = fireBeam(world, { power: ctx.scaled(ctx.params.beam.power, edge), energy }, path, 'beam');
      return { shape, sigma: plate.thickness * f.steelDensity.value, energy, fractions: res.fractions, heat: hold.heat.generated - Q0, plate: plate.integrity, cells: hold.cells.map((x) => x.integrity) };
    }
    const m = ctx.scaled(ctx.params.kinetic.roundMass, edge), v = ctx.scaled(ctx.params.kinetic.muzzleVelocity, edge), { A } = roundGeometry(m, f.steelDensity.value, f.roundLengthToDiameter.value);
    const rounds = [];
    for (let k = 0; k < c.rounds; k++) {
      const h0 = hold.heat.generated, res = fireRound(world, { mass: m, velocity: v, area: A }, path, `round-${k + 1}`);
      rounds.push({ r: res.r, taken: res.absorbed, stoppedIn: res.stoppedIn, plate: plate.destroyed ? 0 : plate.integrity, heat: hold.heat.generated - h0, s0: res.s0 });
    }
    const destroyedAt = world.log.events.filter((e) => e.type === 'plate-destroyed').map((e) => e.cause);
    return { shape, sigma: plate.thickness * f.steelDensity.value, rounds, destroyedAt, mass: plate.mass };
  },
  compare(e, a, c) {
    const checks = { 'path: plate, then the hold\'s cells in order': a.shape.join(' ') === 'plate hold:0 hold:1', 'sigma = d x 7850 (hand-worked)': close(c.d * 7850, a.sigma, 1e-12) };
    if (c.kind === 'beam') {
      Object.assign(checks, {
        'fractions = beamDeposit(E, [sigma chord, 120, 120]) (re-statement)': e.fractions.every((F, i) => Math.abs(F - a.fractions[i]) <= 1e-12),
        'heat in the hold = P sum F dt': close(e.heatPerStep, a.heat, 1e-12),
        'the plate is not burnt': a.plate === 1,
        ...(e.literalF !== null ? { 'hand-worked: F = 1 in the 0.2 m plate, the hold\'s cells untouched': a.fractions[0] === 1 && a.cells.every((x) => x === 1) } : { 'the thin plate lets part of the beam through': a.fractions[0] < 1 && a.fractions[1] > 0 }),
      });
    } else {
      Object.assign(checks, {
        'each round by the round rule with r = c sigma chord (re-statement)': e.rounds.every((x, k) => a.rounds[k] && x.stoppedIn === a.rounds[k].stoppedIn && x.r.every((r, i) => close(r, a.rounds[k].r[i], 1e-12) || (r === 0 && a.rounds[k].r[i] === 0)) && x.taken.every((t, i) => close(t, a.rounds[k].taken[i], 1e-12) || (t === 0 && a.rounds[k].taken[i] === 0))),
        'the plate\'s integrity after each round': e.rounds.every((x, k) => (x.plate === 0 ? a.rounds[k].plate === 0 : close(x.plate, a.rounds[k].plate, 1e-12))),
        'hand-worked sigma and r of the plate': close(e.literal.sigma, a.sigma, 1e-12) && close(e.literal.r, a.rounds[0].r[0], 1e-12),
        'the plate\'s mass d x 7850 x 25': close(c.d * 7850 * 25, a.mass, 1e-12),
      });
      if (c.d === 0.2) checks['hand-worked: stops in the plate, taking s0, the hold heated by 1.92 MJ'] = a.rounds[0].stoppedIn === 0 && close(a.rounds[0].s0, a.rounds[0].taken[0], 1e-12) && close(1.92e6, a.rounds[0].heat, 1e-12);
      if (c.rounds === 4) checks['a hole after the third round; the fourth meets sigma 0'] = a.destroyedAt.length === 1 && a.destroyedAt[0] === 'round-3' && a.rounds[3].r[0] === 0;
    }
    return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ') };
  },
  display(r) {
    const a = r.actual;
    if (r.case.kind === 'beam') return { expected: `F ${r.expected.fractions.map((x) => x.toPrecision(12)).join(' ')}`, actual: `F ${a.fractions.map((x) => x.toPrecision(12)).join(' ')}; hold heat ${a.heat.toFixed(3)} J; plate ${a.plate}` };
    return { expected: r.expected.rounds.map((x) => `stop ${x.stoppedIn}, plate ${x.plate.toFixed(6)}`).join('; '), actual: a.rounds.map((x) => `stop ${x.stoppedIn}, plate ${x.plate.toFixed(6)}, r0 ${x.r[0].toExponential(6)}, heat ${x.heat.toFixed(1)} J`).join('; ') };
  },
};
