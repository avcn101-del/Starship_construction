// Successor of L0.beam.csda.sweep (DESIGN.md 13l.7, #271: T3): the count 754 is a regression pin, and the step counts
// and ranges at both ends of the sweep are checked against literals the blind checker derives from the integrator's rule.
import { csdaRange, csdaSteps } from '../../../js/damage.js';

const MEV = 1.602176634e-13;
const LO = 10, HI = 400, SCAN = 4000; // MeV; log-spaced scan points that bracket the changes
const iron = (f) => ({ protonRest: f.protonRestEnergy.value, electronRest: f.electronRestEnergy.value, K: f.betheK.value, ZA: f.ironZOverA.value, I: f.ironMeanExcitation.value });

/** Every step-count change of csdaSteps in [a, b] (J): brackets split until each holds one change of one step, then bisected to the float resolution: [below, above, steps below, steps above]. */
function changes(a, b, c) {
  const out = [];
  const split = (lo, nlo, hi, nhi) => {
    if (nlo === nhi) return;
    const mid = (lo + hi) / 2;
    if (!(mid > lo && mid < hi)) { out.push([lo, hi, nlo, nhi]); return; } // adjacent floats: the change is here
    if (Math.abs(nhi - nlo) > 1) { const n = csdaSteps(mid, c).steps; split(lo, nlo, mid, n); split(mid, n, hi, nhi); return; }
    // One change: bisect to the float resolution.
    for (;;) {
      const m = (lo + hi) / 2;
      if (!(m > lo && m < hi)) break;
      if (csdaSteps(m, c).steps === nlo) lo = m; else hi = m;
    }
    out.push([lo, hi, nlo, nhi]);
  };
  let e0 = a, n0 = csdaSteps(a, c).steps;
  for (let k = 1; k <= SCAN; k++) {
    const e1 = k === SCAN ? b : a * (b / a) ** (k / SCAN), n1 = csdaSteps(e1, c).steps;
    split(e0, n0, e1, n1);
    e0 = e1; n0 = n1;
  }
  return out;
}

export default {
  id: 'L0.beam.csda.sweep.v2',
  level: 'L0',
  laws: ['csdaRange is continuous in energy at every change of its step count: the integrator\'s last step ends exactly at the stop energy (§17 item 27, 13l.1, #258 (9))'],
  dependsOn: ['L0.beam.pstar'],
  setup: 'the kernel\'s csdaRange and csdaSteps in iron (FIXED constants), 10 to 400 MeV: 4000 log-spaced energies bracket the step-count changes, a bracket holding more than one is split, and each change is bisected to adjacent floats (13l.4 A4\'s full sweep, the reviewer\'s method on PR #58; successor of the six samples of L0.beam.csda.continuous, #258 (9))',
  measure: 'the number of changes and the step counts at 10 and 400 MeV with the ranges there; at each change the step counts on either side and the relative difference of the ranges at the two adjacent floats; the largest of these',
  tolerance: '1e-12 relative between the two floats around a change (the reviewer\'s sweep measured 1.0e-15 at worst; the jump before L4a was about 5e-6)',
  criterion: 'every change is of one step and upward (n -> n + 1 as the energy rises); the changes found number steps(400 MeV) - steps(10 MeV) (so none is missed: the count is monotone; a consistency invariant, 13k.4: csdaSteps on both sides); 754 is a regression pin (kernel-read: csdaSteps run by tools/estimates/l4.mjs, the #258 section, not hand-worked; 13l.7 T3); independent check (13l.7 T3): csdaSteps gives 229 steps at 10 MeV and 983 at 400 MeV with ranges 1.9311 and 1164.24 kg/m^2 (to the digits quoted, 5e-5 relative; the step count follows from the integrator\'s rule in js/damage.js, which the blind checker derives by hand); at every change the ranges at the two adjacent floats differ by at most 1e-12 relative (#251 (2), §17 item 27)',
  tunable: [],
  locked: { date: '2026-10-22', hash: 'ce69b8ca' },
  cases() {
    return [{ from: LO, to: HI }];
  },
  expected(ctx, c) {
    return { count: 754, jump: 1e-12, steps: [229, 983], ranges: [1.9311, 1164.24] };
  },
  run(ctx, c) {
    const cs = iron(ctx.fixed), list = changes(c.from * MEV, c.to * MEV, cs);
    let worst = 0, at = null, oneUp = true;
    for (const [lo, hi, nlo, nhi] of list) {
      if (nhi !== nlo + 1) oneUp = false;
      const a = csdaRange(lo, cs), b = csdaRange(hi, cs), j = Math.abs(b - a) / Math.max(a, b);
      if (j > worst) { worst = j; at = lo / MEV; }
    }
    return { changes: list.length, steps: [csdaSteps(c.from * MEV, cs).steps, csdaSteps(c.to * MEV, cs).steps], ranges: [csdaRange(c.from * MEV, cs), csdaRange(c.to * MEV, cs)], oneUp, worst, at, first: list.length ? list[0][0] / MEV : null, last: list.length ? list[list.length - 1][0] / MEV : null };
  },
  compare(e, a) {
    const checks = {
      'every change is one step up': a.oneUp,
      'the changes found = steps(400) - steps(10) (consistency invariant)': a.changes === a.steps[1] - a.steps[0],
      '754 changes (regression pin, kernel-read)': a.changes === e.count,
      'independent: 229 steps at 10 MeV, 983 at 400 MeV, ranges 1.9311 and 1164.24 kg/m^2': a.steps[0] === e.steps[0] && a.steps[1] === e.steps[1] && a.ranges.every((x, i) => Math.abs(x - e.ranges[i]) <= 5e-5 * e.ranges[i]),
      'no jump above 1e-12 at any change': a.worst <= e.jump,
    };
    return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ') };
  },
  display(r) {
    const a = r.actual;
    if (a.error) return { expected: '754 changes within 1e-12', actual: `error ${a.error}` };
    return { expected: `${r.expected.count} changes, each within 1e-12`, actual: `${a.changes} changes (steps ${a.steps[0]} -> ${a.steps[1]}), first at ${a.first.toPrecision(12)} MeV, last at ${a.last.toPrecision(12)} MeV; largest jump ${a.worst.toExponential(3)} at ${a.at.toPrecision(12)} MeV` };
  },
};
