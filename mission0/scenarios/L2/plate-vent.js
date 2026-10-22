import { buildShip } from '../../../js/battle.js';
import { destroyCell, roomTemperature } from '../../../js/rooms.js';
import { depositHeat } from '../../../js/heat.js';
import { R1_ROOMS, R1_FITTINGS } from '../../targets.js';

// B14 of L4b (DESIGN.md 13l.4; the survivor l4f.plate.cellVentsPlate of #260): a heat sink cell that is destroyed
// vents its own share of the heat, not its room's plates' steel (13l.1, #258, #260). R1 (13f.2) at T1 as a ship, with
// one 0.2 m plate on the heat sink's wall to the quarters, segment (4, 4) +x (mounted on the heat sink's cell (4, 4),
// index 1); the heat sink raised to 400 K; then its cell (3, 4) (index 0, not the mount) destroyed.
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L2.plate.vent',
  level: 'L2',
  laws: ['a destroyed heat sink cell vents its share of the heat above rest; a plate\'s steel stays with its room until the plate or its mount cell goes (#198, #258, #260, 13l.1)'],
  dependsOn: [],
  setup: 'R1 at T1 as a ship (js/battle.js buildShip, validated) with an armour plate of armour.plateThickness on segment (4, 4) +x of the heat sink; heat deposited until the heat sink is at 400 K; its cell index 0 at (3, 4) destroyed (13l.4 B14)',
  measure: 'the heat sink\'s heat capacity before and after; its temperature before and after; the energy of its heat-vented event',
  tolerance: 'closed forms 1e-12 relative (13k.4)',
  criterion: 'hand-worked: a heat sink cell holds thermal.coupledHeatSink x heatsink.capacityFactor = 1.35e6 x 5 = 6.75e6 J/K, four of them 2.7e7 J/K; the plate adds 0.2 m x 7850 kg/m^3 x 25 m^2 x 450 J/(kg K) = 39 250 kg x 450 = 1.76625e7 J/K, so 4.46625e7 J/K before; after, 2.7e7 - 6.75e6 + 1.76625e7 = 3.79125e7 J/K (13l.4 writes "4 x 2.7e7 - 2.7e7 + 1.7663e7": its literal stands, its arithmetic is per cell), not (4.46625e7) x 3/4 = 3.34969e7 J/K (the plate vented with the cell); the temperature is unchanged (400 K) and the heat vented is the cell\'s share only, 6.75e6 x (400 - 290) = 7.425e8 J',
  tunable: ['thermal.coupledHeatSink', 'heatsink.capacityFactor', 'armour.plateThickness', 'thermal.coupledArmour'],
  locked: null,
  cases() {
    return [{ T: 400 }];
  },
  expected() {
    return { before: 4.46625e7, after: 3.79125e7, wrong: 3.3496875e7, T: 400, vented: 7.425e8 };
  },
  run(ctx, c) {
    const { world, room } = buildShip(ctx.params, 'T1', { rooms: R1_ROOMS, fittings: [...R1_FITTINGS, ['armour', 'heatSink', [4, 4], [1, 0]]] });
    const h = room('heatSink');
    depositHeat(h.heat, h.heat.C * (c.T - roomTemperature(h)));
    const before = { C: h.heat.C, T: roomTemperature(h) };
    destroyCell(world, h, 0, 'launch');
    const vent = world.log.events.find((e) => e.type === 'heat-vented');
    return { before, after: { C: h.heat.C, T: roomTemperature(h) }, vented: vent ? vent.energy : null };
  },
  compare(e, a) {
    const checks = {
      'capacity before (hand-worked)': close(e.before, a.before.C, 1e-12),
      'capacity after: the cell\'s share only': close(e.after, a.after.C, 1e-12) && !close(e.wrong, a.after.C, 1e-6),
      'temperature unchanged': close(e.T, a.before.T, 1e-12) && close(e.T, a.after.T, 1e-12),
      'vented: the cell\'s share': close(e.vented, a.vented, 1e-12),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    return { expected: `C ${r.expected.before} -> ${r.expected.after} J/K, ${r.expected.T} K, vented ${r.expected.vented} J`, actual: `C ${a.before.C} -> ${a.after.C} J/K, ${a.before.T} -> ${a.after.T} K, vented ${a.vented} J` };
  },
};
