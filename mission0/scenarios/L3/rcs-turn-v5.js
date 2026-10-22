import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, enablePowerRouting, readout, step, setRcs } from '../../../js/rooms.js';
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
// A room type's cell mass (13i.2, 13k.2, #232, #234, #235, #243): the hold, magazine and heat sink are structure only;
// the engine and the beam bay are structure + machinery, each constant at its own exponent (engine.machineryMass k = 2,
// beambay.machineryMass k = 1, structure k = 3).
const CELL_MASS = { bridge: ['cellMass.crewed'], quarters: ['cellMass.crewed'], turret: ['cellMass.crewed'], missileBay: ['cellMass.crewed'], reactor: ['cellMass.reactor'], shieldGenerator: ['cellMass.shieldGenerator'], railgun: ['cellMass.railgun'], engine: ['structure.cellMass', 'engine.machineryMass'], beamBay: ['structure.cellMass', 'beambay.machineryMass'] };
/** A cell's mass at `edge`: the sum of its type's constants; a heat sink cell adds (capacityFactor - 1) C / water, C its coupled heat capacity per cell (thermal.coupledHeatSink, 13k.2). */
function cellMass(ctx, type, edge) {
  const p = ctx.params, C = ctx.scaled(p.thermal.coupledHeatSink, edge), at = (path) => { const [g, n] = path.split('.'); return ctx.scaled(p[g][n], edge); };
  return (CELL_MASS[type] || ['structure.cellMass']).reduce((m, path) => m + at(path), 0) + (type === 'heatSink' ? ((p.heatsink.capacityFactor.value - 1) * C) / ctx.fixed.waterSpecificHeat.value : 0);
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

const TURN = Math.PI / 2; // rad
// Couples: [ids that accelerate the turn, ids that brake it]. ccw: the bow pushes +y (its bottom RCS) and the stern -y
// (its top RCS); cw: the other two.
const COUPLES = { ccw: [[RCS.bowBottom, RCS.sternTop], [RCS.bowTop, RCS.sternBottom]], cw: [[RCS.bowTop, RCS.sternBottom], [RCS.bowBottom, RCS.sternTop]] };
/** Torque (N m) of RCS fittings about c: each pushes rcs.force along its edge's inward normal at the edge's midpoint (13f.1). */
function torque(ctx, ids, c) {
  const F = ctx.params.rcs.force.value;
  return ids.reduce((x, id) => {
    const [, , cell, side] = R1_FITTINGS[id], p = [(cell[0] + 0.5 + side[0] / 2) * ctx.baseEdge, (cell[1] + 0.5 + side[1] / 2) * ctx.baseEdge];
    return x + (p[0] - c[0]) * (-side[1] * F) - (p[1] - c[1]) * (-side[0] * F);
  }, 0);
}

export default {
  id: 'L3.rcs.turn.v5',
  level: 'L3',
  laws: ['RCS: torque = distance x force (#15)', 'moment of inertia', 'rigid body, semi-implicit Euler'],
  dependsOn: ['L3.mass.props.v4'],
  setup: 'R1 at T1 (13f.2), magazine full, turret holding fire, engine off, no power routing (every room powered), at rest; a bow-stern RCS couple fired bang-bang to turn 90 degrees and stop, counter-clockwise (bow RCS on the beam bay\'s bottom edge at x = 10, stern RCS on the engine\'s top edge at x = 0) and clockwise (the other two): the turning couple for the steps that start before T / 2, then the braking couple for the steps that start before T, T = 2 sqrt((pi / 2) / alpha)',
  measure: 'angular acceleration in the first step (omega / dt); the number of turning and braking firing steps and the time the last firing step ends; omega and heading at that time; the readout\'s angular accelerations and 90 degree turn times',
  tolerance: 'alpha 1e-9 relative; the turn time one-sided on the step grid (T <= t < T + dt, 1e-9 relative float slack); the firing step counts exact and the end time (n1 + n2) dt 1e-9 relative; the heading against the discrete sum 1e-9 relative; |omega| <= alpha dt (1e-9 relative slack); readout 1e-12 relative',
  criterion: 'alpha = sum r x F / I (estimate 0.448 rad/s^2, arms 50 m); the turn takes T = 2 sqrt(theta / alpha) (estimate 3.75 s), one-sided on the step grid; the discrete turn: n1 = ceil((T / 2) / dt) turning and n2 = ceil(T / dt) - n1 braking firing steps (113 + 112, the last firing step ending at 225 / 60 s) and the heading at that time equal to the semi-implicit scheme\'s discrete sum (omega += alpha dt, then theta += omega dt, each step; 1.587523 rad) to 1e-9; final |omega| <= alpha dt; the readout\'s angular acceleration and turn time exact (#15, #58, #208, #209, #210, #219, #220, #221, #234, #235) Successor of L3.rcs.turn.v4 (#240, #243, 13k.4 S16): cell masses from 13k.2: the engine and beam bay cells are structure.cellMass (k = 3) + engine.machineryMass (k = 2) or beambay.machineryMass (k = 1) in place of the removed cellMass.engine and cellMass.beamBay, the reactor cell 150 t, rcs.mass k = 2, a heat sink cell\'s water from thermal.coupledHeatSink; R1 full is about 950.5 t (the estimates above are the old data\'s); every expected value is the same mass model computed in the scenario.',
  tunable: ['rcs.force', 'thermal.coupledHeatSink', 'structure.cellMass', 'cellMass.crewed', 'cellMass.reactor', 'engine.machineryMass', 'beambay.machineryMass', 'cellMass.shieldGenerator', 'radiator.mass', 'rcs.mass'],
  locked: null,
  cases() {
    return [{ turn: 'ccw' }, { turn: 'cw' }];
  },
  expected(ctx, c) {
    const pr = props(massItems(ctx, ctx.baseEdge, R1_ROOMS, R1_FITTINGS, fullContents(ctx, ctx.baseEdge)));
    const tau = torque(ctx, COUPLES[c.turn][0], pr.c), alpha = Math.abs(tau) / pr.I, T = 2 * Math.sqrt(TURN / alpha);
    const brake = torque(ctx, COUPLES[c.turn][1], pr.c) / pr.I, dt = ctx.dt;
    // The discrete turn (#220): the firing steps the controller's rule gives on the step grid, and the semi-implicit
    // scheme's heading summed over them (omega first, then theta), from data.js and the scheme, not the kernel.
    const n1 = Math.ceil(T / 2 / dt - 1e-9), n2 = Math.ceil(T / dt - 1e-9) - n1;
    let omega = 0, theta = 0;
    for (let k = 0; k < n1 + n2; k++) { omega += (k < n1 ? Math.sign(tau) * alpha : brake) * dt; theta += omega * dt; }
    return { alpha, sign: Math.sign(tau), T, dt, brake, n1, n2, end: (n1 + n2) * dt, theta };
  },
  run(ctx, c) {
    const { world } = buildR1(ctx);
    const b = world.ship.bodies[0], [turn, brake] = COUPLES[c.turn], start = snapshot(world), r0 = readout(world);
    const pr = props(massItems(ctx, ctx.baseEdge, R1_ROOMS, R1_FITTINGS, fullContents(ctx, ctx.baseEdge)));
    const T = 2 * Math.sqrt(TURN / (Math.abs(torque(ctx, turn, pr.c)) / pr.I)); // the controller's switching times (an input, not a check)
    let first = null, end = null, n1 = 0, n2 = 0;
    while (world.t < T - 1e-12) {
      const accelerate = world.t < T / 2;
      setRcs(world, turn, accelerate); setRcs(world, brake, !accelerate);
      step(world);
      if (accelerate) n1++; else n2++;
      if (first === null) first = b.omega / ctx.dt;
      end = world.t;
    }
    setRcs(world, [...turn, ...brake], false);
    const omega = b.omega, theta = b.theta;
    for (let i = 0; i < 30; i++) step(world); // half a second coasting: the books hold with nothing firing
    return {
      first, end, omega, theta, readout: r0.rcs, steps: Math.round(end / ctx.dt), n1, n2,
      books: world.rooms.map((r) => heatBooks(r.heat)), eventsOk: eventsOk(world.log.events), momentum: momentumOk(start, snapshot(world)),
    };
  },
  compare(e, a, c, ctx) {
    const checks = {
      'alpha = sum r x F / I': close(e.sign * e.alpha, a.first, 1e-9),
      'braking couple equal and opposite': close(-e.sign * e.alpha, e.brake, 1e-12),
      'turn time one-sided on the step grid': oneSided(e.T, a.end, ctx.dt),
      'firing steps: n1 turning + n2 braking': a.n1 === e.n1 && a.n2 === e.n2,
      'last firing step ends at (n1 + n2) dt': close(e.end, a.end, 1e-9),
      'heading = the discrete sum of the scheme, 1e-9': close(e.theta, a.theta, 1e-9),
      'final |omega| <= alpha dt': Math.abs(a.omega) <= e.alpha * ctx.dt * (1 + 1e-9),
      'readout angular acceleration': close(e.alpha, a.readout[c.turn], 1e-12),
      'readout 90 degree turn time': close(e.T, a.readout[c.turn === 'ccw' ? 'turn90ccw' : 'turn90cw'], 1e-12),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual, deg = (x) => (x * 180 / Math.PI).toFixed(4);
    return {
      expected: `alpha ${e.alpha.toFixed(6)} rad/s2, turn ${e.T.toFixed(5)} s (one-sided), ${e.n1} + ${e.n2} firing steps ending at ${e.end.toFixed(5)} s, heading ${e.theta.toFixed(6)} rad, |omega| <= ${(e.alpha / 60).toFixed(6)} rad/s`,
      actual: `alpha ${Math.abs(a.first).toFixed(6)} rad/s2, firing ends at ${a.end.toFixed(5)} s (${a.n1} + ${a.n2} steps), omega ${a.omega.toExponential(3)} rad/s, heading ${a.theta.toFixed(6)} rad (${deg(a.theta)} deg); readout ${a.readout[r.case.turn].toFixed(6)} rad/s2, ${a.readout[r.case.turn === 'ccw' ? 'turn90ccw' : 'turn90cw'].toFixed(5)} s`,
    };
  },
};
