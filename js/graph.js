// graph.js — flows between rooms over live shared walls (DESIGN.md 13d.1,
// #193): power by priority-ordered max flow through any room (#12), and
// ammunition fed from a magazine only to rooms sharing a live wall with it
// (#18). A shared edge is live while both of its cells survive (#192).
// Reads room objects (id, cells) and the layout; behaviour stays in rooms.js.
// No DOM, no Math.random.
import { sharedWalls, byId } from './layout.js';

/**
 * Every shared wall of the cluster with its full length and its live length
 * (pairs whose two cells both survive x edge), in room-id order.
 */
export function liveWalls(world) {
  if (!world.layout) return [];
  const byRoom = new Map(world.rooms.map((r) => [r.id, r]));
  return sharedWalls(world.layout).map((w) => {
    const a = byRoom.get(w.a), b = byRoom.get(w.b);
    const live = w.pairs.filter(([ka, kb]) => !a.cells[ka].destroyed && !b.cells[kb].destroyed).length;
    return { a, b, pairs: w.pairs, length: w.length, live: live * world.layout.edge };
  });
}

/**
 * Priority-ordered max flow (#193). nodes: room ids; edges: undirected
 * { a, b, capacity }; sources: { id, capacity } (reactors); sinks:
 * { id, capacity } in priority order (consumers). Each sink in turn gets the
 * most additional flow the residual network allows, found by augmenting
 * paths from breadth-first search in room-id order; a sink served earlier
 * keeps what it got. Returns delivered per sink and produced per source.
 */
export function priorityMaxFlow({ nodes, edges, sources, sinks }) {
  const ids = [...nodes].sort(byId);
  const S = 0, T = ids.length + 1, N = ids.length + 2;
  const at = new Map(ids.map((id, i) => [id, i + 1]));
  const cap = Array.from({ length: N }, () => new Float64Array(N));
  const flow = Array.from({ length: N }, () => new Float64Array(N));
  for (const e of edges) {
    if (!(e.capacity > 0)) continue;
    const u = at.get(e.a), v = at.get(e.b);
    cap[u][v] += e.capacity;
    cap[v][u] += e.capacity;
  }
  for (const s of sources) if (s.capacity > 0) cap[S][at.get(s.id)] += s.capacity;
  const residual = (u, v) => cap[u][v] - flow[u][v];
  const delivered = new Map();
  for (const sink of sinks) {
    const c = at.get(sink.id);
    cap[c][T] = sink.capacity > 0 ? sink.capacity : 0;
    for (;;) {
      // Breadth-first search; neighbours visited in index order = room-id order.
      const prev = new Int32Array(N).fill(-1);
      prev[S] = S;
      const queue = [S];
      for (let q = 0; q < queue.length && prev[T] === -1; q++) {
        const u = queue[q];
        for (let v = 0; v < N; v++) {
          if (prev[v] !== -1 || !(residual(u, v) > 0)) continue;
          prev[v] = u;
          queue.push(v);
        }
      }
      if (prev[T] === -1) break;
      let push = Infinity;
      for (let v = T; v !== S; v = prev[v]) push = Math.min(push, residual(prev[v], v));
      for (let v = T; v !== S; v = prev[v]) { flow[prev[v]][v] += push; flow[v][prev[v]] -= push; }
    }
    delivered.set(sink.id, flow[c][T]);
    cap[c][T] = flow[c][T]; // served: no later sink can take it back
  }
  const produced = new Map(sources.map((s) => [s.id, flow[S][at.get(s.id)]]));
  return { delivered, produced };
}

/**
 * Ammunition feed for one step, at its end (#18, #193): every magazine feeds
 * each room sharing a live wall with it that holds a ready store, at most
 * ammo.wallFeed x live length kg/s, in the magazine's loading order and in
 * rounds of the consumer's size (a magazine holding another size feeds
 * nothing). The feed runs only while the store has room; what it has carried
 * of a round in transit stays on the wall. Rooms are fed in room-id order.
 * `store` gives { capacity, rounds, roundMass, size } of a consumer (or
 * null); `take(magazine)` removes one round and returns false when empty.
 */
export function feedAmmo(world, { feedPerMetre, store, take, give, has }) {
  for (const w of liveWalls(world)) {
    if (w.live <= 0) continue;
    for (const [mag, room] of [[w.a, w.b], [w.b, w.a]]) {
      if (mag.type !== 'magazine' || mag.exploded) continue;
      const s = store(room);
      if (!s || s.size !== mag.magazine.size) continue;
      const k = `${mag.id}|${room.id}`;
      if (s.rounds >= s.capacity || !has(mag)) continue;
      let credit = (world.feedCredit.get(k) || 0) + feedPerMetre * w.live * world.dt;
      let rounds = s.rounds;
      while (credit >= s.roundMass && rounds < s.capacity && take(mag)) { credit -= s.roundMass; rounds++; give(room); }
      world.feedCredit.set(k, credit);
    }
  }
}
