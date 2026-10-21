import { createWorld, addRoom, loadTurret, setPower, runUntil } from '../../../js/rooms.js';
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

const TIMES = [1, 9.5, 99.5, 399.5]; // s, never on a shot time at any tier

export default {
  id: 'L1.turret.fire',
  level: 'L1',
  laws: ['fire rate', 'recoil (Newton 3)', 'ammunition runs dry', 'power to fire'],
  dependsOn: ['L1.room.thresholds', 'L1.radiator.cooling', 'L0.kinetic.penetration'],
  setup: 'an M turret alone holding n in {5, 150} M rounds, firing freely from t = 0, measured at t in {1, 9.5, 99.5, 399.5 s}; powered at T1-T6 (turret.fireRate k = -1), unpowered at T1',
  measure: 'shots fired by t; recoil impulse; heat generated; energy drawn; the cease-fire event',
  tolerance: 'shots exact; impulse, heat and energy relative 1e-9',
  criterion: 'shots = min(n, 1 + floor(rate x t)); recoil impulse = shots x m v (m = kinetic.roundMass, v = kinetic.muzzleVelocity, scaled), exact; heat = shots x turret.heatPerShot; energy drawn = turret.powerDraw x the time the turret is able to fire (from 0 until t or until its last round is fired at (n - 1) / rate); dry: cease-fire event with cause \'dry\' at the last shot; unpowered: no shot, no draw, cease-fire with cause \'no-power\' at 0 (#183, #181)',
  tunable: ['turret.fireRate', 'turret.powerDraw', 'turret.heatPerShot', 'kinetic.roundMass', 'kinetic.muzzleVelocity'],
  locked: { date: '2026-10-21', hash: '6687eaa4' },
  cases() {
    const out = [];
    for (const tier of ['T1', 'T2', 'T3', 'T4', 'T5', 'T6']) for (const n of [5, 150]) for (const t of TIMES) out.push({ tier, n, t, powered: true });
    for (const n of [5, 150]) for (const t of TIMES) out.push({ tier: 'T1', n, t, powered: false });
    return out;
  },
  expected(ctx, c) {
    const s = ctx.tiers[c.tier].edge / ctx.baseEdge, v = (p) => p.value * s ** p.k, p = ctx.params;
    const rate = v(p.turret.fireRate), m = v(p.kinetic.roundMass), u = v(p.kinetic.muzzleVelocity);
    if (!c.powered) return { shots: 0, impulse: 0, heat: 0, energy: 0, cease: { t: 0, cause: 'no-power' } };
    const shots = Math.min(c.n, 1 + Math.floor(rate * c.t)), dryAt = (c.n - 1) / rate;
    return {
      shots, impulse: shots * m * u, heat: shots * v(p.turret.heatPerShot), energy: v(p.turret.powerDraw) * Math.min(c.t, dryAt),
      cease: dryAt <= c.t ? { t: dryAt, cause: 'dry' } : null,
    };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, edge: ctx.tiers[c.tier].edge, dt: ctx.dt });
    const room = addRoom(world, 'turret');
    loadTurret(room, c.n);
    setPower(world, room, c.powered);
    runUntil(world, c.t);
    const cease = world.log.events.filter((e) => e.type === 'cease-fire').map((e) => ({ t: e.t, cause: e.cause }));
    const books = heatBooks(room.heat);
    return { shots: room.turret.shots, impulse: room.turret.impulse, heat: books.generated, energy: room.turret.energyDrawn, cease, books, eventsOk: eventsOk(world.log.events) };
  },
  compare(e, a) {
    const checks = {
      shots: a.shots === e.shots, impulse: close(e.impulse, a.impulse, 1e-9), heat: close(e.heat, a.heat, 1e-9), energy: close(e.energy, a.energy, 1e-9),
      'cease-fire': e.cease === null ? a.cease.length === 0 : a.cease.length === 1 && a.cease[0].cause === e.cease.cause && close(e.cease.t, a.cease[0].t, 1e-9),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const f = (x) => `${x.shots} shots, ${x.impulse.toFixed(1)} N s, heat ${(x.heat / 1e6).toFixed(3)} MJ, drawn ${(x.energy / 1e6).toFixed(4)} MJ`;
    const cf = (x) => (x ? `${x.cause} at ${x.t.toFixed(3)} s` : 'none');
    return { expected: `${f(r.expected)}; cease ${cf(r.expected.cease)}`, actual: `${f(r.actual)}; cease ${r.actual.cease.map(cf).join(', ') || 'none'}` };
  },
};
