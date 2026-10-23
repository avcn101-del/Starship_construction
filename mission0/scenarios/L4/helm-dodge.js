import { createBattle, tick, mainBody } from '../../../js/battle.js';
import { worldPoint, rotate, pointVelocity } from '../../../js/body.js';
import { zoneCentre } from '../../../js/sensors.js';
import { TARGETS, SENSOR_SHIPS } from '../../targets.js';

// H4 of the L5 plan (DESIGN.md 13n.4, 13n.1 (d), §13n.3 (11), #301 (2) (3)): a broadside ship dodging against a
// lead-aimed turret. The shooter's turret leads on the other ship's velocity as its model's silhouette gives it (the
// intercept of a round at muzzle speed with a point at constant relative velocity, the smallest positive root); the
// dodger's engine opens across the line of sight from the shot, so the round lands where the aim point was, the aim
// point a dt^2 n (n + 1) / 2 away after the round's n whole steps of flight (the integrator's sum: v then x).
//
// Setup (T1): createBattle with knowledge on; the shooter R1-A (a helm: range hold, position flank (it sits on the dodger's flank), facing bow, open fire in range,
// target weapons: nothing known, so the centre of the zone with the most unknown cells, R1's zone 4 with 12 cells,
// grid (30, 22.5) m) on bearing -y of the dodger at 915 m between the centres of mass, so that the round's flight from R1-A's turret (about 22 m ahead of its centre of mass) to the aim point (7.5 m beyond the dodger's centre) is about 900 m, at rest; the dodger R1 or R1d (a helm: facing broadside,
// dodging on, weapons held, throttle 1) at rest with heading 0: its line of sight to the shooter is -y, its nearer beam
// heading 0 (its side +1), so its engine opens along +x at the first step. The shooter's turret fires its first round
// at t = 0 (released at the first step), the dodger pushes from the same step: "the dodger starting its push at the
// shot". Until the second shot (2.0 s).
// Hand-worked: a = engine.thrust / the dodger's mass (15 MN over R1's 911 234 kg = 16.461 m/s^2, R1d's 1 421 484 kg =
// 10.552 m/s^2; the masses of §13n.3 (9)); the round's whole steps of flight n = floor(t* / dt), t* the time the round
// reaches the aim point's line (its along-sight distance over its along-sight speed, kernel-read at launch, labelled);
// at 900 m n = 67 (t* about 1.12 s); the miss a dt^2 n (n + 1) / 2 = 10.42 m (R1) and 6.68 m (R1d) (§13n.3 (11); the
// plan's 10.0 / 6.5 were the pre-L5m masses), against the aim point's displacement across the line after n steps
// (kernel-read) at one step's 1/2 a t dt (0.153 / 0.098 m). The first shot's aim: the direction from the turret to the
// zone's centre (the silhouette at rest: no lead), 1e-9; the second shot's aim: the intercept on the silhouette's
// velocity (the last two silhouette poses' difference over dt, kernel-read), recomputed here, 1e-9.
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const MASS = { R1: 911234, R1d: 1421484 }, LITERAL = { R1: 10.42, R1d: 6.68 };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], dot = (a, b) => a[0] * b[0] + a[1] * b[1], len = (a) => Math.sqrt(dot(a, a));
function intercept(D, W, u) {
  const a = dot(W, W) - u * u, b = 2 * dot(D, W), c = dot(D, D), disc = b * b - 4 * a * c;
  const r = Math.sqrt(disc), t = [(-b - r) / (2 * a), (-b + r) / (2 * a)].filter((x) => x > 0).sort((p, q) => p - q)[0];
  const P = [D[0] + W[0] * t, D[1] + W[1] * t], L = len(P);
  return [P[0] / L, P[1] / L];
}

export default {
  id: 'L4.helm.dodge',
  level: 'L4',
  laws: ['dodging: a broadside ship turns its engine across the line of sight; over a round\'s n whole steps of flight it moves a dt^2 n (n + 1) / 2 (the integrator\'s sum, #301 (3))', 'the turret leads on the other ship\'s velocity as its model\'s silhouette gives it (#301 (2))'],
  dependsOn: ['L4.helm.conflict'],
  setup: 'T1: createBattle, knowledge on; the shooter R1-A (a helm, fire in range, target weapons) on bearing -y of a dodger (R1 or R1d, a helm, broadside, dodging on, weapons held, throttle 1) at 915 m (a 900 m flight), both at rest; to the second shot (13n.4 H4)',
  measure: 'the first round\'s whole steps of flight n to the aim point\'s line; the aim point\'s displacement across the line after n steps; the two shots\' aims',
  tolerance: 'the miss at one step\'s 1/2 a t dt (t = n dt); the aims 1e-9 (each component)',
  criterion: 'n = 67; the miss a dt^2 n (n + 1) / 2 (10.42 m R1, 6.68 m R1d, §13n.3 (11)) within 1/2 a t dt of the kernel\'s displacement; the first aim on the zone\'s centre, the second on the intercept for the silhouette\'s velocity',
  tunable: ['engine.thrust', 'kinetic.muzzleVelocity'],
  locked: null,
  cases() {
    return [{ dodger: 'R1' }, { dodger: 'R1d' }];
  },
  expected(ctx, c) {
    const a = ctx.params.engine.thrust.value / MASS[c.dodger], dt = ctx.dt, n = 67;
    return { a, n, miss: (a * dt * dt * n * (n + 1)) / 2, tol: 0.5 * a * n * dt * dt, literal: LITERAL[c.dodger] };
  },
  run(ctx, c) {
    const shooter = { range: 'hold', position: 'flank', facing: 'bow', openFire: 'inRange', target: 'weapons', throttle: 1 };
    const dodger = { range: 'hold', facing: 'broadside', dodging: 'on', heat: { threshold: 0, response: 'weapons' }, throttle: 1 };
    const b = createBattle({ params: ctx.params, tier: 'T1', attacker: SENSOR_SHIPS['R1-A'], target: TARGETS[c.dodger], bearing: '-y', distance: 915, knowledge: true, orders: { A: shooter, T: dodger } });
    const A = b.attacker, T = b.target, turret = A.world.rooms.find((r) => r.type === 'turret'), dt = b.dt;
    const tb0 = mainBody(T), aimed = zoneCentre(A.model, 4), local = rotate(sub(aimed, tb0.x), -tb0.theta); // the aimed point on the dodger's body
    const shots = [];
    let seen = 0;
    const positions = [];
    while (b.step < 150 && shots.length < 2) {
      const tb = mainBody(T);
      const sb = A.world.ship.bodies.find((x) => x.id === turret.body), S = worldPoint(sb, turret.position), vs = pointVelocity(sb, S), theta = sb.theta;
      const P = zoneCentre(A.model, 4);
      tick(b);
      positions.push([tb.x[0] + rotate(local, tb.theta)[0], tb.x[1] + rotate(local, tb.theta)[1]]);
      const fresh = A.world.log.events.slice(seen).filter((e) => e.type === 'shot');
      seen = A.world.log.events.length;
      for (const e of fresh) {
        // The helm's aim at this tick: its history after observing (its last two poses), recomputed.
        const h = A.helm.history, n = h.length;
        const v = n >= 2 ? [(h[n - 1].x[0] - h[n - 2].x[0]) / dt, (h[n - 1].x[1] - h[n - 2].x[1]) / dt] : [0, 0];
        const u = ctx.params.kinetic.muzzleVelocity.value, want = intercept(sub(P, S), sub(v, vs), u);
        const aim = rotate(turret.turret.aim, theta); // the aim the helm set in the ship's frame of the tick's start
        const r = b.rounds.find((x) => x.event === e.id);
        shots.push({ step: b.step, t: e.t, aimErr: Math.max(Math.abs(aim[0] - want[0]), Math.abs(aim[1] - want[1])), v, x0: r ? [...r.ref.x0] : null, v0: r ? [...r.ref.v] : null, P: [...P] });
      }
    }
    // The first round's whole steps of flight to the aim point's line (the line of sight is +y from the shooter): its
    // along-sight distance from the muzzle over its along-sight speed.
    const s0 = shots[0], tStar = (s0.P[1] - s0.x0[1]) / s0.v0[1], n = Math.floor((tStar + s0.t) / dt - 1e-9);
    const moved = positions[n - 1][0] - aimed[0]; // across the line of sight (+x): the aimed point after n steps
    return { n, tStar, miss: moved, aim0: shots[0].aimErr, aim1: shots[1] ? shots[1].aimErr : null, v1: shots[1] ? shots[1].v : null, steps: shots.map((s) => s.step) };
  },
  compare(e, a) {
    const checks = {
      'n = 67 whole steps of flight': a.n === e.n,
      'the miss a dt^2 n (n + 1) / 2 within 1/2 a t dt of the kernel\'s displacement': Math.abs(a.miss - e.miss) <= e.tol,
      'the literal of §13n.3 (11) (two decimals) within 1/2 a t dt': Math.abs(a.miss - e.literal) <= e.tol + 0.005,
      'the first aim on the zone\'s centre (1e-9)': a.aim0 !== null && a.aim0 <= 1e-9,
      'the second aim on the intercept for the silhouette\'s velocity (1e-9)': a.aim1 !== null && a.aim1 <= 1e-9 && Math.abs(a.v1[0]) > 0,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const e = r.expected, a = r.actual;
    return { expected: `n ${e.n}, miss ${e.miss.toFixed(4)} m (a ${e.a.toFixed(4)} m/s^2) +- ${e.tol.toFixed(3)}; literal ${e.literal}`, actual: `n ${a.n} (t* ${a.tStar.toFixed(4)} s, kernel-read), miss ${a.miss.toFixed(4)} m (kernel-read); aims ${a.aim0.toExponential(1)} / ${a.aim1 === null ? '-' : a.aim1.toExponential(1)}; shots at steps ${a.steps.join(', ')}` };
  },
};
