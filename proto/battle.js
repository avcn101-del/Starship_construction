// proto/battle.js — the feel prototype v2's battle (DESIGN.md 13j, #217, #237):
// two R1s on the path model's kernel, flown by a stand-in autopilot from three
// standing orders (range, facing, dodge), with rounds that fly from a
// lead-aimed turret and hit or miss for physical reasons only, a spinal beam
// that hits whatever the ship's axis crosses, the three presets, the scripted
// enemy, and the end at Disabled or destruction. No DOM: it runs in Node
// (proto/measure.mjs, proto/replay.mjs) and in the page (proto/proto.js). No
// Math.random: the seeded RNG of js/util.js only. It only reads and drives the
// kernel through its exported functions; it never changes js/. Every physics
// number comes from js/data.js (the loadout's shield budget and hits to wreck
// as run-time overrides within their approved ranges); every prototype
// setting from proto/config.js.
// The kernel turns ships with js/util.js's deterministic sin and cos (#239 Q6, 13k.1), so a battle replays across
// engines; this file uses them too.
import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, setDemand, enablePowerRouting, setBeams, setRcs, shieldRound, fireRound, fireBeam, beamEnergy, step, readout, isDestroyed, survivingCells, survivingFraction, magazineContents, cellAt, plateEntry, cull } from '../js/rooms.js';
import { withOverrides, TIERS, FIXED, PARAMS, ROOMS, scaled } from '../js/data.js';
import { rng, sin } from '../js/util.js';
import { roundGeometry } from '../js/projectile.js';
import { validateShip } from '../js/layout.js';
import { weaponStates, largestFraction } from '../js/battle.js';
import { cascadeTree } from '../js/events.js';
import { rotate, worldPoint, pointVelocity } from '../js/body.js';
import { LAYOUTS, LOADOUT, START_SEPARATION, TIER, SEED, PRESETS, SCRIPT, RANGES, AUTOPILOT, defaultLoadout } from './config.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
// Math.sqrt is correctly rounded everywhere; Math.hypot differs in its last digit between Node's V8 and a phone's
// browser, which would break the replay's event hash.
const len = (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1]);
const wrap = (a) => a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));

/** The kernel's validation of a layout of config.js (js/layout.js validateShip); throws with its reasons. */
export function validateLayout(key) {
  const tier = TIERS[TIER], L = LAYOUTS[key];
  const v = validateShip({
    grid: tier.grid, edge: tier.edge,
    rooms: L.rooms.map((r) => ({ id: r.id, type: r.type, size: 'M', cell: r.cell, rotation: r.rotation || 0 })),
    fittings: L.fittings.map(([type, room, cell, side]) => ({ type, room, cell, side })),
  }, ROOMS);
  if (!v.valid) throw new Error(`layout ${key} is not valid: ${v.reasons.map((r) => `${r.rule} ${r.room}: ${r.detail}`).join('; ')}`);
  return v;
}

/** One ship of the loadout's layout: `side` 'player' (centre of mass at the origin, facing +x) or 'enemy' (the start separation ahead, facing -x), at rest. */
function buildShip(params, side, loadout, orders, seed) {
  const tier = TIERS[TIER], edge = tier.edge, L = LAYOUTS[loadout.layout];
  validateLayout(loadout.layout);
  const world = createWorld({ params, edge, grid: tier.grid });
  for (const r of L.rooms) addRoom(world, r.type, { id: r.id, cell: r.cell, rotation: r.rotation || 0 });
  for (const [type, room, cell, sideOut] of L.fittings) addFitting(world, type, room, cell, sideOut);
  const room = (id) => world.rooms.find((r) => r.id === id);
  // As the L3 scenarios build R1: the turret's ready store full; the magazine as the loadout says, by mass
  // (fractions of magazine.capacity; the kernel's loadMagazine makes whole rounds of it). Default: full of HE.
  const mag = LOADOUT.magazine.options.find((o) => o.value === loadout.magazine), capacity = scaled(params.magazine.capacity, edge);
  loadMagazine(world, room('magazine'), { apMass: mag.ap * capacity, heMass: mag.he * capacity });
  loadTurret(room('turret'), params.turret.readyRounds.value);
  room('turret').turret.hold = true;
  room('turret').turret.aim = [1, 0];
  enablePowerRouting(world);
  setDemand(world, room('reactor'), 1); // routing delivers only what is drawn (#193)
  const heading = side === 'player' ? 0 : Math.PI, centre = readout(world).centre;
  const at = side === 'player' ? [0, 0] : [START_SEPARATION, 0], r = rotate(centre, heading);
  enableShip(world, { origin: [at[0] - r[0], at[1] - r[1]], heading });
  const crewTotal = world.rooms.reduce((x, rm) => x + rm.crewTotal, 0);
  const random = rng(seed);
  const bay = world.layout.rooms.get('beamBay');
  return {
    side, world, room, orders: { ...orders }, preset: 'fire', target: null, crewTotal, crewLost: 0, logIndex: 0, size: L.size, rng: random,
    // The beam leaves along the ship's axis from the bay's bow face (#234), at the bay's centre row.
    bayFace: [(Math.max(...bay.cells.map((c) => c[0])) + 1) * edge, room('beamBay').position[1]],
    rcs: world.fittings.filter((f) => f.type === 'rcs'),
    // The dodge's first sign and first flip come from the ship's stream too.
    helm: { ranging: false, dodgeSign: random() < 0.5 ? 1 : -1, nextFlip: AUTOPILOT.dodgeMin + (AUTOPILOT.dodgeMax - AUTOPILOT.dodgeMin) * random(), side: 1, heading: heading, throttle: 0, lateral: 0, rcsOn: [] },
    beam: { power: 0, absorbed: 0, passed: 0, hit: null, from: null, dir: null },
    stats: { shots: 0, hits: 0, misses: 0 },
    disabledSince: null, disabled: false, destroyed: false, destroyedBy: null, firstFailure: null,
    undock: world.ship.bodies.reduce((m, b) => m + b.M, 0), weaponsLost: new Map(), endParent: null, beams: 0, beamId: null,
  };
}

/** The run-time overrides a loadout asks for; throws on a value outside the constant's approved range. */
export function loadoutOverrides(loadout) {
  const out = {};
  for (const [key, lever] of Object.entries(LOADOUT)) {
    if (!lever.override || loadout[key] === null) continue;
    const [g, n] = lever.override.split('.'), p = PARAMS[g][n], v = loadout[key];
    if (!p.approved || v < p.min || v > p.max) throw new Error(`${lever.override} = ${v} is outside its approved range ${p.min}-${p.max}`);
    out[lever.override] = v;
  }
  return out;
}

/**
 * Create a battle. `scripted`: which sides follow the enemy's script ({ enemy: true } by default; the headless
 * measure scripts both). `loadout` (config.js LOADOUT; missing levers take their default): magazine, layout, shield
 * budget, hits to wreck and turrets apply to both ships; range, facing and dodge are the player's standing orders.
 * A scripted ship flies SCRIPT.orders, with `scriptRange` (a RANGES key) in place of its range when given.
 */
export function createBattle({ seed = SEED, overrides = {}, scripted = { player: false, enemy: true }, loadout = {}, scriptRange = null } = {}) {
  const lo = { ...defaultLoadout(), ...loadout };
  for (const [k, v] of Object.entries(lo)) if (!LOADOUT[k] || !LOADOUT[k].options.some((o) => o.value === v)) throw new Error(`unknown loadout ${k} = ${v}`);
  if (scriptRange !== null && !RANGES[scriptRange]) throw new Error(`unknown range ${scriptRange}`);
  const params = withOverrides({ ...loadoutOverrides(lo), ...overrides });
  const scriptOrders = { ...SCRIPT.orders, ...(scriptRange ? { range: scriptRange } : {}) };
  const ordersOf = (side) => (scripted[side] ? scriptOrders : { range: lo.range, facing: lo.facing, dodge: lo.dodge });
  // Each ship's own stream of the seeded RNG (js/util.js): it times the dodge.
  const player = buildShip(params, 'player', lo, ordersOf('player'), 2 * seed), enemy = buildShip(params, 'enemy', lo, ordersOf('enemy'), 2 * seed + 1);
  player.other = enemy; enemy.other = player;
  player.name = 'P'; enemy.name = 'E';
  const edge = TIERS[TIER].edge, k = params.kinetic;
  const mass = scaled(k.roundMass, edge) * FIXED.sizeLinear.value.M ** 3, velocity = scaled(k.muzzleVelocity, edge);
  const { A } = roundGeometry(mass, FIXED.steelDensity.value, FIXED.roundLengthToDiameter.value);
  const battle = {
    seed, params, loadout: lo, player, enemy, ships: [player, enemy], scripted, scriptRange, beamOnly: lo.turrets === false, dt: player.world.dt, t: 0, steps: 0,
    round: { mass, velocity, area: A }, edge, grid: TIERS[TIER].grid,
    thrust: scaled(params.engine.thrust, edge), rcsForce: scaled(params.rcs.force, edge),
    // Battle-level constants of js/data.js (#82, #222 (7), 13k.2): culling and Disabled.
    cullDistance: scaled(params.battle.cullDistance, edge), disabledSeconds: scaled(params.battle.disabledSeconds, edge),
    rounds: [], hits: [], events: [], inputs: [], ended: null,
  };
  for (const s of battle.ships) if (scripted[s.side]) scriptUpdate(battle, s);
  for (const s of battle.ships) applyPreset(battle, s);
  return battle;
}

// ---------- the player's verbs (13j.2) and the enemy's script ----------
/** Target an enemy room by id (the player's verb); null clears it. Recorded for replay. */
export function setTarget(battle, ship, id) {
  ship.target = id;
  battle.inputs.push({ step: battle.steps, side: ship.side, kind: 'target', value: id });
}
/** Switch preset (the player's verb). Recorded for replay. */
export function setPreset(battle, ship, preset) {
  if (!PRESETS[preset]) throw new Error(`unknown preset ${preset}`);
  ship.preset = preset;
  battle.inputs.push({ step: battle.steps, side: ship.side, kind: 'preset', value: preset });
}

/** The enemy's fixed script (13j.2): Fire 60 s, Cool 30 s, repeat; beam bay, then turret, then engine, each until wrecked. */
function scriptUpdate(battle, ship) {
  const cycle = SCRIPT.phases.reduce((x, p) => x + p.seconds, 0);
  let t = battle.t % cycle;
  for (const p of SCRIPT.phases) { if (t < p.seconds) { ship.preset = p.preset; break; } t -= p.seconds; }
  const other = ship.other;
  ship.target = SCRIPT.targets.find((id) => !isDestroyed(other.room(id))) || null;
}

const targetAlive = (ship) => ship.target !== null && !isDestroyed(ship.other.room(ship.target));
/** The orders the ship flies now: its standing orders, with what its preset overrides. */
export const ordersNow = (ship) => ({ ...ship.orders, ...(PRESETS[ship.preset].orders || {}) });

/** Set the kernel's weapon and shield controls from the ship's preset and target (the helm sets engine and RCS). */
function applyPreset(battle, ship) {
  const p = PRESETS[ship.preset], aim = targetAlive(ship), bb = ship.room('beamBay').beamBay;
  if (p.beam && aim && !bb.firing) ship.beamId = `${ship.name}:beam-${++ship.beams}`; // a beam id per firing spell: a root of the cascade tree (13l.1)
  bb.firing = p.beam && aim;
  ship.room('turret').turret.hold = !(p.turret && aim && !battle.beamOnly); // beamOnly: the loadout's turrets off (the beam-only probe)
  ship.room('shield').shield.on = p.shield;
}

// ---------- bodies and grids ----------
/** The ship's main body: body-0 (the heaviest piece of any split keeps it, 13f.1); once nothing is left, the last one seen. */
export function mainBody(ship) {
  const bodies = ship.world.ship.bodies, b = bodies.find((x) => x.id === 'body-0') || bodies[0];
  if (b) ship.lastBody = b;
  return b || ship.lastBody;
}
/** The body a room works in. */
export function bodyOf(ship, room) {
  return ship.world.ship.bodies.find((b) => b.id === room.body) || mainBody(ship);
}
/** Grid point (m, the body's own frame) of world point q on a body pose { x, c, theta }. */
export function toGrid(pose, q) {
  const r = rotate(sub(q, pose.x), -pose.theta);
  return [r[0] + pose.c[0], r[1] + pose.c[1]];
}
const poseOf = (b) => ({ id: b.id, x: [...b.x], c: [...b.c], theta: b.theta });

/**
 * The grid cells a ray crosses in order (Amanatides-Woo), in a grid of `grid` [columns, rows] cells of `edge` m:
 * origin o and unit direction d in grid metres, up to a distance `maxT` along it. Each: { cell: [i, j], t } with t
 * where the ray enters the cell. STAND-IN: a cell the line clips at a corner counts as crossed whole. When the ray
 * leaves the grid (not cut short by maxT), `exit` on the array is the cell off the grid it steps into, { cell, t },
 * so a plate on the last cell's outer segment can be found (13l.1).
 */
export function crossedCells(o, d, grid, edge, maxT = Infinity) {
  const W = grid[0] * edge, H = grid[1] * edge;
  let t0 = 0, t1 = maxT;
  for (const [p, v, hi] of [[o[0], d[0], W], [o[1], d[1], H]]) {
    if (Math.abs(v) < 1e-12) { if (p < 0 || p >= hi) return []; continue; }
    let a = (0 - p) / v, b = (hi - p) / v;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b);
  }
  if (!(t0 < t1)) return [];
  const p = [o[0] + d[0] * t0, o[1] + d[1] * t0];
  let i = Math.min(grid[0] - 1, Math.max(0, Math.floor(p[0] / edge))), j = Math.min(grid[1] - 1, Math.max(0, Math.floor(p[1] / edge)));
  const sx = d[0] > 0 ? 1 : d[0] < 0 ? -1 : 0, sy = d[1] > 0 ? 1 : d[1] < 0 ? -1 : 0;
  const next = (c, v, s, q) => (s === 0 ? Infinity : ((c + (s > 0 ? 1 : 0)) * edge - q) / v);
  let tx = t0 + next(i, d[0], sx, p[0]), ty = t0 + next(j, d[1], sy, p[1]);
  const dx = sx === 0 ? Infinity : edge / Math.abs(d[0]), dy = sy === 0 ? Infinity : edge / Math.abs(d[1]);
  const out = [];
  let t = t0;
  while (t < t1 && i >= 0 && j >= 0 && i < grid[0] && j < grid[1]) {
    out.push({ cell: [i, j], t });
    if (tx <= ty) { t = tx; tx += dx; i += sx; } else { t = ty; ty += dy; j += sy; }
  }
  if (out.length && !(i >= 0 && j >= 0 && i < grid[0] && j < grid[1])) out.exit = { cell: [i, j], t };
  return out;
}

/**
 * What a line meets on a ship: for each of its bodies, the line from world point `from` (on the pose `before`
 * of that body) to world point `to` (on its pose now), or the ray from `from` along `dir` (world) if `to` is null,
 * through the body's grid; the first room cell or armour plate of that body it crosses (a hole counts: a destroyed
 * cell stays on the path, #212 (5)) within the segment opens the path, which runs on to the grid's edge. An armour
 * plate (the kernel's plateEntry, 13l.1, #258) enters the path where the line crosses its wall segment, before the
 * next cell, with the cosine of the line to its normal (sigma / cos theta in the kernel), a plate on the segment where
 * the line leaves the grid included. A path without a surviving cell is no hit. Returns
 * the nearest hit { body, entry (grid m), dir (grid), path [{ room, cell } or { plate }], cells [[i, j]] (room
 * cells only), t (fraction of the segment, or distance along the ray), length (grid m of the segment) } or null.
 */
function lineHit(battle, ship, from, to, dir, before = null) {
  let best = null;
  for (const b of ship.world.ship.bodies) {
    const pose0 = (before && before.get(b.id)) || b;
    const a = toGrid(pose0, from);
    let d, L;
    if (to) { const e = sub(toGrid(b, to), a); L = len(e); if (!(L > 0)) continue; d = [e[0] / L, e[1] / L]; } else { d = rotate(dir, -b.theta); L = Infinity; }
    const cells = crossedCells(a, d, battle.grid, battle.edge);
    let first = -1;
    const path = [], at = [];
    for (let k = 0; k < cells.length; k++) {
      // The segment the line crosses into cell k: from cell k - 1, or for the first cell from outside the grid.
      const [i, j] = cells[k].cell, e = battle.edge, p0 = [a[0] + d[0] * cells[k].t, a[1] + d[1] * cells[k].t];
      const on = (q, v) => Math.abs(q - v) < 1e-9;
      const prev = k > 0 ? cells[k - 1].cell : on(p0[0], i * e) ? [i - 1, j] : on(p0[0], (i + 1) * e) ? [i + 1, j] : on(p0[1], j * e) ? [i, j - 1] : on(p0[1], (j + 1) * e) ? [i, j + 1] : null;
      const x = prev ? plateEntry(ship.world, prev, cells[k].cell, d) : null;
      if (x && ship.room(x.plate.room).cells[x.plate.k].fragment === b.id) {
        if (first < 0) { if (cells[k].t > L) break; first = k; }
        path.push(x);
      }
      const c = cellAt(ship.world, cells[k].cell);
      if (!c || c.room.cells[c.index].fragment !== b.id) continue;
      if (first < 0) { if (cells[k].t > L) break; first = k; }
      path.push({ room: c.room, cell: c.index });
      at.push(cells[k].cell);
    }
    if (first >= 0 && cells.exit) { // the segment where the line leaves the grid (N6 of the L4a review)
      const x = plateEntry(ship.world, cells[cells.length - 1].cell, cells.exit.cell, d);
      if (x && ship.room(x.plate.room).cells[x.plate.k].fragment === b.id) path.push(x);
    }
    if (first < 0 || !path.some((x) => !x.plate && !x.room.cells[x.cell].destroyed)) continue;
    const t = cells[first].t;
    if (best && (to ? t / L : t) >= best.t) continue;
    best = { body: b.id, entry: [a[0] + d[0] * t, a[1] + d[1] * t], dir: d, path, cells: at, t: to ? t / L : t, length: L };
  }
  return best;
}

// ---------- the stand-in autopilot (for L4's helm.js; DESIGN.md 13j.2) ----------
/** The engine's thrust (N) at a throttle, as its behaviour would give it at full power (0 if it cannot run). */
function thrustAt(battle, ship, throttle) {
  const e = ship.room('engine');
  if (isDestroyed(e) || !e.controlled || e.shutdown || !e.active || e.body !== mainBody(ship).id) return 0;
  return throttle * battle.thrust * e.footprintFactor * survivingFraction(e); // the routed power fraction is the kernel's to apply
}
/** RCS fittings on the main body able to fire, each with its torque about the centre of mass and its force along the body's y (at full power). */
function rcsAble(battle, ship, body) {
  const out = [];
  for (const f of ship.rcs) {
    const host = ship.room(f.room), cell = host.cells[f.k];
    if (cell.destroyed || cell.fragment !== body.id || isDestroyed(host) || !host.controlled || host.shutdown || !host.active) continue;
    const F = battle.rcsForce, Fx = -f.side[0] * F, Fy = -f.side[1] * F;
    out.push({ id: f.id, tau: (f.p[0] - body.c[0]) * Fy - (f.p[1] - body.c[1]) * Fx, Fy });
  }
  return out;
}

/**
 * STAND-IN autopilot, before each step: the three standing orders in #40's order. Range first: out of the dead band,
 * or drifting faster than the drift limit (and until back in the band at the wanted velocity), the ship flies a
 * wanted closing speed with no drift across the line of sight, thrusting along the velocity error. Facing next: bow-on points the bow at the enemy; broadside puts the line of sight across the axis. Dodge last:
 * the sign of the thrust across the line of sight flips at seeded random intervals; broadside the engine (it pushes
 * only forward) means turning to the other broadside, bow-on only the RCS pushes sideways. The engine opens to the
 * preset's throttle only within the aim tolerance of the wanted heading. The RCS holds and turns the heading:
 * a time-optimal turn rate, the torque it needs less the thrust's, met by the subset of able fittings closest to it
 * (bang-bang over the steps), and, while dodging bow-on with the heading held, the sideways push.
 */
function helm(battle, ship) {
  const A = AUTOPILOT, h = ship.helm, p = PRESETS[ship.preset], orders = ordersNow(ship);
  const me = mainBody(ship), them = mainBody(ship.other);
  const d = sub(them.x, me.x), R = len(d), u = [d[0] / R, d[1] / R], los = Math.atan2(u[1], u[0]);
  const vrel = sub(them.v, me.v), vr = dot(vrel, u); // vr > 0: opening
  const err = R - RANGES[orders.range], canThrust = p.throttle > 0 && thrustAt(battle, ship, 1) > 0;
  // The relative velocity wanted: a closing speed along the line of sight, no drift across it. dv: what is off.
  const wanted = -Math.max(-A.maxClosingSpeed, Math.min(A.maxClosingSpeed, A.rangeGain * err));
  const dv = [vrel[0] - wanted * u[0], vrel[1] - wanted * u[1]], dvn = len(dv);
  if (!canThrust) h.ranging = false;
  else if (!h.ranging && (Math.abs(err) > A.rangeDeadBand || dvn > A.driftLimit)) h.ranging = true;
  else if (h.ranging && Math.abs(err) <= A.rangeDeadBand && dvn <= A.speedTolerance) h.ranging = false;
  if (orders.dodge && battle.t >= h.nextFlip) { h.dodgeSign = -h.dodgeSign; h.nextFlip = battle.t + A.dodgeMin + (A.dodgeMax - A.dodgeMin) * ship.rng(); }
  let heading, engine = false, lateral = 0, mode;
  if (h.ranging) {
    mode = 'range';
    // Accelerating along dv takes it out of the relative velocity; inside the tolerance: coast, pointed where the error says.
    engine = dvn > A.speedTolerance;
    heading = engine ? Math.atan2(dv[1], dv[0]) : err > 0 ? los : los + Math.PI;
  } else if (orders.facing === 'broadside') {
    mode = orders.dodge ? 'broadside, dodging' : 'broadside';
    if (!orders.dodge) h.side = sin(wrap(me.theta - los)) >= 0 ? 1 : -1; // the nearer broadside
    heading = los + (orders.dodge ? h.dodgeSign : h.side) * Math.PI / 2;
    engine = orders.dodge;
  } else {
    mode = orders.dodge ? 'bow-on, dodging (RCS)' : 'bow-on';
    heading = los;
    lateral = orders.dodge ? h.dodgeSign : 0;
  }
  const off = wrap(heading - me.theta), aligned = Math.abs(off) < A.aimTolerance;
  const throttle = engine && aligned && canThrust ? p.throttle : 0;
  ship.room('engine').engine.throttle = throttle;
  // Heading: a time-optimal turn rate toward the wanted heading on a fraction of the couple's angular acceleration.
  const able = rcsAble(battle, ship, me);
  const ccw = able.reduce((x, f) => x + Math.max(0, f.tau), 0), cw = able.reduce((x, f) => x + Math.max(0, -f.tau), 0);
  const alpha = (A.turnAuthority * Math.min(ccw, cw)) / me.I;
  const omegaWanted = alpha > 0 ? Math.sign(off) * Math.sqrt(2 * alpha * Math.abs(off)) : 0;
  const e = ship.room('engine'), arm = e.exhaust ? e.exhaust[1] - me.c[1] : 0;
  const tauNeed = (me.I * (omegaWanted - me.omega)) / A.turnRateTime + arm * thrustAt(battle, ship, throttle); // thrust torque -arm F, cancelled
  const push = lateral !== 0 && aligned ? lateral * able.reduce((x, f) => x + Math.max(0, lateral * f.Fy), 0) : 0;
  const tauRef = Math.max(1, ...able.map((f) => Math.abs(f.tau))), fRef = battle.rcsForce;
  let bestOn = [], bestCost = Infinity;
  for (let mask = 0; mask < 1 << able.length; mask++) {
    let tau = 0, Fy = 0;
    const on = [];
    able.forEach((f, k) => { if (mask & (1 << k)) { tau += f.tau; Fy += f.Fy; on.push(f.id); } });
    const cost = ((tauNeed - tau) / tauRef) ** 2 + (push !== 0 ? ((push - Fy) / fRef) ** 2 : 0);
    if (cost < bestCost - 1e-12) { bestCost = cost; bestOn = on; }
  }
  setRcs(ship.world, ship.rcs.map((f) => f.id), false);
  if (bestOn.length) setRcs(ship.world, bestOn, true);
  Object.assign(h, { heading, throttle, lateral: push !== 0 ? lateral : 0, rcsOn: bestOn, mode, range: R, rangeRate: vr });
}

// ---------- weapons ----------
/**
 * STAND-IN free aim (no traverse arc, no slew): the turret aims at the lead point, the target room's position
 * extrapolated at the velocity of that point of its ship over the time of flight. With r the target from the
 * muzzle and w its velocity less the shooter's, the round (shooter's velocity plus u along the aim) meets it when
 * |r + w t| = u t: (w.w - u^2) t^2 + 2 r.w t + r.r = 0, the smallest positive root. The aim goes into the turret's
 * frame so the kernel's recoil is right. No dispersion.
 */
function aimTurret(battle, ship) {
  const t = ship.room('turret');
  if (t.turret.hold || !targetAlive(ship)) return;
  const sb = bodyOf(ship, t), tr = ship.other.room(ship.target), tb = bodyOf(ship.other, tr);
  const S = worldPoint(sb, t.position), P = worldPoint(tb, tr.position);
  const r = sub(P, S), w = sub(pointVelocity(tb, P), pointVelocity(sb, S)), u = battle.round.velocity;
  const a = dot(w, w) - u * u, b = 2 * dot(r, w), c = dot(r, r);
  let tof = null;
  if (Math.abs(a) < 1e-9) tof = b < 0 ? -c / b : null;
  else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const q = Math.sqrt(disc), roots = [(-b - q) / (2 * a), (-b + q) / (2 * a)].filter((x) => x > 0);
      tof = roots.length ? Math.min(...roots) : null;
    }
  }
  const lead = tof === null ? r : [r[0] + w[0] * tof, r[1] + w[1] * tof], L = len(lead);
  if (!(L > 0)) return;
  t.turret.aim = rotate([lead[0] / L, lead[1] / L], -sb.theta);
  ship.lead = { tof, point: [S[0] + lead[0], S[1] + lead[1]] };
}

/**
 * The spinal beam (#234), before the step: it leaves along the ship's axis from the beam bay's bow face and meets
 * whatever that line crosses on the enemy (possibly nothing: a miss). The kernel's shield takes it at the hull
 * entry point (setBeams); the bay's beam power is its last step's (the bay's behaviour sets it).
 */
function beamsIn(battle, shooter) {
  const target = shooter.other, bb = shooter.room('beamBay').beamBay, power = bb.firing ? bb.beam : 0;
  const body = bodyOf(shooter, shooter.room('beamBay'));
  const from = worldPoint(body, shooter.bayFace), dir = rotate([1, 0], body.theta);
  const hit = power > 0 ? lineHit(battle, target, from, null, dir) : null;
  Object.assign(shooter.beam, { power, from, dir, hit, absorbed: 0, passed: 0, landed: false, deepest: 0 });
  setBeams(target.world, hit ? [{ id: `${shooter.name}:beam`, position: hit.entry, power }] : []);
}
/** After the step: what the shield let through goes along the path (kernel fireBeam: heat and integrity by the Bethe deposit). */
function beamsOut(battle, shooter) {
  const target = shooter.other, b = shooter.beam;
  if (!b.hit) return;
  const res = target.world.beamResults.find((x) => x.id === `${shooter.name}:beam`);
  if (!res) return;
  b.absorbed = res.absorbed; b.passed = res.passed;
  if (b.passed > 0) {
    const range = len(sub(worldPoint(mainBody(target), mainBody(target).c), b.from));
    const res = fireBeam(target.world, { power: b.passed, energy: beamEnergy(shooter.world, shooter.room('beamBay')), range }, b.hit.path, shooter.beamId);
    b.landed = true;
    const deepest = res.fractions.reduce((k, F, i) => (F > 0 ? i : k), 0);
    b.deepest = b.hit.path.slice(0, deepest + 1).filter((x) => !x.plate).length - 1; // the deepest room cell it reached, for the view
  }
}

/** A kernel 'shot' launched a round (the kernel's recoil put it in the shooter's world: x, v, x0, cause); it flies on here. */
function launch(battle, shooter, e) {
  const k = shooter.world.ship.rounds.find((x) => x.cause === e.cause);
  if (!k) return;
  shooter.stats.shots++;
  // The kernel already moved it in its first step (dt - at, F20): it left the muzzle at x0.
  battle.rounds.push({ shooter, target: shooter.other, x: [...k.x], prev: [...k.x0], v: [...k.v], t0: e.t, cause: `${shooter.name}:${e.cause}` });
}

/**
 * Rounds after the step: each round's segment of the step, from where it was on the target's pose before the step
 * to where it is on its pose now, is tested against the target's hull cells. A hit: the kernel's shieldRound slows
 * it at the hull entry point (its impulse goes to the generator's ship), then its fireRound resolves it along the
 * cells the line crosses from entry to exit, at the speed of the round relative to the hull, giving the hit ship its
 * impulse and heat (13k.1). A round that crosses nothing flies on; farther than battle.cullDistance from every body
 * of both ships it leaves play, a miss (the kernel's culling rule, #222 (7)). Each world's own record of the rounds
 * it fired is culled by the kernel's cull().
 */
function flyRounds(battle, before) {
  const keep = [];
  const bodies = battle.ships.flatMap((s) => s.world.ship.bodies);
  for (const r of battle.rounds) {
    const hit = lineHit(battle, r.target, r.prev, r.x, null, before.get(r.target.side));
    if (hit) { strike(battle, r, hit); continue; }
    if (bodies.every((b) => len(sub(r.x, b.x)) > battle.cullDistance)) {
      r.shooter.stats.misses++;
      battle.events.push({ side: r.target.side, t: battle.t, type: 'round-missed', room: '-', cause: r.cause, flight: battle.t - r.t0 });
      continue;
    }
    r.prev = [...r.x];
    r.x = [r.x[0] + r.v[0] * battle.dt, r.x[1] + r.v[1] * battle.dt];
    keep.push(r);
  }
  battle.rounds = keep;
  for (const s of battle.ships) cull(s.world);
}
function strike(battle, r, hit) {
  const w = r.target.world, speed = hit.length / battle.dt;
  const firstLive = hit.path.find((x) => !x.plate && !x.room.cells[x.cell].destroyed); // before the round changes it
  const sh = shieldRound(w, { position: hit.entry, mass: battle.round.mass, velocity: speed, area: battle.round.area, direction: hit.dir });
  const res = sh.velocity > 0 ? fireRound(w, { mass: battle.round.mass, velocity: sh.velocity, area: battle.round.area, direction: hit.dir }, hit.path, r.cause) : null;
  r.shooter.stats.hits++;
  const reached = res ? hit.path.slice(0, res.stoppedIn >= 0 ? res.stoppedIn + 1 : hit.path.length) : [];
  const stopEntry = res && res.stoppedIn >= 0 ? hit.path[res.stoppedIn] : null;
  battle.events.push({ side: r.target.side, t: battle.t, type: 'round-hit', room: firstLive.room.id, cause: r.cause, speed, afterShield: sh.velocity, passed: res ? res.passed : 0, stoppedIn: res ? (stopEntry ? (stopEntry.plate ? `plate:${stopEntry.plate.room}` : stopEntry.room.id) : 'exit') : 'shield' });
  battle.hits.push({ t: battle.t, shooter: r.shooter.side, target: r.target.side, entry: hit.entry, dir: hit.dir, cells: hit.cells.slice(0, Math.max(1, reached.filter((x) => !x.plate).length)), stopped: res ? res.stoppedIn >= 0 : true });
  if (battle.hits.length > 50) battle.hits.shift();
}

// ---------- the end (#82, #83, #255) ----------
/** Each weapon's ability by the kernel's rule (js/battle.js weaponStates, 13l.1: weapons only, #255), whatever the preset. */
export function abilities(ship) {
  const states = weaponStates(ship.world), of = (type) => states.some((x) => x.room.type === type && x.able);
  return { beam: of('beamBay'), turret: of('turret'), states };
}
/**
 * The kernel's end rules (13l.1): destroyed by a reactor's or a magazine's explosion (readEvents) or when the largest
 * piece holds under battle.wreckFraction of the undock mass (#83); Disabled with no able weapon for
 * battle.disabledSeconds, whatever the engine does (#255). The end's parent in the cascade tree is the explosion, or
 * the event that took the last weapon's ability (the first failing condition of 13l.1's able).
 */
function checkEnd(battle) {
  for (const s of battle.ships) {
    if (!s.destroyed && largestFraction(s.world, s.undock) < battle.params.battle.wreckFraction.value) { s.destroyed = true; s.destroyedBy = { t: battle.t, room: 'pieces', energy: 0, cause: s.world.log.lastCut || 'launch' }; s.endParent = s.world.log.lastCut || 'launch'; }
    if (s.destroyed && !s.endParent && s.destroyedBy) s.endParent = s.destroyedBy.id;
    const a = abilities(s);
    for (const x of a.states) {
      const was = s.weaponsLost.get(x.room.id);
      if (!x.able && !was) s.weaponsLost.set(x.room.id, { t: battle.t, parent: x.parent, why: x.why });
      else if (x.able) s.weaponsLost.delete(x.room.id);
    }
    if (a.beam || a.turret) s.disabledSince = null;
    else if (s.disabledSince === null) s.disabledSince = battle.t;
    if (s.disabledSince !== null && battle.t - s.disabledSince >= battle.disabledSeconds - 1e-9 && !s.disabled) {
      s.disabled = true;
      const last = [...s.weaponsLost.values()].sort((x, y) => y.t - x.t)[0];
      if (!s.destroyed) s.endParent = last ? last.parent : 'launch';
    }
  }
  const out = battle.ships.filter((s) => s.destroyed || s.disabled);
  if (!out.length) return;
  battle.ended = {
    t: battle.t,
    losers: out.map((s) => s.side),
    reason: Object.fromEntries(out.map((s) => [s.side, s.destroyed ? 'destroyed' : 'disabled'])),
    sides: Object.fromEntries(battle.ships.map((s) => [s.side, summary(s)])),
  };
}
/**
 * The cascade tree of the battle's end for one ship (#41, #264): the root (a shot or a beam, heat or launch) of the
 * chain of parents from the event that ended it, and every event that root caused in the ship's kernel log, depth
 * first, as [{ depth, event }].
 */
export function endTree(ship) {
  if (!ship.endParent) return null;
  const ev = ship.world.log.events, byId = new Map(ev.map((e) => [e.id, e]));
  let root = ship.endParent;
  while (byId.has(root)) root = byId.get(root).parent;
  const tree = cascadeTree(ev), r = tree.roots.find((x) => x.root === root);
  const out = [];
  const walk = (n, d) => { out.push({ depth: d, event: n.event }); for (const c of n.children) walk(c, d + 1); };
  if (r) for (const c of r.children) walk(c, 1);
  return { root, parent: ship.endParent, rows: out };
}
export function summary(ship) {
  return {
    crewLost: ship.crewLost, crewTotal: ship.crewTotal,
    wrecked: ship.world.rooms.filter((r) => isDestroyed(r)).map((r) => r.id),
    cellsLost: ship.world.rooms.reduce((x, r) => x + r.cells.length - survivingCells(r), 0),
    shots: ship.stats.shots, hits: ship.stats.hits, misses: ship.stats.misses,
    firstFailure: ship.firstFailure, destroyedBy: ship.destroyedBy, endParent: ship.endParent,
  };
}

/** Read the kernel's new events: shots launch rounds; deaths, explosions and the first failure are counted. */
function readEvents(battle, ship) {
  const ev = ship.world.log.events;
  for (; ship.logIndex < ev.length; ship.logIndex++) {
    const e = ev[ship.logIndex];
    battle.events.push({ side: ship.side, ...e });
    if (e.type === 'shot') launch(battle, ship, e);
    if (e.type === 'crew-died') ship.crewLost += e.deaths;
    if (e.type === 'explosion' && (e.room === 'reactor' || e.room === 'magazine')) { if (!ship.destroyed) { ship.destroyedBy = { t: e.t, room: e.room, energy: e.energy, cause: e.cause, id: e.id }; ship.endParent = e.id; } ship.destroyed = true; }
    if (!ship.firstFailure && (e.type === 'overheated' || e.type === 'shutdown' || e.type === 'cell-destroyed' || e.type === 'scram')) ship.firstFailure = { t: e.t, type: e.type, room: e.room, cause: e.cause };
    if (!ship.firstHot && e.type === 'hot') ship.firstHot = { t: e.t, room: e.room };
  }
}

/** One simulation step of the battle. */
export function tick(battle) {
  if (battle.ended) return;
  for (const s of battle.ships) if (battle.scripted[s.side]) scriptUpdate(battle, s);
  for (const s of battle.ships) if (s.target !== null && isDestroyed(s.other.room(s.target)) && !battle.scripted[s.side]) s.target = null; // a wrecked target is dropped
  for (const s of battle.ships) applyPreset(battle, s);
  for (const s of battle.ships) helm(battle, s);
  for (const s of battle.ships) aimTurret(battle, s);
  for (const s of battle.ships) beamsIn(battle, s);
  const before = new Map(battle.ships.map((s) => [s.side, new Map(s.world.ship.bodies.map((b) => [b.id, poseOf(b)]))]));
  for (const s of battle.ships) step(s.world);
  battle.steps++;
  battle.t = battle.player.world.t;
  for (const s of battle.ships) beamsOut(battle, s);
  for (const s of battle.ships) readEvents(battle, s);
  flyRounds(battle, before);
  for (const s of battle.ships) readEvents(battle, s);
  checkEnd(battle);
}

/** Drain the events gathered since the last call (for the log). */
export function drainEvents(battle) {
  const out = battle.events;
  battle.events = [];
  return out;
}
