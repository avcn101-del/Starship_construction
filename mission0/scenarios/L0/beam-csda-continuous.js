import { csdaRange, csdaSteps } from '../../../js/damage.js';

// The energies (MeV) near which a step-count change is found: one change each, 10-400 MeV (13l.4 A4).
const NEAR = [10, 20, 50, 100, 200, 400];
const MEV = 1.602176634e-13;
const SPACING = 1e-14; // relative spacing of the 1000 neighbours (the smooth slope then moves R by about 2e-14 per neighbour)
const iron = (f) => ({ protonRest: f.protonRestEnergy.value, electronRest: f.electronRestEnergy.value, K: f.betheK.value, ZA: f.ironZOverA.value, I: f.ironMeanExcitation.value });

/** The first energy above `from` (J) at which csdaSteps' count changes, bracketed and bisected to the float resolution: [below, above]. */
function change(from, c) {
  const n0 = csdaSteps(from, c).steps;
  let lo = from, hi = from * 1.001;
  while (csdaSteps(hi, c).steps === n0) { lo = hi; hi *= 1.001; }
  for (;;) {
    const mid = (lo + hi) / 2;
    if (!(mid > lo && mid < hi)) break;
    if (csdaSteps(mid, c).steps === n0) lo = mid; else hi = mid;
  }
  return [lo, hi];
}

export default {
  id: 'L0.beam.csda.continuous',
  level: 'L0',
  laws: ['csdaRange is continuous in energy: the integrator\'s last step ends exactly at the stop energy (§17 item 27, 13l.1)'],
  dependsOn: ['L0.beam.pstar'],
  setup: 'the kernel\'s csdaRange in iron (FIXED constants); near 10, 20, 50, 100, 200 and 400 MeV the first energy at which its step count (csdaSteps) changes, found by bisection to the float resolution; 1000 energies around it, E* (1 + k x 1e-14) for k = -500 .. 499 (13l.4 A4: one change per energy, a sample of the about 750 changes between 10 and 400 MeV, to keep the run short)',
  measure: 'the range at each of the 1000 energies; the largest relative difference between neighbours; the step counts at both ends',
  tolerance: '1e-12 relative between neighbours (a smooth range moves by about 2e-14 between neighbours 1e-14 apart; the jump before L4a was about 5e-6, PR #54 fix round 1, Q3)',
  criterion: 'at each sampled change the step count differs between the two ends of the window (the window holds a change), and no two neighbouring energies give ranges more than 1e-12 apart, relative (#251 (2), §17 item 27)',
  tunable: [],
  locked: null,
  cases() {
    return NEAR.map((MeV) => ({ MeV }));
  },
  expected() {
    return { jump: 1e-12 };
  },
  run(ctx, c) {
    const cs = iron(ctx.fixed), [below] = change(c.MeV * MEV, cs);
    const ranges = [];
    for (let k = -500; k < 500; k++) ranges.push(csdaRange(below * (1 + k * SPACING), cs));
    let worst = 0;
    for (let k = 1; k < ranges.length; k++) worst = Math.max(worst, Math.abs(ranges[k] - ranges[k - 1]) / Math.max(ranges[k], ranges[k - 1]));
    return { at: below / MEV, steps: [csdaSteps(below * (1 - 500 * SPACING), cs).steps, csdaSteps(below * (1 + 499 * SPACING), cs).steps], worst, range: csdaRange(below, cs) };
  },
  compare(e, a) {
    const checks = { 'the window holds a step-count change': a.steps[0] !== a.steps[1], 'no jump above 1e-12 between neighbours': a.worst <= e.jump };
    return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ') };
  },
  display(r) {
    const a = r.actual;
    return { expected: 'neighbours within 1e-12', actual: `change at ${a.at.toPrecision(15)} MeV (steps ${a.steps[0]} -> ${a.steps[1]}), range ${a.range.toPrecision(12)} kg/m^2, largest neighbour difference ${a.worst.toExponential(3)}` };
  },
};
