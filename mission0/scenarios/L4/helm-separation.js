import { tick, mainBody } from '../../../js/battle.js';
import { createDuel } from '../../../tools/duel.js';

// J1 of L5e1 (DESIGN.md 13n.8, 13n.1 (d) "The position law", #315): with the position law (the wanted point on the
// circle of R* about the other ship, moved from the own bearing toward the named one by at most helm.positionLead) the
// ships circle at their range instead of crossing each other: there is no collision model (#20), so the law must keep
// the main bodies apart.
//
// Setup (T1): the five duels of tools/duel.js that #315 measured (R1d-A, the player on Fire, against R1d-A, the enemy
// of js/enemy.js; each on the other's bow at battle.openingRange unless --range): the default (personality 0.5 each);
// --personality 1,0,0.5,0.5 (aggression 1: the enemy orders close, 600 m, and fires at once); --personality 0,0,0.5,0.5
// (aggression 0: open, 1500 m); --range 2500; --range 600; each run to its end or 300 s.
// Hand-worked: the floor is half of helm.rangeClose's lowest approved value, 300 / 2 = 150 m (the nearest any order can
// want, with a braking overshoot of half). On the old law (#306 (2)) the duels came within 900.0 / 33.4 / 111.4 / 51.1
// / 55.2 m (the lead designer's, tools/estimates/l5e1.mjs (1)): it fails 4 of 5. Kernel-read and printed as
// information, not a criterion (the lead designer, 2026-10-24): the overshoot of the side ordered to close in the
// aggression-1 duel, how far inside R* = helm.rangeClose (600 m) the separation gets (the design partner measured
// 362-372 m against 600 m on the patched kernel, about 230 m; #306 accepted 163-170 m).
const DUELS = {
  default: {},
  'aggression 1': { personality: { aggression: 1, patience: 0, caution: 0.5, resolve: 0.5 } },
  'aggression 0': { personality: { aggression: 0, patience: 0, caution: 0.5, resolve: 0.5 } },
  'range 2500': { range: 2500 },
  'range 600': { range: 600 },
};

export default {
  id: 'L4.helm.separation',
  level: 'L4',
  laws: ['the position law: the wanted point on the circle of R* about the other ship, at most helm.positionLead from the own bearing toward the named one; the path circles at R* instead of crossing the other ship (#315, #20)'],
  dependsOn: ['L4.helm.conflict.v2', 'L4.play.replay'],
  setup: 'T1: tools/duel.js createDuel, R1d-A (Fire) against R1d-A (the enemy), each on the other\'s bow: the default, personality 1,0,0.5,0.5, personality 0,0,0.5,0.5, range 2500 m, range 600 m; each to its end or 300 s (13n.8 J1)',
  measure: 'every step, the distance between the two flown bodies\' centres of mass; its minimum and when; the end; in the aggression-1 duel, R* close less the minimum (information)',
  tolerance: 'a floor (the minimum at or above it)',
  criterion: 'in every duel the minimum separation of the main bodies is at least 150 m (helm.rangeClose\'s lowest approved value / 2, read from js/data.js); the old law failed it in 4 of 5',
  tunable: ['helm.positionLead', 'helm.rangeClose', 'helm.rangeHold', 'helm.rangeOpen', 'helm.rangeBand'],
  locked: null,
  cases() {
    return Object.keys(DUELS).map((duel) => ({ duel }));
  },
  expected(ctx) {
    return { floor: ctx.params.helm.rangeClose.min / 2, close: ctx.scaled(ctx.params.helm.rangeClose, 5) };
  },
  run(ctx, c) {
    const b = createDuel({ ...DUELS[c.duel] });
    let min = Infinity, at = null;
    while (!b.ended && b.t < 300) {
      tick(b);
      const A = mainBody(b.attacker), T = mainBody(b.target);
      if (!A || !T) break;
      const d = Math.hypot(A.x[0] - T.x[0], A.x[1] - T.x[1]);
      if (d < min) { min = d; at = b.t; }
    }
    return { min, at, steps: b.step, end: b.ended ? `${b.ended.kind} ${b.ended.side} at ${b.ended.t.toFixed(2)} s` : 'none by 300 s' };
  },
  compare(e, a) {
    const pass = a.min >= e.floor;
    return { pass, note: pass ? '' : `the main bodies came within ${a.min.toFixed(1)} m` };
  },
  display(r) {
    const a = r.actual, e = r.expected, info = r.case.duel === 'aggression 1' ? `; overshoot inside R* close ${(e.close - a.min).toFixed(1)} m (information: ${e.close} m - the minimum; #306 accepted 163-170 m)` : '';
    return { expected: `minimum separation >= ${e.floor} m`, actual: `${a.min.toFixed(1)} m at ${a.at === null ? '-' : a.at.toFixed(2)} s; end ${a.end}${info}` };
  },
};
