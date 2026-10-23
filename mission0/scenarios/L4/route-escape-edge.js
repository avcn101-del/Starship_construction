import { createBattle, tick, mainBody } from '../../../js/battle.js';
import { TARGETS, SENSOR_SHIPS } from '../../targets.js';

// H18 of the L5 plan (DESIGN.md 13n.4, 13n.1 (d), #293, #306 (7)): escape's edges. The escape rule (#293): the
// separation of the two flown bodies' centres of mass beyond battle.cullDistance (3000 m) and growing for
// battle.disabledSeconds (600 steps) counted only beyond it; a step on which it does not grow resets the count (a
// loop-around at the edge is not an escape); the side whose disengage order stands escapes, and a withdrawn order (a
// preset switch away from it) no longer counts (#306 (7)). The enemy orders disengage only when its heat or its buffer
// crosses its caution threshold (resolve < 0.5, thrust left).
//
// Setup (T1): createBattle with knowledge on. (resolve-intact) the enemy R1-A (T; aggression and caution 0.5,
// patience 0, resolve 0.25) with its buffer intact, against a static R1d (A), 120 steps. (stall) the runner R1d (A, a
// helm: range disengage, weapons held, throttle 1) 3500 m from R1 on its -y side, both at rest, R1d stern-on (heading
// -pi/2, no turn), R1 bow-on to it (heading -pi/2, no helm); R1's engine at throttle 1 for steps 121-600 (a case's
// input, set before the ticks of steps 120 and 600: it thrusts after the runner for 8 s, then stops); until the end
// or 3000 steps. (withdrawn) the runner R1 (the same orders) 900 m from a still R1d on its -y side, stern-on, as
// L4.route.escape's still case (passes 3000 m at step 958); the verb preset Fire at t = 20 s (step 1200), withdrawing
// disengage; 2400 steps.
// Hand-worked (the integrator's sum, #301 (3): v_n = v_{n-1} + a_n dt, s_n = s_{n-1} + v_n dt; the separation grows
// on step n iff its relative velocity v_n > 0): (stall) a_n = a_D = 15 MN / 1 421 484 kg = 10.5523 m/s^2 for steps
// n <= 120 and n > 600, a_D - a_R = 10.5523 - 15 MN / 911 234 kg = -5.9088 m/s^2 for 120 < n <= 600, so v_n / dt =
// a_D n - a_R (min(n, 600) - 120): it grows on steps 1-334 (a_R 120 / (a_R - a_D) = 334.3), falls on steps 335-748,
// grows again from 749 (a_R 480 / a_D = 748.8); the separation stays above 3000 m throughout (its minimum is computed
// here, about 3468 m); the count restarts at 749 and escaped falls 600 steps after the last stalled step 748: step
// 1348 (a rule that did not reset would escape at 1015: 333 widening steps before the stall + 267 after). Computed
// here step by step from the sum. (withdrawn) without the withdrawal the rule holds at 1558 (L4.route.escape); with it,
// no escape in 2400 steps, the runner's disengage step cleared from the step of the verb, while the recorded series
// still satisfies the rule's condition at some step (the case exercises it). (resolve-intact) no disengage: buffer 1
// is not below caution 0.5 and the heat fraction 0 is not above it.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const RUN = { range: 'disengage', heat: { threshold: 0, response: 'weapons' }, throttle: 1 };
const K = 120, K2 = 600;

/** The rule on a separation series d[k] (after step k + 1): the step escaped is due, or null. */
function ruleStep(d, D, need) {
  let passed = null, widening = 0, last = null;
  for (let k = 0; k < d.length; k++) {
    const step = k + 1, x = d[k];
    if (!(x > D)) { passed = null; widening = 0; } else if (passed === null) { passed = step; widening = 0; } else if (x > last) widening++; else { passed = step; widening = 0; }
    last = x;
    if (widening >= need) return { passed, step };
  }
  return null;
}

export default {
  id: 'L4.route.escape.edge',
  level: 'L4',
  laws: ['the escape count resets on a step the separation does not grow (#293)', 'a withdrawn disengage no longer counts (#306 (7))', 'the enemy orders disengage only when heat or buffer crosses its caution (#293)'],
  dependsOn: ['L4.route.escape'],
  setup: 'T1: createBattle, knowledge on; the enemy R1-A at resolve 0.25 with its buffer intact (120 steps); R1d ordered disengage 3500 m from R1, R1 thrusting after it for steps 121-600 (3000 steps); R1 ordered disengage from a still R1d at 900 m, the verb preset Fire at 20 s (2400 steps) (13n.4 H18)',
  measure: 'the enemy\'s disengage order; the separation series, the step it stalls, restarts and the escaped end; the runner\'s disengage step after the verb',
  tolerance: 'steps exact',
  criterion: '(resolve-intact) no disengage ordered; (stall) the separation above 3000 m throughout, growing on 1-334, not on 335-748, again from 749, escaped (side A) at 1348 exactly, the rule on the recorded series agreeing; (withdrawn) no escaped end in 2400 steps, the disengage step cleared from step 1200, and the rule\'s condition holding on the recorded series',
  tunable: ['battle.cullDistance', 'battle.disabledSeconds', 'engine.thrust'],
  locked: null,
  cases() {
    return [{ name: 'resolve-intact' }, { name: 'stall' }, { name: 'withdrawn' }];
  },
  expected(ctx, c) {
    if (c.name === 'resolve-intact') return { disengage: false };
    if (c.name === 'withdrawn') return { escaped: null, cleared: 1200 };
    const dt = ctx.dt, aD = 15e6 / 1421484, aR = 15e6 / 911234;
    let v = 0, s = 3500, min = s, grows = [], d = [];
    for (let n = 1; n <= 3000; n++) {
      v += (aD - (n > K && n <= K2 ? aR : 0)) * dt;
      s += v * dt;
      min = Math.min(min, s);
      if (grows.length % 2 === 0 ? v > 0 : !(v > 0)) grows.push(n);
      d.push(s);
    }
    const r = ruleStep(d, 3000, 600);
    return { min, turns: grows.slice(0, 3), escaped: r.step, restart: grows[2] };
  },
  run(ctx, c) {
    if (c.name === 'resolve-intact') {
      const b = createBattle({ params: ctx.params, tier: 'T1', attacker: TARGETS.R1d, target: SENSOR_SHIPS['R1-A'], bearing: '-y', knowledge: true, enemy: { T: { aggression: 0.5, patience: 0, caution: 0.5, resolve: 0.25 } } });
      while (b.step < 120 && !b.ended) tick(b);
      return { disengage: b.target.helm.disengage, at: b.target.helm.disengageStep, first: b.target.enemy.decisions[0] };
    }
    const stall = c.name === 'stall';
    const b = createBattle({
      params: ctx.params, tier: 'T1', attacker: stall ? TARGETS.R1d : TARGETS.R1, target: stall ? TARGETS.R1 : TARGETS.R1d, bearing: '+x', targetHeading: -Math.PI / 2, attackerHeading: -Math.PI / 2, knowledge: true,
      ...(stall ? { distance: 3500 } : {}), orders: { A: RUN }, inputs: stall ? [] : [{ t: 20, side: 'A', verb: 'preset', arg: 'fire' }],
    });
    const engine = b.target.world.rooms.find((r) => r.type === 'engine'), d = [], disengage = [];
    const sep = () => Math.hypot(mainBody(b.attacker).x[0] - mainBody(b.target).x[0], mainBody(b.attacker).x[1] - mainBody(b.target).x[1]), d0 = sep();
    while (b.step < (stall ? 3000 : 2400) && !b.ended) {
      if (stall && b.step === K) engine.engine.throttle = 1; // the case's input: R1 thrusts after the runner for steps K + 1 .. K2
      if (stall && b.step === K2) engine.engine.throttle = 0;
      tick(b);
      d.push(sep());
      disengage.push(b.attacker.helm.disengageStep);
    }
    const turns = [];
    for (let k = 0; k < d.length; k++) { const grew = d[k] > (k ? d[k - 1] : d0); if (turns.length % 2 === 0 ? grew : !grew) turns.push(k + 1); }
    const r = ruleStep(d, 3000, 600);
    return {
      end: b.ended ? { kind: b.ended.kind, side: b.ended.side, step: b.ended.step } : null, rule: r, min: Math.min(...d), turns: turns.slice(0, 3), steps: b.step,
      clearedFrom: stall ? null : disengage.findIndex((x, k) => x === null && disengage.slice(k).every((y) => y === null)), heldBefore: stall ? null : disengage.slice(0, 1200).every((x) => x === 0),
    };
  },
  compare(e, a, c) {
    let checks;
    if (c.name === 'resolve-intact') checks = { 'no disengage ordered': a.disengage === false && a.at === null };
    else if (c.name === 'stall') {
      checks = {
        'above 3000 m throughout': a.min > 3000 && e.min > 3000,
        'grows, stalls and grows again at the hand-worked steps': a.turns.join(',') === e.turns.join(','),
        'escaped (side A) at the hand-worked step': a.end && a.end.kind === 'escaped' && a.end.side === 'A' && a.end.step === e.escaped,
        'the rule on the recorded series agrees': a.rule && a.rule.step === e.escaped,
      };
    } else {
      checks = {
        'no escaped end': !(a.end && a.end.kind === 'escaped') && a.steps === 2400,
        'the disengage step stands before the verb and is cleared from its step': a.heldBefore && a.clearedFrom === e.cleared,
        'the rule\'s condition holds on the recorded series (the case exercises it)': a.rule !== null,
      };
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, e = r.expected, n = r.case.name;
    if (n === 'resolve-intact') return { expected: 'no disengage', actual: `disengage ${a.disengage ? `ordered at ${a.at}` : 'not ordered'}; first decision ${a.first.preset}, buffer ${a.first.buffer.toFixed(3)}, heat ${a.first.heat.toFixed(3)}` };
    if (n === 'stall') return { expected: `grows from ${e.turns[0]}, stalls from ${e.turns[1]}, grows from ${e.turns[2]}; minimum ${e.min.toFixed(1)} m; escaped at ${e.escaped}`, actual: `turns ${a.turns.join(', ')}; minimum ${a.min.toFixed(1)} m; end ${a.end ? `${a.end.kind} ${a.end.side} at ${a.end.step}` : 'none'}; the rule's step ${a.rule ? a.rule.step : 'none'}` };
    return { expected: 'no escape; disengage cleared from step 1200', actual: `end ${a.end ? `${a.end.kind} ${a.end.side} at ${a.end.step}` : `none by ${a.steps}`}; disengage step cleared from step ${a.clearedFrom}; the rule would hold at ${a.rule ? a.rule.step : 'no step'}` };
  },
};
