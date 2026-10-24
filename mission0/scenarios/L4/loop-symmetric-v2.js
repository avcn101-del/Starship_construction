import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { hash, stableStringify } from '../../../js/util.js';
import { createBattle } from '../../../js/battle.js';
import { TARGETS, ATTACKER } from '../../targets.js';

// L5e1 (DESIGN.md 13n.8, §17 item 51, #311 (3)): the successor of L4.loop.symmetric, its cases, set and checks kept,
// with the records it replays declared: its dependsOn is the list of the scenarios it replays (computed when the file
// loads, from the same rule), so tools/m0.js runs them first and their records stand before it reads them; the
// original's dependsOn [] proved only that the loop equals the latest records, and failed until they were re-recorded.
// H1 of the L5 plan (DESIGN.md 13n.4, 13n.1 (d), #301 (1)): the symmetric loop leaves every standing battle case of
// L4b-L5c as it was. Each standing scenario (recorded PASS, not in mission0/withdrawn.json) whose file calls the
// battle's createBattle is replayed on today's loop with the knowledge setting it was locked with, its `plan` a test
// input (read from the truth with knowledge off, from the shooter's model with it on, advancing by the model): every
// case's run() is executed as tools/m0.js executes it (a throw recorded as { error }) and the hash of the actuals,
// stableStringify(rows.map(actual)), is compared with the rowsHash its record holds. The L5d scenarios (the ones that
// give a side orders or an enemy) are not replayed: they have no record from before the pass. A last case builds the
// L4 battle (R1d on R1 from -y) and reads its sides: the target static (no helm, no enemy, no orders), the attacker on
// its plan.
// Hand-worked: nothing to compute; the expected rows hash of each scenario is its record's (the probe of #301: P3 and
// P4, 140 of 140 rows unchanged).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const L5D = new Set(['L4.loop.symmetric', 'L4.loop.symmetric.v2', 'L4.helm.range', 'L4.helm.conflict', 'L4.helm.dodge', 'L4.orders.fire', 'L4.orders.energy', 'L4.enemy.decide', 'L4.route.surrender', 'L4.route.emp', 'L4.route.escape', 'L4.loop.rules', 'L1.missilebay.power', 'L2.sensor.memory.v2', 'L2.sensor.shield.v2', 'L3.sensor.control.v2', 'L2.sensor.brownout', 'L4.target.plates', 'L4.play.replay']);
const record = (id) => { const f = path.join(ROOT, 'mission0', 'results', `${id}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
function standingBattleFiles() {
  const withdrawn = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'mission0', 'withdrawn.json'), 'utf8')).map((w) => w.id));
  const out = [];
  for (const level of ['L0', 'L1', 'L2', 'L3', 'L4', 'L5']) {
    const dir = path.join(ROOT, 'mission0', 'scenarios', level);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js')).sort()) {
      const text = fs.readFileSync(path.join(dir, f), 'utf8'), id = (text.match(/\bid: '([^']+)'/) || [])[1];
      if (!id || L5D.has(id) || withdrawn.has(id) || !/\bcreateBattle\(/.test(text)) continue;
      const rec = record(id);
      if (rec && rec.verdict === 'PASS') out.push({ id, file: path.join(level, f) });
    }
  }
  return out;
}
// Each standing battle scenario's module, imported once (run() is synchronous).
const MODULES = new Map();
for (const x of standingBattleFiles()) MODULES.set(x.id, (await import(pathToFileURL(path.join(ROOT, 'mission0', 'scenarios', x.file)).href)).default);

export default {
  id: 'L4.loop.symmetric.v2',
  level: 'L4',
  laws: ['the symmetric loop (both sides with the same step) leaves every standing battle case as recorded: a static side has no helm, a case\'s plan is a test input (13n.1 (d), #301 (1))'],
  dependsOn: [...MODULES.keys()], // the scenarios it replays (§17 item 51)
  setup: 'every standing scenario (recorded PASS, not withdrawn) whose file calls createBattle, each case run as tools/m0.js runs it on today\'s kernel; and the L4 battle R1d on R1 from -y; the scenarios it replays declared as its dependencies (13n.4 H1; 13n.8, §17 item 51)',
  measure: 'per scenario: the hash of its cases\' actuals (stableStringify) against its record\'s rowsHash; the L4 battle\'s sides',
  tolerance: 'exact (hashes)',
  criterion: 'every standing battle scenario\'s rows hash equals its record\'s (none moves); at least 20 are replayed (26 at the lock); the L4 battle\'s target has no helm, no enemy and no orders, its attacker no helm',
  tunable: [],
  locked: { date: '2026-10-24', hash: 'e5fb013a' },
  cases() {
    return [...[...MODULES.keys()].map((id) => ({ scenario: id })), { scenario: 'static' }];
  },
  expected(ctx, c) {
    if (c.scenario === 'static') return { static: true, replayed: 20 };
    return { rowsHash: record(c.scenario).rowsHash };
  },
  run(ctx, c) {
    if (c.scenario === 'static') {
      const b = createBattle({ params: ctx.params, tier: 'T1', attacker: ATTACKER, target: TARGETS.R1, bearing: '-y', plan: { turret: ['bridge'] } });
      return { targetHelm: b.target.helm, targetEnemy: b.target.enemy, attackerHelm: b.attacker.helm, replayed: standingBattleFiles().length };
    }
    const s = MODULES.get(c.scenario);
    const actuals = s.cases(ctx).map((x) => { try { return s.run(ctx, x); } catch (err) { return { error: String(err && err.message ? err.message : err) }; } });
    return { rowsHash: hash(stableStringify(actuals)), cases: actuals.length };
  },
  compare(e, a, c) {
    if (c.scenario === 'static') {
      const pass = a.targetHelm === null && a.targetEnemy === null && a.attackerHelm === null && a.replayed >= e.replayed;
      return { pass, note: pass ? '' : 'a side has a helm, or fewer than 20 replayed' };
    }
    const pass = a.rowsHash === e.rowsHash;
    return { pass, note: pass ? '' : `rows hash ${a.rowsHash} against the record's ${e.rowsHash}` };
  },
};
