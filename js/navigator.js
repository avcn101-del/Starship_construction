// navigator.js — the navigator, the helm's middle layer (DESIGN.md 13n.9, #333,
// #335). It takes goals (the range R* or `disengage`; the aspect: position,
// style, facing, dodging; the throttle) and returns a wanted heading and a
// throttle for the pilot (js/pilot.js), in #40's order: movement, facing,
// dodging. It reads its own ship, the pilot's report and the other ship as the
// helm gives it (the model's silhouette pose and its observed velocity), never
// the other world. Its state (the range order's engagement, the dodge and strafe
// schedules) lives on the side's helm.
//   Movement: the range order flies the wanted relative velocity w* toward the
// wanted point P (on the circle of the range R* about the other ship, moved from
// the own bearing toward the side the position goal names, by its silhouette's
// heading, by at most helm.positionLead: the position law, #315; only at range,
// and not once the position has yielded: 13n.9, #335) on the braking
// curve |w*| = a (sqrt(2 |e| / a + t180^2) - t180), e the distance to P, a the
// ship's acceleration at the throttle, t180 its 180-degree turn on the RCS couple
// (a ship that must turn its engine round to brake brakes that much earlier); it
// engages when e is beyond helm.rangeBand or the relative velocity's error from
// w* exceeds a t180 (a dodge's drift), and lets go when e is within the band at
// a relative speed of at most band / t180, keeping its state between the two
// (#302). `disengage` (#293) turns the stern to the other ship and thrusts away
// along the line of sight. The engine opens at the throttle x max(0, cos of the
// heading error) (no tolerance).
//   Style (#307): hold wants no tangential relative velocity; orbit wants
// v_t = helm.rangeBand / t180 counter-clockwise about the other ship, strafe the
// same with its sense flipped on the dodge schedule; with either the position
// goal is ignored (styleEngaged).
//   Facing: bow-on the bow on the line of sight, broadside the nearer beam.
// Dodging (broadside only, #40, #237): the other beam with the engine open, the
// side flipped at intervals drawn on the seeded stream in [helm.dodgeMin,
// helm.dodgeMax] for the enemy and at their midpoint for the player (#240 (3)).
// No DOM, no Math.random, no Math.sin or Math.cos (util.js's, #239 Q6): the only
// draws are the enemy's dodge intervals, on the battle's seeded stream.
import { scaled } from './data.js';
import { sin, cos, atan2, clamp } from './util.js';
import { flownBody, shipDynamics, brakingSpeed } from './pilot.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1]);
const wrap = (a) => a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));
// Float resolution (#308 (2), §17 item 50): a time compared with a schedule built by sums of dt and drawn intervals
// counts as reached within this many seconds, so a flip due on a step boundary is not a step late.
const RES = 1e-9;

/** The interval to the next dodge flip (s): drawn in [dodgeMin, dodgeMax] on the seeded stream for the enemy, their midpoint for the player (#240 (3), #301). */
function dodgeInterval(battle, helm) {
  const lo = scaled(battle.params.helm.dodgeMin, battle.edge), hi = scaled(battle.params.helm.dodgeMax, battle.edge);
  return helm.dodge === 'seeded' ? lo + (hi - lo) * battle.rng() : (lo + hi) / 2;
}

/**
 * The range order's state (#302, superseding #301 (2)'s engagement): it engages when the distance to its point is beyond
 * helm.rangeBand or the relative velocity's error exceeds a t180 (a dodge's drift); it lets go when the distance is
 * within the band and the relative speed is at most band / t180; between the two it keeps its state (hysteresis).
 */
export function rangeEngaged(was, { e, error, speed, a, t180, band }) {
  if (e > band || error > a * t180) return true;
  if (e <= band && speed <= band / t180) return false;
  return was;
}

/**
 * The range order's state under orbit or strafe (#307): it engages when the distance is beyond helm.rangeBand or the
 * relative velocity's deviation from (rdot*, v_t) is at least |v_t| (from rest at its point: at once), and lets go
 * when the distance is within the band and the deviation is at most a dt (one step's change); between the two it
 * keeps its state. The 1e-9 is float resolution: from rest the deviation is |v_t| computed through a unit vector.
 */
export function styleEngaged(was, { e, error, vt, step, band }) {
  if (e > band || error >= vt * (1 - 1e-9)) return true;
  if (e <= band && error <= step) return false;
  return was;
}

/**
 * One step of the navigator: `goals` { range: R* (m) or 'disengage', position, style, facing, dodging, throttle };
 * `them` the other ship's pose { x, theta } (the model's silhouette), `vo` its observed velocity. Returns
 * { heading, throttle, mode }: the wanted heading (rad) and the engine's opening before the systems' heat and
 * emission rules.
 */
export function navigate(battle, side, goals, { them, vo }) {
  const w = side.world, h = side.helm, me = flownBody(w);
  const t = battle.t, edge = battle.edge, p = battle.params;
  const D = sub(them.x, me.x), r = len(D), u = r > 0 ? [D[0] / r, D[1] / r] : [1, 0], los = atan2(u[1], u[0]);
  const { a: a1, t180 } = shipDynamics(battle, side), throttle = goals.throttle, a = a1 * throttle;
  // Movement (#40 first): disengage, else the range order to the position's point on the braking curve (#301 (2)).
  let heading = null, open = 0, mode = null;
  const opening = (want) => throttle * Math.max(0, cos(wrap(want - me.theta)));
  if (goals.range === 'disengage') {
    heading = los + Math.PI; open = opening(heading); mode = 'disengage';
    if (h.disengageStep === null) h.disengageStep = battle.step; // the first to order it escapes first (#293)
  } else {
    h.disengageStep = null; // withdrawn (a preset switch away from it): no longer a runner (#306 (7))
    const R = goals.range;
    const tc = cos(them.theta), ts = sin(them.theta);
    const bow = [tc, ts], left = [-ts, tc], side1 = dot(sub(me.x, them.x), left) >= 0 ? left : [-left[0], -left[1]];
    // Style (#307): orbit and strafe ignore the position (the point rides the line of sight at R*) and want a
    // tangential relative velocity v_t = band / t180, counter-clockwise about the other ship; strafe flips its sense
    // on the dodge schedule.
    const band = scaled(p.helm.rangeBand, edge), moving = goals.style === 'orbit' || goals.style === 'strafe';
    // The position law (#315, superseding #306 (2)'s): the point on the circle of R* about the other ship, moved from
    // the own bearing phi toward the named one phi* by at most helm.positionLead, so the path circles at R* instead of
    // crossing the other ship (no collision model, #20).
    // The lead applies only at range (13n.9, #335: |r - R*| <= helm.rangeBand; outside it the point is on the own
    // bearing at R*, the range first, then the position) and not while the position has yielded.
    let dir = [-u[0], -u[1]];
    if (!moving && !h.yielded && Math.abs(r - R) <= band) {
      const named = goals.position === 'stern' ? [-tc, -ts] : goals.position === 'flank' ? side1 : bow, lead = (scaled(p.helm.positionLead, edge) * Math.PI) / 180;
      const phi = atan2(-u[1], -u[0]), phiP = phi + clamp(wrap(atan2(named[1], named[0]) - phi), -lead, lead);
      dir = [cos(phiP), sin(phiP)];
    }
    const P = [them.x[0] + R * dir[0], them.x[1] + R * dir[1]], E = sub(P, me.x), e = len(E);
    const speed = brakingSpeed(e, a, t180), radial = e > 0 ? [(E[0] / e) * speed, (E[1] / e) * speed] : [0, 0];
    let vt = 0;
    if (goals.style === 'strafe') {
      if (h.nextStrafe === null) h.nextStrafe = t + dodgeInterval(battle, h);
      else if (t >= h.nextStrafe - RES) { h.strafeSign = -h.strafeSign; h.nextStrafe = t + dodgeInterval(battle, h); }
    }
    if (moving && t180 < Infinity) vt = (goals.style === 'strafe' ? h.strafeSign : 1) * (band / t180);
    const ccw = [u[1], -u[0]], want = [radial[0] + vt * ccw[0], radial[1] + vt * ccw[1]];
    const rel = sub(me.v, vo), err = sub(want, rel), errLen = len(err);
    // A ship with no RCS couple (t180 infinite) cannot point its engine: the order does not engage (#306 (8)).
    const able = throttle > 0 && a > 0 && t180 < Infinity;
    // The position yields (13n.9, #335): while the order is engaged under the position law, the distance to its point
    // must fall by a band within helm.positionPatience, else the position yields (no lead) and stays yielded until the
    // order has been let go for helm.positionReset. Both clocks compare with RES (13n.10, #340), as the strafe's and the
  // dodge's do.
    if (!moving && h.engaged && !h.yielded) {
      if (!h.posBest || e < h.posBest.e - band) h.posBest = { e, t };
      else if (t - h.posBest.t >= scaled(p.helm.positionPatience, edge) - RES) h.yielded = true;
    }
    h.engaged = able && (moving ? styleEngaged(h.engaged, { e, error: errLen, vt: Math.abs(vt), step: a * battle.dt, band }) : rangeEngaged(h.engaged, { e, error: errLen, speed: len(rel), a, t180, band }));
    if (!h.engaged) {
      h.posBest = null;
      if (h.freeSince === null) h.freeSince = t;
      if (t - h.freeSince >= scaled(p.helm.positionReset, edge) - RES) h.yielded = false;
    } else h.freeSince = null;
    if (h.engaged) { heading = atan2(err[1], err[0]); open = opening(heading); mode = 'range'; }
    h.range = { R, e, want, rel, vt, error: errLen, threshold: a * t180, band, letGo: band / t180 };
  }
  // Facing (second), then dodging (third, broadside only).
  if (heading === null) {
    if (goals.facing === 'broadside') {
      if (goals.dodging === 'on') {
        if (h.nextFlip === null) h.nextFlip = t + dodgeInterval(battle, h);
        else if (t >= h.nextFlip - RES) { h.dodgeSign = -h.dodgeSign; h.nextFlip = t + dodgeInterval(battle, h); }
        heading = los + (h.dodgeSign * Math.PI) / 2; open = opening(heading); mode = 'dodge';
      } else {
        const s = sin(wrap(me.theta - los)) >= 0 ? 1 : -1;
        heading = los + (s * Math.PI) / 2; mode = 'broadside';
      }
    } else { heading = los; mode = 'bow'; }
  }
  return { heading, throttle: open, mode };
}
