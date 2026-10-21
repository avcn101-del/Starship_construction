import { createWorld, addRoom, loadMagazine, loadTurret, readyStore, runUntil } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';

// Checks shared by every L2 scenario (#194), written out in each file so its lock covers them.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-repaired': ['cell'], scram: ['energy'], explosion: ['energy', 'channel'], shot: ['energy', 'channel'] };
const eventsOk = (events) => events.every((e) => Number.isFinite(e.t) && typeof e.type === 'string' && typeof e.room === 'string' && e.room !== ''
  && typeof e.cause === 'string' && e.cause !== '' && Number.isInteger(e.crew) && e.crew >= 0
  && (EXTRA[e.type] || []).every((f) => (f === 'channel' ? typeof e[f] === 'string' && e[f] !== '' : Number.isFinite(e[f]))));
// Heat books in a cluster: generated + conducted = radiated + stored in every room, 1e-9 relative.
const booksOk = (b) => {
  const c = b.conducted || 0;
  return Math.abs(b.generated + c - b.radiated - b.stored) <= 1e-9 * Math.max(Math.abs(b.generated), Math.abs(c), Math.abs(b.radiated), Math.abs(b.stored));
};
// Conduction only moves heat between rooms: the flows sum to 0 over the cluster (1e-9 of the heat moved).
const flowsOk = (books) => {
  const sum = books.reduce((x, b) => x + (b.conducted || 0), 0), moved = books.reduce((x, b) => x + Math.abs(b.conducted || 0), 0);
  return Math.abs(sum) <= 1e-9 * moved;
};
// One-sided time: expected <= actual < expected + dt, each bound with a 1e-9 relative float slack.
const oneSided = (e, a, dt) => Number.isFinite(a) && a >= e - 1e-9 * Math.abs(e) && a < e + dt + 1e-9 * Math.abs(e);
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const common = (rows) => [
  { name: 'heat books: generated + conducted = radiated + stored, 1e-9 relative, every room, every case', ok: rows.every((r) => r.actual.books.every(booksOk)) },
  { name: 'conduction flows sum to 0 over the cluster, every case', ok: rows.every((r) => flowsOk(r.actual.books)) },
  { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) },
];
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

const DURATION = 600; // s
const TIMES = [7.3, 61.7, 149.9, 251.3, 377.7, 599.3]; // measurement times, checked off the shot and refill grid below
// The feed of 13d.1 from data.js only: a magazine full of AP rounds of the turret's size feeds it across a
// live wall of `pairs` cell pairs at F = ammo.wallFeed x L kg/s; the turret starts with a full ready store of
// R = turret.readyRounds rounds and fires at turret.fireRate / sizeLinear (size rule).
function feedOf(ctx, c) {
  const p = ctx.params, s = ctx.fixed.sizeLinear.value[c.size];
  const m = p.kinetic.roundMass.value * s ** 3, rate = p.turret.fireRate.value / s, R = p.turret.readyRounds.value;
  const F = c.pairs === 0 ? 0 : p.ammo.wallFeed.value * c.pairs * ctx.baseEdge, Nmag = Math.floor(p.magazine.capacity.value / m);
  return { m, rate, R, F, Nmag, feedLimited: F / m < rate };
}
/**
 * Shot times in closed form. Fire-limited (F / m >= rate): the store refills before every shot, so shot k
 * comes at (k - 1) / rate while rounds last (R + Nmag of them). Feed-limited: the feed never stops after the
 * first shot, the n-th fed round arrives at a_n = n m / F, and shot k comes at s_k = max(a_k, s_(k-1) + 1 / rate)
 * (a_k = 0 for the R rounds in the store). Not touching: the R rounds of the store only.
 */
function shotTimes(x) {
  const total = x.F === 0 ? x.R : x.R + x.Nmag, s = [];
  for (let k = 1; k <= total; k++) {
    if (x.F === 0 || !x.feedLimited) s.push((k - 1) / x.rate);
    else s.push(Math.max(k <= x.R ? 0 : ((k - x.R) * x.m) / x.F, k === 1 ? 0 : s[k - 2] + 1 / x.rate));
  }
  return s;
}
const count = (s, t) => s.filter((x) => x <= t).length;

export default {
  id: 'L2.ammo.feed',
  level: 'L2',
  laws: ['ammunition feeds through shared walls by wall length', 'a magazine feeds only the rooms it touches', 'a turret fires from its ready store'],
  dependsOn: ['L1.turret.fire', 'L1.magazine.cookoff'],
  setup: 'in a cluster at T1, an M magazine full of AP rounds of the turret\'s size beside an M or L turret over a wall of 1 or 2 cell pairs (5 or 10 m); the turret starts with a full ready store and fires freely, powered, for 600 s; and an M turret that does not touch the magazine; measured at t in {7.3, 61.7, 149.9, 251.3, 377.7, 599.3 s}',
  measure: 'shots fired by each measurement time; the shot times; rounds fed across the wall; rounds left in the magazine and in the store at the end',
  tolerance: 'counts exact; the sustained shot interval within one step',
  criterion: 'shots by t = the closed-form count of the shot times (ready store first, then rounds fed: fire-limited 1 + floor(rate t) while rounds last, feed-limited s_k = max(n m / F, s_(k-1) + 1 / rate)); sustained rate = min(fire rate, ammo.wallFeed L / round mass): the mean interval of the fed shots is 1 / that rate within one step; the L turret on a 5 m wall is feed-limited and the other three are not; the magazine falls by exactly the rounds fed (mass = fed x round mass) and rounds are conserved (store at start + fed = shots + store at the end); a turret not touching the magazine fires only its ready store (#18, #193, #194)',
  tunable: ['ammo.wallFeed', 'turret.readyRounds', 'turret.fireRate', 'kinetic.roundMass', 'magazine.capacity'],
  locked: { date: '2026-10-21', hash: '5d541b7d' },
  cases() {
    const out = [];
    for (const size of ['M', 'L']) for (const pairs of [1, 2]) out.push({ size, pairs });
    out.push({ size: 'M', pairs: 0, apart: true });
    return out;
  },
  expected(ctx, c) {
    const x = feedOf(ctx, c), s = shotTimes(x);
    return {
      counts: TIMES.map((t) => count(s, t)), feedLimited: x.feedLimited, interval: x.F === 0 ? null : 1 / Math.min(x.rate, x.F / x.m),
      R: x.R, Nmag: x.Nmag, m: x.m, shotTimes: s, dt: ctx.dt,
    };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const mag = addRoom(world, 'magazine', { id: 'magazine', cell: [0, 0] });
    const turret = addRoom(world, 'turret', { id: 'turret', size: c.size, cell: c.apart ? [5, 0] : [2, c.pairs === 2 ? 0 : 1] });
    loadMagazine(world, mag, { size: c.size, apMass: ctx.params.magazine.capacity.value });
    const start = mag.magazine.ap;
    loadTurret(turret, readyStore(world, turret));
    const store0 = turret.turret.ammo;
    const counts = TIMES.map((t) => { runUntil(world, t); return turret.turret.shots; });
    runUntil(world, DURATION);
    const shots = world.log.events.filter((e) => e.type === 'shot' && e.room === 'turret').map((e) => e.t);
    return {
      counts, shots: turret.turret.shots, shotTimes: shots, fed: turret.turret.fed || 0, store0, storeEnd: turret.turret.ammo,
      magazineStart: start, magazineEnd: mag.magazine.ap + mag.magazine.he,
      books: [heatBooks(mag.heat), heatBooks(turret.heat)], eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a, c) {
    // The sustained interval: the mean gap between fed shots (after the store's own rounds and five more).
    const fed = a.shotTimes.slice(e.R + 5);
    const mean = fed.length >= 2 ? (fed[fed.length - 1] - fed[0]) / (fed.length - 1) : null;
    const checks = {
      'shots by each time': a.counts.length === e.counts.length && a.counts.every((n, i) => n === e.counts[i]),
      'rounds conserved': a.store0 === e.R && a.store0 + a.fed === a.shots + a.storeEnd,
      'magazine falls by the rounds fed': a.magazineStart === e.Nmag && a.magazineStart - a.magazineEnd === a.fed,
      ...(c.apart
        ? { 'fires only its ready store': a.fed === 0 && a.shots === e.R }
        : { 'sustained interval': mean !== null && Math.abs(mean - e.interval) <= e.dt }),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    const limited = (size, pairs) => rows.find((r) => r.case.size === size && r.case.pairs === pairs).expected.feedLimited;
    return [
      { name: 'the L turret on a 5 m wall is feed-limited; M on 5 and 10 m and L on 10 m are not', ok: limited('L', 1) === true && limited('M', 1) === false && limited('M', 2) === false && limited('L', 2) === false },
      { name: 'every measurement time lies more than 2 steps from every closed-form shot time', ok: rows.every((r) => TIMES.every((t) => r.expected.shotTimes.every((s) => Math.abs(s - t) > 2 * ctx.dt))) },
      ...common(rows),
    ];
  },
  display(r) {
    const e = r.expected, a = r.actual;
    return {
      expected: `shots by [${TIMES.join(', ')}] s: [${e.counts.join(', ')}]; ${e.feedLimited ? 'feed-limited' : 'fire-limited'}${e.interval ? `, interval ${e.interval.toFixed(4)} s` : ''}; magazine ${e.Nmag} rounds, store ${e.R}`,
      actual: `shots [${a.counts.join(', ')}], ${a.shots} by 600 s; fed ${a.fed}; magazine ${a.magazineStart} -> ${a.magazineEnd}; store ${a.store0} -> ${a.storeEnd}`,
    };
  },
};
