import { createWorld, addRoom, setDemand, destroyCell, enablePowerRouting, step } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';

// Checks shared by every L2 scenario (#194), written out in each file so its lock covers them.
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-repaired': ['cell'], scram: ['energy'], explosion: ['energy', 'channel'], shot: ['energy', 'channel'] };
const eventsOk = (events) => events.every((e) => Number.isFinite(e.t) && typeof e.type === 'string' && typeof e.room === 'string' && e.room !== ''
  && typeof e.cause === 'string' && e.cause !== '' && Number.isInteger(e.crew) && e.crew >= 0
  && (EXTRA[e.type] || []).every((f) => (f === 'channel' ? typeof e[f] === 'string' && e[f] !== '' : Number.isFinite(e[f]))));
// Heat books in a cluster: generated + conducted = radiated + stored in every room, 1e-9 relative.
const booksOk = (b) => {
  const c = b.conducted || 0;
  return Math.abs(b.generated + c - b.radiated - b.stored) <= 1e-9 * Math.max(Math.abs(b.generated), Math.abs(c), Math.abs(b.radiated), Math.abs(b.stored));
};
// Conduction only moves heat between rooms: the flows sum to 0 over the cluster (1e-9 of the heat moved).
const flowsOk = (books) => {
  const sum = books.reduce((x, b) => x + (b.conducted || 0), 0), moved = books.reduce((x, b) => x + Math.abs(b.conducted || 0), 0);
  return Math.abs(sum) <= 1e-9 * moved;
};
// One-sided time: expected <= actual < expected + dt, each bound with a 1e-9 relative float slack.
const oneSided = (e, a, dt) => Number.isFinite(a) && a >= e - 1e-9 * Math.abs(e) && a < e + dt + 1e-9 * Math.abs(e);
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const common = (rows) => [
  { name: 'heat books: generated + conducted = radiated + stored, 1e-9 relative, every room, every case', ok: rows.every((r) => r.actual.books.every(booksOk)) },
  { name: 'conduction flows sum to 0 over the cluster, every case', ok: rows.every((r) => flowsOk(r.actual.books)) },
  { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) },
];
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

// The small graphs (13d.2 row 5). Each lists the rooms the kernel places and, written out by hand from
// that geometry, the graph the expected value uses: shared walls as live cell pairs, reactors with their
// demand, consumers and the priority list. Destroyed cells are local cell indices (k = j w + i).
const GRAPHS = {
  'direct-5': { rooms: [['R', 'reactor', [0, 0]], ['B', 'beamBay', [2, 1]]], walls: [['R', 'B', 1]] },
  'direct-10': { rooms: [['R', 'reactor', [0, 0]], ['B', 'beamBay', [2, 0]]], walls: [['R', 'B', 2]] },
  'hold-10-10': { rooms: [['R', 'reactor', [0, 0]], ['H', 'hold', [2, 0]], ['B', 'beamBay', [4, 0]]], walls: [['R', 'H', 2], ['H', 'B', 2]] },
  'hold-10-5': { rooms: [['R', 'reactor', [0, 0]], ['H', 'hold', [2, 0]], ['B', 'beamBay', [4, 1]]], walls: [['R', 'H', 2], ['H', 'B', 1]] },
  // The bottleneck: hold cells 1 = (3, 0) and 3 = (3, 1) are its two cells on the hold-bay wall.
  'bottleneck-1': { rooms: [['R', 'reactor', [0, 0]], ['H', 'hold', [2, 0]], ['B', 'beamBay', [4, 0]]], destroyed: [['H', 1]], walls: [['R', 'H', 2], ['H', 'B', 1]] },
  'bottleneck-2': { rooms: [['R', 'reactor', [0, 0]], ['H', 'hold', [2, 0]], ['B', 'beamBay', [4, 0]]], destroyed: [['H', 1], ['H', 3]], walls: [['R', 'H', 2], ['H', 'B', 0]] },
};
// Two reactors (R1 at full demand, R2 at half) and three consumers: beam bays B1, B2 and an engine E
// (2 x 3, rotated 90 degrees: 3 x 2). Every wall is 2 cell pairs; 30 MW of supply for 35 MW of draw.
const TWO = {
  rooms: [['R1', 'reactor', [0, 0]], ['B1', 'beamBay', [2, 0]], ['R2', 'reactor', [4, 0]], ['B2', 'beamBay', [2, 2]], ['E', 'engine', [4, 2], 90]],
  walls: [['R1', 'B1', 2], ['B1', 'R2', 2], ['B1', 'B2', 2], ['R2', 'E', 2], ['B2', 'E', 2]],
  demand: { R1: 1, R2: 0.5 },
};
GRAPHS['two-B2-E-B1'] = { ...TWO, priority: ['B2', 'E', 'B1'] };
GRAPHS['two-B1-B2-E'] = { ...TWO, priority: ['B1', 'B2', 'E'] };
// B2 loses cell 0 = (2, 2): one of its two cells on the B1-B2 wall; its draw falls to 3/4.
GRAPHS['two-B2-E-B1-hit'] = { ...TWO, priority: ['B2', 'E', 'B1'], destroyed: [['B2', 0]], walls: [['R1', 'B1', 2], ['B1', 'R2', 2], ['B1', 'B2', 1], ['R2', 'E', 2], ['B2', 'E', 2]] };

const cellsOf = (type) => ROOMS[type].footprint.M[0] * ROOMS[type].footprint.M[1];
/** The graph of a case from data.js: capacities of walls, reactors (demand x power x surviving fraction) and consumers (L1 draw x surviving fraction). */
function graphOf(ctx, name) {
  const g = GRAPHS[name], p = ctx.params, edge = ctx.baseEdge;
  const lost = (id) => (g.destroyed || []).filter(([r]) => r === id).length;
  const sf = (id, type) => (cellsOf(type) - lost(id)) / cellsOf(type);
  const rooms = g.rooms.map(([id, type]) => ({ id, type, sf: sf(id, type) }));
  const reactors = rooms.filter((r) => r.type === 'reactor').map((r) => ({ id: r.id, cap: ((g.demand || {})[r.id] ?? 1) * p.reactor.power.value * r.sf }));
  const draw = (r) => (r.type === 'beamBay' ? (p.beam.power.value * 1 * r.sf) / p.beambay.efficiency.value : 1 * 1 * r.sf * p.engine.powerDraw.value);
  const listed = g.priority || [];
  const rank = (id) => (listed.includes(id) ? listed.indexOf(id) : listed.length);
  const consumers = rooms.filter((r) => r.type === 'beamBay' || r.type === 'engine').sort((a, b) => rank(a.id) - rank(b.id) || (a.id < b.id ? -1 : 1)).map((r) => ({ id: r.id, type: r.type, sf: r.sf, draw: draw(r) }));
  const walls = g.walls.map(([a, b, pairs]) => ({ a, b, cap: p.power.wallCapacity.value * pairs * edge }));
  return { rooms, reactors, consumers, walls };
}
/** Max flow from the reactors to the first k consumers = the smallest cut, by enumerating every subset of rooms on the source side. */
function minCut(G, k) {
  const ids = G.rooms.map((r) => r.id), sinks = G.consumers.slice(0, k);
  let best = Infinity;
  for (let mask = 0; mask < 1 << ids.length; mask++) {
    const X = new Set(ids.filter((_, i) => mask & (1 << i)));
    let cut = 0;
    for (const r of G.reactors) if (!X.has(r.id)) cut += r.cap;
    for (const w of G.walls) if (X.has(w.a) !== X.has(w.b)) cut += w.cap;
    for (const c of sinks) if (X.has(c.id)) cut += c.draw;
    best = Math.min(best, cut);
  }
  return best;
}

export default {
  id: 'L2.power.flow',
  level: 'L2',
  laws: ['power flows through shared walls by wall length', 'power flows through any room', 'consumers are served in priority order', 'a consumer at a fraction of its draw works at that fraction'],
  dependsOn: ['L1.beambay.heat', 'L1.engine.thrust', 'L1.reactor.power'],
  setup: 'small clusters at T1 with power routing: an M reactor beside a firing M beam bay over 1 or 2 cell pairs (5 or 10 m); reactor - empty hold - beam bay with hold-bay walls of 2 or 1 pairs; the same with 1 or 2 hold cells on the hold-bay wall destroyed (the bottleneck losing cells); two reactors (full and half demand) and three consumers (two beam bays, an engine at full throttle) under two priority lists, and with one beam bay cell on a bottleneck wall destroyed; one step',
  measure: 'power delivered to each consumer and produced by each reactor in the first step; each beam bay\'s beam power and its heat rate in that step',
  tolerance: 'delivered power exact; beam power 1e-12 relative; heat rates 1e-9 relative',
  criterion: 'delivered to each consumer = the priority-ordered max flow, computed in the scenario by enumerating every cut of the small graph: the k-th consumer gets maxflow(first k) - maxflow(first k - 1), each the minimum cut, with walls of power.wallCapacity x live length, reactors of demand x reactor.power x surviving fraction and consumers of their L1 draw; exact; the reactors produce the total; a beam bay at fraction f = delivered / draw fires f x beam.power x surviving fraction and heats f x its L1 heat (draw - beam); destroying the bottleneck wall\'s cells lowers delivery exactly (#12, #38, #193, #194)',
  tunable: ['power.wallCapacity', 'reactor.power', 'beam.power', 'beambay.efficiency', 'engine.powerDraw'],
  locked: { date: '2026-10-21', hash: '7c53e3b4' },
  cases() {
    return Object.keys(GRAPHS).map((graph) => ({ graph }));
  },
  expected(ctx, c) {
    const G = graphOf(ctx, c.graph), p = ctx.params;
    const delivered = {}, beam = {}, heat = {};
    let prev = 0;
    G.consumers.forEach((x, k) => {
      const mf = minCut(G, k + 1);
      delivered[x.id] = mf - prev;
      prev = mf;
      if (x.type === 'beamBay') {
        const f = delivered[x.id] / x.draw, l1beam = p.beam.power.value * x.sf;
        beam[x.id] = f * l1beam;
        heat[x.id] = f * (x.draw - l1beam);
      }
    });
    return { delivered, produced: prev, beam, heat };
  },
  run(ctx, c) {
    const g = GRAPHS[c.graph];
    const world = createWorld({ params: ctx.params, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const rooms = g.rooms.map(([id, type, cell, rotation = 0]) => addRoom(world, type, { id, cell, rotation }));
    const byId = Object.fromEntries(rooms.map((r) => [r.id, r]));
    for (const [id, k] of g.destroyed || []) destroyCell(world, byId[id], k, `hit-${id}-${k}`);
    for (const r of rooms) {
      if (r.type === 'reactor') setDemand(world, r, (g.demand || {})[r.id] ?? 1);
      if (r.type === 'beamBay') r.beamBay.firing = true;
      if (r.type === 'engine') r.engine.throttle = 1;
    }
    enablePowerRouting(world, g.priority || []);
    step(world);
    const delivered = {}, beam = {}, heat = {};
    let produced = 0;
    for (const r of rooms) {
      if (r.type === 'reactor') produced += r.reactor.delivered;
      if (r.type === 'beamBay' || r.type === 'engine') delivered[r.id] = r.powerDelivered;
      if (r.type === 'beamBay') { beam[r.id] = r.beamBay.beam; heat[r.id] = r.heat.generated / ctx.dt; }
    }
    const reactorHeat = rooms.filter((r) => r.type === 'reactor').reduce((x, r) => x + r.heat.generated / ctx.dt, 0);
    return { delivered, produced, reactorHeat, beam, heat, books: rooms.map((r) => heatBooks(r.heat)), eventsOk: eventsOk(world.log.events) };
  },
  compare(e, a, c, ctx) {
    const ids = Object.keys(e.delivered);
    const checks = {
      'delivered to each consumer': ids.every((id) => a.delivered[id] === e.delivered[id]),
      'reactors produce the total': a.produced === e.produced,
      'reactor heat = heatPerPower x produced': close(ctx.params.reactor.heatPerPower.value * e.produced, a.reactorHeat, 1e-9),
      'beam at fraction f': Object.keys(e.beam).every((id) => close(e.beam[id], a.beam[id], 1e-12)),
      'beam bay heat at fraction f': Object.keys(e.heat).every((id) => close(e.heat[id], a.heat[id], 1e-9)),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    const d = (g, id) => rows.find((r) => r.case.graph === g).actual.delivered[id];
    return [
      { name: 'destroying the bottleneck wall\'s cells lowers delivery (2 pairs > 1 pair > 0)', ok: d('hold-10-10', 'B') > d('bottleneck-1', 'B') && d('bottleneck-1', 'B') > d('bottleneck-2', 'B') && d('bottleneck-2', 'B') === 0 },
      ...common(rows),
    ];
  },
  display(r) {
    const MW = (x) => (x / 1e6).toFixed(6);
    const list = (o) => Object.entries(o).map(([k, v]) => `${k} ${MW(v)}`).join(', ');
    return {
      expected: `delivered (MW) ${list(r.expected.delivered)}; produced ${MW(r.expected.produced)}; beam ${list(r.expected.beam)}; bay heat ${list(r.expected.heat)}`,
      actual: `delivered (MW) ${list(r.actual.delivered)}; produced ${MW(r.actual.produced)}; beam ${list(r.actual.beam)}; bay heat ${list(r.actual.heat)}`,
    };
  },
};
