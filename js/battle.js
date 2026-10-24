// battle.js — the battle loop (DESIGN.md 13l.1, L4b, #252, #253, #255): two
// ship worlds in one frame, an attacker and a static target. The target has no
// helm: it holds its heading on its RCS and never thrusts, and fires only when
// its case says so. The attacker starts at rest battle.openingRange from the
// target's centre of mass on a named bearing, bow-on; its turret aims at the
// target room (no lead: the target is static) and its spinal beam fires along
// its axis (#234), which its RCS turns onto the target room. Rounds are kernel
// objects with a time of flight (the shooter's world.ship.rounds, moved by its
// step): after each step a round's segment is tested against the other ship's
// hull, the cells its line crosses in order with their chords (#239) and the
// plates it crosses (pathAlong's rule, #258) make its path, shieldRound takes it
// at the hull entry point and fireRound with its speed relative to the hull
// (#242); a beam hits along its line at once (#230). cull() runs every step
// with both ships' bodies (§17 item 26). Then the end: destroyed (a reactor's
// explosion, checked first; a magazine's is a blast through its walls and ends
// nothing by itself, #274, 13n.1 (b); or the largest fragment under
// battle.wreckFraction of the undock mass, #83) or Disabled (no able weapon for
// battle.disabledSeconds, whatever the engine does, #82 as amended by #255).
// The kinetic pass (13n.1 (b)): a hit's impulse acts on the round's line of
// action (B2), a round stopped in a hull joins its body (B4), and the battle
// books energy and angular momentum across the two ships (B3, battleEnergy,
// battleAngular).
// The knowledge model (L5b, 13n.1 (a), #289) is a battle setting: with
// `knowledge` on each side has a model (js/sensors.js) sensed after every step,
// a case may command scans, and the attacker's plan aims at what its model
// knows (a room it does not know at the centre of the zone the case names);
// with it off nothing of this runs and the loop is L4b's.
// Weapons (L5c, 13n.1 (c)): the attacker's spinal railgun fires along its axis at
// the plan's railgun room (its RCS turn the axis onto it, as the beam's); its
// missile bay launches at the plan's missile rooms; missiles fly on the shooter's
// world (js/missile.js: thrust, coast, seekers from the side's own model, so they
// need `knowledge`), each tested against the other hull along its segment, its
// warhead acting at the hit (its body a stopped projectile joining the hull, #296;
// HE a contact burst, the penetrator a round, EMP a
// field); point defence engages them (js/defence.js); a typed turret store fires
// the type its target calls for (#95); the firing window (#100): a side's own
// round crossing its own hull segment in a step, or its beam leaving through it,
// opens that segment, and a round of the other side entering through it in that
// step meets no field. With none of these placed the loop is L5b's.
// The helm and the enemy (L5d, 13n.1 (d), #301): the loop is symmetric, each side
// with the same step (its beam, rounds, missiles and window against the other);
// a side with `orders` flies them through its helm (js/helm.js) and a side with
// an `enemy` personality decides through js/enemy.js, both from its own model
// only (createBattle refuses either with knowledge off); a side with neither is
// static as in L4 (the attacker on its plan, a case's test input read from its
// model with knowledge on, #301 (1); the target on targetFire). Two ends join
// Disabled and destroyed: the enemy's surrender (#85, #86) and escape (#293); both sides ending in one step is a draw
// (L5e1, 13n.8, #315).
// One id space (§17 item 35): battle.ids maps each world's own launch cause
// (side:room:shot-k) to the battle's shot-n or missile-n id.
// The per-second log (#129) and the cascade tree (#41) are built from the
// kernel's events. No DOM, no Math.random (one seed per battle, #7: the enemy's
// dodge intervals and wildcard draw from it), no Math.sin, Math.cos or Math.pow.
import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, enablePowerRouting, setDemand, step, fireRound, fireBeam, shieldRound, beamEnergy, setBeams, setRcs, cull, isDestroyed, survivingCells, magazineContents, magazineType, plateEntry, entryArealDensity, plateGone, cellAt, readout, roomTemperature, embedRound, contactBurst, empBurst, railgunSlug, magazineCapacity, burnFitting, PLUME_TYPES } from './rooms.js';
import { TIERS, FIXED, ROOMS, scaled } from './data.js';
import { validateShip, segmentKey } from './layout.js';
import { liveWalls } from './graph.js';
import { rotate, worldPoint, pointVelocity, momentumOf, cross } from './body.js';
import { roundGeometry } from './projectile.js';
import { rng, stepsAtLeast, hash, atan2, sin, cos } from './util.js';
import { emit, within, createLog, cascadeTree, treeLines } from './events.js';
import { createKnowledge, sense, setScan, knownAim, zoneCentre } from './sensors.js';
import { moveMissile, seekerAim, steer } from './missile.js';
import { aimLasers, pointDefence } from './defence.js';
import { createHelm, helmStep } from './helm.js';
import { createEnemy, enemyStep } from './enemy.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1]); // Math.sqrt is correctly rounded on every engine
const wrap = (a) => a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));
const BEARINGS = { '-y': [0, -1], '+y': [0, 1], '-x': [-1, 0], '+x': [1, 0] };
const WEAPONS = new Set(['turret', 'beamBay', 'railgun', 'missileBay']);
// A cell a line crosses for less than this fraction of its edge is a corner it touches, not crossed (float residue).
const CORNER = 1e-9;

/**
 * One ship of a battle from a blueprint { rooms: [{ id, type, cell, rotation, size, length, load }], fittings: [[type,
 * room, cell, side]] }, validated by the kernel's validateShip (with the crew rule) unless `validate` is false: the
 * magazine full of HE, the turret's ready store full and holding fire, the shield off, power routed with every reactor
 * at full demand (as the estimates build them, 13l.3). A room's `size` and `length` (a spinal room's N) go to addRoom
 * (13n.1 (c): an S room is built with its S footprint). A magazine's `load` (L5c) fills it otherwise: { type:
 * 'railgun' } with slugs, { type: 'missile', seeker, warhead } with missiles, { rounds: { standard, ap, he, sabot } }
 * with typed rounds by fraction of its capacity, { size: 'S' } with HE rounds of that size; a missile bay's `load`
 * { seeker, warhead } fills its ready store.
 * `setup(world, room)` runs before enableShip. `origin`, when given, is the world point of the grid's corner
 * (enableShip's frame origin) instead of `at`, the centre of mass's.
 */
export function buildShip(params, tier, blueprint, { prefix = 'e', heading = 0, at = [0, 0], velocity = [0, 0], setup = null, validate = true, origin = null } = {}) {
  const T = TIERS[tier], edge = T.edge;
  if (validate) {
    const v = validateShip({ grid: T.grid, edge, rooms: blueprint.rooms.map((r) => ({ size: 'M', rotation: 0, ...r })), fittings: blueprint.fittings.map(([type, room, cell, side]) => ({ type, room, cell, side })) }, ROOMS, params);
    if (!v.valid) throw new Error(`blueprint is not valid: ${v.reasons.map((r) => `${r.rule} ${r.room}: ${r.detail}`).join('; ')}`);
  }
  const world = createWorld({ params, edge, dt: FIXED.simStep.value, grid: T.grid });
  world.log.prefix = prefix;
  for (const r of blueprint.rooms) addRoom(world, r.type, { id: r.id, cell: r.cell, rotation: r.rotation || 0, ...(r.size ? { size: r.size } : {}), ...(r.length ? { length: r.length } : {}) });
  for (const [type, room, cell, side] of blueprint.fittings) addFitting(world, type, room, cell, side);
  const room = (id) => world.rooms.find((r) => r.id === id);
  const loads = new Map(blueprint.rooms.filter((r) => r.load).map((r) => [r.id, r.load]));
  for (const r of world.rooms) {
    if (r.type === 'magazine') loadMagazine(world, r, loads.has(r.id) ? loadOf(world, r, loads.get(r.id)) : { heMass: scaled(params.magazine.capacity, edge) * r.cellRatio });
    if (r.type === 'turret') { loadTurret(r, scaled(params.turret.readyRounds, edge)); r.turret.hold = true; }
    if (r.type === 'shieldGenerator') r.shield.on = false;
    if (r.type === 'missileBay') { const k = loads.get(r.id) || { seeker: 'designated', warhead: 'he' }; r.missileBay.ready = Array.from({ length: scaled(params.missilebay.readyMissiles, edge) }, () => ({ seeker: k.seeker, warhead: k.warhead })); }
  }
  enablePowerRouting(world);
  for (const r of world.rooms) if (r.type === 'reactor') setDemand(world, r, 1);
  if (setup) setup(world, room);
  if (origin) enableShip(world, { origin: [...origin], heading, velocity });
  else {
    const c = readout(world).centre, rc = rotate(c, heading);
    enableShip(world, { origin: [at[0] - rc[0], at[1] - rc[1]], heading, velocity });
  }
  return { world, room };
}

/** A magazine's load from a blueprint room's `load` (L5c): the magazine full of slugs, missiles or typed rounds (fractions of its capacity). */
function loadOf(world, room, load) {
  const cap = magazineCapacity(world, room);
  if (load.type === 'railgun') return { type: 'railgun', slugMass: cap };
  if (load.type === 'missile') return { type: 'missile', missileMass: cap, seeker: load.seeker, warhead: load.warhead };
  if (load.size && !load.rounds) return { size: load.size, heMass: cap }; // a turret magazine for another round size (S turrets, mission0/builds.js)
  return { rounds: Object.fromEntries(Object.entries(load.rounds).map(([k, f]) => [k, f * cap])) };
}

/**
 * A battle (13l.1). `attacker` and `target` are blueprints; the target's centre of mass at the origin with
 * `targetHeading` (default 0) and `targetVelocity` (default at rest); the attacker's centre of mass `distance`
 * (default battle.openingRange, 900 m at T1, k = 1, #54, #269) from it on `bearing` (a name of BEARINGS in the target's frame, or a unit vector), at rest, bow-on.
 * `plan`: the attacker's targets, { turret: [room ids], beam: [room ids] }, each used until its room is destroyed
 * (or `turretPoint`, a world point the turret aims at instead);
 * `targetFire`: { aim: [x, y] } makes the target's turret fire along that direction of its own frame (a case's
 * order, B5); `setup`: { attacker, target } (world, room) before enableShip; `shield`: { attacker, target } turns a
 * shield generator on. `seed`: the battle's seed (#7).
 * `knowledge` (default false, 13n.1 (a), #289): each side gets a knowledge model; `scans`: [{ side: 'A' | 'T',
 * antenna: its index among the side's antennas, zone: 0-5 or null to stop, at: s }], each applied before the first
 * step that starts at or after `at`; `plan.zone`: the zone whose centre a plan room the attacker's model does not
 * know is aimed at (without it such a room is not aimed at).
 * L5c (13n.1 (c)): `plan.railgun`, room ids the attacker's railgun fires at (its axis turned onto the first standing);
 * `plan.missile` { rooms: [ids], count }: the attacker's missile bay launches `count` missiles (default: every one it
 * has), each with its seeker, the designated one flying at the first standing of `rooms` as its model knows it.
 * With `knowledge` on a plan is a test input read from the attacker's model (#301 (1)): a plan room is lost to it
 * when its model knows the room and no standing cell of it (an unknown room stays the target, aimed at plan.zone).
 * L5d (13n.1 (d), #301): `orders` { A, T }: a preset name or a full slot set (a case's test input) gives that side a
 * helm (js/helm.js), which then flies, aims and fires it from its model in place of the plan or targetFire; `enemy`
 * { A, T }: a personality ({ aggression, patience, caution, resolve } or { wildcard: true }) makes that side the
 * enemy (js/enemy.js); both need `knowledge` (createBattle refuses them without it). `inputs`: the player's verbs,
 * [{ t, side, verb: 'scan' | 'target' | 'preset', arg }], each applied before the first step that starts at or after
 * t. `attackerHeading`: the attacker's heading at undock (default bow-on to the target); a static attacker (no helm,
 * no enemy) holds it on its RCS in place of the plan's heading, as the target holds targetHeading (L5e1, 13n.8 J3).
 */
export function createBattle({ params, tier = 'T1', attacker, target, bearing = '-y', distance = scaled(params.battle.openingRange, TIERS[tier].edge), seed = 1, plan = {}, targetFire = null, targetHeading = 0, targetVelocity = [0, 0], setup = {}, shield = {}, validate = true, knowledge = false, scans = [], orders = {}, enemy = {}, inputs = [], attackerHeading = null }) {
  if (!knowledge && (Object.keys(orders).length || Object.keys(enemy).length)) throw new Error('standing orders and the enemy read only their side\'s knowledge model: set knowledge: true (#301 (1), 13n.1 (d))');
  const edge = TIERS[tier].edge, k = params.kinetic;
  const u = typeof bearing === 'string' ? rotate(BEARINGS[bearing], targetHeading) : bearing;
  const T = buildShip(params, tier, target, { prefix: 'T', heading: targetHeading, velocity: targetVelocity, setup: setup.target, validate });
  const centre = T.world.ship.bodies[0].x, A0 = [centre[0] + distance * u[0], centre[1] + distance * u[1]];
  const A = buildShip(params, tier, attacker, { prefix: 'A', heading: attackerHeading ?? atan2(-u[1], -u[0]), at: A0, setup: setup.attacker, validate });
  const mass = scaled(k.roundMass, edge) * FIXED.sizeLinear.value.M ** 3;
  const side = (name, s, heading) => ({
    name, world: s.world, room: s.room, heading, undock: s.world.ship.bodies.reduce((m, b) => m + b.M, 0),
    weapons: new Map(), since: null, sinceStep: null, ended: null, logIndex: 0, lineIndex: 0, helm: null, enemy: null, beam: null, beamId: null,
  });
  const battle = {
    params, tier, edge, grid: TIERS[tier].grid, dt: A.world.dt, seed, rng: rng(seed), t: 0, step: 0,
    round: { mass, area: roundGeometry(mass, FIXED.steelDensity.value, FIXED.roundLengthToDiameter.value).A },
    plan: { turret: plan.turret || [], beam: plan.beam || [], turretPoint: plan.turretPoint || null, zone: plan.zone ?? null, railgun: plan.railgun || [], missile: plan.missile || null }, targetFire,
    rounds: [], shots: 0, beams: 0, hits: [], misses: [], spent: { m: 0, P: [0, 0], L: 0, K: 0, rounds: 0 }, embedded: 0,
    beam: null, lines: [], ended: null,
    disabledSteps: stepsAtLeast(scaled(params.battle.disabledSeconds, edge), A.world.dt),
  };
  // L5c (13n.1 (c)): missiles and flak rounds in flight, the missiles' thrust books, the window events' log.
  Object.assign(battle, { missiles: [], flak: [], missileShots: 0, flakShots: 0, thrust: { J: [0, 0], H: 0, Hgross: 0, work: 0 }, log: createLog('W') });
  battle.spentFlak = (r) => spend(battle, r.m, r.x, r.v);
  // A static attacker given attackerHeading holds it (a case setting, as targetHeading: L5e1's plume case, 13n.8 J3).
  battle.attackerFixed = attackerHeading !== null && !orders.A && !enemy.A ? attackerHeading : null;
  battle.attacker = side('A', A, null);
  battle.target = side('T', T, targetHeading);
  battle.attacker.other = battle.target; battle.target.other = battle.attacker;
  battle.sides = [battle.attacker, battle.target];
  battle.pd = battle.sides.some((s) => s.world.fittings.some((f) => f.type === 'pd' || f.type === 'pdLaser'));
  for (const s of battle.sides) for (const g of s.world.rooms) if (g.type === 'shieldGenerator' && shield[s === battle.attacker ? 'attacker' : 'target']) g.shield.on = true;
  battle.knowledge = !!knowledge;
  if (battle.knowledge) {
    for (const s of battle.sides) s.model = createKnowledge(s.world, s.other.world);
    battle.pairs = battle.sides.map((s) => ({ world: s.world, model: s.model, other: s.other.world })); // the model keeps no reference to the other world (#301, item 45 (a))
    battle.scans = scans.map((x) => ({ ...x, step: stepsAtLeast(x.at || 0, A.world.dt), done: false }));
    sense(battle.pairs, { scan: false }); // the silhouette and what is seen at undock, before any step
  }
  // L5d (13n.1 (d)): the helms and the enemy; the verbs; escape's books.
  for (const [name, s] of [['A', battle.attacker], ['T', battle.target]]) {
    if (enemy[name]) createEnemy(battle, s, enemy[name]);
    else if (orders[name]) s.helm = createHelm(battle, s, orders[name]);
    if (s.helm && enemy[name] && orders[name]) s.helm.orders = createHelm(battle, s, orders[name]).orders;
  }
  battle.inputs = inputs.map((x) => ({ ...x, step: stepsAtLeast(x.t || 0, A.world.dt), done: false }));
  battle.ids = new Map(); // one id space (§17 item 35): each world's own cause of a launch -> the battle's id
  battle.separation = { last: null, passed: null, widening: 0 };
  aim(battle);
  // The attacker's first heading: its beam on its first aim point, else bow-on to the target's centre of mass; a helm
  // keeps the heading it undocked with until its first step.
  const ab = mainBody(battle.attacker);
  if (!battle.attacker.helm) ab.theta = battle.attacker.heading;
  else battle.attacker.heading = ab.theta;
  if (battle.target.helm) battle.target.heading = mainBody(battle.target).theta;
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
/**
 * A plan's room as the shooter's model has it (#301 (1), §17 item 45 (a)): the first of `ids` its model does not know
 * (it stays the target, aimed at the case's zone) or knows with a standing cell; one its model knows with no standing
 * cell is lost to it.
 */
const modelStanding = (shooter, side, ids) => ids.map((id) => side.room(id)).find((r) => {
  if (!r) return false;
  const k = shooter.model.rooms.get(r.id);
  return !k || k.cells.some((c) => !shooter.model.cells.get(c).destroyed);
}) || null;
/** The plan's pick: by the truth with knowledge off, by the shooter's model with it on (#301 (1)). */
const planPick = (battle, ids) => (battle.knowledge ? modelStanding(battle.attacker, battle.target, ids) : firstStanding(battle.target, ids));
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
  const D = sub(P, body.x), rho = len(D), b = face[1] - body.c[1], phi = atan2(D[1], D[0]);
  if (!(rho > Math.abs(b))) return phi;
  return phi - atan2(b, Math.sqrt(rho * rho - b * b));
}

/** Before the step: the attacker's turret and beam on the plan's first standing rooms, its wanted heading; the target's fire order. */
function aim(battle) {
  if (!battle.attacker.helm) aimPlan(battle);
  if (battle.targetFire && !battle.target.helm) {
    const t = battle.target.world.rooms.find((r) => r.type === 'turret');
    if (t) { t.turret.hold = false; t.turret.aim = [...battle.targetFire.aim]; }
  }
}
/** The attacker's plan (a case's test input, #301 (1)): its turret, beam, railgun and first missile bay on the plan's rooms. */
function aimPlan(battle) {
  const A = battle.attacker, T = battle.target, ab = mainBody(A);
  const turret = A.world.rooms.find((r) => r.type === 'turret'), bay = A.world.rooms.find((r) => r.type === 'beamBay');
  const tr = planPick(battle, battle.plan.turret), br = planPick(battle, battle.plan.beam);
  // With the knowledge model (13n.1 (a), #289) a plan room is aimed at as the model knows it, else at the centre of the
  // zone the case names; without it, at the room itself (L4b).
  const pointAt = (room) => !room ? null : !battle.knowledge ? aimPoint(T, room) : knownAim(A.model, room.id) || (battle.plan.zone !== null ? zoneCentre(A.model, battle.plan.zone) : null);
  if (turret) {
    const P = battle.plan.turretPoint ? [...battle.plan.turretPoint] : pointAt(tr); // turretPoint: a world point the case names (B11)
    turret.turret.hold = !P;
    if (P) {
      const b = bodyOfRoom(A, turret), S = worldPoint(b, turret.position), d = sub(P, S), L = len(d);
      if (L > 0) turret.turret.aim = rotate([d[0] / L, d[1] / L], -b.theta);
    }
  }
  const P = pointAt(br);
  if (bay) {
    const was = bay.beamBay.firing;
    bay.beamBay.firing = !!P;
    if (P && !was) battle.beamId = `beam-${++battle.beams}`; // a new beam id each time the bay starts firing
    A.beamId = battle.beamId;
  }
  // The railgun (13n.1 (c)): fires while the plan names a standing room; its axis turned onto it when the beam has none.
  const rail = A.world.rooms.find((r) => r.type === 'railgun'), Pr = rail ? pointAt(planPick(battle, battle.plan.railgun)) : null;
  if (rail) rail.railgun.firing = !!Pr;
  A.heading = battle.attackerFixed !== null ? battle.attackerFixed : P && bay ? headingThrough(ab, bayFace(A, bay), P) : Pr ? headingThrough(ab, bayFace(A, rail), Pr) : (() => { const D = sub(mainBody(T).x, ab.x); return atan2(D[1], D[0]); })();
  // The missile bay launches while the plan asks for missiles it has not launched yet (13n.1 (c)).
  const mb = A.world.rooms.find((r) => r.type === 'missileBay'), mp = battle.plan.missile;
  if (mb) mb.missileBay.launching = !!mp && mb.missileBay.launches < (mp.count ?? Infinity);
  // A typed turret store fires the type its target calls for (#95, 13n.1 (c)).
  if (turret && turret.turret.typed) turret.turret.want = roundFor(battle, A, turret, tr);
}

/**
 * The round type a typed turret store fires at plan room `room` (#95, 13n.1 (c)): with the knowledge model, a room the
 * model knows is HE when it is on the hull face (no standing cell of the other ship's silhouette lies on the line from
 * the turret to the model's aim point before the aim cell) and AP when it lies behind at least one cell; Standard on a
 * zone (a room the model does not know), at a case's point, and without the model.
 */
function roundFor(battle, A, turret, room) {
  if (!room || !battle.knowledge || (!A.helm && battle.plan.turretPoint)) return 'standard';
  const model = A.model, known = model.rooms.get(room.id);
  const c = known && known.cells.map((k) => model.cells.get(k)).filter((x) => !x.destroyed).sort((x, y) => x.k - y.k)[0];
  if (!c) return 'standard';
  const sil = model.silhouette, id = sil.standing.get(`${c.cell[0]},${c.cell[1]}`);
  const pose = sil.bodies.find((b) => b.id === id) || sil.bodies.find((b) => b.id === 'body-0') || sil.bodies[0];
  const e = model.edge, a = toGrid(pose, worldPoint(bodyOfRoom(A, turret), turret.position)), q = [(c.cell[0] + 0.5) * e, (c.cell[1] + 0.5) * e];
  const v = sub(q, a), L = len(v);
  if (!(L > 0)) return 'he';
  let before = 0;
  for (const x of crossedCells(a, [v[0] / L, v[1] / L], model.grid, e)) {
    if (x.cell[0] === c.cell[0] && x.cell[1] === c.cell[1]) break;
    if (sil.standing.has(`${x.cell[0]},${x.cell[1]}`) && (x.t1 - x.t0) / e > CORNER) before++;
  }
  return before === 0 ? 'he' : 'ap';
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
    if (cell.destroyed || cell.fragment !== b.id || isDestroyed(host) || !host.controlled || host.shutdown || host.unmanned || host.outage || !host.active) continue;
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
 * a plated segment, the kernel's plateEntry (sigma / cos theta, #258). Each entry carries `at` (grid m), its point
 * on the line: a cell's chord midpoint, a plate's crossing point (B2, 13n.1 (b)). A path with no matter on it (only
 * holes) is no hit. Returns the nearest hit { body, entry (grid m), dir (grid, unit), from (grid m, the line's origin),
 * path, cells, t, length } or null.
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
    let first = -1, enter = null;
    const path = [], at = [];
    const on = (q, v) => Math.abs(q - v) < 1e-9;
    for (let k = 0; k < cells.length; k++) {
      const [i, j] = cells[k].cell, p0 = [a[0] + d[0] * cells[k].t0, a[1] + d[1] * cells[k].t0];
      const prev = k > 0 ? cells[k - 1].cell : on(p0[0], i * e) ? [i - 1, j] : on(p0[0], (i + 1) * e) ? [i + 1, j] : on(p0[1], j * e) ? [i, j - 1] : on(p0[1], (j + 1) * e) ? [i, j + 1] : null;
      const x = prev ? plateEntry(w, prev, cells[k].cell, d) : null;
      if (x && side.room(x.plate.room).cells[x.plate.k].fragment === b.id) {
        if (first < 0) { if (cells[k].t0 > L) break; first = k; enter = segmentKey(prev, [cells[k].cell[0] - prev[0], cells[k].cell[1] - prev[1]]); }
        x.at = p0; // where the line crosses the plate's segment
        path.push(x);
      }
      const chord = Math.min(1, (cells[k].t1 - cells[k].t0) / e);
      const c = cellAt(w, cells[k].cell);
      if (!c || c.room.cells[c.index].fragment !== b.id || !(chord > CORNER)) continue;
      if (first < 0) { if (cells[k].t0 > L) break; first = k; enter = prev ? segmentKey(prev, [cells[k].cell[0] - prev[0], cells[k].cell[1] - prev[1]]) : null; }
      const tm = (cells[k].t0 + cells[k].t1) / 2;
      path.push({ room: c.room, cell: c.index, chord, at: [a[0] + d[0] * tm, a[1] + d[1] * tm] });
      at.push(cells[k].cell);
    }
    if (first >= 0 && cells.exit) {
      const x = plateEntry(w, cells[cells.length - 1].cell, cells.exit.cell, d);
      if (x && side.room(x.plate.room).cells[x.plate.k].fragment === b.id) { x.at = [a[0] + d[0] * cells.exit.t, a[1] + d[1] * cells.exit.t]; path.push(x); }
    }
    if (first < 0 || !path.some((x) => (x.plate ? !plateGone(w, x.plate) : !x.room.cells[x.cell].destroyed))) continue;
    const t = cells[first].t0;
    if (best && (to ? t / L : t) >= best.t) continue;
    best = { body: b.id, entry: [a[0] + d[0] * t, a[1] + d[1] * t], dir: d, from: a, path, cells: at, t: to ? t / L : t, length: L };
    Object.defineProperty(best, 'enter', { value: enter, enumerable: false }); // the hull segment it enters through (the firing window, #100)
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
/** Before the step: each side's beam line on the other ship (its first beam bay's), the other's shield paying at the entry point (13d.1). */
function beamsIn(battle) {
  for (const A of battle.sides) {
    const T = A.other, bay = A.world.rooms.find((r) => r.type === 'beamBay');
    A.beam = null;
    if (A === battle.attacker) battle.beam = null;
    if (!bay || !bay.beamBay.firing || !(bay.beamBay.beam > 0)) { setBeams(T.world, []); continue; }
    const b = bodyOfRoom(A, bay), from = worldPoint(b, bayFace(A, bay)), dir = rotate([1, 0], b.theta);
    const hit = lineHit(T, from, null, dir);
    A.beam = { id: A.beamId, power: bay.beamBay.beam, from, dir, hit, energy: beamEnergy(A.world, bay) };
    if (A === battle.attacker) battle.beam = A.beam;
    setBeams(T.world, hit ? [{ id: A.beamId, position: hit.entry, power: bay.beamBay.beam }] : []);
  }
}
/** After the step: what each shield let through goes along the path (fireBeam), with the beam's id as its cause. */
function beamsOut(battle) {
  for (const A of battle.sides) {
    const x = A.beam, T = A.other;
    if (!x || !x.hit) continue;
    const res = T.world.beamResults.find((r) => r.id === x.id);
    if (!res || !(res.passed > 0)) continue;
    x.result = fireBeam(T.world, { power: res.passed, energy: x.energy, range: len(sub(mainBody(T).x, x.from)) }, x.hit.path, x.id);
  }
}

/**
 * Read each side's new events: a kernel shot or slug launched a round (recoil put it in the shooter's
 * world.ship.rounds); a missile bay launched a missile (in world.ship.missiles), which gets its battle id and the
 * room its seeker is designated on (L5c).
 */
function launch(battle) {
  for (const s of battle.sides) {
    const ev = s.world.log.events;
    for (; s.logIndex < ev.length; s.logIndex++) {
      const e = ev[s.logIndex];
      if (e.type === 'missile-launched') {
        const x = s.world.ship.missiles.find((y) => y.cause === e.cause && !y.id);
        if (!x) continue;
        Object.assign(x, { id: `missile-${++battle.missileShots}`, shooter: s, other: s.other, event: e.id, dose: 0 });
        battle.ids.set(`${s.name}:${e.cause}`, x.id);
        battle.missiles.push(x);
        continue;
      }
      if (e.type !== 'shot' && e.type !== 'slug') continue;
      const ref = s.world.ship.rounds.find((r) => r.cause === e.cause && !r.battle);
      if (!ref) continue;
      const id = `shot-${++battle.shots}`;
      ref.battle = id;
      battle.ids.set(`${s.name}:${e.cause}`, id); // one id space (§17 item 35): the shooter's own cause names the battle's id
      battle.rounds.push({ id, shooter: s, other: s.other, ref, prev: [...ref.x0], t0: e.t, event: e.id });
      if (battle.knowledge) s.model.shots.push({ id, t: e.t });
    }
  }
}

/**
 * After the step: each round's segment, from where it was (on the other ship's pose before the step) to where it
 * is (on its pose now), is tested against the other ship's hull; a hit is resolved along the whole line (shieldRound
 * at the entry point, then fireRound, each with the round's velocity relative to the hull, #242, its direction that
 * velocity's, #269). A round stopped in the hull joins the body it stops in (B4, rooms.js embedRound); one stopped by
 * the field ends there, its momentum (the hull's velocity at its stop) booked in battle.spent; one that passes
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
/**
 * The round's line of action on body b (B2, 13n.1 (b)): the line through its world position X along its velocity u
 * relative to the hull at the first entry with matter (x), that entry's point lying on the line. Each entry's `at`
 * (its chord midpoint or crossing point, lineHit) is moved to its projection on that line, so every impulse of the
 * hit acts on one line through the round and the two-ship angular momentum book closes; the first entry's point and
 * the direction are found together (a fixed point: the hull's velocity there depends on the point, by omega x r).
 * On a body that does not turn the projection moves nothing beyond float residue.
 */
function lineOfAction(X, u, b, path, x) {
  const mid = worldPoint(b, x.at);
  let Q = mid, D = null, converged = false;
  for (let k = 0; k < 20; k++) {
    const rv = sub(u, pointVelocity(b, Q)), l = len(rv);
    if (!(l > 0)) {
      // A round at rest relative to the hull has no line of action and brings no impulse: its entries act at its own
      // position (#282 (7) (c)).
      const at = toGrid(b, X);
      for (const y of path) y.at = [...at];
      return;
    }
    D = [rv[0] / l, rv[1] / l];
    const s = (mid[0] - X[0]) * D[0] + (mid[1] - X[1]) * D[1], next = [X[0] + D[0] * s, X[1] + D[1] * s];
    const moved = len(sub(next, Q));
    Q = next;
    if (moved <= 1e-13 * (1 + len(X))) { converged = true; break; }
  }
  if (!converged) throw new Error('lineOfAction: the first entry\'s point did not converge in 20 iterations (B2, 13n.1 (b))');
  for (const y of path) {
    const W = worldPoint(b, y.at), s = (W[0] - X[0]) * D[0] + (W[1] - X[1]) * D[1];
    y.at = y === x ? toGrid(b, Q) : toGrid(b, [X[0] + D[0] * s, X[1] + D[1] * s]);
  }
}
/** The grid point (body b's frame) of world point Q projected on the line through world point X along v (Q if v is 0). */
function onLine(b, X, v, Q) {
  const l = len(v);
  if (!(l > 0)) return toGrid(b, Q);
  const D = [v[0] / l, v[1] / l], s = (Q[0] - X[0]) * D[0] + (Q[1] - X[1]) * D[1];
  return toGrid(b, [X[0] + D[0] * s, X[1] + D[1] * s]);
}
function strike(battle, r, hit) {
  // A typed round, a slug or a penetrator carries its own mass and cross-section (L5c); an L4 round is the battle's M round.
  const w = r.other.world, b = w.ship.bodies.find((x) => x.id === hit.body), m = r.ref.A !== undefined ? r.ref.m : battle.round.mass, A = r.ref.A !== undefined ? r.ref.A : battle.round.area;
  // The shooter's model (13n.1 (a)): where its round entered, and the hit's path only where the model knows the cells.
  if (battle.knowledge) r.shooter.model.hits.push({ id: r.id, t: battle.t, entry: worldPoint(b, hit.entry), cells: hit.cells.filter((c) => r.shooter.model.cells.has(`${c[0]},${c[1]}`)).map((c) => [...c]) });
  // The momentum exchange runs along the round's velocity relative to the hull, in the body's frame (B1 of the L4
  // physics audit, #269); lineHit's dir (the round's displacement between two poses) decides only whether and where
  // it hits. Each kernel call takes the round's world velocity relative to the hull at the point it books the hull
  // at: shieldRound at the entry point, fireRound at its first entry with matter (a cell's centre, a plate's
  // midpoint, rooms.js entryPoint), so the u0 it rebuilds is the round's own velocity and the books close.
  const q = worldPoint(b, hit.entry), hq = pointVelocity(b, q), rel = sub(r.ref.v, hq), speed = len(rel);
  const relative = (v, body) => { const d = len(v); return { speed: d, dir: d > 0 ? rotate([v[0] / d, v[1] / d], -body.theta) : hit.dir }; };
  const toShield = relative(rel, b);
  // The firing window (#100): through a segment the other side's own round or beam opened this step it meets no field.
  const open = hit.enter && r.other.open && r.other.open.has(hit.enter);
  if (open) r.window = hit.enter;
  // A missile's penetrator has met the field with its missile (r.fielded, §17 item 48): not again. The field's impulse
  // acts on the round's line of action (§17 item 35): `at` the entry point projected on the line through the round
  // along its velocity relative to the hull, in the hit body's frame.
  const sh = open || r.fielded ? { velocity: speed, energy: 0 } : shieldRound(w, { position: hit.entry, at: onLine(b, r.ref.x, rel, q), frame: b.id, mass: m, velocity: speed, area: A, direction: toShield.dir });
  let res = null, toHull = null;
  if (sh.velocity > 0) {
    const u = sh.velocity === speed ? r.ref.v : [hq[0] + (sh.velocity * rel[0]) / speed, hq[1] + (sh.velocity * rel[1]) / speed];
    const x = hit.path.find((y) => entryArealDensity(w, y) > 0);
    const cell = x.plate ? r.other.room(x.plate.room).cells[x.plate.k] : x.room.cells[x.cell];
    const bf = w.ship.bodies.find((y) => y.id === cell.fragment);
    lineOfAction(r.ref.x, u, bf, hit.path, x);
    toHull = relative(sub(u, pointVelocity(bf, worldPoint(bf, x.at))), bf);
    res = fireRound(w, { mass: m, velocity: toHull.speed, area: A, direction: toHull.dir }, hit.path, r.id);
    // An HE round bursts at its stopping entry (13n.1 (c)): a contact burst of its he.blastEnergy there.
    if (r.ref.type === 'he' && res.stoppedIn >= 0) {
      const y = hit.path[res.stoppedIn], host = y.plate ? r.other.room(y.plate.room) : y.room, E = r.ref.burst;
      const ev = emit(w.log, { t: battle.t, type: 'burst', room: host.id, cause: r.id, crew: host.crew, energy: E, entered: y.plate ? 0 : scaled(battle.params.he.coupling, battle.edge) * E, channel: 'blast', parent: r.id });
      within(w.log, ev, () => contactBurst(w, y, E, r.id));
    }
  }
  r.done = true;
  const stopped = !res || res.stoppedIn >= 0 || res.wrecked || !res.u1;
  if (stopped && res && res.u1 && res.stoppedIn >= 0) {
    // B4 (13n.1 (b)): the round joins the body it stopped in, with its momentum and angular momentum as they are.
    embedRound(w, hit.path[res.stoppedIn], m, res.u1, r.ref.x);
    battle.embedded++;
    r.shooter.world.ship.rounds = r.shooter.world.ship.rounds.filter((y) => y !== r.ref);
    r.over = 'embedded';
    battle.hits.push({ id: r.id, t: battle.t, side: r.other.name, body: hit.body, entry: hit.entry, dir: hit.dir, exchange: toShield.dir, speed, afterShield: sh.velocity, toHull: toHull.speed, passed: res.passed, stoppedIn: res.stoppedIn, wrecked: res.wrecked, r: res.r, momentum: res.momentum, f: res.f, path: hit.path.map((y) => (y.plate ? `plate:${y.plate.id}` : `${y.room.id}:${y.cell}`)), stopped });
    return;
  }
  battle.hits.push({ id: r.id, t: battle.t, side: r.other.name, body: hit.body, entry: hit.entry, dir: hit.dir, exchange: toShield.dir, speed, afterShield: sh.velocity, toHull: toHull ? toHull.speed : 0, passed: res ? res.passed : 0, stoppedIn: res ? res.stoppedIn : -2, wrecked: res ? res.wrecked : false, r: res ? res.r : [], momentum: res ? res.momentum : 0, f: res ? res.f : 0, path: hit.path.map((x) => (x.plate ? `plate:${x.plate.id}` : `${x.room.id}:${x.cell}`)), stopped });
  if (stopped) {
    // The round comes to rest in the hull (or against the field): it moves on with the hull at the entry point.
    const v = res && res.u1 ? res.u1 : pointVelocity(b, q), sp = battle.spent;
    sp.m += m; sp.P[0] += m * v[0]; sp.P[1] += m * v[1]; sp.L += m * cross(q, v); sp.K += 0.5 * m * (v[0] * v[0] + v[1] * v[1]); sp.rounds++;
    r.shooter.world.ship.rounds = r.shooter.world.ship.rounds.filter((x) => x !== r.ref);
    r.over = 'stopped';
  } else r.ref.v = [...res.u1];
}

// ---------- the firing window (#100, 13n.1 (c)) ----------
/**
 * The hull segments of side s's own ship a line from world point `from` (on the pose `pose0` of body b before the
 * step) to `to` (on b now) crosses outward: where a cell of b's fragment is followed along the line by one that is
 * not, within the segment. Returns { segments, outside } (outside: the line ends outside b's cells).
 */
function crossingsOut(side, b, pose0, from, to) {
  const w = side.world, e = w.edge, a = toGrid(pose0 || b, from), v = sub(toGrid(b, to), a), L = len(v);
  if (!(L > 0)) return { segments: [], outside: false };
  const cells = crossedCells(a, [v[0] / L, v[1] / L], w.layout.grid, e), inside = (cell) => { const c = cell && cellAt(w, cell); return !!c && c.room.cells[c.index].fragment === b.id; };
  const segments = [];
  let last = null;
  for (let k = 0; k < cells.length && cells[k].t0 <= L; k++) {
    const next = k + 1 < cells.length ? cells[k + 1].cell : cells.exit ? cells.exit.cell : null;
    if (inside(cells[k].cell) && cells[k].t1 <= L && next && !inside(next)) segments.push(segmentKey(cells[k].cell, [next[0] - cells[k].cell[0], next[1] - cells[k].cell[1]]));
    last = cells[k].cell;
  }
  return { segments, outside: !inside(last) || cells[cells.length - 1].t1 < L };
}
/**
 * After the step, before any round is tested: each side's open segments this step (#100). A round of the side still
 * inside its own hull opens each segment its step's segment crosses outward (its first step for a hull turret); a
 * firing beam opens its bay's bow-face segments its axis line leaves through (both, where the line runs on the
 * boundary of two rows), every step it fires. Each opening is a 'window' event in the battle's own log (battle.log),
 * room the firing room, cause the shot's or the beam's id.
 */
function windows(battle, before) {
  for (const s of battle.sides) s.open = new Set();
  const note = (s, room, segment, cause) => {
    s.open.add(segment);
    emit(battle.log, { t: battle.t, type: 'window', room: room.id, cause, crew: room.crew, segment, side: s.name, parent: cause });
  };
  for (const r of battle.rounds) {
    if (r.over || r.cleared) continue;
    const s = r.shooter, room = s.room(r.ref.from), b = room && s.world.ship.bodies.find((x) => x.id === room.body);
    if (!b) { r.cleared = true; continue; }
    const res = crossingsOut(s, b, before.get(s).get(b.id), r.prev, r.ref.x);
    for (const seg of res.segments) note(s, room, seg, r.id);
    if (res.outside) r.cleared = true;
  }
  for (const A of battle.sides) {
    const x = A.beam;
    if (!x || !(x.power > 0)) continue;
    const bay = A.world.rooms.find((r) => r.type === 'beamBay'), cells = A.world.layout.rooms.get(bay.id).cells, e = A.world.edge;
    const x1 = Math.max(...cells.map((c) => c[0])), y = bay.position[1], j = Math.floor(y / e), rows = Math.abs(y - j * e) < 1e-9 ? [j - 1, j] : [j];
    for (const row of rows) if (cells.some((c) => c[0] === x1 && c[1] === row)) { const seg = segmentKey([x1, row], [1, 0]); if (!A.open.has(seg)) { A.open.add(seg); if (A.windowBeam !== x.id) note(A, bay, seg, x.id); } }
    A.windowBeam = x.id;
  }
}

// ---------- missiles (13n.1 (c), js/missile.js) ----------
/** A munition's mass m at world x with velocity v leaves the battle's flight: booked in battle.spent (momentum, angular momentum, energy). */
function spend(battle, m, x, v) {
  const sp = battle.spent;
  sp.m += m; sp.P[0] += m * v[0]; sp.P[1] += m * v[1]; sp.L += m * cross(x, v); sp.K += 0.5 * m * (v[0] * v[0] + v[1] * v[1]);
}
/**
 * After the step: each missile in flight turns onto its seeker's aim point (its side's model, read as sensed after the
 * last step) and flies the step (thrust booked in battle.thrust); point defence acts (js/defence.js); each surviving
 * missile's segment is tested against the other hull (on its pose before and after the step, as a round's) and a hit
 * acts its warhead. A missile that dies or hits leaves flight (booked in battle.spent).
 */
function flyMissiles(battle, before) {
  if (!battle.missiles.length) { if (battle.pd) pointDefence(battle); return; }
  if (!battle.knowledge) throw new Error('missiles need the knowledge model: their seekers read only it (13n.1 (c)); set knowledge: true');
  const dt = battle.dt, t0 = battle.t - dt;
  for (const x of battle.missiles) {
    // The designated seeker's room: its shooter's helm target, else the plan's (a test input, read by the model, #301 (1)).
    const target = x.shooter.helm ? (x.shooter.helm.target && x.shooter.helm.target.room ? x.other.room(x.shooter.helm.target.room) : null)
      : battle.plan.missile && modelStanding(x.shooter, x.other, battle.plan.missile.rooms || []);
    x.aim = seekerAim(x.shooter.model, x, target ? target.id : null);
    if (x.aim.point) steer(x, x.aim.point);
    const k = moveMissile(x.shooter.world, x, t0, dt), th = battle.thrust;
    th.J[0] += k.J[0]; th.J[1] += k.J[1]; th.H += k.H; th.Hgross += Math.abs(k.H); th.work += k.work;
  }
  if (battle.pd) pointDefence(battle);
  for (const x of battle.missiles) {
    if (x.dead || x.over) continue;
    const hit = lineHit(x.other, x.prev, x.x, null, before.get(x.other));
    if (hit) warhead(battle, x, hit);
  }
  for (const x of battle.missiles) if (x.dead && !x.over) { x.over = 'killed'; spend(battle, x.m, x.x, x.v); }
  battle.missiles = battle.missiles.filter((x) => !x.over);
  for (const s of battle.sides) s.world.ship.missiles = s.world.ship.missiles.filter((x) => !x.over);
}
/**
 * A missile's warhead at its hit (13n.1 (c), #97, #292), at the first entry with matter on the other hull: HE a contact
 * burst of missile.warheadEnergy there (rooms.js contactBurst); the penetrator a round of missile.penetratorMass at the
 * missile's velocity (strike: the field, the round rule, a stop or a pass); EMP a field of missile.empEnergy from the
 * hit point (rooms.js empBurst), timed within the step. Each a 'warhead' event in the other ship's log, cause the
 * missile's id. The missile's body at impact (all of it for HE and EMP, the rest beyond the penetrator) is a stopped
 * projectile of its mass at its velocity (#296 (3)): before the warhead acts it joins the body holding that first entry
 * (rooms.js embedRound, the round rule's accounting for a stopped round, B4): its momentum and angular momentum go to
 * that body, the kinetic energy the joining loses is heat in the entry's room; nothing is booked as spent.
 */
function warhead(battle, x, hit) {
  const w = x.other.world, p = battle.params, edge = w.edge, y = hit.path.find((z) => entryArealDensity(w, z) > 0);
  const host = y.plate ? x.other.room(y.plate.room) : y.room, tHit = battle.t - battle.dt + hit.t * battle.dt;
  const mp = scaled(p.missile.penetratorMass, edge), V = x.v, speed = len(V);
  const energy = x.warhead === 'he' ? scaled(p.missile.warheadEnergy, edge) : x.warhead === 'emp' ? scaled(p.missile.empEnergy, edge) : 0.5 * mp * speed * speed;
  const channel = x.warhead === 'he' ? 'blast' : x.warhead === 'emp' ? 'emp' : 'kinetic';
  const ev = emit(w.log, { t: tHit, type: 'warhead', room: host.id, cause: x.id, crew: host.crew, kind: x.warhead, channel, energy, missile: x.id, entry: [...hit.entry], parent: x.id });
  x.hit = { t: tHit, entry: [...hit.entry], room: host.id, event: ev.id };
  within(w.log, ev, () => {
    // A charged field acts on the missile's body first (§17 item 48, 13n.8): the field's kinetic rule (shieldRound) on a
    // round of the missile's mass at its speed relative to the hull at the entry point, its cross-section a steel
    // cylinder of that mass at FIXED.roundLengthToDiameter (roundGeometry: a stand-in, the hardest sectional momentum
    // for the field; its source after Mission 0); through a segment the other side opened this step it meets no field
    // (#100). The body (and the penetrator) go on at the speed the field left; the HE and EMP warheads are energy,
    // not kinetic, and act as before (the EMP's field still pays the buffers first, #292).
    const hb = w.ship.bodies.find((z) => z.id === hit.body), q = worldPoint(hb, hit.entry), hq = pointVelocity(hb, q), rel = sub(V, hq), sp = len(rel);
    const open = hit.enter && x.other.open && x.other.open.has(hit.enter);
    const sh = open || !(sp > 0) ? { velocity: sp, energy: 0 } : shieldRound(w, { position: hit.entry, at: onLine(hb, x.x, rel, q), frame: hb.id, mass: x.m, velocity: sp, area: roundGeometry(x.m, FIXED.steelDensity.value, FIXED.roundLengthToDiameter.value).A, direction: rotate([rel[0] / sp, rel[1] / sp], -hb.theta) });
    const V1 = sh.velocity === sp ? [...V] : [hq[0] + (sh.velocity * rel[0]) / sp, hq[1] + (sh.velocity * rel[1]) / sp];
    if (sh.energy > 0) x.hit.field = { speed: sp, after: sh.velocity, energy: sh.energy }; // only when a field paid (a record without one stays as it was)
    const pen = x.warhead === 'penetrator' && sh.velocity > 0, body = pen ? x.m - mp : x.m; // a penetrator the field stopped stays with the body
    x.hit.body = { m: body, heat: embedRound(w, y, body, V1, [...x.x]) };
    if (x.warhead === 'he') x.burst = contactBurst(w, y, energy, x.id);
    else if (x.warhead === 'emp') x.burst = empBurst(w, hit.entry, energy, x.id, tHit);
    else if (pen) {
      const ref = { m: mp, x: [...x.x], v: V1, A: roundGeometry(mp, FIXED.steelDensity.value, FIXED.roundLengthToDiameter.value).A, type: 'penetrator', from: x.from, cause: x.id };
      x.shooter.world.ship.rounds.push(ref);
      const r = { id: x.id, shooter: x.shooter, other: x.other, ref, prev: [...x.prev], t0: x.t, event: x.event, cleared: true, fielded: true };
      battle.rounds.push(r);
      strike(battle, r, hit);
    }
  });
  x.over = 'hit';
}
/** Missiles and flak rounds farther than battle.cullDistance from every body of both ships leave play (booked in battle.spent). */
function cullMunitions(battle) {
  const D = scaled(battle.params.battle.cullDistance, battle.edge), bodies = battle.sides.flatMap((s) => s.world.ship.bodies);
  const far = (x) => bodies.every((b) => len(sub(x.x, b.x)) > D);
  for (const x of battle.missiles) if (!x.over && far(x)) { x.over = 'left'; spend(battle, x.m, x.x, x.v); }
  battle.missiles = battle.missiles.filter((x) => !x.over);
  for (const s of battle.sides) s.world.ship.missiles = s.world.ship.missiles.filter((x) => !x.over);
  battle.flak = battle.flak.filter((r) => { if (!far(r)) return true; spend(battle, r.m, r.x, r.v); return false; });
}

// ---------- the engine's plume (13n.1 (e), 13n.8, #297, #304) ----------
/**
 * After the step: behind each live engine with thrust, a cone of half-angle engine.plumeHalfAngle about the axis its
 * jet leaves along (-x of its body, from the exhaust face's centre) carries the jet's power, the engine's thrust this
 * step x engine.exhaustVelocity / 2 (the throttle in it), at P / (pi (d tan theta)^2) at the distance d along the axis
 * (uniform across the cone's section, so the section carries P). Each radiator panel, antenna and point-defence
 * fitting of the other ship whose edge midpoint lies inside a cone takes that intensity over one hull segment's face,
 * edge^2, for the step (rooms.js burnFitting; mechanism C: never a hull cell). No occlusion: a fitting behind the
 * other ship's own hull burns as one in the open (a stated simplification). Returns nothing.
 */
function plume(battle) {
  const p = battle.params, edge = battle.edge, theta = (scaled(p.engine.plumeHalfAngle, edge) * Math.PI) / 180;
  const tan = sin(theta) / cos(theta), ve = scaled(p.engine.exhaustVelocity, edge), face = edge * edge, dt = battle.dt;
  for (const s of battle.sides) {
    for (const r of s.world.rooms) {
      if (r.type !== 'engine' || !r.placed || isDestroyed(r) || !(r.engine.thrust > 0)) continue;
      const b = bodyOfRoom(s, r), apex = worldPoint(b, r.exhaust), axis = rotate([-1, 0], b.theta), P = (r.engine.thrust * ve) / 2;
      const o = s.other, bodies = o.world.ship.bodies;
      for (const f of o.world.fittings) {
        if (!PLUME_TYPES.has(f.type) || f.ruined) continue;
        const cell = o.room(f.room).cells[f.k], fb = bodies.find((x) => x.id === cell.fragment);
        if (cell.destroyed || !fb) continue;
        const D = sub(worldPoint(fb, f.p), apex), d = D[0] * axis[0] + D[1] * axis[1];
        if (!(d > 0)) continue;
        const R = d * tan, lat = len([D[0] - d * axis[0], D[1] - d * axis[1]]);
        if (lat > R) continue;
        burnFitting(o.world, f, (P / (Math.PI * R * R)) * face * dt, 'plume');
      }
    }
  }
}

// ---------- able to fight, Disabled, destroyed (13l.1, #82, #83, #255) ----------
/**
 * Each weapon room of a world and whether it is able (13l.1, #255): not destroyed, controlled, not shut down,
 * manned (13n.1 (b): a room that requires crew and has none is unmanned), active, and joined through live walls
 * (through any rooms) to a reactor that can produce (controlled, not SCRAMmed, not shut down, manned, not
 * destroyed); a turret also needs a round in its ready store or a turret magazine (one magazine per weapon type,
 * 13n.1 (b)) of its size with rounds that shares a live wall with it (the wall the feed crosses, graph.js
 * feedAmmo). For an unable weapon, `why` is the first condition that fails, in that order, and `parent` the event
 * that took it (13l.1).
 */
export function weaponStates(world) {
  const walls = liveWalls(world).filter((w) => w.live > 0);
  const producing = world.rooms.filter((r) => r.type === 'reactor' && r.placed && r.active && !isDestroyed(r) && r.controlled && !r.reactor.scrammed && !r.shutdown && !r.unmanned); // a switched-off reactor produces nothing (L5d)
  const reached = new Set(producing), queue = [...producing];
  for (let i = 0; i < queue.length; i++) for (const w of walls) { const o = w.a === queue[i] ? w.b : w.b === queue[i] ? w.a : null; if (o && !reached.has(o)) { reached.add(o); queue.push(o); } }
  const typed = (g) => (g.typed ? Object.values(g.typed).reduce((x, y) => x + y, 0) : 0);
  const fed = (t) => walls.some((w) => { const mag = w.a === t ? w.b : w.b === t ? w.a : null; return mag && mag.type === 'magazine' && !mag.exploded && magazineType(mag) === 'turret' && mag.magazine.size === t.size && mag.magazine.ap + mag.magazine.he + typed(mag.magazine) > 0; });
  // L5c (13n.1 (c)): a railgun is fed by a railgun magazine holding a slug, a missile bay by its store or a missile magazine.
  const slugFed = (t) => walls.some((w) => { const mag = w.a === t ? w.b : w.b === t ? w.a : null; return mag && mag.type === 'magazine' && !mag.exploded && magazineType(mag) === 'railgun' && mag.magazine.slugMass >= railgunSlug(world, t).m; });
  const bayFed = (t) => t.missileBay.ready.length > 0 || walls.some((w) => { const mag = w.a === t ? w.b : w.b === t ? w.a : null; return mag && mag.type === 'magazine' && !mag.exploded && magazineType(mag) === 'missile' && mag.magazine.missiles > 0; });
  const lastCut = world.log.lastCut || 'launch';
  return world.rooms.filter((r) => WEAPONS.has(r.type) && r.placed).map((r) => {
    const m = r.marks;
    const fail = isDestroyed(r) ? ['destroyed', m.destroyed || 'launch']
      : !r.controlled ? ['no-control', m.controlLost || 'launch']
      : r.shutdown ? ['heat', m.shutdown || 'heat']
      : r.unmanned ? ['unmanned', m.unmanned || 'launch']
      : r.outage ? ['outage', m.outage || 'launch']
      : !r.active ? ['off', 'launch']
      : !reached.has(r) ? ['no-power', lastCut]
      : r.type === 'turret' && !(r.turret.ammo > 0) && !fed(r) ? ['dry', m.lastShot || 'launch']
      : r.type === 'railgun' && !slugFed(r) ? ['dry', m.lastShot || 'launch']
      : r.type === 'missileBay' && !bayFed(r) ? ['dry', m.lastShot || 'launch']
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
 * The end, after each step (and once at the start): a reactor's explosion destroys the ship (checked first; a
 * magazine's explosion is a blast through its walls and ends nothing by itself, #274, 13n.1 (b)), then too many
 * pieces; else each weapon's ability is updated (when it is lost, the step and the
 * event that took it are kept), and with no able weapon for battle.disabledSeconds the ship is Disabled. The end is
 * an event in the side's log ('destroyed', 'disabled') whose parent is the event that caused it.
 */
function checkEnd(battle) {
  const wreck = scaled(battle.params.battle.wreckFraction, battle.edge);
  for (const s of battle.sides) {
    const w = s.world, ev = w.log.events;
    const boom = ev.slice(s.boomIndex || 0).find((e) => e.type === 'explosion' && s.room(e.room)?.type === 'reactor');
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
    // The weapon that lost its ability last; a tie goes to the later event that took it.
    const last = () => [...s.weapons.entries()].map(([id, x]) => ({ id, ...x })).sort((a, b) => b.step - a.step || eventIndex(b.parent) - eventIndex(a.parent))[0];
    if (battle.step - s.sinceStep >= battle.disabledSteps) {
      const lost = last();
      end(battle, s, 'disabled', { room: lost ? lost.id : 'ship', parent: lost ? lost.parent : 'launch', why: lost ? lost.why : null });
    } else if (s.enemy && battle.step - s.sinceStep >= stepsAtLeast(scaled(battle.params.battle.disabledSeconds, battle.edge) * s.enemy.personality.resolve, battle.dt)) {
      // Surrender (#85, #86, #273 (5), 13n.1 (d), #303): the enemy strikes its colours battle.disabledSeconds x resolve
      // after losing its last weapon; a capture, its own end kind (the same loot, #83). At resolve 1 it is Disabled first.
      const lost = last();
      end(battle, s, 'surrender', { room: lost ? lost.id : 'ship', parent: lost ? lost.parent : 'launch', why: lost ? lost.why : null });
    }
  }
  draw(battle);
  escape(battle);
}
/**
 * A simultaneous end (13n.8, #315): when both sides met an end condition in this same step, the battle ends as a draw
 * (no side wins: it replaces the processing order, which no decision chose, as the end's tie-break). Each side keeps
 * its own end (s.ended) and gets a 'draw' event in its log (parent its own end's event, `other` the other side's end
 * kind); battle.ended is { kind: 'draw', side: 'A,T', sides: ['A', 'T'], ends: { A, T } (each side's own kind), t,
 * step, event (A's draw event), parent (A's own end event) }.
 */
function draw(battle) {
  const [a, t] = battle.sides, x = battle.ended;
  if (!x || x.kind === 'draw' || x.step !== battle.step || !a.ended || !t.ended || a.ended.step !== battle.step || t.ended.step !== battle.step) return;
  const ev = battle.sides.map((s) => emit(s.world.log, { t: battle.t, type: 'draw', room: 'ship', cause: s.ended.event, crew: s.world.rooms.reduce((n, r) => n + r.crew, 0), other: s.other.ended.kind, parent: s.ended.event }));
  battle.ended = { side: 'A,T', sides: ['A', 'T'], kind: 'draw', ends: { A: a.ended.kind, T: t.ended.kind }, t: battle.t, step: battle.step, event: ev[0].id, parent: a.ended.event, why: null, by: null };
}
/**
 * Escape (#293, 13n.1 (d)): the separation of the two flown bodies' centres of mass beyond battle.cullDistance and
 * growing for battle.disabledSeconds of consecutive steps counted only beyond it (the first such step is the step it
 * passes the distance; the count runs from the next) on steps where a side's `disengage` order stands (#307: a
 * withdrawal resets the count, a new order starts it anew): that side escapes (the first to order it when both do;
 * neither: no count, no escape; #306 (7)), the event 'escaped' in its log with the separation, its own end kind.
 */
function escape(battle) {
  const a = mainBody(battle.attacker), b = mainBody(battle.target), x = battle.separation;
  if (!a || !b) return;
  const d = len(sub(a.x, b.x)), D = scaled(battle.params.battle.cullDistance, battle.edge);
  // The count runs only while a side's disengage stands (#307): with none standing it resets, and an order given
  // again starts it anew.
  const runners = battle.sides.filter((s) => s.helm && s.helm.disengageStep !== null && !s.ended).sort((p, q) => p.helm.disengageStep - q.helm.disengageStep);
  if (!(d > D) || !runners.length) { x.passed = null; x.widening = 0; }
  else if (x.passed === null) { x.passed = battle.step; x.widening = 0; }
  else if (d > x.last) x.widening++;
  else { x.widening = 0; x.passed = battle.step; }
  x.last = d;
  if (battle.ended || x.widening < battle.disabledSteps) return;
  if (runners.length) end(battle, runners[0], 'escaped', { room: 'ship', parent: 'launch', separation: d });
}
function end(battle, s, kind, { by = null, room, parent, why = null, separation = null }) {
  if (s.ended) return;
  const r = s.room(room), crew = r ? r.crew : s.world.rooms.reduce((x, y) => x + y.crew, 0);
  const extra = kind === 'disabled' || kind === 'surrender' ? { since: s.since } : kind === 'escaped' ? { separation } : { by };
  const e = emit(s.world.log, { t: battle.t, type: kind, room, cause: parent, crew, parent, ...extra });
  s.ended = { kind, t: battle.t, step: battle.step, event: e.id, parent, why, by };
  if (!battle.ended) battle.ended = { side: s.name, kind, t: battle.t, step: battle.step, event: e.id, parent, why, by };
}

// ---------- the player's verbs (13n.1 (d)) ----------
/**
 * A verb of the player's (a case's input, #39, 13n.1 (d)): 'scan' zone k (the side's first antenna, a one-shot command),
 * 'target' room id (read only through the side's model: a room it does not know is no target until it does), 'preset'
 * name (the whole set of twelve). Each recorded in battle.verbs.
 */
function verb(battle, x) {
  const s = battle[x.side === 'T' ? 'target' : 'attacker'];
  if (!s.helm) throw new Error(`a verb needs a side with a helm (orders), side ${x.side}`);
  if (x.verb === 'scan') setScan(s.world, 0, x.arg);
  else if (x.verb === 'target') s.helm.verbTarget = x.arg;
  else if (x.verb === 'preset') s.helm.orders = createHelm(battle, s, x.arg).orders;
  else throw new Error(`unknown verb ${x.verb}: scan, target or preset (13n.1 (d))`);
  (battle.verbs ??= []).push({ step: battle.step, t: battle.t, side: s.name, verb: x.verb, arg: x.arg });
}

// ---------- the loop ----------
/** One step of the battle (13l.1). */
export function tick(battle) {
  if (battle.ended) return;
  if (battle.knowledge) for (const x of battle.scans) if (!x.done && battle.step >= x.step) { setScan(battle[x.side === 'T' ? 'target' : 'attacker'].world, x.antenna, x.zone); x.done = true; }
  for (const x of battle.inputs) if (!x.done && battle.step >= x.step) { verb(battle, x); x.done = true; }
  aim(battle);
  for (const s of battle.sides) {
    if (s.enemy && !s.ended) enemyStep(battle, s);
    if (s.helm && !s.ended) { helmStep(battle, s); const t = s.world.rooms.find((r) => r.type === 'turret'); if (t && t.turret.typed) t.turret.want = roundFor(battle, s, t, s.helm.target && s.helm.target.room ? s.other.room(s.helm.target.room) : null); }
  }
  for (const s of battle.sides) holdHeading(battle, s);
  beamsIn(battle);
  if (battle.pd) aimLasers(battle); // a laser holds its missile through the step (its draw is asked for in it)
  const before = new Map(battle.sides.map((s) => [s, new Map(s.world.ship.bodies.map((b) => [b.id, poseOf(b)]))]));
  for (const s of battle.sides) step(s.world);
  battle.step++;
  battle.t = battle.attacker.world.t;
  beamsOut(battle);
  launch(battle);
  windows(battle, before);
  flyRounds(battle, before);
  flyMissiles(battle, before);
  plume(battle);
  for (const s of battle.sides) {
    cull(s.world, s.other.world.ship.bodies);
    for (const r of battle.rounds) if (r.shooter === s && !r.over && !s.world.ship.rounds.includes(r.ref)) { r.over = 'left'; if (!r.done) battle.misses.push({ id: r.id, t: battle.t }); }
  }
  cullMunitions(battle);
  battle.rounds = battle.rounds.filter((r) => !r.over);
  if (battle.knowledge) sense(battle.pairs);
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
  // L5c: missiles and flak rounds in flight; the missiles' thrust is external, like an engine's.
  for (const x of inFlight(battle)) { P[0] += x.m * x.v[0]; P[1] += x.m * x.v[1]; gross += x.m * len(x.v); }
  J[0] += battle.thrust.J[0]; J[1] += battle.thrust.J[1];
  return { P, J, gross };
}
/** Missiles and flak rounds in flight (L5c). */
const inFlight = (battle) => [...battle.missiles, ...battle.flak];
/**
 * Energy of both ships (B3, 13n.1 (b)): the kinetic energy of bodies, debris, rounds in flight, what left play and
 * the rounds spent against a field, plus the heat of every hit, field and stopped round, less what entered: each
 * shot's muzzle energy (the round's kinetic energy in the turret's frame plus the recoil's), the work of thrust and
 * RCS, and the energy of mass moved inside a ship (the feed). `total` stays fixed; `gross` is the sum of the
 * magnitudes of its terms (the scale of its float residue).
 */
export function battleEnergy(battle) {
  let K = battle.spent.K, heat = 0, shots = 0, work = 0, internal = 0, gross = Math.abs(battle.spent.K);
  for (const s of battle.sides) {
    const sh = s.world.ship, k = momentumOf(sh).K + (sh.left ? sh.left.K : 0);
    K += k; gross += Math.abs(k);
    heat += sh.energy.heat; shots += sh.energy.shots; work += sh.energy.work; internal += sh.energy.internal;
    gross += Math.abs(sh.energy.heat) + Math.abs(sh.energy.shots) + Math.abs(sh.energy.work) + Math.abs(sh.energy.internal);
  }
  for (const x of inFlight(battle)) { const k = 0.5 * x.m * (x.v[0] * x.v[0] + x.v[1] * x.v[1]); K += k; gross += k; }
  work += battle.thrust.work; gross += Math.abs(battle.thrust.work);
  return { K, heat, shots, work, internal, total: K + heat - shots - work - internal, gross };
}
/**
 * Angular momentum of both ships about the world origin (B2, 13n.1 (b)): bodies (with their spin), debris, rounds
 * in flight, what left play and the rounds spent against a field, less the angular impulse of thrust and RCS (the
 * external H without the hits' and fields' part, which moves angular momentum between a round and a hull). `L - H`
 * stays fixed while the hits and the fields act on their line of action (a field's impulse on a round's line at the
 * hull entry point since L5e1, §17 item 35; at its generator before); `gross`: the magnitudes of every term and the external books' own gross.
 */
export function battleAngular(battle) {
  let L = battle.spent.L, H = 0, gross = Math.abs(battle.spent.L);
  for (const s of battle.sides) {
    const sh = s.world.ship, left = sh.left ? sh.left.L : 0;
    L += momentumOf(sh).L + left;
    H += sh.external.H - sh.exchange.H;
    gross += Math.abs(left) + sh.external.Hgross;
    for (const b of sh.bodies) gross += Math.abs(b.M * cross(b.x, b.v)) + Math.abs(b.I * b.omega);
    for (const d of sh.debris) gross += Math.abs(d.m * cross(d.x, d.v)) + Math.abs(d.spin * d.omega);
    for (const r of sh.rounds) gross += Math.abs(r.m * cross(r.x, r.v));
  }
  for (const x of inFlight(battle)) { const l = x.m * cross(x.x, x.v); L += l; gross += Math.abs(l); }
  H += battle.thrust.H; gross += battle.thrust.Hgross;
  return { L, H, total: L - H, gross };
}
export { survivingCells, magazineContents };
