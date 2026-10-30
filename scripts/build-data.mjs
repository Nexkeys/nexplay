// Builds the word puzzles from SCOWL word lists (via wordlist-english, MIT).
// Run with `npm run data`. Output is committed so builds do not depend on this step.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const dir = require.resolve('wordlist-english/package.json').replace('package.json', '');
const load = (variant, level) => JSON.parse(readFileSync(`${dir}${variant}-words-${level}.json`, 'utf8'));

// Words we never want to show as a target or a "missed word", however valid.
const BLOCK = new Set(
  'abo arse arses bitch bitches bastard bollock bollocks boner boob boobs bugger cock cocks coon crap cum cunt cunts damn dick dicks dyke fag fags faggot fart farts fuck fucks gook gooks hell homo jap japs kike kikes nazi nigga nigger niggers penis piss poof poofs porn prick pricks pube pussy queer rape raped raper rapes rapist retard scum semen sex sexy shag shit shits slag slut sluts spaz spic spics tit tits titty turd twat twats vagina wank wanker whore whores wog wogs'.split(' ')
);

const clean = (w) => /^[a-z]+$/.test(w) && !BLOCK.has(w);
const set = (variants, levels) => {
  const out = new Set();
  for (const v of variants) for (const l of levels) for (const w of load(v, l)) if (clean(w)) out.add(w);
  return out;
};

const VARIANTS = ['english', 'british', 'american'];
const common = set(VARIANTS, [10, 20, 35]);
const everyday = set(VARIANTS, [10, 20]);
const valid = set(VARIANTS, [10, 20, 35, 40, 50]);

const sortLetters = (w) => [...w].sort().join('');
const anagrams = new Map();
for (const w of valid) {
  const k = sortLetters(w);
  if (!anagrams.has(k)) anagrams.set(k, []);
  anagrams.get(k).push(w);
}

// Unscramble: common words of 5 to 8 letters, with every valid anagram accepted.
const unscramble = [];
for (const w of everyday) {
  if (w.length < 5 || w.length > 8) continue;
  if (w.endsWith('s') && everyday.has(w.slice(0, -1))) continue; // skip plain plurals
  if (/(ed|ing|ly)$/.test(w) && w.length > 6 && Math.random() < 0.6) continue; // fewer -ed, -ing and -ly forms
  const accept = anagrams.get(sortLetters(w)).filter((a) => a !== w);
  unscramble.push(accept.length ? [w, ...accept] : [w]);
}

// Word Hunt: seven letter common words whose letters make a good number of words.
const byLength = [...valid].filter((w) => w.length >= 3 && w.length <= 7);
const counts = (w) => {
  const m = {};
  for (const ch of w) m[ch] = (m[ch] || 0) + 1;
  return m;
};
const fits = (word, pool) => {
  const need = counts(word);
  for (const ch in need) if ((pool[ch] || 0) < need[ch]) return false;
  return true;
};
const seeds = [...common].filter((w) => w.length === 7 && !(w.endsWith('s') && common.has(w.slice(0, -1))));
const hunt = [];
for (const seed of seeds) {
  const pool = counts(seed);
  const words = byLength.filter((w) => fits(w, pool));
  const commonCount = words.filter((w) => common.has(w)).length;
  if (words.length >= 14 && words.length <= 70 && commonCount >= 10) hunt.push({ seed, words: words.sort((a, b) => b.length - a.length || a.localeCompare(b)) });
}

// Keep the files a sensible size: spread the picks across the alphabet.
const sample = (arr, n) => {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)]);
};

mkdirSync('app/engine/data', { recursive: true });
writeFileSync('app/engine/data/unscramble.json', JSON.stringify(sample(unscramble.sort((a, b) => a[0].localeCompare(b[0])), 2500)));
writeFileSync('app/engine/data/word-hunt.json', JSON.stringify(sample(hunt.sort((a, b) => a.seed.localeCompare(b.seed)), 450)));
console.log({ common: common.size, valid: valid.size, unscramble: unscramble.length, hunt: hunt.length });
