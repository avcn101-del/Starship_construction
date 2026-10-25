// tools/estimates/gap7-dynamics.mjs — the lead designer's reading for the phases' gap 7 (#363): each build's acceleration and t180 (js/helm.js shipDynamics) on the locked builds. Run from the repository root: node tools/estimates/gap7-dynamics.mjs
const R = (p) => import(new URL(p, `file://${process.cwd()}/`));
const [{ withOverrides }, { createBattle }, { shipDynamics }, B] = await Promise.all(['js/data.js', 'js/battle.js', 'js/helm.js', 'mission0/builds.js'].map(R));
for (const n of Object.keys(B.BUILDS)) {
  const b = createBattle({ params: withOverrides({}), attacker: B.BUILDS[n], target: B.BUILDS.R2, bearing: '+x', distance: 900, seed: 1, knowledge: true, orders: { A: 'fire', T: 'fire' } });
  const d = shipDynamics(b, b.sides[0]);
  console.log(n.padEnd(12), (d.a / 9.80665).toFixed(3), 'g  t180', d.t180.toFixed(2), 's');
}
