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
// loses it stops (a reactor SCRAMs, #81). The path model (DESIGN.md 13i):
// each room type's cells have their real mass (#232, #234); a cell on a path
// is its mass over its face and resists a round in proportion to it; a round
// is damaged by what it meets and flattens (#230); a neutral particle beam
// from a spinal beam bay leaves its energy along its path as heat and
// integrity loss (#229, #234). Physics pass 2 (DESIGN.md 13k, #240, #243):
// everything that resists follows the cell's mass (beam burn, blast, repair) and
// heat capacity the room type's thermally coupled mass; a round's impulse and
// lost kinetic energy go to the ship it hits, the field's impulse to the
// generator's ship; a SCRAMmed reactor restarts; a path entry may carry a
// chord. L4a (DESIGN.md 13l, #253, #255, #256): armour plates on wall segments
// on every path that crosses them, with their mass on the ship; blast capacity
// from remaining integrity; rounds in overlapping fields; one energy rule for
// the field and the hull. Its fix round (#258): a plate burns by its mass, meets
// a line at sigma / cos theta and adds its steel's heat capacity to its room.
// L4b (13l.1): every event has an id and a parent (events.js), so the cascade
// tree runs from each root (a shot, a beam, heat, launch) through every event
// it caused; a room remembers the events that took its state (room.marks) for
// the parents of events that follow later. L5b (13n.1 (a), #289): the antenna
// fitting (sensor.mass at its edge's midpoint) draws sensor.scanPower from its
// host while it scans, as heat there; a shield's payment for a round is EM
// brightness over that step (js/sensors.js reads it). L5c (13n.1 (c), #278, #292,
// #295): room size S (one cell of a 2 x 2 room; its rate-like quantities by its
// cell count over M's); the spinal railgun (a steel slug along the axis at
// railgun.muzzleVelocity x sqrt(N / 2), fed from a railgun magazine on a live
// wall, its draw spread over the reload, the rest heat); the missile bay (a ready
// store fed from a missile magazine, one launch per interval from its open face,
// it explodes by its store); typed rounds (ROUNDS: one parameter traded and paid
// for, one type per load slot); a contact burst at a hull entry (HE rounds and
// warheads) and the EMP warhead's field (a reactor SCRAMs, another powered room
// shuts down for emp.outageTime); point-defence fittings (kinetic with its own
// store of flak rounds, laser with its draw) on hull edges. Missiles fly in
// js/missile.js, point defence engages in js/defence.js, both run by the battle.
// No DOM, no Math.random.
import { ROOMS, ROUNDS, FIXED, BASE_EDGE, scaled } from './data.js';
import { createHeat, temperature, radiatorPower, heatStep, crossings, wallConductance, conductionFlows, ventCell, ventCapacity, addCapacity, depositHeat } from './heat.js';
import { createLog, emit, within } from './events.js';
import { absorbBeamStep, shieldStrength, stopRound } from './field.js';
import { stepsAtLeast, exp, hypot } from './util.js';
import { createLayout, roomFootprint, placeRoom, openEdges, roomCentre, sharedWalls, byId, fittingProblem, plateProblem, segmentKey, edgeMidpoint, exhaustFace } from './layout.js';
import { liveWalls, priorityMaxFlow, feedAmmo, cellComponents, reachedThrough } from './graph.js';
import { massProperties, createBody, worldPoint, pointVelocity, applyImpulse, integrate, reshape, fragmentOf, redistribute, rotate, momentumOf, cross, frameOrigin } from './body.js';
import { penetrateRound, beamDeposit, csdaRange } from './damage.js';
import { sectionalMomentum, roundGeometry } from './projectile.js';

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
  if (grid) Object.assign(world, { layout: createLayout({ edge, grid }), sizeRule: true, power: null, beams: [], beamResults: [], feedCredit: new Map(), blasts: [], fittings: [], plates: new Map(), ship: null });
  return world;
}

const tierScaled = (world, p) => scaled(p, world.edge);
const param = (world, path) => {
  const [g, n] = path.split('.');
  return world.params[g][n];
};
/** Fraction of its draw a consumer receives: routed in a cluster with power routing (#193), else 1 (L1). */
const supply = (world, room) => (world.power ? room.powerFraction : 1);

/**
 * Add a room. In a cluster, `cell` ([x, y]) and `rotation` (0 or 90) place
 * it on the grid and its position is its centre; without `cell` it stands
 * alone at `position` (m), a cluster of one. A spinal room (the beam bay,
 * #234) takes its `length` N, else its footprint's (layout.js).
 */
export function addRoom(world, type, { id = `${type}-${world.rooms.length}`, size = 'M', position = [0, 0], temperature: T0 = FIXED.restTemperature.value, cell = null, rotation = 0, length = null } = {}) {
  const def = ROOMS[type];
  if (!def) throw new Error(`unknown room type ${type}`);
  const fp = roomFootprint(def, type, size, length); // a spinal room is N cells long (#234)
  if (world.rooms.some((r) => r.id === id)) throw new Error(`room id ${id} is taken`);
  const n = fp[0] * fp[1];
  if (cell) {
    if (!world.layout) throw new Error(`${id}: a cell position needs a cluster (createWorld with a grid)`);
    placeRoom(world.layout, id, fp, cell, rotation, type);
    position = roomCentre(world.layout, id);
  }
  const sizeLinear = FIXED.sizeLinear.value[size];
  // Rate-like constants (#183): an L room's sizeLinear^2 (9/4, its cell count over M's); an S room's its cell count over
  // M's at the same length (13n.1 (c): one cell of a 2 x 2 room is 1/4, not sizeLinear.S^2; the round keeps sizeLinear).
  const fpM = size === 'S' ? roomFootprint(def, type, 'M', length) : null;
  // C = cells x the room type's thermally coupled heat capacity per cell (#240 (1), 13k.1); a heat sink x capacityFactor (#198).
  const C = n * tierScaled(world, param(world, def.heatCapacity)) * (def.capacityFactor ? param(world, def.capacityFactor).value : 1);
  const cls = def.thermalClass, th = world.params.thermal;
  const room = {
    id, type, size, def, position,
    length: def.spinal ? fp[0] : null, // N of a spinal room, its cells along x (#234)
    footprintFactor: fpM ? n / (fpM[0] * fpM[1]) : sizeLinear * sizeLinear, // rate-like constants: L = 9/4 of M (#183), S by its cells (13n.1 (c))
    cells: Array.from({ length: n }, () => ({ integrity: 1, destroyed: false })),
    thresholds: { hot: th[`${cls}Hot`].value, overheated: th[`${cls}Overheated`].value, critical: th[`${cls}Critical`].value },
    heat: createHeat(C, T0),
    radiators: 0,
    externalPower: 0, // W from outside the room (a test source; conduction is L2)
    active: true, // switched on; a room switched off has no function and no own heat
    powered: true, controlled: true, shutdown: false, exploded: false,
    crewTotal: 0, crew: 0,
    marks: {}, // ids of the events that last changed its state (shutdown, control, destroyed, last shot ...): later events' parents (13l.1)
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

// Events that can cut a room off from its power (a wall, a reactor): the parent of a later 'no-power' (13l.1).
const CUTS = new Set(['cell-destroyed', 'explosion', 'scram', 'shutdown', 'control-lost', 'unmanned', 'outage']);
/** Emit an event of `room`; `parent` names its parent in the cascade tree (13l.1), else the event being handled or its cause. */
function event(world, room, type, cause, extra = {}, parent = null) {
  const e = emit(world.log, { t: world.t, type, room: room.id, cause, crew: room.crew, ...extra, ...(parent ? { parent } : {}) });
  if (CUTS.has(type)) world.log.lastCut = e.id;
  return e;
}
/**
 * The parent (13l.1) of an event that reports a reason, not a cause: the event that took the state the reason
 * names ('heat': the room's shutdown; 'no-control': its lost control; 'destroyed': what destroyed it; 'dry': its
 * last shot; 'no-power': the last event that could cut power), or a root ('launch' for an order or the state at
 * launch).
 */
function reasonParent(world, room, why) {
  const m = room.marks;
  if (why === 'heat' || why === 'overheat') return m.shutdown || 'heat';
  if (why === 'unmanned') return m.unmanned || 'launch';
  if (why === 'outage') return m.outage || 'launch';
  if (why === 'no-control') return m.controlLost || 'launch';
  if (why === 'destroyed') return m.destroyed || 'launch';
  if (why === 'dry') return m.lastShot || 'launch';
  if (why === 'no-power') return world.log.lastCut || 'launch';
  return 'launch';
}
function killCrew(world, room, deaths, cause) {
  deaths = Math.min(deaths, room.crew);
  if (deaths <= 0) return;
  room.crew -= deaths;
  const ev = event(world, room, 'crew-died', cause, { deaths });
  // A room that requires crew (its type's crewRequired; the quarters house crew, they do not require it) left with
  // none while a cell stands is unmanned for good (13n.1 (b), #277 O3): no function, as if shut down; the event's
  // parent is the crew-died event. Nobody comes back (repair brings no crew back, #206).
  if (room.crew === 0 && room.crewTotal > 0 && room.def.crew !== 'housed' && !room.unmanned && !room.exploded && survivingCells(room) > 0) {
    room.unmanned = true;
    event(world, room, 'unmanned', cause, {}, ev.id);
    room.marks.unmanned = ev.id; // the able rule's parent for 'unmanned' (13n.1 (b)): the crew-died event
    if (!room.shutdown) within(world.log, ev, () => ON_SHUTDOWN[room.type]?.(world, room));
  }
}
/** No function (13n.1 (b)): shut down by heat, unmanned, or in an EMP's outage (13n.1 (c), #292). */
const down = (room) => room.shutdown || room.unmanned || !!room.outage;

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
/** Control from the bridge (control paths are L3). Losing it SCRAMs a reactor (#81); regaining it starts the restart clock (#82, 13k.1). */
export function setControl(world, room, on, cause) {
  const was = room.controlled;
  room.controlled = on;
  if (!on && room.type === 'reactor') scram(world, room, cause);
  if (room.type === 'reactor' && on !== was) controlChanged(world, room, on);
}
/**
 * The SCRAM restart (#82, 13k.1), an automatic rule: a SCRAMmed reactor
 * restarts reactor.restartTime after control is back (the step it came back
 * plus the whole steps of that time), and only once its temperature is below
 * hot; losing control again stops the clock.
 */
function controlChanged(world, room, on) {
  room.reactor.restartStep = on ? world.step + stepsAtLeast(tierScaled(world, world.params.reactor.restartTime), world.dt) : null;
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
  const was = cell.integrity, left = cell.integrity - loss;
  cell.integrity = left > 1e-12 ? left : 0;
  // No event without a change of state (§17 item 51): a loss below float resolution (1 - 1e-17 is 1) leaves the
  // integrity as it was, so nothing happened and nothing is emitted.
  if (cell.integrity === was) return;
  if (cell.integrity > 0) {
    const ev = event(world, room, 'cell-damaged', cause, { channel, cell: index, integrity: cell.integrity });
    cell.lastEvent = ev.id;
    within(world.log, ev, () => killByIntegrity(world, room, cause));
    return;
  }
  cell.destroyed = true;
  if (world.beamPaths) world.beamPaths.clear(); // the deposit along any path through it changes (#236)
  if (world.plates) for (const f of world.plates.values()) if (f.room === room.id && f.k === index) releasePlate(world, f); // its plates leave with it (13l.1)
  const ev = event(world, room, 'cell-destroyed', cause, { channel, cell: index });
  cell.lastEvent = ev.id;
  if (survivingCells(room) === 0) room.marks.destroyed = ev.id;
  within(world.log, ev, () => { // everything that follows from it is its child in the cascade tree (13l.1)
    killByIntegrity(world, room, cause);
    ON_CELL_DESTROYED[room.type]?.(world, room, cause);
    if (world.ship) { rebalance(world, cause); updateControl(world, cause); } // debris, fragments, control (13f.1)
  });
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
 * Mass of one surviving cell of `room` (#221, #232, #234, 13i.2, 13k.1): its
 * type's cellMass constant (ROOMS), or the sum of the constants it lists
 * (structure + machinery, each at its own exponent, #243); a heat sink cell
 * plus the water of its extra heat capacity, (capacityFactor - 1) x its
 * coupled heat capacity per cell / FIXED.waterSpecificHeat.
 */
export function cellMassOf(world, room) {
  const def = room.def, sources = Array.isArray(def.cellMass) ? def.cellMass : [def.cellMass];
  const m0 = sources.reduce((m, path) => m + tierScaled(world, param(world, path)), 0);
  if (!def.capacityFactor) return m0;
  const C = tierScaled(world, param(world, def.heatCapacity));
  return m0 + ((param(world, def.capacityFactor).value - 1) * C) / FIXED.waterSpecificHeat.value;
}
/**
 * Cell matter on a path (13i.1): the cell's mass spread over its face,
 * sigma = cell mass / edge^2 (kg/m^2, iron-equivalent by mass); a destroyed
 * cell is a hole, sigma = 0 (#212 (5)).
 */
export function cellArealDensity(world, room, index) {
  return room.cells[index].destroyed ? 0 : cellMassOf(world, room) / (world.edge * world.edge);
}
/**
 * A round's strength (13i.1, #230): per kilogram of steel as strong as armour,
 * S = matter.kineticResistance x rho_steel L, with rho L = m / A0 the round's
 * own areal density along its axis (a steel cylinder of length L).
 */
export function roundStrength(world, mass, area) {
  return tierScaled(world, world.params.matter.kineticResistance) * (mass / area);
}
/** The grid point (m) of the centre of a placed room's cell `index`. */
function cellCentre(world, room, index) {
  const [x, y] = world.layout.rooms.get(room.id).cells[index], e = world.edge;
  return [(x + 0.5) * e, (y + 0.5) * e];
}

// ---------- armour plates (13l.1, #255, #256) ----------
// A plate is a fitting of type 'armour' on one wall segment of a cell of its
// room: a hull edge or a shared wall. A path entry { plate, chord } stands for
// it; fireRound and fireBeam give it its room (the room it is mounted on).
/** A plate is gone when it is wrecked or the cell it is mounted on is destroyed (its mass left with that cell). */
export const plateGone = (world, f) => f.destroyed || roomById(world, f.room).cells[f.k].destroyed;
/**
 * Areal density (kg/m^2) a path meets on entry x: a cell's (cellArealDensity), or a plate's d x FIXED.steelDensity
 * over cos theta, the line-of-sight thickness of a line crossing it at theta to its normal (x.cos, default 1),
 * capped at the cell's edge length of steel (cos theta >= d / edge, #258); 0 once gone.
 */
export function entryArealDensity(world, x) {
  if (x.plate) return plateGone(world, x.plate) ? 0 : (x.plate.thickness * FIXED.steelDensity.value) / Math.max(x.cos ?? 1, x.plate.thickness / world.edge);
  return cellArealDensity(world, x.room, x.cell);
}
/** The plate on the wall segment between grid cells a and b (edge-adjacent; either may be empty or off the grid), or null. */
export function plateBetween(world, a, b) {
  if (!world.plates) return null;
  return world.plates.get(segmentKey(a, [b[0] - a[0], b[1] - a[1]])) || null;
}
/**
 * The path entry of the plate on the segment between edge-adjacent grid cells a and b, crossed by a line along
 * `direction` (grid frame; null: along the segment's normal), or null: { plate, chord: 1, cos }, cos = |direction
 * . (b - a)| / |direction|, the cosine of the angle to the plate's normal (#258).
 */
export function plateEntry(world, a, b, direction = null) {
  const f = plateBetween(world, a, b);
  if (!f) return null;
  const cos = direction ? Math.abs(direction[0] * (b[0] - a[0]) + direction[1] * (b[1] - a[1])) / hypot(direction[0], direction[1]) : 1;
  return { plate: f, chord: 1, cos };
}
/**
 * The path along grid cells `cells` ([x, y] in order, each edge-adjacent to the next; empty cells and cells off
 * the grid included, so a hull edge plate is found where the line crosses it): each room cell as { room, cell,
 * chord }, and before it, where the line crosses a plated segment, its plateEntry (13l.1, #258). `chords` gives a
 * chord per grid cell (default 1); `direction` the line's direction in the grid frame (default: along each
 * plate's normal, cos 1).
 */
export function pathAlong(world, cells, chords = null, direction = null) {
  const out = [];
  cells.forEach((xy, k) => {
    if (k > 0) { const x = plateEntry(world, cells[k - 1], xy, direction); if (x) out.push(x); }
    const o = world.layout.occupied.get(`${xy[0]},${xy[1]}`);
    if (o) out.push({ room: roomById(world, o.id), cell: o.k, chord: chords ? chords[k] : 1 });
  });
  return out;
}
/** A path with each plate entry given the room it is mounted on. */
const withRooms = (world, path) => path.map((x) => (x.plate ? { ...x, room: roomById(world, x.plate.room) } : x));
/** The grid point an entry's impulse acts at: its point on the round's line of action (`at`, B2, 13n.1 (b)), else a cell's centre, a plate's segment midpoint. */
const entryPoint = (world, x) => x.at || (x.plate ? x.plate.p : cellCentre(world, x.room, x.cell));
/** The fragment (body id) holding an entry: its cell's, or the cell its plate is mounted on. */
const entryFragment = (world, x) => (x.plate ? roomById(world, x.plate.room).cells[x.plate.k].fragment : x.room.cells[x.cell].fragment);
/**
 * Damage a plate as a cell is damaged (13l.1): integrity falls by `loss`; at 0 it is a hole and its mass leaves the
 * ship as debris (rebalance). Events 'plate-damaged' and 'plate-destroyed' carry the room it is mounted on.
 */
function damagePlate(world, f, loss, cause, channel) {
  if (plateGone(world, f) || !(loss > 0)) return;
  const room = roomById(world, f.room), was = f.integrity, left = f.integrity - loss;
  f.integrity = left > 1e-12 ? left : 0;
  if (f.integrity === was) return; // a loss below float resolution changes nothing: no event (§17 item 51)
  if (f.integrity > 0) { event(world, room, 'plate-damaged', cause, { channel, plate: f.id, integrity: f.integrity }); return; }
  f.destroyed = true;
  if (world.beamPaths) world.beamPaths.clear();
  releasePlate(world, f);
  event(world, room, 'plate-destroyed', cause, { channel, plate: f.id });
  if (world.ship) rebalance(world, cause);
}
/** Heat capacity (J/K) of the plates still on `room` (#258): what is not its cells' when a cell vents its share. */
const plateCapacityOf = (world, room) => (world.plates ? [...world.plates.values()].reduce((C, f) => C + (f.room === room.id && !f.released ? f.heatCapacity : 0), 0) : 0);
/** A plate that is gone takes its steel's heat capacity out of its room, venting its heat above rest as a destroyed cell vents its share (#258); once. */
function releasePlate(world, f) {
  if (f.released) return;
  f.released = true;
  ventCapacity(roomById(world, f.room).heat, f.heatCapacity, FIXED.restTemperature.value);
}
/** Damage what an entry stands for. */
const damageEntry = (world, x, loss, cause, channel) => (x.plate ? damagePlate(world, x.plate, loss, cause, channel) : damageCell(world, x.room, x.cell, loss, cause, channel));
/** Kinetic energy of the ship's bodies (translation and spin). */
const bodiesEnergy = (world) => world.ship.bodies.reduce((k, b) => k + 0.5 * b.M * (b.v[0] * b.v[0] + b.v[1] * b.v[1]) + 0.5 * b.I * b.omega * b.omega, 0);
/** The grid point (m, body b's own frame) of world point q: worldPoint's inverse. */
const gridPoint = (b, q) => { const r = rotate([q[0] - b.x[0], q[1] - b.x[1]], -b.theta); return [r[0] + b.c[0], r[1] + b.c[1]]; };
/** An impulse J (world, N s) at grid point p of body b, booked as external like thrust (a round or a field from outside the world). */
function receive(world, b, J, p) {
  const q = worldPoint(b, p), h = cross(q, J);
  applyImpulse(b, J, p);
  const x = world.ship.external;
  x.J[0] += J[0]; x.J[1] += J[1]; x.H += h; x.Hgross += Math.abs(h);
  world.ship.exchange.H += h; // a hit's or a field's part of H: it moves angular momentum between a round and a hull (B2)
}
/**
 * A kinetic round { mass, velocity, area, direction } along `path`, the room
 * cells it meets in order ([{ room, cell, chord }]) (#137, #206, 13e.1, 13i.1,
 * 13k.1). `velocity` is its speed relative to the hull it hits (#242);
 * `direction` its unit direction of travel in the grid frame of the body it
 * hits (required on a ship). Each cell resists r = matter.kineticResistance x
 * sigma x chord of sectional momentum (#232; chord in (0, 1], the fraction of
 * the edge the line crosses in that cell, default 1, #239) and the round takes
 * the same against its own strength (penetrateRound, #230): it flattens, and is
 * wrecked at f = 1. A destroyed cell is a hole and resists nothing (#212 (5));
 * a cell the round passes loses chord / kinetic.hitsToWreck of its integrity
 * (the kinetic pass, #273 (b), 13n.1 (b); a plate's chord is 1, its obliquity
 * is in sigma / cos theta, #258), the cell it stops in (sectional momentum
 * taken / r) / hitsToWreck, a hole nothing.
 * The books close at the target (F4, F5, 13k.1): on a ship each cell's
 * impulse, the momentum it took along the direction, is applied to the body
 * holding it at the entry's point on the round's line of action (an entry's
 * `at`, grid m: the midpoint of the round's chord through the cell, the plate's
 * crossing point; without one, the cell's centre or the plate's midpoint, the
 * same point for a line through the centres; B2, 13n.1 (b)) and booked as
 * external; the energy the system lost, the round's kinetic energy before less
 * after (world frame, the round taken at the hull's velocity at its first entry
 * plus its speed) less what the bodies gained, is heat in the rooms that took
 * momentum, split by the energy each entry took, (p_i^2 - p_{i+1}^2) / 2m with
 * p_i the momentum on entering entry i (L4 of 13n.1 (b); without a ship the hull
 * is at rest: 1/2 m (v^2 - v_exit^2)). Then the entries are damaged in path order
 * (heat first, as for the beam); a magazine with rounds detonates when the round
 * enters one of its standing cells at magazine.detonationSpeed or more (p_i / m,
 * relative to the hull, whether it stops there or passes; #273 (c)), before that
 * cell's own loss. Returns the penetration (per cell: r, the sectional momentum
 * taken as `absorbed`, the momentum taken as `impulse`, the momentum on entering
 * as `entry`; the sectional momentum on exit as `residual`, the momentum on exit,
 * the momentum left at the stop), the loss applied to each cell reached, the
 * heat each took and the total, and the detonation ({ entry, speed } or null).
 * A path entry { plate, chord } is an armour plate (13l.1, #255, #256): it
 * resists r = c x its entryArealDensity (thickness x FIXED.steelDensity over
 * cos theta, capped, #258) x chord like a cell, takes
 * the same losses (a hole at 0), its impulse acts at its crossing point (or its
 * segment's midpoint) on the body of the cell it is mounted on, its heat goes to
 * that cell's room.
 */
export function fireRound(world, { mass, velocity, area, direction = null }, path, cause) {
  const c = tierScaled(world, world.params.matter.kineticResistance), hits = tierScaled(world, world.params.kinetic.hitsToWreck);
  const s0 = sectionalMomentum(mass, velocity, area), strength = roundStrength(world, mass, area);
  path = withRooms(world, path); // a plate entry's heat goes to the room it is mounted on (13l.1)
  const r = path.map((x) => c * entryArealDensity(world, x) * (x.chord ?? 1));
  const res = penetrateRound({ momentum: mass * velocity, area, strength }, r);
  const losses = res.taken.map((a, i) => (r[i] === 0 ? 0 : (i < res.passed ? (path[i].chord ?? 1) : a / r[i]) / hits));
  const taken = res.impulse.reduce((x, y) => x + y, 0);
  // The momentum on entering each entry reached (the round rule's own arithmetic, damage.js penetrateRound).
  const entry = [];
  res.impulse.reduce((p, imp) => { entry.push(p); return p - imp; }, mass * velocity);
  let heat, u0 = null, u1 = null;
  if (world.ship) {
    if (!direction) throw new Error('fireRound on a ship needs the round\'s direction (13k.1)');
    const first = path.findIndex((x, i) => i < res.impulse.length && res.impulse[i] > 0);
    if (first < 0) heat = 0;
    else {
      const bodyOf = (x) => world.ship.bodies.find((b) => b.id === entryFragment(world, x));
      const b0 = bodyOf(path[first]), d0 = rotate(direction, b0.theta), hull = pointVelocity(b0, worldPoint(b0, entryPoint(world, path[first])));
      u0 = [hull[0] + velocity * d0[0], hull[1] + velocity * d0[1]];
      const K0 = bodiesEnergy(world);
      const J = [0, 0];
      res.impulse.forEach((imp, i) => {
        if (!(imp > 0)) return;
        const b = bodyOf(path[i]), d = rotate(direction, b.theta), Ji = [imp * d[0], imp * d[1]];
        receive(world, b, Ji, entryPoint(world, path[i]));
        J[0] += Ji[0]; J[1] += Ji[1];
      });
      u1 = [u0[0] - J[0] / mass, u0[1] - J[1] / mass];
      heat = 0.5 * mass * (u0[0] * u0[0] + u0[1] * u0[1] - u1[0] * u1[0] - u1[1] * u1[1]) - (bodiesEnergy(world) - K0);
      const book = world.ship.received ??= { J: [0, 0], heat: 0, field: [0, 0] };
      book.J[0] += J[0]; book.J[1] += J[1]; book.heat += heat;
      world.ship.energy.heat += heat;
    }
  } else {
    const w = res.momentum / mass;
    heat = 0.5 * mass * (velocity * velocity - w * w);
  }
  // The energy each entry took, (p_i^2 - p_{i+1}^2) / 2m (L4, 13n.1 (b)); the 1 / 2m cancels in the shares.
  const took = res.impulse.map((imp, i) => entry[i] * entry[i] - (entry[i] - imp) * (entry[i] - imp));
  const tookAll = took.reduce((x, y) => x + y, 0);
  const heats = took.map((e) => (taken > 0 && tookAll > 0 ? (heat * e) / tookAll : 0));
  heats.forEach((q, i) => { if (q !== 0) depositHeat(path[i].room.heat, q); });
  // The detonation (#273 (c)): the first standing cell of a magazine with rounds (or a missile bay with missiles in its
  // store, #148, 13n.1 (c)) the round enters at the threshold or more.
  const vd = tierScaled(world, world.params.magazine.detonationSpeed);
  const trigger = path.findIndex((x, i) => i < entry.length && !x.plate && (x.room.type === 'magazine' || x.room.type === 'missileBay') && r[i] > 0 && entry[i] / mass >= vd && !x.room.exploded && storeEnergy(world, x.room) > 0);
  let detonated = null;
  losses.forEach((loss, i) => {
    if (i === trigger) {
      const x = path[i];
      if (!x.room.exploded && !x.room.cells[x.cell].destroyed && storeEnergy(world, x.room) > 0) {
        detonated = { entry: i, speed: entry[i] / mass };
        const ev = event(world, x.room, 'detonation', cause, { cell: x.cell, speed: detonated.speed, channel: 'kinetic' });
        within(world.log, ev, () => detonate(world, x.room, cause));
      }
    }
    damageEntry(world, path[i], loss, cause, 'kinetic');
  });
  return {
    s0, r, strength, p0: mass * velocity, passed: res.passed, stoppedIn: res.stoppedIn, wrecked: res.wrecked, f: res.f, area: res.area,
    residual: res.residual, momentum: res.momentum, stopMomentum: res.stopMomentum, absorbed: res.taken, impulse: res.impulse, entry, losses, heats, heat, detonated,
    u0, u1, // on a ship: the round's world velocity before and after the hull (L4b's battle flies it on, js/battle.js)
  };
}
/**
 * B4 (13n.1 (b)): a round of mass m stopped in path entry x (a cell, or a plate on the cell it is mounted on) joins
 * the body holding that entry, at the entry's point (entryPoint). Its momentum m u and its angular momentum about the
 * world origin m q x u (q its world position, u its world velocity) join the body's, so both books are kept exactly;
 * the kinetic energy the joining loses is heat in the entry's room (booked like a hit's). It is part of the ship's
 * mass (world.ship.embedded) while its host stands and leaves with it as debris (rebalance). Returns that heat.
 */
export function embedRound(world, x, m, u, q) {
  const ship = world.ship;
  [x] = withRooms(world, [x]);
  const host = x.plate ? (plateGone(world, x.plate) ? null : x.plate) : (x.room.cells[x.cell].destroyed ? null : x.room.cells[x.cell]);
  const b = host && ship.bodies.find((y) => y.id === entryFragment(world, x));
  // Its host destroyed by the hit's own cascade (a detonation, a breach): the round leaves with it, as debris.
  if (!b) { ship.debris.push({ m, x: [...q], v: [...u], omega: 0, spin: 0, from: 'round', cause: 'embed', t: world.t }); return 0; }
  const K0 = 0.5 * b.M * (b.v[0] * b.v[0] + b.v[1] * b.v[1]) + 0.5 * b.I * b.omega * b.omega + 0.5 * m * (u[0] * u[0] + u[1] * u[1]);
  const P = [b.M * b.v[0] + m * u[0], b.M * b.v[1] + m * u[1]], L = b.M * cross(b.x, b.v) + b.I * b.omega + m * cross(q, u);
  ship.embedded.push({ id: ship.embedded.length + 1, m, p: entryPoint(world, x), plate: x.plate || null, room: x.room.id, cell: x.plate ? x.plate.k : x.cell });
  ship.items = shipItems(world);
  const props = propsOf(ship.items, b.id), origin = frameOrigin(b), rc = rotate(props.c, b.theta);
  const X = [origin[0] + rc[0], origin[1] + rc[1]], V = [P[0] / props.M, P[1] / props.M];
  Object.assign(b, { M: props.M, c: props.c, I: props.I, x: X, v: V, omega: (L - props.M * cross(X, V)) / props.I });
  const heat = K0 - (0.5 * b.M * (V[0] * V[0] + V[1] * V[1]) + 0.5 * b.I * b.omega * b.omega);
  depositHeat(x.room.heat, heat);
  ship.energy.heat += heat;
  return heat;
}
/**
 * Kinetic energy (J) of each atom a beam bay of N = room.length cells fires
 * (#234, #249): at T1, beam.gradient x N x edge; at the world's tier, the
 * energy E whose CSDA range in iron (csdaRange, FIXED iron constants) is the
 * T1 bay's range x sigma(tier) / sigma(T1), sigma = armour.cellMass at the
 * tier over edge^2, so the bay reaches the same depth in armour cells at
 * every tier (electronic stopping only; the nuclear part of the profile
 * drifts, #249). Bisection from the T1 energy to a relative 1e-12; an exact
 * hit returns at once, so at T1 the result is the T1 energy itself. Cached
 * per N on the world (its params and edge are fixed).
 */
export function beamEnergy(world, room) {
  const N = room.length;
  world.beamEnergies ??= new Map();
  const known = world.beamEnergies.get(N);
  if (known !== undefined) return known;
  const p = world.params, f = FIXED;
  const c = { protonRest: f.protonRestEnergy.value, electronRest: f.electronRestEnergy.value, K: f.betheK.value, ZA: f.ironZOverA.value, I: f.ironMeanExcitation.value };
  const sigma = (edge) => scaled(p.armour.cellMass, edge) / (edge * edge);
  const E1 = tierScaled(world, p.beam.gradient) * N * BASE_EDGE;
  const target = csdaRange(E1, c) * (sigma(world.edge) / sigma(BASE_EDGE));
  let lo = E1, hi = E1, E = E1;
  if (csdaRange(lo, c) !== target) {
    while (csdaRange(lo, c) > target) { hi = lo; lo /= 2; }
    while (csdaRange(hi, c) < target) { lo = hi; hi *= 2; }
    while (hi - lo > 1e-12 * hi) {
      const mid = (lo + hi) / 2;
      if (csdaRange(mid, c) < target) lo = mid; else hi = mid;
    }
    E = (lo + hi) / 2;
  }
  world.beamEnergies.set(N, E);
  return E;
}
/**
 * One step of a neutral particle beam (#229, 13i.1, 13k.1) along `path` ([{
 * room, cell, chord }], the cells it meets in order): `power` (W) is what
 * reaches the hull (the shield absorbs first, at the entry point, as at L2: it
 * removes particles, not energy per particle, so the caller passes what it let
 * through and the survivors' depth is unchanged, F17); `energy` (J) is each
 * atom's kinetic energy (the firing bay's beamEnergy); `range` (m) is the
 * distance from the emitter, which changes nothing: no falloff at battle range
 * (#230). The beam crosses sigma x chord of each cell (chord default 1, #239).
 * Cell i receives P F_i (beamDeposit) as heat in its room, then loses P F_i dt
 * / (matter.burnEnergyPerKg x its cell mass) of its integrity (channel
 * 'thermal', #240 (1)): the deposit comes first, the damage second, so a cell
 * destroyed in that step takes its share of the room's heat with it (F21). The
 * fractions are recomputed whenever a cell on the path has become a hole. What
 * is left after the path leaves the ship. A plate entry { plate, chord, cos }
 * (13l.1) crosses its entryArealDensity x chord; its deposit is heat in the
 * room it is mounted on, and it burns by the same law with its own mass:
 * P F dt / (matter.burnEnergyPerKg x the plate's mass) (#240 (1), #258).
 * Returns the fractions and the energies of the step.
 */
export function fireBeam(world, { power, energy, range = 0 }, path, cause) {
  path = withRooms(world, path); // a plate's deposit is heat in the room it is mounted on (13l.1)
  const sigmas = path.map((x) => entryArealDensity(world, x) * (x.chord ?? 1));
  const key = `${energy}|${sigmas.join(',')}`;
  world.beamPaths ??= new Map();
  let dep = world.beamPaths.get(key);
  if (!dep) {
    const f = FIXED;
    dep = beamDeposit(energy, sigmas, { protonRest: f.protonRestEnergy.value, electronRest: f.electronRestEnergy.value, K: f.betheK.value, ZA: f.ironZOverA.value, I: f.ironMeanExcitation.value, lambda: f.ironInteractionLength.value });
    world.beamPaths.set(key, dep);
  }
  const dt = world.dt, q = tierScaled(world, world.params.matter.burnEnergyPerKg);
  const energies = dep.fractions.map((F) => power * F * dt);
  const ruin = path.map((x) => q * (x.plate ? x.plate.mass : cellMassOf(world, x.room)));
  path.forEach((x, i) => { if (energies[i] > 0) depositHeat(x.room.heat, energies[i]); });
  path.forEach((x, i) => { if (energies[i] > 0) damageEntry(world, x, energies[i] / ruin[i], cause, 'thermal'); }); // a plate burns by its own mass (#258)
  return { power, range, energy, delivered: power, fractions: dep.fractions, exit: dep.exit, energies, escaped: power * dep.exit * dt };
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
    const own = room.exploded || !room.active ? 0 : (BEHAVIOUR[room.type]?.(world, room) || 0) + (room.rcs ? rcsHeat(world, room) : 0) + (room.antennas ? scanHeat(world, room) : 0) + (room.pdLasers ? laserHeat(world, room) : 0);
    const external = room.externalPower * dt;
    if (conducted) heatStep(room.heat, own + external, irBrightness(world, room), dt, conducted.get(room) || 0, pumped.get(room) || 0);
    else heatStep(room.heat, own + external, irBrightness(world, room), dt);
  }
  if (world.layout) feedTurrets(world);
  if (world.ship) shipStep(world);
  world.step++;
  world.t = world.step * dt;
  // A state reached during the step is reported at its end, like the thresholds.
  for (const r of world.repaired) event(world, r.room, 'cell-repaired', r.cause, { cell: r.cell }, r.room.cells[r.cell].lastEvent || 'launch'); // its parent: the damage it repaired
  world.repaired = [];
  // An EMP's outage ends at the first step boundary at or after its end (13n.1 (c), #292): the room works from the next step.
  for (const room of world.rooms) if (room.outage && world.t >= room.outage.end) { room.outage = null; event(world, room, 'outage-ended', 'emp', {}, room.marks.outage); }
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
    if (room.shutdown) { room.shutdown = false; room.marks.restart = event(world, room, 'restart', 'heat').id; }
    return;
  }
  const ev = event(world, room, x, 'heat');
  if (x === 'overheated' && !room.shutdown && !room.exploded) {
    room.shutdown = true;
    const sd = event(world, room, 'shutdown', 'heat', {}, ev.id);
    room.marks.shutdown = sd.id;
    within(world.log, sd, () => ON_SHUTDOWN[room.type]?.(world, room));
  }
  if (x === 'critical' && !room.exploded) { // an exploded room never explodes or melts down again (#189 (4))
    within(world.log, ev, () => {
      killCrew(world, room, room.crew, 'heat'); // #18b
      ON_CRITICAL[room.type]?.(world, room);
    });
  }
}

function explode(world, room, energy, cause) {
  const before = room.cells.reduce((x, c) => x + (c.destroyed ? 0 : c.integrity), 0); // its remaining integrity (13l.1, #216 (3))
  room.exploded = true;
  for (const c of room.cells) { c.integrity = 0; c.destroyed = true; }
  const ev = event(world, room, 'explosion', cause, { energy, channel: 'blast' });
  room.marks.destroyed = ev.id;
  within(world.log, ev, () => {
    killCrew(world, room, room.crew, cause);
    if (world.layout && room.placed) blastThroughWalls(world, room, energy, before);
    if (world.ship) { rebalance(world, cause); updateControl(world, cause); }
  });
}

// ---------- reactor (#81, #183) ----------
function reactorPower(world, room) {
  return tierScaled(world, world.params.reactor.power) * room.footprintFactor;
}
function reactorAble(room) {
  return room.controlled && !down(room) && !room.reactor.scrammed && !isDestroyed(room);
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
  const energy = down(room) ? 0 : startDecay(world, room);
  room.marks.scram = event(world, room, 'scram', cause, { energy }).id;
}
function explosionEnergy(world, room) {
  // Size rule only in a cluster (L1.reactor.breach locks 200 MJ for an L reactor alone).
  if (world.sizeRule) return tierScaled(world, world.params.reactor.explosionEnergy) * room.cellRatio;
  return tierScaled(world, world.params.reactor.explosionEnergy);
}
const INIT = {
  reactor(world, room) {
    room.reactor = { demand: 0, delivered: 0, routed: 0, scrammed: false, decay: [], decayHeat: 0, energyDelivered: 0, breachStep: null, breachCause: null, restartStep: null };
  },
  magazine(world, room) {
    room.magazine = { size: 'M', ap: 0, he: 0 }; // a turret magazine; loadMagazine adds `type` for another weapon's (13n.1 (b))
  },
  turret(world, room) {
    // hold: the gun holds its fire (L3: a ship's turret fires only when told); aim: its firing direction in the ship's frame.
    room.turret = { ammo: 0, shots: 0, impulse: 0, energyDrawn: 0, ceased: false, anchor: 0, sinceAnchor: 0, lastShot: null, hold: false, aim: [0, 1] };
  },
  shieldGenerator(world, room) {
    room.shield = { on: true, incoming: 0, strength: 1, absorbed: 0, passed: 0, em: 0, absorbedEnergy: 0, passedEnergy: 0, energyDrawn: 0, down: false, buffer: null, paid: 0, impulseHeat: 0 };
    Object.defineProperty(room.shield, 'roundEm', { value: 0, writable: true, enumerable: false }); // W: rounds' payments as EM (13n.1 (a)); not enumerable, so a record of the shield's state stays as it was
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
  railgun(world, room) {
    // firing: the order (a battle sets it); slugs: kg of slugs of a railgun alone (L1: no magazine without a cluster).
    room.railgun = { firing: false, slugs: 0, shots: 0, impulse: 0, energyDrawn: 0, draw: 0, ceased: true, anchor: 0, sinceAnchor: 0, lastShot: null };
  },
  missileBay(world, room) {
    // ready: the store, one { seeker, warhead } per missile (#148); launching: the order; face: the open edge it launches
    // from ({ cell, side }, else its first open edge).
    room.missileBay = { ready: [], launches: 0, launching: false, lastLaunch: null, face: null };
  },
};

const BEHAVIOUR = {
  reactor(world, room) {
    const r = room.reactor, dt = world.dt, tau = tierScaled(world, world.params.reactor.decayTime);
    // Decay heat integrated exactly over the step (the source is known in closed form).
    let decay = 0;
    for (const d of r.decay) decay += d.P0 * tau * (exp(-(world.t - d.start) / tau) - exp(-(world.t + dt - d.start) / tau));
    r.decayHeat += decay;
    if (world.power) r.delivered = reactorAble(room) ? r.routed : 0; // a reactor delivers only what is routed (#193)
    else r.delivered = reactorAble(room) ? r.demand * reactorPower(world, room) * survivingFraction(room) : 0;
    r.energyDelivered += r.delivered * dt;
    return decay + tierScaled(world, world.params.reactor.heatPerPower) * r.delivered * dt;
  },
  turret(world, room) {
    const s = room.turret, dt = world.dt, p = world.params;
    const able = room.powered && room.controlled && !down(room) && !isDestroyed(room) && s.ammo > 0;
    if (!able) {
      if (!s.ceased) {
        s.ceased = true;
        const cause = s.ammo <= 0 ? 'dry' : !room.powered ? 'no-power' : room.shutdown ? 'heat' : room.unmanned ? 'unmanned' : room.outage ? 'outage' : !room.controlled ? 'no-control' : 'destroyed';
        event(world, room, 'cease-fire', cause, {}, reasonParent(world, room, cause));
      }
      return 0;
    }
    if (s.hold) { // holding fire: ready to fire, drawing its power (#185 (6)), no shot
      if (!s.ceased) { s.ceased = true; event(world, room, 'cease-fire', 'hold', {}, 'launch'); } // an order
      s.energyDrawn += tierScaled(world, p.turret.powerDraw) * room.footprintFactor * survivingFraction(room) * supply(world, room) * dt;
      return 0;
    }
    // Shots on accumulated time (#189 (5)): since the turret last became able
    // to fire (at s.anchor), shot k is due at anchor + k / rate, so the step
    // remainder carries over and 1 + floor(rate t) holds at any rate. A shot
    // is fired in the step that contains its due time, at that time.
    // Fire rate: L1, x 1 / sizeLinear in a cluster (size rule), x the power fraction (#193).
    const rate = world.sizeRule ? (tierScaled(world, p.turret.fireRate) / FIXED.sizeLinear.value[room.size]) * supply(world, room) : tierScaled(world, p.turret.fireRate);
    // A typed store (13n.1 (c), #95): the type the battle chose for its target if the store holds it, else Standard, else
    // what it holds; rounds fed from a magazine's untyped slots fly as Standard. An AP round rams slower: the interval
    // before it is rounds.apLength / rate (#295), carried in s.extra (whole intervals added) so a store without AP fires
    // on L1's schedule.
    const pick = s.typed ? pickRound(s) : null;
    const factor = pick ? roundFactor(world, ROUNDS[pick.type].rate) : 1;
    // Able again (fed, powered): the next shot is due now, but never sooner than 1 / rate after the last one.
    if (s.ceased) { s.ceased = false; s.anchor = s.lastShot === null ? world.t : Math.max(world.t, s.lastShot + factor / rate); s.sinceAnchor = 0; if (s.typed) s.extra = 0; }
    const pend = pick && s.sinceAnchor > 0 ? factor - 1 : 0;
    const due = s.anchor + (s.typed ? s.sinceAnchor + s.extra + pend : s.sinceAnchor) / rate;
    let heat = 0, until = dt; // the part of this step during which a round is left
    if (world.step >= stepContaining(due, dt)) {
      // Offset of the shot within the step: 0 on a step boundary or when late.
      const at = world.step === stepContaining(due, dt) && !onStep(due, dt) ? Math.min(dt, Math.max(0, due - world.t)) : 0;
      const typed = pick && !pick.legacy ? roundOf(world, room.size, pick.type) : null;
      const m = typed ? typed.m : tierScaled(world, p.kinetic.roundMass) * FIXED.sizeLinear.value[room.size] ** 3;
      const v = typed ? typed.v : tierScaled(world, p.kinetic.muzzleVelocity);
      s.ammo--;
      if (typed) s.typed[pick.type]--;
      if (pick) s.extra += pend;
      s.shots++;
      s.sinceAnchor++;
      s.impulse += (typed ? m + typed.petals : m) * v; // recoil (Newton 3): a sabot's petals leave with the penetrator (#295)
      const cause = `${room.id}:shot-${s.shots}`;
      if (world.ship) recoil(world, room, m, v, at, cause, typed ? { A: typed.A, type: typed.type, petals: typed.petals, burst: typed.burst } : null); // on the ship's body (13f.1), launched at world.t + at (F20)
      s.lastShot = world.t + at;
      heat += world.sizeRule ? tierScaled(world, p.turret.heatPerShot) * FIXED.sizeLinear.value[room.size] ** 3 : tierScaled(world, p.turret.heatPerShot);
      const what = pick ? { roundType: pick.type } : {}; // a typed store names the type it fired
      room.marks.lastShot = event(world, room, 'shot', cause, { t: world.t + at, energy: 0.5 * (typed ? m + typed.petals : m) * v * v, channel: 'kinetic', ...what }).id; // a root: its parent is its own shot id
      if (s.ammo <= 0) {
        until = at;
        s.ceased = true;
        event(world, room, 'cease-fire', 'dry', { t: world.t + at }, room.marks.lastShot);
      }
    }
    if (until > 0) s.energyDrawn += tierScaled(world, p.turret.powerDraw) * room.footprintFactor * survivingFraction(room) * supply(world, room) * until;
    return heat;
  },
  shieldGenerator(world, room) {
    const s = room.shield, dt = world.dt, p = world.params.shield;
    s.roundEm = 0; // the rounds' part of the EM brightness, paid after the last step (shieldRound, 13n.1 (a))
    const able = s.on && room.powered && room.controlled && !down(room) && !isDestroyed(room);
    if (!able) {
      if (!s.down) { s.down = true; const why = !s.on ? 'off' : !room.powered ? 'no-power' : room.shutdown ? 'heat' : room.unmanned ? 'unmanned' : room.outage ? 'outage' : !room.controlled ? 'no-control' : 'destroyed'; event(world, room, 'shield-down', why, {}, reasonParent(world, room, why)); }
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
    const able = room.powered && room.controlled && !down(room) && !isDestroyed(room);
    const f = able ? e.throttle * room.footprintFactor * survivingFraction(room) * supply(world, room) : 0;
    e.thrust = f * tierScaled(world, p.thrust);
    e.draw = f * tierScaled(world, p.powerDraw);
    e.acceleration = world.shipMass ? e.thrust / world.shipMass : 0;
    return e.draw * p.heatFraction.value * world.dt;
  },
  quarters(world, room) {
    const q = room.quarters, dt = world.dt, p = world.params;
    if (!room.powered || down(room) || isDestroyed(room)) return 0;
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
    if (down(room) || isDestroyed(room)) return 0;
    const draw = tierScaled(world, world.params.bridge.powerDraw) * survivingFraction(room) * world.dt;
    if (room.powered) b.fromReactor += draw; else b.fromBackup += draw; // backup has no limit (#147)
    return draw;
  },
  beamBay(world, room) {
    const s = room.beamBay, dt = world.dt, p = world.params;
    const able = s.firing && room.powered && room.controlled && !down(room) && !isDestroyed(room);
    if (!able) {
      // An overheated bay under routing asks for no power, so heat is named before power (#227 Q9, 13k.1).
      if (s.firing && !s.stopped) { s.stopped = true; const why = room.shutdown ? 'heat' : room.unmanned ? 'unmanned' : room.outage ? 'outage' : !room.powered ? 'no-power' : !room.controlled ? 'no-control' : 'destroyed'; event(world, room, 'beam-stopped', why, {}, reasonParent(world, room, why)); }
      s.beam = 0; s.draw = 0;
      return 0;
    }
    s.stopped = false;
    s.beam = tierScaled(world, p.beam.power) * room.footprintFactor * survivingFraction(room) * supply(world, room);
    s.draw = s.beam / tierScaled(world, p.beambay.efficiency);
    s.beamEnergy += s.beam * dt; s.energyDrawn += s.draw * dt;
    return (s.draw - s.beam) * dt;
  },
  /**
   * The spinal railgun (13n.1 (c), #236 (6)): while ordered to fire, fed (a railgun magazine with a slug on a live wall;
   * a railgun alone its own slugs), powered, controlled and up, it fires a steel slug along its ship's axis (+x) at
   * railgunSlug's speed, shot k due at anchor + k / rate as the turret's (rate railgun.fireRate, x 1 / sizeLinear in a
   * cluster, x the power fraction); its draw is the muzzle energy / railgun.efficiency spread over the reload (a capacitor
   * is not modelled), and the draw less the muzzle energy is heat in the room each step. Recoil -m v along the axis at
   * the room's centre (#5).
   */
  railgun(world, room) {
    const s = room.railgun, dt = world.dt;
    const source = s.firing ? slugSource(world, room) : null;
    const able = s.firing && room.powered && room.controlled && !down(room) && !isDestroyed(room) && source !== null;
    if (!able) {
      if (!s.ceased) {
        s.ceased = true; // not able, or not ordered: the next shot is due when it is again
        if (!s.firing) { s.draw = 0; return 0; }
        const cause = source === null ? 'dry' : !room.powered ? 'no-power' : room.shutdown ? 'heat' : room.unmanned ? 'unmanned' : room.outage ? 'outage' : !room.controlled ? 'no-control' : 'destroyed';
        event(world, room, 'cease-fire', cause, {}, reasonParent(world, room, cause));
      }
      s.draw = 0;
      return 0;
    }
    const slug = railgunSlug(world, room), f = supply(world, room), rate = railgunRate(world, room) * f;
    if (s.ceased) { s.ceased = false; s.anchor = s.lastShot === null ? world.t : Math.max(world.t, s.lastShot + 1 / rate); s.sinceAnchor = 0; }
    const due = s.anchor + s.sinceAnchor / rate;
    const eff = tierScaled(world, world.params.railgun.efficiency);
    s.draw = (slug.energy / eff) * rate; // W: the muzzle energy over the efficiency, spread over the reload
    s.energyDrawn += s.draw * dt;
    const heat = s.draw * (1 - eff) * dt; // the draw less what becomes muzzle energy, every step of the reload
    if (world.step >= stepContaining(due, dt)) {
      const at = world.step === stepContaining(due, dt) && !onStep(due, dt) ? Math.min(dt, Math.max(0, due - world.t)) : 0;
      if (source === 'own') s.slugs -= slug.m;
      else {
        // The slug moves from the magazine into the barrel (mass moved inside, books kept: moveInside), then leaves it.
        source.magazine.slugMass -= slug.m;
        s.chamber = slug.m;
        if (world.ship) moveInside(world);
        s.chamber = 0;
      }
      s.shots++;
      s.sinceAnchor++;
      s.impulse += slug.m * slug.v;
      const cause = `${room.id}:slug-${s.shots}`;
      if (world.ship) recoil(world, room, slug.m, slug.v, at, cause, { dir: [1, 0], A: slug.A, type: 'slug' }); // along the axis (+x of its ship) at its centre
      s.lastShot = world.t + at;
      room.marks.lastShot = event(world, room, 'slug', cause, { t: world.t + at, energy: slug.energy, channel: 'kinetic' }).id; // a root
    }
    return heat;
  },
  /**
   * The missile bay (#148, 13n.1 (c)): while ordered to launch, controlled and up, with a missile in its ready store, it
   * launches one at the start of a step, never sooner than missilebay.launchInterval after the last: the missile leaves
   * its open face at that point's velocity (no recoil: it leaves the tube at rest relative to the hull) with its heading
   * along the face's outward normal, into world.ship.missiles (js/missile.js flies it). Needs a ship.
   */
  missileBay(world, room) {
    const s = room.missileBay, p = world.params;
    // Its draw as the turret's rule (#301, 13n.1 (d), §17 item 46): turret.powerDraw x its footprint factor x its surviving
    // fraction x its power fraction, while it could launch (controlled, up, a missile in its store, power reaching it); a
    // bay cut from every producing reactor (no power routed to it) neither draws nor launches.
    if (!room.controlled || down(room) || isDestroyed(room) || s.ready.length === 0 || !room.powered) return 0;
    s.energyDrawn = (s.energyDrawn || 0) + tierScaled(world, p.turret.powerDraw) * room.footprintFactor * survivingFraction(room) * supply(world, room) * world.dt;
    if (!s.launching || !world.ship) return 0;
    const interval = tierScaled(world, p.missilebay.launchInterval);
    if (s.lastLaunch !== null && world.t < s.lastLaunch + interval - 1e-9 * interval) return 0;
    const kind = s.ready.shift(), face = launchFace(world, room);
    const b = world.ship.bodies.find((x) => x.id === room.cells[face.k].fragment) || world.ship.bodies.find((x) => x.id === room.body);
    if (!b) return 0;
    const q = worldPoint(b, face.p), vq = pointVelocity(b, q), n = rotate(face.side, b.theta);
    world.ship.items = shipItems(world); // the missile has left the store (its mass sat at the face)
    reshape(b, propsOf(world.ship.items, b.id));
    s.launches++;
    s.lastLaunch = world.t;
    const cause = `${room.id}:missile-${s.launches}`, m = tierScaled(world, p.missile.mass);
    world.ship.missiles.push({ m, x: q, v: [...vq], heading: [...n], t: world.t, from: room.id, cause, seeker: kind.seeker, warhead: kind.warhead, x0: [...q] });
    room.marks.lastShot = event(world, room, 'missile-launched', cause, { seeker: kind.seeker, warhead: kind.warhead, energy: 0, channel: 'kinetic' }).id; // a root
    return 0;
  },
};

// ---------- round types, the railgun's slug, the missile bay's face (13n.1 (c)) ----------
/** A ROUNDS entry's factor: 1, or the value of the PARAMS constant it names (k = 0). */
const roundFactor = (world, f) => (typeof f === 'string' ? param(world, f).value : f);
/**
 * A round of `type` (ROUNDS) at a size: `full` the M round's mass x size^3 (what a magazine slot holds), `m` the mass
 * that flies (x its steel fraction), `v` its muzzle speed (x its velocity factor), `A` its cross-section (a steel
 * cylinder of FIXED.roundLengthToDiameter x its length factor), `petals` what leaves with it at v without being part
 * of it (a sabot's, when its impulse is the full round's), `burst` its burst energy (he.blastEnergy x size^3) or 0, and
 * `held` the mass it weighs in a store (an HE round its steel: its burst is energy, not mass).
 */
export function roundOf(world, size = 'M', type = 'standard') {
  const t = ROUNDS[type];
  if (!t) throw new Error(`unknown round type ${type}`);
  const s3 = FIXED.sizeLinear.value[size] ** 3, p = world.params, full = tierScaled(world, p.kinetic.roundMass) * s3;
  const m = full * roundFactor(world, t.steel), v = tierScaled(world, p.kinetic.muzzleVelocity) * roundFactor(world, t.velocity);
  const { A } = roundGeometry(m, FIXED.steelDensity.value, FIXED.roundLengthToDiameter.value * roundFactor(world, t.length));
  const petals = t.impulse === 'full' ? full - m : 0;
  return { type, full, m, v, A, petals, held: m + petals, burst: t.burst ? tierScaled(world, param(world, t.burst)) * s3 : 0 };
}
/** The turret's round types, in the order a store falls back through. */
export const TURRET_TYPES = ['standard', 'ap', 'he', 'sabot'];
const typedCount = (store) => (store ? TURRET_TYPES.reduce((n, k) => n + (store[k] || 0), 0) : 0);
/** The round a typed turret fires (#95, 13n.1 (c)): its wanted type if held, else Standard, else the first it holds; Standard from untyped rounds first. */
function pickRound(s) {
  const legacy = s.ammo - typedCount(s.typed);
  const has = (k) => (k === 'standard' && legacy > 0) || s.typed[k] > 0;
  const type = s.want && has(s.want) ? s.want : has('standard') ? 'standard' : TURRET_TYPES.find(has) || 'standard';
  return { type, legacy: type === 'standard' && legacy > 0 };
}
/** The railgun's slug (13n.1 (c)): railgun.roundMass x size^3 of steel at railgun.muzzleVelocity x sqrt(N / 2), N its cells along the axis. */
export function railgunSlug(world, room) {
  const p = world.params.railgun, m = tierScaled(world, p.roundMass) * FIXED.sizeLinear.value[room.size] ** 3;
  const v = tierScaled(world, p.muzzleVelocity) * Math.sqrt(room.length / 2), { A } = roundGeometry(m, FIXED.steelDensity.value, FIXED.roundLengthToDiameter.value);
  return { m, v, A, energy: 0.5 * m * v * v };
}
/** Slugs a second at most: railgun.fireRate (k = -1), x 1 / sizeLinear in a cluster (the size rule's per-round rate). */
const railgunRate = (world, room) => (world.sizeRule ? tierScaled(world, world.params.railgun.fireRate) / FIXED.sizeLinear.value[room.size] : tierScaled(world, world.params.railgun.fireRate));
/** The railgun's mean draw (W) while it fires at its full rate: the muzzle energy / railgun.efficiency x the rate. */
const railgunDraw = (world, room) => (railgunSlug(world, room).energy / tierScaled(world, world.params.railgun.efficiency)) * railgunRate(world, room);
/** Where the railgun's next slug comes from: a railgun magazine holding one on a live wall (first by room id), 'own' for a railgun alone holding one, else null. */
function slugSource(world, room) {
  const m = railgunSlug(world, room).m;
  if (!world.layout) return room.railgun.slugs >= m ? 'own' : null;
  for (const w of liveWalls(world)) {
    if (!(w.live > 0)) continue;
    const mag = w.a === room ? w.b : w.b === room ? w.a : null;
    if (mag && mag.type === 'magazine' && !mag.exploded && magazineType(mag) === 'railgun' && mag.magazine.slugMass >= m) return mag;
  }
  return null;
}
/** Slugs for a railgun alone (L1, no magazine): kg of steel. */
export function loadRailgun(room, kg) {
  room.railgun.slugs = kg;
}
/** The open edge a missile bay launches from: its `face` ({ cell, side }) or its first open edge (cell order; sides +y, -y, +x, -x); { k, cell, side, p (grid m) }. */
function launchFace(world, room) {
  const cells = world.layout.rooms.get(room.id).cells, set = room.missileBay.face;
  const open = (c, sd) => !world.layout.occupied.has(`${c[0] + sd[0]},${c[1] + sd[1]}`);
  for (let k = 0; k < cells.length; k++) {
    for (const side of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      if (set && !(set.cell[0] === cells[k][0] && set.cell[1] === cells[k][1] && set.side[0] === side[0] && set.side[1] === side[1])) continue;
      if (open(cells[k], side)) return { k, cell: [...cells[k]], side, p: edgeMidpoint(world.edge, cells[k], side) };
    }
  }
  throw new Error(`${room.id}: a missile bay needs an open face`);
}

const ON_SHUTDOWN = {
  reactor(world, room) {
    if (!room.reactor.scrammed) startDecay(world, room);
  },
};

const ON_CRITICAL = {
  reactor(world, room) {
    const ev = event(world, room, 'meltdown', 'heat');
    within(world.log, ev, () => explode(world, room, explosionEnergy(world, room), 'heat'));
  },
  magazine(world, room) {
    if (magazineContents(world, room).energy <= 0) return;
    const ev = event(world, room, 'cook-off', 'heat');
    within(world.log, ev, () => detonate(world, room, 'heat'));
  },
};

const ON_CELL_DESTROYED = {
  reactor(world, room, cause) {
    const r = room.reactor, p = world.params.reactor;
    if (survivingCells(room) === 0) { r.breachStep = null; explode(world, room, explosionEnergy(world, room), cause); return; }
    if (r.breachStep === null && destroyedCells(room) / room.cells.length >= p.breachFraction.value) {
      r.breachStep = world.step + stepsAtLeast(p.breachCountdown.value, world.dt);
      r.breachCause = cause;
      r.breachEvent = event(world, room, 'breach', cause).id; // the parent of the explosion it leads to (13l.1)
    }
  },
  missileBay(world, room) {
    if (survivingCells(room) === 0) room.missileBay.ready = []; // its missiles leave as debris with its last cell (rebalance)
  },
  magazine(world, room) {
    // A destroyed cell alone no longer detonates it (#273 (c)); with its last cell its rounds leave as debris,
    // unexploded (13n.1 (b)): their mass leaves with the room's contents (rebalance), nothing is left to cook off.
    if (survivingCells(room) === 0) emptyMagazine(room);
  },
  bridge(world, room, cause) {
    if (survivingCells(room) === 0 && room.bridge.control) { room.bridge.control = false; room.marks.controlLost = world.log.bridgeChange = event(world, room, 'control-lost', cause).id; }
  },
  heatSink(world, room, cause) {
    // A destroyed cell vents its share of the heat above rest; the buffer shrinks, T is unchanged (#198).
    const energy = ventCell(room.heat, survivingCells(room) + 1, FIXED.restTemperature.value, plateCapacityOf(world, room));
    event(world, room, 'heat-vented', cause, { energy });
  },
};

const TIMERS = {
  // A missile bay's store cooks off at thermal.magazineCritical as a magazine's rounds do (#301, §17 item 46): its
  // warheads and fuel (bayContents) explode, whatever its own (crewed) thresholds.
  missileBay(world, room) {
    if (room.exploded || bayContents(world, room).energy <= 0 || temperature(room.heat) < tierScaled(world, world.params.thermal.magazineCritical)) return;
    const ev = event(world, room, 'cook-off', 'heat');
    within(world.log, ev, () => detonate(world, room, 'heat'));
  },
  reactor(world, room) {
    const r = room.reactor;
    if (r.breachStep !== null && !room.exploded && world.step >= r.breachStep) within(world.log, { id: r.breachEvent }, () => explode(world, room, explosionEnergy(world, room), r.breachCause));
    // The SCRAM restart (#82, 13k.1): restartTime after control came back, once below hot.
    if (r.scrammed && !room.exploded && room.controlled && r.restartStep !== null && world.step >= r.restartStep && temperature(room.heat) < room.thresholds.hot) {
      r.scrammed = false;
      r.restartStep = null;
      event(world, room, 'reactor-restart', 'restart', {}, room.marks.controlRestored || 'launch');
    }
  },
  bridge(world, room) {
    // Control while any cell survives (#147: power cut does not matter). An
    // overheated or switched-off bridge gives no control (13c.1).
    const control = survivingCells(room) > 0 && !down(room) && room.active;
    if (room.bridge.control && !control) { room.bridge.control = false; const why = !room.active ? 'off' : room.shutdown ? 'overheat' : room.outage ? 'outage' : 'unmanned'; room.marks.controlLost = world.log.bridgeChange = event(world, room, 'control-lost', why, {}, reasonParent(world, room, why)).id; }
    else if (!room.bridge.control && control) { room.bridge.control = true; const why = room.active && !room.bridge.wasOff ? 'restart' : 'on'; world.log.bridgeChange = event(world, room, 'control-restored', why, {}, why === 'restart' ? room.marks.restart || 'heat' : 'launch').id; }
    room.bridge.wasOff = !room.active;
  },
};

// ---------- magazine (#91, #183) ----------
/** Ammunition mass the magazine holds (kg): L1's capacity, x the cell ratio in a cluster (size rule). */
export function magazineCapacity(world, room) {
  if (world.sizeRule) return tierScaled(world, world.params.magazine.capacity) * room.cellRatio;
  return tierScaled(world, world.params.magazine.capacity);
}
/** The weapon types a magazine holds munitions for (13n.1 (b), one magazine per weapon type). */
export const MAGAZINE_TYPES = ['turret', 'railgun', 'missile'];
/** A magazine's weapon type: `turret` unless loaded for another. */
export const magazineType = (room) => room.magazine.type || 'turret';
/**
 * Load a magazine for one weapon type (13n.1 (b)): `turret` rounds of one size by mass (kg; counts are whole
 * rounds; `order` is the loading order the feed takes them in), `railgun` slugs by mass (`slugMass`, kg: steel,
 * no propellant), `missile`s by mass (`missileMass`, kg; whole missiles of missile.mass, one `seeker` and `warhead` per
 * load slot, 13n.1 (c)). Typed turret rounds (L5c, ROUNDS, #94): `rounds` { standard, ap, he, sabot } in kg, one
 * type per load slot, each round a full round's mass of the slot (a sabot's petals included; an HE round's burst
 * takes the rest of its slot), fed in the order the object lists them after the untyped `apMass` and `heMass`
 * (L4's, which fly as Standard). A weapon is fed only by a magazine of its type (feedTurrets, js/battle.js weaponStates).
 */
export function loadMagazine(world, room, { type = 'turret', size = 'M', apMass = 0, heMass = 0, slugMass = 0, missileMass = 0, seeker = 'designated', warhead = 'he', rounds = null, order = ['ap', 'he'] }) {
  if (!MAGAZINE_TYPES.includes(type)) throw new Error(`unknown magazine type ${type}`);
  const capacity = magazineCapacity(world, room), typedMass = rounds ? Object.values(rounds).reduce((x, y) => x + y, 0) : 0;
  room.loadingOrder = order;
  if (apMass + heMass + slugMass + missileMass + typedMass > capacity) throw new Error(`magazine holds at most ${capacity} kg`);
  if (type === 'railgun') { Object.assign(room.magazine, { type, size, ap: 0, he: 0, slugMass }); return room.magazine; }
  if (type === 'missile') {
    if (!SEEKER_KINDS.includes(seeker) || !WARHEAD_KINDS.includes(warhead)) throw new Error(`unknown missile type ${seeker} / ${warhead}`);
    delete room.magazine.typed;
    Object.assign(room.magazine, { type, size, ap: 0, he: 0, missiles: Math.floor(missileMass / tierScaled(world, world.params.missile.mass)), seeker, warhead });
    return room.magazine;
  }
  const m = tierScaled(world, world.params.kinetic.roundMass) * FIXED.sizeLinear.value[size] ** 3;
  delete room.magazine.type; delete room.magazine.slugMass; // a turret magazine keeps L1's shape
  delete room.magazine.missiles; delete room.magazine.seeker; delete room.magazine.warhead; delete room.magazine.typed;
  Object.assign(room.magazine, { size, ap: Math.floor(apMass / m), he: Math.floor(heMass / m) });
  if (rounds) {
    for (const k of Object.keys(rounds)) if (!TURRET_TYPES.includes(k)) throw new Error(`unknown round type ${k} (a turret fires ${TURRET_TYPES.join(', ')})`);
    room.magazine.typed = Object.fromEntries(Object.entries(rounds).map(([k, kg]) => [k, Math.floor(kg / m)]));
  }
  return room.magazine;
}
/** The seeker and warhead kinds a missile carries (data.js SEEKERS, WARHEADS, 13n.1 (c)). */
export const SEEKER_KINDS = ['ir', 'radar', 'antiRadiation', 'designated'];
export const WARHEAD_KINDS = ['he', 'penetrator', 'emp'];
/** One missile's explosive energy (13n.1 (b) (c)): missile.warheadEnergy + 1/2 m (acceleration x burnTime)^2, its warhead and its fuel. */
export function missileEnergy(world) {
  const p = world.params.missile, m = tierScaled(world, p.mass), vb = p.acceleration.value * p.burnTime.value;
  return tierScaled(world, p.warheadEnergy) + 0.5 * m * vb * vb;
}
/**
 * What a magazine holds and the energy it releases if it goes off: turret rounds by their propellant
 * (kinetic.chargeEnergy, + he.blastEnergy for HE, x size^3); a railgun's slugs 0 (no propellant, 13n.1 (b)); missiles
 * by their warheads and fuel (missileEnergy each, 13n.1 (c)). Typed rounds (L5c): each by its charge, an HE round's
 * burst added.
 */
export function magazineContents(world, room) {
  const g = room.magazine;
  if (magazineType(room) === 'railgun') return { ap: 0, he: 0, slugMass: g.slugMass, energy: 0 };
  if (magazineType(room) === 'missile') return { ap: 0, he: 0, missiles: g.missiles, energy: g.missiles * missileEnergy(world) };
  const s3 = FIXED.sizeLinear.value[g.size] ** 3, p = world.params;
  const charge = tierScaled(world, p.kinetic.chargeEnergy) * s3, warhead = tierScaled(world, p.he.blastEnergy) * s3;
  if (!g.typed) return { ap: g.ap, he: g.he, energy: g.ap * charge + g.he * (charge + warhead) };
  const typed = typedCount(g.typed);
  return { ap: g.ap, he: g.he, typed: { ...g.typed }, energy: g.ap * charge + g.he * (charge + warhead) + typed * charge + (g.typed.he || 0) * warhead };
}
/** What a missile bay's store holds and the energy it releases if it goes off (#148): its missiles' warheads and fuel. */
export function bayContents(world, room) {
  return { missiles: room.missileBay.ready.length, energy: room.missileBay.ready.length * missileEnergy(world) };
}
/** The explosive energy of a magazine or a missile bay's store (what a detonation releases). */
const storeEnergy = (world, room) => (room.type === 'missileBay' ? bayContents(world, room).energy : magazineContents(world, room).energy);
function detonate(world, room, cause) {
  const energy = storeEnergy(world, room);
  if (room.type === 'missileBay') room.missileBay.ready = [];
  else emptyMagazine(room);
  explode(world, room, energy, cause);
}
/** A magazine's contents gone (detonated, or lost with its last cell). */
function emptyMagazine(room) {
  room.magazine.ap = 0;
  room.magazine.he = 0;
  if (room.magazine.slugMass) room.magazine.slugMass = 0;
  if (room.magazine.missiles) room.magazine.missiles = 0;
  if (room.magazine.typed) for (const k of Object.keys(room.magazine.typed)) room.magazine.typed[k] = 0;
}

// ---------- turret ----------
/** A turret's ready store: `rounds` rounds; `typed` ({ standard, ap, he, sabot } counts, L5c) makes them typed rounds. */
export function loadTurret(room, rounds, typed = null) {
  room.turret.ammo = rounds;
  if (typed) {
    room.turret.typed = { standard: 0, ap: 0, he: 0, sabot: 0, ...typed };
    room.turret.extra = 0;
    if (typedCount(room.turret.typed) > rounds) throw new Error(`${room.id}: ${typedCount(room.turret.typed)} typed rounds in a store of ${rounds}`);
  }
}
/** Rounds a turret's ready store holds: turret.readyRounds rounds of its own size (#193, #195). */
export function readyStore(world, room) {
  return tierScaled(world, world.params.turret.readyRounds);
}

/** Set a magazine's contents off now with `cause` (L2.blast.walls; a cook-off and a hit take the same path). */
export function detonateMagazine(world, room, cause) {
  if (!room.exploded && storeEnergy(world, room) > 0) detonate(world, room, cause);
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
    room.lifeSupportOn = false; // whether its life support runs this step (it may have no coolant neighbour to pump into)
    if (!room.def.lifeSupport || !room.placed || room.exploded || isDestroyed(room)) continue;
    if (room.type !== 'bridge' && !(supplied ? supplied.has(room) : room.powered)) continue;
    room.lifeSupportOn = true;
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
  beamBay: (world, room) => (room.beamBay.firing ? (tierScaled(world, world.params.beam.power) * room.footprintFactor * survivingFraction(room)) / tierScaled(world, world.params.beambay.efficiency) : 0),
  turret: (world, room) => (room.turret.ammo > 0 ? tierScaled(world, world.params.turret.powerDraw) * room.footprintFactor * survivingFraction(room) : 0),
  shieldGenerator: (world, room) => (room.shield.on ? tierScaled(world, world.params.shield.powerDraw) * room.footprintFactor * survivingFraction(room) : 0),
  engine: (world, room) => (room.controlled ? room.engine.throttle * room.footprintFactor * survivingFraction(room) * tierScaled(world, world.params.engine.powerDraw) : 0),
  quarters: (world, room) => tierScaled(world, world.params.quarters.powerDraw) * survivingFraction(room),
  railgun: (world, room) => (room.railgun.firing ? railgunDraw(world, room) : 0), // while ordered to fire (13n.1 (c))
  // The missile bay asks as the turret does while its store holds a missile (#301, §17 item 46): so it is a powered room for EMP.
  missileBay: (world, room) => (room.missileBay.ready.length > 0 ? tierScaled(world, world.params.turret.powerDraw) * room.footprintFactor * survivingFraction(room) : 0),
};
export function powerRequest(world, room) {
  if ((!REQUEST[room.type] && !room.rcs && !room.antennas && !room.pdLasers) || room.exploded || !room.active || down(room) || isDestroyed(room)) return 0;
  return (REQUEST[room.type] ? REQUEST[room.type](world, room) : 0) + (room.rcs ? rcsRequest(world, room) : 0) + (room.antennas ? scanRequest(world, room) : 0) + (room.pdLasers ? laserRequest(world, room) : 0); // an RCS fitting's, a scanning antenna's or a laser's draw joins its host's (13f.1, 13n.1 (a) (c))
}

function routePower(world) {
  const wall = tierScaled(world, world.params.power.wallCapacity);
  const edges = liveWalls(world).map((w) => ({ a: w.a.id, b: w.b.id, capacity: wall * w.live }));
  const placed = world.rooms.filter((r) => r.placed);
  const sources = placed.filter((r) => r.type === 'reactor').map((r) => ({ id: r.id, capacity: r.active && reactorAble(r) ? r.reactor.demand * reactorPower(world, r) * survivingFraction(r) : 0 }));
  const listed = world.power.priority;
  const rank = (r) => (listed.includes(r.id) ? listed.indexOf(r.id) : listed.length);
  const consumers = placed.filter((r) => REQUEST[r.type] || r.rcs || r.antennas || r.pdLasers).sort((a, b) => rank(a) - rank(b) || byId(a.id, b.id));
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
const shieldAble = (room) => room.type === 'shieldGenerator' && room.shield.on && room.powered && room.controlled && room.active && !down(room) && !isDestroyed(room);
const shieldBudget = (world, room) => tierScaled(world, world.params.shield.budget) * room.footprintFactor * survivingFraction(room) * supply(world, room);
const distance = (a, b) => hypot(a[0] - b[0], a[1] - b[1]);
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

/** The buffer's capacity (J): shield.buffer (k = 3, #240 (4)) x footprint, surviving fraction and power fraction, like the budget. */
const bufferCap = (world, room) => tierScaled(world, world.params.shield.buffer) * room.footprintFactor * survivingFraction(room) * supply(world, room);
/** The impulse buffer refills at the budget continuous beams leave unused (13d.1, E4). */
function refillBuffer(world, room, budget, absorbedRate) {
  const s = room.shield, cap = bufferCap(world, room);
  if (s.buffer === null) s.buffer = cap;
  s.buffer = Math.min(cap, s.buffer + Math.max(0, budget - absorbedRate) * world.dt);
}
/** The generator's impulse buffer (J); full until first used. */
export function shieldBuffer(world, room) {
  return room.shield.buffer === null ? bufferCap(world, room) : room.shield.buffer;
}

/**
 * A kinetic round { position, mass, velocity, area, direction } through the
 * field between steps (L0's stopRound): the field stops up to kineticStop x g
 * of its sectional momentum, paying the energy from its buffer; once the
 * buffer is empty rounds pass unstopped. In overlapping fields (13l.1, #205
 * (7), F18) the round meets the summed strength g = min(1, sum g_i) and the
 * summed buffers; the energy removed is charged to each generator in
 * proportion to its buffer x g_i (the beam rule of 13d.1); a generator whose
 * share exceeds its buffer pays its buffer, and the round is then solved once
 * more against what was paid (no third round). Each generator's payment is
 * heat in its next step. On a ship the momentum the field removes, m (v - v')
 * along the round's direction (unit, grid frame), is applied to the body
 * holding each generator, in proportion to its payment, on the round's line of
 * action where the field takes it (`at`, a grid point on that line, default
 * `position`; since L5e1, §17 item 35: at the generator before), and booked as
 * external: the field pushes on its source (#240 (2), F16). `frame` (a body id,
 * optional) is the body whose grid frame `position`, `at` and `direction` are
 * in (a battle's hit body); without it each generator's own body's. The heat
 * is one rule with fireRound's (13l.1, §17 item 25): the round's kinetic
 * energy before less after (world frame: the hull's velocity where the round
 * is, plus its speed) less what the bodies gained (J^2 / 2M and the spin, for a
 * ship at rest), shared by payment; without a ship, the energy paid. With
 * generators on different bodies (fragments), each body keeps these books for
 * its own generators' part of the round, at its own hull velocity and in its
 * own frame (#258). Returns the round after the field.
 */
export function shieldRound(world, round) {
  const gens = world.rooms.filter(shieldAble);
  if (gens.length === 0) return { velocity: round.velocity, energy: 0, by: null };
  if (world.ship && !round.direction) throw new Error('shieldRound on a ship needs the round\'s direction (13k.1)');
  for (const x of gens) x.shield.buffer = shieldBuffer(world, x);
  const g = gens.map((x) => fieldAt(world, x, round.position)), buffers = gens.map((x) => x.shield.buffer);
  const strength = Math.min(1, g.reduce((x, y) => x + y, 0)), stop = tierScaled(world, world.params.shield.kineticStop);
  let r = stopRound(round, stop, strength, buffers.reduce((x, y) => x + y, 0));
  const w = gens.map((x, i) => buffers[i] * g[i]), W = w.reduce((x, y) => x + y, 0);
  let paid = w.map((wi) => (W > 0 ? r.energy * (wi / W) : 0));
  if (paid.some((x, i) => x > buffers[i])) {
    paid = paid.map((x, i) => Math.min(x, buffers[i]));
    r = stopRound(round, stop, strength, paid.reduce((x, y) => x + y, 0)); // solved once more with what was paid
  }
  const total = paid.reduce((x, y) => x + y, 0);
  gens.forEach((x, i) => { x.shield.buffer -= paid[i]; });
  let impulse = 0, heat = total;
  let heats = gens.map((x, i) => (total > 0 ? heat * (paid[i] / total) : 0));
  if (world.ship) {
    impulse = round.mass * (round.velocity - r.velocity);
    if (impulse > 0 && total > 0) {
      // Each body holding paying generators keeps its own books (#258): its part of the round (mass x its
      // generators' payment / the total) is taken at that body's hull velocity at the round's point, in its frame;
      // each generator's share of the impulse acts on the round's line of action at the point the field takes it (the
      // hull entry point, L5e1, §17 item 35; it acted at the generator before), so the two-ship angular book closes
      // with shields up; the body's heat (the part's lost kinetic
      // energy less what the bodies gained) is shared among its generators by payment.
      const book = world.ship.received ??= { J: [0, 0], heat: 0, field: [0, 0] };
      const groups = new Map();
      gens.forEach((x, i) => {
        const b = world.ship.bodies.find((y) => y.id === x.body);
        if (b && paid[i] > 0) { if (!groups.has(b)) groups.set(b, []); groups.get(b).push(i); }
      });
      heat = 0;
      heats = gens.map(() => 0);
      for (const [b, list] of groups) {
        // The round's frame (round.frame, the body whose grid frame position, direction and `at` are in; default b) gives
        // its point and direction in the world, so every body books the same world line (L5e1: a generator on another
        // fragment than the hit body took the direction in its own frame, and the momentum book leaked).
        // The round's speed is relative to the hit body F's hull at its point (position, §17 item 53): its velocity there is the books' u0; the
        // impulse acts at Q, on its line (`at`).
        const F = (round.frame && world.ship.bodies.find((y) => y.id === round.frame)) || b, Q = worldPoint(F, round.at || round.position);
        const part = list.reduce((x, i) => x + paid[i], 0), m = round.mass * (part / total);
        const hull = pointVelocity(F, worldPoint(F, round.position)), d = rotate(round.direction, F.theta);
        const u0 = [hull[0] + round.velocity * d[0], hull[1] + round.velocity * d[1]], K0 = bodiesEnergy(world), Jsum = [0, 0];
        for (const i of list) {
          const share = impulse * (paid[i] / total), J = [share * d[0], share * d[1]];
          receive(world, b, J, gridPoint(b, Q)); // on the round's line of action at the field's surface (round.at, else the hull entry point), as B2's hull hit (§17 item 35)
          book.field[0] += J[0]; book.field[1] += J[1];
          Jsum[0] += J[0]; Jsum[1] += J[1];
        }
        const u1 = [u0[0] - Jsum[0] / m, u0[1] - Jsum[1] / m];
        const q = 0.5 * m * (u0[0] * u0[0] + u0[1] * u0[1] - u1[0] * u1[0] - u1[1] * u1[1]) - (bodiesEnergy(world) - K0);
        for (const i of list) heats[i] = q * (paid[i] / part);
        heat += q;
      }
      world.ship.energy.heat += heat; // B3: the bodies' share of the field's books
      // A paying generator whose body is not among the ship's bodies (B15, #260 NB2): the old fallback, its whole
      // payment as its heat and no impulse.
      gens.forEach((x, i) => { if (paid[i] > 0 && !world.ship.bodies.some((y) => y.id === x.body)) { heats[i] = paid[i]; heat += paid[i]; } });
    }
  }
  gens.forEach((x, i) => { x.shield.impulseHeat += heats[i]; });
  // EM-bright while absorbing (#103, 13n.1 (a)): what the buffer paid for the round, as power over the step it was paid
  // in; js/sensors.js reads it with s.em until the generator's next step resets it.
  gens.forEach((x, i) => { if (paid[i] > 0) x.shield.roundEm += paid[i] / world.dt; });
  return { velocity: r.velocity, energy: total, heat, by: gens.length === 1 ? gens[0].id : gens.map((x) => x.id), paid: Object.fromEntries(gens.map((x, i) => [x.id, paid[i]])), strength, impulse };
}

// ---------- repair sharing (#99, #185 (6), 13d.1) ----------
/**
 * Each quarters' budget R = repair.massRate x surviving fraction (x its power
 * fraction), in kg/s (#240 (1), F13); a damaged cell j in range (0 <
 * integrity < 1: a destroyed cell waits for the drydock, #206) asks q_j = R
 * g(r_j); if the asks exceed R, each is scaled by R / sum q_j (with a helm's
 * repair list, world.repairOrder, #307: granted whole-cell in that order until R
 * is spent); a grant of q kg/s
 * restores q / its cell mass of integrity per second. A damaged reactor's cells
 * are granted first, whole, whatever the order (reactor containment first,
 * #37, 13n.8). Computed at the start of
 * the step; the budget and the grants paid are in kg/s.
 */
function repairGrants(world) {
  const p = world.params, radius = tierScaled(world, p.repair.radius);
  for (const room of world.rooms) {
    if (room.type !== 'quarters') continue;
    const q = room.quarters;
    q.grants = []; q.budget = 0; q.paid = 0;
    if (room.exploded || !room.active || !room.powered || down(room) || isDestroyed(room)) continue;
    const base = world.power ? tierScaled(world, p.repair.massRate) * survivingFraction(room) * supply(world, room) : tierScaled(world, p.repair.massRate) * survivingFraction(room);
    for (const other of world.rooms) {
      if (other === room || other.exploded) continue;
      const r = hypot(other.position[0] - room.position[0], other.position[1] - room.position[1]);
      const rate = base * shieldStrength(r, radius, FIXED.repairFalloffExponent.value);
      other.cells.forEach((c, i) => { if (!c.destroyed && c.integrity < 1 && rate > 0) q.grants.push({ room: other, cell: i, mass: rate }); });
    }
    const sum = q.grants.reduce((x, g) => x + g.mass, 0);
    // Reactor containment first (#37, 13n.8): a damaged reactor's cells take their whole ask before anything else, in
    // the ship's room order and cell order, whatever the repair order says; the rest of the budget is shared as below.
    let left = base;
    const contain = sum > base ? q.grants.filter((g) => g.room.type === 'reactor') : [];
    for (const g of contain) { g.mass = Math.min(g.mass, left); left -= g.mass; }
    const rest = contain.length ? q.grants.filter((g) => g.room.type !== 'reactor') : q.grants, asked = rest.reduce((x, g) => x + g.mass, 0);
    if (asked > left && world.repairOrder) {
      // Repair priority (#307): with a helm's room-type list (world.repairOrder), the rooms listed first in their
      // order, the rest after in the ship's order; each damaged cell takes its whole ask until the budget is spent.
      const rank = (r) => { const i = world.repairOrder.indexOf(r.id); return i < 0 ? world.repairOrder.length + world.rooms.indexOf(r) : i; };
      for (const g of [...rest].sort((x, y) => rank(x.room) - rank(y.room) || x.cell - y.cell)) { g.mass = Math.min(g.mass, left); left -= g.mass; }
    } else if (asked > left) for (const g of rest) g.mass *= left / asked;
    for (const g of q.grants) g.rate = g.mass / cellMassOf(world, g.room); // integrity per second
    q.budget = base;
    q.paid = q.grants.reduce((x, g) => x + g.mass, 0);
  }
}

// ---------- ammunition feed (#18, #193) ----------
function feedTurrets(world) {
  const p = world.params;
  let moving = null; // the typed round or the missile a take() hands to its give()
  feedAmmo(world, {
    feedPerMetre: tierScaled(world, p.ammo.wallFeed),
    store: (room) => (room.type === 'turret' && !room.exploded && !isDestroyed(room)
      ? { capacity: readyStore(world, room), rounds: room.turret.ammo, roundMass: tierScaled(world, p.kinetic.roundMass) * FIXED.sizeLinear.value[room.size] ** 3, size: room.size }
      : null),
    has: (mag) => magazineType(mag) === 'turret' && (mag.magazine.ap + mag.magazine.he > 0 || typedCount(mag.magazine.typed) > 0), // a turret is fed by a turret magazine only (13n.1 (b))
    take: (mag) => {
      moving = null;
      for (const kind of mag.loadingOrder || ['ap', 'he']) if (mag.magazine[kind] > 0) { mag.magazine[kind]--; return true; }
      // Typed slots (13n.1 (c)) after the untyped ones, in the order they were loaded.
      for (const kind of Object.keys(mag.magazine.typed || {})) if (mag.magazine.typed[kind] > 0) { mag.magazine.typed[kind]--; moving = kind; return true; }
      return false;
    },
    give: (room) => {
      room.turret.ammo++; room.turret.fed = (room.turret.fed || 0) + 1;
      if (moving) { room.turret.typed ??= { standard: 0, ap: 0, he: 0, sabot: 0 }; room.turret.typed[moving]++; room.turret.extra ??= 0; }
      if (world.ship) world.ship.moved = true;
    },
  });
  // The missile bay's ready store (#148, 13n.1 (c)): whole missiles from a missile magazine, by mass at the same feed.
  if (world.rooms.some((r) => r.type === 'missileBay')) {
    feedAmmo(world, {
      feedPerMetre: tierScaled(world, p.ammo.wallFeed),
      store: (room) => (room.type === 'missileBay' && !room.exploded && !isDestroyed(room)
        ? { capacity: tierScaled(world, p.missilebay.readyMissiles), rounds: room.missileBay.ready.length, roundMass: tierScaled(world, p.missile.mass), size: 'M' }
        : null),
      has: (mag) => magazineType(mag) === 'missile' && mag.magazine.size === 'M' && mag.magazine.missiles > 0,
      take: (mag) => { mag.magazine.missiles--; moving = { seeker: mag.magazine.seeker, warhead: mag.magazine.warhead }; return true; },
      give: (room) => { room.missileBay.ready.push(moving); if (world.ship) world.ship.moved = true; },
    });
  }
  if (world.ship && world.ship.moved) { world.ship.moved = false; moveInside(world); }
}

// ---------- blast between rooms (#141, #169, 13d.1) ----------
/**
 * An internal explosion of energy E fills its own room up to its blast
 * capacity B = the remaining integrity of its surviving cells (before it,
 * sum of integrity) x matter.blastPerKg x its cell mass (#240 (6), F3, 13k.1;
 * from remaining integrity, #216 (3), 13l.1); the excess passes to the unsaturated rooms sharing a
 * wall with the saturated ones, split by shared wall length (every edge: a
 * hole lets blast through), each filling up to its capacity and passing its
 * own excess on, as a wave front (#169); what no room can take escapes to
 * space. Within a room the energy spreads over its surviving cells by their
 * remaining integrity (so each holds at most its own integrity x q_b x m): a
 * room that absorbs a of its capacity B loses the fraction a / B of each
 * cell's integrity, and a full room loses every cell. Recorded in
 * world.blasts: absorbed per room and escaped.
 */
const remainingIntegrity = (room) => room.cells.reduce((x, c) => x + (c.destroyed ? 0 : c.integrity), 0);
// `own` (a burst entering from outside, 13n.1 (c)): the origin room is damaged by what it absorbs like any other room
// (an explosion has already destroyed its own room); `cause` names the burst (default the origin's explosion).
function blastThroughWalls(world, origin, E, integrityBefore, { own = false, cause: named = null } = {}) {
  const qb = tierScaled(world, world.params.matter.blastPerKg);
  const rooms = world.rooms.filter((r) => r.placed).sort((a, b) => byId(a.id, b.id));
  const cap = new Map(rooms.map((r) => [r, (r === origin ? integrityBefore : remainingIntegrity(r)) * qb * cellMassOf(world, r)]));
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
  const cause = named || `explosion:${origin.id}`;
  world.blasts.push({ room: origin.id, energy: E, escaped: excess, cause, absorbed: Object.fromEntries(rooms.filter((r) => reached.has(r)).map((r) => [r.id, absorbed.get(r)])), capacity: Object.fromEntries(rooms.map((r) => [r.id, cap.get(r)])) });
  for (const r of rooms) {
    if ((r === origin && !own) || !(absorbed.get(r) > 0) || survivors.get(r) === 0) continue;
    const frac = full.has(r) ? 1 : absorbed.get(r) / cap.get(r); // the share of each cell's remaining integrity it absorbed
    r.cells.forEach((c, i) => { if (!c.destroyed) damageCell(world, r, i, frac === 1 ? 1 : c.integrity * frac, cause, 'blast'); });
  }
}

// ---------- warheads at the hull (13n.1 (c), #97, #141, #292) ----------
/**
 * A contact burst of `energy` at hull entry x (an HE round at its stopping entry, an HE warhead at the hit; 13n.1
 * (c), #141, #169): at a room cell, he.coupling of it enters that cell's room and spreads through walls by 13d.1's
 * rule (the room itself damaged by what it absorbs), the rest vents at the face; at a plate the burst is outside the
 * hull and nothing enters (fragments carry nothing beyond it). Returns { room, entered, vented }.
 */
export function contactBurst(world, x, energy, cause) {
  if (x.plate) return { room: x.plate.room, entered: 0, vented: energy };
  const E = tierScaled(world, world.params.he.coupling) * energy;
  blastThroughWalls(world, x.room, E, remainingIntegrity(x.room), { own: true, cause });
  return { room: x.room.id, entered: E, vented: energy - E };
}
/**
 * The rooms an EMP can hit (#292): each room with a power function (a consumer, a fitting that draws, a producing
 * reactor) joined through live walls to a reactor able to produce, and the bridge on its backup (#147); a switched-off
 * generator still on the grid counts (its electronics are live). Holds, magazines and heat sinks have none.
 */
function poweredRooms(world) {
  const walls = liveWalls(world).filter((w) => w.live > 0), reached = suppliedRooms(world, walls), out = new Set();
  for (const r of world.rooms) {
    if (!r.placed || r.exploded || isDestroyed(r) || !r.active) continue;
    if (r.type === 'bridge') out.add(r);
    else if (r.type === 'reactor') { if (producing(r)) out.add(r); }
    else if ((REQUEST[r.type] || r.rcs || r.antennas || r.pdLasers) && reached.has(r)) out.add(r);
  }
  return out;
}
/**
 * An EMP burst at grid point `point` (m, this world's grid) of `energy` (missile.empEnergy; 13n.1 (c), #292) at time
 * `t` (s, within the step it came in): first the shield buffers there pay as for a round, min(E, sum of buffer_i g_i)
 * shared by buffer_i g_i (heat in the generators, EM-bright that step); the rest E' is a field of #99's shape, g = 1 /
 * (1 + (r / emp.radius)^2); every powered room (poweredRooms) whose centre receives E' g(r) >= emp.scramDose is hit: a
 * reactor SCRAMs (and restarts reactor.restartTime later, its control kept), any other room shuts down for
 * emp.outageTime from `t` ('outage'; down() while it lasts; 'outage-ended' at the first step boundary at or after its
 * end), a bridge's outage taking control from every room it reaches (#292: a bridge in reach still decapitates).
 * Returns { paid, field, hit: [{ room, dose, effect }] }.
 */
export function empBurst(world, point, energy, cause, t = world.t) {
  const p = world.params, gens = world.rooms.filter(shieldAble);
  for (const x of gens) x.shield.buffer = shieldBuffer(world, x);
  const w = gens.map((x) => x.shield.buffer * fieldAt(world, x, point)), W = w.reduce((x, y) => x + y, 0);
  const paid = Math.min(energy, W), shares = w.map((wi) => (W > 0 ? (paid * wi) / W : 0));
  gens.forEach((x, i) => { if (shares[i] > 0) { x.shield.buffer -= shares[i]; x.shield.impulseHeat += shares[i]; x.shield.roundEm += shares[i] / world.dt; } });
  const field = energy - paid, R = tierScaled(world, p.emp.radius), D = tierScaled(world, p.emp.scramDose), powered = poweredRooms(world);
  const hit = [];
  for (const room of [...world.rooms].sort((a, b) => byId(a.id, b.id))) {
    if (!powered.has(room)) continue;
    const dose = field * shieldStrength(distance(room.position, point), R, FIXED.shieldFalloffExponent.value);
    if (!(dose >= D)) continue;
    if (room.type === 'reactor') {
      scram(world, room, cause);
      if (room.controlled) room.reactor.restartStep = world.step + stepsAtLeast(tierScaled(world, p.reactor.restartTime), world.dt); // its control kept: the restart clock runs now (#82)
      hit.push({ room: room.id, dose, effect: 'scram' });
      continue;
    }
    const end = t + tierScaled(world, p.emp.outageTime);
    room.outage = { end: room.outage ? Math.max(room.outage.end, end) : end };
    room.marks.outage = event(world, room, 'outage', cause, { dose, until: room.outage.end }).id;
    hit.push({ room: room.id, dose, effect: 'outage' });
  }
  return { paid, field, hit };
}

// ---------- the ship (L3, DESIGN.md 13f.1, #208) ----------
/**
 * A fitting on an open edge of a placed room (#15, 13f.1): `cell` [x, y] is
 * one of the room's grid cells and `side` [dx, dy] the outward direction of
 * the edge. 'radiator' adds a panel to its room; 'rcs' a thruster that
 * pushes along the edge's inward normal at its midpoint; 'antenna' a sensor
 * (L5b, js/sensors.js, 13n.1 (a), #289) that scans one zone at a time while
 * its host is controlled and powered, drawing sensor.scanPower from it; 'pd'
 * kinetic point defence with its own store of pd.ammo flak rounds and 'pdLaser'
 * laser point defence drawing from its host (L5c, js/defence.js, 13n.1 (c)).
 * Each adds its mass (radiator.mass, rcs.mass, sensor.mass, pd.mass with its
 * flak rounds, pdLaser.mass) at that midpoint.
 * Throws on a rule of validation (layout.fittingProblem).
 */
export function addFitting(world, type, roomId, cell, side) {
  if (!world.layout) throw new Error('a fitting needs a cluster (createWorld with a grid)');
  if (type === 'armour') return addPlate(world, roomId, cell, side);
  if (!FITTING_MASS[type]) throw new Error(`unknown fitting ${type}`);
  const problem = fittingProblem(world.layout, ROOMS, { room: roomId, cell, side }, world.fittings);
  if (problem) throw new Error(`${problem.rule}: ${problem.detail}`);
  const room = roomById(world, roomId), grid = world.layout.rooms.get(roomId).cells;
  const k = grid.findIndex((c) => c[0] === cell[0] && c[1] === cell[1]);
  const mass = tierScaled(world, param(world, FITTING_MASS[type]));
  const f = { id: world.fittings.length, type, room: roomId, k, cell: [...cell], side: [...side], p: edgeMidpoint(world.edge, cell, side), mass, fired: false };
  if (type === 'antenna') f.scan = null; // the zone it scans and its progress (js/sensors.js)
  if (type === 'pd') Object.assign(f, { ammo: tierScaled(world, world.params.pd.ammo), shots: 0, anchor: null, target: null }); // its own store of flak rounds (#93)
  if (type === 'pdLaser') Object.assign(f, { target: null, energy: 0 }); // the missile it holds its beam on this step
  world.fittings.push(f);
  if (type === 'radiator') room.radiators++;
  else if (type === 'rcs') room.rcs = true;
  else if (type === 'antenna') room.antennas = true;
  else if (type === 'pdLaser') room.pdLasers = true;
  return f;
}
/**
 * The plume's burn on a fitting (13n.1 (e), 13n.8, #297): `energy` (J) of another ship's jet taken by fitting f this
 * step; it is ruined once it has taken matter.burnEnergyPerKg x its mass (the beam's deposit rule, as a cell's), then
 * it works no more: a panel radiates nothing (its room's count drops), an antenna neither scans nor receives, a point
 * defence fitting neither aims nor fires. It keeps its mass (a burnt-out fitting stays on its edge). Only radiator
 * panels, antennas and point defence burn (mechanism C: never a hull cell, an RCS fitting or a plate); the energy is
 * the jet's, outside the battle's books (no propellant, #140), and heats nothing else. The event 'fitting-ruined' in
 * the fitting's ship's log, room its host, cause the plume ('plume', a root). Returns whether it was ruined now.
 */
export function burnFitting(world, f, energy, cause = 'plume') {
  if (!PLUME_TYPES.has(f.type) || f.ruined || !(energy > 0)) return false;
  const host = roomById(world, f.room);
  if (!cellAlive(host, f.k)) return false;
  f.burned = (f.burned || 0) + energy;
  const need = tierScaled(world, world.params.matter.burnEnergyPerKg) * f.mass;
  if (f.burned < need) return false;
  f.ruined = true;
  if (f.type === 'radiator') countRadiators(world);
  if (f.type === 'antenna') f.scan = null;
  if (f.type === 'pdLaser') f.target = null;
  event(world, host, 'fitting-ruined', cause, { fitting: f.id, kind: f.type, energy: f.burned, channel: 'plume' });
  return true;
}
/** The fitting types the plume burns (#297's mechanism C). */
export const PLUME_TYPES = new Set(['radiator', 'antenna', 'pd', 'pdLaser']);
/** Each fitting type's mass constant, at its edge's midpoint (13f.1, 13n.1 (a) (c)). */
const FITTING_MASS = { radiator: 'radiator.mass', rcs: 'rcs.mass', antenna: 'sensor.mass', pd: 'pd.mass', pdLaser: 'pdLaser.mass' };
/**
 * An armour plate (13l.1, #255, #256) of armour.plateThickness (k = 1) on the wall segment on `side` of grid cell
 * `cell` of room `roomId`: a hull edge or a shared wall (layout.plateProblem). Its mass, thickness x
 * FIXED.steelDensity x edge^2 (the segment's area, one cell high), sits at the segment's midpoint and belongs to
 * the body of the cell it is mounted on. Every path built by pathAlong crosses it where its line crosses the segment.
 * Its steel adds mass x thermal.coupledArmour / armour.cellMass of heat capacity to its room (450 J/(kg K), #258),
 * which leaves again, with its heat above rest vented, when the plate is gone (releasePlate).
 */
function addPlate(world, roomId, cell, side) {
  const problem = plateProblem(world.layout, ROOMS, { type: 'armour', room: roomId, cell, side }, world.fittings);
  if (problem) throw new Error(`${problem.rule}: ${problem.detail}`);
  const k = world.layout.rooms.get(roomId).cells.findIndex((c) => c[0] === cell[0] && c[1] === cell[1]);
  const thickness = tierScaled(world, world.params.armour.plateThickness), e = world.edge;
  const mass = thickness * FIXED.steelDensity.value * e * e, t = world.params.thermal;
  const heatCapacity = (mass * tierScaled(world, t.coupledArmour)) / tierScaled(world, world.params.armour.cellMass); // the steel's, 450 J/(kg K) (#258)
  const f = { id: world.fittings.length, type: 'armour', room: roomId, k, cell: [...cell], side: [...side], p: edgeMidpoint(e, cell, side), mass, heatCapacity, thickness, integrity: 1, destroyed: false, released: false, fired: false };
  world.fittings.push(f);
  world.plates.set(segmentKey(cell, side), f);
  addCapacity(roomById(world, roomId).heat, heatCapacity);
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
/** Mass (kg) of typed rounds { type: count } of a size: each its `held` mass (an HE round its steel, 13n.1 (c)). */
const typedMass = (world, size, typed) => (typed ? TURRET_TYPES.reduce((x, k) => x + (typed[k] ? typed[k] * roundOf(world, size, k).held : 0), 0) : 0);
/**
 * Mass (kg) of what a room holds: a magazine's rounds, slugs or missiles, a turret's ready store (13f.1), a missile
 * bay's store, a railgun alone's slugs (L5c).
 */
export function contentsMass(world, room) {
  if (room.type === 'magazine') {
    if (magazineType(room) === 'railgun') return room.magazine.slugMass;
    if (magazineType(room) === 'missile') return room.magazine.missiles * tierScaled(world, world.params.missile.mass);
    const untyped = (room.magazine.ap + room.magazine.he) * roundMassOf(world, room.magazine.size);
    return room.magazine.typed ? untyped + typedMass(world, room.magazine.size, room.magazine.typed) : untyped;
  }
  if (room.type === 'turret') {
    if (!room.turret.typed) return room.turret.ammo * roundMassOf(world, room.size);
    return (room.turret.ammo - typedCount(room.turret.typed)) * roundMassOf(world, room.size) + typedMass(world, room.size, room.turret.typed);
  }
  if (room.type === 'missileBay') return room.missileBay.ready.length * tierScaled(world, world.params.missile.mass);
  if (room.type === 'railgun') return (world.layout ? 0 : room.railgun.slugs) + (room.railgun.chamber || 0); // a railgun alone's slugs; a slug in the barrel
  return 0;
}
/**
 * Every mass of the ship (13g.1, #221, 13i.2): surviving cells (their type's
 * cellMass, a heat sink cell plus the water of its extra capacity) as squares at their
 * centres, contents at their room's centre, fittings on surviving cells at
 * their edge's midpoint (an armour plate until it is wrecked, 13l.1); each
 * with the body it belongs to.
 */
function shipItems(world) {
  const e = world.edge;
  const items = new Map();
  for (const room of world.rooms) {
    if (!room.placed) continue;
    const m = cellMassOf(world, room);
    const grid = world.layout.rooms.get(room.id).cells;
    room.cells.forEach((c, k) => { if (!c.destroyed) items.set(`${room.id}:${k}`, { m, p: [(grid[k][0] + 0.5) * e, (grid[k][1] + 0.5) * e], a: e, body: c.fragment }); });
    const cm = contentsMass(world, room);
    // A missile bay's store sits at its launch face, so a missile leaves exactly where its mass was (13n.1 (c)).
    if (cm > 0 && !isDestroyed(room)) items.set(`${room.id}:contents`, { m: cm, p: room.type === 'missileBay' ? launchFace(world, room).p : room.position, a: 0, body: room.body });
  }
  for (const f of world.fittings) {
    const c = roomById(world, f.room).cells[f.k];
    // A wrecked plate leaves (13l.1); a kinetic point-defence fitting carries its flak rounds (13n.1 (c)).
    if (!c.destroyed && !f.destroyed) items.set(`fit:${f.id}`, { m: f.type === 'pd' ? f.mass + f.ammo * roundOf(world, 'M', 'flak').held : f.mass, p: f.p, a: 0, body: c.fragment });
  }
  // Rounds stopped in the hull (B4, embedRound): with their host cell or plate while it stands.
  for (const x of (world.ship && world.ship.embedded) || []) {
    const c = roomById(world, x.room).cells[x.cell];
    if (!c.destroyed && !(x.plate && plateGone(world, x.plate))) items.set(`emb:${x.id}`, { m: x.m, p: x.p, a: 0, body: c.fragment });
  }
  return items;
}
const propsOf = (items, id) => massProperties([...items.values()].filter((i) => i.body === id));
const cellAlive = (room, k) => !room.cells[k].destroyed && room.cells[k].fragment === room.body;
/** Radiators that work: on surviving cells in their room's working fragment. */
function countRadiators(world) {
  for (const room of world.rooms) if (room.placed) room.radiators = 0;
  for (const f of world.fittings) if (f.type === 'radiator' && !f.ruined && cellAlive(roomById(world, f.room), f.k)) roomById(world, f.room).radiators++; // a panel the plume ruined radiates nothing (#297)
}

/**
 * Make the cluster a ship (13f.1): one rigid body (more if the layout is
 * already in pieces) at rest frame `origin` with `heading`, its centre of
 * mass moving at `velocity`, turning at `omega`. Control is then computed
 * from the bridge.
 */
export function enableShip(world, { origin = [0, 0], heading = 0, velocity = [0, 0], omega = 0 } = {}) {
  if (!world.layout) throw new Error('a ship needs a cluster (createWorld with a grid)');
  world.ship = { bodies: [], debris: [], rounds: [], external: { J: [0, 0], H: 0, Hgross: 0 }, items: new Map(), next: 1, moved: false };
  // The energy books (B3, 13n.1 (b)): muzzle energy of each shot, the work of thrust and RCS (the integrator's change of
  // kinetic energy), mass moved inside (the feed), and the heat of hits, fields and stopped rounds; the hits' and
  // fields' part of the angular impulse (B2). Not enumerable, so a record of the ship's state stays as it was.
  Object.defineProperty(world.ship, 'energy', { value: { shots: 0, work: 0, internal: 0, heat: 0 }, enumerable: false });
  Object.defineProperty(world.ship, 'exchange', { value: { H: 0 }, enumerable: false });
  Object.defineProperty(world.ship, 'embedded', { value: [], enumerable: false }); // rounds stopped in the hull (B4)
  Object.defineProperty(world.ship, 'missiles', { value: [], writable: true, enumerable: false }); // missiles in flight (L5c, js/missile.js)
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
    if (room && part !== 'contents' && !now && room.type !== 'heatSink' && room.heatCells > 0) { ventCell(room.heat, room.heatCells, FIXED.restTemperature.value, plateCapacityOf(world, room)); room.heatCells--; } // its heat leaves with it (#214 (9))
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
  const items = shipItems(world), K0 = bodiesEnergy(world);
  for (const b of world.ship.bodies) redistribute(b, propsOf(items, b.id));
  world.ship.items = items;
  world.ship.energy.internal += bodiesEnergy(world) - K0; // the spin's energy changes with I (B3)
}

/**
 * Recoil (#5, #203 C, 13f.1): the round of mass m leaves the turret's ready
 * store at its room's centre with the velocity of that point plus u along
 * the turret's aim, and the ship takes the impulse -m u d there, so ship
 * plus rounds conserve momentum exactly. It is launched `at` into the step,
 * at world.t + at, and moves (dt - at) v in its first step (F20, 13k.1); x0 is
 * where it left, `cause` the shot's cause id.
 */
function recoil(world, room, m, u, at = 0, cause = null, extra = null) {
  const b = world.ship.bodies.find((x) => x.id === room.body);
  if (!b) return;
  // `extra` (L5c, 13n.1 (c)): `dir` the firing direction in the ship's frame (the railgun's axis), `A` and `type` the
  // round's cross-section and type (a typed round, a slug), `petals` a sabot's mass leaving with it at u as debris.
  const q = worldPoint(b, room.position), vq = pointVelocity(b, q), d = rotate(extra && extra.dir ? extra.dir : room.turret.aim, b.theta);
  world.ship.items = shipItems(world); // the round has left the store
  reshape(b, propsOf(world.ship.items, b.id));
  const round = { m, x: q, v: [vq[0] + u * d[0], vq[1] + u * d[1]], from: room.id, t: world.t + at, x0: [...q], cause, first: world.dt - at };
  if (extra && extra.A !== undefined) Object.assign(round, { A: extra.A, type: extra.type, ...(extra.burst > 0 ? { burst: extra.burst } : {}) });
  world.ship.rounds.push(round);
  const petals = extra && extra.petals > 0 ? extra.petals : 0, M = m + petals;
  if (petals > 0) world.ship.debris.push({ m: petals, x: [...q], v: [...round.v], omega: 0, spin: 0, from: room.id, cause: 'petals', t: world.t + at });
  // Muzzle energy (B3): the round's kinetic energy in the turret's frame plus the recoil's, J^2 / 2M + (r x J)^2 / 2I.
  const Jr = [-M * u * d[0], -M * u * d[1]], h = cross([q[0] - b.x[0], q[1] - b.x[1]], Jr);
  world.ship.energy.shots += 0.5 * M * u * u + (Jr[0] * Jr[0] + Jr[1] * Jr[1]) / (2 * b.M) + (h * h) / (2 * b.I);
  applyImpulse(b, Jr, room.position);
}
/**
 * A kinetic point-defence fitting fires one flak round (13n.1 (c), #93) along world unit direction `dir` from its
 * edge's midpoint at kinetic.muzzleVelocity relative to that point: its store loses one round (its mass leaves the
 * fitting), the ship takes the recoil -m u dir there (muzzle energy booked as a turret's, B3), and the round is
 * returned { m, x, v, A, t, cause, from } for js/defence.js to fly. Emits 'flak' in its host's log (a root).
 */
export function fireFlak(world, f, dir, cause) {
  const host = roomById(world, f.room), b = world.ship.bodies.find((x) => x.id === host.cells[f.k].fragment);
  const R = roundOf(world, 'M', 'flak'), q = worldPoint(b, f.p), vq = pointVelocity(b, q), u = R.v;
  f.ammo--;
  f.shots++;
  world.ship.items = shipItems(world);
  reshape(b, propsOf(world.ship.items, b.id));
  const round = { m: R.m, x: q, v: [vq[0] + u * dir[0], vq[1] + u * dir[1]], A: R.A, t: world.t, cause, from: host.id };
  const J = [-R.m * u * dir[0], -R.m * u * dir[1]], h = cross([q[0] - b.x[0], q[1] - b.x[1]], J);
  world.ship.energy.shots += 0.5 * R.m * u * u + (J[0] * J[0] + J[1] * J[1]) / (2 * b.M) + (h * h) / (2 * b.I);
  applyImpulse(b, J, f.p);
  event(world, host, 'flak', cause, { energy: 0.5 * R.m * u * u, channel: 'kinetic', fitting: f.id });
  return round;
}
/**
 * A point-defence fitting can engage (13n.1 (c)): its cell standing in its host's working fragment, the host
 * controlled, switched on and up; a kinetic one with a round left, a laser powered (unless `aiming`: a laser picks its
 * missile before the step whose routing powers it).
 */
export function pdAble(world, f, aiming = false) {
  const host = roomById(world, f.room);
  if (f.ruined || !cellAlive(host, f.k) || host.exploded || isDestroyed(host) || !host.controlled || !host.active || down(host)) return false; // ruined: the plume's (#297)
  return f.type === 'pd' ? f.ammo > 0 : aiming || host.powered;
}
/** The power (W) a laser fitting puts on its target this step: pdLaser.power x its host's power fraction, while it holds a target and can (13n.1 (c)). */
export function laserPower(world, f) {
  if (f.type !== 'pdLaser' || !f.target || !pdAble(world, f)) return 0;
  return tierScaled(world, world.params.pdLaser.power) * supply(world, roomById(world, f.room));
}
/** The draw (W) of a room's laser fittings holding a target: pdLaser.power / beambay.efficiency each (13n.1 (c), #243 F26). */
function laserRequest(world, room) {
  if (!room.controlled) return 0;
  let n = 0;
  for (const f of world.fittings) if (f.type === 'pdLaser' && f.room === room.id && f.target && cellAlive(room, f.k)) n++;
  return (n * tierScaled(world, world.params.pdLaser.power)) / tierScaled(world, world.params.beambay.efficiency);
}
/** Heat (J) of the step from the room's lasers: their draw as delivered less the beam each puts on its missile. */
function laserHeat(world, room) {
  let heat = 0;
  for (const f of world.fittings) if (f.type === 'pdLaser' && f.room === room.id) { const P = laserPower(world, f); heat += (P / tierScaled(world, world.params.beambay.efficiency) - P) * world.dt; }
  return heat;
}

/**
 * Control (13f.1, #12, #81, #147): a room is controlled while live walls join
 * it to a bridge that gives control (surviving cells, not shut down, switched
 * on) in its fragment. A room that loses control raises 'control-lost' and
 * stops; a reactor SCRAMs (setControl). Regaining a path restores control; a
 * SCRAMmed reactor restarts reactor.restartTime later, once below hot (#82,
 * 13k.1).
 */
function updateControl(world, cause) {
  const walls = liveWalls(world).filter((w) => w.live > 0);
  const bridges = world.rooms.filter((r) => r.type === 'bridge' && r.placed && survivingCells(r) > 0 && !down(r) && r.active && !r.exploded);
  const reached = reachedThrough(walls, bridges);
  // Outside any event (the step's own check), a change follows the bridge's last change (13l.1).
  const parent = world.log.context.length ? null : world.log.bridgeChange || null;
  for (const room of world.rooms) {
    if (!room.placed || room.type === 'bridge') continue;
    const now = reached.has(room);
    if (room.controlled && !now) { const ev = event(world, room, 'control-lost', cause, {}, parent); room.marks.controlLost = ev.id; within(world.log, ev, () => setControl(world, room, false, cause)); }
    else if (!room.controlled && now) { room.controlled = true; room.marks.controlRestored = event(world, room, 'control-restored', cause, {}, parent).id; if (room.type === 'reactor') controlChanged(world, room, true); }
  }
}

/** Fraction at which an RCS fitting fires (0 if it cannot): its host's power fraction, while the host is controlled (13f.1). */
function rcsFraction(world, f) {
  const host = roomById(world, f.room);
  if (!f.fired || !cellAlive(host, f.k) || host.exploded || !host.active || down(host) || !host.controlled || !host.powered || isDestroyed(host)) return 0;
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
  for (const f of world.fittings) if (f.type === 'rcs' && f.room === room.id) heat += rcsFraction(world, f) * tierScaled(world, world.params.rcs.powerDraw) * tierScaled(world, world.params.engine.heatFraction) * world.dt;
  return heat;
}

/**
 * The draw (W) of a room's scanning antennas (13n.1 (a), #289): sensor.scanPower for each antenna given a zone
 * (js/sensors.js setScan) on a standing cell, while the host is controlled.
 */
function scanRequest(world, room) {
  if (!room.controlled) return 0;
  let n = 0;
  for (const f of world.fittings) if (f.type === 'antenna' && f.room === room.id && f.scan && !room.cells[f.k].destroyed) n++;
  return n * tierScaled(world, world.params.sensor.scanPower);
}
/** Heat (J) of the step from the room's scanning antennas: their draw as delivered, all of it heat in the host (#289). */
function scanHeat(world, room) {
  if (!room.powered || down(room) || isDestroyed(room)) return 0;
  return scanRequest(world, room) * supply(world, room) * world.dt;
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
    const K0 = 0.5 * b.M * (b.v[0] * b.v[0] + b.v[1] * b.v[1]) + 0.5 * b.I * b.omega * b.omega;
    integrate(b, forces, dt, ship.external);
    ship.energy.work += 0.5 * b.M * (b.v[0] * b.v[0] + b.v[1] * b.v[1]) + 0.5 * b.I * b.omega * b.omega - K0; // thrust and RCS (B3)
  }
  for (const x of ship.debris) { x.x[0] += x.v[0] * dt; x.x[1] += x.v[1] * dt; }
  for (const x of ship.rounds) {
    const h = x.first === undefined ? dt : x.first; // a round fired at into its step moves (dt - at) v in it (F20)
    delete x.first;
    x.x[0] += x.v[0] * h; x.x[1] += x.v[1] * h;
  }
}

/**
 * Culling (#222 (7), 13k.1): a round or debris piece farther than
 * battle.cullDistance (k = 1) from every body of the ship leaves play; its
 * mass, momentum, angular momentum about the origin and kinetic energy are
 * booked in world.ship.left, so bodies + debris + rounds + left keep the
 * books. Called by its user (the battle loop every step, js/battle.js, §17
 * item 26; the prototype; a scenario), not by step(). `others`: the bodies of
 * the other ships in the same frame (a battle), which a round or debris must
 * also be farther than D from. Returns the number removed.
 */
export function cull(world, others = []) {
  const ship = world.ship, D = tierScaled(world, world.params.battle.cullDistance);
  const left = ship.left ??= { m: 0, P: [0, 0], L: 0, K: 0, rounds: 0, debris: 0 };
  const far = (x) => [...ship.bodies, ...others].every((b) => { const dx = x.x[0] - b.x[0], dy = x.x[1] - b.x[1]; return Math.sqrt(dx * dx + dy * dy) > D; });
  let n = 0;
  for (const kind of ['rounds', 'debris']) {
    ship[kind] = ship[kind].filter((x) => {
      if (!far(x)) return true;
      const spin = kind === 'debris' ? x.spin : 0, w = kind === 'debris' ? x.omega : 0;
      left.m += x.m; left.P[0] += x.m * x.v[0]; left.P[1] += x.m * x.v[1];
      left.L += x.m * cross(x.x, x.v) + spin * w;
      left.K += 0.5 * x.m * (x.v[0] * x.v[0] + x.v[1] * x.v[1]) + 0.5 * spin * w * w;
      left[kind]++; n++;
      return false;
    });
  }
  return n;
}

/**
 * A test fixture's impulse J (world, N s) at grid point p of the body holding
 * that point's cell (13f.3 row 4: a railgun-sized impulse before the railgun
 * is built); booked as external, like thrust.
 */
export function fixtureImpulse(world, J, p, bodyId = world.ship.bodies[0].id) {
  const b = world.ship.bodies.find((x) => x.id === bodyId), q = worldPoint(b, p);
  applyImpulse(b, J, p);
  world.ship.external.J[0] += J[0]; world.ship.external.J[1] += J[1];
  const h = q[0] * J[1] - q[1] * J[0];
  world.ship.external.H += h;
  world.ship.external.Hgross += Math.abs(h);
}

/** Momentum, angular momentum about the origin and kinetic energy of bodies, debris and rounds, and the external impulse booked. */
export function shipMomentum(world) {
  return { ...momentumOf(world.ship), external: { J: [...world.ship.external.J], H: world.ship.external.H, Hgross: world.ship.external.Hgross } };
}

/** Steady heat (W) a room generates in its current settings, as its behaviour would (the readout's load, #58). */
function heatRate(world, room) {
  if (room.exploded || !room.active || isDestroyed(room)) return 0;
  const p = world.params, sf = survivingFraction(room), f = room.footprintFactor * sf;
  let rate = 0;
  if (room.type === 'reactor') rate = tierScaled(world, p.reactor.heatPerPower) * room.reactor.demand * reactorPower(world, room) * sf;
  else if (room.type === 'shieldGenerator') rate = room.shield.on ? tierScaled(world, p.shield.powerDraw) * f : 0;
  else if (room.type === 'engine') rate = room.engine.throttle * tierScaled(world, p.engine.powerDraw) * f * tierScaled(world, p.engine.heatFraction);
  else if (room.type === 'beamBay') { const beam = tierScaled(world, p.beam.power) * f; rate = room.beamBay.firing ? beam / tierScaled(world, p.beambay.efficiency) - beam : 0; }
  else if (room.type === 'bridge') rate = tierScaled(world, p.bridge.powerDraw) * sf;
  else if (room.type === 'quarters') rate = tierScaled(world, p.quarters.powerDraw) * sf;
  else if (room.type === 'railgun') rate = room.railgun.firing ? railgunDraw(world, room) * (1 - tierScaled(world, p.railgun.efficiency)) : 0;
  else if (room.type === 'turret' && !room.turret.hold && room.turret.ammo > 0) rate = tierScaled(world, p.turret.heatPerShot) * FIXED.sizeLinear.value[room.size] ** 3 * (tierScaled(world, p.turret.fireRate) / FIXED.sizeLinear.value[room.size]);
  for (const fit of world.fittings) if (fit.type === 'rcs' && fit.room === room.id && fit.fired && cellAlive(room, fit.k)) rate += tierScaled(world, p.rcs.powerDraw) * tierScaled(world, p.engine.heatFraction);
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
  const p = world.params, items = world.ship ? world.ship.items : shipItems(world); // a blueprint before enableShip too (#222 (4))
  const props = massProperties([...items.values()]);
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
  const capacity = radiatorPower(tierScaled(world, p.thermal.plantHot), panels, tierScaled(world, p.radiator.area), FIXED.radiatorEmissivity.value, FIXED.stefanBoltzmann.value);
  return {
    mass: props.M, centre: props.c, inertia: props.I, accelerationG: thrust / props.M / FIXED.standardGravity.value,
    rcs: { ccw: ccw / props.I, cw: cw / props.I, turn90ccw: turn(ccw / props.I), turn90cw: turn(cw / props.I) },
    heat: { generated, capacity, panels, balance: capacity - generated },
  };
}
