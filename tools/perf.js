#!/usr/bin/env node
// tools/perf.js — the E8 baseline (DESIGN.md 13f.5, #211, #213): milliseconds
// per simulation step for two reference ships R1 (13f.2) stepping together,
// at T1 and at T6, in a battle load (shield on, engine at half throttle, beam
// firing, the reactor at full demand), with and without power routing. From
// the path model (13i) each R1's beam also hits the other along its middle row
// from the bow (fireBeam every step, the target's cells taking heat and
// damage). Not a scenario: timing is not deterministic. E8's budget is 1 ms
// per step (#213).
//
//   node tools/perf.js [steps]
import { performance } from 'node:perf_hooks';
import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, setDemand, enablePowerRouting, step, fireBeam, beamEnergy, cellAt } from '../js/rooms.js';
import { withOverrides, TIERS, scaled } from '../js/data.js';

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
  const params = withOverrides(), edge = TIERS[tier].edge;
  const world = createWorld({ params, edge, grid: TIERS[tier].grid });
  for (const r of R1_ROOMS) addRoom(world, r.type, { id: r.id, cell: r.cell, rotation: r.rotation || 0 });
  for (const [type, room, cell, side] of R1_FITTINGS) addFitting(world, type, room, cell, side);
  const room = (id) => world.rooms.find((r) => r.id === id);
  loadMagazine(world, room('magazine'), { heMass: scaled(params.magazine.capacity, edge) }); // masses from data.js (#222 (3))
  loadTurret(room('turret'), params.turret.readyRounds.value);
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
    // Each ship's beam on the other's middle row (y = 2) from the bow (x = 10 down to 0).
    const shots = pair.map((w, k) => {
      const target = pair[1 - k], bay = w.rooms.find((r) => r.id === 'beamBay');
      const path = [];
      for (let x = 10; x >= 0; x--) { const c = cellAt(target, [x, 2]); if (c) path.push({ room: c.room, cell: c.index }); }
      return { target, path, beam: { power: scaled(w.params.beam.power, w.edge), energy: beamEnergy(w, bay), range: 900 } };
    });
    const battleStep = () => { for (const s of shots) fireBeam(s.target, s.beam, s.path, 'beam'); for (const w of pair) step(w); };
    for (let i = 0; i < 300; i++) battleStep(); // warm up
    const t0 = performance.now();
    for (let i = 0; i < steps; i++) battleStep();
    const ms = (performance.now() - t0) / steps;
    out.push(`${tier} two R1s, power routing ${routing ? 'on ' : 'off'}: ${ms.toFixed(4)} ms per step (${steps} steps; E8 budget 1 ms, #213)`);
  }
}
console.log(out.join('\n'));
