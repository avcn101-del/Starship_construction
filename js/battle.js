// battle.js — the battle loop (DESIGN.md 13l.1, L4b, #252, #253, #255): two
// ship worlds in one frame, an attacker and a static target. The target has no
// helm: it holds its heading on its RCS and never thrusts, and fires only when
// its case says so. The attacker starts at rest battle distance from the
// target's centre of mass on a named bearing, bow-on; its turret aims at the
// target room (no lead: the target is static) and its spinal beam fires along
// its axis (#234), which its RCS turns onto the target room. Rounds are kernel
// objects with a time of flight (the shooter's world.ship.rounds, moved by its
// step): after each step a round's segment is tested against the other ship's
// hull, the cells its line crosses in order with their chords (#239) and the
// plates it crosses (pathAlong's rule, #258) make its path, shieldRound takes it
// at the hull entry point and fireRound with its speed relative to the hull
// (#242); a beam hits along its line at once (#230). cull() runs every step
// with both ships' bodies (§17 item 26). Then the end: destroyed (a reactor's or
// a magazine's explosion, checked first; or the largest fragment under
// battle.wreckFraction of the undock mass, #83) or Disabled (no able weapon for
// battle.disabledSeconds, whatever the engine does, #82 as amended by #255).
// The per-second log (#129) and the cascade tree (#41) are built from the
// kernel's events. No DOM, no Math.random (one seed per battle, #7, though no
// rule draws from it yet), no Math.sin, Math.cos or Math.pow.
import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, enablePowerRouting, setDemand, step, fireRound, fireBeam, shieldRound, beamEnergy, setBeams, setRcs, cull, isDestroyed, survivingCells, magazineContents, plateEntry, plateGone, cellAt, readout, roomTemperature } from './rooms.js';
import { TIERS, FIXED, ROOMS, scaled } from './data.js';
import { validateShip } from './layout.js';
import { liveWalls } from './graph.js';
import { rotate, worldPoint, pointVelocity, momentumOf, cross } from './body.js';
import { roundGeometry } from './projectile.js';
import { rng, stepsAtLeast, hash } from './util.js';
import { emit, cascadeTree, treeLines } from './events.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1]); // Math.sqrt is correctly rounded on every engine
const wrap = (a) => a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));
const BEARINGS = { '-y': [0, -1], '+y': [0, 1], '-x': [-1, 0], '+x': [1, 0] };
const WEAPONS = new Set(['turret', 'beamBay', 'railgun', 'missileBay']);
// A cell a line crosses for less than this fraction of its edge is a corner it touches, not crossed (float residue).
const CORNER = 1e-9;

/**
 * One ship of a battle from a blueprint { rooms: [{ id, type, cell, rotation }], fittings: [[type, room, cell,
 * side]] }, validated by the kernel's validateShip (with the crew rule) unless `validate` is false: the magazine full
 * of HE, the turret's ready store full and holding fire, the shield off, power routed with every reactor at full
 * demand (as the estimates build them, 13l.3). `setup(world, room)` runs before enableShip.
 */
export function buildShip(params, tier, blueprint, { prefix = 'e', heading = 0, at = [0, 0], velocity = [0, 0], setup = null, validate = true } = {}) {
  const T = TIERS[tier], edge = T.edge;
  if (validate) {
    const v = validateShip({ grid: T.grid, edge, rooms: blueprint.rooms.map((r) => ({ size: 'M', rotation: 0, ...r })), fittings: blueprint.fittings.map(([type, room, cell, side]) => ({ type, room, cell, side })) }, ROOMS, params);
    if (!v.valid) throw new Error(`blueprint is not valid: ${v.reasons.map((r) => `${r.rule} ${r.room}: ${r.detail}`).join('; ')}`);
  }
  const world = createWorld({ params, edge, dt: FIXED.simStep.value, grid: T.grid });
  world.log.prefix = prefix;
  for (const r of blueprint.rooms) addRoom(world, r.type, { id: r.id, cell: r.cell, rotation: r.rotation || 0 });
  for (const [type, room, cell, side] of blueprint.fittings) addFitting(world, type, room, cell, side);
  const room = (id) => world.rooms.find((r) => r.id === id);
  for (const r of world.rooms) {
    if (r.type === 'magazine') loadMagazine(world, r, { heMass: scaled(params.magazine.capacity, edge) * r.cellRatio });
    if (r.type === 'turret') { loadTurret(r, params.turret.readyRounds.value); r.turret.hold = true; }
    if (r.type === 'shieldGenerator') r.shield.on = false;
  }
  enablePowerRouting(world);
  for (const r of world.rooms) if (r.type === 'reactor') setDemand(world, r, 1);
  if (setup) setup(world, room);
  const c = readout(world).centre, rc = rotate(c, heading);
  enableShip(world, { origin: [at[0] - rc[0], at[1] - rc[1]], heading, velocity });
  return { world, room };
}

/**
 * A battle (13l.1). `attacker` and `target` are blueprints; the target's centre of mass at the origin with
 * `targetHeading` (default 0) and `targetVelocity` (default at rest); the attacker's centre of mass `distance` (900
 * m, #54) from it on `bearing` (a name of BEARINGS in the target's frame, or a unit vector), at rest, bow-on.
 * `plan`: the attacker's targets, { turret: [room ids], beam: [room ids] }, each used until its room is destroyed
 * (or `turretPoint`, a world point the turret aims at instead);
 * `targetFire`: { aim: [x, y] } makes the target's turret fire along that direction of its own frame (a case's
 * order, B5); `setup`: { attacker, target } (world, room) before enableShip; `shield`: { attacker, target } turns a
 * shield generator on. `seed`: the battle's seed (#7).
 */
export function createBattle({ params, tier = 'T1', attacker, target, bearing = '-y', distance = 900, seed = 1, plan = {}, targetFire = null, targetHeading = 0, targetVelocity = [0, 0], setup = {}, shield = {}, validate = true }) {
  const edge = TIERS[tier].edge, k = params.kinetic;
  const u = typeof bearing === 'string' ? rotate(BEARINGS[bearing], targetHeading) : bearing;
  const T = buildShip(params, tier, target, { prefix: 'T', heading: targetHeading, velocity: targetVelocity, setup: setup.target, validate });
  const centre = T.world.ship.bodies[0].x, A0 = [centre[0] + distance * u[0], centre[1] + distance * u[1]];
  const A = buildShip(params, tier, attacker, { prefix: 'A', heading: Math.atan2(-u[1], -u[0]), at: A0, setup: setup.attacker, validate });
  const mass = scaled(k.roundMass, edge) * FIXED.sizeLinear.value.M ** 3;
  const side = (name, s, heading) => ({
    name, world: s.world, room: s.room, heading, undock: s.world.ship.bodies.reduce((m, b) => m + b.M, 0),
    weapons: new Map(), since: null, sinceStep: null, ended: null, logIndex: 0, lineIndex: 0,
  });
  const battle = {
    params, tier, edge, grid: TIERS[tier].grid, dt: A.world.dt, seed, rng: rng(seed), t: 0, step: 0,
    round: { mass, area: roundGeometry(mass, FIXED.steelDensity.value, FIXED.roundLengthToDiameter.value).A },
    plan: { turret: plan.turret || [], beam: plan.beam || [], turretPoint: plan.turretPoint || null }, targetFire,
    rounds: [], shots: 0, beams: 0, hits: [], misses: [], spent: { m: 0, P: [0, 0], L: 0, K: 0, rounds: 0 },
    beam: null, lines: [], ended: null,
    disabledSteps: stepsAtLeast(params.battle.disabledSeconds.value, A.world.dt),
  };
  battle.attacker = side('A', A, null);
  battle.target = side('T', T, targetHeading);
  battle.attacker.other = battle.target; battle.target.other = battle.attacker;
  battle.sides = [battle.attacker, battle.target];
  for (const s of battle.sides) for (const g of s.world.rooms) if (g.type === 'shieldGenerator' && shield[s === battle.attacker ? 'attacker' : 'target']) g.shield.on = true;
  aim(battle);
  // The attacker's first heading: its beam on its first aim point, else bow-on to the target's centre of mass.
  const ab = mainBody(battle.attacker);
  ab.theta = battle.attacker.heading;
  checkEnd(battle);
  logLine(battle);
  return battle;
}

// ---------- bodies, aims ----------
/** The body a side is flown on: body-0 (the heaviest piece of a split keeps it, 13f.1), else the heaviest. */
export function mainBody(side) {
  const bodies = side.world.ship.bodies;
  return bodies.find((b) => b.id === 'body-0') || [...bodies].sort((a, b) => b.M - a.M)[0] || null;
}
const bodyOfRoom = (side, room) => side.world.ship.bodies.find((b) => b.id === room.body) || mainBody(side);
/** The grid point (m) of the centre of a room's cell k. */
const cellPoint = (side, room, k) => { const [x, y] = side.world.layout.rooms.get(room.id).cells[k], e = side.world.edge; return [(x + 0.5) * e, (y + 0.5) * e]; };
/**
 * The aim point of a plan entry: the world point of the centre of the target room's first surviving cell (cell
 * index order). §13l.1 names the room's centre; an M room's centre is a grid vertex, so a line through it meets two
 * of its four cells and never the other two, and the route stalls (a question in the pull request).
 */
export function aimPoint(side, room) {
  const k = room.cells.findIndex((c) => !c.destroyed);
  if (k < 0) return null;
  const cell = room.cells[k], b = side.world.ship.bodies.find((x) => x.id === cell.fragment) || mainBody(side);
  return worldPoint(b, cellPoint(side, room, k));
}
const firstStanding = (side, ids) => ids.map((id) => side.room(id)).find((r) => r && !isDestroyed(r)) || null;
/** The bay's bow face (grid m): the beam leaves there along the ship's axis (#234). */
function bayFace(side, bay) {
  const cells = side.world.layout.rooms.get(bay.id).cells, e = side.world.edge;
  return [(Math.max(...cells.map((c) => c[0])) + 1) * e, bay.position[1]];
}
/**
 * The heading that puts a bay's axis line through world point P, for a body with centre of mass X: the axis lies b
 * = (face y - centre y) to the left of the centre in the body's frame, so P - X (length rho, angle phi) must have
 * that lateral coordinate: theta = phi - asin(b / rho), with the forward solution.
 */
function headingThrough(body, face, P) {
  const D = sub(P, body.x), rho = len(D), b = face[1] - body.c[1], phi = Math.atan2(D[1], D[0]);
  if (!(rho > Math.abs(b))) return phi;
  return phi - Math.atan2(b, Math.sqrt(rho * rho - b * b));
}

/** Before the step: the attacker's turret and beam on the plan's first standing rooms, its wanted heading; the target's fire order. */
function aim(battle) {
  const A = battle.attacker, T = battle.target, ab = mainBody(A);
  const turret = A.world.rooms.find((r) => r.type === 'turret'), bay = A.world.rooms.find((r) => r.type === 'beamBay');
  const tr = firstStanding(T, battle.plan.turret), br = firstStanding(T, battle.plan.beam);
  if (turret) {
    const P = battle.plan.turretPoint ? [...battle.plan.turretPoint] : tr && aimPoint(T, tr); // turretPoint: a world point the case names (B11)
    turret.turret.hold = !P;
    if (P) {
      const b = bodyOfRoom(A, turret), S = worldPoint(b, turret.position), d = sub(P, S), L = len(d);
      if (L > 0) turret.turret.aim = rotate([d[0] / L, d[1] / L], -b.theta);
    }
  }
  const P = br && aimPoint(T, br);
  if (bay) {
    const was = bay.beamBay.firing;
    bay.beamBay.firing = !!P;
    if (P && !was) battle.beamId = `beam-${++battle.beams}`; // a new beam id each time the bay starts firing
  }
  A.heading = P && bay ? headingThrough(ab, bayFace(A, bay), P) : (() => { const D = sub(mainBody(T).x, ab.x); return Math.atan2(D[1], D[0]); })();
  if (battle.targetFire) {
    const t = T.world.rooms.find((r) => r.type === 'turret');
    if (t) { t.turret.hold = false; t.turret.aim = [...battle.targetFire.aim]; }
  }
}

/**
 * Hold a side's heading on its RCS (13l.1): with the couple's angular accelerations a+ (every able fitting turning
 * it counter-clockwise) and a- (clockwise) about the main body's centre of mass, the time-optimal rate toward the
 * wanted heading is sign(d) sqrt(2 a d) on the couple that brakes it; the side fires the couple that brings omega
 * to it, or none within half a step's change (bang-bang over the steps; no constant).
 */
function holdHeading(battle, side) {
  const w = side.world, b = mainBody(side), fits = w.fittings.filter((f) => f.type === 'rcs');
  setRcs(w, fits.map((f) => f.id), false);
  if (!b || side.heading === null) return;
  const force = scaled(battle.params.rcs.force, battle.edge), ccw = [], cw = [];
  let tp = 0, tm = 0;
  for (const f of fits) {
    const host = side.room(f.room), cell = host.cells[f.k];
    if (cell.destroyed || cell.fragment !== b.id || isDestroyed(host) || !host.controlled || host.shutdown || !host.active) continue;
    const tau = (f.p[0] - b.c[0]) * (-f.side[1] * force) - (f.p[1] - b.c[1]) * (-f.side[0] * force);
    if (tau > 0) { ccw.push(f.id); tp += tau; } else if (tau < 0) { cw.push(f.id); tm -= tau; }
  }
  const ap = tp / b.I, am = tm / b.I, d = wrap(side.heading - b.theta), dt = battle.dt;
  const target = d > 0 ? Math.sqrt(2 * am * d) : d < 0 ? -Math.sqrt(2 * ap * -d) : 0;
  if (ccw.length && b.omega < target - (ap * dt) / 2) setRcs(w, ccw, true);
  else if (cw.length && b.omega > target + (am * dt) / 2) setRcs(w, cw, true);
}

// ---------- lines through a hull ----------
/**
 * The grid cells a ray crosses in order (Amanatides-Woo) in a grid of `grid` cells of `edge` m: origin o and unit
 * direction d in grid metres. Each: { cell: [i, j], t0, t1 }, the distances along the ray where it enters and leaves
 * the cell. When the ray leaves the grid, `exit` is the cell off the grid it steps into (a plate on the last cell's
 * outer segment is found there).
 */
export function crossedCells(o, d, grid, edge) {
  const W = grid[0] * edge, H = grid[1] * edge;
  let t0 = 0, t1 = Infinity;
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
    const tn = Math.min(tx, ty, t1);
    out.push({ cell: [i, j], t0: t, t1: tn });
    if (tx <= ty) { t = tx; tx += dx; i += sx; } else { t = ty; ty += dy; j += sy; }
  }
  if (out.length && !(i >= 0 && j >= 0 && i < grid[0] && j < grid[1])) out.exit = { cell: [i, j], t };
  return out;
}

/**
 * What a line meets on a side's ship: for each body, the line from world point `from` (mapped on the body's pose
 * before the step, `before`) to world point `to` (on its pose now), or the ray from `from` along `dir` (world) when
 * `to` is null, through the body's grid. The first room cell or plate of that body the line crosses within the
 * segment opens the path, which runs on to the grid's edge: each room cell of that body as { room, cell, chord }
 * (chord: the length the line runs in the cell over the edge, at most 1, #239; a cell it only touches at a corner is
 * left out), a destroyed cell included (a hole stays on the path, #212 (5)); before a cell, where the line crosses
 * a plated segment, the kernel's plateEntry (sigma / cos theta, #258). A path with no matter on it (only holes) is
 * no hit. Returns the nearest hit { body, entry (grid m), dir (grid, unit), path, cells, t, length } or null.
 */
export function lineHit(side, from, to, dir, before = null) {
  const w = side.world, grid = w.layout.grid, e = w.edge;
  let best = null;
  for (const b of w.ship.bodies) {
    const pose0 = (before && before.get(b.id)) || b;
    const a = toGrid(pose0, from);
    let d, L;
    if (to) { const v = sub(toGrid(b, to), a); L = len(v); if (!(L > 0)) continue; d = [v[0] / L, v[1] / L]; } else { d = rotate(dir, -b.theta); L = Infinity; }
    const cells = crossedCells(a, d, grid, e);
    let first = -1;
    const path = [], at = [];
    const on = (q, v) => Math.abs(q - v) < 1e-9;
    for (let k = 0; k < cells.length; k++) {
      const [i, j] = cells[k].cell, p0 = [a[0] + d[0] * cells[k].t0, a[1] + d[1] * cells[k].t0];
      const prev = k > 0 ? cells[k - 1].cell : on(p0[0], i * e) ? [i - 1, j] : on(p0[0], (i + 1) * e) ? [i + 1, j] : on(p0[1], j * e) ? [i, j - 1] : on(p0[1], (j + 1) * e) ? [i, j + 1] : null;
      const x = prev ? plateEntry(w, prev, cells[k].cell, d) : null;
      if (x && side.room(x.plate.room).cells[x.plate.k].fragment === b.id) {
        if (first < 0) { if (cells[k].t0 > L) break; first = k; }
        path.push(x);
      }
      const chord = Math.min(1, (cells[k].t1 - cells[k].t0) / e);
      const c = cellAt(w, cells[k].cell);
      if (!c || c.room.cells[c.index].fragment !== b.id || !(chord > CORNER)) continue;
      if (first < 0) { if (cells[k].t0 > L) break; first = k; }
      path.push({ room: c.room, cell: c.index, chord });
      at.push(cells[k].cell);
    }
    if (first >= 0 && cells.exit) {
      const x = plateEntry(w, cells[cells.length - 1].cell, cells.exit.cell, d);
      if (x && side.room(x.plate.room).cells[x.plate.k].fragment === b.id) path.push(x);
    }
    if (first < 0 || !path.some((x) => (x.plate ? !plateGone(w, x.plate) : !x.room.cells[x.cell].destroyed))) continue;
    const t = cells[first].t0;
    if (best && (to ? t / L : t) >= best.t) continue;
    best = { body: b.id, entry: [a[0] + d[0] * t, a[1] + d[1] * t], dir: d, path, cells: at, t: to ? t / L : t, length: L };
  }
  return best;
}
/** Grid point (m, the body's own frame) of world point q on a body pose { x, c, theta }. */
export function toGrid(pose, q) {
  const r = rotate(sub(q, pose.x), -pose.theta);
  return [r[0] + pose.c[0], r[1] + pose.c[1]];
}
const poseOf = (b) => ({ id: b.id, x: [...b.x], c: [...b.c], theta: b.theta });

// ---------- weapons in flight ----------
/** Before the step: the attacker's beam line on the target, the target's shield paying at the entry point (13d.1). */
function beamsIn(battle) {
  const A = battle.attacker, T = battle.target, bay = A.world.rooms.find((r) => r.type === 'beamBay');
  battle.beam = null;
  if (!bay || !bay.beamBay.firing || !(bay.beamBay.beam > 0)) { setBeams(T.world, []); return; }
  const b = bodyOfRoom(A, bay), from = worldPoint(b, bayFace(A, bay)), dir = rotate([1, 0], b.theta);
  const hit = lineHit(T, from, null, dir);
  battle.beam = { id: battle.beamId, power: bay.beamBay.beam, from, dir, hit, energy: beamEnergy(A.world, bay) };
  setBeams(T.world, hit ? [{ id: battle.beamId, position: hit.entry, power: bay.beamBay.beam }] : []);
}
/** After the step: what the shield let through goes along the path (fireBeam), with the beam's id as its cause. */
function beamsOut(battle) {
  const x = battle.beam, T = battle.target;
  if (!x || !x.hit) return;
  const res = T.world.beamResults.find((r) => r.id === x.id);
  if (!res || !(res.passed > 0)) return;
  x.result = fireBeam(T.world, { power: res.passed, energy: x.energy, range: len(sub(mainBody(T).x, x.from)) }, x.hit.path, x.id);
}

/** Read each side's new events: a kernel shot launched a round (recoil put it in the shooter's world.ship.rounds). */
function launch(battle) {
  for (const s of battle.sides) {
    const ev = s.world.log.events;
    for (; s.logIndex < ev.length; s.logIndex++) {
      const e = ev[s.logIndex];
      if (e.type !== 'shot') continue;
      const ref = s.world.ship.rounds.find((r) => r.cause === e.cause && !r.battle);
      if (!ref) continue;
      const id = `shot-${++battle.shots}`;
      ref.battle = id;
      battle.rounds.push({ id, shooter: s, other: s.other, ref, prev: [...ref.x0], t0: e.t, event: e.id });
    }
  }
}

/**
 * After the step: each round's segment, from where it was (on the other ship's pose before the step) to where it
 * is (on its pose now), is tested against the other ship's hull; a hit is resolved along the whole line (shieldRound
 * at the entry point, then fireRound at the speed relative to the hull there, #242). A round stopped by the field
 * or the hull ends there, its momentum (the hull's velocity at its stop) booked in battle.spent; one that passes
 * flies on with the velocity fireRound left it and is not tested against that ship again.
 */
function flyRounds(battle, before) {
  for (const r of battle.rounds) {
    if (r.over || r.done) continue;
    const hit = lineHit(r.other, r.prev, r.ref.x, null, before.get(r.other));
    if (hit) strike(battle, r, hit);
    r.prev = [...r.ref.x];
  }
}
function strike(battle, r, hit) {
  const w = r.other.world, b = w.ship.bodies.find((x) => x.id === hit.body), m = battle.round.mass, A = battle.round.area;
  const q = worldPoint(b, hit.entry), rel = sub(r.ref.v, pointVelocity(b, q)), speed = len(rel);
  const sh = shieldRound(w, { position: hit.entry, mass: m, velocity: speed, area: A, direction: hit.dir });
  const res = sh.velocity > 0 ? fireRound(w, { mass: m, velocity: sh.velocity, area: A, direction: hit.dir }, hit.path, r.id) : null;
  r.done = true;
  const stopped = !res || res.stoppedIn >= 0 || res.wrecked || !res.u1;
  battle.hits.push({ id: r.id, t: battle.t, side: r.other.name, body: hit.body, entry: hit.entry, dir: hit.dir, speed, afterShield: sh.velocity, passed: res ? res.passed : 0, stoppedIn: res ? res.stoppedIn : -2, wrecked: res ? res.wrecked : false, r: res ? res.r : [], momentum: res ? res.momentum : 0, f: res ? res.f : 0, path: hit.path.map((x) => (x.plate ? `plate:${x.plate.id}` : `${x.room.id}:${x.cell}`)), stopped });
  if (stopped) {
    // The round comes to rest in the hull (or against the field): it moves on with the hull at the entry point.
    const v = res && res.u1 ? res.u1 : pointVelocity(b, q), sp = battle.spent;
    sp.m += m; sp.P[0] += m * v[0]; sp.P[1] += m * v[1]; sp.L += m * cross(q, v); sp.K += 0.5 * m * (v[0] * v[0] + v[1] * v[1]); sp.rounds++;
    r.shooter.world.ship.rounds = r.shooter.world.ship.rounds.filter((x) => x !== r.ref);
    r.over = 'stopped';
  } else r.ref.v = [...res.u1];
}

// ---------- able to fight, Disabled, destroyed (13l.1, #82, #83, #255) ----------
/**
 * Each weapon room of a world and whether it is able (13l.1, #255): not destroyed, controlled, not shut down,
 * active, and joined through live walls (through any rooms) to a reactor that can produce (controlled, not
 * SCRAMmed, not shut down, not destroyed); a turret also needs a round in its ready store or a magazine of its size
 * with rounds that shares a live wall with it (the wall the feed crosses, graph.js feedAmmo). For an unable weapon,
 * `why` is the first condition that fails, in that order, and `parent` the event that took it (13l.1).
 */
export function weaponStates(world) {
  const walls = liveWalls(world).filter((w) => w.live > 0);
  const producing = world.rooms.filter((r) => r.type === 'reactor' && r.placed && !isDestroyed(r) && r.controlled && !r.reactor.scrammed && !r.shutdown);
  const reached = new Set(producing), queue = [...producing];
  for (let i = 0; i < queue.length; i++) for (const w of walls) { const o = w.a === queue[i] ? w.b : w.b === queue[i] ? w.a : null; if (o && !reached.has(o)) { reached.add(o); queue.push(o); } }
  const fed = (t) => walls.some((w) => { const mag = w.a === t ? w.b : w.b === t ? w.a : null; return mag && mag.type === 'magazine' && !mag.exploded && mag.magazine.size === t.size && mag.magazine.ap + mag.magazine.he > 0; });
  const lastCut = world.log.lastCut || 'launch';
  return world.rooms.filter((r) => WEAPONS.has(r.type) && r.placed).map((r) => {
    const m = r.marks;
    const fail = isDestroyed(r) ? ['destroyed', m.destroyed || 'launch']
      : !r.controlled ? ['no-control', m.controlLost || 'launch']
      : r.shutdown ? ['heat', m.shutdown || 'heat']
      : !r.active ? ['off', 'launch']
      : !reached.has(r) ? ['no-power', lastCut]
      : r.type === 'turret' && !(r.turret.ammo > 0) && !fed(r) ? ['dry', m.lastShot || 'launch']
      : null;
    return { room: r, able: !fail, why: fail ? fail[0] : null, parent: fail ? fail[1] : null };
  });
}
/** The largest fragment's share of the mass at undock (#83): under battle.wreckFraction the ship is destroyed. */
export function largestFraction(world, undock) {
  return Math.max(0, ...world.ship.bodies.map((b) => b.M)) / undock;
}
const eventIndex = (id) => Number(String(id).replace(/^\D+/, '')) || 0;

/**
 * The end, after each step (and once at the start): a reactor's or a magazine's explosion destroys the ship
 * (checked first), then too many pieces; else each weapon's ability is updated (when it is lost, the step and the
 * event that took it are kept), and with no able weapon for battle.disabledSeconds the ship is Disabled. The end is
 * an event in the side's log ('destroyed', 'disabled') whose parent is the event that caused it.
 */
function checkEnd(battle) {
  const wreck = battle.params.battle.wreckFraction.value;
  for (const s of battle.sides) {
    const w = s.world, ev = w.log.events;
    const boom = ev.slice(s.boomIndex || 0).find((e) => e.type === 'explosion' && ['reactor', 'magazine'].includes(s.room(e.room)?.type));
    s.boomIndex = ev.length;
    if (boom) { end(battle, s, 'destroyed', { by: 'explosion', room: boom.room, parent: boom.id }); continue; }
    if (largestFraction(w, s.undock) < wreck) { end(battle, s, 'destroyed', { by: 'pieces', room: 'ship', parent: w.log.lastCut || 'launch' }); continue; }
    const states = weaponStates(w);
    for (const x of states) {
      const was = s.weapons.get(x.room.id);
      if (!x.able && (!was || was.able)) s.weapons.set(x.room.id, { able: false, step: battle.step, why: x.why, parent: x.parent });
      else if (x.able) s.weapons.set(x.room.id, { able: true });
    }
    if (states.some((x) => x.able)) { s.since = null; s.sinceStep = null; continue; }
    if (s.sinceStep === null) { s.sinceStep = battle.step; s.since = battle.t; }
    if (battle.step - s.sinceStep >= battle.disabledSteps) {
      // The weapon that lost its ability last; a tie goes to the later event that took it.
      const lost = [...s.weapons.entries()].map(([id, x]) => ({ id, ...x })).sort((a, b) => b.step - a.step || eventIndex(b.parent) - eventIndex(a.parent))[0];
      end(battle, s, 'disabled', { room: lost ? lost.id : 'ship', parent: lost ? lost.parent : 'launch', why: lost ? lost.why : null });
    }
  }
}
function end(battle, s, kind, { by = null, room, parent, why = null }) {
  if (s.ended) return;
  const r = s.room(room), crew = r ? r.crew : s.world.rooms.reduce((x, y) => x + y.crew, 0);
  const extra = kind === 'disabled' ? { since: s.since } : { by };
  const e = emit(s.world.log, { t: battle.t, type: kind, room, cause: parent, crew, parent, ...extra });
  s.ended = { kind, t: battle.t, step: battle.step, event: e.id, parent, why, by };
  if (!battle.ended) battle.ended = { side: s.name, kind, t: battle.t, step: battle.step, event: e.id, parent, why, by };
}

// ---------- the loop ----------
/** One step of the battle (13l.1). */
export function tick(battle) {
  if (battle.ended) return;
  aim(battle);
  for (const s of battle.sides) holdHeading(battle, s);
  beamsIn(battle);
  const before = new Map(battle.sides.map((s) => [s, new Map(s.world.ship.bodies.map((b) => [b.id, poseOf(b)]))]));
  for (const s of battle.sides) step(s.world);
  battle.step++;
  battle.t = battle.attacker.world.t;
  beamsOut(battle);
  launch(battle);
  flyRounds(battle, before);
  for (const s of battle.sides) {
    cull(s.world, s.other.world.ship.bodies);
    for (const r of battle.rounds) if (r.shooter === s && !r.over && !s.world.ship.rounds.includes(r.ref)) { r.over = 'left'; if (!r.done) battle.misses.push({ id: r.id, t: battle.t }); }
  }
  battle.rounds = battle.rounds.filter((r) => !r.over);
  checkEnd(battle);
  logLine(battle);
}

/** Run until the battle ends or `limit` s. */
export function runBattle(battle, limit = 900) {
  const steps = stepsAtLeast(limit, battle.dt);
  while (!battle.ended && battle.step < steps) tick(battle);
  return battle;
}

// ---------- the per-second log and the cascade tree (#129, #41) ----------
const f = (x, n = 3) => (Number.isFinite(x) ? x.toFixed(n) : String(x));
const perSecond = (battle) => stepsAtLeast(1, battle.dt);
/**
 * One line per whole second of battle time per ship (13l.1): position, heading, velocity of its main body; each
 * room's mean integrity, temperature, power fraction and state (c controlled, s shut down, S SCRAMmed, X
 * destroyed); then every event since its last line, with its cause and parent. At the battle's end a last line of
 * each ship carries the events since its last whole second (marked 'end').
 */
function logLine(battle) {
  const whole = battle.step % perSecond(battle) === 0;
  if (!whole && !battle.ended) return;
  for (const s of battle.sides) {
    const b = mainBody(s), w = s.world;
    const rooms = w.rooms.map((r) => {
      const integrity = r.cells.reduce((x, c) => x + (c.destroyed ? 0 : c.integrity), 0) / r.cells.length;
      const state = `${r.controlled ? 'c' : '-'}${r.shutdown ? 's' : ''}${r.reactor && r.reactor.scrammed ? 'S' : ''}${isDestroyed(r) ? 'X' : ''}`;
      return `${r.id} ${f(integrity)} ${f(roomTemperature(r), 2)}K p${r.powerFraction === undefined ? '-' : f(r.powerFraction)} ${state}`;
    }).join(', ');
    const events = w.log.events.slice(s.lineIndex).map((e) => `${e.id} ${f(e.t, 4)} ${e.type} ${e.room} cause=${e.cause} parent=${e.parent}`);
    s.lineIndex = w.log.events.length;
    const head = whole ? `t=${Math.round(battle.t)}` : `end t=${f(battle.t, 4)}`;
    battle.lines.push(`${head} ${s.name} x=(${b ? f(b.x[0]) : '-'}, ${b ? f(b.x[1]) : '-'}) heading=${b ? f(b.theta, 6) : '-'} v=(${b ? f(b.v[0], 4) : '-'}, ${b ? f(b.v[1], 4) : '-'}) bodies=${w.ship.bodies.length} | ${rooms} | events: ${events.join('; ') || '-'}`);
  }
}
/** The battle's hash (E2): the hash of its per-second log, with the seed as its first line. */
export function battleHash(battle) {
  return hash([`seed ${battle.seed}`, ...battle.lines].join('\n'));
}
/** Every event of the battle, both ships, each with its side. */
export function battleEvents(battle) {
  return battle.sides.flatMap((s) => s.world.log.events.map((e) => ({ side: s.name, ...e })));
}
/** The cascade tree of each ship's log (13l.1) and its lines; errors: events whose parent is neither a root nor an earlier event. */
export function battleTree(battle) {
  return battle.sides.map((s) => {
    const tree = cascadeTree(s.world.log.events);
    return { side: s.name, tree, lines: treeLines(tree), errors: tree.errors };
  });
}
/**
 * Momentum of both ships (bodies, debris, rounds in flight, what left play) and of the rounds spent in a hull or a
 * field, with the external impulse that is not a hit (thrust, RCS): the hits and the fields move momentum between a
 * round and a hull (booked in ship.received, taken out of ship.external) and the recoil between a turret and its round
 * (never booked), so P - J stays fixed. `gross`: the sum of the magnitudes of every term of P (debris, left and spent
 * since the L4 fix round, #269).
 */
export function battleMomentum(battle) {
  const P = [0, 0], J = [0, 0];
  let gross = len(battle.spent.P);
  for (const s of battle.sides) {
    const sh = s.world.ship, m = momentumOf(sh), left = sh.left || { P: [0, 0] }, rec = sh.received || { J: [0, 0], field: [0, 0] };
    P[0] += m.P[0] + left.P[0]; P[1] += m.P[1] + left.P[1];
    J[0] += sh.external.J[0] - rec.J[0] - rec.field[0]; J[1] += sh.external.J[1] - rec.J[1] - rec.field[1];
    gross += len(left.P);
    for (const b of sh.bodies) gross += b.M * len(b.v);
    for (const d of sh.debris) gross += d.m * len(d.v);
    for (const r of sh.rounds) gross += r.m * len(r.v);
  }
  P[0] += battle.spent.P[0]; P[1] += battle.spent.P[1];
  return { P, J, gross };
}
export { survivingCells, magazineContents };
