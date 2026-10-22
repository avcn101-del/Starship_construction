import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, enablePowerRouting, setDemand, step, runUntil, cellAt, destroyCell, roomTemperature } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';
// Checks shared by every L3 scenario (13f.3: L2's checks plus the momentum books), written out in each file so its lock covers them.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-damaged': ['channel', 'cell', 'integrity'], 'cell-repaired': ['cell'], scram: ['energy'], explosion: ['energy', 'channel'], shot: ['energy', 'channel'], 'heat-vented': ['energy'] };
const eventsOk = (events) => events.every((e) => Number.isFinite(e.t) && typeof e.type === 'string' && typeof e.room === 'string' && e.room !== ''
  && typeof e.cause === 'string' && e.cause !== '' && Number.isInteger(e.crew) && e.crew >= 0
  && (EXTRA[e.type] || []).every((f) => (f === 'channel' ? typeof e[f] === 'string' && e[f] !== '' : Number.isFinite(e[f]))));
// Heat books (13d.2): generated + conducted = radiated + vented + stored in every room, 1e-9 relative (vented includes
// the heat a destroyed cell takes with it as debris, #214 (9)); conduction and life support each sum to 0 over the ship.
// Within max(1e-9 x the largest flow, 1e-10 x the room's heat at the start): stored = Q - Q0 carries the float
// resolution of Q0 (#219 (4)), the floor the L3 v2 scenarios carry.
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
 * fixtures). Between two snapshots, mass is kept and P - J and L - H are kept to 1e-9 of the largest magnitude
 * that enters them (1e-12 absolute floor for a ship at rest).
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
  return { M, P: [px, py], L, K, sp, sl, J: [...s.external.J], H: s.external.H };
}
function momentumOk(a, b) {
  const dJ = [b.J[0] - a.J[0], b.J[1] - a.J[1]], dH = b.H - a.H;
  const dP = Math.hypot(b.P[0] - a.P[0] - dJ[0], b.P[1] - a.P[1] - dJ[1]), dL = Math.abs(b.L - a.L - dH);
  return {
    mass: Math.abs(b.M - a.M) <= 1e-12 * a.M,
    momentum: dP <= 1e-9 * Math.max(a.sp, b.sp, Math.hypot(dJ[0], dJ[1])) + 1e-12,
    angular: dL <= 1e-9 * Math.max(a.sl, b.sl, Math.abs(dH)) + 1e-12,
    dP, dL,
  };
}
const common = (rows) => [
  { name: 'heat books: generated + conducted = radiated + vented + stored, within max(1e-9 x the largest flow, 1e-10 x the room\'s heat at the start), every room, every case (#219)', ok: rows.every((r) => r.actual.books.every(booksOk)) },
  { name: 'conduction and life-support flows each sum to 0 over the ship, every case', ok: rows.every((r) => sumsToZero(r.actual.books, 'conducted') && sumsToZero(r.actual.books, 'pumped')) },
  { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) },
  { name: 'momentum books: mass, momentum and angular momentum of ship + rounds + debris kept (with the external impulse), 1e-9, every case', ok: rows.every((r) => r.actual.momentum.mass && r.actual.momentum.momentum && r.actual.momentum.angular) },
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
// A room type's cell mass (13i.2, 13k.2): the hold, magazine and heat sink are structure only; the engine and the beam
// bay structure + machinery at their own exponents (#243).
const CELL_MASS = { bridge: ['cellMass.crewed'], quarters: ['cellMass.crewed'], turret: ['cellMass.crewed'], missileBay: ['cellMass.crewed'], reactor: ['cellMass.reactor'], shieldGenerator: ['cellMass.shieldGenerator'], railgun: ['cellMass.railgun'], engine: ['structure.cellMass', 'engine.machineryMass'], beamBay: ['structure.cellMass', 'beambay.machineryMass'] };
/** A cell's mass at `edge`: the sum of its type's constants; a heat sink cell adds (capacityFactor - 1) C / water, C = thermal.coupledHeatSink. */
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

const DEMAND = 0.5;
const BEFORE = 61, AFTER = 30.5; // steps before the cut; seconds after it
const WARM = 300; // K: the crewed rooms and the magazine start warm, so life support has heat to pump (a fixture)
const CUTS = {
  split: [[5, 2], [5, 3], [4, 4], [4, 5]], // L3.split.momentum's cut: the stern (engine, reactor, shield, half the sink) loses the bridge
  kept: [[7, 1], [8, 1]], // the hold's inner row: its outer row drifts off, bridge and reactor stay together
  bridge: [[5, 2], [5, 3], [6, 2], [6, 3]], // the whole bridge: no split (the heat sink still joins stern and bow)
};
const ROUTE = ['shield', 'engine', 'quarters', 'turret', 'beamBay']; // the power-priority order (#38): every request is met here
/** Cells sharing an edge between two rooms of R1 (13d.1), from the geometry. */
const touches = (a, b) => roomCells(a.type, a.cell, a.rotation || 0).some(([x, y]) => roomCells(b.type, b.cell, b.rotation || 0).some(([u, v]) => Math.abs(x - u) + Math.abs(y - v) === 1));

export default {
  id: 'L3.fragment.scram.v2',
  level: 'L3',
  laws: ['fail-safe reactors: losing control SCRAMs a reactor, decay heat follows (#81)', 'a fragment without the bridge goes dark (#13)', 'decapitation: the bridge lost, every reactor SCRAMs (#82)', 'the bridge\'s backup supply (#147)', 'life support runs while joined to a reactor able to produce (#207)'],
  dependsOn: ['L3.split.momentum', 'L1.reactor.scram', 'L2.lifesupport.routed.v2', 'L2.power.flow'],
  setup: 'R1 at T1 (13f.2) at rest, power routing on (priority shield, engine, quarters, turret, beam bay), the reactor at demand 0.5, the shield on, the engine at half throttle, the turret holding fire with its store full; the bridge, quarters, magazine and turret start at 300 K, every other room at rest. After 61 steps: (split) the cut of L3.split.momentum; (kept) the hold\'s inner cells (7,1), (8,1), which leave bridge and reactor together; (bridge) all four bridge cells; then 30.5 s. Two cases for #207 (#216) on the intact ship for 90.5 s: (through rooms) the quarters, which share no wall with the reactor, joined to it only through the bridge and the heat sink; (demand 0) the same with the reactor switched on at demand 0',
  measure: 'scram events (time, cause, energy); the reactor\'s delivered power at the cut and its decay heat to the end; engine thrust and shield state after the cut; the bridge\'s control; whether each crewed room\'s and the magazine\'s life support runs, and the heat each pumps, before and after the cut; the number of bodies',
  tolerance: 'decay heat and scram energy 1e-9 relative; delivered power 1e-9 relative; times exact (the event at the cut)',
  criterion: '(split) the stern reactor SCRAMs at the cut (event \'scram\', cause the hit that destroyed the splitting cell), having delivered the routed requests (shield.powerDraw + engine.powerDraw / 2 + quarters.powerDraw + turret.powerDraw = 7.25 MW); its decay heat follows L1: energy f h P tau at the event, f h P tau (1 - e^(-t / tau)) by t (1e-9); the stern engine\'s thrust is 0 and the shield goes down; the bow bridge keeps control on its backup and its life support runs, while the quarters\', magazine\'s and turret\'s stop (#207) and pump nothing more; (kept) two bodies, no scram, the reactor still delivers 7.25 MW, thrust and shield go on; (bridge) every reactor SCRAMs at the last bridge cell (cause that hit), thrust stops, one body; (through rooms) the quarters keep life support and pump heat into the heat sink; (demand 0) a reactor switched on at demand 0 supplies none: the quarters, magazine and turret pump nothing, the bridge keeps its own (#13, #81, #82, #147, #207, #208, #216) Successor of L3.fragment.scram (#240, #243, 13k.4 S16): the heat-books invariant gets #219 (4)\'s floor at the float resolution of the stored heat, max(1e-9 x the largest flow, 1e-10 x the room\'s heat at the start), as every L3 v2 scenario has: with the hold\'s coupled heat capacity (1.35 MJ/K per cell, 13k.2) the hold\'s residue in the kept case is 6.1e-7 J, 7.8e-16 of its 783 MJ at the start but 1.3e-9 of its small flows; the unused mass helper reads the 13k.2 masses. Nothing else changes.',
  tunable: ['reactor.decayFraction', 'reactor.decayTime', 'reactor.heatPerPower', 'reactor.power', 'shield.powerDraw', 'engine.powerDraw', 'quarters.powerDraw', 'turret.powerDraw', 'lifeSupport.capacityPerCell'],
  locked: null,
  cases() {
    return [{ cut: 'split' }, { cut: 'kept' }, { cut: 'bridge' }, { cut: 'through rooms', demand: DEMAND }, { cut: 'demand 0', demand: 0 }];
  },
  expected(ctx, c) {
    const p = ctx.params, f = p.reactor.decayFraction.value, h = p.reactor.heatPerPower.value, tau = p.reactor.decayTime.value;
    const P = p.shield.powerDraw.value + 0.5 * p.engine.powerDraw.value + p.quarters.powerDraw.value + p.turret.powerDraw.value;
    if (P > DEMAND * p.reactor.power.value) throw new Error('the requests must fit the reactor at demand 0.5');
    const tCut = BEFORE * ctx.dt, steps = BEFORE + Math.ceil(AFTER / ctx.dt - 1e-9), tEnd = steps * ctx.dt;
    const reactor = R1_ROOMS.find((r) => r.id === 'reactor'), quarters = R1_ROOMS.find((r) => r.id === 'quarters');
    return {
      delivered: P, tCut, scramEnergy: f * h * P * tau, decay: f * h * P * tau * (1 - Math.exp(-(tEnd - tCut) / tau)), cause: c.cut === 'split' ? 'cut-4' : c.cut === 'bridge' ? 'bridge-4' : null,
      quartersTouchReactor: touches(quarters, reactor), slack: ctx.fixed.lifeSupportSetpoint.value + 0.01,
    };
  },
  run(ctx, c) {
    const { world, room } = buildR1(ctx, {
      routing: ROUTE, temperatures: { bridge: WARM, quarters: WARM, magazine: WARM, turret: WARM },
      setup: (w, r) => { setDemand(w, r('reactor'), c.demand ?? DEMAND); r('engine').engine.throttle = 0.5; },
    });
    const start = snapshot(world), crewed = ['bridge', 'quarters', 'magazine', 'turret'];
    const ls = () => Object.fromEntries(crewed.map((id) => [id, room(id).lifeSupportOn]));
    const pumped = () => Object.fromEntries(crewed.map((id) => [id, -room(id).heat.pumped]));
    if (!CUTS[c.cut]) {
      runUntil(world, 90.5);
      return {
        lifeSupport: ls(), pumped: pumped(), sinkPumped: room('heatSink').heat.pumped, quartersT: roomTemperature(room('quarters')), reactorActive: room('reactor').active, scrams: world.log.events.filter((e) => e.type === 'scram').length,
        books: world.rooms.map((r) => heatBooks(r.heat)), eventsOk: eventsOk(world.log.events), momentum: momentumOk(start, snapshot(world)),
      };
    }
    for (let i = 0; i < BEFORE; i++) step(world);
    const atCut = { t: world.t, delivered: room('reactor').reactor.delivered, lifeSupport: ls(), pumped: pumped(), decay: room('reactor').reactor.decayHeat };
    const prefix = c.cut === 'bridge' ? 'bridge' : 'cut';
    CUTS[c.cut].forEach((xy, i) => { const at = cellAt(world, xy); destroyCell(world, at.room, at.index, `${prefix}-${i + 1}`); });
    const bodiesAfter = world.ship.bodies.length;
    let thrustAfter = 0;
    const end = BEFORE + Math.ceil(AFTER / ctx.dt - 1e-9);
    while (world.step < end) { step(world); thrustAfter = Math.max(thrustAfter, room('engine').engine.thrust); }
    const ev = world.log.events;
    return {
      atCut, bodies: bodiesAfter, scrams: ev.filter((e) => e.type === 'scram').map((e) => ({ t: e.t, room: e.room, cause: e.cause, energy: e.energy })),
      decay: room('reactor').reactor.decayHeat - atCut.decay, delivered: room('reactor').reactor.delivered, thrustAfter, thrustEnd: room('engine').engine.thrust,
      shieldDown: ev.some((e) => e.type === 'shield-down' && e.t >= atCut.t), bridgeControl: room('bridge').bridge.control, lifeSupport: ls(), pumped: pumped(),
      books: world.rooms.map((r) => heatBooks(r.heat)), eventsOk: eventsOk(ev), momentum: momentumOk(start, snapshot(world)),
    };
  },
  compare(e, a, c, ctx) {
    const checks = {};
    const thrust = 0.5 * ctx.params.engine.thrust.value;
    if (c.cut === 'through rooms' || c.cut === 'demand 0') {
      checks['the quarters share no wall with the reactor'] = !e.quartersTouchReactor;
      checks['the bridge keeps its life support'] = a.lifeSupport.bridge;
      checks['no scram'] = a.scrams === 0 && a.reactorActive;
      if (c.cut === 'through rooms') {
        checks['quarters keep life support through other rooms'] = a.lifeSupport.quarters && a.lifeSupport.magazine && a.lifeSupport.turret;
        checks['quarters pump heat into the heat sink'] = a.pumped.quarters > 0 && a.sinkPumped > 0;
      } else {
        checks['a reactor at demand 0 supplies none'] = !a.lifeSupport.quarters && !a.lifeSupport.magazine && !a.lifeSupport.turret;
        checks['nothing pumped but the bridge'] = a.pumped.quarters === 0 && a.pumped.magazine === 0 && a.pumped.turret === 0;
      }
      return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
    }
    checks['delivered the routed requests before the cut'] = close(e.delivered, a.atCut.delivered, 1e-9);
    checks['every room had life support before the cut'] = Object.values(a.atCut.lifeSupport).every(Boolean);
    if (c.cut === 'kept') {
      checks['two bodies'] = a.bodies === 2;
      checks['no scram'] = a.scrams.length === 0;
      checks['the reactor still delivers'] = close(e.delivered, a.delivered, 1e-9);
      checks['thrust goes on'] = close(thrust, a.thrustEnd, 1e-12);
      checks['shield stays up'] = !a.shieldDown;
      checks['life support goes on'] = Object.values(a.lifeSupport).every(Boolean);
      return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
    }
    checks['bodies'] = a.bodies === (c.cut === 'split' ? 2 : 1);
    checks['the reactor SCRAMs at the cut, caused by the hit'] = a.scrams.length === 1 && a.scrams[0].room === 'reactor' && a.scrams[0].t === a.atCut.t && a.scrams[0].cause === e.cause;
    checks['scram energy f h P tau'] = a.scrams.length === 1 && close(e.scramEnergy, a.scrams[0].energy, 1e-9);
    checks['decay heat by the end (L1 closed form)'] = close(e.decay, a.decay, 1e-9);
    checks['delivers nothing after'] = a.delivered === 0;
    checks['the engine stops'] = a.thrustAfter === 0;
    checks['the shield goes down'] = a.shieldDown;
    if (c.cut === 'split') {
      checks['the bow bridge keeps control and its life support'] = a.bridgeControl && a.lifeSupport.bridge;
      checks['quarters, magazine, turret lose life support'] = !a.lifeSupport.quarters && !a.lifeSupport.magazine && !a.lifeSupport.turret;
      checks['and pump nothing more'] = ['quarters', 'magazine', 'turret'].every((id) => a.pumped[id] === a.atCut.pumped[id]);
    } else {
      checks['the bridge gives no control'] = !a.bridgeControl;
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual, mj = (x) => (x / 1e6).toFixed(6);
    const ls = (x) => Object.entries(x).map(([k, v]) => `${k} ${v ? 'on' : 'off'}`).join(', ');
    if (!CUTS[r.case.cut]) return { expected: r.case.cut === 'through rooms' ? 'quarters, magazine, turret supplied; quarters pump into the sink' : 'quarters, magazine, turret unsupplied; bridge on its backup', actual: `life support ${ls(a.lifeSupport)}; pumped ${Object.entries(a.pumped).map(([k, v]) => `${k} ${mj(v)} MJ`).join(', ')}; quarters ${a.quartersT.toFixed(4)} K` };
    return {
      expected: e.cause ? `scram at ${e.tCut.toFixed(4)} s, cause ${e.cause}, energy ${mj(e.scramEnergy)} MJ, decay heat by the end ${mj(e.decay)} MJ (delivered ${mj(e.delivered)} MW)` : `no scram, delivered ${mj(e.delivered)} MW throughout`,
      actual: `${a.bodies} bodies; scrams ${a.scrams.map((s) => `${s.room} at ${s.t.toFixed(4)} s cause ${s.cause} energy ${mj(s.energy)} MJ`).join('; ') || 'none'}; decay heat ${mj(a.decay)} MJ; delivered at cut ${mj(a.atCut.delivered)} MW, at end ${mj(a.delivered)} MW; thrust after ${a.thrustAfter}, end ${a.thrustEnd}; shield down ${a.shieldDown}; bridge control ${a.bridgeControl}; life support ${ls(a.lifeSupport)}`,
    };
  },
};
