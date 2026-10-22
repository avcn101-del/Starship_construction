import { penetrateRound } from '../../../js/damage.js';
import { roundGeometry } from '../../../js/projectile.js';
import { roundStrength } from '../../../js/rooms.js';

// S22 of physics pass 2 (DESIGN.md 13k.4), its kinetic half: an outside bound for the round rule (#236, #244). The
// design cites De Marre's formula for a 62 mm, 6 kg steel shot at 800 m/s against rolled steel at 100-150 mm (#236);
// it is used here as a bound, not as a formula. The model's depth in armour cells x the thickness of steel an armour
// cell's mass makes (armour.cellMass / edge^2 / steelDensity = 400 / 7850 m = 50.96 mm at T1).
const CELLS = 10;

export default {
  id: 'L0.kinetic.anchor',
  level: 'L0',
  laws: ['sectional-momentum penetration with round damage (#230, #232): an outside bound (#236, #244)'],
  dependsOn: [],
  setup: 'an M AP round at T1 (6 kg, 800 m/s, a steel cylinder 4 diameters long) into 10 armour cells (sigma = armour.cellMass / edge^2), by the kernel\'s penetrateRound (13k.4 S22)',
  measure: 'the continuous depth in cells and the depth in millimetres of steel (depth x sigma / steelDensity)',
  tolerance: 'a bound: 100 mm <= depth <= 150 mm',
  criterion: 'the model\'s depth (about 2.166 cells x 50.96 mm = 110 mm, 13i.3) lies inside De Marre\'s 100-150 mm for this shot (#236), a bound, not a formula (#230, #232, #236, #244)',
  tunable: ['kinetic.roundMass', 'kinetic.muzzleVelocity', 'matter.kineticResistance', 'armour.cellMass'],
  locked: null,
  cases() {
    return [{ tier: 'T1', size: 'M' }];
  },
  expected() {
    return { min: 100, max: 150 };
  },
  run(ctx) {
    const p = ctx.params, f = ctx.fixed, edge = ctx.tiers.T1.edge, m = p.kinetic.roundMass.value, v = p.kinetic.muzzleVelocity.value;
    const { A } = roundGeometry(m, f.steelDensity.value, f.roundLengthToDiameter.value);
    const sigma = ctx.scaled(p.armour.cellMass, edge) / (edge * edge), r = p.matter.kineticResistance.value * sigma;
    const res = penetrateRound({ momentum: m * v, area: A, strength: roundStrength({ params: p }, m, A) }, new Array(CELLS).fill(r));
    const cells = res.stoppedIn === -1 ? res.passed : res.passed + res.taken[res.stoppedIn] / r;
    return { cells, mm: (cells * sigma * 1000) / f.steelDensity.value };
  },
  compare(e, a) {
    const pass = a.mm >= e.min && a.mm <= e.max;
    return { pass, note: pass ? '' : 'outside De Marre\'s 100-150 mm' };
  },
  display(r) {
    return { expected: `${r.expected.min}-${r.expected.max} mm (De Marre, #236)`, actual: `${r.actual.cells.toFixed(4)} cells = ${r.actual.mm.toFixed(2)} mm` };
  },
};
