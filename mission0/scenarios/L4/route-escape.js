import { createBattle, tick, mainBody } from '../../../js/battle.js';
import { setActive } from '../../../js/rooms.js';
import { TARGETS, SENSOR_SHIPS } from '../../targets.js';

// H11 of the L5 plan (DESIGN.md 13n.4, 13n.1 (d), #293, #301 (3) (4)): escape. A side whose movement order is
// disengage thrusts away along the line of sight, stern to the enemy, and escapes when the separation has exceeded
// battle.cullDistance (3000 m) and kept growing for battle.disabledSeconds (600 steps) counted only beyond it: the
// 'escaped' end at the 600th widening step after the step it passes 3000 m. The enemy orders disengage when its heat or
// its buffer crosses its caution threshold while it still has thrust and resolve < 0.5.
//
// Setup (T1): createBattle with knowledge on; the runner R1 (A, a helm: range disengage, weapons held by heat
// discipline 0, throttle 1) 900 m from R1d on its -y side, at rest, stern-on (heading -pi/2: no turn); until the end or
// 120 s. Cases: (still) R1d static, its engine off; (chase) R1d static with its heading -pi/2 (its bow on R1) and its
// engine at throttle 1 (a case's input: "thrusting after it", as §13n.3 (11) drives it, no weapon fired); (intact-up)
// R1d with a helm on the preset Fire (hold, bow-on, firing in range), R1's shield up; (intact-down) the same with R1's
// shield generator switched off. (resolve-0.25, resolve-0.75) the enemy R1-A (T; aggression and caution 0.5, patience
// 0) with its shield buffer drained to 0 at undock, against a static R1d (A, it never fires), 2 s.
// Hand-worked (the integrator's sum, #301 (3): from rest after n steps x = a dt^2 n (n + 1) / 2): a = 15 MN / 911 234
// kg = 16.4612 m/s^2 (R1 away from a still pursuer); 15 MN / 911 234 - 15 MN / 1 421 484 = 5.9088 m/s^2 (against R1d
// thrusting after it). The separation passes 3000 m when x > 2100 m: n (n + 1) > 2 x 2100 x 3600 / a: step 958 (still,
// 958 x 959 = 918 722 > 918 520.7) and 1600 (chase); the escape 600 steps later, 1558 and 2200, exact. The intact
// pursuer's cases are kernel-read and labelled (#301 (4): the helm decides whether it catches the runner); their
// criterion: 'escaped' ends the battle on the first step the rule's condition holds on the separation series recorded
// here (each step's separation of the two flown bodies' centres of mass) and never before (a battle that ends otherwise
// or not at all holds the condition at no step). (resolve-0.25) the first decision (step 0) orders disengage (buffer 0 <
// caution 0.5, thrust left, resolve < 0.5) and the helm flies it from that step; (resolve-0.75) it does not (Evade).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const RUN = { range: 'disengage', heat: { threshold: 0, response: 'weapons' }, throttle: 1 };

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
  id: 'L4.route.escape',
  level: 'L4',
  laws: ['a side ordered disengage escapes when the separation beyond battle.cullDistance has grown for battle.disabledSeconds counted beyond it (#293, 13n.1 (d))', 'the enemy orders disengage at resolve < 0.5 when heat or buffer crosses its caution (#293)'],
  dependsOn: ['L4.route.emp'],
  setup: 'T1: createBattle, knowledge on; R1 ordered disengage, 900 m from R1d on its -y side, stern-on, at rest; R1d still, thrusting after it, or with a helm on Fire (R1\'s shield up or off); the enemy R1-A at resolve 0.25 / 0.75 with its buffer drained (13n.4 H11)',
  measure: 'the step the separation passes 3000 m and the escaped end; the rule recomputed on the recorded series; the enemy\'s disengage order',
  tolerance: 'steps exact',
  criterion: '(still) passes at 958, escaped at 1558; (chase) 1600, 2200; (intact-up, intact-down) escaped exactly at the first step the rule holds on the recorded series, or not at all if it never holds (kernel-read, labelled); (resolve-0.25) disengage ordered at step 0 and flown; (resolve-0.75) not ordered',
  tunable: ['battle.cullDistance', 'battle.disabledSeconds', 'engine.thrust'],
  locked: null,
  cases() {
    return [{ name: 'still' }, { name: 'chase' }, { name: 'intact-up' }, { name: 'intact-down' }, { name: 'resolve-0.25', resolve: 0.25 }, { name: 'resolve-0.75', resolve: 0.75 }];
  },
  expected(ctx, c) {
    const dt = ctx.dt, a1 = 15e6 / 911234, a2 = 15e6 / 1421484;
    const pass = (a) => { let n = 1; while (!(a * dt * dt * n * (n + 1) / 2 > 2100)) n++; return n; };
    if (c.name === 'still') return { passed: pass(a1), escaped: pass(a1) + 600 };
    if (c.name === 'chase') return { passed: pass(a1 - a2), escaped: pass(a1 - a2) + 600 };
    if (c.resolve !== undefined) return { disengage: c.resolve < 0.5 };
    return { rule: true };
  },
  run(ctx, c) {
    if (c.resolve !== undefined) {
      const b = createBattle({ params: ctx.params, tier: 'T1', attacker: TARGETS.R1d, target: SENSOR_SHIPS['R1-A'], bearing: '-y', knowledge: true, enemy: { T: { aggression: 0.5, patience: 0, caution: 0.5, resolve: c.resolve } }, setup: { target: (w, room) => { room('shield').shield.buffer = 0; } } });
      const modes = [];
      while (b.step < 120 && !b.ended) { tick(b); modes.push(b.target.helm.mode); }
      return { disengage: b.target.helm.disengage, at: b.target.helm.disengageStep, flown: modes[0] === 'disengage' && modes.every((m) => m === 'disengage'), first: b.target.enemy.decisions[0] };
    }
    const intact = c.name.startsWith('intact');
    const b = createBattle({
      params: ctx.params, tier: 'T1', attacker: TARGETS.R1, target: TARGETS.R1d, bearing: '+x', targetHeading: -Math.PI / 2, attackerHeading: -Math.PI / 2, knowledge: true,
      orders: { A: RUN, ...(intact ? { T: 'fire' } : {}) },
      setup: { ...(c.name === 'chase' ? { target: (w, room) => { room('engine').engine.throttle = 1; } } : {}), ...(c.name === 'intact-down' ? { attacker: (w, room) => setActive(w, room('shield'), false) } : {}) },
    });
    const d = [];
    while (b.step < 7200 && !b.ended) { tick(b); d.push(Math.hypot(mainBody(b.attacker).x[0] - mainBody(b.target).x[0], mainBody(b.attacker).x[1] - mainBody(b.target).x[1])); }
    const r = ruleStep(d, 3000, 600), passed = d.findIndex((x) => x > 3000);
    return { passed: passed < 0 ? null : passed + 1, end: b.ended ? { kind: b.ended.kind, side: b.ended.side, step: b.ended.step } : null, rule: r, steps: b.step, peak: Math.max(...d) };
  },
  compare(e, a, c) {
    let checks;
    if (c.resolve !== undefined) checks = { 'disengage ordered iff resolve < 0.5': a.disengage === e.disengage, 'ordered at the first decision and flown from it': !e.disengage || (a.at === 0 && a.flown) };
    else if (e.rule) checks = { 'escaped exactly at the first step the rule holds, never before': a.rule ? a.end && a.end.kind === 'escaped' && a.end.side === 'A' && a.end.step === a.rule.step : !(a.end && a.end.kind === 'escaped') };
    else checks = { 'passes 3000 m at the step': a.passed === e.passed, 'escaped (side A) at the step': a.end && a.end.kind === 'escaped' && a.end.side === 'A' && a.end.step === e.escaped, 'the rule on the series agrees': a.rule && a.rule.step === e.escaped };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    if (r.case.resolve !== undefined) return { expected: `disengage ${e.disengage ? 'ordered' : 'not ordered'}`, actual: `disengage ${a.disengage ? `ordered at step ${a.at}` : 'not ordered'}; first decision ${a.first.preset}, buffer ${a.first.buffer.toFixed(3)}` };
    return { expected: e.rule ? 'escaped at the rule\'s first step (kernel-read)' : `passes at ${e.passed}, escaped at ${e.escaped}`, actual: `passes at ${a.passed}; end ${a.end ? `${a.end.kind} ${a.end.side} at step ${a.end.step}` : `none by step ${a.steps}`}; the rule's step ${a.rule ? a.rule.step : 'none'}; peak ${a.peak.toFixed(1)} m (kernel-read)` };
  },
};
