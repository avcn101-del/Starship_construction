import { createWorld, addRoom, setRadiators, runUntil, roomTemperature } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';

// Checks shared by every L1 scenario (#181), written out in each file so its lock covers them.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-repaired': ['cell'], scram: ['energy'], explosion: ['energy', 'channel'], shot: ['energy', 'channel'] };
const eventsOk = (events) => events.every((e) => Number.isFinite(e.t) && typeof e.type === 'string' && typeof e.room === 'string' && e.room !== ''
  && typeof e.cause === 'string' && e.cause !== '' && Number.isInteger(e.crew) && e.crew >= 0
  && (EXTRA[e.type] || []).every((f) => (f === 'channel' ? typeof e[f] === 'string' && e[f] !== '' : Number.isFinite(e[f]))));
const booksOk = (b) => Math.abs(b.generated - b.radiated - b.stored) <= 1e-9 * Math.max(Math.abs(b.generated), Math.abs(b.radiated), Math.abs(b.stored));
// One-sided time: expected <= actual < expected + dt, each bound with a 1e-9 relative float slack.
const oneSided = (e, a, dt) => Number.isFinite(a) && a >= e - 1e-9 * Math.abs(e) && a < e + dt + 1e-9 * Math.abs(e);
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const common = (rows) => [
  { name: 'heat books: generated = radiated + stored, 1e-9 relative, every case', ok: rows.every((r) => booksOk(r.actual.books)) },
  { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) },
];
const firstEvent = (world, type) => world.log.events.find((e) => e.type === type) || null;
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L1.radiator.cooling',
  level: 'L1',
  laws: ['radiators follow Stefan-Boltzmann', 'energy conservation'],
  dependsOn: [],
  setup: 'an idle M turret (a hull room: no ammunition, no generation) starting at T0 in {400, 600, 800, 1000, 1200 K} with n in {1, 2} radiators, run 60 s at the simulation step; T2-T6 at T0 = 1000 K',
  measure: 'room temperature at 60 s; heat radiated and heat left in the room',
  tolerance: 'temperature relative 1e-3 (explicit Euler); books relative 1e-9',
  criterion: 'T(t) = (T0^-3 + 3 n eps sigma A t / C)^(-1/3), A = radiator.area and C = cells x thermal.heatCapacityPerCell scaled by tier; |T - T(60 s)| / T(60 s) <= 1e-3; radiated + heat left = initial heat C T0 to 1e-9 relative (#143, #181, #182)',
  tunable: ['radiator.area', 'thermal.heatCapacityPerCell'],
  locked: { date: '2026-10-21', hash: 'd33a4cfc' },
  cases(ctx) {
    const out = [];
    for (const T0 of [400, 600, 800, 1000, 1200]) for (const n of [1, 2]) out.push({ tier: 'T1', T0, n });
    for (const tier of ['T2', 'T3', 'T4', 'T5', 'T6']) for (const n of [1, 2]) out.push({ tier, T0: 1000, n });
    return out;
  },
  expected(ctx, c) {
    const s = ctx.tiers[c.tier].edge / ctx.baseEdge, v = (p) => p.value * s ** p.k;
    const [w, h] = ROOMS.turret.footprint.M;
    const C = w * h * v(ctx.params.thermal.heatCapacityPerCell);
    const k = c.n * ctx.fixed.radiatorEmissivity.value * ctx.fixed.stefanBoltzmann.value * v(ctx.params.radiator.area);
    return { T: (c.T0 ** -3 + (3 * k * 60) / C) ** (-1 / 3), initial: C * c.T0 };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, edge: ctx.tiers[c.tier].edge, dt: ctx.dt });
    const room = addRoom(world, 'turret', { temperature: c.T0 });
    setRadiators(room, c.n);
    runUntil(world, 60);
    const books = heatBooks(room.heat);
    return { T: roomTemperature(room), radiated: books.radiated, left: room.heat.Q, books, eventsOk: eventsOk(world.log.events) };
  },
  compare(e, a) {
    const checks = { temperature: close(e.T, a.T, 1e-3), 'radiated + left = initial': close(e.initial, a.radiated + a.left, 1e-9) };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const mj = (x) => (x / 1e6).toFixed(3) + ' MJ';
    return {
      expected: `T(60 s) ${r.expected.T.toFixed(4)} K; radiated + left = ${mj(r.expected.initial)}`,
      actual: `T ${r.actual.T.toFixed(4)} K; radiated ${mj(r.actual.radiated)} + left ${mj(r.actual.left)}`,
    };
  },
};
