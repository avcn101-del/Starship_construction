import { createWorld, addRoom, setPower, setControl, step } from '../../../js/rooms.js';
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
  id: 'L1.engine.thrust.v3',
  level: 'L1',
  laws: ['thrust from a reactor drive (no propellant)', 'engine heat', 'no power or no control, no thrust'],
  dependsOn: ['L1.room.thresholds', 'L1.radiator.cooling'],
  setup: 'an engine alone (2 x 3 cells), no radiator, throttle u in {0, 0.5, 1}, a ship mass m in {1000, 1500 t}; powered and controlled at T1; at u = 1 and 1500 t also unpowered and uncontrolled (cause \'control-loss\') at T1, and powered at T2-T6; full-throttle powered cases run until hot',
  measure: 'thrust, power drawn, acceleration and heat rate in the first step; time of the hot event at full throttle',
  tolerance: 'relative 1e-9; time one-sided (expected <= actual < expected + dt)',
  criterion: 'thrust = u F; draw = u D; heat rate = u D h; a = u F / m, exact; no power or no control: thrust 0 and draw 0 (#4d); time to hot at full throttle t = C (T_hot - T_rest) / (D h) one-sided (#140, #181, #183) Successor of L1.engine.thrust (#240, #243, 13k.4 S16): C = cells x thermal.coupledEngine (1.4 MJ/K per cell, 13k.2) in place of thermal.heatCapacityPerCell; DESIGN.md 13k.3 estimates the race to hot at 868 s (372 before). Successor of L1.engine.thrust.v2 (the engineer\'s specification error in physics pass 2, #243, found at its first canonical run; pending the lead designer\'s decision): the run\'s cap rises from 5000 s to 50 000 s (the T6 race to hot is 5208 s); nothing else changes.',
  tunable: ['engine.thrust', 'engine.powerDraw', 'engine.heatFraction', 'thermal.coupledEngine', 'thermal.plantHot'],
  locked: { date: '2026-10-22', hash: '9610ce09' },
  cases() {
    const out = [];
    for (const u of [0, 0.5, 1]) for (const m of [1e6, 1.5e6]) out.push({ tier: 'T1', u, m, powered: true, controlled: true });
    out.push({ tier: 'T1', u: 1, m: 1.5e6, powered: false, controlled: true }, { tier: 'T1', u: 1, m: 1.5e6, powered: true, controlled: false });
    for (const tier of ['T2', 'T3', 'T4', 'T5', 'T6']) out.push({ tier, u: 1, m: 1.5e6, powered: true, controlled: true });
    return out;
  },
  expected(ctx, c) {
    const s = ctx.tiers[c.tier].edge / ctx.baseEdge, v = (p) => p.value * s ** p.k, p = ctx.params.engine;
    const on = c.powered && c.controlled ? c.u : 0;
    const F = v(p.thrust), D = v(p.powerDraw), h = p.heatFraction.value;
    const [w, hh] = ROOMS.engine.footprint.M, C = w * hh * v(ctx.params.thermal.coupledEngine);
    const timed = on === 1;
    return {
      thrust: on * F, draw: on * D, heatRate: on * D * h, acceleration: (on * F) / c.m,
      hot: timed ? (C * (ctx.params.thermal.plantHot.value - ctx.fixed.restTemperature.value)) / (D * h) : null, dt: ctx.dt,
    };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, edge: ctx.tiers[c.tier].edge, dt: ctx.dt });
    world.shipMass = c.m;
    const room = addRoom(world, 'engine'), e = room.engine;
    e.throttle = c.u;
    setPower(world, room, c.powered);
    if (!c.controlled) setControl(world, room, false, 'control-loss');
    const Q = room.heat.Q;
    step(world);
    const first = { thrust: e.thrust, draw: e.draw, acceleration: e.acceleration, heatRate: (room.heat.Q - Q) / ctx.dt };
    let hot = null;
    if (c.u === 1 && c.powered && c.controlled) {
      while (!firstEvent(world, 'hot') && world.t < 50000) step(world);
      hot = firstEvent(world, 'hot') ? firstEvent(world, 'hot').t : null;
    }
    return { ...first, hot, books: heatBooks(room.heat), eventsOk: eventsOk(world.log.events) };
  },
  compare(e, a) {
    const checks = {
      thrust: close(e.thrust, a.thrust, 1e-9), draw: close(e.draw, a.draw, 1e-9), acceleration: close(e.acceleration, a.acceleration, 1e-9), 'heat rate': close(e.heatRate, a.heatRate, 1e-9),
      'time to hot': e.hot === null ? a.hot === null : oneSided(e.hot, a.hot, e.dt),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const f = (x) => `thrust ${(x.thrust / 1e6).toFixed(4)} MN, draw ${(x.draw / 1e6).toFixed(4)} MW, heat ${(x.heatRate / 1e6).toFixed(4)} MW, a ${x.acceleration.toFixed(4)} m/s2, hot ${x.hot === null ? '-' : x.hot.toFixed(4) + ' s'}`;
    return { expected: f(r.expected), actual: f(r.actual) };
  },
};
