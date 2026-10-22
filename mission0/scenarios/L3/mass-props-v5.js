import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, enablePowerRouting, readout, step, cellAt, destroyCell } from '../../../js/rooms.js';
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

/** Connected sets of grid cells (keys 'x,y') through shared edges, each sorted, ordered by their first cell. */
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
const SPLIT = [[5, 2], [5, 3], [4, 4], [4, 5]]; // the cut of L3.split.momentum: the bridge's aft column and the heat sink's forward column
const FOUR = [[5, 5], [6, 5], [7, 0], [8, 0]]; // four cells that split nothing: two of the quarters, two of the hold
const ROOM_TYPES = ['bridge', 'reactor', 'engine', 'magazine', 'shieldGenerator', 'quarters', 'beamBay', 'turret', 'hold', 'heatSink'];
const FIRED = 20;

export default {
  id: 'L3.mass.props.v5',
  level: 'L3',
  laws: ['inertia and moment of inertia', 'structural cell mass, apart from heat capacity (#221)', 'centre-of-mass shift when rooms are lost', 'square-cube law'],
  dependsOn: ['L2.size.rule'],
  setup: 'ships made from clusters at T1 and T6 (13f.1, 13f.2): one M room alone (each of the ten built types; the magazine and the turret also full: the magazine at its capacity in M rounds, the turret its ready store); the reference ship R1 full; R1 after its turret fired 20 rounds broadside and the feed refilled its store; R1 after four cells were destroyed that split nothing (quarters (5,5), (6,5), hold (7,0), (8,0)); R1 after the cut of L3.split.momentum (bridge (5,2), (5,3), heat sink (4,4), (4,5)), per fragment',
  measure: 'the kernel\'s mass of one M cell and of one heat sink cell; M, centre of mass and moment of inertia from the readout (the whole ship) or per body after a split',
  tolerance: 'relative 1e-12 (the centre of mass per coordinate, relative to the larger value); the scaling ratios relative 1e-12',
  criterion: 'M = sum of masses, centre of mass = sum m p / M and I = sum m (a^2 / 6 + d^2) over cells (squares of edge a at their centres) and point masses (contents at their room\'s centre, fittings at their edge\'s midpoint), cell mass = its type\'s constants of 13k.2 (at T1: hold, magazine and heat sink structure.cellMass 3 000 kg; crew rooms cellMass.crewed 14 800 kg; reactor 150 000 kg; engine 3 000 + 2 700 = 5 700 kg; beam bay 3 000 + 2 500 = 5 500 kg; shield generator 10 000 kg) and a heat sink cell + (heatsink.capacityFactor - 1) C / FIXED.waterSpecificHeat with C = thermal.coupledHeatSink (3 000 + 4 x 1.35e6 / 4186 = 4 290.01 kg); R1 full about 950.5 t, contents of M rounds of kinetic.roundMass, radiator.mass and rcs.mass; a destroyed cell takes its fittings with it; 1e-12 relative; the cell and each room alone or full whose cells are one k = 3 constant have at T6 6^3 the mass and 6^5 the moment of inertia of T1 (1e-12; the engine and beam bay are checked against their own sums); thrust per kilogram of engine machinery is identical at T1 and T6 (1e-12); R1 at T6 is checked against its own cell sums (#208, #210, #219, #221, #232, #234, #235) Successor of L3.mass.props.v4 (#240, #243, 13k.4 S16): 13k.4 S8: the split masses of 13k.2 (engine and beam bay structure + machinery at their own exponents, the reactor 150 t, rcs.mass k = 2, the heat sink\'s water from thermal.coupledHeatSink); the 6^3 / 6^5 invariant is limited to rooms whose cells are one k = 3 constant; a new invariant checks thrust per machinery kilogram identical across tiers.',
  tunable: ['thermal.coupledHeatSink', 'structure.cellMass', 'cellMass.crewed', 'cellMass.reactor', 'engine.machineryMass', 'beambay.machineryMass', 'cellMass.shieldGenerator', 'heatsink.capacityFactor', 'kinetic.roundMass', 'magazine.capacity', 'radiator.mass', 'rcs.mass', 'turret.readyRounds'],
  locked: null,
  cases() {
    const out = [];
    for (const tier of ['T1', 'T6']) {
      out.push({ what: 'cell', tier });
      for (const type of ROOM_TYPES) {
        out.push({ what: 'room', type, contents: 'empty', tier });
        if (type === 'magazine' || type === 'turret') out.push({ what: 'room', type, contents: 'full', tier });
      }
      for (const state of ['full', 'fired', 'four destroyed', 'split']) out.push({ what: 'R1', state, tier });
    }
    return out;
  },
  expected(ctx, c) {
    const edge = ctx.tiers[c.tier].edge;
    if (c.what === 'cell') return { cell: cellMass(ctx, 'hold', edge), sinkCell: cellMass(ctx, 'heatSink', edge) };
    if (c.what === 'room') {
      const contents = c.contents === 'full' ? { [c.type]: c.type === 'magazine' ? fullContents(ctx, edge).magazine : fullContents(ctx, edge).turret } : {};
      return { bodies: [props(massItems(ctx, edge, [{ id: c.type, type: c.type, cell: [0, 0] }], [], contents))] };
    }
    const full = fullContents(ctx, edge);
    if (c.state === 'full') return { bodies: [props(massItems(ctx, edge, R1_ROOMS, R1_FITTINGS, full))] };
    if (c.state === 'fired') return { bodies: [props(massItems(ctx, edge, R1_ROOMS, R1_FITTINGS, { magazine: full.magazine - FIRED, turret: full.turret }))] };
    const gone = new Set((c.state === 'split' ? SPLIT : FOUR).map(([x, y]) => `${x},${y}`));
    const items = massItems(ctx, edge, R1_ROOMS, R1_FITTINGS, full, gone);
    if (c.state === 'four destroyed') return { bodies: [props(items)] };
    // Fragments: connected sets of the surviving cells; contents and fittings go with their room's cells (each room
    // lies in one fragment here), the heavier fragment first.
    const comps = components(items.filter((i) => i.a > 0).map((i) => `${i.cell[0]},${i.cell[1]}`));
    const roomsOf = comps.map((comp) => new Set(items.filter((i) => i.a > 0 && comp.includes(`${i.cell[0]},${i.cell[1]}`)).map((i) => i.room)));
    const bodies = roomsOf.map((rs) => props(items.filter((i) => rs.has(i.room)))).sort((a, b) => b.M - a.M);
    return { bodies };
  },
  run(ctx, c) {
    const edge = ctx.tiers[c.tier].edge, p = ctx.params;
    let world;
    if (c.what === 'cell' || c.what === 'room') {
      world = createWorld({ params: p, edge, dt: ctx.dt, grid: ctx.tiers[c.tier].grid });
      if (c.what === 'cell') { addRoom(world, 'hold', { id: 'hold', cell: [0, 0] }); addRoom(world, 'heatSink', { id: 'heatSink', cell: [4, 0] }); }
      else {
        const room = addRoom(world, c.type, { id: c.type, cell: [0, 0] });
        if (c.contents === 'full' && c.type === 'magazine') loadMagazine(world, room, { heMass: ctx.scaled(p.magazine.capacity, edge) });
        if (c.contents === 'full' && c.type === 'turret') loadTurret(room, p.turret.readyRounds.value);
        if (c.type === 'turret') room.turret.hold = true;
      }
    } else {
      ({ world } = buildR1(ctx, { tier: c.tier }));
    }
    if (!world.ship) enableShip(world);
    const start = snapshot(world);
    if (c.what === 'cell') {
      const items = world.ship.items;
      return { cell: items.get('hold:0').m, sinkCell: items.get('heatSink:0').m, books: world.rooms.map((r) => heatBooks(r.heat)), eventsOk: eventsOk(world.log.events), momentum: momentumOk(start, snapshot(world)) };
    }
    if (c.state === 'fired') {
      const t = world.rooms.find((r) => r.id === 'turret');
      t.turret.hold = false;
      while (t.turret.shots < FIRED && world.t < 1e4) step(world);
      t.turret.hold = true;
      while (t.turret.ammo < p.turret.readyRounds.value && world.t < 1e4) step(world);
    }
    if (c.state === 'four destroyed' || c.state === 'split') {
      (c.state === 'split' ? SPLIT : FOUR).forEach((xy, i) => { const at = cellAt(world, xy); destroyCell(world, at.room, at.index, `cut-${i + 1}`); });
    }
    const r = readout(world);
    const bodies = c.what === 'R1' && c.state === 'split'
      ? world.ship.bodies.map((b) => ({ M: b.M, c: b.c, I: b.I })).sort((a, b) => b.M - a.M)
      : [{ M: r.mass, c: r.centre, I: r.inertia }];
    return {
      bodies, rounds: world.ship.rounds.length, magazine: world.rooms.find((x) => x.type === 'magazine')?.magazine.he ?? null,
      books: world.rooms.map((x) => heatBooks(x.heat)), eventsOk: eventsOk(world.log.events), momentum: momentumOk(start, snapshot(world)),
    };
  },
  compare(e, a) {
    const checks = {};
    if (e.cell !== undefined) {
      checks['cell mass'] = close(e.cell, a.cell, 1e-12);
      checks['heat sink cell mass'] = close(e.sinkCell, a.sinkCell, 1e-12);
    } else {
      checks['number of bodies'] = a.bodies.length === e.bodies.length;
      checks['M, centre of mass, I'] = checks['number of bodies'] && e.bodies.every((b, i) => close(b.M, a.bodies[i].M, 1e-12) && close(b.c[0], a.bodies[i].c[0], 1e-12) && close(b.c[1], a.bodies[i].c[1], 1e-12) && close(b.I, a.bodies[i].I, 1e-12));
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    const s = ctx.tiers.T6.edge / ctx.tiers.T1.edge;
    const pairs = rows.filter((r) => r.case.tier === 'T1' && r.case.what !== 'R1').map((r) => [r, rows.find((q) => q.case.tier === 'T6' && q.case.what === r.case.what && q.case.type === r.case.type && q.case.contents === r.case.contents)]);
    const ratio = (x, y, n) => close(s ** n, y / x, 1e-12);
    // Rooms whose cells are one constant at k = 3 keep 6^3 and 6^5; the engine and the beam bay (machinery at k = 2 and
    // k = 1) and the heat sink (its water at k = 3, but structure + water) are checked against their own sums by the rows.
    const pure = pairs.filter(([a]) => a.case.what === 'cell' || !['engine', 'beamBay'].includes(a.case.type));
    // Thrust per kilogram of engine machinery, from the kernel's masses: (engine room alone / 6 cells - one hold cell)
    // is the machinery per cell; engine.thrust (k = 2) over 6 cells of it is the same at T1 and T6 (F11, 13k.4 S8).
    const perKg = (tier) => {
      const eng = rows.find((r) => r.case.tier === tier && r.case.type === 'engine').actual.bodies[0].M, hold = rows.find((r) => r.case.tier === tier && r.case.what === 'cell').actual.cell;
      return ctx.scaled(ctx.params.engine.thrust, ctx.tiers[tier].edge) / (eng - 6 * hold);
    };
    return [
      ...common(rows),
      { name: 'mass x 6^3 and moment of inertia x 6^5 from T1 to T6: one cell, each room alone and each full room whose cells are one k = 3 constant', ok: pure.every(([a, b]) => (a.actual.cell !== undefined ? ratio(a.actual.cell, b.actual.cell, 3) && ratio(a.actual.sinkCell, b.actual.sinkCell, 3) : ratio(a.actual.bodies[0].M, b.actual.bodies[0].M, 3) && ratio(a.actual.bodies[0].I, b.actual.bodies[0].I, 5))) },
      { name: 'thrust per kilogram of engine machinery identical at T1 and T6 (1e-12; about 925.9 N/kg = 1.5e7 / (6 x 2700))', ok: close(perKg('T1'), perKg('T6'), 1e-12) && close(1.5e7 / (6 * 2700), perKg('T1'), 1e-12) },
    ];
  },
  display(r) {
    const f = (b) => b.map((x) => `M ${(x.M / 1e3).toFixed(4)} t, c (${x.c[0].toFixed(4)}, ${x.c[1].toFixed(4)}) m, I ${x.I.toExponential(6)} kg m2`).join(' | ');
    if (r.expected.cell !== undefined) return { expected: `cell ${r.expected.cell.toFixed(4)} kg, heat sink cell ${r.expected.sinkCell.toFixed(4)} kg`, actual: `cell ${r.actual.cell.toFixed(4)} kg, heat sink cell ${r.actual.sinkCell.toFixed(4)} kg` };
    return { expected: f(r.expected.bodies), actual: f(r.actual.bodies) + (r.case.state === 'fired' ? ` (${r.actual.rounds} rounds in flight, magazine ${r.actual.magazine})` : '') };
  },
};
