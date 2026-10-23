import { createBattle, tick, mainBody } from '../../../js/battle.js';
import { readout } from '../../../js/rooms.js';
import { TARGETS } from '../../targets.js';

// H15 of the L5 plan (DESIGN.md 13n.4, 13n.1 (d), #307, superseding #306 (3)): the style slot. Hold wants no
// tangential relative velocity and keeps #302's tests; orbit wants v_t = helm.rangeBand / t180 counter-clockwise about
// the other ship, strafe the same with its sense flipped on the dodge schedule (the player's: every (helm.dodgeMin +
// helm.dodgeMax) / 2); with either the position slot is ignored (the point rides the line of sight at R*) and the range
// order engages when the relative velocity's deviation from (rdot*, v_t) is at least v_t, and lets go when it is at
// most a dt.
//
// Setup (T1): createBattle with knowledge on; R1 (A, a helm: range hold (900 m), position flank, facing bow, dodging
// off, weapons held by heat discipline 0, throttle 0.5) on bearing -y of a static R1d (T, no helm, heading 0) at
// battle.openingRange (900 m), both at rest; style hold, orbit or strafe; 60 s (3600 steps).
// Hand-worked: at rest at its point (e = 0, rdot* = 0) the deviation from (0, v_t) is |v_t| itself, so orbit and
// strafe engage on the helm's first step (step 0, before the first tick); hold's error is 0 and e = 0 is inside the
// band, so it never engages (#302). v_t = band / t180, t180 = 2 sqrt(pi / alpha) from the readout at undock
// (kernel-read, labelled: 4.843 s, v_t 20.6 m/s); orbit's bearing about R1d then turns at about v_t / R* = 1.31 deg/s
// (printed, kernel-read). Strafe's sense flips at t >= 10, 20, ..., 50 s: steps 600, 1200, 1800, 2400, 3000, exact.
// Kernel-read and labelled: the bearing of R1 from R1d each step (the flown bodies' centres of mass); for orbit, every
// step's change is above minus one step's change of the relative velocity's sweep, a dt^2 / R* (it never turns back),
// and the total over 60 s is counter-clockwise; the mean tangential speed (printed). Hold: the tangential relative
// speed stays under band / t180 and the range order never engages.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L4.helm.style',
  level: 'L4',
  laws: ['style hold keeps #302; orbit wants v_t = helm.rangeBand / t180 counter-clockwise, strafe the same flipping on the dodge schedule; with either the position slot is ignored and the order engages at a deviation of at least v_t (#307)'],
  dependsOn: ['L4.helm.range', 'L4.helm.drift'],
  setup: 'T1: createBattle, knowledge on; R1 (range hold, position flank, facing bow, weapons held, throttle 0.5) at rest 900 m on bearing -y of a static R1d; style hold, orbit or strafe; 60 s (13n.4 H15)',
  measure: 'the first step the range order is engaged; each step\'s bearing of R1 from R1d and its change; the tangential relative speed; the steps strafe\'s sense flips',
  tolerance: 'steps exact; the bearing\'s change against a dt^2 / R*',
  criterion: 'hold: never engaged, the tangential relative speed under band / t180 throughout; orbit and strafe: engaged at the helm\'s first step (step 0); orbit: the bearing never turns clockwise by more than a dt^2 / R* in a step and has advanced counter-clockwise after 60 s (kernel-read, labelled); strafe: its sense flips at 600, 1200, 1800, 2400 and 3000 exactly',
  tunable: ['helm.rangeBand', 'helm.rangeHold', 'helm.dodgeMin', 'helm.dodgeMax', 'rcs.force'],
  locked: null,
  cases() {
    return [{ style: 'hold' }, { style: 'orbit' }, { style: 'strafe' }];
  },
  expected(ctx, c) {
    const b = createBattle({ params: ctx.params, attacker: TARGETS.R1, target: TARGETS.R1d, knowledge: true });
    const r = readout(b.attacker.world), t180 = 2 * Math.sqrt(Math.PI / Math.min(r.rcs.ccw, r.rcs.cw)), a = r.accelerationG * 9.80665 * 0.5;
    const band = ctx.scaled(ctx.params.helm.rangeBand, 5), R = ctx.scaled(ctx.params.helm.rangeHold, 5), vt = band / t180;
    const half = (ctx.params.helm.dodgeMin.value + ctx.params.helm.dodgeMax.value) / 2;
    return { t180, vt, rate: (vt / R) * (180 / Math.PI), back: (a * ctx.dt * ctx.dt) / R, first: c.style === 'hold' ? null : 0, flips: c.style === 'strafe' ? [1, 2, 3, 4, 5].map((k) => Math.round((k * half) / ctx.dt)) : [] };
  },
  run(ctx, c) {
    const orders = { range: 'hold', position: 'flank', style: c.style, facing: 'bow', dodging: 'off', heat: { threshold: 0, response: 'weapons' }, throttle: 0.5 };
    const b = createBattle({ params: ctx.params, tier: 'T1', attacker: TARGETS.R1, target: TARGETS.R1d, bearing: '-y', knowledge: true, orders: { A: orders } });
    const A = b.attacker, T = b.target, h = A.helm;
    const bearing = () => { const me = mainBody(A), th = mainBody(T); return Math.atan2(me.x[1] - th.x[1], me.x[0] - th.x[0]); };
    let prev = bearing(), total = 0, minStep = 0, first = null, sign = h.strafeSign, maxTan = 0, sumTan = 0;
    const flips = [];
    while (b.step < 3600 && !b.ended) {
      const n = b.step;
      tick(b);
      if (h.engaged && first === null) first = n;
      if (h.strafeSign !== sign) { flips.push(n); sign = h.strafeSign; }
      const x = bearing();
      let d = x - prev;
      d -= 2 * Math.PI * Math.round(d / (2 * Math.PI));
      total += d; minStep = Math.min(minStep, d); prev = x;
      const me = mainBody(A), th = mainBody(T), D = [me.x[0] - th.x[0], me.x[1] - th.x[1]], L = Math.hypot(D[0], D[1]);
      const tan = ((me.v[0] - th.v[0]) * -D[1] + (me.v[1] - th.v[1]) * D[0]) / L; // counter-clockwise positive
      maxTan = Math.max(maxTan, Math.abs(tan)); sumTan += tan;
    }
    return { first, total: (total * 180) / Math.PI, minStep, flips, maxTan, meanTan: sumTan / b.step, steps: b.step };
  },
  compare(e, a, c) {
    let checks;
    if (c.style === 'hold') checks = { 'never engaged': a.first === null && a.steps === 3600, 'the tangential relative speed under band / t180': a.maxTan < e.vt };
    else {
      checks = { 'engaged at the helm\'s first step': a.first === e.first };
      if (c.style === 'orbit') {
        checks['never turns clockwise by more than a dt^2 / R* in a step'] = a.minStep >= -e.back;
        checks['advanced counter-clockwise after 60 s (kernel-read)'] = a.total > 0;
      } else checks['the sense flips at 600, 1200, 1800, 2400, 3000'] = a.flips.join(',') === e.flips.join(',');
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    return {
      expected: `${e.first === null ? 'never engaged' : 'engaged at step 0'}; v_t ${e.vt.toFixed(2)} m/s (t180 ${e.t180.toFixed(3)} s kernel-read), about ${e.rate.toFixed(3)} deg/s at R*${e.flips.length ? `; flips at ${e.flips.join(', ')}` : ''}`,
      actual: `first engaged ${a.first === null ? 'never' : `at step ${a.first}`}; bearing turned ${a.total.toFixed(2)} deg in ${a.steps} steps (${(a.total / (a.steps / 60)).toFixed(3)} deg/s), smallest step ${a.minStep.toExponential(2)} rad; tangential speed mean ${a.meanTan.toFixed(2)}, max |${a.maxTan.toFixed(2)}| m/s${a.flips.length ? `; flips at ${a.flips.join(', ')}` : ''} (kernel-read)`,
    };
  },
};
