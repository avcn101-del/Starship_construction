import { createWorld, addRoom, loadMagazine, magazineCapacity, enablePowerRouting, setDemand, step, loadRailgun, railgunSlug } from '../../../js/rooms.js';

// W1 of the L5 plan (DESIGN.md 13n.4, 13n.1 (c), #236 (6), #278): the spinal railgun alone. It fires a steel slug of
// railgun.roundMass along its axis at railgun.muzzleVelocity x sqrt(N / 2), at most railgun.fireRate, fed by a railgun
// magazine on a live wall; each shot draws 1/2 m v^2 / railgun.efficiency spread over the reload; the rest is heat.
//
// Setup (T1). (fire) a cluster on a 20 x 10 grid: an M railgun of N = 2 or 4 cells at [3, 0] (cells x 3..3+N-1, rows
// 0-1), an L magazine at [0, 0] full of slugs (2025 kg) sharing the wall x = 3 (rows 0-1, 10 m), an M reactor at [3, 2]
// sharing its wall (10 m) at full demand, power routed; ordered to fire from t = 0; 25 s stepped. (heat) the railgun
// alone (no grid: L1, no conduction, no radiator) with 2000 kg of its own slugs, ordered to fire, stepped until its
// 'hot' event.
// Hand-worked (13n.2): v = 2000 x sqrt(N / 2): N = 2 2000 m/s, N = 4 2000 sqrt 2 = 2828.42712474619 m/s; E = 1/2 x 10 x
// v^2 = 20 / 40 MJ; mean draw E / 0.3 x 0.1 /s = 6.666667 / 13.333333 MW; heat 0.7 of it = 4.666667 / 9.333333 MW;
// slugs at 0, 10 and 20 s (1 / 0.1 s apart; on the step grid: the rate is what is tested); C = N x 2 cells x 4.5e6 J/K
// (thermal.coupledRailgun) = 1.8e7 / 3.6e7 J/K, plant hot 600 K from 290 K: t = C x 310 / heat = 1.8e7 x 310 /
// 4.666667e6 = 1195.714 s (N = 2) and 3.6e7 x 310 / 9.333333e6 = 1195.714 s (N = 4): one-sided [t, t + dt).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const V = { 2: 2000, 4: 2828.42712474619 }, DRAW = { 2: 20e6 / 0.3 * 0.1, 4: 40e6 / 0.3 * 0.1 }, T_HOT = { 2: (1.8e7 * 310) / (0.7 * 20e6 / 0.3 * 0.1), 4: (3.6e7 * 310) / (0.7 * 40e6 / 0.3 * 0.1) };

export default {
  id: 'L1.railgun.fire',
  level: 'L1',
  laws: ['the spinal railgun fires a steel slug of railgun.roundMass at railgun.muzzleVelocity x sqrt(N / 2), at most railgun.fireRate, fed by a railgun magazine on a live wall (13n.1 (c), #236 (6))', 'each shot draws 1/2 m v^2 / railgun.efficiency over the reload; the rest is heat in the room (13n.1 (c))'],
  dependsOn: [],
  setup: 'T1: (fire) an M railgun of N = 2 / 4 at [3, 0], an L magazine of slugs at [0, 0], an M reactor at [3, 2], routed, 25 s; (heat) the railgun alone with its own slugs, until hot (13n.4 W1)',
  measure: 'each slug event\'s time and muzzle energy (v = sqrt(2 E / m)); the railgun\'s delivered draw; the slugs taken from the magazine; the time of the hot event',
  tolerance: 'speed and draw 1e-12 (closed form); the slug times exact (on the grid: the rate is tested); the hot time one-sided [t, t + dt) with the 1e-9 slack (#185 (2))',
  criterion: '(fire) slugs at 0, 10, 20 s and no other in 25 s, each at v = 2000 / 2828.42712474619 m/s (hand-worked, 1e-12), the draw 6.666667 / 13.333333 MW (1e-12), 30 kg of slugs gone from the magazine; (heat) the hot event at t in [1195.714, 1195.714 + dt) s for N = 2 and 4 (hand-worked)',
  tunable: ['railgun.roundMass', 'railgun.muzzleVelocity', 'railgun.fireRate', 'railgun.efficiency', 'thermal.coupledRailgun', 'thermal.plantHot'],
  locked: null,
  cases() {
    return [{ part: 'fire', N: 2 }, { part: 'fire', N: 4 }, { part: 'heat', N: 2 }, { part: 'heat', N: 4 }];
  },
  expected(ctx, c) {
    return c.part === 'fire' ? { v: V[c.N], draw: DRAW[c.N], times: [0, 10, 20], gone: 30 } : { t: T_HOT[c.N] };
  },
  run(ctx, c) {
    if (c.part === 'heat') {
      const w = createWorld({ params: ctx.params, edge: 5, dt: ctx.dt });
      const r = addRoom(w, 'railgun', { id: 'railgun', length: c.N });
      loadRailgun(r, 2000);
      r.railgun.firing = true;
      while (w.step < 80000) { step(w); const e = w.log.events.find((x) => x.type === 'hot'); if (e) return { t: e.t, shots: r.railgun.shots }; }
      return { t: null };
    }
    const w = createWorld({ params: ctx.params, edge: 5, dt: ctx.dt, grid: [20, 10] });
    const r = addRoom(w, 'railgun', { id: 'railgun', cell: [3, 0], length: c.N });
    const mag = addRoom(w, 'magazine', { id: 'magazine', size: 'L', cell: [0, 0] });
    const re = addRoom(w, 'reactor', { id: 'reactor', cell: [3, 2] });
    loadMagazine(w, mag, { type: 'railgun', slugMass: magazineCapacity(w, mag) });
    const before = mag.magazine.slugMass;
    enablePowerRouting(w);
    setDemand(w, re, 1);
    r.railgun.firing = true;
    const m = railgunSlug(w, r).m;
    let draw = null;
    while (w.step < 1500) { step(w); if (draw === null) draw = r.powerDelivered; }
    const slugs = w.log.events.filter((e) => e.type === 'slug').map((e) => ({ t: e.t, v: Math.sqrt((2 * e.energy) / m) }));
    return { slugs, draw, gone: before - mag.magazine.slugMass, m };
  },
  compare(e, a, c) {
    const close = (x, y, t) => Number.isFinite(y) && Math.abs(x - y) <= t * Math.max(Math.abs(x), 1e-300);
    let checks;
    if (c.part === 'heat') checks = { 'hot one-sided in [t, t + dt) (hand-worked)': a.t !== null && a.t >= e.t * (1 - 1e-9) && a.t < (e.t + 1 / 60) * (1 + 1e-9) };
    else {
      checks = {
        'slugs at 0, 10, 20 s, no other (the rate)': a.slugs.length === 3 && a.slugs.every((s, i) => Math.abs(s.t - e.times[i]) <= 1e-9),
        'muzzle speed v = 2000 sqrt(N / 2) (hand-worked, 1e-12)': a.slugs.every((s) => close(e.v, s.v, 1e-12)),
        'draw 1/2 m v^2 / efficiency x rate (hand-worked, 1e-12)': close(e.draw, a.draw, 1e-12),
        '30 kg of slugs from the magazine': close(e.gone, a.gone, 1e-12),
      };
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: JSON.stringify(r.expected), actual: JSON.stringify(r.actual) };
  },
};
