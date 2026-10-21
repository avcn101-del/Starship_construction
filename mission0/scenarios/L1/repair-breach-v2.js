import { createWorld, addRoom, setDemand, damageCell, destroyCell, destroyedCells, step, runUntil, roomTemperature } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';

// Checks shared by every L1 scenario (#181), written out in each file so its lock covers them;
// 'cell-damaged' (#206) carries channel, cell and integrity.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-damaged': ['channel', 'cell', 'integrity'], 'cell-repaired': ['cell'], scram: ['energy'], explosion: ['energy', 'channel'], shot: ['energy', 'channel'] };
const eventsOk = (events) => events.every((e) => Number.isFinite(e.t) && typeof e.type === 'string' && typeof e.room === 'string' && e.room !== ''
  && typeof e.cause === 'string' && e.cause !== '' && Number.isInteger(e.crew) && e.crew >= 0
  && (EXTRA[e.type] || []).every((f) => (f === 'channel' ? typeof e[f] === 'string' && e[f] !== '' : Number.isFinite(e[f]))));
const booksOk = (b) => Math.abs(b.generated - b.radiated - b.stored) <= 1e-9 * Math.max(Math.abs(b.generated), Math.abs(b.radiated), Math.abs(b.stored));
// One-sided time: expected <= actual < expected + dt, each bound with a 1e-9 relative float slack.
const oneSided = (e, a, dt) => Number.isFinite(a) && a >= e - 1e-9 * Math.abs(e) && a < e + dt + 1e-9 * Math.abs(e);
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

const LOSS = 0.7123; // integrity hit-1 takes from reactor cell A (13e.3 D3)
const D_AT = 0.5; // s: cell D of the hold beside the quarters is destroyed
const A_AT = 1; // s: hit-1 damages reactor cell A
// Crew deaths by integrity lost (#206): cumulative floor(crew x lost / cells); a whole number within 1e-9 counts as that number.
const floorish = (x) => (Math.abs(x - Math.round(x)) <= 1e-9 * Math.max(1, x) ? Math.round(x) : Math.floor(x));

export default {
  id: 'L1.repair.breach.v2',
  level: 'L1',
  laws: ['repair restores damaged cells only; a destroyed cell waits for the drydock', 'a heavily damaged reactor breaches', 'crew die in proportion to the integrity lost and do not come back', 'an exploded room never explodes or melts down again'],
  dependsOn: ['L1.room.thresholds', 'L1.radiator.cooling', 'L1.quarters.repair.v2', 'L1.reactor.breach'],
  setup: 'rooms alone at T1: crew quarters (all 6 cells) at [0, 0]; an idle M reactor (demand 0) at r = 0.25 x repair.radius; an empty M hold beside the quarters at [-5, 0] whose cell D (0) is destroyed at 0.5 s; hit-1 damages reactor cell A by 0.7123 at 1 s; when A\'s cell-repaired event comes, hit-2 destroys cell B 1 s later and hit-3 cell C 1 s after that; after the explosion an external 1.1 MW heats the wreck for 2000 s (13e.3 D3, as L1.repair.breach)',
  measure: 'time of A\'s repair and the destroyed count after it; breach events after hit-2 and hit-3; time, energy and cause of the explosion; explosions and meltdowns in the whole run; reactor crew deaths at each hit and in total; cell D\'s integrity at the end and any cell-repaired event for it; the reactor temperature at the end',
  tolerance: 'counts exact; repair and explosion times one-sided (expected <= actual < expected + dt); energy and end temperature relative 1e-9',
  criterion: 'A is repaired at 1 + 0.7123 / (repair.rate x g(r)), g(r) = 1 / (1 + (r / radius)^2), one-sided, and the destroyed count after it is 0; no breach after hit-2 (1 of 4 destroyed < reactor.breachFraction); breach at hit-3 (2 of 4 >= reactor.breachFraction), cause hit-3; one explosion at breach + reactor.breachCountdown, one-sided, with reactor.explosionEnergy, cause hit-3; exactly one explosion and no meltdown in the whole run, although the heated wreck passes its critical temperature (T_end = T_rest + 1.1 MW x 2000 s / C); reactor crew deaths at each hit = the rise of floor(crew x (cells - sum of integrity) / cells) (hit-1: floor(0.7123) = 0; hit-2: 1; hit-3: 1 for crew 4 in 4 cells); cumulative reactor deaths <= crewRequired.reactor; D stays at integrity 0 and never raises cell-repaired (#81, #189, #203 D, #206)',
  tunable: ['repair.rate', 'repair.radius', 'reactor.breachFraction', 'reactor.breachCountdown', 'reactor.explosionEnergy', 'crewRequired.reactor', 'thermal.heatCapacityPerCell'],
  locked: { date: '2026-10-21', hash: '36bc0f9d' },
  cases() {
    return [{ x: 0.25, P: 1.1e6, heatFor: 2000 }];
  },
  expected(ctx, c) {
    const p = ctx.params, r = p.reactor, [w, h] = ROOMS.reactor.footprint.M, N = w * h;
    const crew = p.crewRequired.reactor.value, C = N * p.thermal.heatCapacityPerCell.value;
    const rate = p.repair.rate.value / (1 + c.x ** ctx.fixed.repairFalloffExponent.value);
    const dead = (lost) => Math.min(crew, floorish((crew * lost) / N));
    return {
      repairedAt: A_AT + LOSS / rate, destroyedAfterRepair: 0,
      breachAtHit2: 1 / N >= r.breachFraction.value, breachAtHit3: 2 / N >= r.breachFraction.value,
      countdown: r.breachCountdown.value, energy: r.explosionEnergy.value, cause: 'hit-3',
      deathsAtHits: [dead(LOSS), dead(1) - dead(LOSS), dead(2) - dead(1)], crew,
      critical: p.thermal.plantCritical.value, endTemperature: ctx.fixed.restTemperature.value + (c.P * c.heatFor) / C, dt: ctx.dt,
    };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt });
    const q = addRoom(world, 'quarters', { id: 'quarters', position: [0, 0] });
    const room = addRoom(world, 'reactor', { id: 'reactor', position: [c.x * ctx.params.repair.radius.value, 0] });
    const hold = addRoom(world, 'hold', { id: 'hold', position: [-ctx.baseEdge, 0] });
    setDemand(world, room, 0);
    const breaches = () => world.log.events.filter((e) => e.type === 'breach').length;
    runUntil(world, D_AT);
    destroyCell(world, hold, 0, 'hit-D');
    runUntil(world, A_AT);
    damageCell(world, room, 0, LOSS, 'hit-1', 'kinetic');
    const hits = [world.t];
    let repaired = null;
    while (!repaired && world.t < 1000) {
      step(world);
      repaired = world.log.events.find((e) => e.type === 'cell-repaired' && e.room === 'reactor' && e.cell === 0) || null;
    }
    const destroyedAfterRepair = destroyedCells(room), repairedAt = repaired ? repaired.t : null;
    runUntil(world, (repairedAt ?? world.t) + 1);
    destroyCell(world, room, 1, 'hit-2');
    hits.push(world.t);
    const breachesAfterHit2 = breaches();
    runUntil(world, (repairedAt ?? world.t) + 2);
    destroyCell(world, room, 2, 'hit-3');
    hits.push(world.t);
    const breachesAfterHit3 = breaches();
    const until = world.t + 100;
    while (!room.exploded && world.t < until) step(world);
    room.externalPower = c.P;
    runUntil(world, world.t + c.heatFor);
    const ev = world.log.events.filter((e) => e.room === 'reactor');
    const breach = ev.find((e) => e.type === 'breach') || null;
    const deaths = ev.filter((e) => e.type === 'crew-died');
    return {
      repairedAt, destroyedAfterRepair, hits, breachesAfterHit2, breachesAfterHit3,
      breach: breach ? { t: breach.t, cause: breach.cause } : null,
      explosions: ev.filter((e) => e.type === 'explosion').map((e) => ({ t: e.t, energy: e.energy, cause: e.cause })),
      meltdowns: ev.filter((e) => e.type === 'meltdown').length, critical: ev.filter((e) => e.type === 'critical').length,
      deathsAtHits: hits.map((t, i) => deaths.filter((e) => e.t === t && e.cause === `hit-${i + 1}`).reduce((n, e) => n + e.deaths, 0)),
      totalDeaths: deaths.reduce((n, e) => n + e.deaths, 0), endTemperature: roomTemperature(room),
      wreckD: hold.cells[0].integrity, wreckDRepaired: world.log.events.some((e) => e.type === 'cell-repaired' && e.room === 'hold'),
      books: [heatBooks(q.heat), heatBooks(room.heat), heatBooks(hold.heat)], eventsOk: eventsOk(world.log.events),
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
      'D stays destroyed': a.wreckD === 0 && !a.wreckDRepaired,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    return [
      { name: 'heat books: generated = radiated + stored, 1e-9 relative, every room, every case', ok: rows.every((r) => r.actual.books.every(booksOk)) },
      { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) },
    ];
  },
  display(r) {
    const e = r.expected, a = r.actual, x = a.explosions[0];
    return {
      expected: `A repaired ${e.repairedAt.toFixed(4)} s, destroyed then ${e.destroyedAfterRepair}; breach after hit-2 ${e.breachAtHit2 ? 'yes' : 'no'}, after hit-3 ${e.breachAtHit3 ? 'yes' : 'no'}; 1 explosion at breach + ${e.countdown} s, ${(e.energy / 1e6).toFixed(1)} MJ by ${e.cause}; no meltdown; T_end ${e.endTemperature.toFixed(3)} K > ${e.critical} K; deaths at hits [${e.deathsAtHits.join(', ')}], total <= ${e.crew}; D stays 0`,
      actual: `A repaired ${a.repairedAt === null ? 'never' : a.repairedAt.toFixed(4) + ' s'}, destroyed then ${a.destroyedAfterRepair}; breaches after hit-2 ${a.breachesAfterHit2}, after hit-3 ${a.breachesAfterHit3}; ${a.explosions.length} explosion(s)${x ? ` at ${x.t.toFixed(4)} s (breach ${a.breach ? a.breach.t.toFixed(4) : '-'} s), ${(x.energy / 1e6).toFixed(1)} MJ by ${x.cause}` : ''}; meltdowns ${a.meltdowns}; T_end ${a.endTemperature.toFixed(3)} K (critical events ${a.critical}); deaths at hits [${a.deathsAtHits.join(', ')}], total ${a.totalDeaths}; D ${a.wreckD}${a.wreckDRepaired ? ' (repaired!)' : ''}`,
    };
  },
};
