// rooms.js — rooms built from ROOMS in data.js, their cells, crew, power and
// control state, and the behaviours of each room alone (DESIGN.md 13c, L1):
// reactor (demand, SCRAM, decay heat, breach, meltdown), magazine (contents,
// cook-off), turret (firing), shield generator, engine, crew quarters
// (housing, repair field), bridge (control, backup supply), beam bay.
// A world given a grid is a cluster (L2, DESIGN.md 13d): rooms placed on the
// grid (layout.js) share walls; heat conducts through them (fast along the
// coolant loop, slowly through passive walls, #200), life support pumps the
// heat of crewed rooms and magazines into the loop (#201), power and
// ammunition flow over them (graph.js), blast crosses them; shields overlap
// without paying more than their budgets (#170); quarters share their repair
// budget; and the size rule applies (#185 (4), #187 (4)). A room added
// without a layout is a cluster of one and behaves exactly as at L1.
// Everything a step needs from other rooms is computed from the state at the
// start of the step. A cluster made a ship (L3, DESIGN.md 13f, #208) is a
// rigid body (body.js) with mass from its cells, contents and fittings;
// engines, RCS fittings and recoil move and turn it; a destroyed cell is a
// hole whose mass leaves as debris and which resists no round (#212 (5));
// the structure graph splits it into fragments with the parent's velocity
// field; control runs over live walls from the bridge, and a room that
// loses it stops (a reactor SCRAMs, #81). No DOM, no Math.random.
import { ROOMS, FIXED, BASE_EDGE } from './data.js';
import { createHeat, temperature, radiatorPower, heatStep, crossings, wallConductance, conductionFlows, ventCell } from './heat.js';
import { createLog, emit } from './events.js';
import { absorbBeamStep, shieldStrength, stopRound } from './field.js';
import { stepsAtLeast } from './util.js';
import { createLayout, placeRoom, openEdges, roomCentre, sharedWalls, byId, fittingProblem, edgeMidpoint, exhaustFace } from './layout.js';
import { liveWalls, priorityMaxFlow, feedAmmo, cellComponents, reachedThrough } from './graph.js';
import { massProperties, createBody, worldPoint, pointVelocity, applyImpulse, integrate, reshape, fragmentOf, redistribute, rotate, momentumOf } from './body.js';
import { penetrate } from './damage.js';
import { sectionalMomentum } from './projectile.js';

// A time within 1e-9 of a step boundary counts as that boundary (as stepsAtLeast).
const onStep = (time, dt) => Math.abs(time / dt - Math.round(time / dt)) <= 1e-9 * Math.max(1, Math.abs(time / dt));
/** The step j with j dt <= time < (j + 1) dt. */
const stepContaining = (time, dt) => (onStep(time, dt) ? Math.round(time / dt) : Math.floor(time / dt));

/**
 * A world of rooms stepped together: params from withOverrides, one tier.
 * Given a `grid` ([columns, rows], the tier's grid in TIERS) it is a cluster
 * with a layout at the tier's edge, and the size rule applies (L2).
 */
export function createWorld({ params, edge = BASE_EDGE, dt = FIXED.simStep.value, grid = null }) {
  const world = { params, edge, dt, step: 0, t: 0, rooms: [], log: createLog(), shipMass: null, repaired: [] };
  if (grid) Object.assign(world, { layout: createLayout({ edge, grid }), sizeRule: true, power: null, beams: [], beamResults: [], feedCredit: new Map(), blasts: [], fittings: [], ship: null });
  return world;
}

const tierScaled = (world, p) => p.value * (world.edge / BASE_EDGE) ** p.k;
const param = (world, path) => {
  const [g, n] = path.split('.');
  return world.params[g][n];
};
/** Fraction of its draw a consumer receives: routed in a cluster with power routing (#193), else 1 (L1). */
const supply = (world, room) => (world.power ? room.powerFraction : 1);

/**
 * Add a room. In a cluster, `cell` ([x, y]) and `rotation` (0 or 90) place
 * it on the grid and its position is its centre; without `cell` it stands
 * alone at `position` (m), a cluster of one.
 */
export function addRoom(world, type, { id = `${type}-${world.rooms.length}`, size = 'M', position = [0, 0], temperature: T0 = FIXED.restTemperature.value, cell = null, rotation = 0 } = {}) {
  const def = ROOMS[type];
  if (!def) throw new Error(`unknown room type ${type}`);
  const fp = def.footprint[size];
  if (!fp || typeof fp[1] !== 'number') throw new Error(`${type} has no buildable size ${size}`);
  if (world.rooms.some((r) => r.id === id)) throw new Error(`room id ${id} is taken`);
  const n = fp[0] * fp[1];
  if (cell) {
    if (!world.layout) throw new Error(`${id}: a cell position needs a cluster (createWorld with a grid)`);
    placeRoom(world.layout, id, fp, cell, rotation, type);
    position = roomCentre(world.layout, id);
  }
  const sizeLinear = FIXED.sizeLinear.value[size];
  const C = n * tierScaled(world, world.params.thermal.heatCapacityPerCell) * (def.capacityFactor ? param(world, def.capacityFactor).value : 1); // heat sink x capacityFactor (#198)
  const cls = def.thermalClass, th = world.params.thermal;
  const room = {
    id, type, size, def, position,
    footprintFactor: sizeLinear * sizeLinear, // rate-like constants: L = 9/4 of M (#183)
    cells: Array.from({ length: n }, () => ({ integrity: 1, destroyed: false })),
    thresholds: { hot: th[`${cls}Hot`].value, overheated: th[`${cls}Overheated`].value, critical: th[`${cls}Critical`].value },
    heat: createHeat(C, T0),
    radiators: 0,
    externalPower: 0, // W from outside the room (a test source; conduction is L2)
    active: true, // switched on; a room switched off has no function and no own heat
    powered: true, controlled: true, shutdown: false, exploded: false,
    crewTotal: 0, crew: 0,
  };
  // Size rule (#185 (4), #187 (4)): per-cell quantities scale with the cell
  // count, L = 9/4 of M. Only in a cluster: a room alone keeps L1's values.
  room.cellRatio = world.sizeRule ? n / (def.footprint.M[0] * def.footprint.M[1]) : 1;
  if (world.layout) {
    Object.assign(room.heat, { conducted: 0, pumped: 0, vented: 0 });
    room.placed = !!cell;
    // Wall factors (#200, #201): a coolant room's factor on coolant walls, every room's factor on passive walls.
    room.coolantFactor = def.coolantFactor ? param(world, def.coolantFactor).value : 1;
    room.passiveFactor = def.passiveFactor ? param(world, def.passiveFactor).value : 1;
    room.blastFactor = def.blastFactor ? param(world, def.blastFactor).value : 1;
    room.powerFraction = 0;
  }
  if (def.crew === 'housed') room.crewPerCell = Math.round(tierScaled(world, world.params.quarters.crewPerCell));
  if (def.crew === 'housed') room.crewTotal = room.crewPerCell * n;
  else if (def.crew && world.sizeRule) room.crewTotal = Math.round(tierScaled(world, param(world, def.crew)) * room.cellRatio); // crew rounded (#185 (5))
  else if (def.crew) room.crewTotal = Math.round(tierScaled(world, param(world, def.crew)));
  room.crew = room.crewTotal;
  INIT[type]?.(world, room);
  world.rooms.push(room);
  if (cell) for (const r of world.rooms) if (r.placed && r.radiators > openEdges(world.layout, r.id)) throw new Error(`${r.id}: ${id} covers an open edge that carries a radiator`);
  return room;
}

// ---------- shared state ----------
// A cell is destroyed when its integrity reaches 0 and stays destroyed for the
// rest of the battle: repair restores damaged cells only (#206, DESIGN.md
// 13e.1; replaces #190 (1)).
export const survivingCells = (room) => room.cells.filter((c) => !c.destroyed).length;
export const survivingFraction = (room) => survivingCells(room) / room.cells.length;
/** Cells destroyed now (#189 (1)); a destroyed cell is never repaired in battle (#206). */
export const destroyedCells = (room) => room.cells.length - survivingCells(room);
export const isDestroyed = (room) => room.exploded || survivingCells(room) === 0;
export const roomTemperature = (room) => temperature(room.heat);
/** IR brightness of the room's radiators (W), the same number they radiate (#102, #143). */
export function irBrightness(world, room) {
  return radiatorPower(temperature(room.heat), room.radiators, tierScaled(world, world.params.radiator.area), FIXED.radiatorEmissivity.value, FIXED.stefanBoltzmann.value);
}

function event(world, room, type, cause, extra = {}) {
  return emit(world.log, { t: world.t, type, room: room.id, cause, crew: room.crew, ...extra });
}
function killCrew(world, room, deaths, cause) {
  deaths = Math.min(deaths, room.crew);
  if (deaths <= 0) return;
  room.crew -= deaths;
  event(world, room, 'crew-died', cause, { deaths });
}

/** Radiators on the room's hull segments; in a cluster at most one per open edge (#15, #192). */
export function setRadiators(room, n, world = null) {
  if (n > 0 && room.def.placement === 'inside' && !room.def.fittings) throw new Error(`${room.type} is placed inside: no hull segment for a radiator (L2 reaches it through walls)`);
  if (world && world.layout && room.placed && n > openEdges(world.layout, room.id)) throw new Error(`${room.id}: ${n} radiators but only ${openEdges(world.layout, room.id)} open edges (one radiator per open edge, #15)`);
  room.radiators = n;
}
export function setPower(world, room, on) {
  room.powered = on;
}
export function setActive(world, room, on) {
  room.active = on;
}
/** Control from the bridge (control paths are L3). Losing it SCRAMs a reactor (#81). */
export function setControl(world, room, on, cause) {
  room.controlled = on;
  if (!on && room.type === 'reactor') scram(world, room, cause);
}

/**
 * Damage a cell: integrity drops by `loss` (a round passing: 1 /
 * kinetic.hitsToWreck, #206; a blast: absorbed / resistance, #182). A cell
 * left with integrity above 0 is damaged ('cell-damaged'); reaching 0
 * destroys it and the room reacts (breach, detonation, control lost). Crew
 * die in proportion to the integrity the room has lost (#206).
 */
export function damageCell(world, room, index, loss, cause, channel) {
  const cell = room.cells[index];
  if (cell.destroyed || room.exploded) return;
  // A float residue of 1e-12 or less counts as 0, so hitsToWreck hits of
  // 1 / hitsToWreck wreck a cell (1 - 3 x (1/3) leaves 5.6e-17 in floats).
  const left = cell.integrity - loss;
  cell.integrity = left > 1e-12 ? left : 0;
  if (cell.integrity > 0) {
    event(world, room, 'cell-damaged', cause, { channel, cell: index, integrity: cell.integrity });
    killByIntegrity(world, room, cause);
    return;
  }
  cell.destroyed = true;
  event(world, room, 'cell-destroyed', cause, { channel, cell: index });
  killByIntegrity(world, room, cause);
  ON_CELL_DESTROYED[room.type]?.(world, room, cause);
  if (world.ship) { rebalance(world, cause); updateControl(world, cause); } // debris, fragments, control (13f.1)
}
/**
 * Crew die in proportion to the integrity lost (#206, 13e.1): the room's
 * cumulative deaths by damage are floor(crew x (cells - sum of integrity) /
 * cells), never more than its crew. Repair brings nobody back, so the count
 * only rises. A quotient within 1e-9 of a whole number counts as that number
 * (three losses of 1/3 sum to 0.9999999999999991 in floats). With whole
 * cells destroyed this is L1's floor(k crew / N) (#185 (5)).
 */
function killByIntegrity(world, room, cause) {
  const N = room.cells.length, lost = N - room.cells.reduce((x, c) => x + c.integrity, 0);
  const share = (room.crewTotal * lost) / N, whole = Math.round(share);
  const due = Math.min(room.crewTotal, Math.abs(share - whole) <= 1e-9 * Math.max(1, share) ? whole : Math.floor(share));
  const before = room.damageDeaths || 0;
  if (due <= before) return;
  room.damageDeaths = due;
  killCrew(world, room, due - before, cause); // never more than are aboard
}
/**
 * A kinetic round { mass, velocity, area } along `path`, the room cells it
 * meets in order ([{ room, cell }]) (#137, #206, 13e.1). Kinetic damage stays
 * momentum: each cell resists room.kineticResistance of sectional momentum
 * (L0's penetrate); a destroyed cell is a hole and resists nothing (#212 (5),
 * 13f.1); a cell the round passes loses 1 / kinetic.hitsToWreck of its
 * integrity, the cell it stops in (sectional momentum left / R) /
 * hitsToWreck, a hole nothing. Returns the penetration and the loss applied
 * to each cell reached.
 */
export function fireRound(world, { mass, velocity, area }, path, cause) {
  const R = tierScaled(world, world.params.room.kineticResistance), hits = world.params.kinetic.hitsToWreck.value;
  const s0 = sectionalMomentum(mass, velocity, area);
  const hole = path.map((x) => x.room.cells[x.cell].destroyed);
  const res = penetrate(s0, path.map((x, i) => (hole[i] ? 0 : R)));
  const losses = res.absorbed.map((a, i) => (hole[i] ? 0 : (i < res.passed ? 1 : a / R) / hits));
  losses.forEach((loss, i) => damageCell(world, path[i].room, path[i].cell, loss, cause, 'kinetic'));
  return { s0, R, passed: res.passed, stoppedIn: res.stoppedIn, residual: res.residual, absorbed: res.absorbed, losses };
}
export const destroyCell = (world, room, index, cause, channel = 'kinetic') => damageCell(world, room, index, 1, cause, channel);

// ---------- stepping ----------
/**
 * One simulation step for every room, then thresholds and timers at the new
 * time. In a cluster, conduction, power routing, shield payments and repair
 * grants are computed first, all from the state at the start of the step;
 * the ammunition feed of the step is delivered at its end.
 */
export function step(world) {
  const dt = world.dt;
  const conducted = world.layout ? conduction(world) : null;
  if (world.layout && world.power) routePower(world);
  const pumped = world.layout ? lifeSupport(world) : null; // after routing: a room's power this step decides it
  if (world.layout && world.beams.length) shieldPayments(world);
  repairGrants(world);
  for (const room of world.rooms) {
    const own = room.exploded || !room.active ? 0 : (BEHAVIOUR[room.type]?.(world, room) || 0) + (room.rcs ? rcsHeat(world, room) : 0);
    const external = room.externalPower * dt;
    if (conducted) heatStep(room.heat, own + external, irBrightness(world, room), dt, conducted.get(room) || 0, pumped.get(room) || 0);
    else heatStep(room.heat, own + external, irBrightness(world, room), dt);
  }
  if (world.layout) feedTurrets(world);
  if (world.ship) shipStep(world);
  world.step++;
  world.t = world.step * dt;
  // A state reached during the step is reported at its end, like the thresholds.
  for (const r of world.repaired) event(world, r.room, 'cell-repaired', r.cause, { cell: r.cell });
  world.repaired = [];
  for (const room of world.rooms) {
    for (const x of crossings(room.heat, room.thresholds)) onThreshold(world, room, x);
    TIMERS[room.type]?.(world, room);
  }
  if (world.ship) updateControl(world, 'control-loss'); // a bridge that stopped giving control this step (13f.1)
}

/** Step until world.t reaches `time` (s); `before(world)` runs before each step. */
export function runUntil(world, time, before) {
  const target = stepsAtLeast(time, world.dt);
  while (world.step < target) {
    if (before) before(world);
    step(world);
  }
}

function onThreshold(world, room, x) {
  if (x === 'cooled') {
    if (room.shutdown) { room.shutdown = false; event(world, room, 'restart', 'heat'); }
    return;
  }
  event(world, room, x, 'heat');
  if (x === 'overheated' && !room.shutdown && !room.exploded) {
    room.shutdown = true;
    event(world, room, 'shutdown', 'heat');
    ON_SHUTDOWN[room.type]?.(world, room);
  }
  if (x === 'critical' && !room.exploded) { // an exploded room never explodes or melts down again (#189 (4))
    killCrew(world, room, room.crew, 'heat'); // #18b
    ON_CRITICAL[room.type]?.(world, room);
  }
}

function explode(world, room, energy, cause) {
  const before = survivingCells(room);
  room.exploded = true;
  for (const c of room.cells) { c.integrity = 0; c.destroyed = true; }
  event(world, room, 'explosion', cause, { energy, channel: 'blast' });
  killCrew(world, room, room.crew, cause);
  if (world.layout && room.placed) blastThroughWalls(world, room, energy, before);
  if (world.ship) { rebalance(world, cause); updateControl(world, cause); }
}

// ---------- reactor (#81, #183) ----------
function reactorPower(world, room) {
  return tierScaled(world, world.params.reactor.power) * room.footprintFactor;
}
function reactorAble(room) {
  return room.controlled && !room.shutdown && !room.reactor.scrammed && !isDestroyed(room);
}
/** Demand d in [0, 1] of the reactor's power; delivered on demand. */
export function setDemand(world, room, d) {
  room.reactor.demand = d;
  room.reactor.delivered = reactorAble(room) ? d * reactorPower(world, room) * survivingFraction(room) : 0;
}
/** Decay heat begins: f x thermal power at the stop, decaying with tau (#81). */
function startDecay(world, room) {
  const r = room.reactor, p = world.params.reactor;
  const P0 = p.decayFraction.value * p.heatPerPower.value * r.delivered;
  r.delivered = 0;
  if (P0 > 0) r.decay.push({ start: world.t, P0 });
  return P0 * p.decayTime.value;
}
function scram(world, room, cause) {
  const r = room.reactor;
  if (r.scrammed || room.exploded) return;
  r.scrammed = true;
  const energy = room.shutdown ? 0 : startDecay(world, room);
  event(world, room, 'scram', cause, { energy });
}
function explosionEnergy(world, room) {
  // Size rule only in a cluster (L1.reactor.breach locks 200 MJ for an L reactor alone).
  if (world.sizeRule) return tierScaled(world, world.params.reactor.explosionEnergy) * room.cellRatio;
  return tierScaled(world, world.params.reactor.explosionEnergy);
}
const INIT = {
  reactor(world, room) {
    room.reactor = { demand: 0, delivered: 0, routed: 0, scrammed: false, decay: [], decayHeat: 0, energyDelivered: 0, breachStep: null, breachCause: null };
  },
  magazine(world, room) {
    room.magazine = { size: 'M', ap: 0, he: 0 };
  },
  turret(world, room) {
    // hold: the gun holds its fire (L3: a ship's turret fires only when told); aim: its firing direction in the ship's frame.
    room.turret = { ammo: 0, shots: 0, impulse: 0, energyDrawn: 0, ceased: false, anchor: 0, sinceAnchor: 0, lastShot: null, hold: false, aim: [0, 1] };
  },
  shieldGenerator(world, room) {
    room.shield = { on: true, incoming: 0, strength: 1, absorbed: 0, passed: 0, em: 0, absorbedEnergy: 0, passedEnergy: 0, energyDrawn: 0, down: false, buffer: null, paid: 0, impulseHeat: 0 };
  },
  engine(world, room) {
    room.engine = { throttle: 0, thrust: 0, draw: 0, acceleration: 0 };
  },
  quarters(world, room) {
    room.quarters = { energyDrawn: 0, grants: [], budget: 0, paid: 0 };
  },
  bridge(world, room) {
    room.bridge = { control: true, fromBackup: 0, fromReactor: 0 };
  },
  beamBay(world, room) {
    room.beamBay = { firing: false, beam: 0, draw: 0, stopped: false, beamEnergy: 0, energyDrawn: 0 };
  },
};

const BEHAVIOUR = {
  reactor(world, room) {
    const r = room.reactor, dt = world.dt, tau = world.params.reactor.decayTime.value;
    // Decay heat integrated exactly over the step (the source is known in closed form).
    let decay = 0;
    for (const d of r.decay) decay += d.P0 * tau * (Math.exp(-(world.t - d.start) / tau) - Math.exp(-(world.t + dt - d.start) / tau));
    r.decayHeat += decay;
    if (world.power) r.delivered = reactorAble(room) ? r.routed : 0; // a reactor delivers only what is routed (#193)
    else r.delivered = reactorAble(room) ? r.demand * reactorPower(world, room) * survivingFraction(room) : 0;
    r.energyDelivered += r.delivered * dt;
    return decay + world.params.reactor.heatPerPower.value * r.delivered * dt;
  },
  turret(world, room) {
    const s = room.turret, dt = world.dt, p = world.params;
    const able = room.powered && room.controlled && !room.shutdown && !isDestroyed(room) && s.ammo > 0;
    if (!able) {
      if (!s.ceased) {
        s.ceased = true;
        const cause = s.ammo <= 0 ? 'dry' : !room.powered ? 'no-power' : room.shutdown ? 'heat' : !room.controlled ? 'no-control' : 'destroyed';
        event(world, room, 'cease-fire', cause);
      }
      return 0;
    }
    if (s.hold) { // holding fire: ready to fire, drawing its power (#185 (6)), no shot
      if (!s.ceased) { s.ceased = true; event(world, room, 'cease-fire', 'hold'); }
      s.energyDrawn += tierScaled(world, p.turret.powerDraw) * room.footprintFactor * survivingFraction(room) * supply(world, room) * dt;
      return 0;
    }
    // Shots on accumulated time (#189 (5)): since the turret last became able
    // to fire (at s.anchor), shot k is due at anchor + k / rate, so the step
    // remainder carries over and 1 + floor(rate t) holds at any rate. A shot
    // is fired in the step that contains its due time, at that time.
    // Fire rate: L1, x 1 / sizeLinear in a cluster (size rule), x the power fraction (#193).
    const rate = world.sizeRule ? (tierScaled(world, p.turret.fireRate) / FIXED.sizeLinear.value[room.size]) * supply(world, room) : tierScaled(world, p.turret.fireRate);
    // Able again (fed, powered): the next shot is due now, but never sooner than 1 / rate after the last one.
    if (s.ceased) { s.ceased = false; s.anchor = s.lastShot === null ? world.t : Math.max(world.t, s.lastShot + 1 / rate); s.sinceAnchor = 0; }
    const due = s.anchor + s.sinceAnchor / rate;
    let heat = 0, until = dt; // the part of this step during which a round is left
    if (world.step >= stepContaining(due, dt)) {
      // Offset of the shot within the step: 0 on a step boundary or when late.
      const at = world.step === stepContaining(due, dt) && !onStep(due, dt) ? Math.min(dt, Math.max(0, due - world.t)) : 0;
      const m = tierScaled(world, p.kinetic.roundMass) * FIXED.sizeLinear.value[room.size] ** 3;
      const v = tierScaled(world, p.kinetic.muzzleVelocity);
      s.ammo--;
      s.shots++;
      s.sinceAnchor++;
      s.impulse += m * v; // recoil (Newton 3)
      if (world.ship) recoil(world, room, m, v); // on the ship's body (13f.1)
      s.lastShot = world.t + at;
      heat += world.sizeRule ? tierScaled(world, p.turret.heatPerShot) * FIXED.sizeLinear.value[room.size] ** 3 : tierScaled(world, p.turret.heatPerShot);
      event(world, room, 'shot', `${room.id}:shot-${s.shots}`, { t: world.t + at, energy: 0.5 * m * v * v, channel: 'kinetic' });
      if (s.ammo <= 0) {
        until = at;
        s.ceased = true;
        event(world, room, 'cease-fire', 'dry', { t: world.t + at });
      }
    }
    if (until > 0) s.energyDrawn += tierScaled(world, p.turret.powerDraw) * room.footprintFactor * survivingFraction(room) * supply(world, room) * until;
    return heat;
  },
  shieldGenerator(world, room) {
    const s = room.shield, dt = world.dt, p = world.params.shield;
    const able = s.on && room.powered && room.controlled && !room.shutdown && !isDestroyed(room);
    if (!able) {
      if (!s.down) { s.down = true; event(world, room, 'shield-down', !s.on ? 'off' : !room.powered ? 'no-power' : room.shutdown ? 'heat' : !room.controlled ? 'no-control' : 'destroyed'); }
      s.absorbed = 0; s.em = 0; s.passed = s.incoming;
      s.passedEnergy += s.incoming * dt;
      return 0;
    }
    s.down = false;
    const f = room.footprintFactor * survivingFraction(room) * supply(world, room);
    const budget = tierScaled(world, p.budget) * f, draw = tierScaled(world, p.powerDraw) * f;
    const impulse = s.impulseHeat; // energy of rounds stopped since the last step (L0), now heat
    s.impulseHeat = 0;
    if (world.layout && world.beams.length) {
      // Beams at points (13d.1): this generator pays what shieldPayments granted, never more than its budget (#170).
      s.absorbed = s.paid; s.passed = 0; s.em = s.absorbed;
      s.absorbedEnergy += s.paid * dt; s.energyDrawn += draw * dt;
      refillBuffer(world, room, budget, s.paid);
      return draw * dt + s.paid * dt + impulse;
    }
    const r = absorbBeamStep(s.incoming, dt, budget, s.strength);
    s.absorbed = r.absorbed / dt; s.passed = r.passed / dt; s.em = s.absorbed; // EM-bright while absorbing
    s.absorbedEnergy += r.absorbed; s.passedEnergy += r.passed; s.energyDrawn += draw * dt;
    refillBuffer(world, room, budget, s.absorbed);
    return draw * dt + r.heat + impulse;
  },
  engine(world, room) {
    const e = room.engine, p = world.params.engine;
    const able = room.powered && room.controlled && !room.shutdown && !isDestroyed(room);
    const f = able ? e.throttle * room.footprintFactor * survivingFraction(room) * supply(world, room) : 0;
    e.thrust = f * tierScaled(world, p.thrust);
    e.draw = f * tierScaled(world, p.powerDraw);
    e.acceleration = world.shipMass ? e.thrust / world.shipMass : 0;
    return e.draw * p.heatFraction.value * world.dt;
  },
  quarters(world, room) {
    const q = room.quarters, dt = world.dt, p = world.params;
    if (!room.powered || room.shutdown || isDestroyed(room)) return 0;
    // Repair field (#51, #99): the grants repairGrants computed at the start of the step.
    for (const { room: other, cell: i, rate } of q.grants) {
      const c = other.cells[i];
      if (c.destroyed || c.integrity >= 1 || rate <= 0) continue; // damaged cells only (#206)
      c.integrity = Math.min(1, c.integrity + rate * dt);
      if (c.integrity >= 1) world.repaired.push({ room: other, cell: i, cause: room.id }); // reported at the end of the step
    }
    const draw = tierScaled(world, p.quarters.powerDraw) * survivingFraction(room) * supply(world, room);
    q.energyDrawn += draw * dt;
    return draw * dt;
  },
  bridge(world, room) {
    const b = room.bridge;
    if (room.shutdown || isDestroyed(room)) return 0;
    const draw = tierScaled(world, world.params.bridge.powerDraw) * survivingFraction(room) * world.dt;
    if (room.powered) b.fromReactor += draw; else b.fromBackup += draw; // backup has no limit (#147)
    return draw;
  },
  beamBay(world, room) {
    const s = room.beamBay, dt = world.dt, p = world.params;
    const able = s.firing && room.powered && room.controlled && !room.shutdown && !isDestroyed(room);
    if (!able) {
      if (s.firing && !s.stopped) { s.stopped = true; event(world, room, 'beam-stopped', !room.powered ? 'no-power' : room.shutdown ? 'heat' : !room.controlled ? 'no-control' : 'destroyed'); }
      s.beam = 0; s.draw = 0;
      return 0;
    }
    s.stopped = false;
    s.beam = tierScaled(world, p.beam.power) * room.footprintFactor * survivingFraction(room) * supply(world, room);
    s.draw = s.beam / p.beambay.efficiency.value;
    s.beamEnergy += s.beam * dt; s.energyDrawn += s.draw * dt;
    return (s.draw - s.beam) * dt;
  },
};

const ON_SHUTDOWN = {
  reactor(world, room) {
    if (!room.reactor.scrammed) startDecay(world, room);
  },
};

const ON_CRITICAL = {
  reactor(world, room) {
    event(world, room, 'meltdown', 'heat');
    explode(world, room, explosionEnergy(world, room), 'heat');
  },
  magazine(world, room) {
    if (magazineContents(world, room).energy <= 0) return;
    event(world, room, 'cook-off', 'heat');
    detonate(world, room, 'heat');
  },
};

const ON_CELL_DESTROYED = {
  reactor(world, room, cause) {
    const r = room.reactor, p = world.params.reactor;
    if (survivingCells(room) === 0) { r.breachStep = null; explode(world, room, explosionEnergy(world, room), cause); return; }
    if (r.breachStep === null && destroyedCells(room) / room.cells.length >= p.breachFraction.value) {
      r.breachStep = world.step + stepsAtLeast(p.breachCountdown.value, world.dt);
      r.breachCause = cause;
      event(world, room, 'breach', cause);
    }
  },
  magazine(world, room, cause) {
    if (magazineContents(world, room).energy > 0) detonate(world, room, cause);
  },
  bridge(world, room, cause) {
    if (survivingCells(room) === 0 && room.bridge.control) { room.bridge.control = false; event(world, room, 'control-lost', cause); }
  },
  heatSink(world, room, cause) {
    // A destroyed cell vents its share of the heat above rest; the buffer shrinks, T is unchanged (#198).
    const energy = ventCell(room.heat, survivingCells(room) + 1, FIXED.restTemperature.value);
    event(world, room, 'heat-vented', cause, { energy });
  },
};

const TIMERS = {
  reactor(world, room) {
    const r = room.reactor;
    if (r.breachStep !== null && !room.exploded && world.step >= r.breachStep) explode(world, room, explosionEnergy(world, room), r.breachCause);
  },
  bridge(world, room) {
    // Control while any cell survives (#147: power cut does not matter). An
    // overheated or switched-off bridge gives no control (13c.1).
    const control = survivingCells(room) > 0 && !room.shutdown && room.active;
    if (room.bridge.control && !control) { room.bridge.control = false; event(world, room, 'control-lost', room.active ? 'overheat' : 'off'); }
    else if (!room.bridge.control && control) { room.bridge.control = true; event(world, room, 'control-restored', room.active && !room.bridge.wasOff ? 'restart' : 'on'); }
    room.bridge.wasOff = !room.active;
  },
};

// ---------- magazine (#91, #183) ----------
/** Ammunition mass the magazine holds (kg): L1's capacity, x the cell ratio in a cluster (size rule). */
export function magazineCapacity(world, room) {
  if (world.sizeRule) return tierScaled(world, world.params.magazine.capacity) * room.cellRatio;
  return tierScaled(world, world.params.magazine.capacity);
}
/** Load rounds of one size by mass (kg); counts are whole rounds. `order` is the loading order the feed takes them in. */
export function loadMagazine(world, room, { size = 'M', apMass = 0, heMass = 0, order = ['ap', 'he'] }) {
  const capacity = magazineCapacity(world, room);
  room.loadingOrder = order;
  if (apMass + heMass > capacity) throw new Error(`magazine holds at most ${capacity} kg`);
  const m = tierScaled(world, world.params.kinetic.roundMass) * FIXED.sizeLinear.value[size] ** 3;
  Object.assign(room.magazine, { size, ap: Math.floor(apMass / m), he: Math.floor(heMass / m) });
  return room.magazine;
}
/** Rounds aboard and the energy they release if they go off. */
export function magazineContents(world, room) {
  const g = room.magazine, s3 = FIXED.sizeLinear.value[g.size] ** 3, p = world.params;
  const charge = tierScaled(world, p.kinetic.chargeEnergy) * s3, warhead = tierScaled(world, p.he.blastEnergy) * s3;
  return { ap: g.ap, he: g.he, energy: g.ap * charge + g.he * (charge + warhead) };
}
function detonate(world, room, cause) {
  const { energy } = magazineContents(world, room);
  room.magazine.ap = 0;
  room.magazine.he = 0;
  explode(world, room, energy, cause);
}

// ---------- turret ----------
export function loadTurret(room, rounds) {
  room.turret.ammo = rounds;
}
/** Rounds a turret's ready store holds: turret.readyRounds rounds of its own size (#193, #195). */
export function readyStore(world, room) {
  return world.params.turret.readyRounds.value;
}

/** Set a magazine's contents off now with `cause` (L2.blast.walls; a cook-off and a hit take the same path). */
export function detonateMagazine(world, room, cause) {
  if (!room.exploded && magazineContents(world, room).energy > 0) detonate(world, room, cause);
}

// ---------- cluster (L2, DESIGN.md 13d.1) ----------
const roomById = (world, id) => world.rooms.find((r) => r.id === id);

const isCoolant = (room) => room.def.loop === 'coolant';
/**
 * Net heat (J) each room takes through live walls this step, from the
 * temperatures at its start (#193). A wall between two coolant rooms is a
 * coolant wall (conduction.wall, coolant factors); every other wall is
 * passive (conduction.passive, passive factors) (#200, #201).
 */
function conduction(world) {
  const coolant = tierScaled(world, world.params.conduction.wall), passive = tierScaled(world, world.params.conduction.passive);
  const walls = liveWalls(world).filter((w) => w.live > 0).map((w) => ({
    ra: w.a, rb: w.b, a: w.a.heat, b: w.b.heat,
    G: isCoolant(w.a) && isCoolant(w.b)
      ? wallConductance(coolant, w.live, w.a.coolantFactor, w.b.coolantFactor)
      : wallConductance(passive, w.live, w.a.passiveFactor, w.b.passiveFactor),
  }));
  const flows = conductionFlows(walls, world.dt);
  const net = new Map();
  walls.forEach((w, i) => {
    net.set(w.ra, (net.get(w.ra) || 0) - flows[i]);
    net.set(w.rb, (net.get(w.rb) || 0) + flows[i]);
  });
  return net;
}

/**
 * Life support (#201, 13d.1): each crewed room and magazine (ROOMS
 * lifeSupport) that is powered (the bridge always, on its backup, #147;
 * under power routing, joined to a reactor able to produce, #207),
 * has a surviving cell and is above FIXED.lifeSupportSetpoint pumps heat
 * into the coolant rooms sharing a live wall with it, split by live wall
 * length: min(lifeSupport.capacityPerCell x surviving cells x dt, the heat
 * above the setpoint at the start of the step), so the pump alone never
 * takes it below the setpoint within a step. A heat pump works against the
 * gradient. With no coolant neighbour it does nothing. Returns the net heat
 * (J) each room takes by it this step (Σ = 0).
 */
function lifeSupport(world) {
  const net = new Map(), setpoint = FIXED.lifeSupportSetpoint.value, perCell = tierScaled(world, world.params.lifeSupport.capacityPerCell);
  const walls = liveWalls(world).filter((w) => w.live > 0);
  const supplied = world.power ? suppliedRooms(world, walls) : null;
  for (const room of world.rooms) {
    if (!room.def.lifeSupport || !room.placed || room.exploded || isDestroyed(room)) continue;
    if (room.type !== 'bridge' && !(supplied ? supplied.has(room) : room.powered)) continue;
    const excess = room.heat.Q - room.heat.C * setpoint;
    if (!(excess > 0)) continue;
    const sinks = [];
    for (const w of walls) {
      const other = w.a === room ? w.b : w.b === room ? w.a : null;
      if (other && isCoolant(other)) sinks.push({ other, live: w.live });
    }
    if (!sinks.length) continue;
    const E = Math.min(perCell * survivingCells(room) * world.dt, excess);
    const total = sinks.reduce((x, k) => x + k.live, 0);
    for (const k of sinks) {
      const e = (E * k.live) / total;
      net.set(room, (net.get(room) || 0) - e);
      net.set(k.other, (net.get(k.other) || 0) + e);
    }
  }
  return net;
}

/** A reactor able to produce (#207): switched on, not shut down, SCRAMmed or destroyed, demand above 0. */
const producing = (room) => room.type === 'reactor' && room.placed && room.active && reactorAble(room) && room.reactor.demand > 0;
/**
 * Under power routing, the rooms joined through live walls (through any
 * rooms) to a reactor able to produce (#207): they count as powered for life
 * support whatever their own request, and draw nothing for it yet (#205 (3)).
 */
function suppliedRooms(world, walls) {
  const reached = new Set(world.rooms.filter(producing)), queue = [...reached];
  for (let i = 0; i < queue.length; i++) {
    for (const w of walls) {
      const other = w.a === queue[i] ? w.b : w.b === queue[i] ? w.a : null;
      if (other && !reached.has(other)) { reached.add(other); queue.push(other); }
    }
  }
  return reached;
}

/**
 * Route power for this step (#193): turn routing on with a priority list of
 * room ids (the power-priority order of #38; consumers not listed follow in
 * room-id order). From then on reactors deliver only what is routed and each
 * consumer works at the fraction of its draw it receives.
 */
export function enablePowerRouting(world, priority = []) {
  if (!world.layout) throw new Error('power routing needs a cluster (createWorld with a grid)');
  world.power = { priority };
}

/** The draw (W) a consumer asks for at the start of the step: its L1 draw in its current state. */
const REQUEST = {
  beamBay: (world, room) => (room.beamBay.firing ? (tierScaled(world, world.params.beam.power) * room.footprintFactor * survivingFraction(room)) / world.params.beambay.efficiency.value : 0),
  turret: (world, room) => (room.turret.ammo > 0 ? tierScaled(world, world.params.turret.powerDraw) * room.footprintFactor * survivingFraction(room) : 0),
  shieldGenerator: (world, room) => (room.shield.on ? tierScaled(world, world.params.shield.powerDraw) * room.footprintFactor * survivingFraction(room) : 0),
  engine: (world, room) => (room.controlled ? room.engine.throttle * room.footprintFactor * survivingFraction(room) * tierScaled(world, world.params.engine.powerDraw) : 0),
  quarters: (world, room) => tierScaled(world, world.params.quarters.powerDraw) * survivingFraction(room),
};
export function powerRequest(world, room) {
  if ((!REQUEST[room.type] && !room.rcs) || room.exploded || !room.active || room.shutdown || isDestroyed(room)) return 0;
  return (REQUEST[room.type] ? REQUEST[room.type](world, room) : 0) + (room.rcs ? rcsRequest(world, room) : 0); // an RCS fitting's draw joins its host's (13f.1)
}

function routePower(world) {
  const wall = tierScaled(world, world.params.power.wallCapacity);
  const edges = liveWalls(world).map((w) => ({ a: w.a.id, b: w.b.id, capacity: wall * w.live }));
  const placed = world.rooms.filter((r) => r.placed);
  const sources = placed.filter((r) => r.type === 'reactor').map((r) => ({ id: r.id, capacity: r.active && reactorAble(r) ? r.reactor.demand * reactorPower(world, r) * survivingFraction(r) : 0 }));
  const listed = world.power.priority;
  const rank = (r) => (listed.includes(r.id) ? listed.indexOf(r.id) : listed.length);
  const consumers = placed.filter((r) => REQUEST[r.type] || r.rcs).sort((a, b) => rank(a) - rank(b) || byId(a.id, b.id));
  const draws = new Map(consumers.map((r) => [r.id, powerRequest(world, r)]));
  const { delivered, produced } = priorityMaxFlow({ nodes: placed.map((r) => r.id), edges, sources, sinks: consumers.map((r) => ({ id: r.id, capacity: draws.get(r.id) })) });
  for (const r of consumers) {
    const d = draws.get(r.id), got = delivered.get(r.id);
    r.powerDelivered = got;
    r.powerFraction = d > 0 ? got / d : 0;
    r.powered = r.powerFraction > 0;
  }
  for (const r of placed) if (r.type === 'reactor') r.reactor.routed = produced.get(r.id);
  for (const r of world.rooms) if (r.type === 'bridge') r.powered = false; // runs on its backup supply (#147)
}

// ---------- shields in a cluster (#99, #170, 13d.1) ----------
/** Continuous beams at points this step: [{ id, position: [x, y] m, power: W }]. */
export function setBeams(world, beams) {
  if (!world.layout) throw new Error('beams at points need a cluster (createWorld with a grid)');
  world.beams = beams;
}
const shieldAble = (room) => room.type === 'shieldGenerator' && room.shield.on && room.powered && room.controlled && room.active && !room.shutdown && !isDestroyed(room);
const shieldBudget = (world, room) => tierScaled(world, world.params.shield.budget) * room.footprintFactor * survivingFraction(room) * supply(world, room);
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const fieldAt = (world, room, point) => shieldStrength(distance(room.position, point), tierScaled(world, world.params.shield.radius), FIXED.shieldFalloffExponent.value);

/**
 * Shield overlap without double counting (#170, 13d.1): a beam at point j
 * asks generator i for a_ij = P_j B_i g_ij / sum_k B_k g_kj, capped so that
 * sum_i a_ij <= min(P_j, sum_i B_i g_ij); a generator whose asks exceed its
 * budget scales every ask to it by B_i / sum_j a_ij; each point absorbs what
 * it was granted, with no second round in the step.
 */
function shieldPayments(world) {
  const gens = world.rooms.filter(shieldAble);
  const B = gens.map((g) => shieldBudget(world, g));
  const asks = world.beams.map((beam) => {
    const bg = gens.map((g, i) => B[i] * fieldAt(world, g, beam.position));
    const total = bg.reduce((x, y) => x + y, 0);
    if (!(total > 0)) return bg.map(() => 0);
    const a = bg.map((x) => (beam.power * x) / total);
    const sum = a.reduce((x, y) => x + y, 0), cap = Math.min(beam.power, total);
    return sum > cap ? a.map((x) => (x * cap) / sum) : a;
  });
  const scale = gens.map((g, i) => {
    const sum = asks.reduce((x, a) => x + a[i], 0);
    return sum > B[i] ? B[i] / sum : 1;
  });
  for (const g of world.rooms) if (g.type === 'shieldGenerator') g.shield.paid = 0;
  world.beamResults = world.beams.map((beam, j) => {
    const granted = asks[j].map((x, i) => x * scale[i]);
    granted.forEach((x, i) => { gens[i].shield.paid += x; });
    const absorbed = granted.reduce((x, y) => x + y, 0);
    return { id: beam.id, power: beam.power, absorbed, passed: beam.power - absorbed, paidBy: Object.fromEntries(gens.map((g, i) => [g.id, granted[i]])) };
  });
}

/** The impulse buffer refills at the budget continuous beams leave unused (13d.1, E4). */
function refillBuffer(world, room, budget, absorbedRate) {
  const s = room.shield, cap = budget * world.params.shield.bufferSeconds.value;
  if (s.buffer === null) s.buffer = cap;
  s.buffer = Math.min(cap, s.buffer + Math.max(0, budget - absorbedRate) * world.dt);
}
/** The generator's impulse buffer (J); full until first used. */
export function shieldBuffer(world, room) {
  return room.shield.buffer === null ? shieldBudget(world, room) * world.params.shield.bufferSeconds.value : room.shield.buffer;
}

/**
 * A kinetic round { position, mass, velocity, area } through the field
 * between steps (L0's stopRound): the generator stops up to kineticStop x
 * g(r) of its sectional momentum, paying the energy from its buffer; once
 * the buffer is empty rounds pass unstopped. The energy becomes the
 * generator's heat in its next step. Returns the round after the field.
 */
export function shieldRound(world, round) {
  const gens = world.rooms.filter(shieldAble);
  if (gens.length === 0) return { velocity: round.velocity, energy: 0, by: null };
  if (gens.length > 1) throw new Error('a round in overlapping fields: how the buffers share it is a question for the designer (L2 pull request)');
  const g = gens[0], s = g.shield;
  s.buffer = shieldBuffer(world, g);
  const r = stopRound(round, tierScaled(world, world.params.shield.kineticStop), fieldAt(world, g, round.position), s.buffer);
  s.buffer -= r.energy;
  s.impulseHeat += r.heat;
  return { velocity: r.velocity, energy: r.energy, by: g.id };
}

// ---------- repair sharing (#99, #185 (6), 13d.1) ----------
/**
 * Each quarters' budget R = repair.rate x surviving fraction (x its power
 * fraction); a damaged cell j in range (0 < integrity < 1: a destroyed cell
 * waits for the drydock, #206) asks q_j = R g(r_j); if the asks
 * exceed R, each is scaled by R / sum q_j. Computed at the start of the step.
 */
function repairGrants(world) {
  const p = world.params, radius = tierScaled(world, p.repair.radius);
  for (const room of world.rooms) {
    if (room.type !== 'quarters') continue;
    const q = room.quarters;
    q.grants = []; q.budget = 0; q.paid = 0;
    if (room.exploded || !room.active || !room.powered || room.shutdown || isDestroyed(room)) continue;
    const base = world.power ? p.repair.rate.value * survivingFraction(room) * supply(world, room) : p.repair.rate.value * survivingFraction(room);
    for (const other of world.rooms) {
      if (other === room || other.exploded) continue;
      const r = Math.hypot(other.position[0] - room.position[0], other.position[1] - room.position[1]);
      const rate = base * shieldStrength(r, radius, FIXED.repairFalloffExponent.value);
      other.cells.forEach((c, i) => { if (!c.destroyed && c.integrity < 1 && rate > 0) q.grants.push({ room: other, cell: i, rate }); });
    }
    const sum = q.grants.reduce((x, g) => x + g.rate, 0);
    if (sum > base) for (const g of q.grants) g.rate *= base / sum;
    q.budget = base;
    q.paid = q.grants.reduce((x, g) => x + g.rate, 0);
  }
}

// ---------- ammunition feed (#18, #193) ----------
function feedTurrets(world) {
  const p = world.params;
  feedAmmo(world, {
    feedPerMetre: tierScaled(world, p.ammo.wallFeed),
    store: (room) => (room.type === 'turret' && !room.exploded && !isDestroyed(room)
      ? { capacity: readyStore(world, room), rounds: room.turret.ammo, roundMass: tierScaled(world, p.kinetic.roundMass) * FIXED.sizeLinear.value[room.size] ** 3, size: room.size }
      : null),
    has: (mag) => mag.magazine.ap + mag.magazine.he > 0,
    take: (mag) => {
      for (const kind of mag.loadingOrder || ['ap', 'he']) if (mag.magazine[kind] > 0) { mag.magazine[kind]--; return true; }
      return false;
    },
    give: (room) => { room.turret.ammo++; room.turret.fed = (room.turret.fed || 0) + 1; if (world.ship) world.ship.moved = true; },
  });
  if (world.ship && world.ship.moved) { world.ship.moved = false; moveInside(world); }
}

// ---------- blast between rooms (#141, #169, 13d.1) ----------
/**
 * An internal explosion of energy E fills its own room up to its blast
 * capacity B = surviving cells (before it) x room.blastResistance; the
 * excess passes to the unsaturated rooms sharing a wall with the saturated
 * ones, split by shared wall length (every edge: a hole lets blast
 * through), each filling up to its capacity (x hold.blastFactor for a
 * hold) and passing its own excess on, as a wave front (#169); what no room
 * can take escapes to space. Within a room the energy spreads evenly over
 * its surviving cells; a cell is destroyed when its share reaches its
 * resistance. Recorded in world.blasts: absorbed per room and escaped.
 */
function blastThroughWalls(world, origin, E, survivorsBefore) {
  const R = tierScaled(world, world.params.room.blastResistance);
  const rooms = world.rooms.filter((r) => r.placed).sort((a, b) => byId(a.id, b.id));
  const cap = new Map(rooms.map((r) => [r, (r === origin ? survivorsBefore : survivingCells(r)) * R * r.blastFactor]));
  const survivors = new Map(rooms.map((r) => [r, survivingCells(r)]));
  const absorbed = new Map(rooms.map((r) => [r, 0])), full = new Set(), reached = new Set();
  const take = (r, e) => {
    reached.add(r);
    const room = cap.get(r) - absorbed.get(r);
    if (e >= room) { absorbed.set(r, cap.get(r)); full.add(r); return e - room; }
    absorbed.set(r, absorbed.get(r) + e);
    return 0;
  };
  const walls = sharedWalls(world.layout).map((w) => ({ a: roomById(world, w.a), b: roomById(world, w.b), length: w.length }));
  let excess = take(origin, E);
  while (excess > 0) {
    const weight = new Map();
    for (const w of walls) for (const [x, y] of [[w.a, w.b], [w.b, w.a]]) if (full.has(x) && !full.has(y)) weight.set(y, (weight.get(y) || 0) + w.length);
    if (weight.size === 0) break;
    let total = 0;
    for (const v of weight.values()) total += v;
    let left = 0;
    for (const r of rooms) if (weight.has(r)) left += take(r, (excess * weight.get(r)) / total);
    excess = left;
  }
  const cause = `explosion:${origin.id}`;
  world.blasts.push({ room: origin.id, energy: E, escaped: excess, cause, absorbed: Object.fromEntries(rooms.filter((r) => reached.has(r)).map((r) => [r.id, absorbed.get(r)])), capacity: Object.fromEntries(rooms.map((r) => [r.id, cap.get(r)])) });
  for (const r of rooms) {
    if (r === origin || !(absorbed.get(r) > 0) || survivors.get(r) === 0) continue;
    const loss = full.has(r) ? 1 : absorbed.get(r) / cap.get(r); // share / per-cell resistance
    r.cells.forEach((c, i) => { if (!c.destroyed) damageCell(world, r, i, loss, cause, 'blast'); });
  }
}

// ---------- the ship (L3, DESIGN.md 13f.1, #208) ----------
/**
 * A fitting on an open edge of a placed room (#15, 13f.1): `cell` [x, y] is
 * one of the room's grid cells and `side` [dx, dy] the outward direction of
 * the edge. 'radiator' adds a panel to its room; 'rcs' a thruster that
 * pushes along the edge's inward normal at its midpoint. Each adds its mass
 * (radiator.mass, rcs.mass) at that midpoint. Throws on a rule of
 * validation (layout.fittingProblem).
 */
export function addFitting(world, type, roomId, cell, side) {
  if (!world.layout) throw new Error('a fitting needs a cluster (createWorld with a grid)');
  if (type !== 'radiator' && type !== 'rcs') throw new Error(`unknown fitting ${type}`);
  const problem = fittingProblem(world.layout, ROOMS, { room: roomId, cell, side }, world.fittings);
  if (problem) throw new Error(`${problem.rule}: ${problem.detail}`);
  const room = roomById(world, roomId), grid = world.layout.rooms.get(roomId).cells;
  const k = grid.findIndex((c) => c[0] === cell[0] && c[1] === cell[1]);
  const mass = tierScaled(world, type === 'radiator' ? world.params.radiator.mass : world.params.rcs.mass);
  const f = { id: world.fittings.length, type, room: roomId, k, cell: [...cell], side: [...side], p: edgeMidpoint(world.edge, cell, side), mass, fired: false };
  world.fittings.push(f);
  if (type === 'radiator') room.radiators++;
  else room.rcs = true;
  return f;
}
/** Fire (or stop) RCS fittings by id. */
export function setRcs(world, ids, on) {
  for (const id of ids) {
    const f = world.fittings[id];
    if (!f || f.type !== 'rcs') throw new Error(`no RCS fitting ${id}`);
    f.fired = on;
  }
}
/** The room and cell index at grid cell [x, y] (a scenario's input). */
export function cellAt(world, [x, y]) {
  const o = world.layout.occupied.get(`${x},${y}`);
  return o ? { room: roomById(world, o.id), index: o.k } : null;
}

const roundMassOf = (world, size) => tierScaled(world, world.params.kinetic.roundMass) * FIXED.sizeLinear.value[size] ** 3;
/** Mass (kg) of what a room holds: a magazine's rounds, a turret's ready store (13f.1). */
export function contentsMass(world, room) {
  if (room.type === 'magazine') return (room.magazine.ap + room.magazine.he) * roundMassOf(world, room.magazine.size);
  if (room.type === 'turret') return room.turret.ammo * roundMassOf(world, room.size);
  return 0;
}
/**
 * Every mass of the ship (13f.1): surviving cells (C / thermal.specificHeat,
 * a heat sink cell plus the water of its extra capacity) as squares at their
 * centres, contents at their room's centre, fittings on surviving cells at
 * their edge's midpoint; each with the body it belongs to.
 */
function shipItems(world) {
  const p = world.params, e = world.edge, C = tierScaled(world, p.thermal.heatCapacityPerCell), m0 = C / p.thermal.specificHeat.value;
  const items = new Map();
  for (const room of world.rooms) {
    if (!room.placed) continue;
    const m = m0 + (room.def.capacityFactor ? ((param(world, room.def.capacityFactor).value - 1) * C) / FIXED.waterSpecificHeat.value : 0);
    const grid = world.layout.rooms.get(room.id).cells;
    room.cells.forEach((c, k) => { if (!c.destroyed) items.set(`${room.id}:${k}`, { m, p: [(grid[k][0] + 0.5) * e, (grid[k][1] + 0.5) * e], a: e, body: c.fragment }); });
    const cm = contentsMass(world, room);
    if (cm > 0 && !isDestroyed(room)) items.set(`${room.id}:contents`, { m: cm, p: room.position, a: 0, body: room.body });
  }
  for (const f of world.fittings) {
    const c = roomById(world, f.room).cells[f.k];
    if (!c.destroyed) items.set(`fit:${f.id}`, { m: f.mass, p: f.p, a: 0, body: c.fragment });
  }
  return items;
}
const propsOf = (items, id) => massProperties([...items.values()].filter((i) => i.body === id));
const cellAlive = (room, k) => !room.cells[k].destroyed && room.cells[k].fragment === room.body;
/** Radiators that work: on surviving cells in their room's working fragment. */
function countRadiators(world) {
  for (const room of world.rooms) if (room.placed) room.radiators = 0;
  for (const f of world.fittings) if (f.type === 'radiator' && cellAlive(roomById(world, f.room), f.k)) roomById(world, f.room).radiators++;
}

/**
 * Make the cluster a ship (13f.1): one rigid body (more if the layout is
 * already in pieces) at rest frame `origin` with `heading`, its centre of
 * mass moving at `velocity`, turning at `omega`. Control is then computed
 * from the bridge.
 */
export function enableShip(world, { origin = [0, 0], heading = 0, velocity = [0, 0], omega = 0 } = {}) {
  if (!world.layout) throw new Error('a ship needs a cluster (createWorld with a grid)');
  world.ship = { bodies: [], debris: [], rounds: [], external: { J: [0, 0], H: 0 }, items: new Map(), next: 1, moved: false };
  for (const room of world.rooms) {
    if (!room.placed) continue;
    room.body = 'body-0';
    for (const c of room.cells) c.fragment = 'body-0';
    room.heatCells = survivingCells(room);
    if (room.type === 'engine') room.exhaust = exhaustFace(world.layout, room.id).point;
  }
  world.ship.items = shipItems(world);
  world.ship.bodies = [createBody('body-0', propsOf(world.ship.items, 'body-0'), { origin, heading, velocity, omega })];
  rebalance(world, 'launch');
  updateControl(world, 'launch');
  return world.ship;
}

/**
 * After cells or contents are lost (13f.1, #208, #214 (9)): the mass that
 * left becomes debris with the velocity of its point (a whole cell also keeps
 * its spin, I = m a^2 / 6), its heat leaving with it (a heat sink cell vents
 * by its own rule, #198); the surviving cells fall into connected sets, each
 * a fragment with the parent's velocity field; a room works in the fragment
 * holding most of its surviving cells (tie: the one holding its lowest
 * surviving cell index). The heaviest piece of a split keeps the body's id.
 */
function rebalance(world, cause) {
  const ship = world.ship, old = ship.items, bodies = new Map(ship.bodies.map((b) => [b.id, b]));
  const comps = cellComponents(world), assign = new Map(), parentOf = new Map(), byOld = new Map();
  for (const comp of comps) {
    const id = comp[0].room.cells[comp[0].k].fragment;
    if (!byOld.has(id)) byOld.set(id, []);
    byOld.get(id).push(comp);
  }
  const massOf = (comp) => comp.reduce((x, c) => x + old.get(`${c.room.id}:${c.k}`).m, 0);
  for (const [id, list] of byOld) {
    const order = list.length === 1 ? list : [...list].sort((a, b) => massOf(b) - massOf(a));
    order.forEach((comp, i) => { const nid = i === 0 ? id : `body-${ship.next++}`; assign.set(comp, nid); parentOf.set(nid, id); });
  }
  for (const comp of comps) for (const c of comp) c.room.cells[c.k].fragment = assign.get(comp);
  for (const room of world.rooms) {
    if (!room.placed) continue;
    const count = new Map();
    room.cells.forEach((c) => { if (!c.destroyed) count.set(c.fragment, (count.get(c.fragment) || 0) + 1); });
    if (!count.size) continue; // nothing left: it keeps its last body for the record
    const most = Math.max(...count.values());
    room.body = room.cells.find((c) => !c.destroyed && count.get(c.fragment) === most).fragment;
  }
  const items = shipItems(world);
  for (const [k, it] of old) {
    const now = items.get(k), drop = it.m - (now ? now.m : 0);
    if (!(drop > 1e-12 * it.m)) continue;
    const b = bodies.get(it.body), q = worldPoint(b, it.p);
    ship.debris.push({ m: drop, x: q, v: pointVelocity(b, q), omega: b.omega, spin: now ? 0 : (drop * it.a * it.a) / 6, from: k, cause, t: world.t });
    const [rid, part] = k.split(':');
    const room = roomById(world, rid);
    if (room && part !== 'contents' && !now && room.type !== 'heatSink' && room.heatCells > 0) { ventCell(room.heat, room.heatCells, FIXED.restTemperature.value); room.heatCells--; } // its heat leaves with it (#214 (9))
  }
  const next = [];
  const ids = [...new Set(comps.map((c) => assign.get(c)))];
  for (const nid of ids) if (nid !== parentOf.get(nid)) next.push(fragmentOf(bodies.get(parentOf.get(nid)), nid, propsOf(items, nid))); // before the parent changes
  for (const nid of ids) if (nid === parentOf.get(nid)) next.push(reshape(bodies.get(nid), propsOf(items, nid)));
  ship.bodies = next.sort((a, b) => byId(a.id, b.id));
  ship.items = items;
  countRadiators(world);
}

/** Rounds fed inside the ship: momentum and angular momentum kept, centre of mass still (body.redistribute). */
function moveInside(world) {
  const items = shipItems(world);
  for (const b of world.ship.bodies) redistribute(b, propsOf(items, b.id));
  world.ship.items = items;
}

/**
 * Recoil (#5, #203 C, 13f.1): the round of mass m leaves the turret's ready
 * store at its room's centre with the velocity of that point plus u along
 * the turret's aim, and the ship takes the impulse -m u d there, so ship
 * plus rounds conserve momentum exactly.
 */
function recoil(world, room, m, u) {
  const b = world.ship.bodies.find((x) => x.id === room.body);
  if (!b) return;
  const q = worldPoint(b, room.position), vq = pointVelocity(b, q), d = rotate(room.turret.aim, b.theta);
  world.ship.items = shipItems(world); // the round has left the store
  reshape(b, propsOf(world.ship.items, b.id));
  world.ship.rounds.push({ m, x: q, v: [vq[0] + u * d[0], vq[1] + u * d[1]], from: room.id, t: world.t });
  applyImpulse(b, [-m * u * d[0], -m * u * d[1]], room.position);
}

/**
 * Control (13f.1, #12, #81, #147): a room is controlled while live walls join
 * it to a bridge that gives control (surviving cells, not shut down, switched
 * on) in its fragment. A room that loses control raises 'control-lost' and
 * stops; a reactor SCRAMs (setControl). Regaining a path restores control
 * (a SCRAMmed reactor stays SCRAMmed).
 */
function updateControl(world, cause) {
  const walls = liveWalls(world).filter((w) => w.live > 0);
  const bridges = world.rooms.filter((r) => r.type === 'bridge' && r.placed && survivingCells(r) > 0 && !r.shutdown && r.active && !r.exploded);
  const reached = reachedThrough(walls, bridges);
  for (const room of world.rooms) {
    if (!room.placed || room.type === 'bridge') continue;
    const now = reached.has(room);
    if (room.controlled && !now) { event(world, room, 'control-lost', cause); setControl(world, room, false, cause); }
    else if (!room.controlled && now) { room.controlled = true; event(world, room, 'control-restored', cause); }
  }
}

/** Fraction at which an RCS fitting fires (0 if it cannot): its host's power fraction, while the host is controlled (13f.1). */
function rcsFraction(world, f) {
  const host = roomById(world, f.room);
  if (!f.fired || !cellAlive(host, f.k) || host.exploded || !host.active || host.shutdown || !host.controlled || !host.powered || isDestroyed(host)) return 0;
  return supply(world, host);
}
function rcsRequest(world, room) {
  if (!room.controlled) return 0;
  let n = 0;
  for (const f of world.fittings) if (f.type === 'rcs' && f.room === room.id && f.fired && cellAlive(room, f.k)) n++;
  return n * tierScaled(world, world.params.rcs.powerDraw);
}
/** Heat (J) of the step from the room's fired RCS fittings: rcs.powerDraw x engine.heatFraction x fraction (13f.1). */
function rcsHeat(world, room) {
  let heat = 0;
  for (const f of world.fittings) if (f.type === 'rcs' && f.room === room.id) heat += rcsFraction(world, f) * tierScaled(world, world.params.rcs.powerDraw) * world.params.engine.heatFraction.value * world.dt;
  return heat;
}

/**
 * The ship's motion for one step (13f.1): each engine pushes along +x of its
 * body at the centre of its exhaust face with the thrust its behaviour set,
 * each fired RCS fitting along its edge's inward normal at the midpoint;
 * semi-implicit Euler per body; debris and rounds fly on.
 */
function shipStep(world) {
  const ship = world.ship, dt = world.dt, force = tierScaled(world, world.params.rcs.force);
  for (const b of ship.bodies) {
    const forces = [];
    for (const room of world.rooms) if (room.type === 'engine' && room.body === b.id && room.engine.thrust > 0) forces.push({ F: [room.engine.thrust, 0], p: room.exhaust });
    for (const f of world.fittings) {
      if (f.type !== 'rcs' || roomById(world, f.room).body !== b.id) continue;
      const frac = rcsFraction(world, f);
      if (frac > 0) forces.push({ F: [-f.side[0] * force * frac, -f.side[1] * force * frac], p: f.p });
    }
    integrate(b, forces, dt, ship.external);
  }
  for (const x of [...ship.debris, ...ship.rounds]) { x.x[0] += x.v[0] * dt; x.x[1] += x.v[1] * dt; }
}

/** Momentum, angular momentum about the origin and kinetic energy of bodies, debris and rounds, and the external impulse booked. */
export function shipMomentum(world) {
  return { ...momentumOf(world.ship), external: { J: [...world.ship.external.J], H: world.ship.external.H } };
}

/** Steady heat (W) a room generates in its current settings, as its behaviour would (the readout's load, #58). */
function heatRate(world, room) {
  if (room.exploded || !room.active || isDestroyed(room)) return 0;
  const p = world.params, sf = survivingFraction(room), f = room.footprintFactor * sf;
  let rate = 0;
  if (room.type === 'reactor') rate = p.reactor.heatPerPower.value * room.reactor.demand * reactorPower(world, room) * sf;
  else if (room.type === 'shieldGenerator') rate = room.shield.on ? tierScaled(world, p.shield.powerDraw) * f : 0;
  else if (room.type === 'engine') rate = room.engine.throttle * tierScaled(world, p.engine.powerDraw) * f * p.engine.heatFraction.value;
  else if (room.type === 'beamBay') { const beam = tierScaled(world, p.beam.power) * f; rate = room.beamBay.firing ? beam / p.beambay.efficiency.value - beam : 0; }
  else if (room.type === 'bridge') rate = tierScaled(world, p.bridge.powerDraw) * sf;
  else if (room.type === 'quarters') rate = tierScaled(world, p.quarters.powerDraw) * sf;
  else if (room.type === 'turret' && !room.turret.hold && room.turret.ammo > 0) rate = tierScaled(world, p.turret.heatPerShot) * FIXED.sizeLinear.value[room.size] ** 3 * (tierScaled(world, p.turret.fireRate) / FIXED.sizeLinear.value[room.size]);
  for (const fit of world.fittings) if (fit.type === 'rcs' && fit.room === room.id && fit.fired && cellAlive(room, fit.k)) rate += tierScaled(world, p.rcs.powerDraw) * p.engine.heatFraction.value;
  return rate;
}

/**
 * The shipyard's physics readout (#58, 13f.1), from the same functions: mass,
 * centre of mass and moment of inertia of everything aboard; acceleration in
 * g with every engine at full throttle; the angular acceleration of every RCS
 * fitting turning one way (ccw) or the other (cw) and the time of a 90 degree
 * bang-bang turn on it, 2 sqrt((pi / 2) / alpha); the heat the rooms generate
 * in their current settings against the radiators' capacity at plant hot.
 */
export function readout(world) {
  const p = world.params, items = world.ship ? world.ship.items : null;
  const props = massProperties([...(items || new Map()).values()]);
  let thrust = 0;
  for (const room of world.rooms) if (room.type === 'engine' && !isDestroyed(room)) thrust += tierScaled(world, p.engine.thrust) * room.footprintFactor * survivingFraction(room);
  let ccw = 0, cw = 0;
  const force = tierScaled(world, p.rcs.force);
  for (const f of world.fittings) {
    if (f.type !== 'rcs' || !cellAlive(roomById(world, f.room), f.k)) continue;
    const tau = (f.p[0] - props.c[0]) * (-f.side[1] * force) - (f.p[1] - props.c[1]) * (-f.side[0] * force);
    if (tau > 0) ccw += tau; else cw -= tau;
  }
  const turn = (a) => (a > 0 ? 2 * Math.sqrt(Math.PI / 2 / a) : null);
  let generated = 0, panels = 0;
  for (const room of world.rooms) { generated += heatRate(world, room); panels += room.radiators; }
  const capacity = radiatorPower(p.thermal.plantHot.value, panels, tierScaled(world, p.radiator.area), FIXED.radiatorEmissivity.value, FIXED.stefanBoltzmann.value);
  return {
    mass: props.M, centre: props.c, inertia: props.I, accelerationG: thrust / props.M / FIXED.standardGravity.value,
    rcs: { ccw: ccw / props.I, cw: cw / props.I, turn90ccw: turn(ccw / props.I), turn90cw: turn(cw / props.I) },
    heat: { generated, capacity, panels, balance: capacity - generated },
  };
}
