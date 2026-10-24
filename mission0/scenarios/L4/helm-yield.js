import { createBattle } from '../../../js/battle.js';
import { navigate } from '../../../js/navigator.js';
import { silhouettePose } from '../../../js/helm.js';
import { R2 } from '../../builds.js';

// K6 of §17 item 55 (DESIGN.md 13n.9, #335, #339): the position yields, on the navigator's own timing. While the range
// order is engaged under the position law, the distance to its point must fall by helm.rangeBand within
// helm.positionPatience, else the position yields (no lead) and stays yielded until the order has been let go for
// helm.positionReset. K3 sees neither the yield nor the reset (the R2 mirror does not race without them, #339 (4)).
//
// Setup (T1), constructed: R2 (A, orders fire: range hold R* = helm.rangeHold, position bow, style hold, throttle 0.5)
// and R2 (T) at heading 0, knowledge on (the helm reads the other ship from its model's silhouette); A on T's bearing
// +y (its left beam). No kernel step: each step n the navigator alone is called with battle.step = n and
// battle.t = n dt (the kernel's world.t = step x dt), the goals of A's orders, T's silhouette pose and T's observed
// velocity 0 (test inputs); A's ship never moves, so the distance to the point never falls. Test inputs on the
// throttle goal: 0 for steps 0-59 (a lead-in second: the order cannot engage), then 0.5.
//   'at range': A at r = R* (900 m). The lead (#315) moves the point 60 degrees from A's bearing toward T's bow:
// e = 2 R* sin(30 deg) = 900 m > band, the order engages and its point never closes. Once the position yields the
// point is A's own bearing at R*, A itself: e = 0 with A at rest, so the order lets go (#302) at the next step.
//   'beyond range': A at 2500 m, e = |r - R*| = 1600 m > band at every step, so the order stays engaged; the lead
// applies only within the band (#335), so it is the navigator's bookkeeping alone; the throttle goal is set to 0 from
// step 1800 (a test input: the order lets go).
// Hand-worked: the patience clock starts at the first step that sees the order already engaged (E + 1, E the step it
// engages) and the yield comes at the first step t - t(E + 1) >= helm.positionPatience: E + ceil(15 / dt) (+ 1 for
// the clock's start) = E + 901 at dt 1/60 s, within the criterion's +- 1 step of E + ceil(patience / dt). The reset
// clock starts at the let-go step L and the position comes back at the first step t - t(L) >= helm.positionReset:
// L + ceil(30 / dt) = L + 1800. With E = 0 instead of 60 the yield would come at step 902 (t(902) - t(1) is 15 s in
// reals but 14.999999999999998 in floats at 901): outside +- 1; hence the lead-in (reported in the pull request).
const LEAD_IN = 60, LET_GO = 1800, STEPS = 4000;

export default {
  id: 'L4.helm.yield',
  level: 'L4',
  laws: ['the position yields: while the range order is engaged under the position law, a point that does not close by helm.rangeBand within helm.positionPatience yields (no lead) until the order has been let go for helm.positionReset (13n.9, #335, #339)'],
  dependsOn: ['L4.helm.range', 'L4.helm.separation'],
  setup: 'T1, constructed (13n.9 K6): R2 (A, orders fire) and R2 (T, heading 0), knowledge on, A on T\'s bearing +y; no kernel step: each step n the navigator alone with battle.step n, battle.t = n dt, A\'s goals, T\'s silhouette pose and observed velocity 0 (test inputs); A never moves; the throttle goal 0 for steps 0-59, then 0.5. Case at range: A at R* = helm.rangeHold (the lead puts the point 900 m off; once yielded the point is A itself, so the order lets go). Case beyond range: A at 2500 m (engaged throughout), the throttle goal 0 from step 1800 (the order lets go); 4000 steps',
  measure: 'per step, the helm\'s engaged and yielded states; E the first engaged step, Y the first yielded step, L the first step after Y not engaged, B the first step after L not yielded; whether every engaged step from Y to L is yielded and every step from L to B - 1 is yielded; the wanted heading before and after the yield (information)',
  tolerance: '+- 1 step on Y - E and on B - L',
  criterion: 'Y - E = ceil(helm.positionPatience / dt) +- 1 step (900 +- 1), the position stays yielded at every engaged step from Y, and B - L = ceil(helm.positionReset / dt) +- 1 step (1800 +- 1), yielded at every step from L to B - 1 (not restored before); item55.position.yield and item55.position.reset each fail it (#339)',
  tunable: ['helm.positionPatience', 'helm.positionReset', 'helm.rangeBand', 'helm.positionLead'],
  locked: null,
  cases() {
    return [{ name: 'at range' }, { name: 'beyond range' }];
  },
  expected(ctx) {
    const dt = ctx.dt, s = (x) => ctx.scaled(x, ctx.tiers.T1.edge);
    // ceil with float resolution (#308 (2)): 15 / (1/60) is 900 in reals.
    return { patience: Math.ceil(s(ctx.params.helm.positionPatience) / dt - 1e-9), reset: Math.ceil(s(ctx.params.helm.positionReset) / dt - 1e-9), slack: 1 };
  },
  run(ctx, c) {
    const R = ctx.scaled(ctx.params.helm.rangeHold, ctx.tiers.T1.edge), distance = c.name === 'at range' ? R : 2500;
    const b = createBattle({ params: ctx.params, attacker: R2, target: R2, distance, bearing: '+y', targetHeading: 0, knowledge: true, orders: { A: 'fire' } });
    const A = b.attacker, o = A.helm.orders, them = silhouettePose(A.model), vo = [0, 0];
    let E = null, Y = null, L = null, B = null, yieldedEngaged = true, before = null, after = null;
    for (let n = 0; n < STEPS; n++) {
      b.step = n; b.t = n * b.dt;
      const throttle = n < LEAD_IN || (c.name === 'beyond range' && n >= LET_GO) ? 0 : o.throttle;
      const nav = navigate(b, A, { range: R, position: o.position, style: o.style, facing: o.facing, dodging: o.dodging, throttle }, { them, vo });
      const h = A.helm;
      if (E === null && h.engaged) E = n;
      if (Y === null && h.yielded) { Y = n; before = nav.heading; }
      if (Y !== null && L === null) { if (h.engaged) { if (!h.yielded) yieldedEngaged = false; } else L = n; }
      if (Y !== null && n === Y + 1) after = nav.heading;
      if (L !== null && B === null) { if (!h.yielded) B = n; }
    }
    // Every step from L to B - 1 is yielded by B's definition (the first step after L not yielded).
    return { E, Y, L, B, yieldedEngaged, before, after };
  },
  compare(e, a) {
    const ok = {
      'engaged and yielded': a.E !== null && a.Y !== null,
      'Y - E within 1 step of ceil(patience / dt)': a.E !== null && a.Y !== null && Math.abs(a.Y - a.E - e.patience) <= e.slack,
      'yielded at every engaged step from Y': a.yieldedEngaged,
      'let go, then restored': a.L !== null && a.B !== null,
      'B - L within 1 step of ceil(reset / dt)': a.L !== null && a.B !== null && Math.abs(a.B - a.L - e.reset) <= e.slack,
    };
    const pass = Object.values(ok).every(Boolean);
    return { pass, note: pass ? '' : Object.entries(ok).filter(([, v]) => !v).map(([k]) => k).join(', ') };
  },
  display(r) {
    const a = r.actual, e = r.expected, f = (x) => (x === null ? '-' : x);
    return {
      expected: `Y - E = ${e.patience} +- ${e.slack}; B - L = ${e.reset} +- ${e.slack}; yielded while engaged and until B`,
      actual: `E ${f(a.E)}, Y ${f(a.Y)} (Y - E ${a.E !== null && a.Y !== null ? a.Y - a.E : '-'}), L ${f(a.L)}, B ${f(a.B)} (B - L ${a.L !== null && a.B !== null ? a.B - a.L : '-'}); yielded while engaged ${a.yieldedEngaged ? 'yes' : 'no'}; wanted heading at the yield ${a.before === null ? '-' : a.before.toFixed(4)} rad, after ${a.after === null ? '-' : a.after.toFixed(4)} rad (information)`,
    };
  },
};
