import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, enablePowerRouting, step, fixtureImpulse } from '../../../js/rooms.js';
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

const AIM = { broadside: [0, 1], forward: [1, 0] }; // body frame: broadside out of the turret's open top edge; forward along +x
const FIXTURE = 25000; // N s: a 10 kg slug at 2500 m/s (#54, #209)
/** Grid cell centre (m) of a room placed at `cell`. */
const centreOf = (r, edge) => { const cs = roomCells(r.type, r.cell, r.rotation || 0), xs = cs.map((c) => c[0]), ys = cs.map((c) => c[1]); return [((Math.min(...xs) + Math.max(...xs) + 1) / 2) * edge, ((Math.min(...ys) + Math.max(...ys) + 1) / 2) * edge]; };

export default {
  id: 'L3.recoil.v5',
  level: 'L3',
  laws: ['recoil (Newton 3)', 'moment of inertia updated as mass leaves', 'momentum conserved: ship + rounds'],
  dependsOn: ['L3.mass.props.v4', 'L1.turret.fire', 'L2.ammo.feed'],
  setup: 'R1 at T1 (13f.2) at rest, magazine full (150 M rounds), turret ready store full (4), no power routing; the M turret fires N in {1, 5, 20} rounds broadside (out of its open top edge, +y in the ship\'s frame) or forward (+x), then holds fire; the feed refills the store from the magazine between shots (one round in 6 kg / (0.72 kg/(s m) x 5 m) = 1.67 s < 2 s between shots). A fixture impulse of 25 000 N s along -x (a railgun\'s recoil) through the centre of mass and 5 m above it',
  measure: 'per shot, the ship\'s angular velocity just before and just after the step of the shot; the ship\'s momentum and the rounds\' momenta at the end; for the fixture, the change of velocity and angular velocity',
  tolerance: 'ship momentum change against the rounds\' momenta 1e-12 relative to the rounds\' total; delta omega per shot 1e-9 relative; fixture delta v 1e-12 relative, delta omega 1e-12 relative (1e-15 rad/s absolute through the centre of mass)',
  criterion: 'ship momentum change = -sum of round momenta (1e-12); delta omega per shot = (r x p) / I with p = -m u d the recoil at the turret\'s centre and r and I from the cell sums after that round has left (the store refilled before every shot, the magazine one round less per earlier shot) (1e-9); estimates 0.0056 m/s and 0.050 deg/s per broadside shot, 1.0 deg/s after 20, 0.021 deg/s per forward shot; the fixture 0.029 m/s and 0.064 deg/s (0 through the centre of mass); the measured numbers go to DESIGN.md 16 for E4 (#5, #203 C, #208, #209, #219, #221, #234, #235) Successor of L3.recoil.v4 (#240, #243, 13k.4 S16): cell masses from 13k.2: the engine and beam bay cells are structure.cellMass (k = 3) + engine.machineryMass (k = 2) or beambay.machineryMass (k = 1) in place of the removed cellMass.engine and cellMass.beamBay, the reactor cell 150 t, rcs.mass k = 2, a heat sink cell\'s water from thermal.coupledHeatSink; R1 full is about 950.5 t (the estimates above are the old data\'s); every expected value is the same mass model computed in the scenario.',
  tunable: ['kinetic.roundMass', 'kinetic.muzzleVelocity', 'turret.fireRate', 'ammo.wallFeed', 'thermal.coupledHeatSink', 'structure.cellMass', 'cellMass.crewed', 'cellMass.reactor', 'engine.machineryMass', 'beambay.machineryMass', 'cellMass.shieldGenerator', 'radiator.mass', 'rcs.mass'],
  locked: { date: '2026-10-22', hash: '6f9b8fce' },
  cases() {
    const out = [];
    for (const aim of ['broadside', 'forward']) for (const N of [1, 5, 20]) out.push({ aim, N });
    out.push({ fixture: 'axis' }, { fixture: 'offset' });
    return out;
  },
  expected(ctx, c) {
    const edge = ctx.baseEdge, p = ctx.params, full = fullContents(ctx, edge);
    if (c.fixture) {
      const pr = props(massItems(ctx, edge, R1_ROOMS, R1_FITTINGS, full)), off = c.fixture === 'axis' ? 0 : 5;
      return { dv: FIXTURE / pr.M, domega: (off * FIXTURE) / pr.I, point: [pr.c[0], pr.c[1] + off] };
    }
    const m = roundMass(ctx, edge), u = p.kinetic.muzzleVelocity.value, interval = 1 / p.turret.fireRate.value;
    const refill = m / (p.ammo.wallFeed.value * edge); // the magazine and the turret share one cell pair (5 m)
    if (!(refill < interval)) throw new Error('the expected per-shot state assumes the store refills between shots');
    const turret = centreOf(R1_ROOMS.find((r) => r.id === 'turret'), edge), d = AIM[c.aim], J = [-m * u * d[0], -m * u * d[1]];
    const shots = [];
    for (let k = 1; k <= c.N; k++) {
      const after = props(massItems(ctx, edge, R1_ROOMS, R1_FITTINGS, { magazine: full.magazine - (k - 1), turret: full.turret - 1 }));
      const r = [turret[0] - after.c[0], turret[1] - after.c[1]];
      shots.push({ domega: (r[0] * J[1] - r[1] * J[0]) / after.I, dv: (m * u) / after.M });
    }
    return { shots, roundMomentum: m * u };
  },
  run(ctx, c) {
    const { world, room } = buildR1(ctx);
    const b = world.ship.bodies[0], start = snapshot(world), P0 = [b.M * b.v[0], b.M * b.v[1]];
    if (c.fixture) {
      const pr = props(massItems(ctx, ctx.baseEdge, R1_ROOMS, R1_FITTINGS, fullContents(ctx, ctx.baseEdge)));
      const v0 = [...b.v], w0 = b.omega;
      fixtureImpulse(world, [-FIXTURE, 0], [pr.c[0], pr.c[1] + (c.fixture === 'axis' ? 0 : 5)]);
      const dv = Math.hypot(b.v[0] - v0[0], b.v[1] - v0[1]), domega = b.omega - w0;
      for (let i = 0; i < 61; i++) step(world);
      return { dv, domega, books: world.rooms.map((r) => heatBooks(r.heat)), eventsOk: eventsOk(world.log.events), momentum: momentumOk(start, snapshot(world)) };
    }
    const t = room('turret');
    t.turret.aim = AIM[c.aim];
    t.turret.hold = false;
    const shots = [];
    while (t.turret.shots < c.N && world.t < 600) {
      const before = t.turret.shots, w = b.omega;
      step(world);
      if (t.turret.shots > before) shots.push({ t: world.t, domega: b.omega - w });
    }
    t.turret.hold = true;
    for (let i = 0; i < 125; i++) step(world); // the feed refills the store; the books hold
    const rounds = world.ship.rounds, Pr = [rounds.reduce((x, r) => x + r.m * r.v[0], 0), rounds.reduce((x, r) => x + r.m * r.v[1], 0)];
    const Ps = [b.M * b.v[0] - P0[0], b.M * b.v[1] - P0[1]];
    return {
      shots, rounds: rounds.length, shipDP: Ps, roundsP: Pr, omega: b.omega, v: [...b.v], magazine: room('magazine').magazine.he, store: t.turret.ammo,
      books: world.rooms.map((r) => heatBooks(r.heat)), eventsOk: eventsOk(world.log.events), momentum: momentumOk(start, snapshot(world)),
    };
  },
  compare(e, a, c) {
    const checks = {};
    if (c.fixture) {
      checks['delta v = J / M'] = close(e.dv, a.dv, 1e-12);
      checks['delta omega = (r x J) / I'] = c.fixture === 'axis' ? Math.abs(a.domega) <= 1e-15 : close(e.domega, a.domega, 1e-12);
    } else {
      const total = Math.hypot(a.roundsP[0], a.roundsP[1]);
      checks['N shots'] = a.shots.length === c.N && a.rounds === c.N;
      checks['ship momentum change = -sum of round momenta'] = Math.hypot(a.shipDP[0] + a.roundsP[0], a.shipDP[1] + a.roundsP[1]) <= 1e-12 * total;
      checks['delta omega per shot = (r x p) / I'] = a.shots.length === e.shots.length && e.shots.every((s, i) => close(s.domega, a.shots[i].domega, 1e-9));
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual, deg = (x) => (x * 180 / Math.PI).toFixed(5);
    if (r.case.fixture) return { expected: `delta v ${e.dv.toFixed(6)} m/s, delta omega ${deg(e.domega)} deg/s`, actual: `delta v ${a.dv.toFixed(6)} m/s, delta omega ${deg(a.domega)} deg/s` };
    const sum = (xs) => xs.reduce((x, s) => x + s.domega, 0);
    return {
      expected: `per shot delta v ${e.shots[0].dv.toFixed(5)} m/s, delta omega ${deg(e.shots[0].domega)} deg/s (first) .. ${deg(e.shots[e.shots.length - 1].domega)} (last), sum ${deg(sum(e.shots))} deg/s`,
      actual: `${a.shots.length} shots: delta omega ${deg(a.shots[0].domega)} .. ${deg(a.shots[a.shots.length - 1].domega)}, sum ${deg(sum(a.shots))} deg/s; ship |v| ${Math.hypot(...a.v).toFixed(5)} m/s, omega ${deg(a.omega)} deg/s at the end; magazine ${a.magazine}, store ${a.store}`,
    };
  },
};
