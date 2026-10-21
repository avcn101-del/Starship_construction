// layout.js — the cell grid of a cluster (DESIGN.md 13d.1, #192).
// One grid at the tier's edge. A room occupies a rectangle of cells at an
// integer cell position, its footprint [w, h] rotated by 0 or 90 degrees;
// rooms never overlap. A room's cell k is local (i, j) with k = j * w + i in
// its unrotated footprint. Two rooms share a wall along every pair of
// edge-adjacent cells, one in each; the wall's length is pairs x edge. An
// open edge is a room cell edge with no room cell beside it (the grid's
// border included); a room carries at most one radiator per open edge (#15).
// Positions in metres: the grid's corner is the origin, cell (x, y) spans
// [x e, (x + 1) e] x [y e, (y + 1) e]. No DOM, no Math.random.

const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const key = (x, y) => `${x},${y}`;
/** Room-id order (#193): plain string order, so the result never depends on insertion order. */
export const byId = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function createLayout({ edge, grid }) {
  return { edge, grid, rooms: new Map(), occupied: new Map(), walls: null };
}

/** Grid cell of local cell (i, j) of a w x h footprint placed at `at` with `rotation` (0 or 90). */
export function cellAt(w, h, i, j, at, rotation) {
  return rotation === 0 ? [at[0] + i, at[1] + j] : [at[0] + (h - 1 - j), at[1] + i];
}

/** Place a room; throws on a bad rotation, a non-integer position, the grid's border or an overlap. */
export function placeRoom(layout, id, footprint, at, rotation = 0) {
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
