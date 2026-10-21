import { createWorld, addRoom, setPower, setBeams, step } from '../../../js/rooms.js';
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

// Two M generators on the T1 grid: G1 at cell [0, 0] (centre 5 m, 5 m), G2 d / edge cells further along x.
const centre = (ctx, x) => [(x + ROOMS.shieldGenerator.footprint.M[0] / 2) * ctx.baseEdge, (ROOMS.shieldGenerator.footprint.M[1] / 2) * ctx.baseEdge];
function beamsOf(ctx, c) {
  const g1 = centre(ctx, 0), g2 = centre(ctx, c.d / ctx.baseEdge);
  if (c.part === 'b') return [{ id: 'at-G1', position: g1, power: c.P }, { id: 'at-G2', position: g2, power: c.P }];
  return [{ id: 'midway', position: [(g1[0] + g2[0]) / 2, g1[1]], power: c.P }];
}
/**
 * The overlap rule of 13d.1 (#170) from data.js: a beam at j asks generator i for a_ij = P_j B_i g_ij / sum_k B_k g_kj,
 * capped so sum_i a_ij <= min(P_j, sum_i B_i g_ij); a generator whose asks exceed B_i scales them by B_i / sum_j a_ij.
 * g(r) = 1 / (1 + (r / shield.radius)^2); an unpowered generator has no field.
 */
function overlap(ctx, c) {
  const p = ctx.params, B = p.shield.budget.value, n = ctx.fixed.shieldFalloffExponent.value;
  const g = (r) => 1 / (1 + (r / p.shield.radius.value) ** n);
  const gens = [{ id: 'G1', at: centre(ctx, 0), on: true }, { id: 'G2', at: centre(ctx, c.d / ctx.baseEdge), on: c.part !== 'c' }];
  const beams = beamsOf(ctx, c);
  const asks = beams.map((b) => {
    const bg = gens.map((x) => (x.on ? B * g(Math.hypot(x.at[0] - b.position[0], x.at[1] - b.position[1])) : 0));
    const total = bg.reduce((s, v) => s + v, 0), a = bg.map((v) => (b.power * v) / total), sum = a.reduce((s, v) => s + v, 0), cap = Math.min(b.power, total);
    return { a: sum > cap ? a.map((v) => (v * cap) / sum) : a, total };
  });
  const scale = gens.map((_, i) => { const s = asks.reduce((t, x) => t + x.a[i], 0); return s > B ? B / s : 1; });
  const paid = gens.map((_, i) => asks.reduce((t, x) => t + x.a[i] * scale[i], 0));
  const absorbed = beams.map((_, j) => asks[j].a.reduce((t, v, i) => t + v * scale[i], 0));
  // Without the rule each point would absorb min(P_j, sum_i B_i g_ij) by itself (L0 per point).
  const perPoint = beams.map((b, j) => Math.min(b.power, asks[j].total));
  const draw = gens.map((x) => (x.on ? p.shield.powerDraw.value : 0));
  return { paid, absorbed, perPoint, B, heat: paid.map((x, i) => x + draw[i]), power: beams.map((b) => b.power) };
}

export default {
  id: 'L2.shield.overlap',
  level: 'L2',
  laws: ['fields add, each source paying from its own budget', 'no shield absorbs more than its budget', 'absorbing makes heat'],
  dependsOn: ['L1.shield.generator', 'L0.shield.point.v2'],
  setup: 'in a cluster at T1, two M shield generators d in {40, 80 m} apart (centre to centre); (a) one beam of P in {5, 20 MW} midway; (b) two simultaneous beams of P, one at each generator, P = 10 MW (13d.2) and P = 20 MW (where the asks exceed the budget); (c) G2 unpowered, one beam of P in {5, 20 MW} midway; one step',
  measure: 'power absorbed at each point, what each generator pays, each generator\'s heat rate in the step',
  tolerance: 'relative 1e-12 (powers), 1e-9 (heat rates); the budget bound strict with a 1e-12 float slack',
  criterion: '(a) absorbed = min(P, sum_i B_i g_i), each generator pays its share a_i = P B_i g_i / sum B g (capped); (b) neither generator pays more than its budget (the #170 case: without the rule each point would absorb min(P, B + B g(d)) by itself); payments and absorption by the rule of 13d.1; (c) only the powered generator absorbs, the other pays 0 and does not heat; heat rate of each = its payment + its draw (#99, #170, #193, #194)',
  tunable: ['shield.budget', 'shield.radius', 'shield.powerDraw'],
  locked: null,
  cases() {
    const out = [];
    for (const d of [40, 80]) {
      for (const P of [5e6, 20e6]) out.push({ part: 'a', d, P });
      for (const P of [10e6, 20e6]) out.push({ part: 'b', d, P });
      for (const P of [5e6, 20e6]) out.push({ part: 'c', d, P });
    }
    return out;
  },
  expected(ctx, c) {
    return overlap(ctx, c);
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const g1 = addRoom(world, 'shieldGenerator', { id: 'G1', cell: [0, 0] });
    const g2 = addRoom(world, 'shieldGenerator', { id: 'G2', cell: [c.d / ctx.baseEdge, 0] });
    if (c.part === 'c') setPower(world, g2, false);
    setBeams(world, beamsOf(ctx, c));
    step(world);
    const r = world.beamResults;
    return {
      absorbed: r.map((x) => x.absorbed), paid: [g1.shield.paid, g2.shield.paid], em: [g1.shield.em, g2.shield.em],
      heat: [g1, g2].map((g) => g.heat.generated / ctx.dt), distance: Math.hypot(g2.position[0] - g1.position[0], g2.position[1] - g1.position[1]),
      books: [heatBooks(g1.heat), heatBooks(g2.heat)], eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a, c) {
    const eq = (x, y, tol) => (x === 0 ? y === 0 : close(x, y, tol));
    const checks = {
      'generators d apart': close(c.d, a.distance, 1e-12),
      'absorbed at each point': a.absorbed.length === e.absorbed.length && e.absorbed.every((x, j) => eq(x, a.absorbed[j], 1e-12)),
      'each generator pays its share': e.paid.every((x, i) => eq(x, a.paid[i], 1e-12)),
      'no generator pays more than its budget': a.paid.every((x) => x <= e.B * (1 + 1e-12)),
      'heat = payment + draw': e.heat.every((x, i) => eq(x, a.heat[i], 1e-9)),
      'EM brightness = payment': a.em.every((x, i) => eq(e.paid[i], x, 1e-12)),
      ...(c.part === 'a' ? { 'absorbed = min(P, sum B g)': close(e.perPoint[0], a.absorbed[0], 1e-12) } : {}),
      ...(c.part === 'c' ? { 'only the powered one absorbs': a.paid[1] === 0 && a.heat[1] === 0 } : {}),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual, MW = (x) => (x / 1e6).toFixed(6);
    return {
      expected: `absorbed [${e.absorbed.map(MW).join(', ')}] MW (each point alone, no rule: [${e.perPoint.map(MW).join(', ')}]); paid G1 ${MW(e.paid[0])}, G2 ${MW(e.paid[1])} MW (budget ${MW(e.B)}); heat [${e.heat.map(MW).join(', ')}] MW`,
      actual: `absorbed [${a.absorbed.map(MW).join(', ')}] MW; paid G1 ${MW(a.paid[0])}, G2 ${MW(a.paid[1])} MW; heat [${a.heat.map(MW).join(', ')}] MW`,
    };
  },
};
