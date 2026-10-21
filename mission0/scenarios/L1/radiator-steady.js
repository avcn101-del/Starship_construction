import { createWorld, addRoom, setRadiators, runUntil, roomTemperature, irBrightness } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';

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
  id: 'L1.radiator.steady',
  level: 'L1',
  laws: ['radiators follow Stefan-Boltzmann', 'IR brightness is the radiated power', 'energy conservation'],
  dependsOn: [],
  setup: 'the same idle M turret at T1, starting at rest, heated by a source P in {0.1, 0.5, 1, 2 MW} with n in {1, 2, 4} radiators, run 3600 s; only the cases whose T_ss lies below the room\'s critical temperature (the turret is a crewed room: thermal.crewedCritical)',
  measure: 'temperature at 3600 s; radiated power in the last step; IR brightness at the end',
  tolerance: 'relative 1e-3',
  criterion: 'T_ss = (P / (n eps sigma A))^(1/4); |T(3600 s) - T_ss| / T_ss <= 1e-3; radiated power at the end and IR brightness each equal P within 1e-3 relative (#102, #143, #181)',
  tunable: ['radiator.area', 'thermal.heatCapacityPerCell', 'thermal.crewedCritical'],
  locked: null,
  cases(ctx) {
    const k1 = ctx.fixed.radiatorEmissivity.value * ctx.fixed.stefanBoltzmann.value * ctx.params.radiator.area.value;
    const critical = ctx.params.thermal.crewedCritical.value;
    const out = [];
    for (const P of [1e5, 5e5, 1e6, 2e6]) for (const n of [1, 2, 4]) if ((P / (n * k1)) ** 0.25 < critical) out.push({ P, n });
    return out;
  },
  expected(ctx, c) {
    const k = c.n * ctx.fixed.radiatorEmissivity.value * ctx.fixed.stefanBoltzmann.value * ctx.params.radiator.area.value;
    return { T: (c.P / k) ** 0.25, P: c.P };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt });
    const room = addRoom(world, 'turret');
    setRadiators(room, c.n);
    room.externalPower = c.P;
    runUntil(world, 3600);
    return { T: roomTemperature(room), radiatedPower: room.heat.lastRadiatedPower, ir: irBrightness(world, room), books: heatBooks(room.heat), eventsOk: eventsOk(world.log.events) };
  },
  compare(e, a) {
    const checks = { temperature: close(e.T, a.T, 1e-3), 'radiated power': close(e.P, a.radiatedPower, 1e-3), 'IR brightness': close(e.P, a.ir, 1e-3) };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return [{ name: 'at least one case runs', ok: rows.length > 0 }, ...common(rows)];
  },
  display(r) {
    const kw = (x) => (x / 1e3).toFixed(2) + ' kW';
    return {
      expected: `T_ss ${r.expected.T.toFixed(3)} K; radiated = IR = ${kw(r.expected.P)}`,
      actual: `T ${r.actual.T.toFixed(3)} K; radiated ${kw(r.actual.radiatedPower)}, IR ${kw(r.actual.ir)}`,
    };
  },
};
