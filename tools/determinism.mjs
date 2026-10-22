#!/usr/bin/env node
// tools/determinism.mjs — the event hash of a fixed 60 s R1 duel with turning
// (proto/duel.js) in Node (DESIGN.md 13k.1, #239 Q6, scenario L0.determinism).
// proto/smoke.mjs computes the same in Chromium; the two must MATCH. Prints
// one line: the hash, then the steps, the events and the final headings.
//
//   node tools/determinism.mjs
import { duelHash } from '../proto/duel.js';

const r = duelHash();
console.log(`${r.hash}  steps ${r.steps}, events ${r.events}, end ${r.end === null ? 'none' : r.end.toFixed(4) + ' s'}, final headings ${r.headings.map((x) => (x === undefined ? "-" : x.toFixed(6))).join(' / ')} rad`);
