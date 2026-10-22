import { createWorld, addRoom, shieldRound, shieldBuffer, runUntil, step } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';

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

const SALVO_AT = 1; // s: the salvo arrives between two steps, the buffer full
const REFILL = 2; // s of refill watched after the salvo
// An M round at T1 from data.js (L0): a steel cylinder roundLengthToDiameter diameters long.
function roundOf(ctx) {
  const p = ctx.params, f = ctx.fixed, m = p.kinetic.roundMass.value, v = p.kinetic.muzzleVelocity.value;
  const D = Math.cbrt((4 * m) / (Math.PI * f.steelDensity.value * f.roundLengthToDiameter.value));
  return { mass: m, velocity: v, area: (Math.PI * D * D) / 4 };
}
/**
 * L0's stop at the generator (strength 1) paid from the buffer (13d.1): the field removes up to
 * kineticStop of sectional momentum; the energy it takes, E = m (v^2 - v1^2) / 2, comes from the buffer
 * (shield.buffer); a round the buffer cannot pay in full is slowed only by what is left,
 * v = sqrt(v^2 - 2 b / m), and later rounds pass at their unstopped speed. Binds at k = ceil(buffer / E).
 */
function salvo(ctx, N) {
  const p = ctx.params, r = roundOf(ctx), stop = p.shield.kineticStop.value;
  const s0 = (r.mass * r.velocity) / r.area, ds = Math.min(s0, stop), v1 = (r.velocity * (s0 - ds)) / s0;
  const E = 0.5 * r.mass * (r.velocity ** 2 - v1 ** 2), cap = p.shield.buffer.value; // shield.buffer in joules (#240 (4))
  const k = Math.ceil(cap / E);
  let b = cap;
  const out = [];
  for (let i = 1; i <= N; i++) {
    if (E <= b) { out.push({ velocity: v1, energy: E }); b -= E; }
    else { out.push({ velocity: Math.sqrt(r.velocity ** 2 - (2 * b) / r.mass), energy: b }); b = 0; }
  }
  return { rounds: out, E, cap, k, left: b, v1, budget: p.shield.budget.value, draw: p.shield.powerDraw.value };
}

export default {
  id: 'L2.shield.buffer.v2',
  level: 'L2',
  laws: ['the shield buffer catches impulses', 'the buffer refills at the unused budget', 'absorbing makes heat'],
  dependsOn: ['L1.shield.generator', 'L0.shield.kinetic.v2'],
  setup: 'in a cluster at T1, an M shield generator, powered, no beam on it; at 1 s a salvo of N in {5, 20, 40} M rounds (13d.2) and N = 80 (the first N past the binding round with these constants) arrives at the generator between two steps; then 2 s of refill',
  measure: 'each round\'s speed after the field and the energy it cost; the buffer after the salvo and after every step of the refill; the generator\'s heat in the step after the salvo',
  tolerance: 'relative 1e-9',
  criterion: 'stopping energy per round E from L0 (kineticStop at strength 1); the buffer shield.buffer binds at round k = ceil(buffer / E): rounds before k leave at the stopped speed, round k is slowed only by what is left, later rounds pass at their unstopped speed; the buffer after the salvo = buffer - sum of energies; refill at the unused budget (no beam: the whole budget) in closed form, b_n = min(buffer, b_0 + n budget dt) after n steps; the heat in the next step = draw dt + sum of energies (E4: the buffer has a measured effect) (#21, #139, #177, #193, #194) Successor of L2.shield.buffer (#240, #243, 13k.4 S16): the buffer is shield.buffer (1e7 J at T1, the same as budget x bufferSeconds was) in place of the removed shield.bufferSeconds; nothing else changes.',
  tunable: ['shield.budget', 'shield.buffer', 'shield.kineticStop', 'shield.powerDraw', 'kinetic.roundMass', 'kinetic.muzzleVelocity'],
  locked: null,
  cases() {
    return [5, 20, 40, 80].map((N) => ({ N }));
  },
  expected(ctx, c) {
    const x = salvo(ctx, c.N), n = Math.round(REFILL / ctx.dt);
    return {
      velocities: x.rounds.map((r) => r.velocity), energies: x.rounds.map((r) => r.energy), E: x.E, k: x.k, binds: c.N >= x.k,
      after: x.left, refill: Array.from({ length: n }, (_, i) => Math.min(x.cap, x.left + (i + 1) * x.budget * ctx.dt)),
      heat: x.draw * ctx.dt + x.rounds.reduce((s, r) => s + r.energy, 0), cap: x.cap, unstopped: roundOf(ctx).velocity,
    };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const g = addRoom(world, 'shieldGenerator', { id: 'G', cell: [0, 0] });
    runUntil(world, SALVO_AT);
    const before = shieldBuffer(world, g), r = roundOf(ctx);
    const rounds = Array.from({ length: c.N }, () => shieldRound(world, { position: g.position, ...r }));
    const after = shieldBuffer(world, g), Q = g.heat.generated;
    const refill = [];
    for (let i = 0; i < Math.round(REFILL / ctx.dt); i++) {
      step(world);
      if (i === 0) refill.heat = g.heat.generated - Q;
      refill.push(shieldBuffer(world, g));
    }
    return {
      before, after, velocities: rounds.map((x) => x.velocity), energies: rounds.map((x) => x.energy), heat: refill.heat, refill: [...refill],
      books: [heatBooks(g.heat)], eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a) {
    const eq = (x, y) => (x === 0 ? Math.abs(y) <= 1e-9 * e.cap : close(x, y, 1e-9));
    const checks = {
      'buffer full before the salvo': close(e.cap, a.before, 1e-9),
      'speed after the field, each round': a.velocities.length === e.velocities.length && e.velocities.every((v, i) => close(v, a.velocities[i], 1e-9)),
      'energy paid, each round': e.energies.every((x, i) => eq(x, a.energies[i])),
      'buffer after the salvo': eq(e.after, a.after),
      'refill every step': a.refill.length === e.refill.length && e.refill.every((x, i) => close(x, a.refill[i], 1e-9)),
      'heat in the next step': close(e.heat, a.heat, 1e-9),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return [
      { name: 'the buffer binds in at least one case (E4: a measured effect)', ok: rows.some((r) => r.expected.binds && r.actual.velocities.slice(r.expected.k).every((v) => close(r.expected.unstopped, v, 1e-9))) },
      ...common(rows),
    ];
  },
  display(r) {
    const e = r.expected, a = r.actual, v = (x) => x.toFixed(3);
    const last = (xs) => xs[xs.length - 1];
    return {
      expected: `E ${(e.E / 1e3).toFixed(3)} kJ per round; binds at round ${e.k}${e.binds ? '' : ' (not reached)'}; last speed ${v(last(e.velocities))} m/s; buffer ${(e.cap / 1e6).toFixed(3)} -> ${(e.after / 1e6).toFixed(6)} MJ, after 2 s ${(last(e.refill) / 1e6).toFixed(6)} MJ; heat ${(e.heat / 1e6).toFixed(6)} MJ`,
      actual: `speeds ${v(a.velocities[0])} .. ${v(last(a.velocities))} m/s; buffer ${(a.before / 1e6).toFixed(3)} -> ${(a.after / 1e6).toFixed(6)} MJ, after 2 s ${(last(a.refill) / 1e6).toFixed(6)} MJ; heat ${(a.heat / 1e6).toFixed(6)} MJ`,
    };
  },
};
