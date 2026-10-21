#!/usr/bin/env node
// tools/perf.js — the E8 baseline (DESIGN.md 13f.5, #211, #213): milliseconds
// per simulation step for two reference ships R1 (13f.2) stepping together,
// at T1 and at T6, in a battle load (shield on, engine at half throttle, beam
// firing, the reactor at full demand), with and without power routing. Not a
// scenario: timing is not deterministic. E8's budget is 1 ms per step (#213).
//
//   node tools/perf.js [steps]
import { performance } from 'node:perf_hooks';
import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, setDemand, enablePowerRouting, step } from '../js/rooms.js';
import { withOverrides, TIERS } from '../js/data.js';

// R1, the reference ship (13f.2): x forward, the T1 drydock grid; cells [x0, x1) x [y0, y1); the engine (2 x 3)
// rotated 90 degrees so it spans [0, 3) x [2, 4) with its exhaust at x = 0.
const R1_ROOMS = [
  { id: 'engine', type: 'engine', cell: [0, 2], rotation: 90 }, { id: 'reactor', type: 'reactor', cell: [3, 2] },
  { id: 'bridge', type: 'bridge', cell: [5, 2] }, { id: 'magazine', type: 'magazine', cell: [7, 2] },
  { id: 'beamBay', type: 'beamBay', cell: [9, 2] }, { id: 'heatSink', type: 'heatSink', cell: [3, 4] },
  { id: 'quarters', type: 'quarters', cell: [5, 4] }, { id: 'turret', type: 'turret', cell: [8, 4] },
  { id: 'shield', type: 'shieldGenerator', cell: [3, 0] }, { id: 'hold', type: 'hold', cell: [7, 0] },
];
// One fitting per open edge: [type, room, grid cell, outward side]. 17 radiators (engine 2 top + 2 bottom on
// columns x = 1, 2; heat sink 2 top + 2 aft; shield generator 2 bottom + 2 each side; beam bay 2 bow + 1 bottom
// at x = 9), then 4 RCS (fitting ids 17-20): the engine's column x = 0 top and bottom, the beam bay's x = 10.
const R1_FITTINGS = [
  ['radiator', 'engine', [1, 3], [0, 1]], ['radiator', 'engine', [2, 3], [0, 1]], ['radiator', 'engine', [1, 2], [0, -1]], ['radiator', 'engine', [2, 2], [0, -1]],
  ['radiator', 'heatSink', [3, 5], [0, 1]], ['radiator', 'heatSink', [4, 5], [0, 1]], ['radiator', 'heatSink', [3, 4], [-1, 0]], ['radiator', 'heatSink', [3, 5], [-1, 0]],
  ['radiator', 'shield', [3, 0], [0, -1]], ['radiator', 'shield', [4, 0], [0, -1]], ['radiator', 'shield', [3, 0], [-1, 0]], ['radiator', 'shield', [3, 1], [-1, 0]],
  ['radiator', 'shield', [4, 0], [1, 0]], ['radiator', 'shield', [4, 1], [1, 0]],
  ['radiator', 'beamBay', [10, 2], [1, 0]], ['radiator', 'beamBay', [10, 3], [1, 0]], ['radiator', 'beamBay', [9, 2], [0, -1]],
  ['rcs', 'engine', [0, 3], [0, 1]], ['rcs', 'engine', [0, 2], [0, -1]], ['rcs', 'beamBay', [10, 3], [0, 1]], ['rcs', 'beamBay', [10, 2], [0, -1]],
];
const RCS = { sternTop: 17, sternBottom: 18, bowTop: 19, bowBottom: 20 };

function r1(tier, routing) {
  const world = createWorld({ params: withOverrides(), edge: TIERS[tier].edge, grid: TIERS[tier].grid });
  for (const r of R1_ROOMS) addRoom(world, r.type, { id: r.id, cell: r.cell, rotation: r.rotation || 0 });
  for (const [type, room, cell, side] of R1_FITTINGS) addFitting(world, type, room, cell, side);
  const room = (id) => world.rooms.find((r) => r.id === id);
  loadMagazine(world, room('magazine'), { heMass: 900 * (TIERS[tier].edge / 5) ** 3 });
  loadTurret(room('turret'), 4);
  room('turret').turret.hold = true;
  room('engine').engine.throttle = 0.5;
  room('beamBay').beamBay.firing = true;
  if (routing) enablePowerRouting(world);
  setDemand(world, room('reactor'), 1);
  enableShip(world);
  return world;
}

const steps = Number(process.argv[2] || 3600);
const out = [];
for (const routing of [false, true]) {
  for (const tier of ['T1', 'T6']) {
    const pair = [r1(tier, routing), r1(tier, routing)];
    for (let i = 0; i < 300; i++) for (const w of pair) step(w); // warm up
    const t0 = performance.now();
    for (let i = 0; i < steps; i++) for (const w of pair) step(w);
    const ms = (performance.now() - t0) / steps;
    out.push(`${tier} two R1s, power routing ${routing ? 'on ' : 'off'}: ${ms.toFixed(4)} ms per step (${steps} steps; E8 budget 1 ms, #213)`);
  }
}
console.log(out.join('\n'));
