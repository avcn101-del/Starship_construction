import { createWorld } from '../../../js/rooms.js';
import { moveMissile } from '../../../js/missile.js';

// W5 of the L5 plan (DESIGN.md 13n.4, 13n.1 (c), #54): a missile thrusts along its heading at missile.acceleration for
// missile.burnTime, then coasts; within a step the kinematics are exact for a constant acceleration (js/missile.js
// moveMissile), the burn's end cut where it falls.
//
// Setup (T1): one missile of missile.mass at rest at the origin, heading +x, launched at t = 0, moved step by step
// (dt = 1/60 s) by the kernel's moveMissile. (arrive d) until it has travelled d = 600, 900, 1500 m; (coast) 30 s.
// Hand-worked (13n.2, a = 30 m/s^2, T = 20 s): from rest d = 1/2 a t^2, t = sqrt(2 d / a): 600 m in 6.3246 s at 189.737
// m/s; 900 m in 7.7460 s at 232.379 m/s; 1500 m in 10.000 s at 300 m/s; the first step whose end has travelled d is the
// one holding t (one-sided [t, t + dt)); the speed at a step's end a k dt. Coasting: v = a T = 600 m/s after 20 s,
// unchanged; at 30 s x = 1/2 a T^2 + a T (30 - T) = 6000 + 6000 = 12 000 m. The thrust books: impulse m a t, work 1/2 m
// (a t)^2 while it burns.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L0.missile.flight',
  level: 'L0',
  laws: ['a missile thrusts missile.acceleration along its heading for missile.burnTime, then coasts (13n.1 (c), #97)', 'flight from rest: d = 1/2 a t^2, v = a t (#54: 8-15 s at the band)'],
  dependsOn: [],
  setup: 'T1: one missile at rest at the origin heading +x, launched at t = 0, moved by moveMissile each 1/60 s step: to 600 / 900 / 1500 m, and 30 s (13n.4 W5)',
  measure: 'the first step whose end has travelled d, its time and speed; the speed and position at 20, 25 and 30 s; the thrust impulse and work',
  tolerance: 'arrival one-sided [t, t + dt) with the 1e-9 slack; speeds and positions 1e-12 relative (closed form); books 1e-12',
  criterion: 'arrival in the step holding t = 6.3246 / 7.7460 / 10.000 s (hand-worked) at a speed a k dt; coasting: v 600 m/s at 20, 25 and 30 s, x 12 000 m at 30 s; impulse m a T, work 1/2 m (a T)^2',
  tunable: ['missile.acceleration', 'missile.burnTime', 'missile.mass'],
  locked: null,
  cases() {
    return [{ d: 600 }, { d: 900 }, { d: 1500 }, { coast: 30 }];
  },
  expected(ctx, c) {
    if (c.coast) return { v: 600, x: 12000, J: 200 * 600, work: 0.5 * 200 * 600 * 600 };
    return { t: Math.sqrt((2 * c.d) / 30), a: 30 };
  },
  run(ctx, c) {
    const w = createWorld({ params: ctx.params, edge: 5, dt: ctx.dt });
    const x = { m: 200, x: [0, 0], v: [0, 0], heading: [1, 0], t: 0 };
    let k = 0, J = 0, work = 0;
    const at = {};
    while (k < 3600) {
      const b = moveMissile(w, x, k * w.dt, w.dt);
      k++; J += b.J[0]; work += b.work;
      if (c.d && x.x[0] >= c.d) return { k, t: k * w.dt, v: x.v[0], y: x.x[1] };
      if (c.coast && [1200, 1500, 1800].includes(k)) at[k] = { x: x.x[0], v: x.v[0] };
      if (c.coast && k === 1800) return { at, J, work };
    }
    return { k: null };
  },
  compare(e, a, c) {
    const close = (x, y, t) => Number.isFinite(y) && Math.abs(x - y) <= t * Math.abs(x);
    let checks;
    if (c.coast) {
      checks = {
        'v = a T = 600 m/s at 20, 25, 30 s (1e-12)': [1200, 1500, 1800].every((k) => close(e.v, a.at[k].v, 1e-12)),
        'x = 6000 + 600 (t - 20) at 20, 25, 30 s (1e-12)': close(6000, a.at[1200].x, 1e-12) && close(9000, a.at[1500].x, 1e-12) && close(e.x, a.at[1800].x, 1e-12),
        'thrust impulse m a T and work 1/2 m (a T)^2 (1e-12)': close(e.J, a.J, 1e-12) && close(e.work, a.work, 1e-12),
      };
    } else {
      checks = {
        'arrives in the step holding t (one-sided, hand-worked)': a.k !== null && a.t >= e.t * (1 - 1e-9) && a.t < (e.t + 1 / 60) * (1 + 1e-9),
        'its speed a k dt (1e-12)': close(e.a * a.t, a.v, 1e-12),
        'straight along its heading': a.y === 0,
      };
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: JSON.stringify(r.expected), actual: JSON.stringify(r.actual) };
  },
};
