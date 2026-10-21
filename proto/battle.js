// proto/battle.js — the feel prototype's battle (DESIGN.md 13h, #217, #224):
// two R1s on the unchanged L3 kernel, the three presets, the scripted enemy,
// the stand-ins for what L4-L5 have not built, and the end at Disabled or
// destruction. No DOM: it runs in Node (proto/measure.mjs) and in the page
// (proto/proto.js). No Math.random: the seeded RNG of js/util.js only.
// It only reads and drives the kernel through its exported functions; it
// never changes js/. Every physics number comes from js/data.js; every
// prototype setting from proto/config.js.
import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, setDemand, enablePowerRouting, setBeams, setRcs, shieldRound, fireRound, destroyCell, step, readout, isDestroyed, survivingCells, magazineContents, cellAt } from '../js/rooms.js';
import { withOverrides, TIERS, FIXED, scaled } from '../js/data.js';
import { rng } from '../js/util.js';
import { beamDeliveredFraction } from '../js/field.js';
import { roundGeometry } from '../js/projectile.js';
import { rotate, worldPoint } from '../js/body.js';
import { R1_ROOMS, R1_FITTINGS, R1_SIZE, SEPARATION, TIER, SEED, PRESETS, SCRIPT, DISABLED_SECONDS } from './config.js';

const RCS_IDS = [17, 18, 19, 20];

/** One R1 at its station: `side` 'player' (centre of mass at the origin, facing +x) or 'enemy' (900 m ahead, facing -x). */
function buildShip(params, side) {
  const tier = TIERS[TIER], edge = tier.edge;
  const world = createWorld({ params, edge, grid: tier.grid });
  for (const r of R1_ROOMS) addRoom(world, r.type, { id: r.id, cell: r.cell, rotation: r.rotation || 0 });
  for (const [type, room, cell, sideOut] of R1_FITTINGS) addFitting(world, type, room, cell, sideOut);
  const room = (id) => world.rooms.find((r) => r.id === id);
  // As the L3 scenarios build R1: the magazine full of HE, the turret's ready store full.
  loadMagazine(world, room('magazine'), { heMass: scaled(params.magazine.capacity, edge) });
  loadTurret(room('turret'), params.turret.readyRounds.value);
  room('turret').turret.hold = true;
  room('turret').turret.aim = [1, 0]; // the gun points forward, at the other ship
  enablePowerRouting(world);
  setDemand(world, room('reactor'), 1); // routing delivers only what is drawn (#193)
  const heading = side === 'player' ? 0 : Math.PI, centre = readout(world).centre;
  const station = side === 'player' ? [0, 0] : [SEPARATION, 0], r = rotate(centre, heading);
  enableShip(world, { origin: [station[0] - r[0], station[1] - r[1]], heading });
  // STAND-IN (no helm before L4-L5): the ship is held at this station for aiming and drawing; the kernel's body
  // still integrates thrust, RCS and recoil, but that motion is not shown or used.
  const b = world.ship.bodies[0];
  const stationBody = { x: [...b.x], c: [...b.c], theta: b.theta };
  const crewTotal = world.rooms.reduce((x, rm) => x + rm.crewTotal, 0);
  return { side, world, room, station: stationBody, preset: 'fire', target: null, crewTotal, crewLost: 0, logIndex: 0,
    beam: { power: 0, absorbed: 0, passed: 0, onCell: 0, aimed: null }, burn: new Map(), disabledSince: null, disabled: false, destroyed: false, firstFailure: null };
}

/** World point (m) of grid point p of a ship at its station. */
export const stationPoint = (ship, p) => worldPoint(ship.station, p);

/** Create a battle. `scripted`: which sides follow the enemy's script ({ enemy: true } by default; the headless measure scripts both). */
export function createBattle({ seed = SEED, overrides = {}, scripted = { player: false, enemy: true }, beamOnly = false } = {}) {
  const params = withOverrides(overrides);
  const player = buildShip(params, 'player'), enemy = buildShip(params, 'enemy');
  player.other = enemy; enemy.other = player;
  player.name = 'P'; enemy.name = 'E';
  player.rng = rng(seed); enemy.rng = rng(seed + 1);
  const edge = TIERS[TIER].edge, k = params.kinetic;
  const mass = scaled(k.roundMass, edge) * FIXED.sizeLinear.value.M ** 3, velocity = scaled(k.muzzleVelocity, edge);
  const { A } = roundGeometry(mass, FIXED.steelDensity.value, FIXED.roundLengthToDiameter.value);
  const aperture = edge / 2;
  const battle = {
    params, player, enemy, ships: [player, enemy], scripted, beamOnly, dt: player.world.dt, t: 0, steps: 0,
    round: { mass, velocity, area: A },
    // STAND-IN beam geometry: the fraction of the beam's power that lands on one cell at the stations' distance (L0's Gaussian beam).
    beamFraction: beamDeliveredFraction(SEPARATION, scaled(params.beam.focusRange, edge), aperture, FIXED.beamWaistPerHalfCell.value * aperture),
    burnEnergy: scaled(params.armour.burnEnergy, edge),
    rounds: [], hits: [], events: [], inputs: [], ended: null,
  };
  for (const s of battle.ships) if (scripted[s.side]) scriptUpdate(battle, s);
  for (const s of battle.ships) applyPreset(battle, s);
  return battle;
}

// ---------- the player's verbs (13h.2) and the enemy's script ----------
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

/** The enemy's fixed script (13h.2): Fire 60 s, Cool 30 s, repeat; beam bay, then turret, then engine, each until wrecked. */
function scriptUpdate(battle, ship) {
  const cycle = SCRIPT.phases.reduce((x, p) => x + p.seconds, 0);
  let t = battle.t % cycle;
  for (const p of SCRIPT.phases) { if (t < p.seconds) { ship.preset = p.preset; break; } t -= p.seconds; }
  const other = ship.other;
  ship.target = SCRIPT.targets.find((id) => !isDestroyed(other.room(id))) || null;
}

const targetAlive = (ship) => ship.target !== null && !isDestroyed(ship.other.room(ship.target));

/** Set the kernel's controls from the ship's preset and target. */
function applyPreset(battle, ship) {
  const p = PRESETS[ship.preset], w = ship.world, aim = targetAlive(ship);
  ship.room('beamBay').beamBay.firing = p.beam && aim;
  ship.room('turret').turret.hold = !(p.turret && aim && !battle.beamOnly); // beamOnly: a headless probe (measure.mjs), never the page
  ship.room('shield').shield.on = p.shield;
  ship.room('engine').engine.throttle = p.throttle;
  setRcs(w, RCS_IDS, false);
  if (p.rcs.length) setRcs(w, p.rcs, true);
}

// ---------- stand-ins ----------
/** Distinct grid rows of a room's cells. */
function rowsOf(ship, id) {
  return [...new Set(ship.world.layout.rooms.get(id).cells.map((c) => c[1]))].sort((a, b) => a - b);
}
/**
 * STAND-IN (L4-L5 trajectories): a round from the other ship, which lies ahead of this one's bow, enters along
 * grid row y from the bow (largest x) and meets every room cell of that row in order; holes stay in the path
 * (fireRound lets a round through them at no cost, #212).
 */
function rowPath(ship, y) {
  const path = [];
  for (let x = R1_SIZE[0] - 1; x >= 0; x--) {
    const c = cellAt(ship.world, [x, y]);
    if (c) path.push({ room: c.room, cell: c.index });
  }
  return path;
}
/** STAND-IN beam burn order: the aimed room's surviving cells, the ones facing the shooter (largest x) first. */
function burnCell(ship, id) {
  const room = ship.room(id), cells = ship.world.layout.rooms.get(id).cells;
  let best = -1;
  room.cells.forEach((c, k) => {
    if (c.destroyed) return;
    if (best < 0 || cells[k][0] > cells[best][0] || (cells[k][0] === cells[best][0] && cells[k][1] < cells[best][1])) best = k;
  });
  return best;
}

/**
 * STAND-IN beams (13h.2), before the step: the shooter's beam power of its last step reaches the aimed room at
 * once (light speed). The kernel's shield takes it at that point (setBeams); what passed in the last step, times
 * the Gaussian fraction that lands on one cell at this range, heats the aimed room (its external source) and
 * burns its cells by L0's rule: a cell burns through when it has received the burn energy.
 */
function beamsIn(battle, shooter) {
  const target = shooter.other, w = target.world, bb = shooter.room('beamBay').beamBay;
  for (const r of w.rooms) r.externalPower = 0;
  const id = shooter.beam.aimed;
  const onCell = shooter.beam.passed * battle.beamFraction;
  shooter.beam.onCell = 0;
  if (id && !isDestroyed(target.room(id)) && onCell > 0) {
    const room = target.room(id), k = burnCell(target, id);
    room.externalPower = onCell; // every joule delivered becomes heat in the target room (#137)
    shooter.beam.onCell = onCell;
    if (k >= 0) {
      const key = `${id}:${k}`, got = (target.burn.get(key) || 0) + onCell * battle.dt;
      target.burn.set(key, got);
      shooter.beam.burning = { room: id, cell: k, got };
    }
  }
  const power = bb.firing ? bb.beam : 0;
  shooter.beam.aimed = power > 0 ? shooter.target : null;
  shooter.beam.power = power;
  setBeams(w, power > 0 ? [{ id: `${shooter.name}:beam`, position: target.room(shooter.target).position, power }] : []);
}
/** After the step: what the shield let through, and cells that have burnt through. */
function beamsOut(battle, shooter) {
  const target = shooter.other, w = target.world;
  const res = shooter.beam.power > 0 ? w.beamResults.find((x) => x.id === `${shooter.name}:beam`) : null;
  shooter.beam.absorbed = res ? res.absorbed : 0;
  shooter.beam.passed = res ? res.passed : 0;
  const burning = shooter.beam.burning;
  shooter.beam.burning = null;
  if (burning && burning.got >= battle.burnEnergy) {
    target.burn.delete(`${burning.room}:${burning.cell}`);
    destroyCell(w, target.room(burning.room), burning.cell, `${shooter.name}:beam`, 'thermal');
  }
}

/** STAND-IN rounds: each kernel 'shot' launches a round that flies straight to the aimed room at the muzzle velocity. */
function launch(battle, shooter, e) {
  if (!shooter.target) return;
  const target = shooter.other, room = target.room(shooter.target);
  const from = stationPoint(shooter, shooter.room('turret').position), to = stationPoint(target, room.position);
  const rows = rowsOf(target, shooter.target), row = rows[Math.floor(shooter.rng() * rows.length)];
  const flight = Math.hypot(to[0] - from[0], to[1] - from[1]) / battle.round.velocity;
  battle.rounds.push({ shooter, target, room: shooter.target, row, from, to, t0: e.t, t1: e.t + flight, cause: `${shooter.name}:${e.cause}` });
}
/** A round arriving: the shield field at the aimed room slows it (kernel shieldRound), then the kernel's fireRound resolves it along its row. */
function arrive(battle, r) {
  const w = r.target.world, room = r.target.room(r.room);
  const sh = shieldRound(w, { position: room.position, ...battle.round });
  let res = null;
  if (sh.velocity > 0) res = fireRound(w, { ...battle.round, velocity: sh.velocity }, rowPath(r.target, r.row), r.cause);
  battle.hits.push({ t: battle.t, shooter: r.shooter.side, target: r.target.side, row: r.row, room: r.room, slowed: battle.round.velocity - sh.velocity, passed: res ? res.passed : 0, stoppedIn: res ? res.stoppedIn : -1, path: res ? rowPath(r.target, r.row).map((p) => p.room.id) : [] });
  if (battle.hits.length > 50) battle.hits.shift();
}

// ---------- the end (#82, #83) ----------
const reactorOk = (ship) => ship.world.rooms.some((r) => r.type === 'reactor' && !isDestroyed(r) && !r.shutdown && !r.reactor.scrammed && r.controlled);
const working = (r) => !isDestroyed(r) && r.controlled && !r.shutdown && r.active;
/** Able to fire or thrust, whatever the preset: the room works, is controlled and a reactor can power it. */
export function abilities(ship) {
  const power = reactorOk(ship), mag = ship.room('magazine'), t = ship.room('turret');
  const fed = t.turret.ammo > 0 || (!isDestroyed(mag) && magazineContents(ship.world, mag).ap + magazineContents(ship.world, mag).he > 0);
  return { beam: power && working(ship.room('beamBay')), turret: power && working(t) && fed, thrust: power && working(ship.room('engine')) };
}
function checkEnd(battle) {
  for (const s of battle.ships) {
    const a = abilities(s);
    if (a.beam || a.turret || a.thrust) s.disabledSince = null;
    else if (s.disabledSince === null) s.disabledSince = battle.t;
    if (s.disabledSince !== null && battle.t - s.disabledSince >= DISABLED_SECONDS - 1e-9) s.disabled = true;
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
export function summary(ship) {
  return {
    crewLost: ship.crewLost, crewTotal: ship.crewTotal,
    wrecked: ship.world.rooms.filter((r) => isDestroyed(r)).map((r) => r.id),
    cellsLost: ship.world.rooms.reduce((x, r) => x + r.cells.length - survivingCells(r), 0),
    firstFailure: ship.firstFailure,
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
    if (e.type === 'explosion' && (e.room === 'reactor' || e.room === 'magazine')) ship.destroyed = true;
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
  for (const s of battle.ships) beamsIn(battle, s);
  for (const s of battle.ships) step(s.world);
  battle.steps++;
  battle.t = battle.player.world.t;
  for (const s of battle.ships) beamsOut(battle, s);
  for (const s of battle.ships) readEvents(battle, s);
  const due = battle.rounds.filter((r) => r.t1 <= battle.t);
  if (due.length) {
    battle.rounds = battle.rounds.filter((r) => r.t1 > battle.t);
    for (const r of due) arrive(battle, r);
    for (const s of battle.ships) readEvents(battle, s);
  }
  checkEnd(battle);
}

/** Drain the events gathered since the last call (for the log). */
export function drainEvents(battle) {
  const out = battle.events;
  battle.events = [];
  return out;
}
