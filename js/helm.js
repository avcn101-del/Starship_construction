// helm.js — the standing orders (DESIGN.md 8, 13n.1 (d), L5d; #36-#40, #293,
// #301). A side with a helm flies its preset's twelve slots each step from its
// own knowledge model (js/sensors.js) and its own ship, never the other world:
// the other ship's pose is its model's silhouette, its velocity and lateral
// acceleration the differences of the last silhouette poses.
//   Movement (#40's first): the range order flies the wanted relative velocity
// w* toward the wanted point P (the range R* from the other ship on the side the
// position slot names, by its silhouette's heading) on the braking curve
// |w*| = a (sqrt(2 |e| / a + t180^2) - t180), e the distance to P, a the ship's
// acceleration at the preset's throttle, t180 its 180-degree turn on the RCS
// couple (a ship that must turn its engine round to brake brakes that much
// earlier); it takes the heading and the engine while the relative velocity's
// error from w* exceeds a t180 (#301 (2)); with the ship on the line from the
// other ship along the position's direction e is the range error and P lies on
// the line of sight, #301's law as written. `disengage` (#293) turns the stern
// to the other ship and thrusts away along the line of sight. The engine opens
// at the preset's throttle x max(0, cos of the heading error) (no tolerance).
//   Facing (second): bow-on the bow on the line of sight, broadside the nearer
// beam. Dodging (third; broadside only, bow-on it yields to facing, #40, #237):
// the other beam with the engine open, the side flipped at intervals drawn on
// the seeded stream in [helm.dodgeMin, helm.dodgeMax] for the enemy and at their
// midpoint for the player (#240 (3)).
//   Firepower: the target is the verb's room while the model knows a standing
// cell of it, else the priority slot's known room (weapons, power, bridge,
// nearest), else the centre of the zone with the most unknown cells; the turret
// leads on the silhouette's velocity (the intercept of a round at muzzle speed
// with a point at constant relative velocity, the smallest positive root:
// prototype v2's formula); open fire 'in range' within battle.cullDistance (where
// a round can arrive), 'sure hit' when 1/2 x the other ship's acceleration across
// the line of sight x t_f^2 is under one cell edge; 'salvo' releases every weapon
// at once, 'ripple' weapon i of n at i / n of its reload.
//   Energy: the priority slot's room types are the power routing's order
// (rooms.js routePower); heat discipline holds the weapons, switches the shield
// off or the engine off while the hottest room is at or past the threshold
// fraction of the way from rest to its own hot threshold. Emission: cold is
// engine off, shield off, no scan; normal shield on and the auto-scan slot;
// full also re-scans the zone resolved longest ago once none is unresolved.
// Auto-scan: each idle antenna scans the nearest unresolved zone.
// The style slot (hold / orbit / strafe) and the repair half of the priority
// slot are carried as data and not executed (questions of the L5d pull request).
// No DOM, no Math.random, no Math.sin or Math.cos (util.js's, #239 Q6): the only draws are the enemy's dodge intervals, on the
// battle's seeded stream.
import { scaled, PRESETS, FIXED } from './data.js';
import { sin, cos } from './util.js';
import { worldPoint, rotate, pointVelocity } from './body.js';
import { setScan, antennas, knownAim, zoneCentre } from './sensors.js';
import { isDestroyed, roomTemperature, shieldBuffer, survivingFraction, survivingCells, roundOf } from './rooms.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1]);
const wrap = (a) => a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));
const WEAPON_TYPES = { weapons: new Set(['turret', 'beamBay', 'railgun', 'missileBay']), power: new Set(['reactor']), bridge: new Set(['bridge']) };
const DISCRETE = new Set(['turret', 'railgun', 'missileBay']);

/** The body a side is flown on: body-0, else the heaviest (as js/battle.js). */
export function flownBody(world) {
  const bodies = world.ship.bodies;
  return bodies.find((b) => b.id === 'body-0') || [...bodies].sort((a, b) => b.M - a.M)[0] || null;
}
/** The other ship's main pose as the model's silhouette gives it (#23). */
export function silhouettePose(model) {
  const s = model.silhouette.bodies;
  return s.find((b) => b.id === 'body-0') || s[0] || null;
}

/** A full set of the twelve slots (and the throttle) from a preset name or a case's own set (a test input). */
export function ordersOf(x) {
  if (typeof x === 'string') {
    if (!PRESETS[x]) throw new Error(`unknown preset ${x}`);
    return { ...PRESETS[x], heat: { ...PRESETS[x].heat }, priority: [...PRESETS[x].priority], name: x };
  }
  return { ...PRESETS.fire, ...x, heat: { ...PRESETS.fire.heat, ...(x.heat || {}) }, priority: [...(x.priority || [])], name: x.name || 'case' };
}

/**
 * A helm for a side: `orders` a preset name or a slot set; `dodge`: 'seeded' (the enemy, intervals on the battle's
 * stream) or 'fixed' (the player, the midpoint).
 */
export function createHelm(battle, side, orders, { dodge = 'fixed' } = {}) {
  return {
    orders: ordersOf(orders), dodge, dodgeSign: 1, nextFlip: null, history: [], engaged: false, mode: null,
    verbTarget: null, target: null, released: false, releaseAt: null, held: true, why: 'start', disengage: false, disengageStep: null,
    patience: 0, autoScan: true, lastHeading: null, throttle: 0, scanCount: 0,
  };
}

/** The interval to the next dodge flip (s): drawn in [dodgeMin, dodgeMax] on the seeded stream for the enemy, their midpoint for the player (#240 (3), #301). */
function dodgeInterval(battle, helm) {
  const lo = scaled(battle.params.helm.dodgeMin, battle.edge), hi = scaled(battle.params.helm.dodgeMax, battle.edge);
  return helm.dodge === 'seeded' ? lo + (hi - lo) * battle.rng() : (lo + hi) / 2;
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
  if (!(a > 0) || !(e > 0)) return 0;
  return a * (Math.sqrt((2 * e) / a + t180 * t180) - t180);
}
/** Whether the range order takes the heading and the engine: the relative velocity's error beyond a t180 (#301 (2)). */
export const rangeEngages = (error, a, t180) => error > a * t180;

/** The hottest room's fraction of the way from rest to its own hot threshold (heat discipline). */
export function heatFraction(world) {
  const rest = FIXED.restTemperature.value;
  let best = 0;
  for (const r of world.rooms) if (r.placed && !isDestroyed(r)) best = Math.max(best, (roomTemperature(r) - rest) / (r.thresholds.hot - rest));
  return best;
}
/** The shield buffers' fraction of their full charge (1 for a ship with no generator standing). */
export function bufferFraction(battle, world) {
  let have = 0, cap = 0;
  for (const r of world.rooms) {
    if (r.type !== 'shieldGenerator' || !r.placed || isDestroyed(r)) continue;
    const full = scaled(battle.params.shield.buffer, battle.edge) * r.footprintFactor * survivingFraction(r);
    have += r.shield.buffer === null ? full : shieldBuffer(world, r); // never drawn on yet: full
    cap += full;
  }
  return cap > 0 ? have / cap : 1;
}

/** Whether the model knows a standing cell of room id (a known room is lost when it knows none, #301). */
export function knownStanding(model, id) {
  const r = model.rooms.get(id);
  return !!r && r.cells.some((k) => !model.cells.get(k).destroyed);
}
/** The zone with the most unknown occupied cells (ties: the lower id), or null when every cell is known. */
export function mostUnknownZone(model) {
  let best = null;
  for (const z of model.zones) {
    const n = z.cells.filter((c) => !model.cells.has(`${c[0]},${c[1]}`)).length;
    if (n > 0 && (!best || n > best.n)) best = { z: z.id, n };
  }
  return best ? best.z : null;
}
/**
 * The side's target (13n.1 (d)): { room, point, zone } — the verb's room while its model knows a standing cell of it,
 * else the priority's known rooms (weapons / power / bridge, the nearest of the type set; nearest: any known room),
 * else the centre of the zone with the most unknown cells.
 */
export function chooseTarget(side, priority) {
  const model = side.model, me = flownBody(side.world);
  const h = side.helm;
  if (h.verbTarget && knownStanding(model, h.verbTarget)) return { room: h.verbTarget, point: knownAim(model, h.verbTarget), zone: null };
  const types = WEAPON_TYPES[priority] || null;
  let best = null;
  for (const [id, r] of [...model.rooms.entries()].sort((p, q) => (p[0] < q[0] ? -1 : p[0] > q[0] ? 1 : 0))) {
    if (types && !types.has(r.type)) continue;
    if (!knownStanding(model, id)) continue;
    const P = knownAim(model, id), d = me ? len(sub(P, me.x)) : 0;
    if (!best || d < best.d) best = { id, P, d };
  }
  if (best) return { room: best.id, point: best.P, zone: null };
  const z = mostUnknownZone(model);
  return z === null ? { room: null, point: null, zone: null } : { room: null, point: zoneCentre(model, z), zone: z };
}

/**
 * The intercept of a round of speed u fired from S with the shooter's velocity vs at a point X moving at V (constant
 * velocity: the lead, prototype v2's formula): { dir (world unit), t (s, the smallest positive root) or null }.
 */
export function intercept(S, vs, X, V, u) {
  const D = sub(X, S), W = sub(V, vs), a = dot(W, W) - u * u, b = 2 * dot(D, W), c = dot(D, D);
  let t = null;
  if (Math.abs(a) < 1e-12) t = b < 0 ? -c / b : null;
  else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const r = Math.sqrt(disc), roots = [(-b - r) / (2 * a), (-b + r) / (2 * a)].filter((x) => x > 0);
      t = roots.length ? Math.min(...roots) : null;
    }
  }
  const P = t === null ? D : [D[0] + W[0] * t, D[1] + W[1] * t], L = len(P);
  return { dir: L > 0 ? [P[0] / L, P[1] / L] : [1, 0], t };
}

/** Record the silhouette pose the model holds this step (once per sensing). */
function observe(battle, side) {
  const h = side.helm, pose = silhouettePose(side.model);
  if (!pose) return;
  const last = h.history[h.history.length - 1];
  if (last && last.step === side.model.silhouette.step) return;
  h.history.push({ step: side.model.silhouette.step, x: [...pose.x], theta: pose.theta });
  if (h.history.length > 3) h.history.shift();
}
/** The other ship's velocity and acceleration from the last silhouette poses (zero until there are enough). */
export function observed(battle, side) {
  const hs = side.helm.history, dt = battle.dt, n = hs.length;
  const v = n >= 2 ? [(hs[n - 1].x[0] - hs[n - 2].x[0]) / dt, (hs[n - 1].x[1] - hs[n - 2].x[1]) / dt] : [0, 0];
  const a = n >= 3 ? [(hs[2].x[0] - 2 * hs[1].x[0] + hs[0].x[0]) / (dt * dt), (hs[2].x[1] - 2 * hs[1].x[1] + hs[0].x[1]) / (dt * dt)] : null;
  return { v, a };
}

/** The room ids of the side's ship in the order of the priority slot's room types (the rest follow in routing's order). */
function priorityIds(world, types) {
  const out = [];
  for (const t of types) for (const r of world.rooms) if (r.type === t && r.placed) out.push(r.id);
  return out;
}

/**
 * One step of a side's helm, before the kernel's step: the orders (`side.helm.orders`, the enemy's overrides in
 * `side.helm.override`) executed from its model. Sets the wanted heading (side.heading, held by js/battle.js's RCS
 * rule), every engine's throttle, each weapon's order and aim, the shield, the power priority and the scans; returns
 * nothing. `battle.dt` the step.
 */
export function helmStep(battle, side) {
  const w = side.world, h = side.helm, model = side.model, me = flownBody(w), them = silhouettePose(model);
  observe(battle, side);
  const o = { ...h.orders, ...(h.override || {}) };
  if (!me || !them) return;
  const t = battle.t, edge = battle.edge, p = battle.params;
  const D = sub(them.x, me.x), r = len(D), u = r > 0 ? [D[0] / r, D[1] / r] : [1, 0], los = Math.atan2(u[1], u[0]);
  const { v: vo, a: ao } = observed(battle, side);
  const { a: a1, t180 } = shipDynamics(battle, side), throttle = o.throttle, a = a1 * throttle;
  const hot = heatFraction(w) >= o.heat.threshold, cold = o.emission === 'cold';
  const engineOff = cold || (hot && o.heat.response === 'engine');
  // Movement (#40 first): disengage, else the range order to the position's point on the braking curve (#301 (2)).
  let heading = null, open = 0, mode = null;
  const opening = (want) => throttle * Math.max(0, cos(wrap(want - me.theta)));
  if (o.range === 'disengage' || h.disengage) {
    heading = los + Math.PI; open = opening(heading); mode = 'disengage';
    if (h.disengageStep === null) h.disengageStep = battle.step; // the first to order it escapes first (#293)
  } else {
    const R = scaled(p.helm[{ close: 'rangeClose', hold: 'rangeHold', open: 'rangeOpen' }[o.range]], edge);
    const tc = cos(them.theta), ts = sin(them.theta);
    const bow = [tc, ts], left = [-ts, tc], side1 = dot(sub(me.x, them.x), left) >= 0 ? left : [-left[0], -left[1]];
    const dir = o.position === 'stern' ? [-tc, -ts] : o.position === 'flank' ? side1 : bow;
    const P = [them.x[0] + R * dir[0], them.x[1] + R * dir[1]], E = sub(P, me.x), e = len(E);
    const speed = brakingSpeed(e, a, t180), want = e > 0 ? [(E[0] / e) * speed, (E[1] / e) * speed] : [0, 0];
    const rel = sub(me.v, vo), err = sub(want, rel), errLen = len(err);
    h.engaged = throttle > 0 && a > 0 && rangeEngages(errLen, a, t180);
    if (h.engaged) { heading = Math.atan2(err[1], err[0]); open = opening(heading); mode = 'range'; }
    h.range = { R, e, want, rel, error: errLen, threshold: a * t180 };
  }
  // Facing (second), then dodging (third, broadside only).
  if (heading === null) {
    if (o.facing === 'broadside') {
      if (o.dodging === 'on') {
        if (h.nextFlip === null) h.nextFlip = t + dodgeInterval(battle, h);
        else if (t >= h.nextFlip - 1e-9) { h.dodgeSign = -h.dodgeSign; h.nextFlip = t + dodgeInterval(battle, h); }
        heading = los + (h.dodgeSign * Math.PI) / 2; open = opening(heading); mode = 'dodge';
      } else {
        const s = sin(wrap(me.theta - los)) >= 0 ? 1 : -1;
        heading = los + (s * Math.PI) / 2; mode = 'broadside';
      }
    } else { heading = los; mode = 'bow'; }
  }
  side.heading = wrap(heading);
  h.mode = mode;
  h.throttle = engineOff ? 0 : open;
  for (const e of w.rooms) if (e.type === 'engine') e.engine.throttle = h.throttle;
  // Shield: on, unless running cold or the heat response is the shield.
  const shieldOff = cold || (hot && o.heat.response === 'shield');
  for (const g of w.rooms) if (g.type === 'shieldGenerator') g.shield.on = !shieldOff;
  // Power priority (#38): the routing's order by the slot's room types.
  if (w.power) w.power.priority = priorityIds(w, o.priority);
  // Scans: the auto-scan order (the enemy issues it at its decisions, enemy.js), never running cold.
  if (!cold && o.autoScan === 'on' && h.autoScan) autoScan(side, o.emission === 'full');
  if (cold) for (const f of antennas(w)) if (f.scan) setScan(w, f, null);
  // Firepower: the target, the aim with lead, the open-fire rule, salvo or ripple.
  const tg = chooseTarget(side, o.target);
  h.target = tg;
  const held = !tg.point || (hot && o.heat.response === 'weapons') || !!h.hold || !openFire(battle, side, o, tg, vo, ao, u);
  h.held = held;
  if (held) { h.released = false; h.releaseAt = null; } else if (!h.released) { h.released = true; h.releaseAt = t; }
  const weapons = w.rooms.filter((x) => x.placed && !isDestroyed(x) && DISCRETE.has(x.type));
  weapons.forEach((x, i) => {
    const go = h.released && (o.firing === 'salvo' || t >= h.releaseAt + (i / weapons.length) * reloadOf(battle, x) - 1e-9);
    if (x.type === 'turret') {
      x.turret.hold = !go;
      if (tg.point) {
        const b = w.ship.bodies.find((y) => y.id === x.body) || me, S = worldPoint(b, x.position), vs = pointVelocity(b, S);
        const L = intercept(S, vs, tg.point, vo, roundOf(w, x.size, x.turret.want || 'standard').v);
        x.turret.aim = rotate(L.dir, -b.theta);
      }
    } else if (x.type === 'railgun') x.railgun.firing = go;
    else if (x.type === 'missileBay') x.missileBay.launching = go;
  });
  for (const x of w.rooms) {
    if (x.type !== 'beamBay') continue;
    const was = x.beamBay.firing;
    x.beamBay.firing = h.released && !isDestroyed(x);
    if (x.beamBay.firing && !was) side.beamId = `beam-${++battle.beams}`; // a new beam id each time the bay starts firing (one id space)
  }
}

/** A weapon's reload (s) for the ripple: a turret's interval, a railgun's, a bay's launch interval. */
function reloadOf(battle, room) {
  const p = battle.params, e = battle.edge;
  if (room.type === 'turret') return FIXED.sizeLinear.value[room.size] / scaled(p.turret.fireRate, e);
  if (room.type === 'railgun') return 1 / scaled(p.railgun.fireRate, e);
  return scaled(p.missilebay.launchInterval, e);
}

/**
 * The open-fire rule: 'inRange' within battle.cullDistance of the other ship's silhouette centre of mass (where a round
 * can arrive before it is culled); 'sureHit' when 1/2 x the other ship's observed acceleration across the line of sight
 * x the turret's time of flight^2 is under one cell edge (no acceleration observed yet: not sure).
 */
export function openFire(battle, side, o, tg, vo, ao, u) {
  const me = flownBody(side.world), them = silhouettePose(side.model);
  const r = len(sub(them.x, me.x));
  if (o.openFire === 'inRange') return r <= scaled(battle.params.battle.cullDistance, battle.edge);
  if (!ao) return false;
  const along = dot(ao, u), lat = len([ao[0] - along * u[0], ao[1] - along * u[1]]);
  const tf = timeOfFlight(battle, side, tg.point, vo);
  side.helm.sure = { lateral: lat, tf, miss: tf === null ? null : 0.5 * lat * tf * tf };
  return tf !== null && 0.5 * lat * tf * tf < battle.edge;
}
/** The time of flight of the side's first turret's round to `P` on the lead (null without a turret or an intercept). */
export function timeOfFlight(battle, side, P, vo) {
  const w = side.world, x = w.rooms.find((y) => y.type === 'turret' && y.placed && !isDestroyed(y));
  if (!x || !P) return null;
  const b = w.ship.bodies.find((y) => y.id === x.body) || flownBody(w), S = worldPoint(b, x.position);
  return intercept(S, pointVelocity(b, S), P, vo, roundOf(w, x.size, x.turret.want || 'standard').v).t;
}

/** Auto-scan: each idle antenna standing scans the nearest unresolved zone no other antenna scans; `full` re-scans the oldest resolved one when none is unresolved. */
export function autoScan(side, full = false) {
  const w = side.world, model = side.model, busy = new Set(antennas(w).filter((f) => f.scan).map((f) => f.scan.zone));
  for (const f of antennas(w)) {
    const host = side.room(f.room);
    if (f.scan || host.cells[f.k].destroyed) continue;
    const at = worldPoint(w.ship.bodies.find((b) => b.id === host.cells[f.k].fragment) || flownBody(w), f.p);
    let best = null;
    for (const z of model.zones) {
      if (busy.has(z.id) || model.resolved.has(z.id) || !z.cells.length) continue;
      const d = len(sub(zoneCentre(model, z.id), at));
      if (!best || d < best.d) best = { z: z.id, d };
    }
    if (!best && full) {
      for (const [z, step] of [...model.resolved.entries()].sort((p, q) => p[1] - q[1] || p[0] - q[0])) if (!busy.has(z)) { best = { z }; break; }
    }
    if (best) { setScan(w, f, best.z); busy.add(best.z); side.helm.scanCount++; }
  }
}

/** Live discrete and beam weapons of a side's ship (for the ripple and the reports). */
export const weaponRooms = (world) => world.rooms.filter((x) => x.placed && (DISCRETE.has(x.type) || x.type === 'beamBay') && survivingCells(x) > 0);
