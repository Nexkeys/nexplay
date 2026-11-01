// Builds the word puzzles from SCOWL word lists (via wordlist-english, MIT).
// Run with `npm run data`, which also builds the trivia packs. Output is committed so builds do not depend on this step.
import { readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const dir = require.resolve('wordlist-english/package.json').replace('package.json', '');
const load = (variant, level) => JSON.parse(readFileSync(`${dir}${variant}-words-${level}.json`, 'utf8'));

// Words we never want to show as a target or a "missed word", however valid.
const BLOCK = new Set(
  'abo arse arses bitch bitches bastard bollock bollocks boner boob boobs bugger cock cocks coon crap cum cunt cunts damn dick dicks dyke fag fags faggot fart farts fuck fucks gook gooks hell homo jap japs kike kikes nazi nigga nigger niggers penis piss poof poofs porn prick pricks pube pussy queer rape raped raper rapes rapist retard scum semen sex sexy shag shit shits slag slut sluts spaz spic spics tit tits titty turd twat twats vagina wank wanker whore whores wog wogs'.split(' ')
);

// More words that are fine in a dictionary but not as a puzzle in a family game.
for (const w of 'harlot harlots panties panty pantie lewd lewder horny sexual sexes sexed sexier sexist erotic nipple nipples orgasm orgasms orgies orgy condom condoms brothel brothels pimp pimps pimped hooker hookers stripper strippers nude nudes nudist nudity kinky pervert perverts perverse grope groped gropes sodomy incest molest molests negro negroes darkie darkies honky gypsy gypsies chink chinks retarded spastic heroin cocaine bimbo bimbos tramp tramps hussy wench wenches crotch crotches bosom bosoms busty buxom booze boozer boozy vomit vomits urine urinal enema'.split(' ')) BLOCK.add(w);
// Roots that are never fine, however they end ("queerer", "shitty", "wanking").
const ROOTS = ['queer', 'wank', 'fuck', 'shit', 'cunt', 'slut', 'whore', 'twat', 'porn', 'nigg', 'fagg', 'dyke', 'bitch', 'bastard', 'bollock', 'penis', 'vagin', 'semen', 'boob', 'rapist', 'pussy', 'prick', 'pube'];
const clean = (w) => /^[a-z]+$/.test(w) && !BLOCK.has(w) && !ROOTS.some((r) => w.startsWith(r));
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

// Unscramble: everyday words of 5 to 8 letters, plus less everyday ones of 5 to 7, with every valid anagram accepted.
const unscramble = [];
for (const w of new Set([...everyday, ...[...common].filter((x) => x.length <= 7)])) {
  if (w.length < 5 || w.length > 8) continue;
  if (w.endsWith('s') && everyday.has(w.slice(0, -1))) continue; // skip plain plurals
  if (/(ed|ing|ly)$/.test(w) && w.length > 6 && [...w].reduce((n, c) => n + c.charCodeAt(0), 0) % 10 < 6) continue; // fewer -ed, -ing and -ly forms
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

// Shards, so a game downloads only a few. Shuffled with a fixed seed so each shard mixes the alphabet.
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const shuffle = (xs) => xs.map((x) => [rand(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const OUT = 'app/engine/data/words';
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const write = (name, rows, size) => {
  const n = Math.ceil(rows.length / size);
  for (let i = 0; i < n; i++) writeFileSync(`${OUT}/${name}-${i}.json`, JSON.stringify(rows.slice(Math.floor((i * rows.length) / n), Math.floor(((i + 1) * rows.length) / n))));
  return n;
};
// Unscramble rows: [word, ...other accepted anagrams]. Word Hunt rows: [seed, ...every word, longest first].
const uFiles = write('unscramble', shuffle(unscramble.sort((a, b) => a[0].localeCompare(b[0]))), 1000);
const hFiles = write('hunt', shuffle(hunt.sort((a, b) => a.seed.localeCompare(b.seed))).map((h) => [h.seed, ...h.words]), 150);
console.log({ uFiles, hFiles });
console.log({ common: common.size, valid: valid.size, unscramble: unscramble.length, hunt: hunt.length });
