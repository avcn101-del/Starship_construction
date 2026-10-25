// tools/estimates/furnace-mirror.mjs — #345: Furnace's mirror under L4.builds.lethal's setup (seed 1, the standard enemy, cull
// max(3000, 2r), to 600 s): every 30 s the attacker's release, bay and hit; at the end the beam energy offered at the other's
// shield and what it let through (passedJ). Estimates only. Run from a tree with PR #104's builds (d1c71e9 or later):
//   node tools/estimates/furnace-mirror.mjs <range m> <bow|broadside>
const R = (p) => import(new URL(p, `file://${process.cwd()}/`));
const [{ withOverrides }, { createBattle, tick, mainBody }, { BUILDS }] = await Promise.all(['js/data.js', 'js/battle.js', 'mission0/builds.js'].map(R));
const [range, opening] = [+process.argv[2], process.argv[3]], bs = opening === 'broadside', P = { aggression: 0.5, patience: 0.5, caution: 0.5, resolve: 0.5 };
const x = createBattle({ params: withOverrides({ 'battle.cullDistance': Math.max(3000, 2 * range) }), attacker: BUILDS.Furnace, target: BUILDS.Furnace, distance: range, seed: 1, knowledge: true, bearing: bs ? '+y' : '+x', ...(bs ? { attackerHeading: 0 } : {}), enemy: { A: P, T: P } });
const agg = { fireSteps: 0, hitSteps: 0, passedJ: 0, offeredJ: 0 };
while (!x.ended && x.t < 600) {
  tick(x);
  const A = x.attacker, bay = A.world.rooms.find((r) => r.type === 'beamBay');
  if (bay.beamBay.firing) agg.fireSteps++;
  if (A.beam && A.beam.hit) { agg.hitSteps++; const res = A.other.world.beamResults.find((r) => r.id === A.beam.id); if (res) { agg.passedJ += (res.passed || 0) * x.dt; agg.offeredJ += A.beam.power * x.dt; } }
  if (x.step % 1800 === 0) {
    const h = A.helm, mA = mainBody(A), mT = mainBody(A.other), D = Math.hypot(mA.x[0] - mT.x[0], mA.x[1] - mT.x[1]);
    console.log(`t ${x.t.toFixed(0)} preset ${h.preset?.name ?? h.orders?.preset} released ${h.released} firing ${bay.beamBay.firing} beam ${(bay.beamBay.beam / 1e6).toFixed(2)} MW hit ${!!(A.beam && A.beam.hit)} dist ${D.toFixed(0)}`);
  }
}
console.log(JSON.stringify(agg));
