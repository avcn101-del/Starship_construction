import { createBattle } from '../../../js/battle.js';
import { navigate } from '../../../js/navigator.js';
import { silhouettePose } from '../../../js/helm.js';
import { R2 } from '../../builds.js';

// K8 of §17 item 58 (DESIGN.md 13n.10, #340; the lead designer's answer on PR #107): the yield clocks take RES. The
// yield's and the reset's comparisons took no float margin (#308 (2)): with t = n dt, t - t0 can fall a float short of
// helm.positionPatience or helm.positionReset at the step it is due, so a yield or a reset landed one step late at some
// engagement steps (K6 allowed +- 1). With RES (1e-9 s, five orders above t's float error at 600 s and seven below dt)
// both land on their step exactly, whatever the step the order engages at.
//
// Setup (T1), K6's construction (L4.helm.yield, case beyond range): R2 (A, orders fire: range hold R* =
// helm.rangeHold, position bow, style hold, throttle 0.5) and R2 (T) at heading 0, knowledge on, A 2500 m off on T's
// bearing +y. No kernel step: each step n the navigator alone with battle.step = n and battle.t = n dt, A's goals, T's
// silhouette pose and observed velocity 0 (test inputs); A never moves, so e = |r - R*| = 1600 m > band at every step
// and the order stays engaged while it is able (the point never closes). Test inputs on the throttle goal: 0 for steps
// 0 to E - 1, 0.5 from E, 0 again from L = E + 1740 (the order cannot engage, then engages at E, then lets go at L);
// one case per E = 60...179; to L + 1800 + 10 steps.
// Hand-worked: the patience clock starts at the first step that reads the order already engaged, E + 1 (at E the
// order was not yet engaged when the yield's clock ran), and the yield comes at the first step n with
// t(n) - t(E + 1) >= helm.positionPatience: Y = E + 1 + ceil(15 / dt) = E + 901 at dt 1/60 s. The reset clock starts
// at the let-go step L (freeSince = t(L)) and the position comes back at the first step n with t(n) - t(L) >=
// helm.positionReset: B = L + ceil(30 / dt) = L + 1800. Before #340, 32 of the 120 yields and 40 of the 120 resets land
// one step late (Y - E = 902, B - L = 1801; measured on PR #107; the plan's 900 and 20 corrected by the lead designer).
const PRE = 1740, FIRST = 60, LAST = 179;

export default {
  id: 'L4.helm.yield.exact',
  level: 'L4',
  laws: ['the yield clocks take RES: the position yields exactly ceil(helm.positionPatience / dt) steps after the patience clock starts and comes back exactly ceil(helm.positionReset / dt) steps after the let-go (13n.10, #340, #308 (2))'],
  dependsOn: ['L4.helm.yield'],
  setup: 'T1, constructed (13n.10 K8, K6\'s construction, case beyond range): R2 (A, orders fire) and R2 (T, heading 0), knowledge on, A 2500 m off on T\'s bearing +y; no kernel step: each step n the navigator alone with battle.step n, battle.t = n dt, A\'s goals, T\'s silhouette pose and observed velocity 0 (test inputs); A never moves; the throttle goal 0 for steps 0 to E - 1, 0.5 from E, 0 from L = E + 1740; one case per E = 60...179; to L + 1810 steps',
  measure: 'per case, per step, the helm\'s engaged and yielded states: the first engaged step, Y the first yielded step, the first step after Y not engaged, B the first step after it not yielded; whether every engaged step from Y is yielded',
  tolerance: 'exact (integer steps)',
  criterion: 'at every E = 60...179: the order engages at E and lets go at L = E + 1740; Y - E = ceil(helm.positionPatience / dt) + 1 = 901 exactly (the clock starts at E + 1, the first step that reads the order engaged); yielded at every engaged step from Y; B - L = ceil(helm.positionReset / dt) = 1800 exactly; before #340 32 and 40 of 120 land one step late; item58.res fails it',
  tunable: ['helm.positionPatience', 'helm.positionReset', 'helm.rangeBand'],
  locked: null,
  cases() {
    const out = [];
    for (let E = FIRST; E <= LAST; E++) out.push({ E, L: E + PRE });
    return out;
  },
  expected(ctx) {
    const dt = ctx.dt, s = (x) => ctx.scaled(x, ctx.tiers.T1.edge);
    // ceil with float resolution (#308 (2)): 15 / (1/60) is 900 in reals.
    return { yieldAfter: Math.ceil(s(ctx.params.helm.positionPatience) / dt - 1e-9) + 1, resetAfter: Math.ceil(s(ctx.params.helm.positionReset) / dt - 1e-9) };
  },
  run(ctx, c) {
    const R = ctx.scaled(ctx.params.helm.rangeHold, ctx.tiers.T1.edge);
    const b = createBattle({ params: ctx.params, attacker: R2, target: R2, distance: 2500, bearing: '+y', targetHeading: 0, knowledge: true, orders: { A: 'fire' } });
    const A = b.attacker, o = A.helm.orders, them = silhouettePose(A.model), vo = [0, 0];
    let E = null, Y = null, L = null, B = null, yieldedEngaged = true;
    for (let n = 0; n < c.L + 1810; n++) {
      b.step = n; b.t = n * b.dt;
      const throttle = n < c.E || n >= c.L ? 0 : o.throttle;
      navigate(b, A, { range: R, position: o.position, style: o.style, facing: o.facing, dodging: o.dodging, throttle }, { them, vo });
      const h = A.helm;
      if (E === null && h.engaged) E = n;
      if (Y === null && h.yielded) Y = n;
      if (Y !== null && L === null) { if (h.engaged) { if (!h.yielded) yieldedEngaged = false; } else L = n; }
      if (L !== null && B === null && !h.yielded) B = n;
    }
    return { E, Y, L, B, yieldedEngaged };
  },
  compare(e, a, c) {
    const ok = {
      'engaged at E': a.E === c.E,
      'let go at L': a.L === c.L,
      'Y - E exact': a.E !== null && a.Y !== null && a.Y - a.E === e.yieldAfter,
      'yielded at every engaged step from Y': a.yieldedEngaged,
      'B - L exact': a.L !== null && a.B !== null && a.B - a.L === e.resetAfter,
    };
    const pass = Object.values(ok).every(Boolean);
    return { pass, note: pass ? '' : Object.entries(ok).filter(([, v]) => !v).map(([k]) => k).join(', ') };
  },
  display(r) {
    const a = r.actual, e = r.expected, f = (x) => (x === null ? '-' : x);
    return {
      expected: `Y - E = ${e.yieldAfter}; B - L = ${e.resetAfter}; yielded while engaged`,
      actual: `E ${f(a.E)}, Y ${f(a.Y)} (Y - E ${a.E !== null && a.Y !== null ? a.Y - a.E : '-'}), L ${f(a.L)}, B ${f(a.B)} (B - L ${a.L !== null && a.B !== null ? a.B - a.L : '-'}); yielded while engaged ${a.yieldedEngaged ? 'yes' : 'no'}`,
    };
  },
};
