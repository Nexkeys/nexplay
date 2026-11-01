// Builds the In Sync prompt shards in app/engine/data/in-sync from scripts/sources/in-sync-*.mjs.
// Run: node scripts/build-in-sync.mjs
//
// Each vibe (cute, deep, flirty) is split into shards of about SHARD prompts, with every round type
// spread evenly across them, so a game downloads one or two small files per vibe.
// Each row is [id, kind, text, ...options]:
//   t  This or That       text = optional lead ("" when none), options = [a, b]
//   m  Read My Mind       text = prompt, options = 3 or 4 answers
//   f  Finish the sentence text = sentence start, options = 3 or 4 endings
//   s  Scale              text = question, options = [what 1 means, what 5 means]
//   l  Who's more likely  text = the rest of "Who is more likely to…"
// Ids come from the prompt itself, so "already seen" lists survive rebuilds.
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { CUTE } from './sources/in-sync-cute.mjs';
import { DEEP } from './sources/in-sync-deep.mjs';
import { FLIRTY } from './sources/in-sync-flirty.mjs';
import { MORE } from './sources/in-sync-more.mjs';

const OUT = 'app/engine/data/in-sync';
const SHARD = 130;
/** At most this many This or That pairs from one category list, so no category dominates. */
const PAIR_CAP = 9;

function rng(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(1402);
const shuffle = (xs) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const idOf = (kind, text) => {
  let h = 0x811c9dc5;
  for (const ch of `${kind}:${norm(text)}`) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
  return kind + (h >>> 0).toString(36);
};
const lines = (block) =>
  (block ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
const parts = (line) => line.split('|').map((p) => p.trim());

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function build(vibe, src) {
  const rows = [];
  const keys = new Set();
  const add = (kind, text, options, dedupeKey) => {
    const key = `${kind}:${dedupeKey}`;
    if (keys.has(key)) return false;
    keys.add(key);
    rows.push([idOf(kind, `${text}|${options.join('|')}`), kind, text, ...options]);
    return true;
  };
  // This or That, hand written.
  for (const line of lines(src.tot)) {
    const [lead, rest] = line.includes('::') ? line.split('::').map((s) => s.trim()) : ['', line];
    const p = parts(rest);
    if (p.length !== 2 || !p[0] || !p[1]) fail(`${vibe} tot: bad line "${line}"`);
    add('t', lead, p, [norm(p[0]), norm(p[1])].sort().join('/'));
  }
  // This or That, from category lists: a capped, spread out sample of the pairs.
  for (const line of lines(src.pairs)) {
    const [lead, rest] = line.split('::').map((s) => s.trim());
    const items = parts(rest);
    const all = [];
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) all.push([items[i], items[j]]);
    let n = 0;
    for (const p of shuffle(all)) {
      if (n >= PAIR_CAP) break;
      if (add('t', lead, p, [norm(p[0]), norm(p[1])].sort().join('/'))) n++;
    }
  }
  for (const line of lines(src.mind)) {
    const [q, ...opts] = parts(line);
    if (opts.length < 3 || opts.length > 4 || opts.some((o) => !o)) fail(`${vibe} mind: bad line "${line}"`);
    add('m', q, opts, norm(q));
  }
  for (const line of lines(src.finish)) {
    const [q, ...opts] = parts(line);
    if (opts.length < 3 || opts.length > 4 || opts.some((o) => !o)) fail(`${vibe} finish: bad line "${line}"`);
    add('f', q, opts, norm(q));
  }
  for (const line of lines(src.scale)) {
    const p = parts(line);
    if (p.length !== 3 || p.some((o) => !o)) fail(`${vibe} scale: bad line "${line}"`);
    add('s', p[0], [p[1], p[2]], norm(p[0]));
  }
  for (const line of lines(src.likely)) add('l', line, [], norm(line));
  return rows;
}

/** Joins the first and second batch of each round type. */
const merge = (a, b = {}) => Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map((k) => [k, `${a[k] ?? ''}\n${b[k] ?? ''}`]));
const VIBES = { cute: merge(CUTE, MORE.cute), deep: merge(DEEP, MORE.deep), flirty: merge(FLIRTY, MORE.flirty) };
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const ids = new Map();
let total = 0;
for (const [vibe, src] of Object.entries(VIBES)) {
  const rows = build(vibe, src);
  for (const r of rows) {
    if (ids.has(r[0])) fail(`id clash: ${r[0]} in ${vibe} and ${ids.get(r[0])}`);
    ids.set(r[0], vibe);
  }
  const count = Math.max(1, Math.round(rows.length / SHARD));
  const shards = Array.from({ length: count }, () => []);
  // Deal each round type round robin, so every shard has a bit of everything.
  let k = 0;
  for (const kind of ['t', 'm', 'f', 's', 'l']) for (const r of shuffle(rows.filter((x) => x[1] === kind))) shards[k++ % count].push(r);
  shards.forEach((rows2, i) => writeFileSync(`${OUT}/${vibe}-${i}.json`, JSON.stringify(rows2)));
  const by = Object.fromEntries(['t', 'm', 'f', 's', 'l'].map((kd) => [kd, rows.filter((r) => r[1] === kd).length]));
  console.log(`${vibe}: ${rows.length} prompts in ${count} shards`, by);
  total += rows.length;
}
console.log(`total: ${total} prompts, ${readdirSync(OUT).length} files`);
