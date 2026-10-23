import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, readout, fireRound } from '../../../js/rooms.js';
import { roundGeometry } from '../../../js/projectile.js';

const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
/**
 * Momentum books (13f.3), summed here from the ship's state: mass, momentum, angular momentum about the world
 * origin and kinetic energy of every body, debris piece and round, with the external impulse booked. Between two
 * snapshots, mass is kept, P - J is kept to 1e-9 of the largest magnitude that enters it (1e-12 absolute floor),
 * and L - H to 1e-9 of the largest net magnitude plus 1e-12 of the gross angular impulse (#219, #220).
 */
function snapshot(world) {
  const s = world.ship;
  let M = 0, px = 0, py = 0, L = 0, K = 0, sp = 0, sl = 0;
  const add = (m, x, v, spin, w) => {
    const l = m * (x[0] * v[1] - x[1] * v[0]);
    M += m; px += m * v[0]; py += m * v[1]; L += l + spin * w; K += 0.5 * m * (v[0] * v[0] + v[1] * v[1]) + 0.5 * spin * w * w;
    sp += m * Math.hypot(v[0], v[1]); sl += Math.abs(l) + Math.abs(spin * w);
  };
  for (const b of s.bodies) add(b.M, b.x, b.v, b.I, b.omega);
  for (const d of s.debris) add(d.m, d.x, d.v, d.spin, d.omega);
  for (const r of s.rounds) add(r.m, r.x, r.v, 0, 0);
  return { M, P: [px, py], L, K, sp, sl, J: [...s.external.J], H: s.external.H, Hgross: s.external.Hgross };
}
function momentumOk(a, b) {
  const dJ = [b.J[0] - a.J[0], b.J[1] - a.J[1]], dH = b.H - a.H;
  const dP = Math.hypot(b.P[0] - a.P[0] - dJ[0], b.P[1] - a.P[1] - dJ[1]), dL = Math.abs(b.L - a.L - dH);
  const net = Math.max(a.sl, b.sl, Math.abs(dH)), gross = b.Hgross - a.Hgross;
  return {
    mass: Math.abs(b.M - a.M) <= 1e-12 * a.M,
    momentum: dP <= 1e-9 * Math.max(a.sp, b.sp, Math.hypot(dJ[0], dJ[1])) + 1e-12,
    angular: dL <= 1e-9 * net + 1e-12 * gross + 1e-12,
    dP, dL, net, gross,
  };
}
// R1, the reference ship (13f.2): x forward, the T1 drydock grid; cells [x0, x1) x [y0, y1); the engine (2 x 3)
// rotated 90 degrees so it spans [0, 3) x [2, 4) with its exhaust at x = 0.
const R1_ROOMS = [
  { id: 'engine', type: 'engine', cell: [0, 2], rotation: 90 }, { id: 'reactor', type: 'reactor', cell: [3, 2] },
  { id: 'bridge', type: 'bridge', cell: [5, 2] }, { id: 'magazine', type: 'magazine', cell: [7, 2] },
  { id: 'beamBay', type: 'beamBay', cell: [9, 2] }, { id: 'heatSink', type: 'heatSink', cell: [3, 4] },
  { id: 'quarters', type: 'quarters', cell: [5, 4] }, { id: 'turret', type: 'turret', cell: [8, 4] },
  { id: 'shield', type: 'shieldGenerator', cell: [3, 0] }, { id: 'hold', type: 'hold', cell: [7, 0] },
];
// One fitting per open edge: 17 radiators, then 4 RCS (fitting ids 17-20).
const R1_FITTINGS = [
  ['radiator', 'engine', [1, 3], [0, 1]], ['radiator', 'engine', [2, 3], [0, 1]], ['radiator', 'engine', [1, 2], [0, -1]], ['radiator', 'engine', [2, 2], [0, -1]],
  ['radiator', 'heatSink', [3, 5], [0, 1]], ['radiator', 'heatSink', [4, 5], [0, 1]], ['radiator', 'heatSink', [3, 4], [-1, 0]], ['radiator', 'heatSink', [3, 5], [-1, 0]],
  ['radiator', 'shield', [3, 0], [0, -1]], ['radiator', 'shield', [4, 0], [0, -1]], ['radiator', 'shield', [3, 0], [-1, 0]], ['radiator', 'shield', [3, 1], [-1, 0]],
  ['radiator', 'shield', [4, 0], [1, 0]], ['radiator', 'shield', [4, 1], [1, 0]],
  ['radiator', 'beamBay', [10, 2], [1, 0]], ['radiator', 'beamBay', [10, 3], [1, 0]], ['radiator', 'beamBay', [9, 2], [0, -1]],
  ['rcs', 'engine', [0, 3], [0, 1]], ['rcs', 'engine', [0, 2], [0, -1]], ['rcs', 'beamBay', [10, 3], [0, 1]], ['rcs', 'beamBay', [10, 2], [0, -1]],
];
// R1c (13l.2, #256): R1 with an armour plate on each of the 8 wall segments around its magazine [7, 9) x [2, 4).
const R1C_PLATES = [
  ['armour', 'magazine', [7, 2], [-1, 0]], ['armour', 'magazine', [7, 3], [-1, 0]], ['armour', 'magazine', [8, 2], [1, 0]], ['armour', 'magazine', [8, 3], [1, 0]],
  ['armour', 'magazine', [7, 2], [0, -1]], ['armour', 'magazine', [8, 2], [0, -1]], ['armour', 'magazine', [7, 3], [0, 1]], ['armour', 'magazine', [8, 3], [0, 1]],
];
// Successor of L3.r1c.props (#285, DESIGN.md 13n.4 M1): the turret by its mount. R1c's mass properties at T1,
// hand-worked from the cell masses (the original's were printed by tools/estimates/l4.mjs; the same sums with the turret
// at 14 800 kg give them to their last digits): R1's cells and fittings as L3.r1.pinned.v2 writes them out (the turret's
// four cells 3000 + 1975 = 4975 kg; R1 911 234.0573 kg) plus the 8 plates of R1C_PLATES, each 0.2 x 7850 x 25 = 39 250 kg
// as a point mass at its segment's midpoint ((35, 12.5), (35, 17.5), (45, 12.5), (45, 17.5),
// (37.5, 10), (42.5, 10), (37.5, 20), (42.5, 20) m): M = 911 234.0573 + 314 000 = 1 225 234.0573 kg; centre
// = sum m p / M = (27.532010, 15.597919) m; I = sum m (a^2 / 6 + d^2) = 1.68909391e8 kg m^2; g = 1.5e7 / (M x 9.80665)
// = 1.248394 (1.24839 to 6 figures).
const R1C = { M: 1225234.0573339704, c: [27.532009859471717, 15.597918878400893], I: 168909391.4338033, g: 1.24839 };
const PLATE = { cell: [7, 2], side: [0, -1], p: [37.5, 10], m: 39250 }; // the plate under the magazine's cell (7, 2): midpoint (7.5 x 5, 2 x 5) m

function buildR1c(ctx) {
  const edge = ctx.tiers.T1.edge;
  const world = createWorld({ params: ctx.params, edge, dt: ctx.dt, grid: ctx.tiers.T1.grid });
  for (const r of R1_ROOMS) addRoom(world, r.type, { id: r.id, cell: r.cell, rotation: r.rotation || 0 });
  for (const [type, room, cell, side] of [...R1_FITTINGS, ...R1C_PLATES]) addFitting(world, type, room, cell, side);
  const room = (id) => world.rooms.find((r) => r.id === id);
  loadMagazine(world, room('magazine'), { heMass: ctx.scaled(ctx.params.magazine.capacity, edge) });
  loadTurret(room('turret'), ctx.params.turret.readyRounds.value);
  room('turret').turret.hold = true;
  enableShip(world);
  return { world, room };
}

export default {
  id: 'L3.r1c.props.v2',
  level: 'L3',
  laws: ['an armour plate\'s mass, d x steel density x edge^2, joins the body of the room it is mounted on (centre, inertia) and leaves as debris when it is wrecked (#255, #256, 13l.1)'],
  dependsOn: ['L3.mass.props.v6', 'L0.armour.plate'],
  setup: 'R1c at T1 (13l.2: R1 of 13f.2 with an armour plate of armour.plateThickness on each of the 8 wall segments around its magazine [7, 9) x [2, 4)), magazine full of HE, the turret\'s ready store full, at rest; (intact) its readout; (wrecked) M rounds fired by fireRound at the plate under the magazine\'s cell (7, 2) alone (a path of that plate entry, direction +y), one after another until it is a hole (13l.4 A10)',
  measure: 'readout\'s mass, acceleration, centre and inertia; after the plate is wrecked, the body\'s mass, centre and inertia, the debris and the momentum books',
  tolerance: 'mass and acceleration 1e-12 (the mass within its own float); centre and inertia 1e-12; books 1e-9 x the gross',
  criterion: 'literals hand-worked from the cell masses in the file\'s comments: mass 1 225 234.057 kg (R1\'s 911 234.057 with the turret by its mount + 8 x 0.2 x 7850 x 25 = 314 000 kg), 1.24839 g (engine.thrust 15 MN over the mass, to 6 figures), centre (27.5320099, 15.5979189) m and inertia 1.689093914e8 kg m^2 (the plates at their segments\' midpoints); wrecked: each M round stops in the plate and costs it (s0 / r) / 3 (L0.armour.plate), so it is a hole after the 5th (5 x 0.2154 > 1); the body then holds R1c\'s mass less 39 250 kg, the debris piece holds 39 250 kg, and the body\'s centre and inertia are R1c\'s less a point mass of 39 250 kg at (37.5, 10) m by the parallel-axis rule (hand-worked from the literals, 1e-9); mass and momentum books close (#255, #256). Successor of L3.r1c.props (#285, 13n.4 M1): the turret by its mount; every check of L3.r1c.props kept',
  tunable: ['armour.plateThickness', 'engine.thrust', 'structure.cellMass', 'turret.machineryMass'],
  locked: { date: '2026-10-22', hash: '1aed580e' },
  cases() {
    return [{ part: 'intact' }, { part: 'wrecked' }];
  },
  expected(ctx, c) {
    if (c.part === 'intact') return { ...R1C };
    const M = R1C.M - PLATE.m, cx = [(R1C.M * R1C.c[0] - PLATE.m * PLATE.p[0]) / M, (R1C.M * R1C.c[1] - PLATE.m * PLATE.p[1]) / M];
    const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
    return { M, c: cx, I: R1C.I + R1C.M * d2(R1C.c, cx) - PLATE.m * d2(PLATE.p, cx), debris: PLATE.m, rounds: 5 };
  },
  run(ctx, c) {
    const { world } = buildR1c(ctx);
    if (c.part === 'intact') { const r = readout(world); return { M: r.mass, c: r.centre, I: r.inertia, g: r.accelerationG }; }
    const plate = world.fittings.find((f) => f.type === 'armour' && f.cell[0] === PLATE.cell[0] && f.cell[1] === PLATE.cell[1] && f.side[1] === PLATE.side[1]);
    const edge = ctx.tiers.T1.edge, f = ctx.fixed, m = ctx.scaled(ctx.params.kinetic.roundMass, edge), v = ctx.scaled(ctx.params.kinetic.muzzleVelocity, edge);
    const { A } = roundGeometry(m, f.steelDensity.value, f.roundLengthToDiameter.value);
    const start = snapshot(world);
    let rounds = 0;
    while (!plate.destroyed && rounds < 20) { fireRound(world, { mass: m, velocity: v, area: A, direction: [0, 1] }, [{ plate }], `round-${++rounds}`); }
    const b = world.ship.bodies[0], debris = world.ship.debris.filter((x) => x.from === `fit:${plate.id}`);
    return { rounds, M: b.M, c: b.c, I: b.I, bodies: world.ship.bodies.length, debris: debris.reduce((x, y) => x + y.m, 0), momentum: momentumOk(start, snapshot(world)) };
  },
  compare(e, a, c) {
    const checks = {
      'mass (hand-worked)': close(e.M, a.M, 1e-12),
      'centre (hand-worked)': close(e.c[0], a.c[0], c.part === 'intact' ? 1e-12 : 1e-9) && close(e.c[1], a.c[1], c.part === 'intact' ? 1e-12 : 1e-9),
      'inertia (hand-worked)': close(e.I, a.I, c.part === 'intact' ? 1e-12 : 1e-9),
    };
    if (c.part === 'intact') checks['acceleration 1.24839 g (6 figures)'] = Math.abs(a.g - e.g) < 5e-6;
    else Object.assign(checks, {
      'a hole after the 5th round': a.rounds === e.rounds,
      'its 39 250 kg left as debris; one body': close(e.debris, a.debris, 1e-12) && a.bodies === 1,
      'mass and momentum books close': a.momentum.mass && a.momentum.momentum && a.momentum.angular,
    });
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    const f = (x) => `M ${x.M.toFixed(6)} kg, c (${x.c.map((v) => v.toFixed(9)).join(', ')}) m, I ${x.I.toExponential(12)}`;
    return { expected: f(e), actual: `${f(a)}${a.g !== undefined ? `, ${a.g.toFixed(6)} g` : `; ${a.rounds} rounds, debris ${a.debris} kg`}` };
  },
};
