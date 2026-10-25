// tools/estimates/swarm-pd.mjs — #342 (2): one battle's missiles launched, killed by point defence, warheads acted and the rest (in
// flight at the end), per launching side; E7's cell, the standard enemy, seed 1, battle.cullDistance 5000 m, to 600 s. The
// design partner's script (2026-10-25). Estimates only. Run from the repository root:
//   node tools/estimates/swarm-pd.mjs <A> <T> <range m> <bow|broadside>   (#342: R2 v Swarm and the Swarm mirror, 900/1500/2500, both: 104 / 79 / 19 / 6)
const R = (p) => import(new URL(p, `file://${process.cwd()}/`));
const [{ withOverrides }, { createBattle, runBattle }, { BUILDS }] = await Promise.all(['js/data.js', 'js/battle.js', 'mission0/builds.js'].map(R));
const [a, b, range, opening] = process.argv.slice(2), bs = opening === 'broadside', P = { aggression: 0.5, patience: 0.5, caution: 0.5, resolve: 0.5 };
const x = createBattle({ params: withOverrides({ 'battle.cullDistance': 5000 }), attacker: BUILDS[a], target: BUILDS[b], distance: +range, seed: 1, knowledge: true, bearing: bs ? '+y' : '+x', ...(bs ? { attackerHeading: 0 } : {}), enemy: { A: P, T: P } });
runBattle(x, 600);
const ev = (s, t) => { const L = s.world.log; return (L.events ?? L).filter((e) => e.type === t).length; };
const out = [['A', x.attacker, x.target], ['T', x.target, x.attacker]].map(([k, s, o]) => { const n = ev(s, 'missile-launched'); return n ? `${k} launched ${n} killed ${ev(o, 'missile-killed')} warheads ${ev(o, 'warhead')} rest ${n - ev(o, 'missile-killed') - ev(o, 'warhead')}` : null; }).filter(Boolean);
console.log(a, b, range, opening, x.ended ? `${x.ended.kind} ${x.ended.t.toFixed(0)} s` : 'none', '|', out.join(' | '));
