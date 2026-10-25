import { createBattle, tick, mainBody } from '../../../js/battle.js';
import { pilotStep } from '../../../js/pilot.js';
import { stepsAtLeast } from '../../../js/util.js';
import { R2 } from '../../builds.js';

// K1 of §17 item 55 (DESIGN.md 13n.9, #335): the pilot's turn sense. A turn of more than 90 degrees toward the wanted
// heading keeps the sense it started in until the error is within 90 degrees. Without it, at an error of exactly 180
// degrees the wanted heading's jitter flips the RCS bang-bang every few steps and the ship never turns (the mirrors
// from a bow opening passed through each other).
//
// Setup (T1): R2 (mission0/builds.js, unchanged by #330) as the battle's target side, at rest at heading 0, no helm,
// knowledge off; the attacker R2 2500 m off on its -y bearing, static (no plan: nothing fires). Each step, before the
// kernel's step, the pilot is given (a test input) the wanted heading pi + j, j = +0.005 rad on even steps and
// -0.005 rad on odd ones (case 'even +'), or the opposite parity (case 'even -'), and throttle 0. Run 1.2 x t180.
// Hand-worked: the bang-bang's time for pi on a couple of angular acceleration alpha is t180 = 2 sqrt(pi / alpha)
// (accelerate over pi/2, brake over pi/2); alpha the smaller of the two senses' couples: each RCS fitting on the flown
// body pushes force (rcs.force) along its edge's inward normal at its point p, its torque (p - c) x F about the centre
// of mass c; alpha = min(sum of the positive torques, -sum of the negative ones) / I. A couple stronger than that only
// shortens the turn. R2: four fittings, about 8.1 s.
const J = 0.005;

export default {
  id: 'L4.pilot.turn180',
  level: 'L4',
  laws: ['the pilot\'s turn sense: a turn of more than 90 degrees keeps the sense it started in until the error is within 90 degrees (13n.9, #335)'],
  dependsOn: ['L3.rcs.turn.v6'],
  setup: 'T1: createBattle, target R2 at rest at heading 0 (no helm, knowledge off), attacker R2 2500 m off on bearing -y (static, no plan); each step the target\'s pilot is given the wanted heading pi + 0.005 rad on even steps and pi - 0.005 rad on odd ones (case even +) or the opposite (case even -), throttle 0 (a test input); run 1.2 x t180 (13n.9 K1)',
  measure: 'every step, the flown body\'s heading error from pi (|wrap(pi - theta)|) and its angular velocity omega; the error at the end; the first time within 1 degree; whether omega\'s sign (zero ignored) reversed at a step whose error was past 90 degrees',
  tolerance: 'a ceiling on the error at the end (1 degree, against the jitter of 0.29 degrees); the sense exact',
  criterion: 'by 1.2 x t180 (t180 = 2 sqrt(pi / alpha), alpha = min(couple+, couple-) / I from the RCS fittings, rcs.force and the flown body, hand-worked) the heading is within 1 degree of pi, and omega never reverses its sense while the error is past 90 degrees; before #335 the ship never turns',
  tunable: ['rcs.force'],
  locked: { date: '2026-10-24', hash: 'd9e77c88' },
  cases() {
    return [{ parity: 'even +' }, { parity: 'even -' }];
  },
  expected(ctx) {
    const b = battleOf(ctx), T = mainBody(b.target), w = b.target.world, force = ctx.scaled(ctx.params.rcs.force, b.edge);
    let ccw = 0, cw = 0;
    for (const f of w.fittings) {
      if (f.type !== 'rcs') continue;
      const F = [-f.side[0] * force, -f.side[1] * force], tau = (f.p[0] - T.c[0]) * F[1] - (f.p[1] - T.c[1]) * F[0];
      if (tau > 0) ccw += tau; else cw -= tau;
    }
    const alpha = Math.min(ccw, cw) / T.I, t180 = 2 * Math.sqrt(Math.PI / alpha);
    return { alpha, t180, by: 1.2 * t180, within: 1 };
  },
  run(ctx, c) {
    const b = battleOf(ctx), side = b.target, sign = c.parity === 'even +' ? 1 : -1;
    const T0 = mainBody(side), force = ctx.scaled(ctx.params.rcs.force, b.edge);
    let ccw = 0, cw = 0;
    for (const f of side.world.fittings) {
      if (f.type !== 'rcs') continue;
      const tau = (f.p[0] - T0.c[0]) * (-f.side[1] * force) - (f.p[1] - T0.c[1]) * (-f.side[0] * force);
      if (tau > 0) ccw += tau; else cw -= tau;
    }
    const steps = stepsAtLeast(1.2 * 2 * Math.sqrt(Math.PI / (Math.min(ccw, cw) / T0.I)), b.dt);
    let first = null, reversed = null, sense = 0, err = null, omegaMax = 0;
    while (b.step < steps && !b.ended) {
      pilotStep(side, { heading: Math.PI + sign * (b.step % 2 === 0 ? J : -J), throttle: 0 });
      tick(b);
      const B = mainBody(side);
      err = Math.abs(wrap(Math.PI - B.theta));
      const s = Math.sign(B.omega);
      omegaMax = Math.max(omegaMax, Math.abs(B.omega));
      if (err > Math.PI / 2 && s !== 0) {
        if (sense !== 0 && s !== sense && reversed === null) reversed = b.t;
        sense = s;
      }
      if (err <= Math.PI / 180) { if (first === null) first = b.t; } else first = null;
    }
    return { t: b.t, steps: b.step, errorDeg: (err * 180) / Math.PI, within: first, reversed, sense, omegaMax };
  },
  compare(e, a) {
    const pass = a.t >= e.by - 1e-9 && a.errorDeg <= e.within && a.reversed === null;
    return { pass, note: pass ? '' : a.reversed !== null ? `omega reversed at ${a.reversed.toFixed(3)} s with the error past 90 degrees` : `error ${a.errorDeg.toFixed(3)} deg at ${a.t.toFixed(3)} s` };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    return {
      expected: `within ${e.within} deg of pi by 1.2 x t180 = ${e.by.toFixed(3)} s (t180 = 2 sqrt(pi / ${e.alpha.toExponential(4)}) = ${e.t180.toFixed(3)} s); no reversal past 90 deg`,
      actual: `${a.errorDeg.toFixed(4)} deg at ${a.t.toFixed(3)} s (within 1 deg since ${a.within === null ? '-' : a.within.toFixed(3) + ' s'}); sense ${a.sense > 0 ? 'ccw' : a.sense < 0 ? 'cw' : 'none'}, reversed ${a.reversed === null ? 'never' : 'at ' + a.reversed.toFixed(3) + ' s'}; max |omega| ${a.omegaMax.toFixed(4)} rad/s`,
    };
  },
};

const wrap = (a) => a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));
function battleOf(ctx) {
  return createBattle({ params: ctx.params, attacker: R2, target: R2, distance: 2500, targetHeading: 0 });
}
