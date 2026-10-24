// sensors.js — the senses and the knowledge model (DESIGN.md 13n.1 (a), L5b;
// #23-#28, #101-#103, #112, #278, #289). Each side's sources are what the
// kernel radiates: a radiator panel at its room's temperature (irBrightness
// over the room's working panels, at the panel's edge midpoint) and an
// engine's exhaust (jet power, its thrust x engine.exhaustVelocity / 2, at the
// exhaust face's centre) in the infrared; a scanning antenna (sensor.scanPower,
// at its edge midpoint) and an absorbing shield (its absorbed power, at its
// generator room's centre) in the EM band. Every source is a point; no
// occlusion and no facing. An antenna fitting resolves a source of the other
// side when it receives P x sensor.area / (4 pi d^2) >= sensor.sensitivity
// (passive, d^-2; it needs only its cell standing). Active: the other ship's
// occupied box at undock is split into 3 x 2 zones; an antenna whose host is
// controlled and powered scans one zone, its progress growing by
// dt / (sensor.scanTime (d / sensor.scanRange)^4) a step (d from the antenna to
// the zone's centre that step), resolving at 1; a change of zone or a loss of
// power or control resets it. A resolved zone reveals its own cells (room id
// and type, integrity, plates on their segments) at that step; a room is known
// once one of its cells is; state after the scan comes only from a re-scan or
// from passive IR on the room's panels. The silhouette (standing cells, hull
// segments, the bodies' poses) is free at every range (#23). The model is one
// per side; the battle (js/battle.js) builds it when its `knowledge` setting is
// on, and its aim reads only it. Events go to the observer's log, room the
// antenna's host: 'scan-started' (root scan-<n>), 'zone-resolved' (its parent
// the scan-started), 'source-resolved' (root 'sense'). L5c (13n.1 (c)): a
// missile in flight is a source of its side: its exhaust in the IR while it
// burned in the step (jet power m a v_e / 2, the engine's formula), and a radar
// seeker's scan in the EM band (sensor.scanPower); an antenna's host in an EMP's
// outage does not scan. The seekers (js/missile.js) read the model.
// L5d (#301, §17 item 45): the model keeps no reference to the other world (the
// world it is about is the pair's `other`, else its creation's, kept here); a
// scan under a browned-out host progresses and radiates at the host's power
// fraction (#193).
// No DOM, no Math.random.
import { scaled } from './data.js';
import { irBrightness, isDestroyed, plateGone, roomTemperature } from './rooms.js';
import { segmentKey } from './layout.js';
import { worldPoint } from './body.js';
import { emit } from './events.js';

const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const key = (x, y) => `${x},${y}`;
const tierScaled = (world, p) => scaled(p, world.edge);
const roomById = (world, id) => world.rooms.find((r) => r.id === id);
const bodyById = (world, id) => world.ship.bodies.find((b) => b.id === id) || mainBody(world);
const mainBody = (world) => world.ship.bodies.find((b) => b.id === 'body-0') || [...world.ship.bodies].sort((a, b) => b.M - a.M)[0] || null;
const cellAlive = (room, k) => !room.cells[k].destroyed && room.cells[k].fragment === room.body;
const dist2 = (a, b) => { const dx = a[0] - b[0], dy = a[1] - b[1]; return dx * dx + dy * dy; };

/** The antenna fittings of a world, in fitting order. */
export const antennas = (world) => world.fittings.filter((f) => f.type === 'antenna');

/**
 * The 3 x 2 zones of a ship (13n.1 (a), #289): its occupied box at undock in its grid, W x H cells from (x0, y0);
 * column bounds x0 + ceil(i W / 3) (i = 0..3, stern to bow), row bounds y0 + ceil(j H / 2) (j = 0..2); zone 3 j + i.
 * Each: { id, x: [x_i, x_i+1), y: [y_j, y_j+1), cells (occupied, row by row from the low row), centre (grid m),
 * first (its first cell) }.
 */
export function zonesOf(world) {
  const cells = [...world.layout.occupied.keys()].map((k) => k.split(',').map(Number));
  const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), W = Math.max(...xs) - x0 + 1, H = Math.max(...ys) - y0 + 1, e = world.edge;
  const xb = [0, 1, 2, 3].map((i) => x0 + Math.ceil((i * W) / 3)), yb = [0, 1, 2].map((j) => y0 + Math.ceil((j * H) / 2));
  const zones = [];
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) {
    const inside = [];
    for (let y = yb[j]; y < yb[j + 1]; y++) for (let x = xb[i]; x < xb[i + 1]; x++) if (world.layout.occupied.has(key(x, y))) inside.push([x, y]);
    zones.push({ id: 3 * j + i, x: [xb[i], xb[i + 1]], y: [yb[j], yb[j + 1]], cells: inside, centre: [((xb[i] + xb[i + 1]) / 2) * e, ((yb[j] + yb[j + 1]) / 2) * e], first: inside[0] || null });
  }
  return zones;
}

// The world each model is about (L5d, #301, §17 item 45 (a)): kept here, not in the model, so the model holds only what
// its side knows and nothing that reads the other world; sense() takes it from its pair or from here.
const OTHER = new WeakMap();
const otherOf = (p) => p.other || OTHER.get(p.model);

/** The knowledge model of the ship of `world` about the ship of `other` (13n.1 (a)); `edge` and `grid` are the other's drydock's (free, #23). */
export function createKnowledge(world, other) {
  const model = {
    edge: other.edge, grid: [...other.layout.grid], zones: zonesOf(other), scans: 0,
    silhouette: { step: null, bodies: [], cells: [], segments: [] },
    cells: new Map(), // 'x,y' -> { cell, room, type, size, k, integrity, destroyed, plates, step, zone }
    rooms: new Map(), // id -> { id, type, size, cells: [keys], step, ir: { class, step } | null }
    resolved: new Map(), // zone -> the step it last resolved
    sources: new Map(), // source id -> { kind, band, position, received, class, cell, step (last resolved), now }
    shots: [], hits: [],
  };
  OTHER.set(model, other);
  return model;
}

/** Command an antenna (a fitting, or its index among the world's antennas) to scan zone `zone`, or stop with null. */
export function setScan(world, antenna, zone) {
  const f = typeof antenna === 'number' ? antennas(world)[antenna] : antenna;
  if (!f || f.type !== 'antenna') throw new Error(`no antenna ${antenna}`);
  if (zone === null || zone === undefined) { f.scan = null; return f; }
  if (!(Number.isInteger(zone) && zone >= 0 && zone < 6)) throw new Error(`zone ${zone}: a zone is 0-5 (13n.1 (a))`);
  if (!f.scan || f.scan.zone !== zone) f.scan = { zone, progress: 0, started: null }; // a change of zone resets the scan
  return f;
}

/** An antenna can scan this step: given a zone, its cell standing, its host controlled, powered, switched on, not shut down, manned or destroyed (#289). */
function scanAble(world, f) {
  const host = roomById(world, f.room);
  return !!f.scan && !host.cells[f.k].destroyed && host.controlled && host.powered && host.active && !host.shutdown && !host.unmanned && !host.outage && !host.exploded && !isDestroyed(host);
}
/** The power fraction of an antenna's host this step (#193): under routing what it received of its draw, else 1 (#301, §17 item 45 (b)). */
const hostFraction = (world, f) => (world.power ? roomById(world, f.room).powerFraction : 1);
/** The world point (m) of a fitting's edge midpoint, on the body holding its cell. */
const fittingPoint = (world, f) => worldPoint(bodyById(world, roomById(world, f.room).cells[f.k].fragment), f.p);

/** A room's temperature class by its own thresholds: rest, hot, overheated or critical. */
export function temperatureClass(room) {
  const T = roomTemperature(room), th = room.thresholds;
  return T >= th.critical ? 'critical' : T >= th.overheated ? 'overheated' : T >= th.hot ? 'hot' : 'rest';
}

/**
 * The sources of a world this step (13n.1 (a), #289), each { id, kind, band, P (W), position (world m) } and, for a
 * panel, its room's temperature class and its segment (cell, side): every working panel, every engine with thrust,
 * every antenna that scans this step, every shield generator absorbing (s.em, a beam's absorbed power, and the
 * buffer's payment for rounds over the step, roundEm).
 */
export function sourcesOf(world) {
  const out = [];
  for (const f of world.fittings) {
    if (f.type === 'radiator') {
      const room = roomById(world, f.room);
      if (!cellAlive(room, f.k) || !(room.radiators > 0)) continue;
      out.push({ id: `panel:${f.id}`, kind: 'panel', band: 'ir', P: irBrightness(world, room) / room.radiators, position: fittingPoint(world, f), class: temperatureClass(room), cell: [...f.cell], side: [...f.side] });
    } else if (f.type === 'antenna' && scanAble(world, f)) {
      out.push({ id: `antenna:${f.id}`, kind: 'antenna', band: 'em', P: tierScaled(world, world.params.sensor.scanPower) * hostFraction(world, f), position: fittingPoint(world, f), cell: [...f.cell], side: [...f.side] });
    }
  }
  for (const room of world.rooms) {
    if (!room.placed || isDestroyed(room)) continue;
    if (room.type === 'engine' && room.engine.thrust > 0) {
      out.push({ id: `exhaust:${room.id}`, kind: 'exhaust', band: 'ir', P: (room.engine.thrust * tierScaled(world, world.params.engine.exhaustVelocity)) / 2, position: worldPoint(bodyById(world, room.body), room.exhaust) });
    }
    if (room.type === 'shieldGenerator') {
      const P = room.shield.em + room.shield.roundEm;
      if (P > 0) out.push({ id: `shield:${room.id}`, kind: 'shield', band: 'em', P, position: worldPoint(bodyById(world, room.body), room.position) });
    }
  }
  // Missiles in flight (L5c, 13n.1 (c)): the exhaust while it burned in the step, a radar seeker's scan.
  const p = world.params;
  for (const x of world.ship.missiles || []) {
    if (world.t - world.dt < x.t + tierScaled(world, p.missile.burnTime)) out.push({ id: `missile:${x.cause}`, kind: 'missile', band: 'ir', P: (x.m * tierScaled(world, p.missile.acceleration) * tierScaled(world, p.engine.exhaustVelocity)) / 2, position: [...x.x] });
    if (x.seeker === 'radar') out.push({ id: `missile-radar:${x.cause}`, kind: 'missile', band: 'em', P: tierScaled(world, p.sensor.scanPower), position: [...x.x] });
  }
  return out;
}

/** The free silhouette (#23): the other ship's standing cells with their bodies, its hull segments, its bodies' poses. */
function silhouette(model, other) {
  const standing = new Map();
  for (const room of other.rooms) {
    if (!room.placed) continue;
    const grid = other.layout.rooms.get(room.id).cells;
    room.cells.forEach((c, k) => { if (!c.destroyed) standing.set(key(...grid[k]), c.fragment); });
  }
  const cells = [], segments = [];
  for (const [k, body] of standing) {
    const [x, y] = k.split(',').map(Number);
    cells.push([x, y, body]);
    for (const [dx, dy] of SIDES) if (standing.get(key(x + dx, y + dy)) !== body) segments.push([x, y, dx, dy]);
  }
  model.silhouette = { step: other.step, bodies: other.ship.bodies.map((b) => ({ id: b.id, x: [...b.x], c: [...b.c], theta: b.theta })), cells, segments, standing };
}
/** The pose the model sees for grid cell [x, y]: its body's, by the silhouette; a cell no longer standing, the main body's. */
function poseOf(model, cell) {
  const s = model.silhouette, id = s.standing.get(key(...cell));
  return s.bodies.find((b) => b.id === id) || s.bodies.find((b) => b.id === 'body-0') || s.bodies[0];
}

/** Passive (d^-2): the observer's antennas on standing cells against the other side's sources. */
function passive(model, world, sources) {
  const ants = antennas(world).filter((f) => !roomById(world, f.room).cells[f.k].destroyed).map((f) => ({ f, at: fittingPoint(world, f) }));
  const A = tierScaled(world, world.params.sensor.area), S = tierScaled(world, world.params.sensor.sensitivity);
  const seen = new Set();
  for (const src of sources) {
    let by = null, best = 0;
    for (const a of ants) {
      const received = (src.P * A) / (4 * Math.PI * dist2(a.at, src.position));
      if (received > best) best = received;
      if (!by && received >= S) by = a.f;
    }
    if (!by) continue;
    seen.add(src.id);
    const was = model.sources.get(src.id);
    model.sources.set(src.id, { kind: src.kind, band: src.band, position: [...src.position], received: best, class: src.class || null, cell: src.cell || null, side: src.side || null, step: world.step, now: true });
    if (!was || !was.now) {
      const host = roomById(world, by.room);
      emit(world.log, { t: world.t, type: 'source-resolved', room: host.id, cause: 'sense', crew: host.crew, kind: src.kind, band: src.band, source: src.id, position: [...src.position], parent: 'sense' });
    }
    // A panel's temperature class is the IR state of its room once the model knows the room (#25).
    if (src.kind === 'panel') {
      const c = model.cells.get(key(...src.cell));
      if (c) model.rooms.get(c.room).ir = { class: src.class, step: world.step };
    }
  }
  for (const [id, s] of model.sources) if (!seen.has(id)) s.now = false; // its last known position stays
}

/** Reveal zone z of the other ship at this step: its own cells, nothing of other zones (#289 (4)). */
function reveal(model, other, z) {
  const rooms = new Set();
  for (const cell of model.zones[z].cells) {
    const o = other.layout.occupied.get(key(...cell)), room = roomById(other, o.id), c = room.cells[o.k];
    const plates = [];
    for (const side of SIDES) {
      const f = other.plates.get(segmentKey(cell, side));
      if (f) plates.push({ side: [...side], id: f.id, integrity: plateGone(other, f) ? 0 : f.integrity, destroyed: plateGone(other, f) });
    }
    model.cells.set(key(...cell), { cell: [...cell], room: room.id, type: room.type, size: room.size, k: o.k, integrity: c.destroyed ? 0 : c.integrity, destroyed: c.destroyed, plates, step: other.step, zone: z });
    const r = model.rooms.get(room.id) || { id: room.id, type: room.type, size: room.size, cells: [], step: null, ir: null };
    if (!r.cells.includes(key(...cell))) r.cells.push(key(...cell));
    r.step = other.step;
    model.rooms.set(room.id, r);
    rooms.add(room.id);
  }
  model.resolved.set(z, other.step);
  return [...rooms];
}

/** The world point (m) of zone z's centre: its rectangle's centre on the body that holds its first cell (#289). */
export function zoneCentre(model, z) {
  const zone = model.zones[z];
  return worldPoint(poseOf(model, zone.first || [zone.x[0], zone.y[0]]), zone.centre);
}

/** The aim point (world m) of a room the model knows: the centre of its first known standing cell (cell index order), or null (#289). */
export function knownAim(model, id) {
  const r = model.rooms.get(id);
  if (!r) return null;
  const c = r.cells.map((k) => model.cells.get(k)).filter((x) => !x.destroyed).sort((a, b) => a.k - b.k)[0];
  if (!c) return null;
  const e = model.edge;
  return worldPoint(poseOf(model, c.cell), [(c.cell[0] + 0.5) * e, (c.cell[1] + 0.5) * e]);
}

/** Active (d^4): each antenna given a zone progresses on it while it can scan, else its scan resets (#289 (2)). */
function scans(model, world, other) {
  if (!model.silhouette.bodies.length) return; // nothing of the other ship left to scan
  const dt = world.dt, T0 = tierScaled(world, world.params.sensor.scanTime), R = tierScaled(world, world.params.sensor.scanRange);
  for (const f of antennas(world)) {
    if (!f.scan) continue;
    if (!scanAble(world, f)) { f.scan.progress = 0; f.scan.started = null; continue; }
    const host = roomById(world, f.room);
    if (!f.scan.started) {
      const root = `scan-${++model.scans}`;
      f.scan.started = emit(world.log, { t: world.t, type: 'scan-started', room: host.id, cause: root, crew: host.crew, zone: f.scan.zone, antenna: f.id, parent: root });
    }
    const q = dist2(fittingPoint(world, f), zoneCentre(model, f.scan.zone)) / (R * R); // (d / scanRange)^2
    f.scan.progress += (dt / (T0 * q * q)) * hostFraction(world, f); // a browned-out host scans at its power fraction (#301, item 45 (b))
    if (f.scan.progress >= 1) {
      const z = f.scan.zone, rooms = reveal(model, other, z), start = f.scan.started;
      f.scan = null; // resolved: the antenna stops; a re-scan is a new command
      emit(world.log, { t: world.t, type: 'zone-resolved', room: host.id, cause: start.cause, crew: host.crew, zone: z, rooms, antenna: f.id, parent: start.id });
    }
  }
}

/**
 * One sensing pass after a step (13n.1 (a)) for `pairs` [{ world, model, other }], each model about `other` (its creation's
 * other world when a pair names none, #301): the
 * sources of every world as they were in the step, then each side's silhouette and passive resolution, then (unless
 * `scan` is false) each side's scans.
 */
export function sense(pairs, { scan = true } = {}) {
  const emitted = new Map(pairs.map((p) => [otherOf(p), sourcesOf(otherOf(p))]));
  for (const p of pairs) { silhouette(p.model, otherOf(p)); passive(p.model, p.world, emitted.get(otherOf(p))); }
  if (scan) for (const p of pairs) scans(p.model, p.world, otherOf(p));
}
