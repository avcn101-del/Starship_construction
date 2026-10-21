import { createWorld, addRoom, setDemand, destroyCell, destroyedCells, step, runUntil, roomTemperature } from '../../../js/rooms.js';
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
  id: 'L1.repair.breach',
  level: 'L1',
  laws: ['the destroyed count is the cells destroyed now (a repaired cell no longer counts)', 'a heavily damaged reactor breaches', 'crew die per destroyed cell and do not come back', 'an exploded room never explodes or melts down again'],
  dependsOn: ['L1.room.thresholds', 'L1.radiator.cooling', 'L1.quarters.repair', 'L1.reactor.breach'],
  setup: 'crew quarters (all 6 cells) at [0, 0] and an idle M reactor (demand 0) at r = 0.25 x repair.radius, T1; hit-1 destroys reactor cell A at 1 s; when the cell-repaired event of A comes, hit-2 destroys cell B 1 s later and hit-3 cell C 1 s after that; after the explosion an external 1.1 MW heats the destroyed reactor for 2000 s (#189)',
  measure: 'time of A\'s repair and the destroyed count after it; breach events after hit-2 and hit-3; time, energy and cause of the explosion; explosions and meltdowns in the whole run; reactor crew deaths at each hit and in total; the reactor temperature at the end',
  tolerance: 'counts exact; repair and explosion times one-sided (expected <= actual < expected + dt); energy and end temperature relative 1e-9',
  criterion: 'A is repaired at 1 + 1 / (repair.rate x g(r)), g(r) = 1 / (1 + (r / radius)^2), one-sided, and the destroyed count after it is 0; no breach after hit-2 (1 of 4 destroyed: 1/4 < reactor.breachFraction); breach at hit-3 (2 of 4 >= reactor.breachFraction), cause hit-3; one explosion at breach + reactor.breachCountdown, one-sided, with reactor.explosionEnergy, cause hit-3; exactly one explosion and no meltdown in the whole run, although the heated wreck passes its critical temperature (T_end = T_rest + 1.1 MW x 2000 s / C); crew deaths at each hit = floor(k crew / N) - floor((k - 1) crew / N) with k = cells destroyed now (1, 1, 2: one each for crew 4 in 4 cells); cumulative reactor deaths <= crewRequired.reactor (#189 (1), (4), #185 (5))',
  tunable: ['repair.rate', 'repair.radius', 'reactor.breachFraction', 'reactor.breachCountdown', 'reactor.explosionEnergy', 'crewRequired.reactor', 'thermal.heatCapacityPerCell'],
  locked: null,
  cases() {
    return [{ x: 0.25, P: 1.1e6, heatFor: 2000 }];
  },
  expected(ctx, c) {
    const p = ctx.params, r = p.reactor, [w, h] = ROOMS.reactor.footprint.M, N = w * h;
    const crew = p.crewRequired.reactor.value, C = N * p.thermal.heatCapacityPerCell.value;
    const rate = p.repair.rate.value / (1 + c.x ** ctx.fixed.repairFalloffExponent.value);
    const deaths = (k) => Math.floor((k * crew) / N) - Math.floor(((k - 1) * crew) / N);
    return {
      repairedAt: 1 + 1 / rate, destroyedAfterRepair: 0,
      breachAtHit2: 1 / N >= r.breachFraction.value, breachAtHit3: 2 / N >= r.breachFraction.value,
      countdown: r.breachCountdown.value, energy: r.explosionEnergy.value, cause: 'hit-3',
      deathsAtHits: [deaths(1), deaths(1), deaths(2)], crew,
      critical: p.thermal.plantCritical.value, endTemperature: ctx.fixed.restTemperature.value + (c.P * c.heatFor) / C, dt: ctx.dt,
    };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt });
    const q = addRoom(world, 'quarters', { id: 'quarters', position: [0, 0] });
    const room = addRoom(world, 'reactor', { id: 'reactor', position: [c.x * ctx.params.repair.radius.value, 0] });
    setDemand(world, room, 0);
    const breaches = () => world.log.events.filter((e) => e.type === 'breach').length;
    runUntil(world, 1);
    destroyCell(world, room, 0, 'hit-1');
    const hits = [world.t];
    let repaired = null;
    while (!repaired && world.t < 1000) {
      step(world);
      repaired = world.log.events.find((e) => e.type === 'cell-repaired' && e.room === 'reactor' && e.cell === 0) || null;
    }
    const destroyedAfterRepair = destroyedCells(room);
    runUntil(world, repaired.t + 1);
    destroyCell(world, room, 1, 'hit-2');
    hits.push(world.t);
    const breachesAfterHit2 = breaches();
    runUntil(world, repaired.t + 2);
    destroyCell(world, room, 2, 'hit-3');
    hits.push(world.t);
    const breachesAfterHit3 = breaches();
    while (!room.exploded && world.t < repaired.t + 100) step(world);
    room.externalPower = c.P;
    runUntil(world, world.t + c.heatFor);
    const ev = world.log.events.filter((e) => e.room === 'reactor');
    const breach = ev.find((e) => e.type === 'breach') || null;
    const deaths = ev.filter((e) => e.type === 'crew-died');
    return {
      repairedAt: repaired.t, destroyedAfterRepair, hits, breachesAfterHit2, breachesAfterHit3,
      breach: breach ? { t: breach.t, cause: breach.cause } : null,
      explosions: ev.filter((e) => e.type === 'explosion').map((e) => ({ t: e.t, energy: e.energy, cause: e.cause })),
      meltdowns: ev.filter((e) => e.type === 'meltdown').length, critical: ev.filter((e) => e.type === 'critical').length,
      deathsAtHits: hits.map((t, i) => deaths.filter((e) => e.t === t && e.cause === `hit-${i + 1}`).reduce((n, e) => n + e.deaths, 0)),
      totalDeaths: deaths.reduce((n, e) => n + e.deaths, 0), endTemperature: roomTemperature(room),
      books: [heatBooks(q.heat), heatBooks(room.heat)], eventsOk: eventsOk(world.log.events),
    };
  },
  compare(e, a) {
    const x = a.explosions[0];
    const checks = {
      'repair time': oneSided(e.repairedAt, a.repairedAt, e.dt), 'destroyed count after repair': a.destroyedAfterRepair === e.destroyedAfterRepair,
      'no breach after hit-2': e.breachAtHit2 === false && a.breachesAfterHit2 === 0,
      'breach at hit-3': e.breachAtHit3 === true && a.breachesAfterHit3 === 1 && a.breach !== null && a.breach.t === a.hits[2] && a.breach.cause === e.cause,
      'one explosion': a.explosions.length === 1, 'no meltdown': a.meltdowns === 0,
      'explosion time': !!x && a.breach !== null && oneSided(a.breach.t + e.countdown, x.t, e.dt),
      'explosion energy': !!x && close(e.energy, x.energy, 1e-9), 'explosion cause': !!x && x.cause === e.cause,
      'wreck passes critical': a.critical === 1 && close(e.endTemperature, a.endTemperature, 1e-9) && a.endTemperature > e.critical,
      'deaths per hit': a.deathsAtHits.length === 3 && a.deathsAtHits.every((d, i) => d === e.deathsAtHits[i]),
      'deaths within crew': a.totalDeaths <= e.crew,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return [
      { name: 'heat books: generated = radiated + stored, 1e-9 relative, both rooms, every case', ok: rows.every((r) => r.actual.books.every(booksOk)) },
      { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) },
    ];
  },
  display(r) {
    const e = r.expected, a = r.actual, x = a.explosions[0];
    return {
      expected: `A repaired ${e.repairedAt.toFixed(4)} s, destroyed then ${e.destroyedAfterRepair}; breach after hit-2 ${e.breachAtHit2 ? 'yes' : 'no'}, after hit-3 ${e.breachAtHit3 ? 'yes' : 'no'}; 1 explosion at breach + ${e.countdown} s, ${(e.energy / 1e6).toFixed(1)} MJ by ${e.cause}; no meltdown; T_end ${e.endTemperature.toFixed(3)} K > ${e.critical} K; deaths at hits [${e.deathsAtHits.join(', ')}], total <= ${e.crew}`,
      actual: `A repaired ${a.repairedAt.toFixed(4)} s, destroyed then ${a.destroyedAfterRepair}; breaches after hit-2 ${a.breachesAfterHit2}, after hit-3 ${a.breachesAfterHit3}; ${a.explosions.length} explosion(s)${x ? ` at ${x.t.toFixed(4)} s (breach ${a.breach ? a.breach.t.toFixed(4) : '-'} s), ${(x.energy / 1e6).toFixed(1)} MJ by ${x.cause}` : ''}; meltdowns ${a.meltdowns}; T_end ${a.endTemperature.toFixed(3)} K (critical events ${a.critical}); deaths at hits [${a.deathsAtHits.join(', ')}], total ${a.totalDeaths}`,
    };
  },
};
