import { createWorld, addRoom, setActive, setDemand, fireBeam, beamEnergy, step } from '../../../js/rooms.js';

// S1 of physics pass 2 (DESIGN.md 13k.4): burn by mass (13k.1, #240 (1), F1). The L0 lock hashes cases, expected,
// compare and invariants but not helpers (#175), so the scenario's own Bethe integration and stepped sum live inside
// expected(). Each column is one room standing alone, its 4 cells in a line (rooms switched off: no heat of their
// own): an M hold (3 t cells), an M bridge (crewed, 14.8 t), two cells of armour-like matter (an M shield generator,
// 10 t cells = armour.cellMass) and an M reactor (150 t). The beam is an M beam from an N = 2 bay at that tier.
const MATTER = { hold: 'hold', crewed: 'bridge', armour: 'shieldGenerator', reactor: 'reactor' };
const LIMIT = 3600; // s, FIXED.burnTimeLimit's value

export default {
  id: 'L0.beam.burn.v4',
  level: 'L0',
  laws: ['beam damage by mass: a cell loses P F_i dt / (matter.burnEnergyPerKg x its mass) per step (#240 (1), 13k.1)', 'a neutral particle beam leaves its energy along its path (#229)', 'square-cube law'],
  dependsOn: [],
  setup: 'an M beam (beam.power, 5 MW at T1) from an N = 2 beam bay (E = beam.gradient at its tier x 2 x edge, 100 MeV at T1) at contact on a column of 4 cells of hold, crewed (bridge), armour-like (switched-off shield generator, 10 t) and reactor cells, each an M room alone and switched off, T1 and T3, by the kernel\'s fireBeam once per step until cell 1 is destroyed (13k.4 S1)',
  measure: 'the time cell 1 is destroyed (the end of the step of its cell-destroyed event); its channel and cause',
  tolerance: 'time one-sided in [t, t + dt) with the 1e-9 float slack of #185 (2); the T3 / T1 ratio 2 within 2 dt / t',
  criterion: 're-statement: the scenario\'s own stepped sum of the rule of 13k.1, F_1 by its own Bethe integration (13i.1; steps at most 0.2 kg/m^2 and 0.1 % of the energy), cell 1 losing P F_1 dt / (matter.burnEnergyPerKg x cell mass) per step and destroyed in the step it reaches 0, at t inside that step; the kernel destroys it in [t, t + dt); channel thermal, cause the beam. Hand-worked literal: the reactor cell at T1 stops the whole 100 MeV beam (F_1 = 1), so t = q m / P = 3000 x 150 000 / 5e6 = 90 s; where F_1 = 1 (crewed, armour, reactor) t at T3 = 2 x t at T1 (mass x 2^3, power x 2^2) within 2 dt / t (#138, #229, #240 (1), #243)',
  tunable: ['matter.burnEnergyPerKg', 'beam.power', 'beam.gradient', 'structure.cellMass', 'cellMass.crewed', 'cellMass.shieldGenerator', 'cellMass.reactor'],
  locked: null,
  cases() {
    const out = [];
    for (const tier of ['T1', 'T3']) for (const matter of Object.keys(MATTER)) out.push({ tier, matter });
    return out;
  },
  expected(ctx, c) {
    const f = ctx.fixed, p = ctx.params, edge = ctx.tiers[c.tier].edge, dt = ctx.dt;
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
        if (!(next >= stopE)) return 0;
        E = next;
      }
      return E;
    }
    const massPath = { hold: ['structure', 'cellMass'], crewed: ['cellMass', 'crewed'], armour: ['cellMass', 'shieldGenerator'], reactor: ['cellMass', 'reactor'] }[c.matter];
    const m = ctx.scaled(p[massPath[0]][massPath[1]], edge), sigma = m / (edge * edge);
    const E0 = ctx.scaled(p.beam.gradient, edge) * 2 * edge, P = ctx.scaled(p.beam.power, edge), Q = p.matter.burnEnergyPerKg.value * m;
    const E1 = cross(E0, sigma), F1 = 1 - (E1 > 0 ? (Math.exp(-sigma / lam) * E1) / E0 : 0);
    let integrity = 1, time = null;
    for (let k = 0; time === null && k * dt < LIMIT; k++) {
      const loss = (P * F1 * dt) / Q, left = integrity - loss;
      if (left > 1e-12) { integrity = left; continue; }
      time = k * dt + (integrity / loss) * dt;
    }
    return { time, F1, dt, literal: c.tier === 'T1' && c.matter === 'reactor' ? 90 : null };
  },
  run(ctx, c) {
    const edge = ctx.tiers[c.tier].edge, world = createWorld({ params: ctx.params, edge, dt: ctx.dt });
    const bay = addRoom(world, 'beamBay', { id: 'bay', length: 2 });
    const room = addRoom(world, MATTER[c.matter], { id: 'column' });
    if (room.type === 'reactor') setDemand(world, room, 0);
    setActive(world, room, false);
    const path = [0, 1, 2, 3].map((k) => ({ room, cell: k }));
    const beam = { power: ctx.scaled(ctx.params.beam.power, edge), energy: beamEnergy(world, bay), range: 0 };
    while (!room.cells[0].destroyed && world.t < LIMIT) { fireBeam(world, beam, path, 'beam-1'); step(world); }
    const e = world.log.events.find((x) => x.type === 'cell-destroyed' && x.room === 'column' && x.cell === 0);
    return { time: e ? e.t + ctx.dt : null, channel: e ? e.channel : null, cause: e ? e.cause : null };
  },
  compare(e, a) {
    const slack = (x) => 1e-9 * Math.abs(x);
    const checks = {
      'cell 1 destroyed in [t, t + dt)': e.time !== null && a.time !== null && a.time >= e.time - slack(e.time) && a.time < e.time + e.dt + slack(e.time),
      'channel thermal, cause the beam': a.channel === 'thermal' && a.cause === 'beam-1',
      ...(e.literal !== null ? { 'hand-worked literal: 90 s for the reactor cell at T1, in [90, 90 + dt)': a.time >= 90 - slack(90) && a.time < 90 + e.dt + slack(90) } : {}),
    };
    return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([n]) => n).join(', ') };
  },
  invariants(ctx, rows) {
    const ratioOk = ['crewed', 'armour', 'reactor'].every((m) => {
      const t1 = rows.find((r) => r.case.tier === 'T1' && r.case.matter === m), t3 = rows.find((r) => r.case.tier === 'T3' && r.case.matter === m);
      return t1.expected.F1 === 1 && t3.expected.F1 === 1 && Math.abs(t3.actual.time / t1.actual.time - 2) <= (2 * ctx.dt) / t1.actual.time;
    });
    return [{ name: 'square-cube: where F_1 = 1 (crewed, armour, reactor) the T3 time is 2 x the T1 time within 2 dt / t', ok: ratioOk }];
  },
  display(r) {
    const s = (t) => (t === null ? 'never' : `${t.toFixed(4)} s`);
    return { expected: `cell 1 destroyed in [t, t + dt) from t = ${s(r.expected.time)} (F_1 ${r.expected.F1.toFixed(6)})`, actual: `${s(r.actual.time)}, channel ${r.actual.channel}, cause ${r.actual.cause}` };
  },
};
