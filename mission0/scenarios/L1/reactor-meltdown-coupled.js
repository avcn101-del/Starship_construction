import { createWorld, addRoom, runUntil } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';

// Checks shared by every L1 scenario (#181), written out in this file so its lock covers them.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], scram: ['energy'], explosion: ['energy', 'channel'] };
const eventsOk = (events) => events.every((e) => Number.isFinite(e.t) && typeof e.type === 'string' && typeof e.room === 'string' && e.room !== ''
  && typeof e.cause === 'string' && e.cause !== '' && Number.isInteger(e.crew) && e.crew >= 0
  && (EXTRA[e.type] || []).every((f) => (f === 'channel' ? typeof e[f] === 'string' && e[f] !== '' : Number.isFinite(e[f]))));
const booksOk = (b) => Math.abs(b.generated - b.radiated - b.stored) <= 1e-9 * Math.max(Math.abs(b.generated), Math.abs(b.radiated), Math.abs(b.stored));
const oneSided = (e, a, dt) => Number.isFinite(a) && a >= e - 1e-9 * Math.abs(e) && a < e + dt + 1e-9 * Math.abs(e);
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

// The heat source (W, a test source on the room, externalPower) per tier, chosen so the meltdown falls off the step
// grid: T1 7 MW, t = 4 x 5.5e6 x 40 / 7e6 = 880/7 s = 125.714 s (7542.86 steps); T3 28 MW, C x 8, 251.43 s (15085.7 steps).
const SOURCE = { T1: 7e6, T3: 2.8e7 };

export default {
  id: 'L1.reactor.meltdown.coupled',
  level: 'L1',
  laws: ['a reactor at critical melts down and explodes (#81, #183)', 'heat capacity by thermally coupled mass: C = cells x thermal.coupledReactor (#240 (1), 13k.1)'],
  dependsOn: ['L1.heat.coupled.v2'],
  setup: 'an M reactor alone (a cluster of one, no radiators, demand 0: it delivers nothing) starting at 960 K, with a steady test source on the room (externalPower) of 7 MW at T1 and 28 MW at T3; it shuts down at the first step (above overheated) and heats on to plant critical (13l.4 A5, §17 item 22)',
  measure: 'the time of the meltdown event; the explosion; the heat books',
  tolerance: 'the time one-sided in [t, t + dt) (the 1e-9 float slack of #185 (2)), t off the step grid',
  criterion: 't = C (thermal.plantCritical - 960 K) / P with C = 4 x thermal.coupledReactor x (edge / 5)^3 (re-statement); hand-worked literals: T1 C = 2.2e7 J/K, t = 2.2e7 x 40 / 7e6 = 880/7 = 125.714 s; T3 C = 1.76e8 J/K, t = 1.76e8 x 40 / 2.8e7 = 1760/7 = 251.43 s; a meltdown event then an explosion (cause heat) in the same step; heat books close (generated = radiated + stored, 1e-9) (#81, #248 Q6, §17 item 22)',
  tunable: ['thermal.coupledReactor', 'thermal.plantCritical'],
  locked: null,
  cases() {
    return Object.keys(SOURCE).map((tier) => ({ tier }));
  },
  expected(ctx, c) {
    const edge = ctx.tiers[c.tier].edge, C = 4 * ctx.scaled(ctx.params.thermal.coupledReactor, edge);
    return { t: (C * (ctx.params.thermal.plantCritical.value - 960)) / SOURCE[c.tier], literal: { T1: 880 / 7, T3: 1760 / 7 }[c.tier], C };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, edge: ctx.tiers[c.tier].edge, dt: ctx.dt });
    const room = addRoom(world, 'reactor', { temperature: 960 });
    room.externalPower = SOURCE[c.tier];
    runUntil(world, 300, null);
    const melt = world.log.events.find((e) => e.type === 'meltdown'), boom = world.log.events.find((e) => e.type === 'explosion');
    return { t: melt ? melt.t : null, explosion: boom ? { t: boom.t, cause: boom.cause } : null, shutdown: world.log.events.some((e) => e.type === 'shutdown'), C: room.heat.C, books: heatBooks(room.heat), eventsOk: eventsOk(world.log.events), offGrid: null };
  },
  compare(e, a, c, ctx) {
    const steps = e.t / ctx.dt;
    const checks = {
      'heat capacity 4 x coupledReactor': Math.abs(a.C - e.C) <= 1e-12 * e.C,
      'meltdown in [t, t + dt)': oneSided(e.t, a.t, ctx.dt),
      'hand-worked literal t (880/7, 1760/7 s)': Math.abs(e.literal - e.t) <= 1e-12 * e.t,
      't off the step grid': Math.abs(steps - Math.round(steps)) > 1e-3,
      'explosion, cause heat, in the meltdown step': a.explosion !== null && a.explosion.t === a.t && a.explosion.cause === 'heat',
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return [
      { name: 'heat books: generated = radiated + stored (1e-9), every case', ok: rows.every((r) => booksOk(r.actual.books)) },
      { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) },
    ];
  },
  display(r) {
    return { expected: `meltdown at ${r.expected.t.toFixed(6)} s (C ${r.expected.C.toExponential(4)} J/K)`, actual: `meltdown at ${r.actual.t === null ? '-' : r.actual.t.toFixed(6)} s${r.actual.shutdown ? ', shut down first' : ''}` };
  },
};
