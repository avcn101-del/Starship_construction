// tools/lint-docs.mjs — the documents' consistency lint (#246). Read-only; prints
// one line per check and exits 1 on any failure. Run by the nightly regression.
//   node tools/lint-docs.mjs
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { PARAMS, FIXED, ROOMS, TIERS } from '../js/data.js';

const read = (f) => fs.readFileSync(f, 'utf8');
const decisions = read('DECISIONS.md');
const rows = [...decisions.matchAll(/^\| (\d+) \|/gm)].map((m) => Number(m[1]));
const maxRow = Math.max(...rows);
const docs = ['DESIGN.md', 'CLAUDE.md', 'STATUS.md', 'IDEAS.md', 'HISTORY.md', 'LEDGER.md', 'README.md', 'CHANGELOG.md'];
let failed = 0;
const report = (name, problems) => { console.log(`${problems.length ? 'FAIL' : 'ok  '}  ${name}${problems.length ? `: ${problems.length}` : ''}`); for (const p of problems.slice(0, 40)) console.log(`      ${p}`); if (problems.length) failed++; };

// 1. Every decision reference #n exists.
{
  const problems = [];
  for (const f of docs) read(f).split('\n').forEach((l, i) => { for (const m of l.matchAll(/#(\d{1,3})\b/g)) { const n = Number(m[1]); if (n > maxRow) problems.push(`${f}:${i + 1} #${n} (last row is #${maxRow})`); } });
  report('decision references exist', problems);
}
// 2. Every section reference §n / §13x exists in DESIGN.md or HISTORY.md.
{
  const design = read('DESIGN.md'), history = read('HISTORY.md');
  const heads = new Set();
  for (const text of [design, history]) for (const m of text.matchAll(/^#{2,3} (\d+[a-z]?(?:\.\d+)?)[. ]/gm)) heads.add(m[1]);
  for (const m of design.matchAll(/^(\d+[a-z]\.\d+) .* — moved to `HISTORY.md`/gm)) heads.add(m[1]);
  const problems = [];
  for (const f of ['DESIGN.md', 'CLAUDE.md', 'STATUS.md', 'IDEAS.md']) read(f).split('\n').forEach((l, i) => { for (const m of l.matchAll(/§(\d+[a-z]?(?:\.\d+)?)/g)) { const s = m[1]; if (!heads.has(s) && !heads.has(s.replace(/\.\d+$/, ''))) problems.push(`${f}:${i + 1} §${s}`); } });
  report('section references exist', problems);
}
// 3. Every constant named in DESIGN.md's current text exists in data.js (lines that say removed/superseded/replaced/new excepted).
{
  const names = new Set();
  for (const [g, o] of Object.entries(PARAMS)) for (const n of Object.keys(o)) names.add(`${g}.${n}`);
  for (const n of Object.keys(FIXED)) names.add(`FIXED.${n}`);
  const problems = [];
  // A plan's constants exist only once its passes build them: §13n (the L5 plan) is skipped until L5 merges, as §13k was (#246 (2)).
  const designText = read('DESIGN.md'), planStart = designText.indexOf('\n## 13n.'), planEnd = designText.indexOf('\n## 14.');
  const planLines = planStart >= 0 && planEnd > planStart ? [designText.slice(0, planStart).split('\n').length, designText.slice(0, planEnd).split('\n').length] : null;
  designText.split('\n').forEach((l, i) => {
    if (planLines && i + 1 >= planLines[0] && i + 1 <= planLines[1]) return;
    if (/removed|superseded|replaced|\(new|new,|new\)|is new|becomes|replac|planned|§13k|pass 2/i.test(l)) return;
    for (const m of l.matchAll(/`((?:FIXED\.)?[a-z][a-zA-Z]+\.[a-z][a-zA-Z]+)`/g)) { const c = m[1]; if (/^(js|proto|tools|mission0|audit|checker|ctx|world|room|ship|battle|e|c|a|s|r)\./.test(c) || c.endsWith('.js') || c.endsWith('.mjs') || c.endsWith('.md') || c.endsWith('.json')) continue; if (!names.has(c) && !/^(thermal\.(plant|crewed|magazine)|crewRequired|cellMass|thermal\.coupled)/.test(c)) problems.push(`DESIGN.md:${i + 1} \`${c}\``); }
  });
  report('constants named in DESIGN.md exist in data.js', problems);
}
// 4. §18 has a row for every decision.
{
  const design = read('DESIGN.md'), start = design.indexOf('## 18. Decisions in force');
  const have = new Set([...design.slice(start).matchAll(/^\| (\d+)[a-z]? \|/gm)].map((m) => Number(m[1])));
  const problems = []; for (let n = 1; n <= maxRow; n++) if (!have.has(n)) problems.push(`#${n} missing from §18`);
  report('§18 covers every decision', problems);
}
// 5. CONSTANTS.md regenerates identically.
{
  const hash = execFileSync('git', ['log', '-1', '--format=%h', '--', 'js/data.js']).toString().trim();
  const gen = execFileSync('node', ['tools/constants.mjs', hash]).toString();
  report('CONSTANTS.md regenerates identically', gen === read('CONSTANTS.md') ? [] : ['run: node tools/constants.mjs $(git log -1 --format=%h -- js/data.js) > CONSTANTS.md']);
}
// 6. withdrawn.json decisions exist.
{
  const w = JSON.parse(read('mission0/withdrawn.json'));
  const problems = []; for (const e of w) { const n = Number(String(e.decision).replace('#', '')); if (!(n >= 1 && n <= maxRow)) problems.push(`${e.id}: decision ${e.decision}`); }
  report('withdrawn.json decisions exist', problems);
}
// 7. From #246 on, a decision row that supersedes names the row it supersedes (#246 (3)); older rows are listed as info only.
{
  const problems = [], info = [];
  decisions.split('\n').forEach((l, i) => { const m = l.match(/^\| (\d+) \|/); if (m && /supersed/i.test(l) && !/supersed\w*(\s+by)?\s+(#\d|#n|the owner-approval parts of #|its earlier)/i.test(l)) (Number(m[1]) >= 246 ? problems : info).push(`DECISIONS.md:${i + 1} (#${m[1]})`); });
  if (info.length) console.log(`info  ${info.length} rows before #246 use 'supersede' without a row number (history, not checked)`);
  report('superseding rows name what they supersede', problems);
}
// 8. §13m (the coverage table, #269): every element row carries a status that names a level, 'proven', 'after Mission 0' or 'not built'; a row in no plan fails.
{
  const design = read('DESIGN.md'), start = design.indexOf('## 13m.'), end = start < 0 ? -1 : design.indexOf('\n## ', start + 1);
  const problems = [];
  if (start < 0 || end < 0) problems.push('DESIGN.md: section 13m (the coverage table) is missing');
  else design.slice(start, end).split('\n').forEach((l, i) => {
    if (!l.startsWith('| ') || /^\| (Element|Room|Fitting|Rule|Criterion) \|/.test(l) || /^\|---/.test(l)) return;
    const cells = l.split('|').map((c) => c.trim()).filter((c, k, a) => k > 0 && k < a.length - 1);
    const status = cells[cells.length - 1] || '';
    if (!/(proven|planned L[0-6]|after Mission 0|not built|holds for|judged at L[0-6]|L[0-6] proven|T6 planned L6|T1 proven)/.test(status)) problems.push(`DESIGN.md 13m, line ${i + 1} of the section: status "${status.slice(0, 50)}" names no level and no decision`);
    else if (/no level/.test(status)) problems.push(`DESIGN.md 13m, line ${i + 1}: an element in no plan`);
  });
  report('13m: every design element has a level or a decision', problems);
}
// 9. Every element the design's own tables name (DESIGN.md 5-7: rooms, fittings, weapons, round types, information topics) and every room type of js/data.js has a row in 13m (#275: the weapons were in 6 and in no level until PR #63).
{
  const design = read('DESIGN.md'), s5 = design.indexOf('## 5.'), s8 = design.indexOf('## 8.'), m0 = design.indexOf('## 13m.'), m1 = m0 < 0 ? -1 : design.indexOf('\n## ', m0 + 1);
  const problems = [], table = design.slice(m0, m1).toLowerCase();
  const camel = (k) => k.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
  const names = [];
  let header = null;
  for (const l of design.slice(s5, s8).split('\n')) {
    if (!l.startsWith('|')) { header = null; continue; }
    const first = l.split('|')[1].trim();
    if (/^(Room|Fitting|Weapon|Kinetic round|Topic)$/.test(first)) { header = first; continue; }
    if (/^-+$/.test(first) || !header) continue;
    const name = first.replace(/\*\*/g, '').replace(/\s*\(.*$/, '').trim();
    if (name) names.push([header, name]);
  }
  for (const k of Object.keys(ROOMS)) names.push(['data.js room', camel(k)]);
  for (const [kind, name] of names) {
    const key = name.toLowerCase();
    const re = new RegExp(`(^|[^a-z])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`);
    if (!re.test(table)) problems.push(`13m has no row naming "${name}" (${kind})`);
  }
  report('13m names every room, fitting, weapon, round type and information topic of DESIGN.md 5-7 and data.js', problems);
}
console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exit(failed ? 1 : 0);
