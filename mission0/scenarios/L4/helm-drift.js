import { createBattle, tick, mainBody } from '../../../js/battle.js';
import { readout } from '../../../js/rooms.js';
import { TARGETS } from '../../targets.js';

// H16 of the L5 plan (DESIGN.md 13n.4, 13n.1 (d), #302, #306): the range order engaging on a dodge's drift, the
// player's dodge interval, and a ship with no RCS couple. #302: the range order engages when the distance e to its
// point exceeds helm.rangeBand (100 m) or the relative velocity's error |w* - w| exceeds a t180 (a dodge's drift), w*
// the braking curve's velocity toward the point, |w*| = a (sqrt(2 e / a + t180^2) - t180). Dodging (#301, #240 (3)):
// broadside the helm turns to the other beam with the engine open, flipping every (helm.dodgeMin + helm.dodgeMax) / 2
// for the player. #306 (8): a ship with thrust and no RCS couple (t180 infinite) cannot point its engine: the range
// order does not engage and the heading holds; no NaN.
//
// Setup (T1): createBattle with knowledge on; the helmed ship (A) on bearing -y of a static R1d (T, no helm, heading 0,
// at rest) at battle.openingRange (900 m), at rest. (drift-R1, drift-R1d) R1 at throttle 0.5 / R1d at throttle 0.25,
// orders range hold (900 m), position flank (its point is where it starts: e = 0), facing broadside, dodging on,
// weapons held (heat discipline threshold 0), its heading pi at undock (broadside: the line of sight is +pi/2 and the
// first dodge side is los + pi/2, so it pushes from step 1 with no turn); until it engages or 30 s. (flip) R1 with the
// same orders at throttle 0 (the engine closed: a = 0, the range order never takes the helm, so the dodge runs every
// step); 1900 steps. (no-couple) R1 with its four RCS removed (validated), orders range close (600 m: e0 = 300 m >
// the band), position flank, facing bow, throttle 1; 600 steps.
// Hand-worked (the integrator's sum, #301 (3): from rest after n steps v = a dt n, x = a dt^2 n (n + 1) / 2; the helm
// at step n reads the state after n steps): a = 15 MN / 911 234 kg x 0.5 = 8.2306 m/s^2 (R1), 15 MN / 1 421 484 kg x
// 0.25 = 2.6381 m/s^2 (R1d); t180 = 2 sqrt(pi / alpha), alpha the smaller RCS couple over the moment of inertia, from
// the readout at undock (kernel-read, labelled: R1 4.843 s, R1d 8.074 s). The dodge pushes across the line of sight,
// so e = x and the braking velocity points back at the point: the error is v + a (sqrt(2 x / a + t180^2) - t180). The
// order engages on the first n where that exceeds a t180 while x <= 100 m (by the drift, not the band): computed here
// from the sum, step by step. (flip) the sign flips at t >= 10 s, 20 s, 30 s: steps 600, 1200, 1800, exact. (no-couple)
// never engaged; the heading, the range order's numbers and the body's position never NaN.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const DODGER = { range: 'hold', position: 'flank', facing: 'broadside', dodging: 'on', heat: { threshold: 0, response: 'weapons' } };
const MASS = { R1: 911234, R1d: 1421484 };
const NO_RCS = { rooms: TARGETS.R1.rooms, fittings: TARGETS.R1.fittings.filter((f) => f[0] !== 'rcs') };

export default {
  id: 'L4.helm.drift',
  level: 'L4',
  laws: ['the range order engages when the relative velocity\'s error exceeds a t180 (a dodge\'s drift), not only beyond helm.rangeBand (#302)', 'the player dodges at the midpoint (helm.dodgeMin + helm.dodgeMax) / 2 (#240 (3), #301)', 'a ship with no RCS couple does not engage the range order; no NaN (#306 (8))'],
  dependsOn: ['L4.helm.range', 'L4.helm.dodge'],
  setup: 'T1: createBattle, knowledge on; R1 (throttle 0.5) or R1d (0.25) dodging broadside at its flank point 900 m from a static R1d, heading pi (no turn); R1 dodging at throttle 0 (the flips); R1 without RCS ordered close at throttle 1 (13n.4 H16)',
  measure: 'the first step the helm is engaged and its e and error there; the steps the dodge side flips; for the ship without RCS every step\'s engagement and whether any number is NaN',
  tolerance: 'steps exact; the hand-worked step\'s margins printed (the error against a t180 at n - 1 and n)',
  criterion: '(drift-R1, drift-R1d) the range order engages first at the hand-worked step (the first n with v_n + |w*(x_n)| > a t180, x_n <= helm.rangeBand) with mode range and e within the band, never before; (flip) the side flips at steps 600, 1200 and 1800 exactly; (no-couple) never engaged, no NaN',
  tunable: ['helm.rangeBand', 'helm.dodgeMin', 'helm.dodgeMax', 'engine.thrust', 'rcs.force'],
  locked: null,
  cases() {
    return [{ name: 'drift-R1', ship: 'R1', throttle: 0.5 }, { name: 'drift-R1d', ship: 'R1d', throttle: 0.25 }, { name: 'flip', ship: 'R1', throttle: 0 }, { name: 'no-couple', ship: 'R1', throttle: 1 }];
  },
  expected(ctx, c) {
    const dt = ctx.dt, band = ctx.scaled(ctx.params.helm.rangeBand, 5);
    if (c.name === 'flip') {
      const half = (ctx.params.helm.dodgeMin.value + ctx.params.helm.dodgeMax.value) / 2;
      return { flips: [1, 2, 3].map((k) => Math.round((k * half) / dt)) };
    }
    if (c.name === 'no-couple') return { never: true };
    // t180 from the readout at undock (kernel-read, labelled); a from the engine's thrust over the ship's mass.
    const b = createBattle({ params: ctx.params, attacker: TARGETS[c.ship], target: TARGETS.R1d, knowledge: true });
    const r = readout(b.attacker.world), t180 = 2 * Math.sqrt(Math.PI / Math.min(r.rcs.ccw, r.rcs.cw));
    const a = (15e6 / MASS[c.ship]) * c.throttle, thr = a * t180;
    const err = (n) => { const v = a * dt * n, x = (a * dt * dt * n * (n + 1)) / 2; return { x, error: v + a * (Math.sqrt((2 * x) / a + t180 * t180) - t180) }; };
    let n = 0;
    while (!(err(n).error > thr) && err(n).x <= band) n++;
    return { step: n, x: err(n).x, error: err(n).error, before: err(n - 1).error, thr, t180, a, byDrift: err(n).x <= band };
  },
  run(ctx, c) {
    const ship = c.name === 'no-couple' ? NO_RCS : TARGETS[c.ship];
    const orders = c.name === 'no-couple' ? { range: 'close', position: 'flank', facing: 'bow', dodging: 'off', heat: { threshold: 0, response: 'weapons' }, throttle: 1 } : { ...DODGER, throttle: c.throttle };
    const b = createBattle({ params: ctx.params, tier: 'T1', attacker: ship, target: TARGETS.R1d, bearing: '-y', knowledge: true, orders: { A: orders }, ...(c.name === 'no-couple' ? {} : { attackerHeading: Math.PI }) });
    const A = b.attacker, h = A.helm;
    if (c.name === 'flip') {
      const flips = [];
      let sign = h.dodgeSign;
      while (b.step < 1900 && !b.ended) { const n = b.step; tick(b); if (h.dodgeSign !== sign) { flips.push(n); sign = h.dodgeSign; } if (h.engaged) return { flips, engaged: n }; }
      return { flips, engaged: null };
    }
    if (c.name === 'no-couple') {
      let engaged = 0, nan = 0;
      while (b.step < 600 && !b.ended) {
        tick(b);
        if (h.engaged) engaged++;
        const me = mainBody(A), nums = [A.heading, me.theta, ...me.x, ...me.v, h.range.e, ...h.range.want, ...h.range.rel, h.range.error, h.range.threshold, h.range.letGo];
        if (nums.some((x) => Number.isNaN(x))) nan++;
      }
      return { engaged, nan, steps: b.step, t180: h.range.threshold === Infinity };
    }
    while (b.step < 1800 && !b.ended) {
      const n = b.step;
      tick(b);
      if (h.engaged) return { step: n, mode: h.mode, e: h.range.e, error: h.range.error, threshold: h.range.threshold };
    }
    return { step: null };
  },
  compare(e, a, c) {
    let checks;
    if (c.name === 'flip') checks = { 'the side flips at 600, 1200, 1800 exactly': a.flips.join(',') === e.flips.join(','), 'the range order never takes the helm (engine closed)': a.engaged === null };
    else if (c.name === 'no-couple') checks = { 'never engaged': a.engaged === 0 && a.steps === 600, 'no NaN': a.nan === 0, 't180 infinite (no couple)': a.t180 };
    else checks = { 'the hand-worked step engages by the drift (x within the band)': e.byDrift, 'first engaged at the hand-worked step, not before': a.step === e.step, 'mode range, e within the band there': a.mode === 'range' && a.e <= 100 };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    if (r.case.name === 'flip') return { expected: `flips at ${e.flips.join(', ')}`, actual: `flips at ${a.flips.join(', ')}; engaged ${a.engaged === null ? 'never' : `at ${a.engaged}`}` };
    if (r.case.name === 'no-couple') return { expected: 'never engaged, no NaN', actual: `engaged ${a.engaged} of ${a.steps} steps; NaN steps ${a.nan}; t180 infinite ${a.t180 ? 'yes' : 'no'}` };
    return { expected: `step ${e.step} (a ${e.a.toFixed(4)} m/s^2, t180 ${e.t180.toFixed(3)} s kernel-read, a t180 ${e.thr.toFixed(3)} m/s; error ${e.before.toFixed(3)} at n - 1, ${e.error.toFixed(3)} at n; x ${e.x.toFixed(2)} m)`, actual: a.step === null ? 'never engaged' : `step ${a.step}, mode ${a.mode}, e ${a.e.toFixed(2)} m, error ${a.error.toFixed(3)} against ${a.threshold.toFixed(3)} m/s (kernel-read)` };
  },
};
