// layout.js — the cell grid of a cluster (DESIGN.md 13d.1, #192).
// One grid at the tier's edge. A room occupies a rectangle of cells at an
// integer cell position, its footprint [w, h] rotated by 0 or 90 degrees;
// rooms never overlap. A room's cell k is local (i, j) with k = j * w + i in
// its unrotated footprint. Two rooms share a wall along every pair of
// edge-adjacent cells, one in each; the wall's length is pairs x edge. An
// open edge is a room cell edge with no room cell beside it (the grid's
// border included); a room carries at most one radiator per open edge (#15).
// Positions in metres: the grid's corner is the origin, cell (x, y) spans
// [x e, (x + 1) e] x [y e, (y + 1) e]. From L3 (13f.1, #57, #208): fittings on
// open edges and the validation of a ship's blueprint. The path model (13i.1,
// #234): a spinal room (the beam bay) is N cells long along the ship's axis,
// on its axis rows, its bow face clear. L4a (13l.1, #255, #256): an armour
// plate sits on one wall segment, a hull edge or a shared wall (never a deck),
// and the crew the rooms require must have berths in the quarters. No DOM, no
// Math.random.
import { PARAMS, scaled } from './data.js';

const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const key = (x, y) => `${x},${y}`;
/** Room-id order (#193): plain string order, so the result never depends on insertion order. */
export const byId = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function createLayout({ edge, grid }) {
  return { edge, grid, rooms: new Map(), occupied: new Map(), walls: null, types: new Map() };
}

/**
 * A room's footprint [w, h] at `size`. A spinal room (ROOMS spinal, #234)
 * given a `length` N is N cells along x: [N, h], N a whole number of at least
 * spinal.min; without one it keeps its footprint. Throws for a size the type
 * does not have, a length on a room that is not spinal, or a footprint still
 * holding 'N' (the railgun stays data only, #185 (3)).
 */
export function roomFootprint(def, type, size = 'M', length = null) {
  const fp = def.footprint[size];
  if (!fp || typeof fp[0] !== 'number' || typeof fp[1] !== 'number') throw new Error(`${type} has no buildable size ${size}`);
  if (length === null) return fp;
  if (!def.spinal) throw new Error(`${type} is not a spinal room and has no length (#234)`);
  if (!Number.isInteger(length) || length < def.spinal.min) throw new Error(`${type}: length ${length} must be a whole number of at least ${def.spinal.min} cells (#234)`);
  return [length, fp[1]];
}

/** Grid cell of local cell (i, j) of a w x h footprint placed at `at` with `rotation` (0 or 90). */
export function cellAt(w, h, i, j, at, rotation) {
  return rotation === 0 ? [at[0] + i, at[1] + j] : [at[0] + (h - 1 - j), at[1] + i];
}

/** Place a room; throws on a bad rotation, a non-integer position, the grid's border or an overlap. */
export function placeRoom(layout, id, footprint, at, rotation = 0, type = null) {
  const [w, h] = footprint;
  if (rotation !== 0 && rotation !== 90) throw new Error(`${id}: rotation must be 0 or 90 degrees`);
  if (!Number.isInteger(at[0]) || !Number.isInteger(at[1])) throw new Error(`${id}: a room sits at an integer cell position`);
  if (layout.rooms.has(id)) throw new Error(`${id}: already placed`);
  const cells = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) cells.push(cellAt(w, h, i, j, at, rotation));
  for (const [x, y] of cells) {
    if (x < 0 || y < 0 || x >= layout.grid[0] || y >= layout.grid[1]) throw new Error(`${id}: cell (${x}, ${y}) is outside the ${layout.grid[0]} x ${layout.grid[1]} grid`);
    const other = layout.occupied.get(key(x, y));
    if (other !== undefined) throw new Error(`${id}: cell (${x}, ${y}) overlaps ${other.id}`);
  }
  const room = { id, footprint: [w, h], at: [...at], rotation, cells };
  cells.forEach(([x, y], k) => layout.occupied.set(key(x, y), { id, k }));
  layout.rooms.set(id, room);
  if (type) layout.types.set(id, type);
  layout.walls = null;
  return room;
}

/**
 * Shared walls between placed rooms: one entry per pair of rooms that touch,
 * with a < b in room-id order, the cell pairs [ka, kb] (cell indices in each
 * room) in a fixed order, and the full length (pairs x edge).
 */
export function sharedWalls(layout) {
  if (layout.walls) return layout.walls;
  const found = new Map();
  for (const room of layout.rooms.values()) {
    room.cells.forEach(([x, y], k) => {
      for (const [dx, dy] of SIDES) {
        const n = layout.occupied.get(key(x + dx, y + dy));
        if (!n || n.id === room.id || byId(room.id, n.id) > 0) continue;
        const id = `${room.id}|${n.id}`;
        if (!found.has(id)) found.set(id, { a: room.id, b: n.id, pairs: [] });
        found.get(id).pairs.push([k, n.k]);
      }
    });
  }
  layout.walls = [...found.values()]
    .sort((p, q) => byId(p.a, q.a) || byId(p.b, q.b))
    .map((wall) => ({ ...wall, length: wall.pairs.length * layout.edge }));
  return layout.walls;
}

/** Open edges of a room: cell edges with no room cell beside them. */
export function openEdges(layout, id) {
  const room = layout.rooms.get(id);
  let n = 0;
  for (const [x, y] of room.cells) for (const [dx, dy] of SIDES) if (!layout.occupied.has(key(x + dx, y + dy))) n++;
  return n;
}

/** Centre of a placed room in metres (fields measure distances between centres). */
export function roomCentre(layout, id) {
  const room = layout.rooms.get(id), e = layout.edge, [w, h] = room.footprint;
  const [W, H] = room.rotation === 0 ? [w, h] : [h, w];
  return [(room.at[0] + W / 2) * e, (room.at[1] + H / 2) * e];
}

// ---------- ships: fittings and validation (L3, DESIGN.md 13f.1, #57, #208) ----------
// A fitting sits on one cell edge: grid cell [x, y] and side [dx, dy], the
// outward direction of that edge. Its position is the edge's midpoint.
// Placement classes come from ROOMS: 'inside' rooms carry no fitting (the
// shield generator is placed anywhere, #219 (1)); a placement naming 'hull' needs an
// open edge; 'exhaust clear' marks the engine, whose exhaust face is the
// room's aft face (smallest x: the ship's forward axis is +x).

const edgeKey = (cell, side) => `${cell[0]},${cell[1]}|${side[0]},${side[1]}`;
/** Midpoint (m) of the edge on `side` of grid cell `cell`. */
export function edgeMidpoint(edge, cell, side) {
  return [(cell[0] + 0.5 + side[0] / 2) * edge, (cell[1] + 0.5 + side[1] / 2) * edge];
}
/** The cells of a placed room on its aft face (smallest x), and its centre point (m). */
export function exhaustFace(layout, id) {
  const cells = layout.rooms.get(id).cells, x0 = Math.min(...cells.map((c) => c[0]));
  const face = cells.filter((c) => c[0] === x0), ys = face.map((c) => c[1]);
  return { cells: face, x: x0, point: [x0 * layout.edge, ((Math.min(...ys) + Math.max(...ys) + 1) / 2) * layout.edge] };
}
const isOpen = (layout, cell, side) => !layout.occupied.has(key(cell[0] + side[0], cell[1] + side[1]));

/**
 * Why a fitting { room, cell, side } cannot sit where it is asked to (null if
 * it can), given the fittings already placed (#15, #57, #208). `defs` is ROOMS.
 */
export function fittingProblem(layout, defs, fitting, placed = []) {
  const room = layout.rooms.get(fitting.room);
  if (!room) return { rule: 'fitting-open-edge', detail: `no room ${fitting.room}` };
  if (!room.cells.some((c) => c[0] === fitting.cell[0] && c[1] === fitting.cell[1])) return { rule: 'fitting-open-edge', detail: `cell (${fitting.cell}) is not in ${room.id}` };
  const def = defs[layout.types.get(room.id)];
  if (def.placement === 'inside') return { rule: 'fitting-inside', detail: `${room.id} is placed inside and carries no fitting` };
  if (!isOpen(layout, fitting.cell, fitting.side)) return { rule: 'fitting-open-edge', detail: `the edge (${fitting.cell}) side (${fitting.side}) of ${room.id} is not open` };
  if (def.placement.includes('exhaust clear') && fitting.side[0] === -1 && fitting.cell[0] === exhaustFace(layout, room.id).x) return { rule: 'fitting-exhaust', detail: `${room.id}: no fitting on an exhaust face` };
  if (placed.some((f) => edgeKey(f.cell, f.side) === edgeKey(fitting.cell, fitting.side))) return { rule: 'fitting-per-edge', detail: `two fittings on the edge (${fitting.cell}) side (${fitting.side})` };
  return null;
}

/**
 * The wall segment between grid cell `cell` and its neighbour on `side`, the same key from either side: the
 * cell with the smaller x (side [1, 0]) or y (side [0, 1]) names it. Plates are found by it (13l.1).
 */
export function segmentKey(cell, side) {
  return side[0] + side[1] > 0 ? edgeKey(cell, side) : edgeKey([cell[0] + side[0], cell[1] + side[1]], [-side[0], -side[1]]);
}
/**
 * Why an armour plate { room, cell, side } cannot sit where it is asked to (null if it can), given the
 * fittings and plates already placed (13l.1, #255, #256). A plate sits on one wall segment of a cell of its room:
 * a hull edge (an open edge, where the fitting rules hold: not on an inside room, not on an exhaust face, one
 * fitting per edge, #15) or a shared wall (the neighbour cell in another room; any room, the magazine's citadel
 * included); never on an edge inside its own room, and at most one plate per segment ('plate-wall',
 * 'fitting-per-edge').
 */
export function plateProblem(layout, defs, plate, placed = []) {
  const room = layout.rooms.get(plate.room);
  if (!room) return { rule: 'fitting-open-edge', detail: `no room ${plate.room}` };
  if (!room.cells.some((c) => c[0] === plate.cell[0] && c[1] === plate.cell[1])) return { rule: 'fitting-open-edge', detail: `cell (${plate.cell}) is not in ${room.id}` };
  const other = layout.occupied.get(key(plate.cell[0] + plate.side[0], plate.cell[1] + plate.side[1]));
  if (!other) return fittingProblem(layout, defs, plate, placed); // a hull edge: a fitting like any other (#15)
  if (other.id === room.id) return { rule: 'plate-wall', detail: `the edge (${plate.cell}) side (${plate.side}) lies inside ${room.id}: a plate sits on a hull edge or a shared wall` };
  const k = segmentKey(plate.cell, plate.side);
  if (placed.some((f) => f.type === 'armour' && segmentKey(f.cell, f.side) === k)) return { rule: 'fitting-per-edge', detail: `two plates on the wall segment (${plate.cell}) side (${plate.side})` };
  return null;
}

/**
 * Crew capacity (#60, #220 (5), 13l.1): the crew every room requires (its crewRequired constant at the edge, x
 * its cell ratio, rounded, as rooms.js crews it) against the berths of the quarters (cells x
 * quarters.crewPerCell at the edge, rounded). Returns { required, berths }.
 */
export function crewCapacity(layout, defs, params = PARAMS) {
  let required = 0, berths = 0;
  for (const room of layout.rooms.values()) {
    const type = layout.types.get(room.id), def = defs[type], n = room.cells.length;
    if (def.crew === 'housed') berths += Math.round(scaled(params.quarters.crewPerCell, layout.edge)) * n;
    else if (def.crew) {
      const [g, c] = def.crew.split('.'), ratio = n / (def.footprint.M[0] * def.footprint.M[1]);
      required += Math.round(scaled(params[g][c], layout.edge) * ratio);
    }
  }
  return { required, berths };
}

/**
 * Validation (#57, 13f.1): a blueprint { grid, edge, rooms: [{ id, type,
 * size, cell, rotation }], fittings: [{ type, room, cell, side }] } undocks
 * only if every rule holds. Returns { valid, reasons: [{ rule, room,
 * detail }] }; each failure names its rule: 'grid' (a room leaves the
 * drydock grid), 'overlap', 'connected' (a room not joined to a bridge
 * through shared walls), 'hull' (a hull room with no open edge), 'exhaust'
 * (an engine's exhaust face not open, or a cell aft of it in its rows),
 * 'axis' (a spinal room, placement 'axis', not lying along x on the ship's
 * axis rows: its rows must hold the ship's centre line, the mean row of the
 * cells of the rooms joined to a bridge, strictly inside them), 'bow' (a room placed 'bow
 * clear' with a cell ahead of it in its rows, #234), and the fitting rules
 * of fittingProblem; an armour plate (type 'armour') by plateProblem's; and
 * 'crew' (13l.1, #60): the crew the rooms require exceeds the quarters'
 * berths (crewCapacity, with `params`, PARAMS unless given). A room's `length`
 * is its N if it is spinal. A room that leaves the grid or overlaps is not
 * placed, so it is judged by that rule alone.
 */
export function validateShip(blueprint, defs, params = PARAMS) {
  const layout = createLayout({ edge: blueprint.edge || 1, grid: blueprint.grid });
  const reasons = [];
  for (const r of blueprint.rooms) {
    const fp = roomFootprint(defs[r.type], r.type, r.size || 'M', r.length ?? null), rot = r.rotation || 0, cells = [];
    for (let j = 0; j < fp[1]; j++) for (let i = 0; i < fp[0]; i++) cells.push(cellAt(fp[0], fp[1], i, j, r.cell, rot));
    const out = cells.find(([x, y]) => x < 0 || y < 0 || x >= layout.grid[0] || y >= layout.grid[1]);
    if (out) { reasons.push({ rule: 'grid', room: r.id, detail: `cell (${out}) is outside the ${layout.grid[0]} x ${layout.grid[1]} grid` }); continue; }
    const hit = cells.find(([x, y]) => layout.occupied.has(key(x, y)));
    if (hit) { reasons.push({ rule: 'overlap', room: r.id, detail: `cell (${hit}) overlaps ${layout.occupied.get(key(...hit)).id}` }); continue; }
    placeRoom(layout, r.id, fp, r.cell, rot, r.type);
  }
  // Connected to a bridge through shared walls (at undock every wall is live).
  const ids = [...layout.rooms.keys()], reached = new Set(ids.filter((id) => layout.types.get(id) === 'bridge')), queue = [...reached];
  const walls = sharedWalls(layout);
  for (let i = 0; i < queue.length; i++) {
    for (const w of walls) {
      const o = w.a === queue[i] ? w.b : w.b === queue[i] ? w.a : null;
      if (o && !reached.has(o)) { reached.add(o); queue.push(o); }
    }
  }
  for (const id of ids) if (!reached.has(id)) reasons.push({ rule: 'connected', room: id, detail: `${id} is not joined to a bridge through shared walls` });
  // The ship's centre line (#234): the mean row of the cells of the rooms joined to a bridge (a cut-off room is rejected by 'connected').
  const rows = ids.filter((id) => reached.has(id)).flatMap((id) => layout.rooms.get(id).cells.map((c) => c[1] + 0.5));
  const centreLine = rows.length ? rows.reduce((x, y) => x + y, 0) / rows.length : 0;
  for (const id of ids) {
    const def = defs[layout.types.get(id)];
    if (def.placement.includes('axis')) {
      const room = layout.rooms.get(id), ys = room.cells.map((c) => c[1]), xs = room.cells.map((c) => c[0]);
      const spanX = Math.max(...xs) - Math.min(...xs) + 1, spanY = Math.max(...ys) - Math.min(...ys) + 1;
      if (spanX < spanY) reasons.push({ rule: 'axis', room: id, detail: `${id} does not lie along the ship's axis (x)` });
      else if (!(Math.min(...ys) < centreLine && centreLine < Math.max(...ys) + 1)) reasons.push({ rule: 'axis', room: id, detail: `${id}: rows ${Math.min(...ys)}-${Math.max(...ys)} do not hold the ship's centre line (y = ${centreLine})` });
    }
    if (def.placement.includes('bow clear')) {
      const cells = layout.rooms.get(id).cells, x1 = Math.max(...cells.map((c) => c[0]));
      const ahead = cells.filter((c) => c[0] === x1).find(([, y]) => [...layout.occupied.keys()].some((k) => { const [cx, cy] = k.split(',').map(Number); return cy === y && cx > x1; }));
      if (ahead) reasons.push({ rule: 'bow', room: id, detail: `${id}: a cell lies ahead of its bow face in row ${ahead[1]}` });
    }
    if (def.placement.includes('hull') && openEdges(layout, id) === 0) reasons.push({ rule: 'hull', room: id, detail: `${id} is a hull room with no open edge` });
    if (def.placement.includes('exhaust clear')) {
      const ex = exhaustFace(layout, id);
      const blocked = ex.cells.find(([x, y]) => [...layout.occupied.keys()].some((k) => { const [cx, cy] = k.split(',').map(Number); return cy === y && cx < x; }));
      if (blocked) reasons.push({ rule: 'exhaust', room: id, detail: `${id}: a cell lies aft of its exhaust in row ${blocked[1]}` });
    }
  }
  const crew = crewCapacity(layout, defs, params);
  if (crew.required > crew.berths) reasons.push({ rule: 'crew', room: null, detail: `the rooms require ${crew.required} crew and the quarters have ${crew.berths} berths` });
  const placed = [];
  for (const f of blueprint.fittings || []) {
    const p = f.type === 'armour' ? plateProblem(layout, defs, f, placed) : fittingProblem(layout, defs, f, placed);
    if (p) reasons.push({ ...p, room: f.room });
    else placed.push(f);
  }
  return { valid: reasons.length === 0, reasons };
}
