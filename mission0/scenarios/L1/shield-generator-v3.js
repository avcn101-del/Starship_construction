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
  id: 'L1.shield.generator.v3',
  level: 'L1',
  laws: ['shield absorbs at a rate', 'absorbing makes heat', 'overheated shuts down', 'EM-bright while absorbing'],
  dependsOn: ['L1.room.thresholds', 'L1.radiator.cooling', 'L0.shield.point.v2'],
  setup: 'an M shield generator alone, on, no radiator, a beam P_in at the generator (strength 1) of 0.4, 1, 2 and 6 x beam.power (2, 5, 10, 30 MW) at T1, powered and unpowered; 1 x beam.power at T2-T6; run until overheated and one step more (unpowered: 60 s)',
  measure: 'absorbed and passed power, EM signature and heat rate in the first step; time of overheated; passed power and heat rate in the step after it; the shield-down event',
  tolerance: 'relative 1e-9; time one-sided (expected <= actual < expected + dt)',
  criterion: 'absorbed = min(P_in, shield.budget) (L0); heat rate = shield.powerDraw + absorbed; t_over = C (T_overheated - T_rest) / (draw + absorbed) one-sided; after the shutdown passed = P_in and heat rate 0, shield-down with cause \'heat\'; unpowered: field off from the start (absorbed 0, passed P_in, heat 0, shield-down with cause \'no-power\' at 0); EM signature = absorbed power (#21, #139, #181, #183) Successor of L1.shield.generator (#240, #243, 13k.4 S16): C = cells x thermal.coupledShieldGenerator (3.2 MJ/K per cell, 13k.2) in place of thermal.heatCapacityPerCell. Successor of L1.shield.generator.v2 (the engineer\'s specification error in physics pass 2, #243, found at its first canonical run; pending the lead designer\'s decision): the run\'s cap rises from 3000 s to 30 000 s (the T5 and T6 races to overheated are 3730 s and 5595 s); nothing else changes.',
  tunable: ['shield.budget', 'shield.powerDraw', 'beam.power', 'thermal.coupledShieldGenerator', 'thermal.plantOverheated'],
  locked: { date: '2026-10-22', hash: '80e405cd' },
  cases() {
    const out = [];
    for (const powered of [true, false]) for (const x of [0.4, 1, 2, 6]) out.push({ tier: 'T1', x, powered });
    for (const tier of ['T2', 'T3', 'T4', 'T5', 'T6']) out.push({ tier, x: 1, powered: true });
    return out;
  },
  expected(ctx, c) {
    const s = ctx.tiers[c.tier].edge / ctx.baseEdge, v = (p) => p.value * s ** p.k, p = ctx.params;
    const Pin = c.x * v(p.beam.power), [w, h] = ROOMS.shieldGenerator.footprint.M, C = w * h * v(p.thermal.coupledShieldGenerator);
    if (!c.powered) return { Pin, absorbed: 0, passed: Pin, em: 0, heatRate: 0, overheated: null, down: { t: 0, cause: 'no-power' }, dt: ctx.dt };
    const absorbed = Math.min(Pin, v(p.shield.budget)), heatRate = v(p.shield.powerDraw) + absorbed;
    return {
      Pin, absorbed, passed: Pin - absorbed, em: absorbed, heatRate,
      overheated: (C * (p.thermal.plantOverheated.value - ctx.fixed.restTemperature.value)) / heatRate, down: { cause: 'heat' }, dt: ctx.dt,
    };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, edge: ctx.tiers[c.tier].edge, dt: ctx.dt });
    const room = addRoom(world, 'shieldGenerator'), g = room.shield;
    g.incoming = c.x * ctx.scaled(ctx.params.beam.power, ctx.tiers[c.tier].edge);
    g.strength = 1;
    setPower(world, room, c.powered);
    let Q = room.heat.Q;
    step(world);
    const first = { absorbed: g.absorbed, passed: g.passed, em: g.em, heatRate: (room.heat.Q - Q) / ctx.dt };
    let after = null;
    if (c.powered) {
      while (!firstEvent(world, 'overheated') && world.t < 30000) step(world);
      Q = room.heat.Q;
      step(world);
      after = { passed: g.passed, heatRate: (room.heat.Q - Q) / ctx.dt };
    } else runUntil(world, 60);
    const over = firstEvent(world, 'overheated'), down = world.log.events.filter((e) => e.type === 'shield-down').map((e) => ({ t: e.t, cause: e.cause }));
    return { ...first, overheated: over ? over.t : null, after, down, books: heatBooks(room.heat), eventsOk: eventsOk(world.log.events) };
  },
  compare(e, a, c) {
    const checks = {
      absorbed: close(e.absorbed, a.absorbed, 1e-9), passed: close(e.passed, a.passed, 1e-9), EM: close(e.em, a.em, 1e-9), 'heat rate': close(e.heatRate, a.heatRate, 1e-9),
    };
    if (c.powered) Object.assign(checks, {
      overheated: oneSided(e.overheated, a.overheated, e.dt), 'passed after': !!a.after && close(e.Pin, a.after.passed, 1e-9), 'no heat after': !!a.after && a.after.heatRate === 0,
      'shield-down': a.down.length === 1 && a.down[0].cause === 'heat' && a.down[0].t === a.overheated,
    });
    else Object.assign(checks, { 'never overheats': a.overheated === null, 'shield-down': a.down.length === 1 && a.down[0].cause === 'no-power' && a.down[0].t === 0 });
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual, mw = (x) => (x / 1e6).toFixed(4);
    return {
      expected: `absorbed ${mw(e.absorbed)}, passed ${mw(e.passed)}, EM ${mw(e.em)}, heat ${mw(e.heatRate)} MW; overheated ${e.overheated === null ? 'never' : e.overheated.toFixed(4) + ' s'}`,
      actual: `absorbed ${mw(a.absorbed)}, passed ${mw(a.passed)}, EM ${mw(a.em)}, heat ${mw(a.heatRate)} MW; overheated ${a.overheated === null ? 'never' : a.overheated.toFixed(4) + ' s'}${a.after ? `; then passed ${mw(a.after.passed)}, heat ${mw(a.after.heatRate)} MW` : ''}`,
    };
  },
};
