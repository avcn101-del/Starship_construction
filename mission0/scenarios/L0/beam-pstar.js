import { csdaRange } from '../../../js/damage.js';

// S12 of physics pass 2 (DESIGN.md 13k.4) and the water half of S22: an outside anchor for the kernel's Bethe
// integration. csdaRange takes its material (13k.1, #236); with liquid water's Z/A and I it is checked against NIST
// PSTAR's CSDA ranges for protons in water: 7.718 g/cm^2 at 100 MeV and 25.96 g/cm^2 at 200 MeV (13k.4 S12, as the
// design quotes them). PSTAR includes shell and density corrections that the kernel leaves out (13i.1), so the
// tolerance is 1 %. The iron row of S22 waits for a cited PSTAR value (a question in the pull request).
const PSTAR_WATER = { 100: 7.718, 200: 25.96 }; // g/cm^2, NIST PSTAR (liquid water)
const MEV = 1.602176634e-13; // J

export default {
  id: 'L0.beam.pstar',
  level: 'L0',
  laws: ['protons lose energy by the Bethe formula (#229, 13i.1): an outside anchor (#236, #244)'],
  dependsOn: [],
  setup: 'the kernel\'s csdaRange for protons of 100 and 200 MeV in liquid water (FIXED.waterZOverA 0.55509 mol/g, FIXED.waterMeanExcitation 75 eV) (13k.4 S12)',
  measure: 'the CSDA range in g/cm^2',
  tolerance: '1 % relative (the kernel has no shell or density correction; 13i.3 found 0.12 % at 100 MeV)',
  criterion: 'the CSDA range is NIST PSTAR\'s for liquid water within 1 %: 7.718 g/cm^2 at 100 MeV, 25.96 g/cm^2 at 200 MeV (literals from the table, not a re-statement) (#229, #236, #243, #244)',
  tunable: [],
  locked: null,
  cases() {
    return [{ MeV: 100 }, { MeV: 200 }];
  },
  expected(ctx, c) {
    return { range: PSTAR_WATER[c.MeV] };
  },
  run(ctx, c) {
    const f = ctx.fixed;
    const consts = { protonRest: f.protonRestEnergy.value, electronRest: f.electronRestEnergy.value, K: f.betheK.value, ZA: f.ironZOverA.value, I: f.ironMeanExcitation.value };
    return { range: csdaRange(c.MeV * MEV, consts, { ZA: f.waterZOverA.value, I: f.waterMeanExcitation.value }) / 10 }; // kg/m^2 -> g/cm^2
  },
  compare(e, a) {
    const pass = Number.isFinite(a.range) && Math.abs(a.range - e.range) <= 0.01 * e.range;
    return { pass, note: pass ? '' : 'outside 1 % of PSTAR' };
  },
  display(r) {
    return { expected: `${r.expected.range} g/cm^2 (PSTAR)`, actual: `${r.actual.range.toFixed(4)} g/cm^2 (${(((r.actual.range - r.expected.range) / r.expected.range) * 100).toFixed(3)} %)` };
  },
};
