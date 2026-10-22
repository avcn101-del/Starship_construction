import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, enablePowerRouting, step, cellAt, destroyCell } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';

// Successor of L3.split.momentum.v5 (#285, DESIGN.md 13n.4 M1): the turret by its mount. The only change is the turret's entry in
// CELL_MASS (structure.cellMass + turret.machineryMass, 3000 + 1975 = 4975 kg per cell at T1, in place of
// cellMass.crewed's 14 800 kg), turret.machineryMass among the tunables and the criterion's successor note.
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
const CELL_MASS = { bridge: ['cellMass.crewed'], quarters: ['cellMass.crewed'], turret: ['structure.cellMass', 'turret.machineryMass'], missileBay: ['cellMass.crewed'], reactor: ['cellMass.reactor'], shieldGenerator: ['cellMass.shieldGenerator'], railgun: ['cellMass.railgun'], engine: ['structure.cellMass', 'engine.machineryMass'], beamBay: ['structure.cellMass', 'beambay.machineryMass'] };
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

const CUT = [[5, 2], [5, 3], [4, 4], [4, 5]]; // the bridge's aft column and the heat sink's forward column
const V0 = [10, 0], W0 = 0.05; // m/s, rad/s
const STEPS_BEFORE = 31, STEPS_AFTER = 61; // the cut lands between steps, then the pieces fly on
/** Connected sets of grid cells (keys 'x,y') through shared edges. */
function components(keys) {
  const left = new Set(keys), out = [];
  for (const k of [...keys].sort()) {
    if (!left.has(k)) continue;
    const comp = [], queue = [k];
    left.delete(k);
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i].split(',').map(Number);
      comp.push(queue[i]);
      for (const n of [`${x + 1},${y}`, `${x - 1},${y}`, `${x},${y + 1}`, `${x},${y - 1}`]) if (left.has(n)) { left.delete(n); queue.push(n); }
    }
    out.push(comp);
  }
  return out;
}

export default {
  id: 'L3.split.momentum.v6',
  level: 'L3',
  laws: ['fragments: a ship split by the structure graph becomes several rigid bodies, momentum conserved (#13)', 'centre-of-mass shift when rooms are lost', 'debris keeps the velocity of its point'],
  dependsOn: ['L3.mass.props.v4'],
  setup: 'R1 at T1 (13f.2), magazine full, turret holding fire, engine off, no power routing, moving at (10, 0) m/s and turning at 0.05 rad/s from the origin; after 31 steps the bridge cells (5,2), (5,3) and the heat sink cells (4,4), (4,5) are destroyed between two steps, then 61 more steps',
  measure: 'just before and just after the cut: mass, momentum, angular momentum about the origin and kinetic energy of everything (bodies, debris); the fragments\' masses, velocities and angular velocities; the debris; the same books at the end',
  tolerance: 'conservation 1e-9 relative; each fragment\'s v and omega 1e-9 relative to the parent\'s speed at that point (omega relative)',
  criterion: 'two fragments (stern ~584 t of cells: engine, reactor, shield generator, half the heat sink; bow ~224 t: the bridge\'s other half, magazine, quarters, turret, beam bay, hold) and the 4 cells as debris (~37 t; the radiator on heat sink cell (4,5) leaves with its cell); mass, momentum, angular momentum about the origin and kinetic energy conserved at the cut (1e-9) and through the flight after it; each fragment\'s v and omega equal the parent\'s velocity field at its centre of mass (stern ~(10.10, -0.27) m/s, bow ~(9.74, 0.68) m/s from the cells alone), the fragments\' masses from the cell sums (13f.1) (#13, #208, #209, #219, #221, #234, #235) Successor of L3.split.momentum.v4 (#240, #243, 13k.4 S16): cell masses from 13k.2: the engine and beam bay cells are structure.cellMass (k = 3) + engine.machineryMass (k = 2) or beambay.machineryMass (k = 1) in place of the removed cellMass.engine and cellMass.beamBay, the reactor cell 150 t, rcs.mass k = 2, a heat sink cell\'s water from thermal.coupledHeatSink; R1 full is about 950.5 t (the estimates above are the old data\'s); every expected value is the same mass model computed in the scenario. Successor of L3.split.momentum.v5 (#285, DESIGN.md 13n.4 M1): the turret by its mount, its cells structure.cellMass + turret.machineryMass (3 000 + 1 975 = 4 975 kg at T1, both k = 3) in place of cellMass.crewed (14 800 kg); R1 full at T1 is hand-worked from the cell masses: engine 6 x (3 000 + 2 700) + reactor 4 x 150 000 + bridge 4 x 14 800 + magazine 4 x 3 000 + its 900 kg of rounds + beam bay 4 x (3 000 + 2 500) + heat sink 4 x (3 000 + 4 x 1.35e6 / 4186) + quarters 6 x 14 800 + turret 4 x (3 000 + 1 975) + its 24 kg of rounds + shield generator 4 x 10 000 + hold 4 x 3 000 + 17 radiators x 250 + 4 RCS x 200 = 911 234.057 kg, 39 300 kg less than with cellMass.crewed; every check of L3.split.momentum.v5 kept. The estimates above are the old data\'s; every expected value is the scenario\'s own mass model with the turret\'s new cell mass. The bow fragment, which holds the turret, is 39.3 t lighter (about 185 t); the stern and the debris are unchanged.',
  tunable: ['turret.machineryMass', 'thermal.coupledHeatSink', 'structure.cellMass', 'cellMass.crewed', 'cellMass.reactor', 'engine.machineryMass', 'beambay.machineryMass', 'cellMass.shieldGenerator', 'heatsink.capacityFactor', 'radiator.mass', 'rcs.mass'],
  locked: { date: '2026-10-22', hash: 'e247dbd9' },
  cases() {
    return [{ tier: 'T1' }, { tier: 'T6' }];
  },
  expected(ctx, c) {
    const edge = ctx.tiers[c.tier].edge, full = fullContents(ctx, edge), gone = new Set(CUT.map(([x, y]) => `${x},${y}`));
    const items = massItems(ctx, edge, R1_ROOMS, R1_FITTINGS, full, gone), parent = props(massItems(ctx, edge, R1_ROOMS, R1_FITTINGS, full));
    const comps = components(items.filter((i) => i.a > 0).map((i) => `${i.cell[0]},${i.cell[1]}`));
    const fragments = comps.map((comp) => {
      const rooms = new Set(items.filter((i) => i.a > 0 && comp.includes(`${i.cell[0]},${i.cell[1]}`)).map((i) => i.room));
      return { rooms: [...rooms].sort(), ...props(items.filter((i) => rooms.has(i.room))) };
    }).sort((a, b) => b.M - a.M);
    const debris = massItems(ctx, edge, R1_ROOMS, R1_FITTINGS, full).filter((i) => (i.a > 0 && gone.has(`${i.cell[0]},${i.cell[1]}`)) || (i.fitting && R1_FITTINGS.some(([, , cell, side]) => gone.has(`${cell[0]},${cell[1]}`) && Math.abs((cell[0] + 0.5 + side[0] / 2) * edge - i.p[0]) < 1e-9 && Math.abs((cell[1] + 0.5 + side[1] / 2) * edge - i.p[1]) < 1e-9)));
    return { fragments: fragments.map((f) => ({ rooms: f.rooms, M: f.M })), debrisPieces: debris.length, debrisMass: debris.reduce((x, d) => x + d.m, 0), parentM: parent.M };
  },
  run(ctx, c) {
    const { world } = buildR1(ctx, { tier: c.tier, velocity: V0, omega: W0 });
    const start = snapshot(world);
    for (let i = 0; i < STEPS_BEFORE; i++) step(world);
    const before = snapshot(world), parent = { ...world.ship.bodies[0], x: [...world.ship.bodies[0].x], v: [...world.ship.bodies[0].v] };
    CUT.forEach((xy, i) => { const at = cellAt(world, xy); destroyCell(world, at.room, at.index, `cut-${i + 1}`); });
    const after = snapshot(world);
    const field = (q) => [parent.v[0] - parent.omega * (q[1] - parent.x[1]), parent.v[1] + parent.omega * (q[0] - parent.x[0])];
    const fragments = world.ship.bodies.map((b) => ({
      id: b.id, M: b.M, v: [...b.v], omega: b.omega, field: field(b.x),
      rooms: world.rooms.filter((r) => r.body === b.id && r.cells.some((x) => !x.destroyed)).map((r) => r.id).sort(),
    })).sort((a, b) => b.M - a.M);
    const debris = world.ship.debris.map((d) => ({ m: d.m, v: [...d.v], omega: d.omega, field: field(d.x), from: d.from }));
    for (let i = 0; i < STEPS_AFTER; i++) step(world);
    const end = snapshot(world);
    const K = { before: before.K, after: after.K, end: end.K };
    return {
      fragments, debris, K, scale: Math.hypot(parent.v[0], parent.v[1]) + Math.abs(parent.omega) * 100 * ctx.tiers[c.tier].edge,
      atCut: momentumOk(before, after), flight: momentumOk(after, end),
      books: world.rooms.map((r) => heatBooks(r.heat)), eventsOk: eventsOk(world.log.events), momentum: momentumOk(start, end),
    };
  },
  compare(e, a) {
    const near = (x, y, s) => Math.hypot(x[0] - y[0], x[1] - y[1]) <= 1e-9 * s;
    const checks = {
      'two fragments with the rooms of the cell sums': a.fragments.length === e.fragments.length && e.fragments.every((f, i) => f.rooms.join() === a.fragments[i].rooms.join()),
      'fragment masses from the cell sums': a.fragments.length === e.fragments.length && e.fragments.every((f, i) => close(f.M, a.fragments[i].M, 1e-12)),
      'debris: the four cells and the fittings on them': a.debris.length === e.debrisPieces && close(e.debrisMass, a.debris.reduce((x, d) => x + d.m, 0), 1e-12),
      'mass, momentum, angular momentum conserved at the cut': a.atCut.mass && a.atCut.momentum && a.atCut.angular,
      'kinetic energy conserved at the cut': close(a.K.before, a.K.after, 1e-9),
      'conserved through the flight after the cut': a.flight.mass && a.flight.momentum && a.flight.angular && close(a.K.after, a.K.end, 1e-9),
      'each fragment and piece moves with the parent\'s velocity field': [...a.fragments, ...a.debris].every((f) => near(f.v, f.field, a.scale) && close(0.05, f.omega, 1e-9)),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual, t = (m) => (m / 1e3).toFixed(3);
    return {
      expected: `fragments ${e.fragments.map((f) => `${t(f.M)} t [${f.rooms.join(' ')}]`).join(' + ')}; debris ${e.debrisPieces} pieces, ${t(e.debrisMass)} t; parent ${t(e.parentM)} t`,
      actual: `fragments ${a.fragments.map((f) => `${t(f.M)} t at (${f.v[0].toFixed(4)}, ${f.v[1].toFixed(4)}) m/s, ${f.omega.toFixed(6)} rad/s`).join(' + ')}; debris ${a.debris.length} pieces, ${t(a.debris.reduce((x, d) => x + d.m, 0))} t; |dP| at the cut ${a.atCut.dP.toExponential(2)}, |dL| ${a.atCut.dL.toExponential(2)}, K ${a.K.before.toExponential(9)} -> ${a.K.after.toExponential(9)} J`,
    };
  },
};
