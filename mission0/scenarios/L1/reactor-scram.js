import { createWorld, addRoom, setDemand, setControl, step, runUntil, roomTemperature } from '../../../js/rooms.js';
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

const SAMPLES = [60, 900, 1200]; // s, times at which the decay heat added is read

export default {
  id: 'L1.reactor.scram',
  level: 'L1',
  laws: ['fail-safe reactors: SCRAM on control loss', 'decay heat', 'meltdown at critical'],
  dependsOn: ['L1.room.thresholds', 'L1.radiator.cooling'],
  setup: 'an M reactor alone at T1, no radiator: running at full from T_s = rest (290 K) and from 600 K, and idle (demand 0) from rest; control cut at t_s = 0 with cause \'control-loss\'; run until the meltdown and 1 s more, or 5400 s (6 tau)',
  measure: 'power delivered in the first step after the cut; decay heat added by 60, 900 and 1200 s; meltdown time and the explosion\'s energy',
  tolerance: 'decay heat relative 1e-3; meltdown time one-sided (expected <= actual < expected + dt); energy relative 1e-9',
  criterion: 'delivered -> 0 within one step; SCRAM event with cause \'control-loss\'; decay heat P_d(t) = f h P e^(-t/tau), so heat added by t = f h P tau (1 - e^(-t/tau)) to 1e-3; no decay heat from an idle reactor (its temperature stays at T_s); meltdown iff C (T_crit - T_s) < f h P tau, at t = -tau ln(1 - C (T_crit - T_s) / (f h P tau)) one-sided (yes from 600 K, no from rest), and its explosion event carries reactor.explosionEnergy (#81, #82, #181, #183)',
  tunable: ['reactor.power', 'reactor.heatPerPower', 'reactor.decayFraction', 'reactor.decayTime', 'reactor.explosionEnergy', 'thermal.heatCapacityPerCell', 'thermal.plantCritical'],
  locked: { date: '2026-10-21', hash: 'a9f1c96a' },
  cases(ctx) {
    const rest = ctx.fixed.restTemperature.value;
    return [{ T0: rest, d: 1 }, { T0: 600, d: 1 }, { T0: rest, d: 0 }];
  },
  expected(ctx, c) {
    const r = ctx.params.reactor, [w, h] = ROOMS.reactor.footprint.M;
    const C = w * h * ctx.params.thermal.heatCapacityPerCell.value, tau = r.decayTime.value;
    const E = r.decayFraction.value * r.heatPerPower.value * c.d * r.power.value * tau;
    const need = C * (ctx.params.thermal.plantCritical.value - c.T0);
    const melts = need < E;
    return {
      decay: SAMPLES.map((t) => E * (1 - Math.exp(-t / tau))), melts,
      meltdown: melts ? -tau * Math.log(1 - need / E) : null, energy: melts ? r.explosionEnergy.value : null, T0: c.T0, dt: ctx.dt,
    };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt });
    const room = addRoom(world, 'reactor', { temperature: c.T0 }), r = room.reactor;
    setDemand(world, room, c.d);
    setControl(world, room, false, 'control-loss');
    step(world);
    const deliveredAfter = r.delivered;
    const decay = SAMPLES.map((t) => { runUntil(world, t); return r.decayHeat; });
    let end = 5400;
    while (world.t < end) {
      step(world);
      if (end === 5400 && firstEvent(world, 'meltdown')) end = world.t + 1;
    }
    const scram = firstEvent(world, 'scram'), melt = firstEvent(world, 'meltdown');
    const explosions = world.log.events.filter((e) => e.type === 'explosion');
    return {
      deliveredAfter, scramCause: scram ? scram.cause : null, decay, meltdown: melt ? melt.t : null,
      explosions: explosions.map((e) => ({ t: e.t, energy: e.energy })), T: roomTemperature(room),
      books: heatBooks(room.heat), eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a, c) {
    const checks = {
      'delivered 0 after one step': a.deliveredAfter === 0, 'scram cause': a.scramCause === 'control-loss',
      'decay heat added': e.decay.every((x, i) => close(x, a.decay[i], 1e-3)),
    };
    if (c.d === 0) checks['idle: stays at T_s'] = a.T === e.T0;
    if (e.melts) Object.assign(checks, {
      meltdown: oneSided(e.meltdown, a.meltdown, e.dt),
      explosion: a.explosions.length === 1 && a.explosions[0].t === a.meltdown && close(e.energy, a.explosions[0].energy, 1e-9),
    });
    else Object.assign(checks, { 'no meltdown': a.meltdown === null && a.explosions.length === 0 });
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual, mj = (x) => (x / 1e6).toFixed(3);
    return {
      expected: `decay ${e.decay.map(mj).join(' / ')} MJ by ${SAMPLES.join(' / ')} s; meltdown ${e.melts ? e.meltdown.toFixed(4) + ' s, ' + mj(e.energy) + ' MJ' : 'never'}`,
      actual: `decay ${a.decay.map(mj).join(' / ')} MJ; meltdown ${a.meltdown === null ? 'never' : a.meltdown.toFixed(4) + ' s, ' + a.explosions.map((x) => mj(x.energy)).join(', ') + ' MJ'}; delivered after cut ${a.deliveredAfter}`,
    };
  },
};
