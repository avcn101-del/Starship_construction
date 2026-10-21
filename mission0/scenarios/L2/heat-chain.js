import { createWorld, addRoom, setActive, runUntil, roomTemperature } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';

// Checks shared by every L2 scenario (#194), written out in each file so its lock covers them.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-repaired': ['cell'], scram: ['energy'], explosion: ['energy', 'channel'], shot: ['energy', 'channel'] };
const eventsOk = (events) => events.every((e) => Number.isFinite(e.t) && typeof e.type === 'string' && typeof e.room === 'string' && e.room !== ''
  && typeof e.cause === 'string' && e.cause !== '' && Number.isInteger(e.crew) && e.crew >= 0
  && (EXTRA[e.type] || []).every((f) => (f === 'channel' ? typeof e[f] === 'string' && e[f] !== '' : Number.isFinite(e[f]))));
// Heat books in a cluster: generated + conducted = radiated + stored in every room, 1e-9 relative.
const booksOk = (b) => {
  const c = b.conducted || 0;
  return Math.abs(b.generated + c - b.radiated - b.stored) <= 1e-9 * Math.max(Math.abs(b.generated), Math.abs(c), Math.abs(b.radiated), Math.abs(b.stored));
};
// Conduction only moves heat between rooms: the flows sum to 0 over the cluster (1e-9 of the heat moved).
const flowsOk = (books) => {
  const sum = books.reduce((x, b) => x + (b.conducted || 0), 0), moved = books.reduce((x, b) => x + Math.abs(b.conducted || 0), 0);
  return Math.abs(sum) <= 1e-9 * moved;
};
// One-sided time: expected <= actual < expected + dt, each bound with a 1e-9 relative float slack.
const oneSided = (e, a, dt) => Number.isFinite(a) && a >= e - 1e-9 * Math.abs(e) && a < e + dt + 1e-9 * Math.abs(e);
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const common = (rows) => [
  { name: 'heat books: generated + conducted = radiated + stored, 1e-9 relative, every room, every case', ok: rows.every((r) => r.actual.books.every(booksOk)) },
  { name: 'conduction flows sum to 0 over the cluster, every case', ok: rows.every((r) => flowsOk(r.actual.books)) },
  { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) },
];
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

const DURATION = 300;
const hmean = (a, b) => (2 * a * b) / (a + b);
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
function chain(ctx, c) {
  const p = ctx.params, [w, h] = ROOMS.beamBay.footprint.M, [wh, hh] = ROOMS.hold.footprint.M;
  const cell = p.thermal.heatCapacityPerCell.value, rest = ctx.fixed.restTemperature.value;
  const C = [w * h * cell, (c.middle === 'hold' ? wh * hh : w * h) * cell, w * h * cell];
  const f = [1, c.middle === 'hold' ? p.conduction.holdFactor.value : 1, 1];
  const L = 2 * ctx.baseEdge, G = [0, 1].map((i) => p.conduction.wall.value * L * hmean(f[i], f[i + 1]));
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
  id: 'L2.heat.chain',
  level: 'L2',
  laws: ['heat conducts through shared walls', 'an empty hold insulates'],
  dependsOn: ['L2.heat.pair'],
  setup: 'three idle M rooms in a row in a cluster at T1, each wall 2 cell pairs (10 m): a beam bay switched off at 600 K, a middle room at 290 K (a beam bay switched off, or an empty hold), a third beam bay switched off at 290 K; no radiators; 300 s',
  measure: 'the three temperatures at 300 s; the heat that reached the third room, C_3 (T_3 - 290 K)',
  tolerance: 'temperatures 1e-3 K absolute at 300 s; the hold ratio strict',
  criterion: 'the 3 x 3 linear system C dT/dt = -K T, solved in the scenario by eigen-decomposition (closed form), gives every temperature within 1e-3 K at 300 s; the heat reaching the third room with a hold in the middle is < 15 % of that without (#193, #194)',
  tunable: ['conduction.wall', 'conduction.holdFactor', 'thermal.heatCapacityPerCell'],
  locked: null,
  cases() {
    return [{ middle: 'ordinary', T0: 600 }, { middle: 'hold', T0: 600 }];
  },
  expected(ctx, c) {
    const x = chain(ctx, c), T = x.at(DURATION);
    return { T, heatToThird: x.C[2] * (T[2] - x.rest), lambda: x.values, tolerance: 1e-3, ratio: 0.15 };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const a = addRoom(world, 'beamBay', { id: 'a', cell: [0, 0], temperature: c.T0 });
    const m = addRoom(world, c.middle === 'hold' ? 'hold' : 'beamBay', { id: 'b', cell: [2, 0] });
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
    const ordinary = by('ordinary'), hold = by('hold');
    return [
      { name: 'heat reaching the third room with a hold in the middle < 15 % of that without', ok: !!ordinary && !!hold && hold.actual.heatToThird < 0.15 * ordinary.actual.heatToThird, detail: ordinary && hold ? `measured ${(100 * hold.actual.heatToThird / ordinary.actual.heatToThird).toFixed(2)} %, closed form ${(100 * hold.expected.heatToThird / ordinary.expected.heatToThird).toFixed(2)} %` : '' },
      ...common(rows),
    ];
  },
  display(r) {
    const e = r.expected, a = r.actual, K = (T) => T.map((x) => x.toFixed(5)).join(', ');
    return {
      expected: `T(300 s) [${K(e.T)}] K (within ${e.tolerance} K); heat to the third room ${(e.heatToThird / 1e6).toFixed(3)} MJ`,
      actual: `T(${a.t.toFixed(3)} s) [${K(a.T)}] K, |error| ${a.T.map((T, i) => Math.abs(T - e.T[i]).toExponential(2)).join(', ')}; heat to the third room ${(a.heatToThird / 1e6).toFixed(3)} MJ`,
    };
  },
};
