// Battle phases' gaps 3 and 4 (#346): a contact phase held at range open with weapons tight, its exit condition named by model fields.
// gaps 3 and 4 probe (from IDEAS.md's /tmp/pp.mjs): both sides the standard enemy, patience 1 (weapons tight until the
// commit), contact = range open until the exit condition, then range close and weapons free.
// node pp2.mjs <A> <T> <range> <bow|broadside> <seed> <exit: E0|E1|E2|E3> [Tmax]
const R = (p) => import(new URL(p, `file://${process.cwd()}/`));
const [{ withOverrides }, { createBattle, tick }, { BUILDS }, { antennas }] = await Promise.all(['js/data.js', 'js/battle.js', 'mission0/builds.js', 'js/sensors.js'].map(R));
const [a, b, range, opening, seed, exit, tmax] = process.argv.slice(2), bs = opening === 'broadside', TM = +(tmax || 240);
const P = { aggression: 0.5, patience: 1, caution: 0.5, resolve: 0.5 };
const x = createBattle({ params: withOverrides({ 'battle.cullDistance': 5000 }), attacker: BUILDS[a], target: BUILDS[b], distance: +range, seed: +seed,
  knowledge: true, bearing: bs ? '+y' : '+x', ...(bs ? { attackerHeading: 0 } : {}), enemy: { A: P, T: P } });
const sides = [['A', x.attacker], ['T', x.target]], ph = { A: 0, T: 0 }, why = { A: '', T: '' }, ruin = { A: null, T: null };
for (const [, s] of sides) s.helm.override = { ...s.helm.override, range: 'open' };
const canScan = (s) => antennas(s.world).some((f) => { const h = s.room(f.room); return !f.ruined && !h.cells[f.k].destroyed; });
const hurt = (s) => { const L = s.world.log; return (L.events ?? L).some((e) => e.type === 'cell-damaged'); };
while (!x.ended && x.t < 600) {
  tick(x);
  for (const [k, s] of sides) {
    if (ruin[k] === null && !canScan(s)) ruin[k] = +x.t.toFixed(1);
    if (ph[k]) continue;
    let w = s.model.resolved.size >= 6 ? 'zones' : '';
    if (!w && exit >= 'E1' && !canScan(s)) w = 'blind';
    if (!w && exit >= 'E2' && hurt(s)) w = 'hit';
    if (!w && exit >= 'E3' && x.t >= TM) w = 'time';
    if (w) { ph[k] = +x.t.toFixed(1); why[k] = w; s.helm.override = { ...s.helm.override, range: 'close' }; s.enemy.patience = 0; }
  }
}
console.log(JSON.stringify({ a, b, range: +range, opening, exit, kind: x.ended ? x.ended.kind + ' ' + x.ended.side : 'none', T: +x.t.toFixed(1), commit: [ph.A, ph.T], why: [why.A, why.T], blind: [ruin.A, ruin.T], zones: sides.map(([, s]) => s.model.resolved.size) }));
