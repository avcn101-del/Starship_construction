import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, enablePowerRouting, readout, step } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';
// Checks shared by every L3 scenario (13f.3: L2's checks plus the momentum books), written out in each file so its lock covers them.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-damaged': ['channel', 'cell', 'integrity'], 'cell-repaired': ['cell'], scram: ['energy'], explosion: ['energy', 'channel'], shot: ['energy', 'channel'], 'heat-vented': ['energy'] };
const eventsOk = (events) => events.every((e) => Number.isFinite(e.t) && typeof e.type === 'string' && typeof e.room === 'string' && e.room !== ''
  && typeof e.cause === 'string' && e.cause !== '' && Number.isInteger(e.crew) && e.crew >= 0
  && (EXTRA[e.type] || []).every((f) => (f === 'channel' ? typeof e[f] === 'string' && e[f] !== '' : Number.isFinite(e[f]))));
// Heat books (13d.2): generated + conducted = radiated + vented + stored in every room, within max(1e-9 of the largest
// flow, 1e-10 of the room's heat at the start) (#219: stored = Q - Q0 carries the float resolution of Q0; vented
// includes the heat a destroyed cell takes with it as debris, #214 (9)); conduction and life support each sum to 0
// over the ship.
const booksOk = (b) => {
  const c = b.conducted || 0, v = b.vented || 0;
  return Math.abs(b.generated + c - b.radiated - v - b.stored) <= Math.max(1e-9 * Math.max(Math.abs(b.generated), Math.abs(c), Math.abs(b.radiated), Math.abs(v), Math.abs(b.stored)), 1e-10 * Math.abs(b.initial));
};
const sumsToZero = (books, key) => {
  const sum = books.reduce((x, b) => x + (b[key] || 0), 0), moved = books.reduce((x, b) => x + Math.abs(b[key] || 0), 0);
  return Math.abs(sum) <= 1e-9 * moved;
};
const oneSided = (e, a, dt) => Number.isFinite(a) && a >= e - 1e-9 * Math.abs(e) && a < e + dt + 1e-9 * Math.abs(e);
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
/**
 * Momentum books (13f.3), summed here from the ship's state: mass, momentum, angular momentum about the world
 * origin and kinetic energy of every body, debris piece and round, with the external impulse booked (thrust, RCS,
 * fixtures). Between two snapshots, mass is kept, P - J is kept to 1e-9 of the largest magnitude that enters it
 * (1e-12 absolute floor for a ship at rest), and L - H to 1e-9 of the largest net magnitude that enters it plus
 * 1e-12 of the gross angular impulse booked, sum |q x F dt|, which a couple fired both ways cancels (#219, #220),
 * with the same 1e-12 absolute floor.
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
const common = (rows) => [
  { name: 'heat books: generated + conducted = radiated + vented + stored, within max(1e-9 x the largest flow, 1e-10 x the room\'s heat at the start), every room, every case (#219)', ok: rows.every((r) => r.actual.books.every(booksOk)) },
  { name: 'conduction and life-support flows each sum to 0 over the ship, every case', ok: rows.every((r) => sumsToZero(r.actual.books, 'conducted') && sumsToZero(r.actual.books, 'pumped')) },
  { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) },
  { name: 'momentum books: mass, momentum (1e-9) and angular momentum (1e-9 x net + 1e-12 x gross angular impulse booked, #219, #220) of ship + rounds + debris kept (with the external impulse), every case', ok: rows.every((r) => r.actual.momentum.mass && r.actual.momentum.momentum && r.actual.momentum.angular) },
];

// R1, the reference ship (13f.2): x forward, the T1 drydock grid; cells [x0, x1) x [y0, y1); the engine (2 x 3)
// rotated 90 degrees so it spans [0, 3) x [2, 4) with its exhaust at x = 0.
const R1_ROOMS = [
  { id: 'engine', type: 'engine', cell: [0, 2], rotation: 90 }, { id: 'reactor', type: 'reactor', cell: [3, 2] },
  { id: 'bridge', type: 'bridge', cell: [5, 2] }, { id: 'magazine', type: 'magazine', cell: [7, 2] },
  { id: 'beamBay', type: 'beamBay', cell: [9, 2] }, { id: 'heatSink', type: 'heatSink', cell: [3, 4] },
  { id: 'quarters', type: 'quarters', cell: [5, 4] }, { id: 'turret', type: 'turret', cell: [8, 4] },
  { id: 'shield', type: 'shieldGenerator', cell: [3, 0] }, { id: 'hold', type: 'hold', cell: [7, 0] },
];
// One fitting per open edge: [type, room, grid cell, outward side]. 17 radiators (engine 2 top + 2 bottom on
// columns x = 1, 2; heat sink 2 top + 2 aft; shield generator 2 bottom + 2 each side; beam bay 2 bow + 1 bottom
// at x = 9), then 4 RCS (fitting ids 17-20): the engine's column x = 0 top and bottom, the beam bay's x = 10.
const R1_FITTINGS = [
  ['radiator', 'engine', [1, 3], [0, 1]], ['radiator', 'engine', [2, 3], [0, 1]], ['radiator', 'engine', [1, 2], [0, -1]], ['radiator', 'engine', [2, 2], [0, -1]],
  ['radiator', 'heatSink', [3, 5], [0, 1]], ['radiator', 'heatSink', [4, 5], [0, 1]], ['radiator', 'heatSink', [3, 4], [-1, 0]], ['radiator', 'heatSink', [3, 5], [-1, 0]],
  ['radiator', 'shield', [3, 0], [0, -1]], ['radiator', 'shield', [4, 0], [0, -1]], ['radiator', 'shield', [3, 0], [-1, 0]], ['radiator', 'shield', [3, 1], [-1, 0]],
  ['radiator', 'shield', [4, 0], [1, 0]], ['radiator', 'shield', [4, 1], [1, 0]],
  ['radiator', 'beamBay', [10, 2], [1, 0]], ['radiator', 'beamBay', [10, 3], [1, 0]], ['radiator', 'beamBay', [9, 2], [0, -1]],
  ['rcs', 'engine', [0, 3], [0, 1]], ['rcs', 'engine', [0, 2], [0, -1]], ['rcs', 'beamBay', [10, 3], [0, 1]], ['rcs', 'beamBay', [10, 2], [0, -1]],
];
const RCS = { sternTop: 17, sternBottom: 18, bowTop: 19, bowBottom: 20 };

/** Build R1 in the kernel at `tier`: magazine full of HE, the turret's ready store full and holding fire, no routing unless asked; rooms at rest unless `temperatures` says. */
function buildR1(ctx, { tier = 'T1', velocity = [0, 0], omega = 0, routing = null, setup = null, temperatures = {} } = {}) {
  const edge = ctx.tiers[tier].edge;
  const world = createWorld({ params: ctx.params, edge, dt: ctx.dt, grid: ctx.tiers[tier].grid });
  for (const r of R1_ROOMS) addRoom(world, r.type, { id: r.id, cell: r.cell, rotation: r.rotation || 0, temperature: temperatures[r.id] ?? ctx.fixed.restTemperature.value });
  for (const [type, room, cell, side] of R1_FITTINGS) addFitting(world, type, room, cell, side);
  const room = (id) => world.rooms.find((r) => r.id === id);
  loadMagazine(world, room('magazine'), { heMass: ctx.scaled(ctx.params.magazine.capacity, edge) });
  loadTurret(room('turret'), ctx.params.turret.readyRounds.value);
  room('turret').turret.hold = true;
  if (routing) enablePowerRouting(world, routing);
  if (setup) setup(world, room);
  enableShip(world, { velocity, omega });
  return { world, room };
}

// ---------- the scenario's own mass model (13f.1, from data.js and the geometry above; never kernel code) ----------
/** Grid cells of a room placed at `cell` with `rotation` (13d.1: local (i, j), k = j w + i; 90 degrees maps (i, j) to (h - 1 - j, i)). */
function roomCells(type, cell, rotation = 0, size = 'M') {
  const [w, h] = ROOMS[type].footprint[size], out = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.push(rotation === 0 ? [cell[0] + i, cell[1] + j] : [cell[0] + (h - 1 - j), cell[1] + i]);
  return out;
}
/** A cell's mass at `edge`: structure.cellMass (k = 3, #221); a heat sink cell adds (capacityFactor - 1) C / water (13g.1). */
function cellMass(ctx, type, edge) {
  const p = ctx.params, C = ctx.scaled(p.thermal.heatCapacityPerCell, edge);
  return ctx.scaled(p.structure.cellMass, edge) + (type === 'heatSink' ? ((p.heatsink.capacityFactor.value - 1) * C) / ctx.fixed.waterSpecificHeat.value : 0);
}
const roundMass = (ctx, edge, size = 'M') => ctx.scaled(ctx.params.kinetic.roundMass, edge) * ctx.fixed.sizeLinear.value[size] ** 3;
/**
 * Point masses of a ship: rooms [{ id, type, cell, rotation }], fittings [type, room, cell, side], contents
 * { roomId: rounds } at the room's centre, cells in `gone` (keys 'x,y') left out with the fittings on them.
 * Each item { m, p, a, room, cell } (a = edge for a square cell, 0 for a point).
 */
function massItems(ctx, edge, rooms, fittings, contents = {}, gone = new Set()) {
  const items = [];
  for (const r of rooms) {
    const cells = roomCells(r.type, r.cell, r.rotation || 0);
    for (const c of cells) if (!gone.has(`${c[0]},${c[1]}`)) items.push({ m: cellMass(ctx, r.type, edge), p: [(c[0] + 0.5) * edge, (c[1] + 0.5) * edge], a: edge, room: r.id, cell: c });
    const n = contents[r.id] || 0, xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
    if (n > 0 && cells.some((c) => !gone.has(`${c[0]},${c[1]}`))) items.push({ m: n * roundMass(ctx, edge), p: [((Math.min(...xs) + Math.max(...xs) + 1) / 2) * edge, ((Math.min(...ys) + Math.max(...ys) + 1) / 2) * edge], a: 0, room: r.id });
  }
  for (const [type, room, c, side] of fittings) {
    if (gone.has(`${c[0]},${c[1]}`)) continue;
    const m = type === 'radiator' ? ctx.scaled(ctx.params.radiator.mass, edge) : ctx.scaled(ctx.params.rcs.mass, edge);
    items.push({ m, p: [(c[0] + 0.5 + side[0] / 2) * edge, (c[1] + 0.5 + side[1] / 2) * edge], a: 0, room, fitting: true });
  }
  return items;
}
/** M, centre of mass and I = sum m (a^2 / 6 + d^2) (13f.1). */
function props(items) {
  const M = items.reduce((x, i) => x + i.m, 0);
  const c = [items.reduce((x, i) => x + i.m * i.p[0], 0) / M, items.reduce((x, i) => x + i.m * i.p[1], 0) / M];
  const I = items.reduce((x, i) => x + i.m * (i.a * i.a / 6 + (i.p[0] - c[0]) ** 2 + (i.p[1] - c[1]) ** 2), 0);
  return { M, c, I };
}
/** R1's contents when full: the magazine's capacity in M rounds, the turret's ready store. */
const fullContents = (ctx, edge) => ({ magazine: Math.floor(ctx.scaled(ctx.params.magazine.capacity, edge) / roundMass(ctx, edge)), turret: ctx.params.turret.readyRounds.value });

const RUN = 10.01; // s: 601 steps, off the 10 s mark (#185 (2))
// (a) the symmetric test ship: an engine (rotated, exhaust at x = 0), a reactor and a bridge on one row, two cells tall.
const SYM_ROOMS = [{ id: 'engine', type: 'engine', cell: [0, 0], rotation: 90 }, { id: 'reactor', type: 'reactor', cell: [3, 0] }, { id: 'bridge', type: 'bridge', cell: [5, 0] }];
/** Centre of an engine's exhaust face (13f.1): the middle of its aft face, x = its smallest cell x. */
function exhaustPoint(r, edge) {
  const cells = roomCells(r.type, r.cell, r.rotation || 0), x0 = Math.min(...cells.map((c) => c[0])), ys = cells.filter((c) => c[0] === x0).map((c) => c[1]);
  return [x0 * edge, ((Math.min(...ys) + Math.max(...ys) + 1) / 2) * edge];
}
/**
 * Reference integrator for the rigid body under one engine (13d.2's convention: RK4 at dt / 10, from data.js and
 * 13f.1): constant thrust F along the body's +x at a point d below the centre of mass, so the heading follows its
 * closed form theta = alpha t^2 / 2 (alpha = F d / I) and the centre of mass obeys dv/dt = (F / M)(cos theta,
 * sin theta). Returns samples at the end of each whole second's step and at the end of the run.
 */
function reference(F, M, alpha, x0, dt, steps, every) {
  const h = dt / 10, acc = (t) => [(F / M) * Math.cos(0.5 * alpha * t * t), (F / M) * Math.sin(0.5 * alpha * t * t)];
  let x = [...x0], v = [0, 0], t = 0;
  const out = [];
  for (let n = 1; n <= steps; n++) {
    for (let s = 0; s < 10; s++) {
      const a1 = acc(t), a2 = acc(t + h / 2), a4 = acc(t + h);
      const k1x = v, k1v = a1, k2x = [v[0] + (h / 2) * k1v[0], v[1] + (h / 2) * k1v[1]], k2v = a2;
      const k3x = [v[0] + (h / 2) * k2v[0], v[1] + (h / 2) * k2v[1]], k3v = a2, k4x = [v[0] + h * k3v[0], v[1] + h * k3v[1]], k4v = a4;
      x = [x[0] + (h / 6) * (k1x[0] + 2 * k2x[0] + 2 * k3x[0] + k4x[0]), x[1] + (h / 6) * (k1x[1] + 2 * k2x[1] + 2 * k3x[1] + k4x[1])];
      v = [v[0] + (h / 6) * (k1v[0] + 2 * k2v[0] + 2 * k3v[0] + k4v[0]), v[1] + (h / 6) * (k1v[1] + 2 * k2v[1] + 2 * k3v[1] + k4v[1])];
      t += h;
    }
    if (n % every === 0 || n === steps) out.push({ t: n * dt, x: [...x], theta: 0.5 * alpha * (n * dt) ** 2 });
  }
  return out;
}

export default {
  id: 'L3.thrust.v3',
  level: 'L3',
  laws: ['inertia (F = M a)', 'thrust off the centre of mass turns the ship (#14)', 'rigid body, semi-implicit Euler'],
  dependsOn: ['L3.mass.props.v3', 'L1.engine.thrust'],
  setup: 'T1, no power routing (every room powered), controlled from the bridge. (a) a symmetric test ship: an M engine rotated 90 degrees at (0, 0) (exhaust at x = 0), an M reactor at (3, 0), an M bridge at (5, 0), every room two cells tall, no fittings; (b) R1 (13f.2) with the magazine full and the turret holding fire, no RCS fired. Both from rest at the origin, heading 0, the engine at full throttle for 10.01 s (601 steps)',
  measure: 'every step: velocity and angular velocity; at the end of each whole second and of the run: the centre of mass\'s position and the heading; the readout\'s acceleration in g',
  tolerance: '(a) acceleration 1e-9 relative, omega 1e-12 rad/s absolute, the discrete position 1e-9 relative at every sample; (b) omega 1e-9 relative at every step, position (relative to the reference displacement) and heading (relative to the reference heading) 1e-2 at t = 5 s and t = 10 s; readout 1e-12 relative',
  criterion: '(a) a = F / M to 1e-9 and omega = 0 to 1e-12 (thrust through the centre of mass), and the centre of mass\'s discrete position x_n = a dt^2 n (n + 1) / 2 of the semi-implicit scheme (v += a dt, then x += v dt) to 1e-9 relative at the end of each whole second and of the run; (b) omega(t) = alpha t with alpha = F d / I (d: the thrust line, the centre of the exhaust face, below the centre of mass; estimate 0.191 rad/s^2, 10.9 deg/s^2) to 1e-9, position and heading against the reference integrator within 1e-2 relative at t = 5 s and t = 10 s (the kernel\'s semi-implicit Euler differs by about dt / t: 3.3e-3 and 1.7e-3; a thrust that does not turn with the ship is off by order 1); the readout\'s acceleration = F / (M g) exact (estimate 3.41 g for R1 at 15 MN) (#14, #203 A, #208, #209, #210, #219, #220, #221)',
  tunable: ['engine.thrust', 'thermal.heatCapacityPerCell', 'structure.cellMass', 'radiator.mass', 'rcs.mass'],
  locked: null,
  cases() {
    return [{ ship: 'symmetric' }, { ship: 'R1' }];
  },
  expected(ctx, c) {
    const edge = ctx.baseEdge, F = ctx.params.engine.thrust.value, dt = ctx.dt, steps = Math.ceil(RUN / dt - 1e-9);
    const rooms = c.ship === 'R1' ? R1_ROOMS : SYM_ROOMS, fittings = c.ship === 'R1' ? R1_FITTINGS : [];
    const pr = props(massItems(ctx, edge, rooms, fittings, c.ship === 'R1' ? fullContents(ctx, edge) : {}));
    const ex = exhaustPoint(rooms[0], edge), d = pr.c[1] - ex[1], alpha = (F * d) / pr.I;
    // (a) the semi-implicit scheme's discrete position (#220): x_n - x_0 = a dt^2 n (n + 1) / 2 at the sampled steps.
    const every = Math.round(1 / dt), at = [...Array(Math.floor(steps / every)).keys()].map((k) => (k + 1) * every);
    if (at[at.length - 1] !== steps) at.push(steps);
    const discrete = c.ship === 'R1' ? null : at.map((n) => ({ n, x: (F / pr.M) * dt * dt * n * (n + 1) / 2 }));
    return { M: pr.M, F, a: F / pr.M, d, alpha, g: F / (pr.M * ctx.fixed.standardGravity.value), samples: c.ship === 'R1' ? reference(F, pr.M, alpha, pr.c, dt, steps, every) : null, discrete, steps };
  },
  run(ctx, c) {
    const p = ctx.params;
    let world;
    if (c.ship === 'R1') ({ world } = buildR1(ctx));
    else {
      world = createWorld({ params: p, dt: ctx.dt, grid: ctx.tiers.T1.grid });
      for (const r of SYM_ROOMS) addRoom(world, r.type, { id: r.id, cell: r.cell, rotation: r.rotation || 0 });
      enableShip(world);
    }
    const engine = world.rooms.find((r) => r.id === 'engine');
    engine.engine.throttle = 1;
    const start = snapshot(world), r0 = readout(world), b = world.ship.bodies[0], x0 = [...b.x];
    const omegas = [], samples = [], every = Math.round(1 / ctx.dt);
    while (world.t < RUN - 1e-9) {
      step(world);
      omegas.push({ t: world.t, omega: b.omega });
      if (world.step % every === 0) samples.push({ n: world.step, t: world.t, x: [...b.x], theta: b.theta });
    }
    if (world.step % every !== 0) samples.push({ n: world.step, t: world.t, x: [...b.x], theta: b.theta });
    return {
      bodies: world.ship.bodies.length, steps: world.step, t: world.t, v: [...b.v], omega: b.omega, omegas, samples, x0, readoutG: r0.accelerationG,
      books: world.rooms.map((r) => heatBooks(r.heat)), eventsOk: eventsOk(world.log.events), momentum: momentumOk(start, snapshot(world)),
    };
  },
  compare(e, a, c, ctx) {
    const checks = { 'one body': a.bodies === 1, 'steps run': a.steps === e.steps, 'readout acceleration in g': close(e.g, a.readoutG, 1e-12) };
    if (c.ship === 'symmetric') {
      checks['a = F / M'] = close(e.a, Math.hypot(a.v[0], a.v[1]) / a.t, 1e-9);
      checks['omega = 0'] = a.omegas.every((o) => Math.abs(o.omega) <= 1e-12);
      checks['discrete position x_n = a dt^2 n (n + 1) / 2, 1e-9'] = e.discrete.length === a.samples.length && e.discrete.every((d, i) => a.samples[i].n === d.n && close(d.x, a.samples[i].x[0] - a.x0[0], 1e-9));
    } else {
      checks['omega = alpha t, every step'] = a.omegas.every((o) => close(e.alpha * o.t, o.omega, 1e-9));
      const n = e.samples.length === a.samples.length, at = [5, 10].map((T) => e.samples.findIndex((s) => Math.abs(s.t - T) < 0.5 * ctx.dt));
      const both = n && at.every((i) => i >= 0 && Math.abs(a.samples[i].t - e.samples[i].t) < 0.5 * ctx.dt);
      checks['position against the reference at 5 s and 10 s, 1e-2'] = both && at.every((i) => Math.hypot(a.samples[i].x[0] - e.samples[i].x[0], a.samples[i].x[1] - e.samples[i].x[1]) <= 1e-2 * Math.hypot(e.samples[i].x[0] - a.x0[0], e.samples[i].x[1] - a.x0[1]));
      checks['heading against the reference at 5 s and 10 s, 1e-2'] = both && at.every((i) => Math.abs(a.samples[i].theta - e.samples[i].theta) <= 1e-2 * Math.abs(e.samples[i].theta));
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual;
    if (r.case.ship === 'symmetric') {
      const xe = e.discrete[e.discrete.length - 1], gap = Math.max(...e.discrete.map((d, i) => Math.abs(a.samples[i].x[0] - a.x0[0] - d.x) / d.x));
      return { expected: `a ${e.a.toFixed(6)} m/s2, omega 0, readout ${e.g.toFixed(6)} g; discrete x at step ${xe.n} ${xe.x.toFixed(6)} m`, actual: `a ${(Math.hypot(...a.v) / a.t).toFixed(6)} m/s2, max |omega| ${Math.max(...a.omegas.map((o) => Math.abs(o.omega))).toExponential(2)} rad/s, readout ${a.readoutG.toFixed(6)} g; x at step ${a.samples[a.samples.length - 1].n} ${(a.samples[a.samples.length - 1].x[0] - a.x0[0]).toFixed(6)} m, largest relative gap to the discrete position ${gap.toExponential(3)}` };
    }
    const last = e.samples[e.samples.length - 1], al = a.samples[a.samples.length - 1];
    const dx = Math.max(...e.samples.map((s, i) => Math.hypot(a.samples[i].x[0] - s.x[0], a.samples[i].x[1] - s.x[1]) / Math.hypot(s.x[0] - a.x0[0], s.x[1] - a.x0[1])));
    const dth = Math.max(...e.samples.map((s, i) => Math.abs(a.samples[i].theta - s.theta) / Math.abs(s.theta)));
    const g5 = [5, 10].map((T) => e.samples.findIndex((s) => Math.abs(s.t - T) < 1e-6)).filter((i) => i >= 0).map((i) => ({ x: Math.hypot(a.samples[i].x[0] - e.samples[i].x[0], a.samples[i].x[1] - e.samples[i].x[1]) / Math.hypot(e.samples[i].x[0] - a.x0[0], e.samples[i].x[1] - a.x0[1]), th: Math.abs(a.samples[i].theta - e.samples[i].theta) / Math.abs(e.samples[i].theta) }));
    return {
      expected: `d ${e.d.toFixed(4)} m, alpha ${e.alpha.toFixed(6)} rad/s2 (${(e.alpha * 180 / Math.PI).toFixed(3)} deg/s2), readout ${e.g.toFixed(4)} g; at ${last.t.toFixed(4)} s heading ${last.theta.toFixed(6)} rad, x (${last.x[0].toFixed(3)}, ${last.x[1].toFixed(3)}) m (reference)`,
      actual: `omega ${a.omega.toFixed(6)} rad/s at ${a.t.toFixed(4)} s, readout ${a.readoutG.toFixed(4)} g; heading ${al.theta.toFixed(6)} rad, x (${al.x[0].toFixed(3)}, ${al.x[1].toFixed(3)}) m; largest relative gap to the reference: position ${dx.toExponential(3)}, heading ${dth.toExponential(3)}; at 5 s and 10 s: position ${g5.map((g) => g.x.toExponential(3)).join(', ')}, heading ${g5.map((g) => g.th.toExponential(3)).join(', ')}`,
    };
  },
};
