import { createWorld, addRoom, fireRound, destroyCell } from '../../../js/rooms.js';
import { roundGeometry } from '../../../js/projectile.js';
import { heatBooks } from '../../../js/heat.js';
import { ROOMS } from '../../../js/data.js';

// Successor of L3.kinetic.hole.v2 (withdrawn as superseded by #278, the L5 kinetic pass, 13n.1 (b)): identical but
// for its id; its record moves by float residue only (the heat books' generated, 1e-16 relative), because the round's
// heat is now split between entries by the energy each took (L4 of 13n.1 (b)).
// Checks shared by every L3 scenario (13f.3), written out in each file so its lock covers them. These rooms stand
// alone (D1's line), so there is no ship: the momentum books are the round's, p0 = sum of the momentum each cell
// took + p on exit (13i.1).
const EXTRA = { 'crew-died': ['deaths'], 'cell-destroyed': ['channel', 'cell'], 'cell-damaged': ['channel', 'cell', 'integrity'], 'cell-repaired': ['cell'], scram: ['energy'], explosion: ['energy', 'channel'], shot: ['energy', 'channel'], 'heat-vented': ['energy'] };
const eventsOk = (events) => events.every((e) => Number.isFinite(e.t) && typeof e.type === 'string' && typeof e.room === 'string' && e.room !== ''
  && typeof e.cause === 'string' && e.cause !== '' && Number.isInteger(e.crew) && e.crew >= 0
  && (EXTRA[e.type] || []).every((f) => (f === 'channel' ? typeof e[f] === 'string' && e[f] !== '' : Number.isFinite(e[f]))));
const booksOk = (b) => Math.abs(b.generated - b.radiated - b.stored) <= 1e-9 * Math.max(Math.abs(b.generated), Math.abs(b.radiated), Math.abs(b.stored));
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const floorish = (x) => (Math.abs(x - Math.round(x)) <= 1e-9 * Math.max(1, x) ? Math.round(x) : Math.floor(x));

const ROOMS_IN_LINE = 6, DEPTH = Math.max(...ROOMS.quarters.footprint.M), CELLS = ROOMS.quarters.footprint.M[0] * ROOMS.quarters.footprint.M[1];
const HOLE = 1; // the 2nd cell of the line (cell 2 of the first quarters), destroyed beforehand
// The round rule written out (13i.1), independent of the kernel; r = 0 is a hole (it takes nothing). Returns per
// cell what it took and the round's damage f on leaving it.
function ownLoop(p0, A0, S, rs) {
  let p = p0, f = 0, A = A0;
  const taken = [], fAfter = [];
  for (let i = 0; i < rs.length; i++) {
    const r = rs[i], s = p / A;
    if (s > r && f + r / S < 1) { taken.push(r); p -= r * A; f += r / S; A = A0 / (1 - f); fAfter.push(f); continue; }
    const t = Math.min(s, r);
    taken.push(t); fAfter.push(Math.min(1, f + t / S));
    return { stoppedIn: i, taken, fAfter, depth: i + t / r };
  }
  return { stoppedIn: -1, taken, fAfter, depth: null };
}

export default {
  id: 'L3.kinetic.hole.v3',
  level: 'L3',
  laws: ['kinetic damage is momentum (sectional momentum per cell)', 'protection is the mass on the path (#232)', 'every interaction is symmetric: the round flattens (#228, #230)', 'a destroyed cell is a hole: it resists no round (#212 (5))', 'crew die in proportion to the integrity lost'],
  dependsOn: ['L1.kinetic.damage.v2'],
  setup: 'D1\'s line (L1.kinetic.damage.v2): six M crew quarters standing alone in a row, crossed along their longest side (18 cells, sigma = cellMass.crewed / edge^2), one M round (6 kg at T1, 800 m/s, a steel cylinder 4 diameters long) along it; the line intact, and the same line with its 2nd cell destroyed beforehand (3 of the first quarters\' 18 crew die then); T1 and T6',
  measure: 'per cell: sectional momentum taken, momentum taken and integrity after the round; the round\'s damage f on leaving each cell; cells passed and the stopping cell; per room: cumulative crew deaths',
  tolerance: 'taken, f, integrity and losses relative 1e-9 (1e-12 absolute at 0); counts exact; momentum books relative 1e-9',
  criterion: 'the destroyed cell takes nothing from the round (sectional momentum and momentum 0), loses no integrity and leaves the round\'s f unchanged; every other cell resists r = matter.kineticResistance x sigma and the round takes the same against S = matter.kineticResistance x rho_steel L (13i.1), a passed cell losing 1 / kinetic.hitsToWreck, the stopping cell (taken / r) / hitsToWreck, by the scenario\'s own loop: the round stops in cell 2 of the intact line and one cell deeper with the hole (cell 3), with the same stopping loss; deaths by the floor rule, floor(crew x (cells - sum of integrity) / cells); identical at T6; p0 = sum of the momentum each cell took + p on exit (#206, #212 (5), #230, #232, #235)',
  tunable: ['kinetic.roundMass', 'kinetic.muzzleVelocity', 'kinetic.hitsToWreck', 'matter.kineticResistance', 'cellMass.crewed', 'quarters.crewPerCell'],
  locked: null,
  cases() {
    const out = [];
    for (const tier of ['T1', 'T6']) for (const line of ['intact', 'hole']) out.push({ tier, line });
    return out;
  },
  expected(ctx, c) {
    const p = ctx.params, f = ctx.fixed, edge = ctx.tiers[c.tier].edge, hits = p.kinetic.hitsToWreck.value;
    const m = ctx.scaled(p.kinetic.roundMass, edge), v = ctx.scaled(p.kinetic.muzzleVelocity, edge);
    const D = Math.cbrt((4 * m) / (Math.PI * f.steelDensity.value * f.roundLengthToDiameter.value)), A0 = (Math.PI * D * D) / 4;
    const cR = p.matter.kineticResistance.value, S = cR * f.steelDensity.value * f.roundLengthToDiameter.value * D;
    const r = cR * (ctx.scaled(p.cellMass.crewed, edge) / (edge * edge));
    const n = DEPTH * ROOMS_IN_LINE, hole = c.line === 'hole' ? HOLE : -1;
    const own = ownLoop(m * v, A0, S, Array.from({ length: n }, (_, i) => (i === hole ? 0 : r)));
    const line = Array.from({ length: n }, (_, i) => (i === hole ? 0 : i < own.stoppedIn ? 1 - 1 / hits : i === own.stoppedIn ? 1 - own.taken[i] / r / hits : 1));
    const crew = Math.round(ctx.scaled(p.quarters.crewPerCell, edge)) * CELLS;
    const rooms = Array.from({ length: ROOMS_IN_LINE }, (_, i) => {
      const lost = line.slice(i * DEPTH, (i + 1) * DEPTH).reduce((x, g) => x + (1 - g), 0);
      return { crew, deaths: Math.min(crew, floorish((crew * lost) / CELLS)) };
    });
    return { r, stoppedIn: own.stoppedIn, depth: own.depth, stopLoss: own.taken[own.stoppedIn] / r / hits, taken: own.taken, fAfter: own.fAfter, line, rooms };
  },
  run(ctx, c) {
    const p = ctx.params, f = ctx.fixed, edge = ctx.tiers[c.tier].edge;
    const world = createWorld({ params: p, edge, dt: ctx.dt });
    const rooms = Array.from({ length: ROOMS_IN_LINE }, (_, r) => addRoom(world, 'quarters', { id: `quarters-${r + 1}`, position: [r * DEPTH * edge, 0] }));
    const path = [];
    for (const room of rooms) for (let i = 0; i < DEPTH; i++) path.push({ room, cell: i }); // row j = 0 of a 3 x 2 footprint
    if (c.line === 'hole') destroyCell(world, path[HOLE].room, path[HOLE].cell, 'hole');
    const mass = ctx.scaled(p.kinetic.roundMass, edge), velocity = ctx.scaled(p.kinetic.muzzleVelocity, edge);
    const { A } = roundGeometry(mass, f.steelDensity.value, f.roundLengthToDiameter.value);
    const r = fireRound(world, { mass, velocity, area: A }, path, 'round-1');
    const ev = world.log.events;
    return {
      p0: r.p0, absorbed: r.absorbed, impulse: r.impulse, momentum: r.momentum, f: r.f, passed: r.passed, stoppedIn: r.stoppedIn, losses: r.losses,
      line: path.map((x) => x.room.cells[x.cell].integrity),
      rooms: rooms.map((room) => ({ crew: room.crewTotal, aboard: room.crew, deaths: ev.filter((e) => e.type === 'crew-died' && e.room === room.id).reduce((x, e) => x + e.deaths, 0) })),
      books: rooms.map((room) => heatBooks(room.heat)), eventsOk: eventsOk(ev),
    };
  },
  compare(e, a, c) {
    const eq = (x, y) => (x === 0 ? Math.abs(y) <= 1e-12 : close(x, y, 1e-9));
    const checks = {
      'stopping cell': a.stoppedIn === e.stoppedIn && a.stoppedIn === (c.line === 'hole' ? 2 : 1),
      'stopping loss = (taken / r) / hitsToWreck': close(e.stopLoss, a.losses[a.stoppedIn], 1e-9),
      'sectional momentum taken per cell': a.absorbed.length === e.stoppedIn + 1 && a.absorbed.every((x, i) => eq(e.taken[i], x)),
      'the round\'s damage f': close(e.fAfter[e.stoppedIn], a.f, 1e-9),
      'integrity of every cell': e.line.every((g, i) => eq(g, a.line[i])),
      'crew deaths by the floor rule': a.rooms.every((r, i) => r.crew === e.rooms[i].crew && r.deaths === e.rooms[i].deaths && r.aboard === r.crew - r.deaths),
      'momentum books: p0 = sum taken + p on exit': close(a.p0, a.impulse.reduce((x, y) => x + y, 0) + a.momentum, 1e-9),
    };
    if (c.line === 'hole') checks['the hole takes nothing, loses nothing and leaves f unchanged'] = a.absorbed[HOLE] === 0 && a.impulse[HOLE] === 0 && a.losses[HOLE] === 0 && a.line[HOLE] === 0 && e.fAfter[HOLE] === e.fAfter[HOLE - 1];
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  invariants(ctx, rows) {
    const pairs = ['T1', 'T6'].map((t) => [rows.find((r) => r.case.tier === t && r.case.line === 'intact'), rows.find((r) => r.case.tier === t && r.case.line === 'hole')]);
    return [
      { name: 'with the hole the round stops one cell deeper, with the same stopping loss, at each tier', ok: pairs.every(([i, h]) => h.actual.stoppedIn === i.actual.stoppedIn + 1 && close(i.actual.losses[i.actual.stoppedIn], h.actual.losses[h.actual.stoppedIn], 1e-9)) },
      { name: 'heat books: generated = radiated + stored, 1e-9 relative, every room, every case', ok: rows.every((r) => r.actual.books.every(booksOk)) },
      { name: 'every event carries t, type, room, cause, crew and its #156 fields, every case', ok: rows.every((r) => r.actual.eventsOk) },
    ];
  },
  display(r) {
    const e = r.expected, a = r.actual;
    return {
      expected: `depth ${e.depth.toFixed(4)} cells: stops in cell ${e.stoppedIn + 1} (loss ${e.stopLoss.toFixed(6)}), f ${e.fAfter[e.stoppedIn].toFixed(4)}; deaths ${e.rooms.map((x) => x.deaths).join('/')}`,
      actual: `stops in cell ${a.stoppedIn + 1} (loss ${a.losses[a.stoppedIn].toFixed(6)}), f ${a.f.toFixed(4)}; cell 2 took ${a.absorbed[HOLE].toExponential(3)}, integrity ${a.line[HOLE].toFixed(4)}; deaths ${a.rooms.map((x) => x.deaths).join('/')}`,
    };
  },
};
