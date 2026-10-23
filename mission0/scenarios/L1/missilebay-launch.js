import { createWorld, addRoom, loadMagazine, enableShip, step, fireRound, pathAlong, bayContents, magazineContents, roundOf } from '../../../js/rooms.js';

// W4 of the L5 plan (DESIGN.md 13n.4, 13n.1 (b) (c), #148): the missile bay holds a ready store of
// missilebay.readyMissiles refilled from a missile magazine on a live wall at ammo.wallFeed's rate by mass, launches one
// per missilebay.launchInterval, and explodes by the missiles inside (warheads and fuel).
//
// Setup (T1, a cluster on a 20 x 10 grid made a ship at rest): a bridge at [0, 0]; an M missile bay (3 x 2) at [2, 0],
// its store full (2 HE missiles, designated); an M magazine at [2, 2] full of missiles (900 kg: 4 of 200 kg), sharing a
// 10 m wall with the bay (cells (2, 1)-(2, 2) and (3, 1)-(3, 2)). (launch) the bay ordered to launch from t = 0, 60 s.
// (explode) an M round (6 kg at 800 m/s) into the bay's cell (2, 0) with the store full (fireRound).
// Hand-worked: launches one per 2 s while the store holds one: at 0 and 2 s; the feed 0.72 kg/(s m) x 10 m = 7.2 kg/s
// from the end of the first step (the store no longer full), one missile per 200 / 7.2 = 27.778 s: it arrives at the
// end of the step holding t = 27.778 s (one-sided [t, t + dt)) and is launched at that step's end (the interval long
// past), the next at 2 x 27.778 = 55.556 s; four launches in 60 s, two missiles left in the magazine. One missile's
// energy: 20 MJ + 1/2 x 200 x (30 x 20)^2 = 20 + 36 = 56 MJ; the store of 2: 112 MJ; the magazine of 4: 224 MJ. The
// round enters the bay's cell at 800 m/s >= magazine.detonationSpeed: the bay explodes with 112 MJ.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const FEED = 200 / 7.2;

function cluster(ctx) {
  const w = createWorld({ params: ctx.params, edge: 5, dt: ctx.dt, grid: [20, 10] });
  addRoom(w, 'bridge', { id: 'bridge', cell: [0, 0] });
  const bay = addRoom(w, 'missileBay', { id: 'bay', cell: [2, 0] });
  const mag = addRoom(w, 'magazine', { id: 'magazine', cell: [2, 2] });
  loadMagazine(w, mag, { type: 'missile', missileMass: 900, seeker: 'designated', warhead: 'he' });
  bay.missileBay.ready = [{ seeker: 'designated', warhead: 'he' }, { seeker: 'designated', warhead: 'he' }];
  enableShip(w, { origin: [0, 0] });
  return { w, bay, mag };
}

export default {
  id: 'L1.missilebay.launch',
  level: 'L1',
  laws: ['the missile bay launches one missile per missilebay.launchInterval from its ready store of missilebay.readyMissiles (#148, 13n.1 (c))', 'the store is refilled from a missile magazine on a live wall at ammo.wallFeed by mass (#148, #193)', 'a missile bay or magazine explodes by its missiles: missile.warheadEnergy + 1/2 m (acceleration x burnTime)^2 each (13n.1 (b) (c))'],
  dependsOn: [],
  setup: 'T1: a bridge, an M missile bay with 2 missiles, an M magazine of 4 missiles on its 10 m wall, a ship at rest; launching from t = 0 for 60 s; an M round into the bay\'s cell (13n.4 W4)',
  measure: 'the launch events\' times; the times the store gained a missile; the missiles left in the magazine; bayContents and magazineContents; the explosion\'s energy',
  tolerance: 'launches at 0 and 2 s exact (on the grid, the interval tested); a refill one-sided [t, t + dt) with the 1e-9 slack; energies 1e-12',
  criterion: '(launch) launches at 0, 2 s, then each refill: at the step holding 27.778 s and 55.556 s (one-sided), four in 60 s, 2 missiles left in the magazine; (explode) the store\'s energy 112 MJ and the magazine\'s 224 MJ (hand-worked, 1e-12); the round detonates the bay with 112 MJ',
  tunable: ['missilebay.readyMissiles', 'missilebay.launchInterval', 'ammo.wallFeed', 'missile.mass', 'missile.warheadEnergy', 'missile.acceleration', 'missile.burnTime'],
  locked: { date: '2026-10-23', hash: '69754c0a' },
  cases() {
    return [{ part: 'launch' }, { part: 'explode' }];
  },
  expected(ctx, c) {
    return c.part === 'launch' ? { launches: [0, 2, FEED, 2 * FEED], left: 2 } : { bay: 112e6, magazine: 224e6 };
  },
  run(ctx, c) {
    const { w, bay, mag } = cluster(ctx);
    if (c.part === 'explode') {
      const E = bayContents(w, bay).energy, Em = magazineContents(w, mag).energy;
      const R = roundOf(w, 'M', 'standard'), res = fireRound(w, { mass: R.m, velocity: R.v, area: R.A, direction: [0, 1] }, pathAlong(w, [[2, 0]]), 'shot-1');
      const ex = w.log.events.find((e) => e.type === 'explosion' && e.room === 'bay');
      return { bay: E, magazine: Em, detonated: !!res.detonated, explosion: ex ? ex.energy : null };
    }
    bay.missileBay.launching = true;
    const fed = [];
    let had = bay.missileBay.ready.length;
    while (w.step < 3600) {
      step(w);
      const n = bay.missileBay.ready.length, launched = w.log.events.filter((e) => e.type === 'missile-launched' && e.t === w.t - w.dt).length;
      if (n > had - launched) fed.push(w.t);
      had = n;
    }
    return { launches: w.log.events.filter((e) => e.type === 'missile-launched').map((e) => e.t), fed, left: mag.magazine.missiles, missiles: w.ship.missiles.length };
  },
  compare(e, a, c) {
    const close = (x, y, t) => Number.isFinite(y) && Math.abs(x - y) <= t * Math.abs(x);
    const within = (t, x) => x >= t * (1 - 1e-9) && x < (t + 1 / 60) * (1 + 1e-9);
    let checks;
    if (c.part === 'explode') checks = { 'the store 112 MJ (1e-12)': close(e.bay, a.bay, 1e-12), 'the magazine 224 MJ (1e-12)': close(e.magazine, a.magazine, 1e-12), 'the round detonates the bay with its store': a.detonated && close(e.bay, a.explosion, 1e-12) };
    else {
      checks = {
        'four launches': a.launches.length === 4 && a.missiles === 4,
        'at 0 and 2 s (the interval)': Math.abs(a.launches[0]) <= 1e-9 && Math.abs(a.launches[1] - 2) <= 1e-9,
        'refills one-sided at 27.778 and 55.556 s (hand-worked)': a.fed.length === 2 && within(e.launches[2], a.fed[0]) && within(e.launches[3], a.fed[1]),
        'each refill launched at the next step\'s start (= the refill\'s step end)': within(e.launches[2], a.launches[2]) && within(e.launches[3], a.launches[3]),
        '2 missiles left in the magazine': a.left === e.left,
      };
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: JSON.stringify(r.expected), actual: JSON.stringify(r.actual) };
  },
};
