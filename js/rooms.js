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
// start of the step. No DOM, no Math.random. Control paths are L3.
import { ROOMS, FIXED, BASE_EDGE } from './data.js';
import { createHeat, temperature, radiatorPower, heatStep, crossings, wallConductance, conductionFlows, ventCell } from './heat.js';
import { createLog, emit } from './events.js';
import { absorbBeamStep, shieldStrength, stopRound } from './field.js';
import { stepsAtLeast } from './util.js';
import { createLayout, placeRoom, openEdges, roomCentre, sharedWalls, byId } from './layout.js';
import { liveWalls, priorityMaxFlow, feedAmmo } from './graph.js';

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
  if (grid) Object.assign(world, { layout: createLayout({ edge, grid }), sizeRule: true, power: null, beams: [], beamResults: [], feedCredit: new Map(), blasts: [] });
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
    placeRoom(world.layout, id, fp, cell, rotation);
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
// A cell is destroyed when its integrity reaches 0 and stays destroyed until
// repair brings it back to integrity 1 (#189 (1), DESIGN.md 13c.2 row 14).
export const survivingCells = (room) => room.cells.filter((c) => !c.destroyed).length;
export const survivingFraction = (room) => survivingCells(room) / room.cells.length;
/** Cells destroyed now: a repaired cell no longer counts (#189 (1)). */
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
  if (n > 0 && room.def.placement === 'inside') throw new Error(`${room.type} is placed inside: no hull segment for a radiator (L2 reaches it through walls)`);
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
 * Damage a cell: integrity drops by `loss` (a round passing: 1; a blast:
 * absorbed / resistance, #182). Reaching 0 destroys it: crew die per
 * destroyed cell, and the room reacts (breach, detonation, control lost).
 */
export function damageCell(world, room, index, loss, cause, channel) {
  const cell = room.cells[index];
  if (cell.destroyed || room.exploded) return;
  cell.integrity = Math.max(0, cell.integrity - loss);
  if (cell.integrity > 0) return;
  cell.destroyed = true;
  // k = cells currently destroyed (#189 (1)); crew do not come back, and
  // killCrew never takes more than are aboard, so deaths never exceed the crew.
  const k = destroyedCells(room), N = room.cells.length;
  const deaths = room.crewPerCell !== undefined ? room.crewPerCell : Math.floor((k * room.crewTotal) / N) - Math.floor(((k - 1) * room.crewTotal) / N);
  event(world, room, 'cell-destroyed', cause, { channel, cell: index });
  killCrew(world, room, deaths, cause);
  ON_CELL_DESTROYED[room.type]?.(world, room, cause);
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
    const own = room.exploded || !room.active ? 0 : (BEHAVIOUR[room.type]?.(world, room) || 0);
    const external = room.externalPower * dt;
    if (conducted) heatStep(room.heat, own + external, irBrightness(world, room), dt, conducted.get(room) || 0, pumped.get(room) || 0);
    else heatStep(room.heat, own + external, irBrightness(world, room), dt);
  }
  if (world.layout) feedTurrets(world);
  world.step++;
  world.t = world.step * dt;
  // A state reached during the step is reported at its end, like the thresholds.
  for (const r of world.repaired) event(world, r.room, 'cell-repaired', r.cause, { cell: r.cell });
  world.repaired = [];
  for (const room of world.rooms) {
    for (const x of crossings(room.heat, room.thresholds)) onThreshold(world, room, x);
    TIMERS[room.type]?.(world, room);
  }
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
    room.turret = { ammo: 0, shots: 0, impulse: 0, energyDrawn: 0, ceased: false, anchor: 0, sinceAnchor: 0, lastShot: null };
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
    const able = room.powered && !room.shutdown && !isDestroyed(room) && s.ammo > 0;
    if (!able) {
      if (!s.ceased) {
        s.ceased = true;
        const cause = s.ammo <= 0 ? 'dry' : !room.powered ? 'no-power' : room.shutdown ? 'heat' : 'destroyed';
        event(world, room, 'cease-fire', cause);
      }
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
      s.impulse += m * v; // recoil (Newton 3); spin and CoM are L3
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
    const able = s.on && room.powered && !room.shutdown && !isDestroyed(room);
    if (!able) {
      if (!s.down) { s.down = true; event(world, room, 'shield-down', !s.on ? 'off' : !room.powered ? 'no-power' : room.shutdown ? 'heat' : 'destroyed'); }
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
      if (c.integrity >= 1 || rate <= 0) continue;
      c.integrity = Math.min(1, c.integrity + rate * dt);
      if (c.integrity >= 1) c.destroyed = false;
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
    const able = s.firing && room.powered && !room.shutdown && !isDestroyed(room);
    if (!able) {
      if (s.firing && !s.stopped) { s.stopped = true; event(world, room, 'beam-stopped', !room.powered ? 'no-power' : room.shutdown ? 'heat' : 'destroyed'); }
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
 * lifeSupport) that is powered (the bridge always, on its backup, #147),
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
  for (const room of world.rooms) {
    if (!room.def.lifeSupport || !room.placed || room.exploded || isDestroyed(room)) continue;
    if (room.type !== 'bridge' && !room.powered) continue;
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
  if (!REQUEST[room.type] || room.exploded || !room.active || room.shutdown || isDestroyed(room)) return 0;
  return REQUEST[room.type](world, room);
}

function routePower(world) {
  const wall = tierScaled(world, world.params.power.wallCapacity);
  const edges = liveWalls(world).map((w) => ({ a: w.a.id, b: w.b.id, capacity: wall * w.live }));
  const placed = world.rooms.filter((r) => r.placed);
  const sources = placed.filter((r) => r.type === 'reactor').map((r) => ({ id: r.id, capacity: reactorAble(r) ? r.reactor.demand * reactorPower(world, r) * survivingFraction(r) : 0 }));
  const listed = world.power.priority;
  const rank = (r) => (listed.includes(r.id) ? listed.indexOf(r.id) : listed.length);
  const consumers = placed.filter((r) => REQUEST[r.type]).sort((a, b) => rank(a) - rank(b) || byId(a.id, b.id));
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
const shieldAble = (room) => room.type === 'shieldGenerator' && room.shield.on && room.powered && room.active && !room.shutdown && !isDestroyed(room);
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
 * fraction); a damaged cell j in range asks q_j = R g(r_j); if the asks
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
      other.cells.forEach((c, i) => { if (c.integrity < 1 && rate > 0) q.grants.push({ room: other, cell: i, rate }); });
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
    give: (room) => { room.turret.ammo++; room.turret.fed = (room.turret.fed || 0) + 1; },
  });
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
