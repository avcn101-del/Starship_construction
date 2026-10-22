import { createWorld, addRoom, addFitting, fireRound, pathAlong, cellArealDensity } from '../../../js/rooms.js';
import { roundGeometry } from '../../../js/projectile.js';

// M2 of the L5 plan (DESIGN.md 13n.4, #281 (2), #285): the turret by its mount. A turret cell is structure.cellMass +
// turret.machineryMass (3000 + 1975 = 4975 kg at T1: the OTO Melara 76/62 Super Rapid's 7.9 t over an M turret's four
// cells) in place of cellMass.crewed's 14 800 kg, so an M round that stopped in the turret's second cell now passes both.
// A T1 cluster, an M turret alone at cell (0, 0) (cells (0, 0), (1, 0), (0, 1), (1, 1)); the line along row y = 0 from
// -x: grid cells (-1, 0) (off the grid), (0, 0), (1, 0), (2, 0) (empty), so the kernel's pathAlong gives [turret cell 0,
// turret cell 1]; with an armour plate of armour.plateThickness (0.2 m, R1d's turret plates, 13l.2) on the turret's hull
// edge at cell (0, 0), side -x, it gives [plate, turret cell 0, turret cell 1]. The L0 lock hashes cases, expected,
// compare and invariants but not helpers (#175), so the hand-work lives inside expected().
//
// Hand-worked (13i.1, by the formula, not from a printed value), an M round of m = 6 kg at v = 800 m/s:
//   sigma = (3000 + 1975) / 25 = 199 kg/m^2; c = matter.kineticResistance = 1545.364 m/s; r = c sigma = 307 527.5 kg/(m s).
//   D = (4 m / (pi rho_steel 4))^(1/3) = (24 / (pi 7850 4))^(1/3) = 0.0624277 m, A0 = pi D^2 / 4 = 3.060866e-3 m^2,
//   L = 4 D = 0.249711 m, S = c rho_steel L = 1545.364 x 7850 x 0.249711 = 3.029268e6 kg/(m s); r / S = 0.1015187.
//   cell 0: s0 = m v / A0 = 4800 / 3.060866e-3 = 1.568183e6 > r and 0 + r / S < 1: it passes; p1 = 4800 - r A0 =
//     4800 - 941.300 = 3858.700 kg m/s; f1 = 0.1015187, A1 = A0 / (1 - f1) = 3.406709e-3 m^2.
//   cell 1: s1 = p1 / A1 = 1.132676e6 > r and 2 r / S = 0.2030375 < 1: it passes; p2 = p1 - r A1 = 3858.700 - 1047.658
//     = 2811.042 kg m/s: it exits at p2 / m = 468.507 m/s, in closed form v_exit = (m v - r A0 (1 + 1 / (1 - r / S))) / m.
//   (With cellMass.crewed's 14 800 kg: sigma 592, r = 914 856, p1 = 4800 - 2800.25 = 1999.75 kg m/s, A1 = A0 / (1 -
//   0.302003), s1 = 4.5602e5 < r: the round passed cell 0 and stopped in cell 1, #281 (2).)
//   the plate first: sigma = 0.2 x 7850 = 1570 kg/m^2, r = c sigma = 2.426222e6 > s0 = 1.568183e6: it stops in the plate
//   (entry 0), the turret's cells untouched.

export default {
  id: 'L0.turret.mount',
  level: 'L0',
  laws: ['a turret cell is structure.cellMass + turret.machineryMass, its matter on a path sigma = that / edge^2 (#281 (2), #285, 13i.1)', 'the round rule (13i.1): an M round passes a cell while s = p / A > r = c sigma and f + r / S < 1'],
  dependsOn: ['L0.kinetic.chord.loss.v2', 'L0.armour.plate.v2'],
  setup: 'a T1 cluster, an M turret alone at cell (0, 0); an M round (kinetic.roundMass 6 kg, kinetic.muzzleVelocity 800 m/s) by the kernel\'s fireRound off a ship along row y = 0 from -x, path by pathAlong: (turret) the turret\'s two cells; (plate) an armour plate of armour.plateThickness 0.2 m on the turret\'s hull edge at cell (0, 0), side -x, first (R1d\'s turret plate, 13l.2) (13n.4 M2)',
  measure: 'the kernel\'s sigma of a turret cell (cellArealDensity); the path\'s shape; the resistances r per entry; the entries passed and the entry the round stops in; the momentum on exit over m',
  tolerance: 'sigma and r 1e-12 relative; the exit speed against the closed form 1e-12 relative and against the hand-worked literal 468.507 m/s to 0.001 m/s; counts exact',
  criterion: 'hand-worked: sigma = (3000 + 1975) / 25 = 199 kg/m^2 and r = c sigma = 307 527.5 kg/(m s) at T1; (turret) the round passes both turret cells (passed 2, no stop) and exits at v_exit = (m v - r A0 (1 + 1 / (1 - r / S))) / m = 468.507 m/s (A0 = 3.060866e-3 m^2, S = 3.029268e6 kg/(m s); the arithmetic in the file\'s comments); (plate) the 0.2 m plate resists c x 1570 = 2.426222e6 kg/(m s) > s0 = 1.568183e6: the round stops in entry 0, the plate, and passes nothing (#281 (2), #285)',
  tunable: ['structure.cellMass', 'turret.machineryMass', 'matter.kineticResistance', 'kinetic.roundMass', 'kinetic.muzzleVelocity', 'armour.plateThickness'],
  locked: null,
  cases() {
    return [{ through: 'turret' }, { through: 'plate' }];
  },
  expected(ctx, c) {
    // Hand-worked literals (the file's comments) and the closed form; the closed form reads the constants it names.
    const p = ctx.params, fx = ctx.fixed, m = p.kinetic.roundMass.value, v = p.kinetic.muzzleVelocity.value, cR = p.matter.kineticResistance.value;
    const D = Math.cbrt((4 * m) / (Math.PI * fx.steelDensity.value * fx.roundLengthToDiameter.value)), A0 = (Math.PI * D * D) / 4;
    const S = cR * fx.steelDensity.value * fx.roundLengthToDiameter.value * D, sigma = (3000 + 1975) / 25, r = cR * sigma;
    if (c.through === 'turret') return { sigma, sigmaLiteral: 199, r: [r, r], passed: 2, stoppedIn: -1, exit: (m * v - r * A0 * (1 + 1 / (1 - r / S))) / m, exitLiteral: 468.507 };
    const rPlate = cR * 0.2 * 7850;
    return { sigma, sigmaLiteral: 199, r: [rPlate, r, r], s0: (m * v) / A0, passed: 0, stoppedIn: 0, exit: 0 };
  },
  run(ctx, c) {
    const f = ctx.fixed, edge = ctx.tiers.T1.edge;
    const world = createWorld({ params: ctx.params, edge, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const turret = addRoom(world, 'turret', { id: 'turret', cell: [0, 0] });
    if (c.through === 'plate') addFitting(world, 'armour', 'turret', [0, 0], [-1, 0]);
    const path = pathAlong(world, [[-1, 0], [0, 0], [1, 0], [2, 0]], null, null);
    const m = ctx.scaled(ctx.params.kinetic.roundMass, edge), v = ctx.scaled(ctx.params.kinetic.muzzleVelocity, edge);
    const { A } = roundGeometry(m, f.steelDensity.value, f.roundLengthToDiameter.value);
    const sigma = cellArealDensity(world, turret, 0);
    const res = fireRound(world, { mass: m, velocity: v, area: A, direction: [1, 0] }, path, 'round-1');
    return { sigma, shape: path.map((x) => (x.plate ? 'plate' : `${x.room.id}:${x.cell}`)), r: res.r, s0: res.s0, passed: res.passed, stoppedIn: res.stoppedIn, exit: res.momentum / m, cells: turret.cells.map((x) => x.integrity) };
  },
  compare(e, a, c) {
    const close = (x, y, tol) => Number.isFinite(y) && Math.abs(y - x) <= tol * Math.max(Math.abs(x), Math.abs(y));
    const checks = {
      'sigma of a turret cell 199 kg/m^2 (hand-worked)': close(e.sigmaLiteral, a.sigma, 1e-12) && close(e.sigma, a.sigma, 1e-12),
      'the path': JSON.stringify(a.shape) === JSON.stringify(c.through === 'turret' ? ['turret:0', 'turret:1'] : ['plate', 'turret:0', 'turret:1']),
      'r per entry (hand-worked)': a.r.length === e.r.length && e.r.every((x, i) => close(x, a.r[i], 1e-12)),
      'entries passed and the stop': a.passed === e.passed && a.stoppedIn === e.stoppedIn,
    };
    if (c.through === 'turret') {
      checks['exit speed by the round rule (closed form, 1e-12)'] = close(e.exit, a.exit, 1e-12);
      checks['exit speed 468.507 m/s (hand-worked, 0.001 m/s)'] = Math.abs(a.exit - e.exitLiteral) <= 1e-3;
    } else {
      checks['the plate resists more than s0: it stops there, nothing exits'] = e.r[0] > e.s0 && close(e.s0, a.s0, 1e-12) && a.exit === 0 && a.cells.every((x) => x === 1);
    }
    return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ') };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    return { expected: `sigma ${e.sigmaLiteral}; r ${e.r.map((x) => x.toFixed(1)).join(', ')}; passed ${e.passed}, stop ${e.stoppedIn}; exit ${e.exit.toFixed(6)} m/s`, actual: `sigma ${a.sigma}; path ${a.shape.join(' > ')}; r ${a.r.map((x) => x.toFixed(1)).join(', ')}; passed ${a.passed}, stop ${a.stoppedIn}; exit ${a.exit.toFixed(6)} m/s; cells ${a.cells.map((x) => x.toFixed(4)).join(' ')}` };
  },
};
