import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, enablePowerRouting, step, cull, cellAt, destroyCell } from '../../../js/rooms.js';

// S14 of physics pass 2 (DESIGN.md 13k.4): culling (13k.1, #222 (7)). R1 at T1 at rest; (round) its turret fires one
// round broadside (+y) and holds; (debris) a hold cell is destroyed at the start and R1 runs its engine at full
// spinning at 1 rad/s, so the cell's debris flies off along the tangent. The kernel's cull() is called after every step.
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
/** Build R1 in the kernel at `tier`: magazine full of HE, the turret's ready store full and holding fire; `setup(world, room)` before enableShip. */
function buildR1(ctx, { tier = 'T1', velocity = [0, 0], omega = 0, heading = 0, routing = null, setup = null } = {}) {
  const edge = ctx.tiers[tier].edge;
  const world = createWorld({ params: ctx.params, edge, dt: ctx.dt, grid: ctx.tiers[tier].grid });
  for (const r of R1_ROOMS) addRoom(world, r.type, { id: r.id, cell: r.cell, rotation: r.rotation || 0 });
  for (const [type, room, cell, side] of R1_FITTINGS) addFitting(world, type, room, cell, side);
  const room = (id) => world.rooms.find((r) => r.id === id);
  loadMagazine(world, room('magazine'), { heMass: ctx.scaled(ctx.params.magazine.capacity, edge) });
  loadTurret(room('turret'), ctx.params.turret.readyRounds.value);
  room('turret').turret.hold = true;
  if (routing) enablePowerRouting(world, routing);
  if (setup) setup(world, room);
  enableShip(world, { velocity, omega, heading });
  return { world, room };
}
const LIMIT = 400; // s
const cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];
/** Mass, momentum, angular momentum about the origin of bodies + debris + rounds + what left play, with the gross magnitudes and the external impulse. */
function books(world) {
  const s = world.ship, left = s.left || { m: 0, P: [0, 0], L: 0 };
  let M = left.m, px = left.P[0], py = left.P[1], L = left.L, sp = Math.hypot(...left.P), sl = Math.abs(left.L);
  const add = (m, x, v, spin, w) => { const l = m * cross2(x, v); M += m; px += m * v[0]; py += m * v[1]; L += l + spin * w; sp += m * Math.hypot(v[0], v[1]); sl += Math.abs(l) + Math.abs(spin * w); };
  for (const b of s.bodies) add(b.M, b.x, b.v, b.I, b.omega);
  for (const d of s.debris) add(d.m, d.x, d.v, d.spin, d.omega);
  for (const r of s.rounds) add(r.m, r.x, r.v, 0, 0);
  return { M, P: [px, py], L, sp, sl, J: [...s.external.J], H: s.external.H, Hgross: s.external.Hgross };
}
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L3.cull.v2',
  level: 'L3',
  laws: ['a round or debris farther than battle.cullDistance from every body leaves play, its momentum booked as left (#222 (7), 13k.1)', 'momentum is conserved (books close with what left)'],
  dependsOn: [],
  setup: 'R1 at T1 (13f.2) at rest; (round) the turret, aimed +y (broadside), fires one M round and holds; (debris) R1 spins at 1 rad/s and the hold cell (7, 0) is destroyed at 0 s; after every step the kernel\'s cull(); 40 s (13k.4 S14)',
  measure: 'the time the round or the debris leaves play; its distance from every body at that step and at the step before; world.ship.left; the books of bodies + debris + rounds + left against the external impulse',
  tolerance: 'books: mass 1e-12, momentum 1e-9 x the gross, angular momentum 1e-9 x net + 1e-12 x gross (#220); left = the item\'s state before the cull 1e-12; distances exact',
  criterion: 'the item leaves play at the first step after which it is farther than battle.cullDistance (3000 m at T1, k = 1) from every body: at that step every distance > 3000 m and at the step before some distance <= 3000 m; world.ship.left books its mass and momentum (1e-12); mass, momentum and angular momentum of bodies + debris + rounds + left are kept with the external impulse through the run; hand-worked bounds: the round, from the turret about 22 m off the centre of mass at 800 m/s, leaves between 3.7 and 3.8 s; the debris, 19.13 m from the centre of mass (cell (37.5, 2.5) m, centre (24.14, 16.18) m) and flying off at 1 rad/s x 19.13 m = 19.13 m/s, is 19.13 sqrt(1 + t^2) m away: it leaves between 150 and 165 s (156.8 s) (#222 (7), #243) Successor of L3.cull (the engineer\'s specification error in physics pass 2, #243, found at its first canonical run; pending the lead designer\'s decision): the debris case spins R1 at 1 rad/s with no thrust: in L3.cull R1\'s full thrust 1.2 m below its centre of mass spun it up (1.6 rad/s after 10 s) with nothing holding its heading, so it circled and never left its debris 3 km behind; the bound becomes 150-165 s; the round case is unchanged.',
  tunable: ['battle.cullDistance', 'kinetic.muzzleVelocity', 'engine.thrust', 'structure.cellMass'],
  locked: { date: '2026-10-22', hash: '0b505ebf' },
  cases() {
    return [{ item: 'round' }, { item: 'debris' }];
  },
  expected(ctx, c) {
    return { D: ctx.params.battle.cullDistance.value, bounds: c.item === 'round' ? [3.7, 3.8] : [150, 165], kind: c.item === 'round' ? 'rounds' : 'debris' };
  },
  run(ctx, c) {
    const { world, room } = buildR1(ctx, c.item === 'debris' ? { omega: 1 } : {});
    const D = ctx.scaled(ctx.params.battle.cullDistance, ctx.tiers.T1.edge), kind = c.item === 'round' ? 'rounds' : 'debris';
    if (c.item === 'debris') { const at = cellAt(world, [7, 0]); destroyCell(world, at.room, at.index, 'hit-1'); }
    else { room('turret').turret.aim = [0, 1]; room('turret').turret.hold = false; }
    const start = books(world);
    let prevFar = null, leftAt = null, farThen = null, item = null, okBooks = true;
    const dist = (x) => Math.min(...world.ship.bodies.map((b) => Math.hypot(x.x[0] - b.x[0], x.x[1] - b.x[1])));
    while (world.t < LIMIT && leftAt === null) {
      step(world);
      if (c.item === 'round' && room('turret').turret.shots >= 1) room('turret').turret.hold = true;
      const list = world.ship[kind], x = list[0] || null;
      const before = x ? { m: x.m, P: [x.m * x.v[0], x.m * x.v[1]], d: dist(x) } : null;
      const n = cull(world);
      if (n > 0) { leftAt = world.t; farThen = before.d; item = before; }
      else if (x) prevFar = dist(x);
      const b = books(world), dJ = [b.J[0] - start.J[0], b.J[1] - start.J[1]], dH = b.H - start.H;
      const dP = Math.hypot(b.P[0] - start.P[0] - dJ[0], b.P[1] - start.P[1] - dJ[1]), dL = Math.abs(b.L - start.L - dH);
      okBooks = okBooks && Math.abs(b.M - start.M) <= 1e-12 * start.M && dP <= 1e-9 * Math.max(start.sp, b.sp, Math.hypot(...dJ)) + 1e-12 && dL <= 1e-9 * Math.max(start.sl, b.sl, Math.abs(dH)) + 1e-12 * (b.Hgross - start.Hgross) + 1e-12;
    }
    const left = world.ship.left || null;
    return { leftAt, farThen, prevFar, item, left: left ? { m: left.m, P: left.P, count: left[kind] } : null, okBooks, remaining: world.ship[kind].length };
  },
  compare(e, a) {
    const close = (x, y) => Math.abs(x - y) <= 1e-12 * Math.max(Math.abs(x), Math.abs(y), 1e-300);
    const checks = {
      'leaves play at the first step beyond the cull distance': a.leftAt !== null && a.farThen > e.D && a.prevFar !== null && a.prevFar <= e.D,
      'left books its mass and momentum': !!a.left && a.left.count === 1 && close(a.item.m, a.left.m) && close(a.item.P[0], a.left.P[0]) && close(a.item.P[1], a.left.P[1]),
      'books close with what left': a.okBooks,
      'hand-worked bounds on the time': a.leftAt !== null && a.leftAt >= e.bounds[0] && a.leftAt <= e.bounds[1],
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: `leaves beyond ${r.expected.D} m, between ${r.expected.bounds.join(' and ')} s`, actual: `left at ${a.leftAt === null ? 'never' : a.leftAt.toFixed(4)} s at ${a.farThen === null ? '-' : a.farThen.toFixed(3)} m (step before ${a.prevFar === null ? '-' : a.prevFar.toFixed(3)} m); books ${a.okBooks ? 'close' : 'OPEN'}` };
  },
};
