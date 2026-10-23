import { createBattle, tick } from '../../../js/battle.js';
import { fittingPose } from '../../../js/defence.js';
import { pointVelocity } from '../../../js/body.js';
import { R1_ROOMS, R1_FITTINGS, missileShip } from '../../targets.js';

// W9 of the L5 plan (DESIGN.md 13n.4, 13n.1 (c), #93, #296): a swarm against point defence. Each fitting engages the
// other side's missiles only, in the arc of its hull segment (the outward half-plane of its edge) and within pd.range
// (600 m, #296) of its edge's midpoint, the nearest first; a missile dies when its dose reaches its hp,
// matter.burnEnergyPerKg x missile.mass = 3000 x 200 = 600 kJ (the one law).
//
// The cadence (a case setting, stated in the pull request): the plan's "six missiles 0.5 s apart" cannot be flown by
// the kernel's bay, which launches one per missilebay.launchInterval (2 s; its range 1-10 s) from a store of
// missilebay.readyMissiles (2). The case sets the store to six (readyMissiles 6, the top of its approved range 1-6;
// the magazine's feed, 3.6 kg/s through 5 m of wall, refills nothing in the run) and flies the bay's own cadence: six
// missiles launched at t_k = 2k s, k = 0..5 (the start of steps 120 k).
//
// Setup (T1): createBattle, knowledge on, the attacker R1-M (designated HE missiles, unscanned: each flies at the
// silhouette's centre C) from -y at 900 m against R1 with one fitting on the hold's -y edge of cell (7, 0): (kinetic) a
// `pd`, (laser) a `pdLaser`. Up to 25 s.
//
// Hand-worked from the missiles' kinematics (#296): both ships at rest, a missile leaves its bay's face L at rest and
// turns onto C at once (no turn rate), so it flies the straight line from L to C with s(tau) = a tau^2 / 2 = 15 tau^2
// (missile.acceleration 30 m/s^2; the burn, 20 s, outlasts every flight). Its distance to the fitting's point S is
// d(tau) = |L + s(tau) u - S|, u = (C - L) / |C - L|; it is within pd.range at the first step end j_k after its launch
// at which d <= 600 m (a re-statement on the kernel-read points L, C and S, labelled; S read at every step end, since
// the kinetic fitting's recoil moves R1 by centimetres over the run). With S about 15 m off the line, L about 875 m
// from S: it enters about sqrt(275 / 15) = 4.3 s after launch, hits about 7.6 s after launch, so each missile spends
// about 3.3 s inside the range, and the next enters 2 s after it.
// Laser (pdLaser.power 1 MW on the fitting's host at full power): it aims before a step at the nearest missile in range
// and arc as the last step left it, so missile k is first dosed in the step after the step end j_k at which it is
// first within 600 m and killed after hp / P = 0.6 s = 36 steps of beam: at the step end j_k + 36. Missile k + 1 enters the range 2 s after
// missile k, 1.4 s after missile k died: the laser is never shared, it kills all six; none hits. Its energy: 6 x 0.6 MJ.
// Kinetic (pd.fireRate 2 /s): it fires at the step end j_k (the missile within range at the step's end) a flak round of
// kinetic.muzzleVelocity (800 m/s) from S with lead on the missile's velocity then, relative to the fitting's own
// velocity (the hull's point velocity at the step end before, kernel-read; re-statement of the lead), flown straight;
// its closest approach to the accelerating missile (exact kinematics, a re-statement) is less than 15.275 m (the
// missile's acceleration over the flak's flight, ~0.6 s, is ~5 m along track, seen at the line's angle of ~1 degree
// to the flak's), so its burst, he.blastEnergy 2 MJ over flak.radius 10 m, doses the missile E / (1 + (d / 10)^2) >=
// 600 kJ: missile k dies at the first flak fired at it, at that flak's closest approach. The 2 s cadence is far below
// the fitting's throughput (one flak per 0.5 s, each killing): it kills all six; none hits.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const HP = 3000 * 200, KILL_R = 10 * Math.sqrt(2e6 / HP - 1), RANGE = 600, A = 30, U = 800, DT = 1 / 60;
const FIT = { kinetic: ['pd', 'hold', [7, 0], [0, -1]], laser: ['pdLaser', 'hold', [7, 0], [0, -1]] };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = (a) => Math.sqrt(dot(a, a));

/** Missile k's position (world m) tau s after launch on the line from L to C (re-statement of the kinematics). */
const along = (L, u, tau) => [L[0] + 0.5 * A * tau * tau * u[0], L[1] + 0.5 * A * tau * tau * u[1]];
/** The step end (index into the track) at which missile m, on its line from L to C, is first within RANGE of the fitting's point S then; null if never. */
function entry(m, track) {
  const D = sub(m.C, m.L), u = [D[0] / len(D), D[1] / len(D)];
  const j = track.findIndex((p) => p.t > m.t + 1e-9 && len(sub(along(m.L, u, p.t - m.t), p.S)) <= RANGE && p.t - m.t < Math.sqrt((2 * len(D)) / A));
  return j < 0 ? null : { j, u };
}
/** The flak's intercept direction from S (moving at vs) for a missile at X with velocity V (re-statement of defence.js's lead). */
function leadDir(S, vs, X, V) {
  const D = sub(X, S), W = sub(V, vs), a = dot(W, W) - U * U, b = 2 * dot(D, W), c = dot(D, D), r = Math.sqrt(b * b - 4 * a * c);
  const t = [(-b - r) / (2 * a), (-b + r) / (2 * a)].filter((x) => x > 0).sort((p, q) => p - q)[0];
  const P = [D[0] + W[0] * t, D[1] + W[1] * t];
  return [P[0] / len(P), P[1] / len(P)];
}
/** The flak fired from S at tf with velocity vf and missile k (launched tk at L along u): its closest approach { t, d } (re-statement, exact kinematics, a fine scan then bisection on the range rate). */
function closest(S, vf, tf, L, u, tk) {
  const gap = (t) => sub([S[0] + vf[0] * (t - tf), S[1] + vf[1] * (t - tf)], along(L, u, t - tk));
  const rate = (t) => { const g = gap(t), h = 1e-7, g2 = gap(t + h); return (dot(g2, g2) - dot(g, g)) / h; };
  let lo = tf, hi = tf + 3;
  for (let t = tf; t < tf + 3; t += 1e-3) if (rate(t) >= 0) { hi = t; lo = Math.max(tf, t - 1e-3); break; }
  for (let i = 0; i < 100; i++) { const mid = 0.5 * (lo + hi); if (rate(mid) < 0) lo = mid; else hi = mid; }
  return { t: hi, d: len(gap(hi)) };
}

export default {
  id: 'L2.pd.swarm',
  level: 'L2',
  laws: ['point defence engages missiles only, in the outward half-plane of its hull segment and within pd.range, the nearest first (#93, 13n.1 (c), #296)', 'laser: pdLaser.power on its missile while in arc and range; it dies in hp / P (13n.1 (c), #230)', 'kinetic: one flak round per 1 / pd.fireRate with lead, each bursting at its closest approach; the missile dies when the dose reaches its hp (13n.1 (c))', 'the Swarm: munitions against point-defence throughput (13n.1 (c))'],
  dependsOn: ['L0.missile.flight', 'L1.pd.kinetic', 'L1.pd.laser'],
  setup: 'T1: createBattle, knowledge on, R1-M with a ready store of six (missilebay.readyMissiles 6, a case setting) launching at its own cadence (one per 2 s) from -y at 900 m against R1 with one pd or one pdLaser fitting on the hold\'s -y edge of cell (7, 0), pd.range 600 m, up to 25 s (13n.4 W9, #296)',
  measure: 'each missile\'s launch time and point L, its aim point C, the fitting\'s point S and velocity at every step end from 3 s (kernel-read, labelled); the missile-killed events (time, by, dose); the flak fired (time, target) and each burst (its closest approach and time); the laser\'s energy; the warhead events',
  tolerance: 'counts exact; launch times 1e-9; a kill or a first shot at its step end exactly (on the grid: the step is what is tested); a burst\'s time 1e-4 s and distance 0.01 m against the exact kinematics (the kernel interpolates the missile linearly within a step); energies 1e-12',
  criterion: 'six launched at t_k = 2k s; j_k the first step end after launch at which missile k, on its line from L to C at 15 tau^2, is within 600 m of S then (re-statement on the kernel-read L, C, S); (laser) all six killed by the laser, missile k at the step end j_k + 36 (hp / P = 0.6 s of beam), each dose 600 kJ, the energy 6 x 0.6 = 3.6 MJ, no warhead; (kinetic) all six killed by flak, missile k by the first flak fired at it, fired at the step end j_k, at its burst at the closest approach of the exact kinematics (the lead re-stated), d <= 15.275 m (hand-worked), killed at that burst\'s step end; the store 40 less the flak fired; no warhead; the counts 6, 6 and 0 hits hand-worked',
  tunable: ['pd.range', 'pdLaser.power', 'pd.fireRate', 'flak.radius', 'he.blastEnergy', 'missile.mass', 'matter.burnEnergyPerKg', 'missile.acceleration', 'missilebay.launchInterval'],
  locked: { date: '2026-10-23', hash: '7cfddc96' },
  cases() {
    return [{ fitting: 'laser' }, { fitting: 'kinetic' }];
  },
  expected(ctx, c) {
    return { launched: 6, launchTimes: [0, 2, 4, 6, 8, 10], killed: 6, by: c.fitting === 'laser' ? 'laser' : 'flak', hits: 0, hp: HP, killR: KILL_R, beamSteps: 36 };
  },
  run(ctx, c) {
    const params = JSON.parse(JSON.stringify(ctx.params));
    params.missilebay.readyMissiles.value = 6; // the case's store of six (13n.4 W9 as the kernel's bay can fly it)
    const target = { rooms: R1_ROOMS, fittings: [...R1_FITTINGS, FIT[c.fitting]] };
    const b = createBattle({ params, attacker: missileShip('designated', 'he'), target, bearing: '-y', plan: { missile: { rooms: ['reactor'], count: 6 } }, knowledge: true });
    const tw = b.target.world, f = tw.fittings.find((x) => x.type === 'pd' || x.type === 'pdLaser');
    const seen = new Map(), flak = new Map(), track = [];
    while (b.step < 1500) {
      tick(b);
      const pose = fittingPose(tw, f);
      if (b.t >= 3) track.push({ t: b.t, S: [...pose.S], vS: pointVelocity(pose.body, pose.S) }); // no missile is within range before 4 s
      for (const x of b.missiles) if (!seen.has(x.id)) seen.set(x.id, { id: x.id, t: x.t, L: [...x.x0], C: x.aim ? [...x.aim.point] : null, by: x.aim ? x.aim.by : null });
      for (const r of b.flak) if (!flak.has(r.id)) flak.set(r.id, { id: r.id, t: b.t, missile: r.target.id });
      if (b.missileShots === 6 && !b.missiles.length) break;
    }
    const ev = tw.log.events;
    return {
      track, missiles: [...seen.values()],
      kills: ev.filter((e) => e.type === 'missile-killed').map((e) => ({ missile: e.missile, t: e.t, by: e.by, dose: e.dose })),
      warheads: ev.filter((e) => e.type === 'warhead').length,
      flak: [...flak.values()], bursts: (b.bursts || []).map((x) => ({ id: x.id, missile: x.missile, d: x.d, at: x.at })),
      energy: f.energy ?? null, ammo: f.ammo ?? null, P: ctx.params.pdLaser.power.value, t: b.t,
    };
  },
  compare(e, a, c) {
    const close = (x, y, t) => Number.isFinite(y) && Math.abs(x - y) <= t * Math.max(Math.abs(x), 1e-300);
    const ms = [...a.missiles].sort((p, q) => p.t - q.t);
    const geo = ms.map((m) => (m.C ? entry(m, a.track) : null)), T = (j) => a.track[j].t;
    const checks = {
      'six launched at t_k = 2k s (1e-9)': ms.length === e.launched && ms.every((m, k) => Math.abs(m.t - e.launchTimes[k]) <= 1e-9 * Math.max(1, e.launchTimes[k])),
      'each flies at the silhouette\'s centre (unscanned)': ms.every((m) => m.by === 'silhouette'),
      'each comes within pd.range on its line': geo.every(Boolean),
      [`all six killed by the ${e.by}`]: a.kills.length === e.killed && a.kills.every((k) => k.by === e.by) && new Set(a.kills.map((k) => k.missile)).size === e.killed,
      'none hits (no warhead)': a.warheads === e.hits,
      'each dose at least the hp 600 kJ': a.kills.every((k) => k.dose >= e.hp * (1 - 1e-12)),
    };
    if (c.fitting === 'laser') {
      checks['missile k killed at the step end j_k + 36 (36 steps of beam after the step end j_k it came within 600 m)'] = geo.every(Boolean) && ms.every((m, k) => {
        const kill = a.kills.find((x) => x.missile === m.id);
        return kill && kill.t === T(geo[k].j + e.beamSteps);
      });
      checks['each dose exactly the hp (36 steps of P dt, 1e-12)'] = a.kills.every((k) => close(e.hp, k.dose, 1e-12));
      checks['the laser\'s energy 6 x 36 x P dt = 3.6 MJ (1e-12)'] = close(e.killed * e.beamSteps * a.P * DT, a.energy, 1e-12);
    } else {
      checks['missile k killed by the first flak fired at it, fired at the step end j_k, at its burst at the exact closest approach (1e-4 s, 0.01 m), d <= 15.275 m'] = geo.every(Boolean) && ms.every((m, k) => {
        const kill = a.kills.find((x) => x.missile === m.id), first = a.flak.filter((r) => r.missile === m.id).sort((p, q) => p.t - q.t)[0];
        const j = geo[k] && geo[k].j;
        if (!kill || !first || first.t !== T(j)) return false;
        const burst = a.bursts.find((x) => x.id === first.id), S = a.track[j].S, vs = a.track[j - 1].vS;
        const tau = first.t - m.t, X = along(m.L, geo[k].u, tau), V = [A * tau * geo[k].u[0], A * tau * geo[k].u[1]], w = leadDir(S, vs, X, V);
        const ca = closest(S, [vs[0] + U * w[0], vs[1] + U * w[1]], first.t, m.L, geo[k].u, m.t);
        return !!burst && Math.abs(burst.at - ca.t) <= 1e-4 && Math.abs(burst.d - ca.d) <= 0.01 && ca.d <= e.killR && Math.abs(kill.t - (Math.ceil(ca.t / DT - 1e-9) * DT)) <= 1e-9 * Math.max(1, kill.t);
      });
      checks['the store 40 less the flak fired'] = a.ammo === 40 - a.flak.length;
    }
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: JSON.stringify(r.expected), actual: JSON.stringify(r.actual).slice(0, 2000) };
  },
};
