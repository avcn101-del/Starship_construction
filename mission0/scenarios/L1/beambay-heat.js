import { createWorld, addRoom, setPower, step, runUntil } from '../../../js/rooms.js';
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
  id: 'L1.beambay.heat',
  level: 'L1',
  laws: ['beam efficiency: the rest is heat', 'overheated shuts down', 'no power, no beam'],
  dependsOn: ['L1.room.thresholds', 'L1.radiator.cooling'],
  setup: 'an M beam bay alone, no radiator, firing at full: powered at T1-T6, unpowered at T1; run until overheated and one step more (unpowered: 60 s)',
  measure: 'beam power, draw and heat rate in the first step; times of hot and overheated; beam and draw in the step after overheated; the beam-stopped event',
  tolerance: 'relative 1e-9; times one-sided (expected <= actual < expected + dt)',
  criterion: 'draw = beam.power / beambay.efficiency; heat rate = draw - beam.power; t_hot and t_over = C (T_x - T_rest) / heat rate, one-sided; at overheated the beam stops (power 0, draw 0, event beam-stopped with cause \'heat\'); unpowered: no beam, no draw, beam-stopped with cause \'no-power\' at 0 (#181, #183)',
  tunable: ['beam.power', 'beambay.efficiency', 'thermal.heatCapacityPerCell', 'thermal.plantHot', 'thermal.plantOverheated'],
  locked: null,
  cases() {
    return [...['T1', 'T2', 'T3', 'T4', 'T5', 'T6'].map((tier) => ({ tier, powered: true })), { tier: 'T1', powered: false }];
  },
  expected(ctx, c) {
    const s = ctx.tiers[c.tier].edge / ctx.baseEdge, v = (p) => p.value * s ** p.k, p = ctx.params;
    if (!c.powered) return { beam: 0, draw: 0, heatRate: 0, hot: null, overheated: null, stopped: { t: 0, cause: 'no-power' } };
    const beam = v(p.beam.power), draw = beam / p.beambay.efficiency.value, heatRate = draw - beam;
    const [w, h] = ROOMS.beamBay.footprint.M, C = w * h * v(p.thermal.heatCapacityPerCell), rest = ctx.fixed.restTemperature.value;
    return { beam, draw, heatRate, hot: (C * (p.thermal.plantHot.value - rest)) / heatRate, overheated: (C * (p.thermal.plantOverheated.value - rest)) / heatRate, stopped: { cause: 'heat' }, dt: ctx.dt };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, edge: ctx.tiers[c.tier].edge, dt: ctx.dt });
    const room = addRoom(world, 'beamBay'), b = room.beamBay;
    b.firing = true;
    setPower(world, room, c.powered);
    const Q = room.heat.Q;
    step(world);
    const first = { beam: b.beam, draw: b.draw, heatRate: (room.heat.Q - Q) / ctx.dt };
    let after = null;
    if (c.powered) {
      while (!firstEvent(world, 'overheated') && world.t < 5000) step(world);
      step(world);
      after = { beam: b.beam, draw: b.draw };
    } else runUntil(world, 60);
    const t = (type) => (firstEvent(world, type) ? firstEvent(world, type).t : null);
    const stopped = world.log.events.filter((e) => e.type === 'beam-stopped').map((e) => ({ t: e.t, cause: e.cause }));
    return { ...first, hot: t('hot'), overheated: t('overheated'), after, stopped, books: heatBooks(room.heat), eventsOk: eventsOk(world.log.events) };
  },
  compare(e, a, c) {
    const checks = { beam: close(e.beam, a.beam, 1e-9), draw: close(e.draw, a.draw, 1e-9), 'heat rate': close(e.heatRate, a.heatRate, 1e-9) };
    if (c.powered) Object.assign(checks, {
      hot: oneSided(e.hot, a.hot, e.dt), overheated: oneSided(e.overheated, a.overheated, e.dt),
      'beam stops': !!a.after && a.after.beam === 0 && a.after.draw === 0,
      'beam-stopped': a.stopped.length === 1 && a.stopped[0].cause === 'heat' && a.stopped[0].t === a.overheated,
    });
    else Object.assign(checks, { 'never hot': a.hot === null, 'beam-stopped': a.stopped.length === 1 && a.stopped[0].cause === 'no-power' && a.stopped[0].t === 0 });
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const f = (x) => `beam ${(x.beam / 1e6).toFixed(4)}, draw ${(x.draw / 1e6).toFixed(4)}, heat ${(x.heatRate / 1e6).toFixed(4)} MW; hot ${x.hot === null ? '-' : x.hot.toFixed(4)}, overheated ${x.overheated === null ? '-' : x.overheated.toFixed(4)} s`;
    return { expected: f(r.expected), actual: f(r.actual) };
  },
};
