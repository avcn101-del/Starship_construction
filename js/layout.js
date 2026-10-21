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
// open edges and the validation of a ship's blueprint. No DOM, no Math.random.

const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const key = (x, y) => `${x},${y}`;
/** Room-id order (#193): plain string order, so the result never depends on insertion order. */
export const byId = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function createLayout({ edge, grid }) {
  return { edge, grid, rooms: new Map(), occupied: new Map(), walls: null, types: new Map() };
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
 * Validation (#57, 13f.1): a blueprint { grid, edge, rooms: [{ id, type,
 * size, cell, rotation }], fittings: [{ type, room, cell, side }] } undocks
 * only if every rule holds. Returns { valid, reasons: [{ rule, room,
 * detail }] }; each failure names its rule: 'grid' (a room leaves the
 * drydock grid), 'overlap', 'connected' (a room not joined to a bridge
 * through shared walls), 'hull' (a hull room with no open edge), 'exhaust'
 * (an engine's exhaust face not open, or a cell aft of it in its rows), and
 * the fitting rules of fittingProblem. A room that leaves the grid or
 * overlaps is not placed, so it is judged by that rule alone.
 */
export function validateShip(blueprint, defs) {
  const layout = createLayout({ edge: blueprint.edge || 1, grid: blueprint.grid });
  const reasons = [];
  for (const r of blueprint.rooms) {
    const fp = defs[r.type].footprint[r.size || 'M'], rot = r.rotation || 0, cells = [];
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
  for (const id of ids) {
    const def = defs[layout.types.get(id)];
    if (def.placement.includes('hull') && openEdges(layout, id) === 0) reasons.push({ rule: 'hull', room: id, detail: `${id} is a hull room with no open edge` });
    if (def.placement.includes('exhaust clear')) {
      const ex = exhaustFace(layout, id);
      const blocked = ex.cells.find(([x, y]) => [...layout.occupied.keys()].some((k) => { const [cx, cy] = k.split(',').map(Number); return cy === y && cx < x; }));
      if (blocked) reasons.push({ rule: 'exhaust', room: id, detail: `${id}: a cell lies aft of its exhaust in row ${blocked[1]}` });
    }
  }
  const placed = [];
  for (const f of blueprint.fittings || []) {
    const p = fittingProblem(layout, defs, f, placed);
    if (p) reasons.push({ ...p, room: f.room });
    else placed.push(f);
  }
  return { valid: reasons.length === 0, reasons };
}
