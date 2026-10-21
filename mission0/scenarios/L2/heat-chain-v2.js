import { createWorld, addRoom, setActive, runUntil, roomTemperature } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';

// Checks shared by every L2 scenario (#194), written out in each file so its lock covers them.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-repaired': ['cell'], scram: ['energy'], explosion: ['energy', 'channel'], shot: ['energy', 'channel'], 'heat-vented': ['energy'] };
const eventsOk = (events) => events.every((e) => Number.isFinite(e.t) && typeof e.type === 'string' && typeof e.room === 'string' && e.room !== ''
  && typeof e.cause === 'string' && e.cause !== '' && Number.isInteger(e.crew) && e.crew >= 0
  && (EXTRA[e.type] || []).every((f) => (f === 'channel' ? typeof e[f] === 'string' && e[f] !== '' : Number.isFinite(e[f]))));
// Heat books in a cluster (#200, #201): generated + conducted = radiated + vented + stored in every room, 1e-9
// relative; conducted is the net heat in through walls, life support's pumped heat included.
const booksOk = (b) => {
  const c = b.conducted || 0, v = b.vented || 0;
  return Math.abs(b.generated + c - b.radiated - v - b.stored) <= 1e-9 * Math.max(Math.abs(b.generated), Math.abs(c), Math.abs(b.radiated), Math.abs(v), Math.abs(b.stored));
};
// Conduction and life support only move heat between rooms: each sums to 0 over the cluster (1e-9 of the heat moved).
const sumsToZero = (books, key) => {
  const sum = books.reduce((x, b) => x + (b[key] || 0), 0), moved = books.reduce((x, b) => x + Math.abs(b[key] || 0), 0);
  return Math.abs(sum) <= 1e-9 * moved;
};
// One-sided time: expected <= actual < expected + dt, each bound with a 1e-9 relative float slack.
const oneSided = (e, a, dt) => Number.isFinite(a) && a >= e - 1e-9 * Math.abs(e) && a < e + dt + 1e-9 * Math.abs(e);
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const common = (rows) => [
  { name: 'heat books: generated + conducted = radiated + vented + stored, 1e-9 relative, every room, every case', ok: rows.every((r) => r.actual.books.every(booksOk)) },
  { name: 'conduction and life-support flows each sum to 0 over the cluster, every case', ok: rows.every((r) => sumsToZero(r.actual.books, 'conducted') && sumsToZero(r.actual.books, 'pumped')) },
  { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) },
];
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
// Wall conductance by the rule of 13d.1 (#200, #201), from data.js only: a wall between two coolant rooms
// (ROOMS loop) is a coolant wall, conduction.wall x L x harmonic mean of the coolant factors; every other wall
// is passive, conduction.passive x L x harmonic mean of the passive factors. A factor names a PARAMS constant or is 1.
const hmean = (a, b) => (2 * a * b) / (a + b);
const factorOf = (ctx, name) => (name ? ctx.params[name.split('.')[0]][name.split('.')[1]].value : 1);
function wallG(ctx, typeA, typeB, length, edge = ctx.baseEdge) {
  const A = ROOMS[typeA], B = ROOMS[typeB];
  if (A.loop === 'coolant' && B.loop === 'coolant') return ctx.scaled(ctx.params.conduction.wall, edge) * length * hmean(factorOf(ctx, A.coolantFactor), factorOf(ctx, B.coolantFactor));
  return ctx.scaled(ctx.params.conduction.passive, edge) * length * hmean(factorOf(ctx, A.passiveFactor), factorOf(ctx, B.passiveFactor));
}
const cellsOf = (type, size = 'M') => ROOMS[type].footprint[size][0] * ROOMS[type].footprint[size][1];
/** Heat capacity (J/K) of a room of `type` with `cells` cells at `edge` (13c.1; the heat sink x capacityFactor, #198). */
const capacityOf = (ctx, type, cells = cellsOf(type), edge = ctx.baseEdge) => cells * ctx.scaled(ctx.params.thermal.heatCapacityPerCell, edge) * factorOf(ctx, ROOMS[type].capacityFactor);

const DURATION = 300; // s
/** Eigen-decomposition of a symmetric matrix by cyclic Jacobi rotations (the scenario's own, not the kernel's). */
function jacobi(A) {
  const n = A.length, a = A.map((r) => [...r]), V = A.map((r, i) => r.map((_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] * a[i][j];
    if (off < 1e-300) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (a[p][q] === 0) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
    }
  }
  return { values: a.map((r, i) => r[i]), vectors: V };
}
// The linear system C dT/dt = -K T of three rooms in a row (13d.1), solved in closed form:
// A = C^-1/2 K C^-1/2 = V diag(lambda) V^T, T(t) = C^-1/2 V exp(-lambda t) V^T C^1/2 T0.
// Walls by the rule of 13d.1: beam bay | beam bay is a coolant wall, beam bay | hold a passive wall.
function chain(ctx, c) {
  const types = ['beamBay', c.middle, 'beamBay'], rest = ctx.fixed.restTemperature.value, L = 2 * ctx.baseEdge;
  const C = types.map((t) => capacityOf(ctx, t)), G = [0, 1].map((i) => wallG(ctx, types[i], types[i + 1], L));
  const K = [[G[0], -G[0], 0], [-G[0], G[0] + G[1], -G[1]], [0, -G[1], G[1]]];
  const A = K.map((r, i) => r.map((x, j) => x / Math.sqrt(C[i] * C[j])));
  const { values, vectors: V } = jacobi(A);
  const T0 = [c.T0, rest, rest], y0 = T0.map((x, i) => Math.sqrt(C[i]) * x);
  const at = (t) => {
    const m = values.map((lambda, k) => Math.exp(-lambda * t) * V.reduce((s, row, i) => s + row[k] * y0[i], 0));
    return V.map((row, i) => row.reduce((s, v, k) => s + v * m[k], 0) / Math.sqrt(C[i]));
  };
  return { C, G, values, at, rest };
}

export default {
  id: 'L2.heat.chain.v2',
  level: 'L2',
  laws: ['heat moves fast along the coolant loop', 'an empty hold insulates'],
  dependsOn: ['L2.heat.pair.v2'],
  setup: 'three idle M rooms in a row in a cluster at T1, each wall 2 cell pairs (10 m): a beam bay switched off at 600 K, a middle room at 290 K (a beam bay switched off: two coolant walls; or an empty hold: two passive walls), a third beam bay switched off at 290 K; no radiators; 300 s (replaces L2.heat.chain, #201 (2))',
  measure: 'the three temperatures at 300 s; the heat that reached the third room, C_3 (T_3 - 290 K)',
  tolerance: 'temperatures 3e-3 K absolute at 300 s; the hold ratio strict',
  criterion: 'the 3 x 3 linear system C dT/dt = -K T with the walls of 13d.1 (coolant or passive), solved in the scenario by eigen-decomposition (closed form), gives every temperature within 3e-3 K at 300 s; the heat reaching the third room through a hold is < 1e-3 of that through a coolant room (#200, #201, DESIGN.md 13d.2 row 2b)',
  tunable: ['conduction.wall', 'conduction.passive', 'conduction.holdFactor', 'thermal.heatCapacityPerCell'],
  locked: null,
  cases() {
    return [{ middle: 'beamBay', T0: 600 }, { middle: 'hold', T0: 600 }];
  },
  expected(ctx, c) {
    const x = chain(ctx, c), T = x.at(DURATION);
    return { T, G: x.G, heatToThird: x.C[2] * (T[2] - x.rest), lambda: x.values, tolerance: 3e-3, ratio: 1e-3 };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const a = addRoom(world, 'beamBay', { id: 'a', cell: [0, 0], temperature: c.T0 });
    const m = addRoom(world, c.middle, { id: 'b', cell: [2, 0] });
    const z = addRoom(world, 'beamBay', { id: 'c', cell: [4, 0] });
    for (const r of [a, m, z]) if (r.type === 'beamBay') setActive(world, r, false);
    runUntil(world, DURATION);
    const T = [a, m, z].map(roomTemperature);
    return { t: world.t, T, heatToThird: z.heat.Q - z.heat.Q0, books: [a, m, z].map((r) => heatBooks(r.heat)), eventsOk: eventsOk(world.log.events) };
  },
  compare(e, a) {
    const checks = { 'temperatures at 300 s': a.T.length === 3 && a.T.every((T, i) => Number.isFinite(T) && Math.abs(T - e.T[i]) <= e.tolerance) };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    const by = (m) => rows.find((r) => r.case.middle === m);
    const coolant = by('beamBay'), hold = by('hold');
    return [
      { name: 'heat reaching the third room through a hold < 1e-3 of that through a coolant room', ok: !!coolant && !!hold && hold.actual.heatToThird < 1e-3 * coolant.actual.heatToThird, detail: coolant && hold ? `measured ${(hold.actual.heatToThird / coolant.actual.heatToThird).toExponential(3)}, closed form ${(hold.expected.heatToThird / coolant.expected.heatToThird).toExponential(3)}` : '' },
      ...common(rows),
    ];
  },
  display(r) {
    const e = r.expected, a = r.actual, K = (T) => T.map((x) => x.toFixed(5)).join(', ');
    return {
      expected: `T(300 s) [${K(e.T)}] K (within ${e.tolerance} K); heat to the third room ${(e.heatToThird / 1e6).toFixed(6)} MJ`,
      actual: `T(${a.t.toFixed(3)} s) [${K(a.T)}] K, |error| ${a.T.map((T, i) => Math.abs(T - e.T[i]).toExponential(2)).join(', ')}; heat to the third room ${(a.heatToThird / 1e6).toFixed(6)} MJ`,
    };
  },
};
