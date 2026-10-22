import { createWorld, addRoom, beamEnergy } from '../../../js/rooms.js';
import { beamDeposit, csdaRange } from '../../../js/damage.js';

// S6 of physics pass 2 (DESIGN.md 13k.4): tier-invariant beam depth (13k.1, #240 (4), F10). The L0 lock hashes
// cases, expected, compare and invariants but not helpers (#175), so the scenario's own Bethe integration lives
// inside expected(). Armour columns of 8 cells, sigma = armour.cellMass at the tier / edge^2 (400 kg/m^2 at T1).
const CELLS = 8;

export default {
  id: 'L0.beam.tier',
  level: 'L0',
  laws: ['a beam bay of N cells reaches the same depth in cells at every tier: beam.gradient k = -0.41 (#240 (4), 13k.1)', 'a neutral particle beam leaves its energy along its path (#229)'],
  dependsOn: [],
  setup: 'N = 2 and N = 8 beam bays (E = beam.gradient at the tier x N x edge, the kernel\'s beamEnergy) into a column of 8 armour cells (sigma = armour.cellMass at the tier / edge^2) at T1-T6: the kernel\'s beamDeposit and csdaRange (13k.4 S6)',
  measure: 'the particle energy; the fraction left in the first cell; the depth in cells = CSDA range / sigma',
  tolerance: 'the kernel against the scenario\'s own integration: F_1 1e-3 absolute, depth 1e-3 relative (the integrators\' steps differ: 2 kg/m^2 and 1 % against 0.2 kg/m^2 and 0.1 %); across tiers: F_1 and depth within 2 % of T1\'s (the k = -0.41 fit\'s error, 13k.6); the T1 literal 1 %',
  criterion: 're-statement: E = beam.gradient x edge^-0.41 (relative to 5 m) x N x edge; F_1 and the CSDA range by the scenario\'s own Bethe integration (13i.1: iron, no shell or density correction, nuclear interactions over ironInteractionLength; steps at most 0.2 kg/m^2 and 0.1 % of the energy), the kernel\'s within 1e-3; across tiers the first cell\'s fraction and the depth in cells stay within 2 % of T1\'s for N = 2 and N = 8; hand-worked literal: at T1 an N = 2 bay gives 10 MeV/m x 10 m = 100 MeV and reaches 0.282 armour cells (13k.3) within 1 % (#229, #240 (4), #243)',
  tunable: ['beam.gradient', 'armour.cellMass'],
  locked: null,
  cases(ctx) {
    const out = [];
    for (const N of [2, 8]) for (const tier of Object.keys(ctx.tiers)) out.push({ N, tier });
    return out;
  },
  expected(ctx, c) {
    const f = ctx.fixed, p = ctx.params, edge = ctx.tiers[c.tier].edge;
    const Mp = f.protonRestEnergy.value, me = f.electronRestEnergy.value, KZA = f.betheK.value * f.ironZOverA.value, I = f.ironMeanExcitation.value, lam = f.ironInteractionLength.value;
    function bethe(E) {
      const g = 1 + E / Mp, b2 = 1 - 1 / (g * g), bg2 = b2 * g * g, q = me / Mp, tMax = (2 * me * bg2) / (1 + 2 * g * q + q * q);
      return (KZA / b2) * (0.5 * Math.log((2 * me * bg2 * tMax) / (I * I)) - b2);
    }
    const stopE = 0.5 * 1.602176634e-13; // J, 0.5 MeV
    function cross(E, X) {
      let x = 0;
      while (x < X && E > 0) {
        const h = Math.min(X - x, 0.2, (0.001 * E) / bethe(E));
        const k1 = -bethe(E), k2 = -bethe(E + (h / 2) * k1), k3 = -bethe(E + (h / 2) * k2), k4 = -bethe(E + h * k3);
        const next = E + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
        x += h;
        if (!(next >= stopE)) return { E: 0, at: x };
        E = next;
      }
      return { E, at: null };
    }
    const E0 = p.beam.gradient.value * Math.pow(edge / ctx.baseEdge, p.beam.gradient.k) * c.N * edge;
    const sigma = ctx.scaled(p.armour.cellMass, edge) / (edge * edge);
    const E1 = cross(E0, sigma).E, F1 = 1 - (E1 > 0 ? (Math.exp(-sigma / lam) * E1) / E0 : 0);
    return { E0, F1, depth: cross(E0, Infinity).at / sigma, literal: c.tier === 'T1' && c.N === 2 ? { E: 100 * 1.602176634e-13, depth: 0.282 } : null };
  },
  run(ctx, c) {
    const f = ctx.fixed, p = ctx.params, edge = ctx.tiers[c.tier].edge;
    const world = createWorld({ params: p, edge, dt: ctx.dt });
    const E0 = beamEnergy(world, addRoom(world, 'beamBay', { id: 'bay', length: c.N }));
    const consts = { protonRest: f.protonRestEnergy.value, electronRest: f.electronRestEnergy.value, K: f.betheK.value, ZA: f.ironZOverA.value, I: f.ironMeanExcitation.value, lambda: f.ironInteractionLength.value };
    const sigma = ctx.scaled(p.armour.cellMass, edge) / (edge * edge);
    const d = beamDeposit(E0, new Array(CELLS).fill(sigma), consts);
    return { E0, F1: d.fractions[0], depth: csdaRange(E0, consts) / sigma };
  },
  compare(e, a) {
    const rel = (x, y, t) => Math.abs(x - y) <= t * Math.abs(x);
    const checks = {
      'particle energy (pow of the deterministic kernel against Math.pow, 1e-12)': rel(e.E0, a.E0, 1e-12),
      'F_1 within 1e-3 of the own integration': Math.abs(e.F1 - a.F1) <= 1e-3,
      'depth within 1e-3 of the own integration': rel(e.depth, a.depth, 1e-3),
      ...(e.literal ? { 'hand-worked literal: 100 MeV, 0.282 cells within 1 %': rel(e.literal.E, a.E0, 1e-12) && rel(e.literal.depth, a.depth, 0.01) } : {}),
    };
    return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([n]) => n).join(', ') };
  },
  invariants(ctx, rows) {
    const within = (key) => [2, 8].every((N) => {
      const ref = rows.find((r) => r.case.N === N && r.case.tier === 'T1').actual[key];
      return rows.filter((r) => r.case.N === N).every((r) => Math.abs(r.actual[key] - ref) <= 0.02 * Math.abs(ref));
    });
    return [
      { name: 'the first cell\'s fraction within 2 % of T1\'s at every tier, N = 2 and 8', ok: within('F1') },
      { name: 'the depth in cells within 2 % of T1\'s at every tier, N = 2 and 8', ok: within('depth') },
    ];
  },
  display(r) {
    const mev = (x) => (x / 1.602176634e-13).toFixed(3);
    return { expected: `E ${mev(r.expected.E0)} MeV, F_1 ${r.expected.F1.toFixed(6)}, depth ${r.expected.depth.toFixed(6)} cells`, actual: `E ${mev(r.actual.E0)} MeV, F_1 ${r.actual.F1.toFixed(6)}, depth ${r.actual.depth.toFixed(6)} cells` };
  },
};
