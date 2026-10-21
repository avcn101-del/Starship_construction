import { createWorld, addRoom, setActive, fireBeam, beamEnergy, step } from '../../../js/rooms.js';
import { heatBooks } from '../../../js/heat.js';

// The L0 lock hashes cases, expected, compare and invariants but not helpers (#175), so the scenario's own stepped
// integration lives inside expected().
// The kernel has no armour cells yet (armour fittings come later, #15): the column is two M shield generators
// standing alone and switched off (no heat of their own), crossed two cells deep: 4 cells of sigma =
// cellMass.shieldGenerator / edge^2, 400 kg/m^2 at T1, the armour cell's (armour.cellMass, 13i.2).
const LIMIT = 3600; // s, FIXED.burnTimeLimit's value: the run gives up after this long

export default {
  id: 'L0.beam.burn.v3',
  level: 'L0',
  laws: ['a neutral particle beam leaves its energy along its path (#229)', 'beam damage: integrity loss P F_i / armour.burnEnergy (13i.1)', 'beams heat what they hit (#138)', 'no falloff at battle range (#230)', 'energy conservation'],
  dependsOn: ['L0.beam.depth', 'L0.beam.range'],
  setup: 'an M beam (beam.power) from an M beam bay N = 2 or 8 cells long (E = beam.gradient x N x edge: 100 or 400 MeV at T1) held on a column of 4 cells (two switched-off M shield generators standing alone, crossed two cells deep, sigma 400 kg/m^2 at T1 like armour) at contact (0 m) and at 1500 m, T1 and T3, by the kernel\'s fireBeam once per step until all 4 cells are destroyed (13i.4 P8)',
  measure: 'the time each cell is destroyed (the end of the step in which it reaches integrity 0); the heat each room holds; the energy left and the energy that left',
  tolerance: 'times one-sided: t <= time < t + dt, with a 1e-9 relative float slack on both bounds (#185 (2)); heat relative 1e-9; times identical at both ranges (exact)',
  criterion: 'the scenario\'s own stepped integration: each step, F_i by its own Bethe integration (13i.1, steps at most 0.2 kg/m^2 and 0.1 % of the energy) over the cells still standing (a destroyed cell a hole), each cell losing P F_i dt / armour.burnEnergy (a float residue of 1e-12 or less is 0); t is the time within the step at which a cell reaches 0 at that step\'s rate; the kernel destroys the same cell at the end of that step, t <= time < t + dt (estimates at T1: N = 8 cells 1-3 at 13.9, 18.2, 20.4 s; N = 2 at 6, 12, 18, 24 s, whole steps, passing on the float slack); the heat each room holds = the energy fireBeam left in its cells within 1e-9; energy left + energy that left = P x time within 1e-9; the same times at 0 and 1500 m (#138, #229, #230, #234, #235)',
  tunable: ['beam.power', 'beam.gradient', 'armour.burnEnergy', 'cellMass.shieldGenerator'],
  locked: { date: '2026-10-21', hash: '6e50b68a' },
  cases() {
    const out = [];
    for (const tier of ['T1', 'T3']) for (const N of [2, 8]) for (const range of [0, 1500]) out.push({ tier, N, range });
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
    function fractions(E0, sigmas) {
      let E = E0, X = 0, prev = 1;
      return sigmas.map((s) => {
        if (s > 0 && E > 0) E = cross(E, s);
        X += s;
        const left = E > 0 ? (Math.exp(-X / lam) * E) / E0 : 0, F = prev - left;
        prev = left;
        return F;
      });
    }
    const E0 = p.beam.gradient.value * c.N * edge, P = ctx.scaled(p.beam.power, edge), Q = ctx.scaled(p.armour.burnEnergy, edge);
    const sigma = ctx.scaled(p.cellMass.shieldGenerator, edge) / (edge * edge);
    const integrity = [1, 1, 1, 1], times = [null, null, null, null];
    const memo = new Map();
    for (let k = 0; times.some((t) => t === null) && k * dt < 3600; k++) {
      const key = integrity.map((g) => (g > 0 ? 1 : 0)).join('');
      if (!memo.has(key)) memo.set(key, fractions(E0, integrity.map((g) => (g > 0 ? sigma : 0))));
      const F = memo.get(key);
      for (let i = 0; i < 4; i++) {
        if (integrity[i] === 0 || !(F[i] > 0)) continue;
        const loss = (P * F[i] * dt) / Q, left = integrity[i] - loss;
        if (left > 1e-12) { integrity[i] = left; continue; }
        times[i] = k * dt + (integrity[i] / loss) * dt;
        integrity[i] = 0;
      }
    }
    return { times, dt, P };
  },
  run(ctx, c) {
    const edge = ctx.tiers[c.tier].edge, world = createWorld({ params: ctx.params, edge, dt: ctx.dt });
    const bay = addRoom(world, 'beamBay', { id: 'bay', length: c.N });
    const rooms = [addRoom(world, 'shieldGenerator', { id: 'gen-1' }), addRoom(world, 'shieldGenerator', { id: 'gen-2' })];
    for (const r of rooms) setActive(world, r, false);
    const path = [{ room: rooms[0], cell: 0 }, { room: rooms[0], cell: 1 }, { room: rooms[1], cell: 0 }, { room: rooms[1], cell: 1 }];
    const beam = { power: ctx.scaled(ctx.params.beam.power, edge), energy: beamEnergy(world, bay), range: c.range };
    const left = new Map(rooms.map((r) => [r.id, 0]));
    let escaped = 0;
    while (path.some((x) => !x.room.cells[x.cell].destroyed) && world.t < LIMIT) {
      const res = fireBeam(world, beam, path, 'beam-1');
      res.energies.forEach((e, i) => left.set(path[i].room.id, left.get(path[i].room.id) + e));
      escaped += res.escaped;
      step(world);
    }
    const ev = world.log.events.filter((e) => e.type === 'cell-destroyed');
    const times = path.map((x) => { const e = ev.find((d) => d.room === x.room.id && d.cell === x.cell); return e ? e.t + ctx.dt : null; });
    return {
      times, channels: ev.map((e) => e.channel), causes: ev.map((e) => e.cause), t: world.t, energy: beam.energy,
      rooms: rooms.map((r) => ({ id: r.id, left: left.get(r.id), books: heatBooks(r.heat) })), escaped,
    };
  },
  compare(e, a) {
    const slack = (x) => 1e-9 * Math.abs(x);
    const checks = {
      'every cell destroyed in the step the own integration names (t <= time < t + dt)': a.times.every((t, i) => t !== null && e.times[i] !== null && t >= e.times[i] - slack(e.times[i]) && t < e.times[i] + e.dt + slack(e.times[i])),
      'channel thermal, cause carried': a.channels.length === 4 && a.channels.every((x) => x === 'thermal') && a.causes.every((x) => x === 'beam-1'),
      'heat in each room = the energy left there (1e-9)': a.rooms.every((r) => Math.abs(r.books.stored - r.left) <= 1e-9 * r.left && Math.abs(r.books.generated - r.left) <= 1e-9 * r.left),
      'energy left + energy that left = P x time (1e-9)': Math.abs(a.rooms.reduce((x, r) => x + r.left, 0) + a.escaped - e.P * a.t) <= 1e-9 * e.P * a.t,
    };
    return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([n]) => n).join(', ') };
  },
  invariants(ctx, rows) {
    return [{ name: 'the same destruction times at 0 and 1500 m (exact), every tier and length', ok: rows.filter((r) => r.case.range === 0).every((r) => {
      const far = rows.find((q) => q.case.range === 1500 && q.case.tier === r.case.tier && q.case.N === r.case.N).actual.times;
      return r.actual.times.every((t, i) => t === far[i]);
    }) }];
  },
  display(r) {
    const s = (ts) => ts.map((t) => (t === null ? '-' : t.toFixed(4))).join(', ');
    return { expected: `cells destroyed in [t, t + dt) from t = ${s(r.expected.times)} s`, actual: `${s(r.actual.times)} s (E ${(r.actual.energy / 1.602176634e-13).toFixed(1)} MeV); heat ${r.actual.rooms.map((x) => (x.books.stored / 1e6).toFixed(3)).join(' / ')} MJ, escaped ${(r.actual.escaped / 1e6).toFixed(3)} MJ` };
  },
};
