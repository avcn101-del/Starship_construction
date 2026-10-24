import { createBattle, tick, mainBody } from '../../../js/battle.js';
import { TARGETS } from '../../targets.js';

// L5e1 J11 (DESIGN.md 13n.8, §17 item 50, #309 (3)): the successor of L4.route.escape.reorder, its case and criterion
// unchanged, its header corrected: a count that a withdrawal did not reset would have escaped at 958 + 600 = 1558
// (the 600th step of growth after the separation passed 3000 m, during the withdrawal), not at 1501 as the original's
// header said.
// H20 of the L5 plan (DESIGN.md 13n.4, 13n.1 (d), #307 (3), #308): the escape count runs only on steps where the
// side's disengage stands; a withdrawal resets it and an order given again starts the 600 steps anew. The count's
// convention (#293): the first step the condition holds (beyond battle.cullDistance, 3000 m, with the order standing)
// is its start, and escaped falls on the 600th step of growth after it.
//
// Setup (T1): createBattle with knowledge on; the runner R1 (A, a helm: range disengage, weapons held by heat
// discipline 0, throttle 1) 900 m from a still R1d (T, no helm, engine off) on its -y side, both at rest, R1 stern-on
// (heading -pi/2, no turn), as L4.route.escape's still case; the verb preset Fire at t = 20 s (step 1200: the order
// withdrawn) and the verb preset with the runner's own slot set at t = 25 s (step 1500: ordered again); until the end
// or 3000 steps.
// Hand-worked (the integrator's sum, #301 (3)): a = 15 MN / 911 234 kg = 16.4612 m/s^2; the separation passes 3000 m
// at step 958 (L4.route.escape), so it is beyond it at the withdrawal; the runner's speed away is then a dt 1200 =
// 329.2 m/s, and Fire (throttle 0.5) can take off at most 0.5 a x 5 s = 41.2 m/s before the order returns, after which
// disengage thrusts away again: the separation grows on every step from 959 on. A verb applies before the tick that
// starts at its step (1500), whose end is step 1501: the first step the order stands again, the count's start;
// escaped at 1501 + 600 = 2101, exact. Without the reset the count would have run on from 958 and escaped at
// 958 + 600 = 1558, while the order was withdrawn.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const RUN = { range: 'disengage', heat: { threshold: 0, response: 'weapons' }, throttle: 1 };

export default {
  id: 'L4.route.escape.reorder.v2',
  level: 'L4',
  laws: ['the escape count runs only while the side\'s disengage stands: a withdrawal resets it, an order given again starts the 600 steps anew (#307 (3))'],
  dependsOn: ['L4.route.escape.edge'],
  setup: 'T1: createBattle, knowledge on; R1 ordered disengage 900 m from a still R1d on its -y side, stern-on, at rest; the verb preset Fire at 20 s, the runner\'s slot set again at 25 s; 3000 steps (13n.4 H20; 13n.8 J11)',
  measure: 'the separation each step; the runner\'s disengage step; the escaped end',
  tolerance: 'steps exact',
  criterion: 'the separation beyond 3000 m from step 958 and growing on every step after; the disengage step cleared from 1200 to 1499 and standing again from 1500; escaped (side A) at 2101 exactly, not earlier',
  tunable: ['battle.cullDistance', 'battle.disabledSeconds', 'engine.thrust'],
  locked: { date: '2026-10-24', hash: 'f851e9e6' },
  cases() {
    return [{ withdraw: 20, again: 25 }];
  },
  expected(ctx, c) {
    const dt = ctx.dt, a = 15e6 / 911234;
    let n = 1;
    while (!((a * dt * dt * n * (n + 1)) / 2 > 2100)) n++;
    const again = Math.round(c.again / dt);
    return { passed: n, cleared: [Math.round(c.withdraw / dt), again - 1], again, escaped: again + 1 + 600, speed: a * dt * Math.round(c.withdraw / dt), braking: 0.5 * a * (c.again - c.withdraw) };
  },
  run(ctx, c) {
    const b = createBattle({
      params: ctx.params, tier: 'T1', attacker: TARGETS.R1, target: TARGETS.R1d, bearing: '+x', targetHeading: -Math.PI / 2, attackerHeading: -Math.PI / 2, knowledge: true,
      orders: { A: RUN }, inputs: [{ t: c.withdraw, side: 'A', verb: 'preset', arg: 'fire' }, { t: c.again, side: 'A', verb: 'preset', arg: RUN }],
    });
    const sep = () => Math.hypot(mainBody(b.attacker).x[0] - mainBody(b.target).x[0], mainBody(b.attacker).x[1] - mainBody(b.target).x[1]);
    const d = [], order = [];
    let last = sep();
    let shrink = null;
    while (b.step < 3000 && !b.ended) {
      const n = b.step;
      tick(b);
      const x = sep();
      if (n >= 958 && !(x > last) && shrink === null) shrink = n + 1;
      last = x;
      d.push(x);
      order.push(b.attacker.helm.disengageStep);
    }
    const passed = d.findIndex((x) => x > 3000) + 1;
    const nulls = order.map((x, k) => (x === null ? k : -1)).filter((k) => k >= 0);
    return { passed, shrink, cleared: nulls.length ? [nulls[0], nulls[nulls.length - 1]] : null, againStep: order[1500] ?? null, end: b.ended ? { kind: b.ended.kind, side: b.ended.side, step: b.ended.step } : null, steps: b.step };
  },
  compare(e, a) {
    const checks = {
      'passes 3000 m at the hand-worked step': a.passed === e.passed,
      'growing on every step after it': a.shrink === null,
      'the order cleared over [1200, 1499] and standing again from 1500': !!a.cleared && a.cleared[0] === e.cleared[0] && a.cleared[1] === e.cleared[1] && a.againStep === e.again,
      'escaped (side A) at 2101 exactly, not earlier': !!a.end && a.end.kind === 'escaped' && a.end.side === 'A' && a.end.step === e.escaped,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    return { expected: `passes at ${e.passed}; speed away at the withdrawal ${e.speed.toFixed(1)} m/s, at most ${e.braking.toFixed(1)} m/s taken off; cleared ${e.cleared.join('-')}, again from ${e.again}; escaped at ${e.escaped}`, actual: `passes at ${a.passed}; ${a.shrink === null ? 'growing throughout' : `stops growing at ${a.shrink}`}; cleared ${a.cleared ? a.cleared.join('-') : '-'}, again from ${a.againStep}; end ${a.end ? `${a.end.kind} ${a.end.side} at ${a.end.step}` : `none by ${a.steps}`}` };
  },
};
