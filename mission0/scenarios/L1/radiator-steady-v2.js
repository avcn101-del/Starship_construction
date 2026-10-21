import { createWorld, addRoom, setRadiators, setActive, runUntil, roomTemperature, irBrightness } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';

// Checks shared by every L1 scenario (#181), written out in each file so its lock covers them.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-repaired': ['cell'], scram: ['energy'], explosion: ['energy', 'channel'], shot: ['energy', 'channel'] };
const eventsOk = (events) => events.every((e) => Number.isFinite(e.t) && typeof e.type === 'string' && typeof e.room === 'string' && e.room !== ''
  && typeof e.cause === 'string' && e.cause !== '' && Number.isInteger(e.crew) && e.crew >= 0
  && (EXTRA[e.type] || []).every((f) => (f === 'channel' ? typeof e[f] === 'string' && e[f] !== '' : Number.isFinite(e[f]))));
const booksOk = (b) => Math.abs(b.generated - b.radiated - b.stored) <= 1e-9 * Math.max(Math.abs(b.generated), Math.abs(b.radiated), Math.abs(b.stored));
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const common = (rows) => [
  { name: 'heat books: generated = radiated + stored, 1e-9 relative, every case', ok: rows.every((r) => booksOk(r.actual.books)) },
  { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) },
];
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

// T_ss = (P / (n eps sigma A))^(1/4), from data.js constants only (independent of the kernel).
const steadyT = (ctx, c) => (c.P / (c.n * ctx.fixed.radiatorEmissivity.value * ctx.fixed.stefanBoltzmann.value * ctx.params.radiator.area.value)) ** 0.25;
const DURATION = { a: 600, b: 3600 };

export default {
  id: 'L1.radiator.steady.v2',
  level: 'L1',
  laws: ['radiators follow Stefan-Boltzmann', 'IR brightness is the radiated power', 'energy conservation'],
  dependsOn: [],
  setup: 'an idle M beam bay at T1 (plant class, hull room, switched off: no own heat), heated by a source P in {0.1, 0.5, 1, 2 MW} with n in {1, 2, 4} radiators; only the cases whose T_ss lies below thermal.plantCritical; (a) started at T_ss, run 600 s; (b) started at rest, run 3600 s (#185 (1))',
  measure: '(a) the temperature after every step, the radiated power in the last step and the IR brightness at the end; (b) the temperature after every step',
  tolerance: '(a) relative 1e-6; (b) strict, every step',
  criterion: 'T_ss = (P / (n eps sigma A))^(1/4); (a) |T - T_ss| / T_ss <= 1e-6 at every step, radiated power at the end and IR brightness each equal P within 1e-6 relative; (b) T rises every step, never exceeds T_ss, and T_ss - T shrinks every step (#102, #143, #185)',
  tunable: ['radiator.area', 'thermal.heatCapacityPerCell', 'thermal.plantCritical'],
  locked: null,
  cases(ctx) {
    const critical = ctx.params.thermal.plantCritical.value;
    const out = [];
    for (const mode of ['a', 'b']) for (const P of [1e5, 5e5, 1e6, 2e6]) for (const n of [1, 2, 4]) if (steadyT(ctx, { P, n }) < critical) out.push({ mode, P, n });
    return out;
  },
  expected(ctx, c) {
    const T = steadyT(ctx, c);
    return c.mode === 'a' ? { T, P: c.P } : { T, rises: true, neverAbove: true, gapShrinks: true };
  },
  run(ctx, c) {
    const Tss = steadyT(ctx, c);
    const world = createWorld({ params: ctx.params, dt: ctx.dt });
    const room = addRoom(world, 'beamBay', c.mode === 'a' ? { temperature: Tss } : {});
    setActive(world, room, false);
    setRadiators(room, c.n);
    room.externalPower = c.P;
    // Watch the temperature after every step (the callback sees the state the previous step left).
    let prev = roomTemperature(room), first = true;
    let maxDeviation = 0, rises = true, neverAbove = true, gapShrinks = true, minRise = Infinity;
    const watch = () => {
      const T = roomTemperature(room);
      if (!first) {
        maxDeviation = Math.max(maxDeviation, Math.abs(T - Tss) / Tss);
        if (!(T > prev)) rises = false;
        if (!(T <= Tss)) neverAbove = false;
        if (!(Tss - T < Tss - prev)) gapShrinks = false;
        minRise = Math.min(minRise, T - prev);
      }
      first = false;
      prev = T;
    };
    runUntil(world, DURATION[c.mode], watch);
    watch();
    const T = roomTemperature(room), books = heatBooks(room.heat), ok = eventsOk(world.log.events);
    if (c.mode === 'a') return { T, maxDeviation, radiatedPower: room.heat.lastRadiatedPower, ir: irBrightness(world, room), steps: world.step, books, eventsOk: ok };
    return { T, gap: (Tss - T) / Tss, minRise, rises, neverAbove, gapShrinks, steps: world.step, books, eventsOk: ok };
  },
  compare(e, a, c) {
    const checks = c.mode === 'a'
      ? { 'temperature at every step': Number.isFinite(a.maxDeviation) && a.maxDeviation <= 1e-6, 'radiated power': close(e.P, a.radiatedPower, 1e-6), 'IR brightness': close(e.P, a.ir, 1e-6) }
      : { 'rises every step': a.rises === true, 'never above T_ss': a.neverAbove === true, 'gap shrinks every step': a.gapShrinks === true };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    const dt = ctx.dt;
    return [
      { name: 'at least one case per mode runs', ok: rows.some((r) => r.case.mode === 'a') && rows.some((r) => r.case.mode === 'b') },
      { name: 'every case ran its whole duration', ok: rows.every((r) => r.actual.steps * dt >= DURATION[r.case.mode] - 1e-9) },
      ...common(rows),
    ];
  },
  display(r) {
    const kw = (x) => (x / 1e3).toFixed(4) + ' kW';
    if (r.case.mode === 'a') return {
      expected: `T_ss ${r.expected.T.toFixed(6)} K held to 1e-6; radiated = IR = ${kw(r.expected.P)}`,
      actual: `T ${r.actual.T.toFixed(6)} K, max deviation ${r.actual.maxDeviation.toExponential(2)}; radiated ${kw(r.actual.radiatedPower)}, IR ${kw(r.actual.ir)}`,
    };
    return {
      expected: `rises towards T_ss ${r.expected.T.toFixed(4)} K every step, never above`,
      actual: `T(3600 s) ${r.actual.T.toFixed(4)} K, gap ${r.actual.gap.toExponential(2)}, smallest rise ${r.actual.minRise.toExponential(2)} K; rises ${r.actual.rises ? 'yes' : 'NO'}, never above ${r.actual.neverAbove ? 'yes' : 'NO'}, gap shrinks ${r.actual.gapShrinks ? 'yes' : 'NO'}`,
    };
  },
};
