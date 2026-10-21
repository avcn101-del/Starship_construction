import { createWorld, addRoom, setDemand, destroyCell, runUntil } from '../../../js/rooms.js';
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
  id: 'L1.reactor.breach',
  level: 'L1',
  laws: ['a heavily damaged reactor breaches', 'breach countdown', 'big explosions come from damage'],
  dependsOn: ['L1.room.thresholds', 'L1.radiator.cooling'],
  setup: 'an M (4 cells) and an L (9 cells) reactor at T1 running at full; one cell destroyed per second by hits hit-1, hit-2, ... at t = 1, 2, ... s; "breach": hits stop at the breach event, then 15 s more; "entire": every cell destroyed, then 2 s more',
  measure: 'the hit (count and time) that starts the countdown; time, energy and cause of the explosion; the number of explosions',
  tolerance: 'counts exact; hit times relative 1e-9; countdown explosion one-sided (expected <= actual < expected + dt); energy relative 1e-9',
  criterion: 'the countdown starts at the hit that makes destroyed / total >= reactor.breachFraction, the k-th with k = ceil(f N) (this is the threshold test: 2 of 4, 5 of 9); "breach": one explosion at t_k + reactor.breachCountdown, one-sided, with reactor.explosionEnergy, cause hit-k; "entire": a reactor destroyed entirely explodes at once, at the hit that destroys its last cell (t = N s, before the countdown ends), with reactor.explosionEnergy, cause hit-N; one explosion only (#81, #181, #183)',
  tunable: ['reactor.breachFraction', 'reactor.breachCountdown', 'reactor.explosionEnergy'],
  locked: { date: '2026-10-21', hash: '3c6f9aa0' },
  cases() {
    const out = [];
    for (const size of ['M', 'L']) for (const mode of ['breach', 'entire']) out.push({ size, mode });
    return out;
  },
  expected(ctx, c) {
    const r = ctx.params.reactor, [w, h] = ROOMS.reactor.footprint[c.size], N = w * h;
    const k = Math.ceil(r.breachFraction.value * N);
    const atCountdown = k + r.breachCountdown.value;
    const entireFirst = N < atCountdown;
    return {
      N, k, breachAt: k,
      explosionAt: c.mode === 'breach' || !entireFirst ? atCountdown : N,
      oneSided: c.mode === 'breach' || !entireFirst,
      cause: c.mode === 'breach' || !entireFirst ? `hit-${k}` : `hit-${N}`,
      energy: r.explosionEnergy.value, dt: ctx.dt,
    };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt });
    const room = addRoom(world, 'reactor', { size: c.size });
    setDemand(world, room, 1);
    const N = room.cells.length;
    let breach = null, j = 0;
    while (j < N && (c.mode === 'entire' || !breach)) {
      j++;
      runUntil(world, j);
      destroyCell(world, room, j - 1, `hit-${j}`);
      const b = world.log.events.find((e) => e.type === 'breach');
      if (b && !breach) breach = { hits: j, t: b.t, cause: b.cause };
    }
    runUntil(world, world.t + (c.mode === 'breach' ? 15 : 2));
    const explosions = world.log.events.filter((e) => e.type === 'explosion');
    return { hits: j, breach, explosions: explosions.map((e) => ({ t: e.t, energy: e.energy, cause: e.cause })), books: heatBooks(room.heat), eventsOk: eventsOk(world.log.events) };
  },
  compare(e, a) {
    const x = a.explosions[0];
    const checks = {
      'breach at hit k': a.breach !== null && a.breach.hits === e.k && close(e.breachAt, a.breach.t, 1e-9) && a.breach.cause === `hit-${e.k}`,
      'one explosion': a.explosions.length === 1,
      'explosion time': !!x && (e.oneSided ? oneSided(e.explosionAt, x.t, e.dt) : close(e.explosionAt, x.t, 1e-9)),
      'explosion energy': !!x && close(e.energy, x.energy, 1e-9),
      'explosion cause': !!x && x.cause === e.cause,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return common(rows);
  },
  display(r) {
    const e = r.expected, a = r.actual;
    return {
      expected: `breach at hit ${e.k} of ${e.N} (t ${e.breachAt} s); explosion at ${e.explosionAt} s${e.oneSided ? ' (one-sided)' : ''}, ${(e.energy / 1e6).toFixed(1)} MJ, ${e.cause}`,
      actual: `breach ${a.breach ? `at hit ${a.breach.hits} (t ${a.breach.t.toFixed(4)} s)` : 'none'}; ${a.explosions.map((x) => `explosion at ${x.t.toFixed(4)} s, ${(x.energy / 1e6).toFixed(1)} MJ, ${x.cause}`).join('; ') || 'no explosion'}`,
    };
  },
};
