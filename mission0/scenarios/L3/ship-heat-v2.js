import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, enablePowerRouting, setDemand, step, readout, roomTemperature } from '../../../js/rooms.js';
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
/** A cell's mass at `edge`: C / thermal.specificHeat; a heat sink cell adds (capacityFactor - 1) C / water (13f.1). */
function cellMass(ctx, type, edge) {
  const p = ctx.params, C = ctx.scaled(p.thermal.heatCapacityPerCell, edge);
  return C / p.thermal.specificHeat.value + (type === 'heatSink' ? ((p.heatsink.capacityFactor.value - 1) * C) / ctx.fixed.waterSpecificHeat.value : 0);
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

const LOADS = {
  // reactor demand = the fixed loads it feeds (no routing): cruise shield 2 MW + engine at half 5 MW + quarters 50 kW + turret 200 kW
  // (the bridge runs on its backup, #147) = 7.25 MW; battle adds the beam bay's 12.5 MW = 19.75 MW (13f.3 row 8).
  idle: { run: 900, shield: false, throttle: 0, beam: false, delivered: 0 },
  cruise: { run: 900, shield: true, throttle: 0.5, beam: false, delivered: 7.25e6 },
  battle: { run: 600, shield: true, throttle: 0.5, beam: true, delivered: 19.75e6 },
};
const LS_ROOMS = R1_ROOMS.filter((r) => ROOMS[r.type].lifeSupport).map((r) => r.id); // bridge, magazine, quarters, turret
const factor = (ctx, name) => (name ? ctx.params[name.split('.')[0]][name.split('.')[1]].value : 1);
const hmean = (a, b) => (2 * a * b) / (a + b);

/** R1's heat network from the geometry and data.js (13c.1, 13d.1): capacities, walls with their conductance, radiators, classes. */
function network(ctx) {
  const p = ctx.params, e = ctx.baseEdge, rooms = R1_ROOMS.map((r) => {
    const def = ROOMS[r.type], cells = roomCells(r.type, r.cell, r.rotation || 0);
    const cls = def.thermalClass, th = p.thermal;
    return {
      id: r.id, type: r.type, cells, n: cells.length, C: cells.length * p.thermal.heatCapacityPerCell.value * factor(ctx, def.capacityFactor), def,
      radiators: R1_FITTINGS.filter(([t, room]) => t === 'radiator' && room === r.id).length,
      th: [th[`${cls}Hot`].value, th[`${cls}Overheated`].value, th[`${cls}Critical`].value],
    };
  });
  const walls = [];
  for (let i = 0; i < rooms.length; i++) for (let j = i + 1; j < rooms.length; j++) {
    const a = rooms[i], b = rooms[j];
    const pairs = a.cells.filter(([x, y]) => b.cells.some(([u, v]) => Math.abs(x - u) + Math.abs(y - v) === 1)).reduce((n, [x, y]) => n + b.cells.filter(([u, v]) => Math.abs(x - u) + Math.abs(y - v) === 1).length, 0);
    if (!pairs) continue;
    const L = pairs * e, coolant = a.def.loop === 'coolant' && b.def.loop === 'coolant';
    const G = coolant ? p.conduction.wall.value * L * hmean(factor(ctx, a.def.coolantFactor), factor(ctx, b.def.coolantFactor)) : p.conduction.passive.value * L * hmean(factor(ctx, a.def.passiveFactor), factor(ctx, b.def.passiveFactor));
    walls.push({ a: i, b: j, L, G });
  }
  return { rooms, walls };
}
/** Heat each room generates (W) in a load, while it is not shut down (13c.1, no routing: every room powered). */
function generation(ctx, load, room) {
  const p = ctx.params;
  if (room.type === 'reactor') return p.reactor.heatPerPower.value * load.delivered;
  if (room.type === 'shieldGenerator') return load.shield ? p.shield.powerDraw.value : 0;
  if (room.type === 'engine') return load.throttle * p.engine.powerDraw.value * p.engine.heatFraction.value;
  if (room.type === 'beamBay') return load.beam ? p.beam.power.value / p.beambay.efficiency.value - p.beam.power.value : 0;
  if (room.type === 'bridge') return p.bridge.powerDraw.value;
  if (room.type === 'quarters') return p.quarters.powerDraw.value;
  return 0; // turret holding fire, magazine, hold, heat sink
}
const rk4 = (T, deriv, t, h) => {
  const k1 = deriv(T, t), k2 = deriv(T.map((v, i) => v + (h / 2) * k1[i]), t + h / 2), k3 = deriv(T.map((v, i) => v + (h / 2) * k2[i]), t + h / 2), k4 = deriv(T.map((v, i) => v + h * k3[i]), t + h);
  return T.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
};
/**
 * Reference integrator (13d.2's convention: RK4 at dt / 10 inside each step, from data.js and every rule of L1, L2
 * and the D pass, never the kernel): conduction through every wall (coolant or passive by 13d.1), radiators by
 * Stefan-Boltzmann, each room's generation while it is not shut down, the reactor's decay heat f h P e^(-t / tau)
 * from a shutdown, life support taken once per step (13d.1: min(capacity x cells x dt, C (T - setpoint)) out of
 * the room, split over its coolant neighbours by wall length, spread over the step). Thresholds on the step grid
 * as the kernel reports them (13c.1): hot, overheated (shutdown: no own heat from the next step), critical, and a
 * restart when a room that was hot falls below hot.
 */
function reference(ctx, load) {
  const p = ctx.params, dt = ctx.dt, h = dt / 10, { rooms, walls } = network(ctx);
  const sigmaA = ctx.fixed.radiatorEmissivity.value * ctx.fixed.stefanBoltzmann.value * p.radiator.area.value, set = ctx.fixed.lifeSupportSetpoint.value;
  const tau = p.reactor.decayTime.value, decay = [];
  let T = rooms.map(() => ctx.fixed.restTemperature.value);
  const st = rooms.map(() => ({ hot: false, over: false, crit: false, shut: false }));
  const events = rooms.map(() => []), peak = rooms.map(() => ctx.fixed.restTemperature.value);
  let gen = [], pump = [];
  const deriv = (x, t) => {
    const q = rooms.map((r, i) => gen[i] + pump[i] - r.radiators * sigmaA * x[i] ** 4);
    for (const w of walls) { const f = w.G * (x[w.a] - x[w.b]); q[w.a] -= f; q[w.b] += f; }
    const ri = rooms.findIndex((r) => r.type === 'reactor');
    for (const d of decay) q[ri] += d.P0 * Math.exp(-(t - d.t) / tau);
    return q.map((v, i) => v / rooms[i].C);
  };
  const steps = Math.ceil(load.run / dt - 1e-9);
  for (let n = 0; n < steps; n++) {
    gen = rooms.map((r, i) => (st[i].shut ? 0 : generation(ctx, load, r)));
    pump = rooms.map(() => 0);
    rooms.forEach((r, i) => {
      if (!r.def.lifeSupport || !(T[i] > set)) return;
      const sinks = walls.filter((w) => (w.a === i && rooms[w.b].def.loop === 'coolant') || (w.b === i && rooms[w.a].def.loop === 'coolant'));
      if (!sinks.length) return;
      const E = Math.min(p.lifeSupport.capacityPerCell.value * r.n * dt, r.C * (T[i] - set)), total = sinks.reduce((x, w) => x + w.L, 0);
      for (const w of sinks) { const o = w.a === i ? w.b : w.a, e = (E * w.L) / total; pump[i] -= e / dt; pump[o] += e / dt; }
    });
    for (let s = 0; s < 10; s++) T = rk4(T, deriv, n * dt + s * h, h);
    const t = (n + 1) * dt;
    rooms.forEach((r, i) => {
      const x = st[i], [hot, over, crit] = r.th;
      peak[i] = Math.max(peak[i], T[i]);
      if (!x.hot && T[i] >= hot) { x.hot = true; events[i].push(['hot', t]); }
      if (!x.over && T[i] >= over) {
        x.over = true; events[i].push(['overheated', t]);
        if (!x.shut) { x.shut = true; if (r.type === 'reactor') decay.push({ t, P0: p.reactor.decayFraction.value * p.reactor.heatPerPower.value * load.delivered }); }
      }
      if (!x.crit && T[i] >= crit) { x.crit = true; events[i].push(['critical', t]); }
      if (x.hot && T[i] < hot) { x.hot = false; x.over = false; if (x.shut) { x.shut = false; events[i].push(['restart', t]); } }
    });
  }
  return { events: Object.fromEntries(rooms.map((r, i) => [r.id, events[i]])), peak: Object.fromEntries(rooms.map((r, i) => [r.id, peak[i]])) };
}

export default {
  id: 'L3.ship.heat.v2',
  level: 'L3',
  laws: ['heat leaves only by radiation (Stefan-Boltzmann)', 'heat moves fast along the coolant loop; crew rooms and magazines are insulated and cooled by life support (#200, #201)', 'three heat thresholds per room (#18b)', 'the throughput law: radiators bound sustained power (#205 (8))'],
  dependsOn: ['L3.mass.props.v2', 'L2.lifesupport.routed.v2', 'L2.reactor.cooled', 'L2.heatsink.buffer', 'L1.beambay.heat'],
  setup: 'R1 at T1 (13f.2) with its 17 radiators, no power routing (fixed loads, every room powered), the turret holding fire, magazine full, every room at 290 K: idle (bridge and quarters only, reactor at demand 0, shield off) for 900 s; cruise (shield on, engine at half throttle, the reactor delivering 7.25 MW) for 900 s; battle (cruise plus the beam bay firing, the reactor delivering 19.75 MW) for 600 s',
  measure: 'per room: the times of hot, overheated, critical and restart; peak temperatures; heat books; the readout\'s heat balance and radiator capacity at plant hot',
  tolerance: 'books within max(1e-9 x the largest flow, 1e-10 x the room\'s heat at the start); readout 1e-12 relative; event times 1e-3 relative to the reference, the same events in the same order per room; crewed rooms\' peak temperatures 0.01 K absolute against the reference, each below its hot threshold (330 K)',
  criterion: 'heat books per room within max(1e-9 x the largest flow, 1e-10 x the room\'s heat at the start) and per ship 1e-9; the readout\'s heat balance (the generation of the load) and radiator capacity at plant hot (17 panels: 2.81 MW) exact; event times (hot, overheated, restart; critical) against the scenario\'s reference integrator, which carries every L1, L2 and D-pass rule over the whole run, 1e-3: estimates idle none (plant rooms near 300 K), cruise hot at 509 s (shield generator), 513 s (reactor), 550 s (engine), nothing overheated in 900 s (reactor peak ~743 K), battle beam bay hot at 103 s and overheated at 178 s (outside the loop), reactor hot at 157 s, later events after the beam bay\'s shutdown left to the reference; while life support runs, the crewed rooms\' (bridge, magazine, quarters, turret) peak temperatures match the reference integrator within 0.01 K and none reaches its hot threshold (crewed hot 330 K; magazine hot 330 K): the bridge beside a reactor at 740-800 K rises to about 295.3 K (cruise) and 295.7 K (battle), the reactor\'s passive leak plus its own draw exceeding its life support (#205 (8)) (#143, #182, #200, #201, #205, #209, #219)',
  tunable: ['thermal.heatCapacityPerCell', 'radiator.area', 'conduction.wall', 'conduction.passive', 'lifeSupport.capacityPerCell', 'heatsink.capacityFactor', 'heatsink.conductivityFactor', 'reactor.decayFraction', 'reactor.decayTime', 'shield.powerDraw', 'engine.powerDraw', 'engine.heatFraction', 'beam.power', 'beambay.efficiency', 'bridge.powerDraw', 'quarters.powerDraw'],
  locked: { date: '2026-10-21', hash: '0667f5ed' },
  cases() {
    return Object.keys(LOADS).map((load) => ({ load }));
  },
  expected(ctx, c) {
    const load = LOADS[c.load], { rooms } = network(ctx), p = ctx.params;
    const generated = rooms.reduce((x, r) => x + generation(ctx, load, r), 0);
    const panels = rooms.reduce((x, r) => x + r.radiators, 0);
    const capacity = panels * ctx.fixed.radiatorEmissivity.value * ctx.fixed.stefanBoltzmann.value * p.radiator.area.value * p.thermal.plantHot.value ** 4;
    const ref = reference(ctx, load);
    return { generated, capacity, panels, events: ref.events, peak: ref.peak, hot: Object.fromEntries(rooms.map((r) => [r.id, r.th[0]])) };
  },
  run(ctx, c) {
    const load = LOADS[c.load];
    const { world, room } = buildR1(ctx, {
      setup: (w, r) => {
        r('shield').shield.on = load.shield;
        r('engine').engine.throttle = load.throttle;
        r('beamBay').beamBay.firing = load.beam;
        setDemand(w, r('reactor'), load.delivered / ctx.params.reactor.power.value);
      },
    });
    const start = snapshot(world), ro = readout(world), peak = Object.fromEntries(world.rooms.map((r) => [r.id, roomTemperature(r)]));
    const steps = Math.ceil(load.run / ctx.dt - 1e-9);
    while (world.step < steps) { step(world); for (const r of world.rooms) peak[r.id] = Math.max(peak[r.id], roomTemperature(r)); }
    const events = Object.fromEntries(world.rooms.map((r) => [r.id, world.log.events.filter((e) => e.room === r.id && ['hot', 'overheated', 'critical', 'restart'].includes(e.type)).map((e) => [e.type, e.t])]));
    return {
      heat: ro.heat, events, peak, lifeSupport: LS_ROOMS.every((id) => room(id).lifeSupportOn),
      books: world.rooms.map((r) => heatBooks(r.heat)), eventsOk: eventsOk(world.log.events), momentum: momentumOk(start, snapshot(world)),
    };
  },
  compare(e, a) {
    const ids = Object.keys(e.events);
    const checks = {
      'readout heat generated': close(e.generated, a.heat.generated, 1e-12),
      'readout radiator capacity at plant hot': a.heat.panels === e.panels && close(e.capacity, a.heat.capacity, 1e-12),
      'same events in the same order, every room': ids.every((id) => a.events[id].length === e.events[id].length && e.events[id].every(([type], i) => a.events[id][i][0] === type)),
      'event times against the reference, 1e-3': ids.every((id) => e.events[id].every(([, t], i) => a.events[id][i] && close(t, a.events[id][i][1], 1e-3))),
      'crewed rooms\' peaks against the reference within 0.01 K, below hot, while life support runs': a.lifeSupport && LS_ROOMS.every((id) => Number.isFinite(a.peak[id]) && Math.abs(a.peak[id] - e.peak[id]) <= 0.01 && a.peak[id] < e.hot[id]),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const ev = (x) => Object.entries(x).filter(([, l]) => l.length).map(([id, l]) => `${id} ${l.map(([t, s]) => `${t}@${s.toFixed(2)}`).join(' ')}`).join('; ') || 'none';
    const pk = (x) => Object.entries(x).map(([id, T]) => `${id} ${T.toFixed(3)}`).join(', ');
    return {
      expected: `generated ${(r.expected.generated / 1e6).toFixed(4)} MW against ${(r.expected.capacity / 1e6).toFixed(4)} MW (${r.expected.panels} panels at plant hot); events ${ev(r.expected.events)}; peaks ${pk(r.expected.peak)} K (reference)`,
      actual: `generated ${(r.actual.heat.generated / 1e6).toFixed(4)} MW against ${(r.actual.heat.capacity / 1e6).toFixed(4)} MW; events ${ev(r.actual.events)}; peaks ${pk(r.actual.peak)} K`,
    };
  },
};
