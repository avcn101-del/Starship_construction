// rooms.js — rooms built from ROOMS in data.js, their cells, crew, power and
// control state, and the behaviours of each room alone (DESIGN.md 13c, L1):
// reactor (demand, SCRAM, decay heat, breach, meltdown), magazine (contents,
// cook-off), turret (firing), shield generator, engine, crew quarters
// (housing, repair field), bridge (control, backup supply), beam bay.
// No DOM, no Math.random. Conduction, feed and control paths are L2/L3.
import { ROOMS, FIXED, BASE_EDGE } from './data.js';
import { createHeat, temperature, radiatorPower, heatStep, crossings } from './heat.js';
import { createLog, emit } from './events.js';
import { absorbBeamStep, shieldStrength } from './field.js';
import { stepsAtLeast } from './util.js';

/** A world of rooms stepped together: params from withOverrides, one tier. */
export function createWorld({ params, edge = BASE_EDGE, dt = FIXED.simStep.value }) {
  return { params, edge, dt, step: 0, t: 0, rooms: [], log: createLog(), shipMass: null };
}

const tierScaled = (world, p) => p.value * (world.edge / BASE_EDGE) ** p.k;
const param = (world, path) => {
  const [g, n] = path.split('.');
  return world.params[g][n];
};

export function addRoom(world, type, { id = `${type}-${world.rooms.length}`, size = 'M', position = [0, 0], temperature: T0 = FIXED.restTemperature.value } = {}) {
  const def = ROOMS[type];
  if (!def) throw new Error(`unknown room type ${type}`);
  const fp = def.footprint[size];
  if (!fp || typeof fp[1] !== 'number') throw new Error(`${type} has no buildable size ${size}`);
  const n = fp[0] * fp[1];
  const sizeLinear = FIXED.sizeLinear.value[size];
  const C = n * tierScaled(world, world.params.thermal.heatCapacityPerCell);
  const cls = def.thermalClass, th = world.params.thermal;
  const room = {
    id, type, size, def, position,
    footprintFactor: sizeLinear * sizeLinear, // rate-like constants: L = 9/4 of M (#183)
    cells: Array.from({ length: n }, () => ({ integrity: 1 })),
    destroyedCount: 0, // cells destroyed so far (for crew deaths per cell)
    thresholds: { hot: th[`${cls}Hot`].value, overheated: th[`${cls}Overheated`].value, critical: th[`${cls}Critical`].value },
    heat: createHeat(C, T0),
    radiators: 0,
    externalPower: 0, // W from outside the room (a test source; conduction is L2)
    active: true, // switched on; a room switched off has no function and no own heat
    powered: true, controlled: true, shutdown: false, exploded: false,
    crewTotal: 0, crew: 0,
  };
  if (def.crew === 'housed') room.crewPerCell = Math.round(tierScaled(world, world.params.quarters.crewPerCell));
  if (def.crew === 'housed') room.crewTotal = room.crewPerCell * n;
  else if (def.crew) room.crewTotal = Math.round(tierScaled(world, param(world, def.crew)));
  room.crew = room.crewTotal;
  INIT[type]?.(world, room);
  world.rooms.push(room);
  return room;
}

// ---------- shared state ----------
export const survivingCells = (room) => room.cells.filter((c) => c.integrity > 0).length;
export const survivingFraction = (room) => survivingCells(room) / room.cells.length;
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

export function setRadiators(room, n) {
  if (n > 0 && room.def.placement === 'inside') throw new Error(`${room.type} is placed inside: no hull segment for a radiator (L2 reaches it through walls)`);
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
  if (cell.integrity <= 0 || room.exploded) return;
  cell.integrity = Math.max(0, cell.integrity - loss);
  if (cell.integrity > 0) return;
  room.destroyedCount++;
  const k = room.destroyedCount, N = room.cells.length;
  const deaths = room.crewPerCell !== undefined ? room.crewPerCell : Math.floor((k * room.crewTotal) / N) - Math.floor(((k - 1) * room.crewTotal) / N);
  event(world, room, 'cell-destroyed', cause, { channel, cell: index });
  killCrew(world, room, deaths, cause);
  ON_CELL_DESTROYED[room.type]?.(world, room, cause);
}
export const destroyCell = (world, room, index, cause, channel = 'kinetic') => damageCell(world, room, index, 1, cause, channel);

// ---------- stepping ----------
/** One simulation step for every room, then thresholds and timers at the new time. */
export function step(world) {
  const dt = world.dt;
  for (const room of world.rooms) {
    const own = room.exploded || !room.active ? 0 : (BEHAVIOUR[room.type]?.(world, room) || 0);
    const external = room.externalPower * dt;
    heatStep(room.heat, own + external, irBrightness(world, room), dt);
  }
  world.step++;
  world.t = world.step * dt;
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
  if (x === 'critical') {
    killCrew(world, room, room.crew, 'heat'); // #18b
    ON_CRITICAL[room.type]?.(world, room);
  }
}

function explode(world, room, energy, cause) {
  room.exploded = true;
  for (const c of room.cells) c.integrity = 0;
  event(world, room, 'explosion', cause, { energy, channel: 'blast' });
  killCrew(world, room, room.crew, cause);
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
function explosionEnergy(world) {
  return tierScaled(world, world.params.reactor.explosionEnergy);
}
const INIT = {
  reactor(world, room) {
    room.reactor = { demand: 0, delivered: 0, scrammed: false, decay: [], decayHeat: 0, energyDelivered: 0, breachStep: null, breachCause: null };
  },
  magazine(world, room) {
    room.magazine = { size: 'M', ap: 0, he: 0 };
  },
  turret(world, room) {
    room.turret = { ammo: 0, shots: 0, impulse: 0, nextShotStep: 0, energyDrawn: 0, ceased: false };
  },
  shieldGenerator(world, room) {
    room.shield = { on: true, incoming: 0, strength: 1, absorbed: 0, passed: 0, em: 0, absorbedEnergy: 0, passedEnergy: 0, energyDrawn: 0, down: false };
  },
  engine(world, room) {
    room.engine = { throttle: 0, thrust: 0, draw: 0, acceleration: 0 };
  },
  quarters(world, room) {
    room.quarters = { energyDrawn: 0 };
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
    r.delivered = reactorAble(room) ? r.demand * reactorPower(world, room) * survivingFraction(room) : 0;
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
    s.ceased = false;
    let heat = 0;
    if (world.step >= s.nextShotStep) {
      const m = tierScaled(world, p.kinetic.roundMass) * FIXED.sizeLinear.value[room.size] ** 3;
      const v = tierScaled(world, p.kinetic.muzzleVelocity);
      s.ammo--;
      s.shots++;
      s.impulse += m * v; // recoil (Newton 3); spin and CoM are L3
      heat += tierScaled(world, p.turret.heatPerShot);
      s.nextShotStep = world.step + stepsAtLeast(1 / tierScaled(world, p.turret.fireRate), dt);
      event(world, room, 'shot', `${room.id}:shot-${s.shots}`, { energy: 0.5 * m * v * v, channel: 'kinetic' });
    }
    if (s.ammo > 0) s.energyDrawn += tierScaled(world, p.turret.powerDraw) * room.footprintFactor * survivingFraction(room) * dt;
    else { s.ceased = true; event(world, room, 'cease-fire', 'dry'); }
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
    const f = room.footprintFactor * survivingFraction(room);
    const r = absorbBeamStep(s.incoming, dt, tierScaled(world, p.budget) * f, s.strength);
    const draw = tierScaled(world, p.powerDraw) * f;
    s.absorbed = r.absorbed / dt; s.passed = r.passed / dt; s.em = s.absorbed; // EM-bright while absorbing
    s.absorbedEnergy += r.absorbed; s.passedEnergy += r.passed; s.energyDrawn += draw * dt;
    return draw * dt + r.heat;
  },
  engine(world, room) {
    const e = room.engine, p = world.params.engine;
    const able = room.powered && room.controlled && !room.shutdown && !isDestroyed(room);
    const f = able ? e.throttle * room.footprintFactor * survivingFraction(room) : 0;
    e.thrust = f * tierScaled(world, p.thrust);
    e.draw = f * tierScaled(world, p.powerDraw);
    e.acceleration = world.shipMass ? e.thrust / world.shipMass : 0;
    return e.draw * p.heatFraction.value * world.dt;
  },
  quarters(world, room) {
    const q = room.quarters, dt = world.dt, p = world.params;
    if (!room.powered || room.shutdown || isDestroyed(room)) return 0;
    // Repair field (#51, #99): strength by surviving cells and distance.
    const base = p.repair.rate.value * survivingFraction(room);
    const radius = tierScaled(world, p.repair.radius);
    for (const other of world.rooms) {
      if (other === room || other.exploded) continue;
      const r = Math.hypot(other.position[0] - room.position[0], other.position[1] - room.position[1]);
      const rate = base * shieldStrength(r, radius, FIXED.repairFalloffExponent.value);
      other.cells.forEach((c, i) => {
        if (c.integrity >= 1 || rate <= 0) return;
        c.integrity = Math.min(1, c.integrity + rate * dt);
        if (c.integrity >= 1) event(world, other, 'cell-repaired', room.id, { cell: i });
      });
    }
    const draw = tierScaled(world, p.quarters.powerDraw) * survivingFraction(room);
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
    s.beam = tierScaled(world, p.beam.power) * room.footprintFactor * survivingFraction(room);
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
    explode(world, room, explosionEnergy(world), 'heat');
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
    if (survivingCells(room) === 0) { r.breachStep = null; explode(world, room, explosionEnergy(world), cause); return; }
    if (r.breachStep === null && room.destroyedCount / room.cells.length >= p.breachFraction.value) {
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
};

const TIMERS = {
  reactor(world, room) {
    const r = room.reactor;
    if (r.breachStep !== null && !room.exploded && world.step >= r.breachStep) explode(world, room, explosionEnergy(world), r.breachCause);
  },
  bridge(world, room) {
    // Control while any cell survives (#147: power cut does not matter). An
    // overheated or switched-off bridge gives no control (13c.1).
    const control = survivingCells(room) > 0 && !room.shutdown && room.active;
    if (room.bridge.control && !control) { room.bridge.control = false; event(world, room, 'control-lost', room.active ? 'heat' : 'off'); }
    else if (!room.bridge.control && control) room.bridge.control = true;
  },
};

// ---------- magazine (#91, #183) ----------
/** Load rounds of one size by mass (kg); counts are whole rounds. */
export function loadMagazine(world, room, { size = 'M', apMass = 0, heMass = 0 }) {
  const capacity = tierScaled(world, world.params.magazine.capacity);
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
