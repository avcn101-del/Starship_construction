// body.js — the 2D rigid body of a ship and its fragments (DESIGN.md 13f.1,
// #208): mass properties from point masses and square cells, the state
// (centre of mass x, velocity v, heading theta, angular velocity omega),
// semi-implicit Euler at the step, impulses, and the changes of mass that
// keep the velocity field (a part leaving) or keep the momentum (mass moved
// inside the ship). A body's own frame is the cluster's grid frame (metres,
// layout.js); its centre of mass c is in that frame, x in the world.
// World point of a grid point p: x + R(theta) (p - c).
// Momentum books: every body, debris piece and round in flight carries
// momentum m v and angular momentum about the world origin x × m v (+ its
// spin I omega); forces from outside (thrust, RCS) are booked as the
// external impulse J and angular impulse H, so P - J and L - H stay fixed.
// No DOM, no Math.random. Trigonometry by util.js's deterministic sin and cos
// (#239 Q6, 13k.1), so a battle with turning replays across engines.
import { sin, cos } from './util.js';

/** 2D cross product a × b (a scalar). */
export const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
/** Vector p rotated by theta. */
export function rotate(p, theta) {
  const c = cos(theta), s = sin(theta);
  return [c * p[0] - s * p[1], s * p[0] + c * p[1]];
}

/**
 * Mass properties of items { m, p: [x, y], a } (a: the edge of a square
 * cell, 0 for a point mass): total mass M, centre of mass c and moment of
 * inertia about c, I = sum m (a^2 / 6 + d^2) (#208).
 */
export function massProperties(items) {
  let M = 0, sx = 0, sy = 0;
  for (const i of items) { M += i.m; sx += i.m * i.p[0]; sy += i.m * i.p[1]; }
  const c = M > 0 ? [sx / M, sy / M] : [0, 0];
  let I = 0;
  for (const i of items) {
    const dx = i.p[0] - c[0], dy = i.p[1] - c[1];
    I += i.m * ((i.a ? (i.a * i.a) / 6 : 0) + dx * dx + dy * dy);
  }
  return { M, c, I };
}

/** A body at rest frame `origin` (world position of the grid origin), heading, velocity of the centre of mass and omega. */
export function createBody(id, props, { origin = [0, 0], heading = 0, velocity = [0, 0], omega = 0 } = {}) {
  const r = rotate(props.c, heading);
  return { id, M: props.M, c: props.c, I: props.I, x: [origin[0] + r[0], origin[1] + r[1]], v: [...velocity], theta: heading, omega };
}

/** World position of grid point p on the body. */
export function worldPoint(body, p) {
  const r = rotate([p[0] - body.c[0], p[1] - body.c[1]], body.theta);
  return [body.x[0] + r[0], body.x[1] + r[1]];
}
/** Velocity of the body's material at world point q: v + omega × (q - x). */
export function pointVelocity(body, q) {
  return [body.v[0] - body.omega * (q[1] - body.x[1]), body.v[1] + body.omega * (q[0] - body.x[0])];
}
/** World position of the grid origin. */
export function frameOrigin(body) {
  const r = rotate(body.c, body.theta);
  return [body.x[0] - r[0], body.x[1] - r[1]];
}

/** An impulse J (world, N s) at grid point p changes v and omega at once (#208). */
export function applyImpulse(body, J, p) {
  const q = worldPoint(body, p);
  body.v[0] += J[0] / body.M;
  body.v[1] += J[1] / body.M;
  body.omega += cross([q[0] - body.x[0], q[1] - body.x[1]], J) / body.I;
}

/**
 * One step of semi-implicit Euler (#208): forces { F: body frame, p: grid
 * point } summed into a world force and a torque about the centre of mass;
 * v and omega first, then x and theta. The external impulse of the step
 * (J += F dt, H += q × F dt with q the point at the start of the step) is
 * added to `books`, which keeps the angular momentum books exact; `Hgross`
 * sums |q × F dt| over every booking, the scale of the books' float
 * residue when opposite impulses cancel (#219).
 */
export function integrate(body, forces, dt, books) {
  let Fx = 0, Fy = 0, tau = 0;
  for (const f of forces) {
    const Fw = rotate(f.F, body.theta), q = worldPoint(body, f.p);
    Fx += Fw[0]; Fy += Fw[1];
    tau += cross([q[0] - body.x[0], q[1] - body.x[1]], Fw);
    if (books) { books.J[0] += Fw[0] * dt; books.J[1] += Fw[1] * dt; const h = cross(q, Fw) * dt; books.H += h; books.Hgross += Math.abs(h); }
  }
  body.v[0] += (Fx / body.M) * dt;
  body.v[1] += (Fy / body.M) * dt;
  body.omega += (tau / body.I) * dt;
  body.x[0] += body.v[0] * dt;
  body.x[1] += body.v[1] * dt;
  body.theta += body.omega * dt;
}

/**
 * New mass properties after a part left (#208): the frame stays where it is
 * and the velocity field is kept, so the new centre of mass moves with the
 * velocity of its point and omega is unchanged. Returns the body (mutated).
 */
export function reshape(body, props) {
  const origin = frameOrigin(body), r = rotate(props.c, body.theta);
  const x = [origin[0] + r[0], origin[1] + r[1]];
  body.v = pointVelocity(body, x);
  Object.assign(body, { M: props.M, c: props.c, I: props.I, x });
  return body;
}

/**
 * A fragment of `parent` with its own mass properties and the parent's
 * velocity field (13f.1): v of its centre of mass, the same omega.
 */
export function fragmentOf(parent, id, props) {
  const origin = frameOrigin(parent), r = rotate(props.c, parent.theta);
  const x = [origin[0] + r[0], origin[1] + r[1]];
  return { id, M: props.M, c: props.c, I: props.I, x, v: pointVelocity(parent, x), theta: parent.theta, omega: parent.omega };
}

/**
 * Mass moved inside the ship (rounds fed from a magazine to a turret): no
 * external force acts, so the centre of mass stays where it is in the world
 * (the frame shifts under it), v is unchanged and the angular momentum
 * about the centre of mass is kept: omega' = I omega / I'.
 */
export function redistribute(body, props) {
  body.omega = (body.I * body.omega) / props.I;
  Object.assign(body, { M: props.M, c: props.c, I: props.I });
  return body;
}

/**
 * Momentum, angular momentum about the world origin and kinetic energy of
 * bodies, debris { m, x, v, omega, spin } and rounds { m, x, v }.
 */
export function momentumOf({ bodies = [], debris = [], rounds = [] }) {
  const P = [0, 0];
  let L = 0, K = 0;
  const point = (m, x, v) => { P[0] += m * v[0]; P[1] += m * v[1]; L += m * cross(x, v); K += 0.5 * m * (v[0] * v[0] + v[1] * v[1]); };
  for (const b of bodies) { point(b.M, b.x, b.v); L += b.I * b.omega; K += 0.5 * b.I * b.omega * b.omega; }
  for (const d of debris) { point(d.m, d.x, d.v); L += d.spin * d.omega; K += 0.5 * d.spin * d.omega * d.omega; }
  for (const r of rounds) point(r.m, r.x, r.v);
  return { P, L, K };
}
