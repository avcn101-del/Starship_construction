import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Successor of L4.sweep.determinism.v2 (U4 of the tools pass, DESIGN.md 13n.11 "Q2's answer", #362), which succeeded
// L4.sweep.determinism (J13 of L5e1, 13n.8, #277): on the merged code of PR #104 (the locked builds) and the tools pass
// (#336's escape rule) both sides of v2's grid chose range disengage and A escaped at 1500 m before 600 m, so its
// ordering clause failed and the mutation l5e1.sweep.byArrival (results stored in the order the workers return them)
// could no longer be killed by it. v3 keeps v2's setup, criterion and hand-working with the slot openFire in place of
// range. The property L5e2 relies on is that --jobs does not change the table: every battle of the sweep is its own
// seeded run, stored by its cell's index.
//
// Setup: node tools/sweep.mjs on a grid whose cells end far apart in time, the longer first: 2 builds (R2, Lance), 1
// slot (openFire), 2 ranges (1500 m, then 600 m), 1 seed (1), the bow opening, 1 round; with --jobs 1 twice and --jobs
// 4 once (one worker per cell of the last call, so a shorter later battle returns before a longer earlier one); the
// line "table hash <8 hex>" it prints last, and the pair's ends, read with --json.
// Hand-worked: nothing to compute; the three hashes are equal; the table has one pair and two ends, in the grid's
// order (1500 m, then 600 m), the first ending later than the second (the condition under which an arrival order
// differs from the cells' order; information, not a property of the sweep).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const GRID = ['--builds', 'R2,Lance', '--slots', 'openFire', '--ranges', '1500,600', '--seeds', '1', '--openings', 'bow', '--rounds', '1'];
const sweep = (jobs, json = false) => execFileSync('node', [path.join(ROOT, 'tools', 'sweep.mjs'), ...GRID, '--jobs', String(jobs), ...(json ? ['--json'] : [])], { encoding: 'utf8', maxBuffer: 1 << 28 }).trim().split('\n');
const hashOf = (out) => { const m = out[out.length - 1].match(/^table hash ([0-9a-f]{8})$/); return m ? m[1] : null; };

export default {
  id: 'L4.sweep.determinism.v3',
  level: 'L4',
  laws: ['the search harness is deterministic: the same grid gives the same table whatever the run and the number of workers (13n.1 (e), 13n.8)'],
  dependsOn: ['L4.builds.valid', 'L4.end.simultaneous'],
  setup: 'node tools/sweep.mjs --builds R2,Lance --slots openFire --ranges 1500,600 --seeds 1 --openings bow --rounds 1, with --jobs 1 twice and --jobs 4 once (13n.11 U4, #362: v2 with openFire in place of range)',
  measure: 'the table hash each run prints; the pair\'s ends (range and time) from a --jobs 4 --json run',
  tolerance: 'exact (hashes)',
  criterion: 'the three table hashes are equal; the --json table (jobs 4) has its hash too, one pair and two ends in the grid\'s order (1500 m, 600 m), the first ending later than the second',
  tunable: [],
  locked: null,
  cases() {
    return [{ name: 'two ranges, the longer battle first' }];
  },
  expected() {
    return { pairs: 1, ranges: [1500, 600] };
  },
  run() {
    const a = hashOf(sweep(1)), b = hashOf(sweep(1)), c = sweep(4, true), t = JSON.parse(c.slice(0, -1).join('\n'));
    const ends = t.pairs.length ? t.pairs[0].ends.map((x) => ({ range: x.range, kind: x.kind, side: x.side, t: x.t })) : [];
    return { hashes: [a, b, hashOf(c), t.hash], pairs: t.pairs.length, ends };
  },
  compare(e, a) {
    const t = (x) => (x.t === null ? Infinity : x.t);
    const pass = a.hashes.every((h) => h !== null && h === a.hashes[0]) && a.pairs === e.pairs && a.ends.length === 2 && a.ends.every((x, k) => x.range === e.ranges[k]) && t(a.ends[0]) > t(a.ends[1]);
    return { pass, note: pass ? '' : `hashes ${a.hashes.join(' / ')}, pairs ${a.pairs}, ends ${JSON.stringify(a.ends)}` };
  },
  display(r) {
    const a = r.actual;
    return { expected: 'one hash four times (jobs 1, 1, 4, its JSON); one pair; ends at 1500 m then 600 m, the first later', actual: `table hashes ${a.hashes.join(', ')}; pairs ${a.pairs}; ends ${a.ends.map((x) => `${x.range} m ${x.kind}${x.side ? ' ' + x.side : ''} ${x.t === null ? '-' : x.t.toFixed(2) + ' s'}`).join(', ')}` };
  },
};
