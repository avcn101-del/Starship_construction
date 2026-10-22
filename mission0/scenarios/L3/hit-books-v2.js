import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, enablePowerRouting, fireRound, shieldRound, cellAt } from '../../../js/rooms.js';
import { roundGeometry } from '../../../js/projectile.js';

// Successor of L3.hit.books (withdrawn as superseded by #278, the L5 kinetic pass, 13n.1 (b)): identical but for (1) the
// split of the round's heat between rooms, now by the energy each entry took, (p_i^2 - p_{i+1}^2) / 2m with p_i the
// momentum on entering (L4 of 13n.1 (b)), not by the momentum; (2) magazine.detonationSpeed held at its range's top,
// 600 m/s (a run-time override, #272): the bow row's round enters the full magazine at 431 m/s (two beam bay cells,
// 13n.3 (2)), which under 13n.1 (b) detonates it at 400 m/s and ends the books this scenario is about (the
// detonation is L2.magazine.detonation's and L4.kill.v3's).
// S5 of physics pass 2 (DESIGN.md 13k.4): the books close at the target (13k.1, F4, F5) and the shield's books
// (#240 (2), F16). An M round (6 kg, 800 m/s relative to the hull) along R1's middle row y = 2 from the bow (-x in the
// grid frame), and an M round through R1's shield field at strength 0.6, with R1 at rest and R1 moving and turning.
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
  const params = structuredClone(ctx.params);
  params.magazine.detonationSpeed.value = 600; // its range's top: the bow row's 431 m/s entry does not set the magazine off
  const world = createWorld({ params, edge, dt: ctx.dt, grid: ctx.tiers[tier].grid });
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
const BOW_ROW = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((x) => [x, 2]); // the cells the line crosses, in order
const MOTION = { rest: { velocity: [0, 0], omega: 0 }, moving: { velocity: [120, -40], omega: 0.02 } };
const G = 0.6; // the field strength the round meets
const cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];
/** Mass, momentum, angular momentum about the world origin (with spin) and kinetic energy of every body. */
function bodiesOf(world) {
  let M = 0, px = 0, py = 0, L = 0, K = 0;
  for (const b of world.ship.bodies) { M += b.M; px += b.M * b.v[0]; py += b.M * b.v[1]; L += b.M * cross2(b.x, b.v) + b.I * b.omega; K += 0.5 * b.M * (b.v[0] * b.v[0] + b.v[1] * b.v[1]) + 0.5 * b.I * b.omega * b.omega; }
  return { M, P: [px, py], L, K };
}
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L3.hit.books.v2',
  level: 'L3',
  laws: ['a hit gives the ship it hits the momentum its cells took, at those cells (#228, F4)', 'the energy a hit loses is heat in the rooms that took momentum (F5)', 'the field\'s removed momentum pushes the generator\'s ship (#240 (2), F16)', 'momentum and energy books close between the round and the ship'],
  dependsOn: [],
  setup: 'R1 at T1 (13f.2), free, at rest or moving at (120, -40) m/s and turning at 0.02 rad/s, shield on: (hit) an M round (kinetic.roundMass, kinetic.muzzleVelocity relative to the hull) fired along the middle row y = 2 from the bow, direction -x in R1\'s grid frame, by the kernel\'s fireRound; (shield) an M round at a point where the field is at strength 0.6 (r = radius x sqrt(1 / 0.6 - 1) from the generator\'s centre), direction -x, by the kernel\'s shieldRound (13k.4 S5)',
  measure: 'the bodies\' mass, momentum, angular momentum and kinetic energy before and after; the momentum each cell took; the heat each room gained; the round\'s speed after the field; the books world.ship.received and external',
  tolerance: 'momentum and angular momentum books 1e-9 x the gross (the round\'s momentum, or its angular momentum about the origin plus the bodies\'), energy books 1e-9 x the gross energy (#220); per-room heat shares 1e-12; the field\'s speed 1e-12 (a closed form); literals 1e-12, the heat against the round\'s lost kinetic energy in the hull\'s frame 1e-4',
  criterion: '(hit) the bodies\' momentum change = the sum of the momentum each cell took along the direction (rotated to the world), and their angular momentum change = the sum of q_i x J_i at the hit cells\' centres, each within 1e-9 x the gross; energy books close: the round\'s kinetic energy before (world frame: the hull\'s velocity at its first cell plus its speed) + the bodies\' = the round\'s after + the bodies\' + the heat, within 1e-9 of the gross; re-statement: each room\'s heat = the total x its share of the energy taken, sum over its entries of (p_i^2 - p_{i+1}^2) / 2m over the sum over the path (L4 of 13n.1 (b); 1e-12); magazine.detonationSpeed at 600 m/s (its range\'s top) so the full magazine the row crosses at 431 m/s is not set off; hand-worked literals at rest: the round stops in R1 (it enters the beam bay, magazine and bridge cells of the bow row; 13i.3), so |delta P| = 6 x 800 = 4800 N s (1e-12) and the heat is 1/2 x 6 x 800^2 = 1.92 MJ less the ship\'s gain (J^2 / 2M and its spin, about 12 J) within 1e-4. (shield) re-statement of L0\'s stop at g = 0.6: v1 = v (s0 - ds) / s0, ds = min(s0, kineticStop x g) (1e-12); the generator\'s body takes m (v - v1) along the direction at the generator\'s centre (momentum and angular momentum 1e-9 x gross), the same as world.ship.received.field; hand-worked literal at g = 0.6: kineticStop is an S round\'s sectional momentum, 2/3 of an M round\'s, so ds = 0.4 s0, v1 = 480 m/s and the impulse 6 x 320 = 1920 N s (13k.3: 3200 N s at g = 1) (#228, #240 (2), #243)',
  tunable: ['kinetic.roundMass', 'kinetic.muzzleVelocity', 'matter.kineticResistance', 'shield.kineticStop', 'shield.radius'],
  locked: { date: '2026-10-22', hash: '28c0b667' },
  cases() {
    const out = [];
    for (const part of ['hit', 'shield']) for (const motion of Object.keys(MOTION)) out.push({ part, motion });
    return out;
  },
  expected(ctx, c) {
    const p = ctx.params, f = ctx.fixed, m = p.kinetic.roundMass.value, v = p.kinetic.muzzleVelocity.value;
    if (c.part === 'hit') return { p0: m * v, E0: 0.5 * m * v * v, literal: c.motion === 'rest' ? { P: 4800, heat: 1.92e6 } : null };
    const D = Math.cbrt((4 * m) / (Math.PI * f.steelDensity.value * f.roundLengthToDiameter.value)), A = (Math.PI * D * D) / 4, s0 = (m * v) / A;
    const r = p.shield.radius.value * Math.sqrt(1 / G - 1), g = 1 / (1 + (r / p.shield.radius.value) ** f.shieldFalloffExponent.value);
    const ds = Math.min(s0, p.shield.kineticStop.value * g), v1 = (v * (s0 - ds)) / s0;
    return { r, g, v1, J: m * (v - v1), literal: c.motion === 'rest' ? { v1: 480, J: 1920 } : null };
  },
  run(ctx, c) {
    const p = ctx.params, f = ctx.fixed, edge = ctx.tiers.T1.edge;
    const { world, room } = buildR1(ctx, MOTION[c.motion]);
    const m = ctx.scaled(p.kinetic.roundMass, edge), v = ctx.scaled(p.kinetic.muzzleVelocity, edge), { A } = roundGeometry(m, f.steelDensity.value, f.roundLengthToDiameter.value);
    const b0 = world.ship.bodies[0], d = [Math.cos(b0.theta) * -1, Math.sin(b0.theta) * -1];
    const before = bodiesOf(world), heat0 = Object.fromEntries(world.rooms.map((r) => [r.id, r.heat.generated]));
    const ext0 = { J: [...world.ship.external.J], H: world.ship.external.H };
    if (c.part === 'hit') {
      const path = BOW_ROW.map((xy) => { const a = cellAt(world, xy); return { room: a.room, cell: a.index }; });
      // The round in the world frame: the hull's velocity at its first cell plus v along d.
      const q0 = [b0.x[0] + (edge * (BOW_ROW[0][0] + 0.5) - b0.c[0]), b0.x[1] + (edge * (BOW_ROW[0][1] + 0.5) - b0.c[1])];
      const hull = [b0.v[0] - b0.omega * (q0[1] - b0.x[1]), b0.v[1] + b0.omega * (q0[0] - b0.x[0])], u0 = [hull[0] + v * d[0], hull[1] + v * d[1]];
      // The cells' centres in the world (heading 0 at this instant) for the angular books.
      const centres = BOW_ROW.map((xy) => [b0.x[0] + edge * (xy[0] + 0.5) - b0.c[0], b0.x[1] + edge * (xy[1] + 0.5) - b0.c[1]]);
      const res = fireRound(world, { mass: m, velocity: v, area: A, direction: [-1, 0] }, path, 'round-1');
      const after = bodiesOf(world), J = res.impulse.reduce((x, y) => x + y, 0);
      const Ji = res.impulse.map((imp) => [imp * d[0], imp * d[1]]);
      const u1 = [u0[0] - (J * d[0]) / m, u0[1] - (J * d[1]) / m];
      const heats = Object.fromEntries(world.rooms.map((r) => [r.id, r.heat.generated - heat0[r.id]]));
      const shares = {};
      res.impulse.forEach((imp, i) => { if (imp > 0) shares[path[i].room.id] = (shares[path[i].room.id] || 0) + res.entry[i] * res.entry[i] - (res.entry[i] - imp) * (res.entry[i] - imp); }); // the energy each took, x 2m
      return {
        stoppedIn: res.stoppedIn, impulse: res.impulse, J, dP: [after.P[0] - before.P[0], after.P[1] - before.P[1]], dL: after.L - before.L,
        dLexpected: Ji.reduce((x, j, i) => x + cross2(centres[i], j), 0), Lgross: Math.abs(before.L) + Ji.reduce((x, j, i) => x + Math.abs(cross2(centres[i], j)), 0) + m * Math.abs(cross2(q0, u0)),
        Kround0: 0.5 * m * (u0[0] * u0[0] + u0[1] * u0[1]), Kround1: 0.5 * m * (u1[0] * u1[0] + u1[1] * u1[1]), K0: before.K, K1: after.K,
        heat: Object.values(heats).reduce((x, y) => x + y, 0), heats, shares, kernelHeat: res.heat, mass: [before.M, after.M],
        received: world.ship.received.J, external: [world.ship.external.J[0] - ext0.J[0], world.ship.external.J[1] - ext0.J[1]],
      };
    }
    const gen = room('shield'), position = [gen.position[0] + p.shield.radius.value * Math.sqrt(1 / G - 1), gen.position[1]];
    const qg = [b0.x[0] + gen.position[0] - b0.c[0], b0.x[1] + gen.position[1] - b0.c[1]];
    const sh = shieldRound(world, { position, mass: m, velocity: v, area: A, direction: [-1, 0] });
    const after = bodiesOf(world), Jv = [sh.impulse * d[0], sh.impulse * d[1]];
    return {
      v1: sh.velocity, impulse: sh.impulse, dP: [after.P[0] - before.P[0], after.P[1] - before.P[1]], Jv, dL: after.L - before.L, dLexpected: cross2(qg, Jv),
      Lgross: Math.abs(before.L) + Math.abs(cross2(qg, Jv)), field: world.ship.received.field, mass: [before.M, after.M],
    };
  },
  compare(e, a, c) {
    const near = (x, y, gross) => Math.abs(x - y) <= 1e-9 * gross;
    const checks = { 'mass unchanged': a.mass[0] === a.mass[1] };
    if (c.part === 'hit') {
      const d = [-1, 0], gross = e.p0;
      Object.assign(checks, {
        'momentum change = momentum the cells took': near(a.dP[0], a.J * d[0], gross) && near(a.dP[1], a.J * d[1], gross),
        'angular momentum change = sum of q_i x J_i': near(a.dL, a.dLexpected, a.Lgross),
        'energy books close': near(a.Kround0 + a.K0, a.Kround1 + a.K1 + a.heat, a.Kround0 + a.K0),
        'heat per room by its share of the energy taken (re-statement)': Object.entries(a.shares).every(([id, s]) => close((a.kernelHeat * s) / Object.values(a.shares).reduce((x, y) => x + y, 0), a.heats[id], 1e-12)) && Object.keys(a.heats).every((id) => a.shares[id] || a.heats[id] === 0),
        'books received = the momentum taken, booked as external': close(a.J, Math.hypot(...a.received), 1e-12) && close(a.J, Math.hypot(...a.external), 1e-12),
        ...(e.literal ? { 'hand-worked literal: |delta P| 4800 N s, heat 1.92 MJ within 1e-4': close(e.literal.P, Math.hypot(...a.dP), 1e-12) && a.stoppedIn >= 0 && close(e.literal.heat, a.heat, 1e-4) } : {}),
      });
    } else {
      const gross = Math.hypot(...a.Jv) + 1e-300;
      Object.assign(checks, {
        'speed after the field (L0 stop at g)': close(e.v1, a.v1, 1e-12),
        'the generator\'s ship takes m (v - v1)': close(e.J, a.impulse, 1e-12) && near(a.dP[0], a.Jv[0], gross) && near(a.dP[1], a.Jv[1], gross),
        'angular momentum change = q_gen x J': near(a.dL, a.dLexpected, a.Lgross),
        'received.field = the field\'s impulse': close(a.Jv[0], a.field[0], 1e-12) && Math.abs(a.field[1] - a.Jv[1]) <= 1e-12 * gross,
        ...(e.literal ? { 'hand-worked literal: v1 480 m/s, impulse 1920 N s': close(e.literal.v1, a.v1, 1e-12) && close(e.literal.J, a.impulse, 1e-12) } : {}),
      });
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    if (r.case.part === 'hit') return { expected: `p0 ${r.expected.p0} N s, E0 ${(r.expected.E0 / 1e6).toFixed(6)} MJ`, actual: `stopped in path cell ${a.stoppedIn}; taken ${a.J.toFixed(6)} N s; delta P (${a.dP.map((x) => x.toFixed(6)).join(', ')}); heat ${(a.heat / 1e6).toFixed(9)} MJ; ship gained ${(a.K1 - a.K0).toFixed(3)} J` };
    return { expected: `g ${r.expected.g.toFixed(12)}, v1 ${r.expected.v1.toFixed(9)} m/s, impulse ${r.expected.J.toFixed(6)} N s`, actual: `v1 ${a.v1.toFixed(9)} m/s, impulse ${a.impulse.toFixed(6)} N s, delta P (${a.dP.map((x) => x.toFixed(6)).join(', ')})` };
  },
};
