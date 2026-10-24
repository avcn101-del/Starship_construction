// tools/estimates/l5e1.mjs — the lead designer's estimates for L5e1 (DESIGN.md
// 13n.8: the position law, the plume, containment first, dark fragments, a
// simultaneous end, the builds and the sweep; #241 (1), #275, #315, #316).
// Reads js/, tools/ and mission0/ only; changes nothing; never a canonical run:
//   node tools/estimates/l5e1.mjs [--set group.name=value ...] [--plan name=value ...]
// --set overrides a constant of js/data.js; --plan one of the PLANNED constants
// below (not in data.js yet, #248). Each line says whether its number comes from
// the kernel at the current head or from the stated formula.
import { PARAMS, FIXED, TIERS, withOverrides } from '../../js/data.js';
import { createBattle, runBattle, tick } from '../../js/battle.js';
import { createDuel } from '../duel.js';
import { TARGETS, SENSOR_SHIPS, WEAPON_SHIPS, HELM_SHIPS } from '../../mission0/targets.js';

const args = process.argv.slice(2), overrides = {}, planOverrides = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--set') { const [k, v] = args[++i].split('='); overrides[k] = Number(v); }
  if (args[i] === '--plan') { const [k, v] = args[++i].split('='); planOverrides[k] = Number(v); }
}
const params = withOverrides(overrides);
const edge = TIERS.T1.edge, dt = FIXED.simStep.value;
const SHIPS = { ...TARGETS, ...SENSOR_SHIPS, ...WEAPON_SHIPS, ...HELM_SHIPS };
const line = (s) => console.log(s);
const f = (x, d = 3) => (Math.abs(x) >= 1e6 || (Math.abs(x) < 1e-3 && x !== 0) ? x.toExponential(3) : x.toFixed(d));
const v = (k) => { const [g, n] = k.split('.'); return params[g][n].value; };

// ---------- the plan's proposed constants (13n.8; T1 values) ----------
const PLANNED = {
  'helm.positionLead': Math.PI / 3, // rad, k = 0: the position point's lead along the circle of R* (#315)
  'engine.plumeHalfAngle': Math.PI / 6, // rad, k = 0: the exhaust cone's half-angle (#297)
  ...planOverrides,
};
const std = { aggression: 0.5, patience: 0.5, caution: 0.5, resolve: 0.5 };
const main = (s) => s.world.ship.bodies.reduce((m, b) => (b.M > m.M ? b : m), s.world.ship.bodies[0]);

// ---------- (1) the position law (#315): the minimum separation on the current kernel ----------
line('(1) The position slot (#315), kernel at the current head: tools/duel.js duels R1d-A against R1d-A run to their end (300 s at most); the minimum separation of the two main bodies');
const DUELS = [
  ['default', {}],
  ['--personality 1,0,0.5,0.5', { personality: { aggression: 1, patience: 0, caution: 0.5, resolve: 0.5 } }],
  ['--personality 0,0,0.5,0.5', { personality: { aggression: 0, patience: 0, caution: 0.5, resolve: 0.5 } }],
  ['--range 2500', { range: 2500 }],
  ['--range 600', { range: 600 }],
];
const floor = v('helm.rangeClose') && params.helm.rangeClose.min / 2;
for (const [name, o] of DUELS) {
  const b = createDuel({ ...o, overrides });
  let min = Infinity, at = 0;
  while (!b.ended && b.t < 300) {
    tick(b);
    if (!b.attacker.world.ship.bodies.length || !b.target.world.ship.bodies.length) break;
    const A = main(b.attacker), T = main(b.target), d = Math.hypot(A.x[0] - T.x[0], A.x[1] - T.x[1]);
    if (d < min) { min = d; at = b.t; }
  }
  line(`  ${name.padEnd(26)} ${f(min, 1)} m at ${f(at, 2)} s ${min >= floor ? 'meets' : 'FAILS'} L4.helm.separation's floor ${f(floor, 0)} m (half of helm.rangeClose's lowest approved value)`);
}
line(`  the kernel at the current head: the position law of #315 since L5e1 (lead ${f((PLANNED['helm.positionLead'] * 180) / Math.PI, 0)} deg); on main before it, 900.0 / 33.4 / 111.4 / 51.1 / 55.2 m (#315)`);

// ---------- (2) the plume (#297, #304): formula on the kernel's constants ----------
const theta = PLANNED['engine.plumeHalfAngle'], thrust = v('engine.thrust'), ve = v('engine.exhaustVelocity'), q = v('matter.burnEnergyPerKg');
const P = (thrust * ve) / 2, d = params.battle.openingRange.value, r = d * Math.tan(theta), I = P / (Math.PI * r * r), A = edge * edge;
line(`(2) The plume (#297), formula: jet power thrust x v_e / 2 = ${f(thrust, 0)} x ${f(ve, 0)} / 2 = ${f(P / 1e9, 1)} GW at full throttle; at ${f(d, 0)} m and half-angle ${f((theta * 180) / Math.PI, 0)} deg the cone's radius d tan(theta) = ${f(r, 1)} m (the pursuer's offset), the axis intensity P / (pi r^2) = ${f(I / 1e3, 2)} kW/m^2`);
line(`  a fitting intercepts over one hull segment's face, edge^2 = ${f(A, 0)} m^2 (the assumption #297's frame used for every fitting; stated in 13n.8), and is ruined when it has taken q x its mass, q = matter.burnEnergyPerKg ${f(q, 0)} J/kg:`);
for (const [name, mass] of [['radiator panel', v('radiator.mass')], ['antenna', v('sensor.mass')], ['kinetic point defence', v('pd.mass')], ['laser point defence', v('pdLaser.mass')]]) {
  const t = (q * mass) / (I * A);
  line(`  ${name.padEnd(22)} ${f(mass, 0)} kg: ${f((q * mass) / 1e6, 2)} MJ, ${f(t, 3)} s = ${Math.ceil(t / dt - 1e-9)} steps of ${f(dt, 5)} s`);
}

// ---------- (3) the pace prior (#315): the R1d-A mirror under the standard enemy, kernel ----------
line('(3) The pace prior (#315), kernel: R1d-A against R1d-A, both sides the standard enemy, bow-on, bearing -y, run to 900 s; L5e1 changes the position law, so these move: the pace study re-runs them on the real builds');
for (const o of [{}, { 'kinetic.hitsToWreck': 8 }]) {
  const ends = [];
  for (const distance of [600, 900, 1500]) {
    const b = createBattle({ params: withOverrides({ ...overrides, ...o }), attacker: SHIPS['R1d-A'], target: SHIPS['R1d-A'], bearing: '-y', distance, seed: 1, knowledge: true, enemy: { A: std, T: std } });
    runBattle(b, 900);
    ends.push(b.ended ? `${distance} m ${b.ended.kind} ${b.ended.side} ${f(b.ended.t, 1)} s (${b.hits.length} hits of ${b.shots})` : `${distance} m none by 900 s`);
  }
  line(`  ${JSON.stringify(o)}: ${ends.join('; ')}`);
}

// ---------- (4) a simultaneous end: the exact mirror (#315) ----------
const mirror = createBattle({ params, attacker: SHIPS['R1d-A'], target: SHIPS['R1d-A'], bearing: '+x', distance: 900, seed: 1, knowledge: true, enemy: { A: std, T: std } });
runBattle(mirror, 300);
const by = mirror.hits.reduce((m, h) => ((m[h.side] = (m[h.side] || 0) + 1), m), {});
line(`(4) A simultaneous end, kernel: the exact mirror (bearing +x, each on the other's bow, 900 m) ends ${mirror.ended ? `${mirror.ended.kind} ${mirror.ended.side} at ${f(mirror.ended.t, 4)} s (step ${mirror.ended.step})` : 'none'}; hits by side ${JSON.stringify(by)}: identical ships, identical orders, the end goes to A by the kernel's order (13l.1 (g)); L5e1's rule makes it a draw`);
