import { createWorld, addRoom, setDemand, step, runUntil, roomTemperature } from '../../../js/rooms.js';
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
  id: 'L1.reactor.power.v2',
  level: 'L1',
  laws: ['power on demand', 'reactor waste heat', 'overheated shuts down', 'decay heat'],
  dependsOn: ['L1.room.thresholds', 'L1.radiator.cooling'],
  setup: 'an M reactor alone, no radiator, at demand d in {0, 0.25, 0.5, 1} of reactor.power at T1, and d = 1 at T2-T6; run until overheated and one step more (d = 0: 120 s)',
  measure: 'power delivered and heat rate in the first step; time of the overheated event; power delivered and decay heat in the step after it',
  tolerance: 'relative 1e-9; time one-sided (expected <= actual < expected + dt)',
  criterion: 'delivered = d P exactly (demand-driven); heat rate = h d P; t_over = C (T_overheated - T_rest) / (h d P) one-sided (d = 0: never, the room stays at T_rest); in the step after overheated delivered = 0 and the decay heat has begun: f h d P tau (1 - e^(-dt/tau)) over that step, relative 1e-9 (#81, #181, #183) Successor of L1.reactor.power (#240, #243, 13k.4 S16): C = cells x thermal.coupledReactor (5.5 MJ/K per cell, 13k.2) in place of thermal.heatCapacityPerCell; DESIGN.md 13k.3 estimates the full-power race to overheated at 561 s (61 before); S3 (L1.heat.coupled) carries the same race at T1-T6.',
  tunable: ['reactor.power', 'reactor.heatPerPower', 'reactor.decayFraction', 'reactor.decayTime', 'thermal.coupledReactor', 'thermal.plantOverheated'],
  locked: { date: '2026-10-22', hash: 'ac393ea6' },
  cases() {
    const out = [0, 0.25, 0.5, 1].map((d) => ({ tier: 'T1', d }));
    for (const tier of ['T2', 'T3', 'T4', 'T5', 'T6']) out.push({ tier, d: 1 });
    return out;
  },
  expected(ctx, c) {
    const s = ctx.tiers[c.tier].edge / ctx.baseEdge, v = (p) => p.value * s ** p.k, r = ctx.params.reactor;
    const [w, h] = ROOMS.reactor.footprint.M;
    const C = w * h * v(ctx.params.thermal.coupledReactor), P = v(r.power), hp = r.heatPerPower.value, tau = r.decayTime.value, dt = ctx.dt;
    const heat = hp * c.d * P;
    return {
      delivered: c.d * P, heatRate: heat,
      overheated: c.d > 0 ? (C * (ctx.params.thermal.plantOverheated.value - ctx.fixed.restTemperature.value)) / heat : null,
      decayStep: r.decayFraction.value * heat * tau * (1 - Math.exp(-dt / tau)), rest: ctx.fixed.restTemperature.value, dt,
    };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, edge: ctx.tiers[c.tier].edge, dt: ctx.dt });
    const room = addRoom(world, 'reactor'), r = room.reactor;
    setDemand(world, room, c.d);
    const Q0 = room.heat.Q;
    step(world);
    const first = { delivered: r.delivered, heatRate: (room.heat.Q - Q0) / ctx.dt };
    if (c.d === 0) {
      runUntil(world, 120);
      return { ...first, overheated: null, T: roomTemperature(room), books: heatBooks(room.heat), eventsOk: eventsOk(world.log.events) };
    }
    while (!firstEvent(world, 'overheated') && world.t < 3000) step(world);
    const over = firstEvent(world, 'overheated'), shutdown = firstEvent(world, 'shutdown');
    const decayBefore = r.decayHeat;
    step(world);
    return {
      ...first, overheated: over ? over.t : null, shutdownAt: shutdown ? shutdown.t : null,
      deliveredAfter: r.delivered, decayAfter: r.decayHeat - decayBefore,
      books: heatBooks(room.heat), eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a, c) {
    const checks = { delivered: close(e.delivered, a.delivered, 1e-9), 'heat rate': close(e.heatRate, a.heatRate, 1e-9) };
    if (c.d === 0) Object.assign(checks, { 'never overheats': a.overheated === null, 'stays at rest': a.T === e.rest });
    else Object.assign(checks, {
      overheated: oneSided(e.overheated, a.overheated, e.dt), 'shuts down': a.shutdownAt === a.overheated,
      'delivered 0 after': a.deliveredAfter === 0, 'decay heat begins': close(e.decayStep, a.decayAfter, 1e-9),
    });
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual, mw = (x) => (x / 1e6).toFixed(4) + ' MW';
    return {
      expected: `delivered ${mw(e.delivered)}, heat ${mw(e.heatRate)}; overheated ${e.overheated === null ? 'never' : e.overheated.toFixed(4) + ' s'}; decay in the next step ${(e.decayStep / 1e3).toFixed(4)} kJ`,
      actual: `delivered ${mw(a.delivered)}, heat ${mw(a.heatRate)}; overheated ${a.overheated === null ? 'never' : a.overheated.toFixed(4) + ' s'}${a.decayAfter === undefined ? '' : `; then delivered ${a.deliveredAfter}, decay ${(a.decayAfter / 1e3).toFixed(4)} kJ`}`,
    };
  },
};
