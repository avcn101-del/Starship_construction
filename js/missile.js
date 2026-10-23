// missile.js — missiles in flight (DESIGN.md 13n.1 (c), L5c; #97, #148, #278,
// #292). A missile is a kernel munition like a round: launched by a missile bay
// (rooms.js) into its ship's world.ship.missiles at the hull's velocity, it
// thrusts along its own heading at missile.acceleration for missile.burnTime
// (exact constant-acceleration kinematics within a step, the burn's end cut
// where it falls), then coasts. Its seeker picks its aim point each step from its
// own side's knowledge model only (js/sensors.js): IR the nearest resolved IR
// source of the other ship (a panel or an exhaust), radar the centre of the
// nearest zone its side has resolved, anti-radiation the nearest resolved EM
// source (a scanning antenna, an absorbing shield), designated the model's aim
// point of the room its ship targets; with nothing resolved, the silhouette's
// centre. Its heading turns onto the aim point each step (a game rule: no turn
// rate). Its hp follow the one law, matter.burnEnergyPerKg x its mass; its
// exhaust is an IR source of jet power m a v_e / 2 (the engine's formula), and a
// radar seeker scanning is an EM source of sensor.scanPower (js/sensors.js
// lists both). The battle (js/battle.js) moves it, tests it against the other
// hull along its segment, culls it and acts its warhead.
// No DOM, no Math.random.
import { scaled } from './data.js';
import { worldPoint } from './body.js';
import { knownAim, zoneCentre } from './sensors.js';

const tierScaled = (world, p) => scaled(p, world.edge);
const dist2 = (a, b) => { const dx = a[0] - b[0], dy = a[1] - b[1]; return dx * dx + dy * dy; };
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];

/** A missile's hp (J): matter.burnEnergyPerKg x missile.mass, the one law (13n.1 (c)). */
export function missileHp(world) {
  return world.params.matter.burnEnergyPerKg.value * tierScaled(world, world.params.missile.mass);
}
/** The jet power (W) of a burning missile's exhaust, its IR brightness: m a v_e / 2 (the engine's formula, 13n.1 (a) (c)). */
export function missileJet(world, x) {
  return (x.m * world.params.missile.acceleration.value * world.params.engine.exhaustVelocity.value) / 2;
}
/** Whether missile x burns at time t (s): from its launch until missile.burnTime later. */
export const burning = (world, x, t) => t < x.t + world.params.missile.burnTime.value;

/**
 * Move missile x over the step [t, t + dt] (13n.1 (c)): thrust missile.acceleration along its heading while it burns
 * (until x.t + missile.burnTime, the step cut there), then coast; exact for a constant acceleration. Keeps its position
 * at the step's start in x.prev. Returns the thrust's books: the impulse J (N s), the angular impulse about the world
 * origin H and the work (J), each the missile's own change (the thrust is the only force on it).
 */
export function moveMissile(world, x, t, dt) {
  const a = world.params.missile.acceleration.value, end = x.t + world.params.missile.burnTime.value;
  const burn = Math.max(0, Math.min(dt, end - t)), h = x.heading;
  const P0 = [x.m * x.v[0], x.m * x.v[1]], L0 = x.m * cross(x.x, x.v), K0 = 0.5 * x.m * (x.v[0] * x.v[0] + x.v[1] * x.v[1]);
  x.prev = [...x.x];
  if (burn > 0) {
    x.x = [x.x[0] + x.v[0] * burn + 0.5 * a * h[0] * burn * burn, x.x[1] + x.v[1] * burn + 0.5 * a * h[1] * burn * burn];
    x.v = [x.v[0] + a * h[0] * burn, x.v[1] + a * h[1] * burn];
  }
  const coast = dt - burn;
  if (coast > 0) x.x = [x.x[0] + x.v[0] * coast, x.x[1] + x.v[1] * coast];
  const J = [x.m * x.v[0] - P0[0], x.m * x.v[1] - P0[1]];
  return { J, H: x.m * cross(x.x, x.v) - L0, work: 0.5 * x.m * (x.v[0] * x.v[0] + x.v[1] * x.v[1]) - K0 };
}

/** The silhouette's centre (world m): the centre of the box of the other ship's standing cells, on its main body's pose (#23). */
export function silhouetteCentre(model) {
  const s = model.silhouette, e = model.other.edge;
  if (!s.cells.length) return null;
  const xs = s.cells.map((c) => c[0]), ys = s.cells.map((c) => c[1]);
  const pose = s.bodies.find((b) => b.id === 'body-0') || s.bodies[0];
  return worldPoint(pose, [((Math.min(...xs) + Math.max(...xs) + 1) / 2) * e, ((Math.min(...ys) + Math.max(...ys) + 1) / 2) * e]);
}

const IR_KINDS = new Set(['panel', 'exhaust']), EM_KINDS = new Set(['antenna', 'shield']);
/** The nearest source of `kinds` the model resolves this step, from point X; ties by source id. */
function nearestSource(model, kinds, X) {
  let best = null;
  for (const [id, s] of [...model.sources.entries()].sort((p, q) => (p[0] < q[0] ? -1 : p[0] > q[0] ? 1 : 0))) {
    if (!s.now || !kinds.has(s.kind)) continue;
    const d = dist2(s.position, X);
    if (!best || d < best.d) best = { id, d, position: s.position };
  }
  return best;
}
/**
 * The aim point (world m) seeker `kind` picks for missile x from its side's model (13n.1 (c), #97): { point, by } with
 * `by` the source id, 'zone-<z>', the room id, or 'silhouette' when nothing of its kind is resolved. `target`: the room
 * its ship targets (the designated seeker).
 */
export function seekerAim(model, x, target = null) {
  let by = null, point = null;
  if (x.seeker === 'ir' || x.seeker === 'antiRadiation') {
    const s = nearestSource(model, x.seeker === 'ir' ? IR_KINDS : EM_KINDS, x.x);
    if (s) { by = s.id; point = [...s.position]; }
  } else if (x.seeker === 'radar') {
    let best = null;
    for (const z of [...model.resolved.keys()].sort((a, b) => a - b)) { const c = zoneCentre(model, z), d = dist2(c, x.x); if (!best || d < best.d) best = { z, d, c }; }
    if (best) { by = `zone-${best.z}`; point = best.c; }
  } else if (x.seeker === 'designated' && target) {
    const p = knownAim(model, target);
    if (p) { by = target; point = p; }
  }
  if (!point) { point = silhouetteCentre(model); by = 'silhouette'; }
  return { point, by };
}
/** Turn missile x onto world point P (a game rule: no turn rate); a missile already at P keeps its heading. */
export function steer(x, P) {
  const d = [P[0] - x.x[0], P[1] - x.x[1]], L = Math.sqrt(d[0] * d[0] + d[1] * d[1]);
  if (L > 0) x.heading = [d[0] / L, d[1] / L];
}
