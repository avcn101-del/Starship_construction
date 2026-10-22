import { createWorld, addRoom, fireBeam, beamEnergy, pathAlong } from '../../../js/rooms.js';
import { beamDeposit } from '../../../js/damage.js';

// Successor of L2.beam.chord (DESIGN.md 13l.7, #271: N4): a hand-worked F_2 at chord 0.5.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const ironBeam = (f) => ({ protonRest: f.protonRestEnergy.value, electronRest: f.electronRestEnergy.value, K: f.betheK.value, ZA: f.ironZOverA.value, I: f.ironMeanExcitation.value, lambda: f.ironInteractionLength.value });
const LINE = [[-1, 0], [0, 0], [1, 0], [2, 0]]; // row y = 0 from -x through the hold's cells 0 and 1

export default {
  id: 'L2.beam.chord.v2',
  level: 'L2',
  laws: ['the chord rule: a beam crosses sigma x chord of each cell on its path (#239, 13k.1)'],
  dependsOn: ['L0.beam.burn.v5'],
  setup: 'a T1 cluster: an M hold at cell (0, 0) (sigma 3000 / 25 = 120 kg/m^2 per cell); one step of a 5 MW beam of an N = 2 bay\'s energy (100 MeV) by fireBeam along row y = 0 from -x (the kernel\'s pathAlong), both hold cells at chord 1 or both at chord 0.5 (13l.4 A8: survivor k1.chord.beamIgnored of mission0/mutations/2026-10-22-b7c4290.txt)',
  measure: 'the fraction of the beam\'s power each cell received',
  tolerance: '1e-12 (absolute, on fractions)',
  criterion: 'the fractions are beamDeposit(E, [120 x chord, 120 x chord]) (re-statement through the kernel\'s pure beamDeposit); hand-worked: the CSDA range of 100 MeV in iron is 112.6 kg/m^2 (L0.beam.csda.continuous), so at chord 1 the beam stops in the first cell (F = [1, 0]) and at chord 0.5 it crosses 60 kg/m^2 there and stops in the second (F_2 > 0) (#239); (13l.7 N4) hand-worked from the CSDA table (the blind checker derives it): at chord 0.5 the first cell takes F_1 = 0.379780628354 and the second F_2 = 0.620219371646 (1e-12)',
  tunable: ['beam.gradient', 'structure.cellMass'],
  locked: { date: '2026-10-22', hash: '3d003e03' },
  cases() {
    return [{ chord: 1 }, { chord: 0.5 }];
  },
  expected(ctx, c) {
    return { fractions: beamDeposit(100 * 1.602176634e-13, [120 * c.chord, 120 * c.chord], ironBeam(ctx.fixed)).fractions, literal: c.chord === 0.5 ? [0.379780628354, 0.620219371646] : [1, 0] };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, edge: ctx.tiers.T1.edge, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    addRoom(world, 'hold', { id: 'hold', cell: [0, 0] });
    const path = pathAlong(world, LINE, [1, c.chord, c.chord, 1]);
    const res = fireBeam(world, { power: 5e6, energy: beamEnergy(world, { length: 2 }) }, path, 'beam');
    return { fractions: res.fractions, chords: path.map((x) => x.chord) };
  },
  compare(e, a, c) {
    const checks = {
      'the path carries the chords': a.chords.every((x) => x === c.chord),
      'fractions = beamDeposit with sigma x chord (re-statement)': e.fractions.length === a.fractions.length && e.fractions.every((F, i) => Math.abs(F - a.fractions[i]) <= 1e-12),
      [c.chord === 1 ? 'hand-worked: stops in the first cell at chord 1' : 'hand-worked: reaches the second cell at chord 0.5']: c.chord === 1 ? a.fractions[0] === 1 && a.fractions[1] === 0 : a.fractions[1] > 0,
      'hand-worked literals F_1, F_2 (13l.7)': e.literal.every((F, i) => Math.abs(F - a.fractions[i]) <= 1e-12),
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: `F ${r.expected.fractions.map((x) => x.toPrecision(12)).join(' ')}`, actual: `F ${r.actual.fractions.map((x) => x.toPrecision(12)).join(' ')}` };
  },
};
