// defence.js — point defence against missiles (DESIGN.md 13n.1 (c), L5c; #93,
// #278, #295). Two fitting types on a hull edge (rooms.js addFitting), each
// engaging the other side's missiles only, in the arc of its hull segment (the
// outward half-plane of the edge, from its midpoint along its outward normal),
// the nearest first (an automatic rule, §8). Kinetic ('pd'): pd.fireRate M flak
// rounds a second from its own store of pd.ammo, each with lead on the missile
// (the intercept for the missile's velocity at the shot: its acceleration over
// the flak's flight is the physical miss), flown straight and burst at its
// closest approach to that missile: he.blastEnergy over a field g = 1 / (1 +
// (r / flak.radius)^2), a dose to every missile of that side by its distance at
// that moment. Laser ('pdLaser'): pdLaser.power (x its host's power fraction) on
// its missile every step it holds it in arc, no falloff (#230); its draw and heat
// are its host's (rooms.js). A missile dies when its dose reaches its hp (the
// one law, js/missile.js missileHp); the event 'missile-killed' goes to the
// defender's log, room the fitting's host, cause the missile's id.
// No DOM, no Math.random.
import { scaled } from './data.js';
import { worldPoint, rotate, pointVelocity } from './body.js';
import { emit } from './events.js';
import { pdAble, laserPower, fireFlak } from './rooms.js';
import { missileHp } from './missile.js';

const tierScaled = (world, p) => scaled(p, world.edge);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1]);

/** A fitting's world point and outward normal (its edge's midpoint and side, on the body holding its cell). */
export function fittingPose(world, f) {
  const host = world.rooms.find((r) => r.id === f.room), b = world.ship.bodies.find((x) => x.id === host.cells[f.k].fragment);
  if (!b) return null;
  return { S: worldPoint(b, f.p), n: rotate(f.side, b.theta), body: b };
}
/** In the fitting's arc: the missile's position in the outward half-plane of its edge (strictly). */
export const inArc = (pose, X) => dot(sub(X, pose.S), pose.n) > 0;
/** The nearest missile of `missiles` in the fitting's arc (ties: the earlier in the list), or null. */
function nearestInArc(pose, missiles) {
  let best = null;
  for (const x of missiles) {
    if (x.dead || x.over || !inArc(pose, x.x)) continue;
    const d = len(sub(x.x, pose.S));
    if (!best || d < best.d) best = { x, d };
  }
  return best ? best.x : null;
}
const pdFittings = (world, type) => world.fittings.filter((f) => f.type === type);

/** Before the step: each laser fitting able to engage holds its beam on the nearest missile of the other side in its arc (its draw is asked for in the step). */
export function aimLasers(battle) {
  for (const s of battle.sides) {
    for (const f of pdFittings(s.world, 'pdLaser')) {
      f.target = null;
      const pose = fittingPose(s.world, f), missiles = battle.missiles.filter((x) => x.shooter === s.other);
      if (!pose || !missiles.length || !pdAble(s.world, f, true)) continue;
      const x = nearestInArc(pose, missiles);
      f.target = x ? x.id : null;
    }
  }
}

/** A dose to missile x from a fitting of side s; it dies at its hp (a float residue of 1e-12 of it counts, as damageCell's). */
function dose(battle, s, f, x, energy, by) {
  if (x.dead) return;
  x.dose = (x.dose || 0) + energy;
  const hp = missileHp(x.shooter.world);
  if (x.dose >= hp * (1 - 1e-12)) {
    x.dead = by;
    const host = s.world.rooms.find((r) => r.id === f.room);
    emit(s.world.log, { t: battle.t, type: 'missile-killed', room: host.id, cause: x.id, crew: host.crew, by, dose: x.dose, fitting: f.id, missile: x.id, parent: x.id });
  }
}

/**
 * The intercept direction (world unit) of a flak round of speed u fired from S with the shooter's velocity vs at a
 * missile at X moving at V (no acceleration: the lead), or the direction to X when no intercept exists.
 */
export function lead(S, vs, X, V, u) {
  const D = sub(X, S), W = sub(V, vs), a = dot(W, W) - u * u, b = 2 * dot(D, W), c = dot(D, D);
  let t = null;
  if (Math.abs(a) < 1e-12) t = b < 0 ? -c / b : null;
  else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const r = Math.sqrt(disc), t1 = (-b - r) / (2 * a), t2 = (-b + r) / (2 * a);
      t = [t1, t2].filter((x) => x > 0).sort((p, q) => p - q)[0] ?? null;
    }
  }
  const P = t === null ? D : [D[0] + W[0] * t, D[1] + W[1] * t], L = len(P);
  return L > 0 ? [P[0] / L, P[1] / L] : [1, 0];
}

/**
 * After the missiles moved over the step (each keeps x.prev, its position at the step's start): lasers dose their
 * missiles for the step; flak rounds fly the step and burst at their closest approach (when it falls in the step);
 * then each kinetic fitting with a missile in its arc fires when due (shots 1 / pd.fireRate apart). Returns the
 * missiles killed this step.
 */
export function pointDefence(battle) {
  const dt = battle.dt;
  for (const s of battle.sides) {
    for (const f of pdFittings(s.world, 'pdLaser')) {
      const x = f.target && battle.missiles.find((y) => y.id === f.target);
      const P = x ? laserPower(s.world, f) : 0;
      if (x && P > 0 && !x.dead) { f.energy += P * dt; dose(battle, s, f, x, P * dt, 'laser'); }
    }
  }
  for (const r of battle.flak) {
    const x0 = r.x, v = r.v, x1 = [x0[0] + v[0] * dt, x0[1] + v[1] * dt];
    r.x = x1;
    const m = r.target;
    if (!m || m.dead || m.over) { r.over = 'lost'; continue; }
    const m0 = m.prev || m.x, m1 = m.x, r0 = sub(x0, m0), r1 = sub(x1, m1), dr = sub(r1, r0), q = dot(dr, dr);
    const tau = q > 0 ? Math.min(1, Math.max(0, -dot(r0, dr) / q)) : 0;
    if (tau >= 1) continue; // still closing at the step's end
    // The burst at its closest approach (tau of the step): a dose to every missile of that side by its distance then.
    const B = [x0[0] + v[0] * dt * tau, x0[1] + v[1] * dt * tau], s = r.side, E = tierScaled(s.world, battle.params.he.blastEnergy), R = tierScaled(s.world, battle.params.flak.radius);
    r.burst = { tau, d: len([r0[0] + dr[0] * tau, r0[1] + dr[1] * tau]), at: battle.t - dt + tau * dt };
    (battle.bursts ??= []).push({ id: r.id, missile: m.id, ...r.burst }); // each burst: its closest approach to its missile
    for (const y of battle.missiles) {
      if (y.shooter !== m.shooter || y.dead || y.over) continue;
      const p0 = y.prev || y.x, P = [p0[0] + (y.x[0] - p0[0]) * tau, p0[1] + (y.x[1] - p0[1]) * tau], dd = len(sub(B, P));
      dose(battle, s, r.fitting, y, E / (1 + (dd / R) * (dd / R)), 'flak');
    }
    r.over = 'burst';
  }
  for (const s of battle.sides) {
    for (const f of pdFittings(s.world, 'pd')) {
      const pose = fittingPose(s.world, f), missiles = battle.missiles.filter((x) => x.shooter === s.other && !x.dead && !x.over);
      if (!pose || !missiles.length || !pdAble(s.world, f)) continue;
      const x = nearestInArc(pose, missiles);
      if (!x) continue;
      if (f.next !== undefined && f.next !== null && battle.t < f.next - 1e-9) continue;
      const u = tierScaled(s.world, battle.params.kinetic.muzzleVelocity), dir = lead(pose.S, pointVelocity(pose.body, pose.S), x.x, x.v, u);
      const id = `${s.name}:flak-${++battle.flakShots}`;
      const round = fireFlak(s.world, f, dir, id);
      battle.flak.push({ ...round, id, side: s, fitting: f, target: x }); // fired at the step's end: it flies from the next step
      f.next = battle.t + 1 / tierScaled(s.world, battle.params.pd.fireRate);
    }
  }
  battle.flak = battle.flak.filter((r) => { if (!r.over) return true; battle.spentFlak(r); return false; });
}
