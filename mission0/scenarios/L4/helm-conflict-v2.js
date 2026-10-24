import { createBattle, tick } from '../../../js/battle.js';
import { TARGETS, SENSOR_SHIPS } from '../../targets.js';

// L5e1 J2 (DESIGN.md 13n.8, 13n.1 (d) "The position law", #315): the successor of L4.helm.conflict, the four cases
// kept, the stern case's heading and throttle worked from the position law: the wanted point rides the circle of R*
// about the other ship, moved from the own bearing phi toward the named one phi* by at most helm.positionLead (60 deg):
// phi_P = phi + clamp(wrap(phi* - phi), +-lead). The other three are unchanged (their point is where R1-A starts).
// H3 of the L5 plan (DESIGN.md 13n.4, 13n.1 (d), #40, #301 (2)): helm conflicts resolve as position, then facing, then
// dodging; each is a wanted heading or thrust and the later yields where they disagree; dodging is broadside only
// (bow-on it yields to facing).
//
// Setup (T1): createBattle with knowledge on; R1-A with a helm on bearing -y of a static R1 (heading 0, at rest) at
// 900 m, at rest, bow-on (heading pi/2: the line of sight from R1-A to R1 is +y); weapons held (heat discipline
// threshold 0, response weapons), throttle 1, range hold (900 m); 10 s (600 steps). Cases:
//   (stern) position stern, facing bow, dodging on: R1-A sits at (x_T, y_T - 900), its bearing from R1 phi = -pi / 2;
//     the named bearing is R1's stern, phi* = pi; wrap(phi* - phi) = wrap(3 pi / 2) = -pi / 2, clamped to -pi / 3:
//     phi_P = -pi / 2 - pi / 3 = -5 pi / 6, P = (x_T - 900 cos(pi / 6), y_T - 900 sin(pi / 6)) = (x_T - 779.4, y_T - 450);
//     P - R1-A = 900 (-sqrt(3) / 2, 1 / 2): e = 900 m, and at rest the error |w*| = 16.461 x (sqrt(2 x 900 / 16.461 +
//     4.843^2) - 4.843) = 110.0 m/s exceeds a t180 = 79.7 m/s (R1's numbers, H2): the movement order wins: the wanted
//     heading is the direction from R1-A to P, atan2(1 / 2, -sqrt(3) / 2) = 5 pi / 6, and the engine opens at
//     cos(5 pi / 6 - pi / 2) = cos(pi / 3) = 0.5 at the first step (the lead designer's probe, #315: 5 pi / 6, 0.5);
//   (bow-dodge) position flank, facing bow, dodging on: R1-A is at the flank point (e = 0): facing wins: the wanted
//     heading is the line of sight pi / 2, and dodging yields (bow-on): the engine stays shut the whole 10 s;
//   (broadside-dodge) position flank, facing broadside, dodging on: dodging takes the beam pi / 2 + pi / 2 = pi (its
//     side +1 at the start) with the engine at the throttle x max(0, cos of the heading error): 0 at the first step
//     (cos(pi / 2)), and open once R1-A has turned (the engine opens within the 10 s);
//   (broadside) position flank, facing broadside, dodging off: the nearer beam (sin(pi/2 - pi/2) = 0 >= 0: +1) pi with
//     the engine shut the whole 10 s.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const angle = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

export default {
  id: 'L4.helm.conflict.v2',
  level: 'L4',
  laws: ['helm conflicts resolve position, then facing, then dodging: the later yields where they disagree (#40)', 'the position law: the point on the circle of R*, at most helm.positionLead from the own bearing toward the named one (#315)', 'dodging is broadside only: bow-on it yields to facing (#40, #237, #301 (2))'],
  dependsOn: ['L4.helm.range'],
  setup: 'T1: createBattle, knowledge on; R1-A with a helm (weapons held, throttle 1, range hold) on bearing -y of a static R1 at 900 m, bow-on; position stern / flank, facing bow / broadside, dodging on / off; 10 s (13n.4 H3; 13n.8 J2)',
  measure: 'the wanted heading and the throttle the helm sets at the first step; the largest throttle over the 10 s; the mode',
  tolerance: 'headings 1e-9 rad; the throttle 1e-9',
  criterion: '(stern) heading 5 pi / 6, throttle 0.5 (cos pi / 3), mode range; (bow-dodge) heading pi / 2, throttle 0 throughout; (broadside-dodge) heading pi, throttle 0 at the first step and above 0 within the 10 s, mode dodge; (broadside) heading pi, throttle 0 throughout, mode broadside',
  tunable: ['helm.rangeHold', 'helm.positionLead', 'engine.thrust', 'rcs.force'],
  locked: { date: '2026-10-24', hash: 'c28f3f43' },
  cases() {
    return [
      { name: 'stern', position: 'stern', facing: 'bow', dodging: 'on' },
      { name: 'bow-dodge', position: 'flank', facing: 'bow', dodging: 'on' },
      { name: 'broadside-dodge', position: 'flank', facing: 'broadside', dodging: 'on' },
      { name: 'broadside', position: 'flank', facing: 'broadside', dodging: 'off' },
    ];
  },
  expected(ctx, c) {
    return {
      stern: { heading: (5 * Math.PI) / 6, throttle0: Math.cos(Math.PI / 3), opens: true, mode: 'range' },
      'bow-dodge': { heading: Math.PI / 2, throttle0: 0, opens: false, mode: 'bow' },
      'broadside-dodge': { heading: Math.PI, throttle0: 0, opens: true, mode: 'dodge' },
      broadside: { heading: Math.PI, throttle0: 0, opens: false, mode: 'broadside' },
    }[c.name];
  },
  run(ctx, c) {
    const orders = { range: 'hold', position: c.position, facing: c.facing, dodging: c.dodging, heat: { threshold: 0, response: 'weapons' }, throttle: 1 };
    const b = createBattle({ params: ctx.params, tier: 'T1', attacker: SENSOR_SHIPS['R1-A'], target: TARGETS.R1, bearing: '-y', knowledge: true, orders: { A: orders } });
    const A = b.attacker;
    tick(b);
    const first = { heading: A.heading, throttle: A.helm.throttle, mode: A.helm.mode };
    let most = first.throttle;
    while (b.step < 600 && !b.ended) { tick(b); most = Math.max(most, A.helm.throttle); }
    return { ...first, most };
  },
  compare(e, a) {
    const checks = {
      'the wanted heading (1e-9 rad)': angle(a.heading, e.heading) <= 1e-9,
      'the throttle at the first step (1e-9)': Math.abs(a.throttle - e.throttle0) <= 1e-9,
      'the mode': a.mode === e.mode,
      'the engine opens within 10 s iff expected': (a.most > 0) === e.opens,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: `heading ${r.expected.heading.toFixed(6)}, throttle ${r.expected.throttle0.toFixed(5)}, ${r.expected.mode}, engine ${r.expected.opens ? 'opens' : 'shut'}`, actual: `heading ${r.actual.heading.toFixed(6)}, throttle ${r.actual.throttle.toFixed(5)}, ${r.actual.mode}, most ${r.actual.most.toFixed(5)}` };
  },
};
