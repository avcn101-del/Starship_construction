import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// J13 of L5e1 (DESIGN.md 13n.8 "tools/sweep.mjs", 13n.1 (e) "Search harness", #277): the search harness is a
// deterministic best-response search (no LLM, no Math.random, worker_threads for the cores): every battle of the sweep
// is its own seeded run, so the table it reports, and its hash, do not depend on the run or on how many workers share
// the battles. L5e1 builds it and proves it deterministic; the full run is the pace study's and L5e2's.
//
// Setup: node tools/sweep.mjs on a small grid: 2 builds (R2, Lance), 2 slots (range, facing), 1 range (900 m), 1 seed
// (1), both openings, 1 round (each side one best response); with --jobs 1 twice and --jobs 4 once; the line "table
// hash <8 hex>" it prints last.
// Hand-worked: nothing to compute; the three hashes are equal (and the table is well formed: one pair).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const GRID = ['--builds', 'R2,Lance', '--slots', 'range,facing', '--ranges', '900', '--seeds', '1', '--openings', 'bow,broadside', '--rounds', '1'];
const sweep = (jobs) => {
  const out = execFileSync('node', [path.join(ROOT, 'tools', 'sweep.mjs'), ...GRID, '--jobs', String(jobs)], { encoding: 'utf8', maxBuffer: 1 << 28 }).trim().split('\n');
  const last = out[out.length - 1].match(/^table hash ([0-9a-f]{8})$/), pairs = out.filter((l) => / of \d+; sets A /.test(l)).length;
  return { hash: last ? last[1] : null, pairs };
};

export default {
  id: 'L4.sweep.determinism',
  level: 'L4',
  laws: ['the search harness is deterministic: the same grid gives the same table whatever the run and the number of workers (13n.1 (e), 13n.8)'],
  dependsOn: ['L4.builds.valid', 'L4.end.simultaneous'],
  setup: 'node tools/sweep.mjs --builds R2,Lance --slots range,facing --ranges 900 --seeds 1 --openings bow,broadside --rounds 1, with --jobs 1 twice and --jobs 4 once (13n.8 J13)',
  measure: 'the table hash each run prints; the number of pairs in the table',
  tolerance: 'exact (hashes)',
  criterion: 'the three table hashes are equal; the table has one pair',
  tunable: [],
  locked: { date: '2026-10-24', hash: '790917e5' },
  cases() {
    return [{ name: 'small grid' }];
  },
  expected() {
    return { pairs: 1 };
  },
  run() {
    const a = sweep(1), b = sweep(1), c = sweep(4);
    return { hashes: [a.hash, b.hash, c.hash], pairs: [a.pairs, b.pairs, c.pairs] };
  },
  compare(e, a) {
    const pass = a.hashes.every((h) => h !== null && h === a.hashes[0]) && a.pairs.every((p) => p === e.pairs);
    return { pass, note: pass ? '' : `hashes ${a.hashes.join(' / ')}, pairs ${a.pairs.join(' / ')}` };
  },
  display(r) {
    return { expected: 'one hash three times; one pair', actual: `table hashes ${r.actual.hashes.join(', ')} (jobs 1, 1, 4); pairs ${r.actual.pairs.join(', ')}` };
  },
};
