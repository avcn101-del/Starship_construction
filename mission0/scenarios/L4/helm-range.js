import { createBattle, tick, mainBody } from '../../../js/battle.js';
import { readout } from '../../../js/rooms.js';
import { TARGETS } from '../../targets.js';

// H2 of the L5 plan (DESIGN.md 13n.4, 13n.1 (d), #301 (2), #302): the range order on the braking curve. A side with a
// helm wants the relative velocity w* toward the wanted point P (here on the line of sight, the range R* from the other
// ship: the position order 'flank' with the helmed ship on the other's flank) with |w*| = a (sqrt(2 e / a + t180^2) -
// t180), e the distance to P, a the ship's acceleration at the preset's throttle (here 1), t180 its 180-degree turn on
// the RCS couple. #302 (superseding #301 (2)'s engagement): the order engages when e > helm.rangeBand (100 m) or the
// relative velocity's error |w* - w| exceeds a t180 (a dodge's drift), lets go when e <= the band and the relative speed
// |w| <= band / t180, and keeps its state between the two (hysteresis); engaged it takes the heading (along w* - w) and
// the engine at the throttle x max(0, cos of the heading error); let go, facing holds the bow on the line of sight.
//
// Setup (T1): createBattle with knowledge on; the helmed ship (R1 or R1d) on bearing -y of a static R1 (no helm, at
// rest, heading 0) at battle.openingRange (900 m), at rest, bow-on; its orders: range close / hold / open (600 / 900 /
// 1500 m), position flank, facing bow, dodging off, its weapons held (heat discipline threshold 0, response weapons),
// throttle 1; 120 s (7200 steps).
// Hand-worked: at rest e0 = |900 - R*| = 300 / 0 / 600 m against the band of 100 m: the order engages at step 0 for
// close and open, not for hold (whose error |w*(0)| = 0 is under a t180). Every step the helm's state equals the rule
// run here on the step's own states (e, w* and w recomputed from both ships' kernel states, a and t180 from the readout
// at undock, kernel-read and labelled: R1 a 16.461 m/s^2, t180 4.84 s, band / t180 20.7 m/s; R1d 10.552, 8.07 s, 12.4
// m/s). Kernel-read and labelled: the step it first lets go (inside the band), the largest |range - R*| after it, and how
// often it engages again; each re-engagement after the first let-go comes with e beyond the band (no dodge here), and the
// range after the first let-go stays within the band's overshoot (printed).
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const RANGES = { close: 600, hold: 900, open: 1500 };

export default {
  id: 'L4.helm.range',
  level: 'L4',
  laws: ['the range order flies the braking curve |w*| = a (sqrt(2 e / a + t180^2) - t180) (#301 (2), 13n.1 (d))', 'it engages beyond helm.rangeBand or at a dodge\'s drift and lets go inside the band at a relative speed under band / t180, with hysteresis (#302)'],
  dependsOn: ['L4.loop.symmetric'],
  setup: 'T1: createBattle, knowledge on; R1 or R1d with a helm (range close / hold / open, position flank, facing bow, weapons held, throttle 1) on bearing -y of a static R1 at 900 m, both at rest; 60 s (13n.4 H2)',
  measure: 'per step: the helm\'s state against the rule (#302) recomputed from the kernel\'s states; whether it engages at step 0; the step it first lets go; every later engagement\'s distance; the range and overshoot (kernel-read)',
  tolerance: 'the rule\'s inputs 1e-9 relative at its edges; steps exact',
  criterion: 'at every step the helm\'s state equals #302\'s rule recomputed; at step 0 it engages iff e0 > helm.rangeBand (close, open; not hold); for close and open it lets go within the 120 s, inside the band; every later engagement starts with e beyond the band; the let-go step, the overshoot and the re-engagements printed (kernel-read, labelled)',
  tunable: ['helm.rangeClose', 'helm.rangeHold', 'helm.rangeOpen', 'helm.rangeBand', 'engine.thrust', 'rcs.force'],
  locked: { date: '2026-10-23', hash: 'ad3f90bd' },
  cases() {
    return ['R1', 'R1d'].flatMap((ship) => ['close', 'hold', 'open'].map((range) => ({ ship, range })));
  },
  expected(ctx, c) {
    // a and t180 from the readout of the ship at undock (kernel-read, labelled); the band is helm.rangeBand.
    const b = createBattle({ params: ctx.params, attacker: TARGETS[c.ship], target: TARGETS.R1, knowledge: true });
    const r = readout(b.attacker.world), a = r.accelerationG * 9.80665, alpha = Math.min(r.rcs.ccw, r.rcs.cw), t180 = 2 * Math.sqrt(Math.PI / alpha);
    const band = ctx.scaled(ctx.params.helm.rangeBand, 5), e0 = Math.abs(900 - RANGES[c.range]);
    return { a, t180, band, letGo: band / t180, engagesAtStart: e0 > band, settles: c.range !== 'hold' };
  },
  run(ctx, c) {
    const orders = { range: c.range, position: 'flank', facing: 'bow', dodging: 'off', heat: { threshold: 0, response: 'weapons' }, throttle: 1 };
    const b = createBattle({ params: ctx.params, tier: 'T1', attacker: TARGETS[c.ship], target: TARGETS.R1, bearing: '-y', knowledge: true, orders: { A: orders } });
    const A = b.attacker, T = b.target, R = ctx.scaled(ctx.params.helm[{ close: 'rangeClose', hold: 'rangeHold', open: 'rangeOpen' }[c.range]], 5), band = ctx.scaled(ctx.params.helm.rangeBand, 5);
    // The law's a and t180 from the readout (the ship takes no damage here, so they hold the whole run).
    const r = readout(A.world), acc = r.accelerationG * 9.80665, t180 = 2 * Math.sqrt(Math.PI / Math.min(r.rcs.ccw, r.rcs.cw)), thr = acc * t180;
    let mismatch = 0, first = null, letGo = null, state = false, maxOver = 0;
    const again = [], near = [];
    while (b.step < 7200 && !b.ended) {
      // The rule run on the step's states before the tick: the flank point P on R1's -y side (R1 heading 0, A on its
      // -y side) at R*, the braking speed toward it, the relative velocity of the two bodies.
      const me = mainBody(A), them = mainBody(T), n = b.step;
      const P = [them.x[0], them.x[1] - R], E = [P[0] - me.x[0], P[1] - me.x[1]], e = Math.hypot(E[0], E[1]);
      const speed = e > 0 ? acc * (Math.sqrt((2 * e) / acc + t180 * t180) - t180) : 0, want = e > 0 ? [(E[0] / e) * speed, (E[1] / e) * speed] : [0, 0];
      const rel = [me.v[0] - them.v[0], me.v[1] - them.v[1]], err = Math.hypot(want[0] - rel[0], want[1] - rel[1]), sp = Math.hypot(rel[0], rel[1]);
      const was = state;
      state = e > band || err > thr ? true : e <= band && sp <= band / t180 ? false : state;
      // A step on the rule's edges within float resolution tells nothing.
      const edge = Math.abs(e - band) <= 1e-9 * band || Math.abs(err - thr) <= 1e-9 * thr || Math.abs(sp - band / t180) <= 1e-9 * (band / t180);
      tick(b);
      const engaged = A.helm.engaged;
      if (engaged !== state && !edge) mismatch++;
      state = engaged;
      if (n === 0) first = engaged;
      if (!engaged && was && letGo === null) letGo = { step: n, e };
      if (engaged && !was && letGo !== null) again.push(e);
      const range = Math.hypot(them.x[0] - mainBody(A).x[0], them.x[1] - mainBody(A).x[1]);
      if (letGo !== null) maxOver = Math.max(maxOver, Math.abs(range - R));
      if (b.step % 1200 === 0) near.push(range);
    }
    return { first, letGo, again: again.length, againOutside: again.every((e) => e > band - 1e-9), mismatch, maxOver, ranges: near };
  },
  compare(e, a) {
    const checks = {
      'every step the helm\'s state is #302\'s rule (recomputed)': a.mismatch === 0,
      'at step 0 it engages iff e0 > helm.rangeBand': a.first === e.engagesAtStart,
      'close and open: it lets go inside the band within 120 s': !e.settles || (a.letGo !== null && a.letGo.e <= e.band + 1e-9),
      'every later engagement starts beyond the band': a.againOutside,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    return { expected: `a ${e.a.toFixed(3)} m/s^2, t180 ${e.t180.toFixed(3)} s, band ${e.band} m, let-go speed ${e.letGo.toFixed(1)} m/s; engages at start ${e.engagesAtStart ? 'yes' : 'no'}`, actual: `engaged at start ${a.first ? 'yes' : 'no'}; first lets go ${a.letGo ? `at step ${a.letGo.step}, ${a.letGo.e.toFixed(1)} m from its point` : 'never'}; engages again ${a.again} times, each beyond the band ${a.againOutside ? 'yes' : 'NO'}; overshoot after ${a.maxOver.toFixed(1)} m; range every 20 s ${a.ranges.map((x) => x.toFixed(1)).join(' ')} m (kernel-read)` };
  },
};
