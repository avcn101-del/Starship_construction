import { createWorld, addRoom, loadTurret, magazineCapacity, setDemand, enableShip, step, loadMagazine, magazineContents } from '../../../js/rooms.js';
import { buildShip } from '../../../js/battle.js';
import { validateShip } from '../../../js/layout.js';
import { ROOMS } from '../../../js/data.js';

// W13 of the L5 plan (DESIGN.md 13n.4, 13n.1 (c), §17 item 30, #62, #259): every 2 x 2 room has an S footprint of one
// cell (quarters and missile bay 2 x 1, engine 1 x 2, beam bay and railgun 1 x N); the kernel's size rule applies:
// cellRatio 1/4 for power, crew, capacity and explosion, a turret's rounds and rate by sizeLinear (S rounds at 0.75 /s);
// buildShip threads a blueprint room's size to addRoom.
//
// Setup (T1): (rooms) a cluster on a 10 x 10 grid: an S reactor at [0, 0] at full demand (no routing), an S turret at
// [1, 0], an S magazine at [2, 0] full of M HE rounds, S quarters at [0, 1]; (fire) the S turret beside a bridge, a ship
// at rest, its ready store 10 S rounds, firing for 6 s; (valid) the blueprint SHIP below through validateShip and
// buildShip: an S engine (1 x 2) at [0, 1], an S reactor at [1, 1], an S bridge at [2, 1], an S magazine at [3, 1], an S
// turret at [4, 1], S quarters (2 x 1) at [1, 2].
// Hand-worked (13n.2, the size rule): the S reactor 1 cell, 20 MW x 1/4 = 5 MW; crew Math.round(4 x 1/4) = 1 (reactor,
// bridge), Math.round(3 x 1/4) = 1 (turret); the S quarters house 2 x 4 = 8; the S magazine holds 900 x 1/4 = 225 kg,
// 37 M rounds (6 kg), 37 x (6 + 2) MJ = 296 MJ; the S round 6 x (2/3)^3 = 1.7778 kg at 800 m/s, shots k / (0.5 / (2/3))
// = k / 0.75 s apart: 0, 1.3333, 2.6667, 4, 5.3333 s; the blueprint is valid, its rooms built with 1 / 1 / 1 / 1 / 1 / 2
// cells.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const SHIP = {
  rooms: [
    { id: 'engine', type: 'engine', size: 'S', cell: [0, 1] }, { id: 'reactor', type: 'reactor', size: 'S', cell: [1, 1] },
    { id: 'bridge', type: 'bridge', size: 'S', cell: [2, 1] }, { id: 'magazine', type: 'magazine', size: 'S', cell: [3, 1] },
    { id: 'turret', type: 'turret', size: 'S', cell: [4, 1] }, { id: 'quarters', type: 'quarters', size: 'S', cell: [1, 2] },
  ],
  fittings: [],
};

export default {
  id: 'L2.size.s',
  level: 'L2',
  laws: ['room size S: one cell of a 2 x 2 room (quarters and missile bay 2 x 1, engine 1 x 2), its quantities by its cell count over M\'s (cellRatio 1/4), its rounds and rate by sizeLinear (13n.1 (c), #62, #259)', 'buildShip builds a blueprint room at its size (13n.1 (c))'],
  dependsOn: ['L2.size.rule.v2'],
  setup: 'T1: an S reactor, S turret, S magazine, S quarters in a cluster; an S turret firing 10 S rounds for 6 s on a ship; an all-S blueprint through validateShip and buildShip (13n.4 W13)',
  measure: 'the reactor\'s delivered power; crews; the magazine\'s capacity, rounds and energy; shot times and the round\'s mass (from its muzzle energy); validateShip\'s verdict; the cells of each room buildShip built',
  tolerance: 'power, capacity, energy, mass and shot times 1e-12 (closed form); counts exact',
  criterion: 'the S reactor delivers 5 MW; reactor and turret crew 1, the quarters 8; the magazine 225 kg, 37 rounds, 296 MJ; S rounds of 1.7778 kg at 0, 1.3333, 2.6667, 4, 5.3333 s (0.75 /s); the blueprint valid and built with one cell per S room (two for the quarters and the engine)',
  tunable: ['reactor.power', 'magazine.capacity', 'turret.fireRate', 'crewRequired.reactor', 'crewRequired.turret', 'quarters.crewPerCell'],
  locked: { date: '2026-10-23', hash: '6e4ac485' },
  cases() {
    return [{ part: 'rooms' }, { part: 'fire' }, { part: 'valid' }];
  },
  expected(ctx, c) {
    if (c.part === 'rooms') return { power: 5e6, crew: { reactor: 1, turret: 1, quarters: 8 }, capacity: 225, rounds: 37, energy: 296e6 };
    if (c.part === 'fire') return { m: 6 * (2 / 3) ** 3, times: [0, 1, 2, 3, 4].map((k) => k / 0.75) };
    return { valid: true, cells: { engine: 2, reactor: 1, bridge: 1, magazine: 1, turret: 1, quarters: 2 } };
  },
  run(ctx, c) {
    if (c.part === 'valid') {
      const v = validateShip({ grid: [30, 14], edge: 5, rooms: SHIP.rooms.map((r) => ({ rotation: 0, ...r })), fittings: [] }, ROOMS, ctx.params);
      const { world } = buildShip(ctx.params, 'T1', SHIP);
      return { valid: v.valid, reasons: v.reasons.map((r) => r.rule), cells: Object.fromEntries(world.rooms.map((r) => [r.id, r.cells.length])) };
    }
    const w = createWorld({ params: ctx.params, edge: 5, dt: ctx.dt, grid: [10, 10] });
    if (c.part === 'fire') {
      addRoom(w, 'bridge', { id: 'bridge', cell: [0, 0] });
      const t = addRoom(w, 'turret', { id: 'turret', size: 'S', cell: [2, 0] });
      loadTurret(t, 10);
      enableShip(w, { origin: [0, 0] });
      t.turret.aim = [0, 1];
      while (w.step < 360) step(w);
      const shots = w.log.events.filter((e) => e.type === 'shot');
      return { times: shots.map((e) => e.t), m: (2 * shots[0].energy) / (800 * 800) };
    }
    const r = addRoom(w, 'reactor', { id: 'reactor', size: 'S', cell: [0, 0] }), t = addRoom(w, 'turret', { id: 'turret', size: 'S', cell: [1, 0] });
    const m = addRoom(w, 'magazine', { id: 'magazine', size: 'S', cell: [2, 0] }), q = addRoom(w, 'quarters', { id: 'quarters', size: 'S', cell: [0, 1] });
    setDemand(w, r, 1);
    loadMagazine(w, m, { heMass: magazineCapacity(w, m) });
    return { power: r.reactor.delivered, cells: r.cells.length, crew: { reactor: r.crewTotal, turret: t.crewTotal, quarters: q.crewTotal }, capacity: magazineCapacity(w, m), rounds: m.magazine.he, energy: magazineContents(w, m).energy };
  },
  compare(e, a, c) {
    const close = (x, y, t) => Number.isFinite(y) && Math.abs(x - y) <= t * Math.max(Math.abs(x), 1e-300);
    let checks;
    if (c.part === 'rooms') checks = { 'the S reactor: one cell, 5 MW (1e-12)': a.cells === 1 && close(e.power, a.power, 1e-12), 'crew 1 / 1, berths 8': JSON.stringify(a.crew) === JSON.stringify(e.crew), 'capacity 225 kg, 37 rounds, 296 MJ (1e-12)': close(e.capacity, a.capacity, 1e-12) && a.rounds === e.rounds && close(e.energy, a.energy, 1e-12) };
    else if (c.part === 'fire') checks = { 'the S round 1.7778 kg (1e-12)': close(e.m, a.m, 1e-12), 'shots at k / 0.75 s (1e-12)': a.times.length === e.times.length && a.times.every((t, i) => Math.abs(t - e.times[i]) <= 1e-12 * Math.max(1, e.times[i])) };
    else checks = { 'validateShip accepts the S footprints': a.valid, 'built at their size': JSON.stringify(a.cells) === JSON.stringify(e.cells) };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: JSON.stringify(r.expected), actual: JSON.stringify(r.actual) };
  },
};
