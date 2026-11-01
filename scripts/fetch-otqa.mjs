// Downloads multiple choice questions from OpenTriviaQA (CC BY-SA 4.0, https://github.com/uberspot/OpenTriviaQA)
// and keeps only the ones that work well in a timed game. Output is committed to scripts/sources.
// Run: node scripts/fetch-otqa.mjs            (downloads, takes a few minutes)
//      node scripts/fetch-otqa.mjs <folder>   (reads category files already downloaded there)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

// Category file -> pack. Television, celebrities and similar gossip heavy categories are left out.
const CATEGORIES = {
  animals: 'animals',
  'for-kids': 'general',
  general: 'general',
  geography: 'geography',
  history: 'history',
  literature: 'general',
  movies: 'film',
  music: 'music',
  'science-technology': 'science',
  sports: 'sport',
  world: 'general'
};

const from = process.argv[2];
const read = (name) =>
  from
    ? readFileSync(`${from}/${name}.txt`, 'utf8')
    : execFileSync('curl', ['-s', '-L', '-m', '300', `https://raw.githubusercontent.com/uberspot/OpenTriviaQA/master/categories/${name}`]).toString();

function parse(text) {
  const out = [];
  for (const block of text.replace(/\r/g, '').split(/\n(?=#Q )/)) {
    const m = block.match(/^#Q ([\s\S]*?)\n\^ (.*)\n([\s\S]*)$/);
    if (!m) continue;
    out.push({ q: m[1].replace(/\s+/g, ' ').trim(), a: m[2].trim(), options: [...m[3].matchAll(/^[A-Z] (.*)$/gm)].map((x) => x[1].trim()) });
  }
  return out;
}

// Lyrics and quotes (not ours to reprint), negatives that trip people up, and anything pointing at a picture.
const BAD_QUESTION =
  /lyric|verse|chorus|missing word|line (of|from) (the|this) song|complete (this|the)|finish (this|the)|fill in|blank|_{2,}|["“”‘’]|\bnot\b|\bexcept\b|picture|image|pictured|photo|shown|above|below|the following|these people|in common/i;
// Facts that go out of date.
const DATED =
  /\b(current|currently|latest|recent|recently|nowadays|today|this year|as of|so far|to date|still|newest|presently|at present|now|upcoming|will be|reigning|incumbent|record holder|holds the record|highest-grossing|best-selling|world record|of all time|ever made|largest|biggest)\b/i;
const BAD_OPTION = /not listed|none of|all of (these|the)|both|above|neither|^all$|^none$/i;

// The source lost its apostrophes. Put back the unambiguous ones.
const FIX = {
  cant: "can't", dont: "don't", doesnt: "doesn't", didnt: "didn't", isnt: "isn't", wasnt: "wasn't", arent: "aren't",
  werent: "weren't", couldnt: "couldn't", wouldnt: "wouldn't", shouldnt: "shouldn't", havent: "haven't", hasnt: "hasn't",
  whats: "what's", thats: "that's", theyre: "they're", youre: "you're", shes: "she's", hes: "he's"
};
const fix = (t) =>
  t.replace(/\b[A-Za-z]+\b/g, (w) => {
    const f = FIX[w.toLowerCase()];
    return f ? (w[0] === w[0].toUpperCase() ? f[0].toUpperCase() + f.slice(1) : f) : w;
  });

const out = [];
const seen = new Set();
for (const [file, pack] of Object.entries(CATEGORIES)) {
  let kept = 0;
  const items = parse(read(file));
  for (const item of items) {
    const q = fix(item.q);
    const a = fix(item.a);
    const options = item.options.map(fix);
    if (options.length !== 4 || !options.includes(a) || new Set(options.map((o) => o.toLowerCase())).size !== 4) continue;
    if (q.length < 15 || q.length > 140 || options.some((o) => !o || o.length > 48)) continue;
    if (BAD_QUESTION.test(q) || DATED.test(q) || options.some((o) => BAD_OPTION.test(o))) continue;
    // Broken encoding in the source shows up as odd characters, and a lost "&" as a double space.
    if (/[�\u0080-\u009F]|Ã|â€| {2}/.test(q + options.join(''))) continue;
    const key = q.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    // Old pop culture and sport stats are hard for most players.
    out.push({ pack, difficulty: file === 'for-kids' ? 'easy' : /movies|music|sports/.test(file) ? 'hard' : 'medium', q, a, wrong: options.filter((o) => o !== a), source: 'otqa' });
    kept++;
  }
  console.log(file, items.length, 'kept', kept);
}
writeFileSync(
  'scripts/sources/otqa.json',
  JSON.stringify({ attribution: 'Questions from OpenTriviaQA (github.com/uberspot/OpenTriviaQA), licensed CC BY-SA 4.0.', questions: out })
);
console.log('total', out.length);
