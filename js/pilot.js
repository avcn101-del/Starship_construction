// pilot.js — the pilot, the helm's lowest layer (DESIGN.md 13n.9, #333, #335).
// It takes a wanted heading and a throttle and drives the ship: the RCS holds
// the heading (holdHeading, the bang-bang of 13l.1, run for every side after the
// helms), the engines open at the throttle. It reports what the ship can do now
// (shipDynamics: the acceleration at throttle 1 from its live engines, t180 its
// 180-degree turn on the RCS couple) and the braking curve the navigator flies
// (brakingSpeed). It reads only its own ship.
// No DOM, no Math.random, no Math.sin or Math.cos.
import { scaled } from './data.js';
import { setRcs, isDestroyed, survivingFraction } from './rooms.js';

const wrap = (a) => a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));

/** The body a side is flown on: body-0 (the heaviest piece of a split keeps it, 13f.1), else the heaviest. */
export function flownBody(world) {
  const bodies = world.ship.bodies;
  return bodies.find((b) => b.id === 'body-0') || [...bodies].sort((a, b) => b.M - a.M)[0] || null;
}

/** The pilot's orders for this step: the wanted heading (side.heading, held by holdHeading) and every engine's throttle. */
export function pilotStep(side, { heading, throttle }) {
  side.heading = wrap(heading);
  for (const e of side.world.rooms) if (e.type === 'engine') e.engine.throttle = throttle;
}

/**
 * Hold a side's heading on its RCS (13l.1): with the couple's angular accelerations a+ (every able fitting turning
 * it counter-clockwise) and a- (clockwise) about the main body's centre of mass, the time-optimal rate toward the
 * wanted heading is sign(d) sqrt(2 a d) on the couple that brakes it; the side fires the couple that brings omega
 * to it, or none within half a step's change (bang-bang over the steps; no constant).
 */
export function holdHeading(battle, side) {
  const w = side.world, b = flownBody(w), fits = w.fittings.filter((f) => f.type === 'rcs');
  setRcs(w, fits.map((f) => f.id), false);
  if (!b || side.heading === null) return;
  const force = scaled(battle.params.rcs.force, battle.edge), ccw = [], cw = [];
  let tp = 0, tm = 0;
  for (const f of fits) {
    const host = side.room(f.room), cell = host.cells[f.k];
    if (cell.destroyed || cell.fragment !== b.id || isDestroyed(host) || !host.controlled || host.shutdown || host.unmanned || host.outage || !host.active) continue;
    const tau = (f.p[0] - b.c[0]) * (-f.side[1] * force) - (f.p[1] - b.c[1]) * (-f.side[0] * force);
    if (tau > 0) { ccw.push(f.id); tp += tau; } else if (tau < 0) { cw.push(f.id); tm -= tau; }
  }
  const ap = tp / b.I, am = tm / b.I, d = wrap(side.heading - b.theta), dt = battle.dt;
  const target = d > 0 ? Math.sqrt(2 * am * d) : d < 0 ? -Math.sqrt(2 * ap * -d) : 0;
  if (ccw.length && b.omega < target - (ap * dt) / 2) setRcs(w, ccw, true);
  else if (cw.length && b.omega > target + (am * dt) / 2) setRcs(w, cw, true);
}

/** The ship's acceleration (m/s^2) at throttle 1 from its live engines and its flown body's mass; t180 (s), its 180-degree turn on the RCS couple. */
export function shipDynamics(battle, side) {
  const w = side.world, b = flownBody(w), p = battle.params;
  if (!b) return { a: 0, t180: Infinity };
  let thrust = 0;
  for (const r of w.rooms) if (r.type === 'engine' && r.placed && !isDestroyed(r)) thrust += scaled(p.engine.thrust, battle.edge) * r.footprintFactor * survivingFraction(r);
  const force = scaled(p.rcs.force, battle.edge);
  let ccw = 0, cw = 0;
  for (const f of w.fittings) {
    if (f.type !== 'rcs') continue;
    const host = side.room(f.room), cell = host.cells[f.k];
    if (cell.destroyed || cell.fragment !== b.id) continue;
    const tau = (f.p[0] - b.c[0]) * (-f.side[1] * force) - (f.p[1] - b.c[1]) * (-f.side[0] * force);
    if (tau > 0) ccw += tau; else cw -= tau;
  }
  const alpha = Math.min(ccw, cw) / b.I;
  return { a: thrust / b.M, t180: alpha > 0 ? 2 * Math.sqrt(Math.PI / alpha) : Infinity };
}

/** The braking curve's wanted speed toward a point e away (#301 (2)): a (sqrt(2 e / a + t180^2) - t180). */
export function brakingSpeed(e, a, t180) {
  if (!(a > 0) || !(e > 0) || !(t180 < Infinity)) return 0; // no couple: no curve to fly (#306 (8))
  return a * (Math.sqrt((2 * e) / a + t180 * t180) - t180);
}
