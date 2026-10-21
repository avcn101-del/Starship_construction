// proto/battle.js — the feel prototype's battle (DESIGN.md 13h, #217, #224):
// two R1s on the unchanged L3 kernel, the three presets, the scripted enemy,
// the stand-ins for what L4-L5 have not built, and the end at Disabled or
// destruction. No DOM: it runs in Node (proto/measure.mjs) and in the page
// (proto/proto.js). No Math.random: the seeded RNG of js/util.js only.
// It only reads and drives the kernel through its exported functions; it
// never changes js/. Every physics number comes from js/data.js (the
// loadout's shield budget and hits to wreck as run-time overrides within
// their approved ranges); every prototype setting from proto/config.js.
import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, setDemand, enablePowerRouting, setBeams, setRcs, shieldRound, fireRound, destroyCell, step, readout, isDestroyed, survivingCells, magazineContents, cellAt } from '../js/rooms.js';
import { withOverrides, TIERS, FIXED, PARAMS, ROOMS, scaled } from '../js/data.js';
import { rng } from '../js/util.js';
import { beamDeliveredFraction } from '../js/field.js';
import { roundGeometry, sectionalMomentum } from '../js/projectile.js';
import { penetrate } from '../js/damage.js';
import { validateShip } from '../js/layout.js';
import { rotate, worldPoint } from '../js/body.js';
import { LAYOUTS, LOADOUT, SEPARATION, TIER, SEED, PRESETS, SCRIPT, DISABLED_SECONDS, defaultLoadout } from './config.js';

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

/** One ship of the loadout's layout at its station: `side` 'player' (centre of mass at the origin, facing +x) or 'enemy' (900 m ahead, facing -x). */
function buildShip(params, side, loadout) {
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
  return { side, world, room, station: stationBody, preset: 'fire', target: null, crewTotal, crewLost: 0, logIndex: 0, size: L.size,
    rcsIds: world.fittings.filter((f) => f.type === 'rcs').map((f) => f.id), armour: armourBelt(world, L.size, loadout.armour),
    beam: { power: 0, absorbed: 0, passed: 0, onCell: 0, aimed: null }, burn: new Map(), disabledSince: null, disabled: false, destroyed: false, destroyedBy: null, firstFailure: null };
}
/**
 * STAND-IN bow armour (loadout; armour fittings, #15, are not built in the kernel): n armour cells in front of each
 * bow-facing row, at x = front + 1 .. front + n beyond the row's foremost room cell. Per row, outermost first.
 */
function armourBelt(world, size, n) {
  const rows = new Map();
  if (!n) return rows;
  for (let y = 0; y < size[1]; y++) {
    let front = -1;
    for (let x = 0; x < size[0]; x++) if (cellAt(world, [x, y])) front = x;
    if (front < 0) continue;
    const cells = [];
    for (let i = n; i >= 1; i--) cells.push({ row: y, x: front + i, integrity: 1, destroyed: false });
    rows.set(y, cells);
  }
  return rows;
}

/** World point (m) of grid point p of a ship at its station. */
export const stationPoint = (ship, p) => worldPoint(ship.station, p);

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
 * measure scripts both). `loadout` (config.js LOADOUT; missing levers take their default) applies to both ships.
 */
export function createBattle({ seed = SEED, overrides = {}, scripted = { player: false, enemy: true }, beamOnly = false, loadout = {} } = {}) {
  const lo = { ...defaultLoadout(), ...loadout };
  for (const [k, v] of Object.entries(lo)) if (!LOADOUT[k] || !LOADOUT[k].options.some((o) => o.value === v)) throw new Error(`unknown loadout ${k} = ${v}`);
  const params = withOverrides({ ...loadoutOverrides(lo), ...overrides });
  const player = buildShip(params, 'player', lo), enemy = buildShip(params, 'enemy', lo);
  player.other = enemy; enemy.other = player;
  player.name = 'P'; enemy.name = 'E';
  player.rng = rng(seed); enemy.rng = rng(seed + 1);
  const edge = TIERS[TIER].edge, k = params.kinetic;
  const mass = scaled(k.roundMass, edge) * FIXED.sizeLinear.value.M ** 3, velocity = scaled(k.muzzleVelocity, edge);
  const { A } = roundGeometry(mass, FIXED.steelDensity.value, FIXED.roundLengthToDiameter.value);
  const aperture = edge / 2;
  const battle = {
    params, loadout: lo, player, enemy, ships: [player, enemy], scripted, beamOnly: beamOnly || lo.turrets === false, dt: player.world.dt, t: 0, steps: 0,
    round: { mass, velocity, area: A },
    // STAND-IN beam geometry: the fraction of the beam's power that lands on one cell at the stations' distance (L0's Gaussian beam).
    beamFraction: beamDeliveredFraction(SEPARATION, scaled(params.beam.focusRange, edge), aperture, FIXED.beamWaistPerHalfCell.value * aperture),
    burnEnergy: scaled(params.armour.burnEnergy, edge),
    armourResistance: scaled(params.armour.kineticResistance, edge),
    // Drawn width (cells): the layout, plus the armour belt beyond the foremost row.
    width: Math.max(player.size[0], ...[...player.armour.values()].map((cells) => cells[0].x + 1)),
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
  ship.room('turret').turret.hold = !(p.turret && aim && !battle.beamOnly); // beamOnly: the loadout's turrets off (the beam-only probe)
  ship.room('shield').shield.on = p.shield;
  ship.room('engine').engine.throttle = p.throttle;
  setRcs(w, ship.rcsIds, false);
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
  for (let x = ship.size[0] - 1; x >= 0; x--) {
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
    shooter.beam.onCell = onCell;
    // STAND-IN bow armour: the beam first burns the surviving armour cells of the burning cell's row, outermost first;
    // that energy stays in the armour (its heat is not modelled) and does not heat the room behind.
    const plate = k >= 0 ? (target.armour.get(target.world.layout.rooms.get(id).cells[k][1]) || []).find((c) => !c.destroyed) : null;
    if (plate) {
      const key = `armour:${plate.row}:${plate.x}`, got = (target.burn.get(key) || 0) + onCell * battle.dt;
      target.burn.set(key, got);
      shooter.beam.burning = { armour: plate, key, got };
    } else room.externalPower = onCell; // every joule delivered becomes heat in the target room (#137)
    if (k >= 0 && !plate) {
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
  if (burning && burning.armour && burning.got >= battle.burnEnergy) {
    target.burn.delete(burning.key);
    damageArmour(battle, target, burning.armour, 1, `${shooter.name}:beam`, 'thermal');
  } else if (burning && !burning.armour && burning.got >= battle.burnEnergy) {
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
/** STAND-IN bow armour: an armour cell loses `loss` of its integrity (a float residue of 1e-12 or less counts as 0, as in the kernel). */
function damageArmour(battle, ship, c, loss, cause, channel) {
  if (c.destroyed) return;
  const left = c.integrity - loss;
  c.integrity = left > 1e-12 ? left : 0;
  if (c.integrity === 0) c.destroyed = true;
  battle.events.push({ side: ship.side, t: battle.t, type: c.destroyed ? 'armour-destroyed' : 'armour-damaged', room: 'armour', cause, channel, row: c.row, integrity: c.integrity, standIn: true });
}
/**
 * STAND-IN bow armour: a round entering row `row` first meets that row's armour cells, outermost first, by L0's rule
 * (kernel penetrate, armour.kineticResistance per cell; a wrecked armour cell is a hole that resists nothing). A
 * passed cell loses 1 / kinetic.hitsToWreck, the cell it stops in (absorbed / R) / hitsToWreck, as fireRound does
 * for room cells. Returns the velocity it leaves the belt with (sectional momentum left x area / mass; 0: stopped).
 */
function throughArmour(battle, ship, row, velocity, cause) {
  const cells = ship.armour.get(row);
  if (!cells || velocity <= 0) return velocity;
  const { mass, area } = battle.round, R = battle.armourResistance, hits = battle.params.kinetic.hitsToWreck.value;
  const res = penetrate(sectionalMomentum(mass, velocity, area), cells.map((c) => (c.destroyed ? 0 : R)));
  res.absorbed.forEach((a, i) => { if (!cells[i].destroyed) damageArmour(battle, ship, cells[i], (i < res.passed ? 1 : a / R) / hits, cause, 'kinetic'); });
  return res.stoppedIn >= 0 ? 0 : (res.residual * area) / mass;
}
/** A round arriving: the shield field at the aimed room slows it (kernel shieldRound), the bow armour (if any) next, then the kernel's fireRound resolves it along its row. */
function arrive(battle, r) {
  const w = r.target.world, room = r.target.room(r.room);
  const sh = shieldRound(w, { position: room.position, ...battle.round });
  const v = throughArmour(battle, r.target, r.row, sh.velocity, r.cause);
  let res = null;
  if (v > 0) res = fireRound(w, { ...battle.round, velocity: v }, rowPath(r.target, r.row), r.cause);
  battle.hits.push({ t: battle.t, shooter: r.shooter.side, target: r.target.side, row: r.row, room: r.room, slowed: battle.round.velocity - sh.velocity, armourLeft: v, passed: res ? res.passed : 0, stoppedIn: res ? res.stoppedIn : -1, path: res ? rowPath(r.target, r.row).map((p) => p.room.id) : [] });
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
    firstFailure: ship.firstFailure, destroyedBy: ship.destroyedBy,
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
    if (e.type === 'explosion' && (e.room === 'reactor' || e.room === 'magazine')) { if (!ship.destroyed) ship.destroyedBy = { t: e.t, room: e.room, energy: e.energy, cause: e.cause }; ship.destroyed = true; }
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
