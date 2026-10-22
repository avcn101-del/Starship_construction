import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, enablePowerRouting, step, cellAt, destroyCell, setRcs } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';

// Successor of L3.fragment.rules.v3 (#285, DESIGN.md 13n.4 M1): the turret by its mount. The only change is the turret's entry in
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
/** Fragments of a ship after the cells in `gone` are lost: each the rooms of one connected set of surviving cells and its mass properties; a cell counts where it lies (a split room's dead weight too, 13f.1), contents and fittings with their room (no room that holds either is split here). */
function fragmentsOf(ctx, edge, rooms, fittings, contents, gone) {
  const items = massItems(ctx, edge, rooms, fittings, contents, gone);
  const comps = components(items.filter((i) => i.a > 0).map((i) => `${i.cell[0]},${i.cell[1]}`));
  return comps.map((comp) => {
    const cellIn = (i) => i.a > 0 && comp.includes(`${i.cell[0]},${i.cell[1]}`);
    const roomsHere = new Set(items.filter(cellIn).map((i) => i.room));
    const mine = items.filter((i) => cellIn(i) || (i.a === 0 && roomsHere.has(i.room)));
    return { rooms: [...roomsHere].sort(), cells: comp, ...props(mine) };
  });
}

const CUT = [[5, 2], [5, 3], [4, 4], [4, 5]]; // L3.split.momentum's cut: the bridge's aft column and the heat sink's forward column
const BEFORE = 31, AFTER = 60; // steps: the cut lands between two steps, off the 0.5 s mark
// (b) and (c): a row of four rooms two cells tall: a bridge, then three heat sinks A, B, C; B is split evenly by
// destroying two of its cells on a diagonal, so its two surviving cells lie in different fragments.
const ROW = [{ id: 'bridge', type: 'bridge', cell: [0, 0] }, { id: 'sinkA', type: 'heatSink', cell: [2, 0] }, { id: 'sinkB', type: 'heatSink', cell: [4, 0] }, { id: 'sinkC', type: 'heatSink', cell: [6, 0] }];
const ROW_T = { bridge: null, sinkA: 290, sinkB: 350, sinkC: 400 }; // K at the start (null: rest)
// B's cells (13d.1: k = j w + i): k0 (4,0), k1 (5,0), k2 (4,1), k3 (5,1). 'low' keeps k0 (beside A) and k3 (beside C);
// 'high' keeps k2 (beside A) and k1 (beside C). Each time the lower-indexed survivor decides (k0, then k1).
const TIES = { low: { gone: [[5, 0], [4, 1]], works: [4, 0], dead: [5, 1] }, high: { gone: [[4, 0], [5, 1]], works: [5, 0], dead: [4, 1] } };
const ROW_AFTER = 600; // steps after the cut: 10 s
const EXCHANGE_FLOOR = 1e6; // J: a live coolant wall between C (400 K) and B (350 K) moves far more in 10 s (estimate ~2.6e7 J)

export default {
  id: 'L3.fragment.rules.v4',
  level: 'L3',
  laws: ['RCS: power and control from its host room (#15)', 'fragments: a split room works in one fragment, its other cells are dead weight (#13, #208)', 'control is lost with the bridge or by a split (#12, #81)'],
  dependsOn: ['L3.split.momentum.v4', 'L3.rcs.turn.v4', 'L2.heatsink.buffer'],
  setup: 'T1, no power routing (every room powered). (a) RCS: R1 (13f.2) at rest, magazine full, turret holding fire, engine off; "control": the stern RCS on the engine\'s top edge (0,3) fired for one step; "lost": after 31 steps the cut of L3.split.momentum ((5,2), (5,3), (4,4), (4,5)) leaves the stern without the bridge, then the stern RCS (engine top) and the bow RCS on the beam bay\'s top edge (10,3) are fired together for 60 steps. (b), (c) a row of a bridge at (0,0) and heat sinks A (2,0), B (4,0), C (6,0), every room 2 x 2, no fittings, A at 290 K, B at 350 K, C at 400 K, the bridge at rest; after 31 steps B is split evenly: "low" destroys B\'s cells (5,0) and (4,1) (survivors k0 (4,0) beside A and k3 (5,1) beside C), "high" destroys (4,0) and (5,1) (survivors k2 (4,1) beside A and k1 (5,0) beside C); then 600 steps (10 s)',
  measure: '(a) the velocity and angular velocity of each body after the first step that fires, and of the stern after all 60; the heat each host room generated while its RCS was fired; (b), (c) the bodies (their masses and the cells they hold), the body B works in, the heat stored in B and C at the step after the cut and at the end',
  tolerance: '(a) delta v and delta omega of a firing RCS 1e-9 relative; the uncontrolled stern\'s delta v and delta omega 1e-15 absolute (one firing step would give 0.1 m/s); RCS heat 1e-9 relative, an uncontrolled host\'s RCS heat 0 (1e-9 J absolute). (b), (c) fragment masses 1e-12 relative; the heat of a room or pair that no live wall reaches constant within 1e-10 of its heat at the start (#219: float resolution of a stored heat of about 5e9 J; a wall through a dead cell would carry about 3 MW, 3e7 J in 10 s); the live wall between B and C moves more than 1e6 J',
  criterion: '(a) an RCS fitting takes control from its host room (13f.1): fired on a controlled host it gives delta v = F dt / M along its inward normal and delta omega = (r x F) dt / I (R1 by the cell sums: estimate 0.0196 m/s and 3.30e-3 rad/s per step for the stern RCS; the bow fragment by its own cell sums), and its heat is rcs.powerDraw x engine.heatFraction per second; on a host that lost control (the stern after the cut) it does not fire: the stern\'s v and omega do not change and its host generates no RCS heat, while the bow RCS fired in the same steps does. (b), (c) a room whose surviving cells fall into two fragments works in the one holding most of them, and on a tie in the one holding its lower-indexed cell (13f.1): "low" works with k0 in the bridge\'s fragment, "high" with k1 in the other, the lighter; its other cells are dead weight there: they count in that fragment\'s mass (cell sums: 77.07 t and 17.87 t) and carry no flows: in "low" C\'s only wall runs through B\'s dead cell, so C\'s heat stays constant; in "high" A\'s wall to B runs only through B\'s dead cell, so B and C together keep their heat, while the live wall between them carries heat from C to B (#13, #15, #208, #219, #221, #222 (1), #234, #235) Successor of L3.fragment.rules.v2 (#240, #243, 13k.4 S16): cell masses from 13k.2: the engine and beam bay cells are structure.cellMass (k = 3) + engine.machineryMass (k = 2) or beambay.machineryMass (k = 1) in place of the removed cellMass.engine and cellMass.beamBay, the reactor cell 150 t, rcs.mass k = 2, a heat sink cell\'s water from thermal.coupledHeatSink; R1 full is about 950.5 t (the estimates above are the old data\'s); every expected value is the same mass model computed in the scenario. Successor of L3.fragment.rules.v3 (#285, DESIGN.md 13n.4 M1): the turret by its mount, its cells structure.cellMass + turret.machineryMass (3 000 + 1 975 = 4 975 kg at T1, both k = 3) in place of cellMass.crewed (14 800 kg); R1 full at T1 is hand-worked from the cell masses: engine 6 x (3 000 + 2 700) + reactor 4 x 150 000 + bridge 4 x 14 800 + magazine 4 x 3 000 + its 900 kg of rounds + beam bay 4 x (3 000 + 2 500) + heat sink 4 x (3 000 + 4 x 1.35e6 / 4186) + quarters 6 x 14 800 + turret 4 x (3 000 + 1 975) + its 24 kg of rounds + shield generator 4 x 10 000 + hold 4 x 3 000 + 17 radiators x 250 + 4 RCS x 200 = 911 234.057 kg, 39 300 kg less than with cellMass.crewed; every check of L3.fragment.rules.v3 kept. The estimates above are the old data\'s; every expected value is the scenario\'s own mass model with the turret\'s new cell mass. New estimates for (a) (hand-worked from R1\'s cell sums: M = 911 234.057 kg, centre x 23.2357 m, I = 9.33146e7 kg m^2): the stern RCS gives 1e6 / 60 / M = 0.0183 m/s and (23.2357 - 2.5) x 1e6 / 60 / I = 3.70e-3 rad/s per step; (b), (c) hold no turret and are unchanged.',
  tunable: ['turret.machineryMass', 'rcs.force', 'rcs.powerDraw', 'engine.heatFraction', 'structure.cellMass', 'cellMass.crewed', 'cellMass.reactor', 'engine.machineryMass', 'beambay.machineryMass', 'cellMass.shieldGenerator', 'thermal.coupledHeatSink', 'heatsink.capacityFactor', 'radiator.mass', 'rcs.mass', 'conduction.wall'],
  locked: { date: '2026-10-22', hash: '0af9a0f4' },
  cases() {
    return [{ rcs: 'control' }, { rcs: 'lost' }, { tie: 'low' }, { tie: 'high' }];
  },
  expected(ctx, c) {
    const edge = ctx.baseEdge, p = ctx.params, F = ctx.scaled(p.rcs.force, edge), dt = ctx.dt;
    const heatPerStep = ctx.scaled(p.rcs.powerDraw, edge) * p.engine.heatFraction.value * dt;
    /** delta v and delta omega of one firing step of RCS fitting `id` on a body at rest with mass properties `pr`. */
    const kick = (pr, id) => {
      const [, , cell, side] = R1_FITTINGS[id], q = [(cell[0] + 0.5 + side[0] / 2) * edge, (cell[1] + 0.5 + side[1] / 2) * edge], f = [-side[0] * F, -side[1] * F];
      return { dv: [(f[0] / pr.M) * dt, (f[1] / pr.M) * dt], domega: (((q[0] - pr.c[0]) * f[1] - (q[1] - pr.c[1]) * f[0]) / pr.I) * dt };
    };
    if (c.rcs === 'control') {
      const pr = props(massItems(ctx, edge, R1_ROOMS, R1_FITTINGS, fullContents(ctx, edge)));
      return { stern: kick(pr, RCS.sternTop), heat: heatPerStep };
    }
    if (c.rcs === 'lost') {
      const frags = fragmentsOf(ctx, edge, R1_ROOMS, R1_FITTINGS, fullContents(ctx, edge), new Set(CUT.map(([x, y]) => `${x},${y}`)));
      const bow = frags.find((f) => f.rooms.includes('beamBay')), stern = frags.find((f) => f.rooms.includes('engine'));
      return { bow: kick(bow, RCS.bowTop), bowM: bow.M, sternM: stern.M, sternHeat: 0, bowHeat: AFTER * heatPerStep };
    }
    const t = TIES[c.tie], gone = new Set(t.gone.map(([x, y]) => `${x},${y}`));
    const frags = fragmentsOf(ctx, edge, ROW, [], {}, gone).sort((a, b) => b.M - a.M);
    const worksIn = frags.findIndex((f) => f.cells.includes(`${t.works[0]},${t.works[1]}`)), deadIn = frags.findIndex((f) => f.cells.includes(`${t.dead[0]},${t.dead[1]}`));
    return { masses: frags.map((f) => f.M), worksIn, deadIn, keep: c.tie === 'low' ? ['sinkC'] : ['sinkB', 'sinkC'] };
  },
  run(ctx, c) {
    if (c.rcs) {
      const { world, room } = buildR1(ctx);
      const start = snapshot(world), books = (id) => heatBooks(room(id).heat);
      if (c.rcs === 'control') {
        const b = world.ship.bodies[0], v0 = [...b.v], w0 = b.omega, g0 = books('engine').generated;
        setRcs(world, [RCS.sternTop], true);
        step(world);
        setRcs(world, [RCS.sternTop], false);
        const out = { stern: { dv: [b.v[0] - v0[0], b.v[1] - v0[1]], domega: b.omega - w0 }, heat: books('engine').generated - g0, controlled: room('engine').controlled };
        for (let i = 0; i < 30; i++) step(world);
        return { ...out, books: world.rooms.map((r) => heatBooks(r.heat)), eventsOk: eventsOk(world.log.events), momentum: momentumOk(start, snapshot(world)) };
      }
      for (let i = 0; i < BEFORE; i++) step(world);
      CUT.forEach((xy, i) => { const at = cellAt(world, xy); destroyCell(world, at.room, at.index, `cut-${i + 1}`); });
      const bodyOf = (id) => world.ship.bodies.find((b) => b.id === room(id).body);
      const stern = bodyOf('engine'), bow = bodyOf('beamBay');
      const s0 = { v: [...stern.v], omega: stern.omega }, b0 = { v: [...bow.v], omega: bow.omega };
      const g0 = { engine: books('engine').generated, beamBay: books('beamBay').generated };
      setRcs(world, [RCS.sternTop, RCS.bowTop], true);
      step(world);
      const bowKick = { dv: [bow.v[0] - b0.v[0], bow.v[1] - b0.v[1]], domega: bow.omega - b0.omega };
      for (let i = 1; i < AFTER; i++) step(world);
      setRcs(world, [RCS.sternTop, RCS.bowTop], false);
      return {
        bodies: world.ship.bodies.length, bowM: bow.M, sternM: stern.M, bow: bowKick, sternDv: [stern.v[0] - s0.v[0], stern.v[1] - s0.v[1]], sternDomega: stern.omega - s0.omega,
        sternControlled: room('engine').controlled, bowControlled: room('beamBay').controlled,
        sternHeat: books('engine').generated - g0.engine, bowHeat: books('beamBay').generated - g0.beamBay,
        books: world.rooms.map((r) => heatBooks(r.heat)), eventsOk: eventsOk(world.log.events), momentum: momentumOk(start, snapshot(world)),
      };
    }
    const world = createWorld({ params: ctx.params, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    for (const r of ROW) addRoom(world, r.type, { id: r.id, cell: r.cell, temperature: ROW_T[r.id] ?? ctx.fixed.restTemperature.value });
    enableShip(world);
    const start = snapshot(world), room = (id) => world.rooms.find((r) => r.id === id);
    for (let i = 0; i < BEFORE; i++) step(world);
    TIES[c.tie].gone.forEach((xy, i) => { const at = cellAt(world, xy); destroyCell(world, at.room, at.index, `split-${i + 1}`); });
    const Q = (ids) => ids.reduce((x, id) => x + room(id).heat.Q, 0), keep = c.tie === 'low' ? ['sinkC'] : ['sinkB', 'sinkC'];
    const atCut = { keep: Q(keep), C: room('sinkC').heat.Q }, Q0 = keep.reduce((x, id) => x + room(id).heat.Q0, 0);
    for (let i = 0; i < ROW_AFTER; i++) step(world);
    const bodies = [...world.ship.bodies].sort((a, b) => b.M - a.M), B = room('sinkB'), grid = world.layout.rooms.get('sinkB').cells;
    const holding = (xy) => bodies.findIndex((b) => b.id === B.cells[grid.findIndex((g) => g[0] === xy[0] && g[1] === xy[1])].fragment);
    return {
      masses: bodies.map((b) => b.M), worksIn: bodies.findIndex((b) => b.id === B.body), deadIn: holding(TIES[c.tie].dead), worksCell: holding(TIES[c.tie].works),
      keptAtCut: atCut.keep, keptAtEnd: Q(keep), keptAtStart: Q0, cAtCut: atCut.C, cAtEnd: room('sinkC').heat.Q,
      books: world.rooms.map((r) => heatBooks(r.heat)), eventsOk: eventsOk(world.log.events), momentum: momentumOk(start, snapshot(world)),
    };
  },
  compare(e, a, c) {
    const checks = {};
    const kickOk = (x, y) => close(x.dv[0], y.dv[0], 1e-9) && close(x.dv[1], y.dv[1], 1e-9) && close(x.domega, y.domega, 1e-9);
    const exact = (x, y) => Math.abs(x - y) <= 1e-9 * Math.max(Math.abs(x), Math.abs(y), 1);
    if (c.rcs === 'control') {
      checks['the host is controlled'] = a.controlled === true;
      checks['delta v = F dt / M, delta omega = (r x F) dt / I'] = kickOk(e.stern, a.stern);
      checks['RCS heat in the host'] = exact(e.heat, a.heat);
    } else if (c.rcs === 'lost') {
      checks['two bodies'] = a.bodies === 2;
      checks['the stern lost control, the bow kept it'] = a.sternControlled === false && a.bowControlled === true;
      checks['fragment masses from the cell sums'] = close(e.bowM, a.bowM, 1e-12) && close(e.sternM, a.sternM, 1e-12);
      checks['bow RCS fires: delta v, delta omega'] = kickOk(e.bow, a.bow);
      checks['stern RCS on the uncontrolled host does not fire: v, omega unchanged'] = Math.hypot(a.sternDv[0], a.sternDv[1]) <= 1e-15 && Math.abs(a.sternDomega) <= 1e-15;
      checks['no RCS heat in the uncontrolled host'] = Math.abs(a.sternHeat - e.sternHeat) <= 1e-9;
      checks['RCS heat in the controlled host'] = exact(e.bowHeat, a.bowHeat);
    } else {
      checks['fragment masses from the cell sums, dead weight where it lies'] = a.masses.length === e.masses.length && e.masses.every((m, i) => close(m, a.masses[i], 1e-12));
      checks['B works in the fragment holding its lower-indexed survivor'] = a.worksIn === e.worksIn && a.worksCell === e.worksIn;
      checks['B\'s other cell lies in the other fragment'] = a.deadIn === e.deadIn && e.deadIn !== e.worksIn;
      checks['no flow through the dead cell: the isolated heat is constant'] = Math.abs(a.keptAtEnd - a.keptAtCut) <= 1e-10 * a.keptAtStart;
      if (c.tie === 'high') checks['the live wall between B and C carries heat from C'] = a.cAtCut - a.cAtEnd > EXCHANGE_FLOOR;
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual, k = (x) => `dv (${x.dv[0].toExponential(4)}, ${x.dv[1].toExponential(4)}) m/s, domega ${x.domega.toExponential(4)} rad/s`;
    if (r.case.rcs === 'control') return { expected: `stern RCS one step: ${k(e.stern)}, heat ${e.heat.toFixed(3)} J`, actual: `${k(a.stern)}, heat ${a.heat.toFixed(3)} J` };
    if (r.case.rcs === 'lost') return { expected: `bow ${(e.bowM / 1e3).toFixed(3)} t first step ${k(e.bow)}, heat ${e.bowHeat.toFixed(1)} J; stern ${(e.sternM / 1e3).toFixed(3)} t: no change, no heat`, actual: `bow ${(a.bowM / 1e3).toFixed(3)} t ${k(a.bow)}, heat ${a.bowHeat.toFixed(1)} J; stern ${(a.sternM / 1e3).toFixed(3)} t: |dv| ${Math.hypot(...a.sternDv).toExponential(2)} m/s, domega ${a.sternDomega.toExponential(2)} rad/s, heat ${a.sternHeat} J` };
    return { expected: `fragments ${e.masses.map((m) => (m / 1e3).toFixed(3)).join(' + ')} t; B works in #${e.worksIn}, dead cell in #${e.deadIn}; heat of ${e.keep.join(' + ')} constant`, actual: `fragments ${a.masses.map((m) => (m / 1e3).toFixed(3)).join(' + ')} t; B works in #${a.worksIn}, dead cell in #${a.deadIn}; heat of ${e.keep.join(' + ')} ${a.keptAtCut.toExponential(9)} -> ${a.keptAtEnd.toExponential(9)} J; C gave ${(a.cAtCut - a.cAtEnd).toExponential(3)} J` };
  },
};
