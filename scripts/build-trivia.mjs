// Builds the trivia packs in app/engine/data/trivia from scripts/sources:
//   nexplay.mjs, nexplay-2.mjs  hand written questions
//   otdb.json                   Open Trivia Database (CC BY-SA 4.0), from fetch-trivia.mjs
//   otqa.json                   OpenTriviaQA (CC BY-SA 4.0), from fetch-otqa.mjs
//   facts.json                  country and element facts, from fetch-facts.mjs, turned into questions here
// Each pack is split into shards of SHARD questions so a game only downloads a few of them.
// Every question gets an id from its text, so "already seen" lists survive rebuilds.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { NEXPLAY_QUESTIONS } from './sources/nexplay.mjs';
import { NEXPLAY_QUESTIONS_2 } from './sources/nexplay-2.mjs';

const SHARD = 250;
const OUT = 'app/engine/data/trivia';
const SOURCES = { nexplay: 0, otdb: 1, otqa: 2, facts: 3 };
const DIFFICULTY = { easy: 0, medium: 1, hard: 2 };

const json = (f) => JSON.parse(readFileSync(`scripts/sources/${f}`, 'utf8'));

// Same seed every run, so a rebuild with the same sources gives the same questions.
function rng(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(24);
const shuffle = (xs) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick3 = (pool, not) => shuffle([...new Set(pool)].filter((x) => x && !not.includes(x))).slice(0, 3);

/** FNV-1a of the normalised question, in base 36. */
const idOf = (text) => {
  let h = 0x811c9dc5;
  for (const ch of text.toLowerCase().replace(/[^a-z0-9]/g, '')) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
  return (h >>> 0).toString(36);
};

// ---------- questions made from facts ----------
function fromFacts() {
  const facts = json('facts.json');
  const out = [];
  const add = (pack, difficulty, q, a, wrong) => wrong.length === 3 && out.push({ pack, difficulty, q, a, wrong, source: 'facts' });
  const countries = facts.countries;
  const WELL_KNOWN = new Set(
    'Nigeria Ghana Kenya Egypt South Africa United States United Kingdom France Germany Italy Spain China Japan India Brazil Canada Australia Russia Mexico Argentina Saudi Arabia Turkey Portugal Netherlands Morocco Cameroon Senegal Ethiopia Jamaica Ireland'.split(
      ' '
    )
  );
  const famous = (c) => WELL_KNOWN.has(c.name) || ['South Africa', 'United States', 'United Kingdom', 'Saudi Arabia'].includes(c.name);
  const level = (c) => (famous(c) ? 'easy' : c.area > 400000 ? 'medium' : 'hard');
  const near = (c) => {
    const same = countries.filter((o) => o !== c && o.subregion === c.subregion);
    return same.length >= 3 ? [...same, ...countries.filter((o) => o !== c && o.region === c.region)] : countries.filter((o) => o !== c && o.region === c.region);
  };
  for (const c of countries) if (c.currency) c.currency = c.currency[0].toUpperCase() + c.currency.slice(1);
  const currencyCount = new Map();
  for (const c of countries) if (c.currency) currencyCount.set(c.currency, (currencyCount.get(c.currency) ?? 0) + 1);
  const count = (key) => {
    const m = new Map();
    for (const c of countries) if (c[key]) m.set(c[key], (m.get(c[key]) ?? 0) + 1);
    return m;
  };
  const callingCount = count('calling');
  const tldCount = count('tld');

  for (const c of countries) {
    const others = near(c);
    if (c.capital && c.capital !== c.name) {
      add('geography', level(c), `What is the capital of ${c.name}?`, c.capital, pick3(others.map((o) => o.capital), [c.capital]));
      add('geography', level(c) === 'easy' ? 'medium' : 'hard', `${c.capital} is the capital of which country?`, c.name, pick3(others.map((o) => o.name), [c.name]));
    }
    if (c.currency && currencyCount.get(c.currency) === 1) {
      const pool = others.map((o) => o.currency).filter((x) => x && currencyCount.get(x) === 1);
      add('geography', famous(c) ? 'medium' : 'hard', `What is the currency of ${c.name}?`, c.currency, pick3(pool, [c.currency]));
    }
    if (c.borders.length) {
      const a = c.borders[Math.floor(rand() * c.borders.length)];
      const pool = others.map((o) => o.name).filter((n) => !c.borders.includes(n));
      add('geography', famous(c) ? 'medium' : 'hard', `Which of these countries shares a border with ${c.name}?`, a, pick3(pool, [a, c.name]));
    }
    if (c.calling && callingCount.get(c.calling) === 1) {
      add('geography', 'hard', `${c.calling} is the international calling code for which country?`, c.name, pick3(others.map((o) => o.name), [c.name]));
    }
    if (c.tld && tldCount.get(c.tld) === 1) {
      add('geography', famous(c) ? 'medium' : 'hard', `Which country uses the internet domain ${c.tld}?`, c.name, pick3(others.map((o) => o.name), [c.name]));
    }
    if (c.landlocked) {
      const pool = others.filter((o) => !o.landlocked).map((o) => o.name);
      add('geography', 'medium', `Which of these countries has no coastline?`, c.name, pick3(pool, [c.name]));
    }
  }

  const elements = facts.elements.filter((e) => e.number <= 118);
  const elLevel = (e) => (e.number <= 20 ? 'easy' : e.number <= 56 ? 'medium' : 'hard');
  for (const e of elements) {
    const near = elements.filter((o) => o !== e && Math.abs(o.number - e.number) <= 12);
    // Symbols that start with the same letter make better wrong answers.
    const symbolPool = [...elements.filter((o) => o !== e && o.symbol[0] === e.symbol[0]), ...near].map((o) => o.symbol);
    add('science', elLevel(e), `What is the chemical symbol for ${e.name}?`, e.symbol, pick3(symbolPool, [e.symbol]));
    add('science', elLevel(e), `Which element has the chemical symbol ${e.symbol}?`, e.name, pick3(near.map((o) => o.name), [e.name]));
    add('science', e.number <= 10 ? 'medium' : 'hard', `Which element has the atomic number ${e.number}?`, e.name, pick3(near.map((o) => o.name), [e.name]));
  }

  // Nigerian states: capital and geopolitical zone.
  const STATES = [
    ['Abia', 'Umuahia', 'South East'], ['Adamawa', 'Yola', 'North East'], ['Akwa Ibom', 'Uyo', 'South South'], ['Anambra', 'Awka', 'South East'],
    ['Bauchi', 'Bauchi', 'North East'], ['Bayelsa', 'Yenagoa', 'South South'], ['Benue', 'Makurdi', 'North Central'], ['Borno', 'Maiduguri', 'North East'],
    ['Cross River', 'Calabar', 'South South'], ['Delta', 'Asaba', 'South South'], ['Ebonyi', 'Abakaliki', 'South East'], ['Edo', 'Benin City', 'South South'],
    ['Ekiti', 'Ado-Ekiti', 'South West'], ['Enugu', 'Enugu', 'South East'], ['Gombe', 'Gombe', 'North East'], ['Imo', 'Owerri', 'South East'],
    ['Jigawa', 'Dutse', 'North West'], ['Kaduna', 'Kaduna', 'North West'], ['Kano', 'Kano', 'North West'], ['Katsina', 'Katsina', 'North West'],
    ['Kebbi', 'Birnin Kebbi', 'North West'], ['Kogi', 'Lokoja', 'North Central'], ['Kwara', 'Ilorin', 'North Central'], ['Lagos', 'Ikeja', 'South West'],
    ['Nasarawa', 'Lafia', 'North Central'], ['Niger', 'Minna', 'North Central'], ['Ogun', 'Abeokuta', 'South West'], ['Ondo', 'Akure', 'South West'],
    ['Osun', 'Osogbo', 'South West'], ['Oyo', 'Ibadan', 'South West'], ['Plateau', 'Jos', 'North Central'], ['Rivers', 'Port Harcourt', 'South South'],
    ['Sokoto', 'Sokoto', 'North West'], ['Taraba', 'Jalingo', 'North East'], ['Yobe', 'Damaturu', 'North East'], ['Zamfara', 'Gusau', 'North West']
  ];
  // Already asked in the hand written questions.
  const asked = new Set(['Akwa Ibom', 'Anambra', 'Ogun', 'Plateau', 'Rivers']);
  const ZONES = ['North Central', 'North East', 'North West', 'South East', 'South South', 'South West'];
  const BIG = new Set(['Lagos', 'Oyo', 'Rivers', 'Edo', 'Enugu', 'Kaduna', 'Kwara', 'Imo', 'Delta', 'Cross River', 'Borno']);
  for (const [state, capital, zone] of STATES) {
    const pool = STATES.filter((s) => s[0] !== state);
    const sameZone = pool.filter((s) => s[2] === zone);
    if (capital !== state && !asked.has(state)) {
      add('naija', BIG.has(state) ? 'easy' : 'medium', `What is the capital of ${state} State?`, capital, pick3([...sameZone, ...pool].map((s) => s[1]).filter((c) => !STATES.some((s) => s[0] === c)), [capital]));
      add('naija', BIG.has(state) ? 'easy' : 'medium', `${capital} is the capital of which state?`, state, pick3([...sameZone, ...pool].map((s) => s[0]), [state]));
    }
    add('naija', 'medium', `${state} State is in which geopolitical zone?`, zone, pick3(ZONES, [zone]));
  }
  return out;
}

// ---------- merge ----------
const otdb = json('otdb.json').questions;
const otqa = json('otqa.json').questions;
const facts = fromFacts();
// Earlier sources win when two questions match.
const all = [...NEXPLAY_QUESTIONS, ...NEXPLAY_QUESTIONS_2, ...otdb, ...facts, ...otqa];
const byId = new Map();
for (const item of all) {
  if (!item.q || !item.a || item.wrong?.length < 3) continue;
  const wrong = item.wrong.slice(0, 3);
  if (wrong.includes(item.a) || new Set(wrong).size !== 3) continue;
  const id = idOf(item.q);
  if (byId.has(id)) continue;
  byId.set(id, { ...item, wrong, id });
}

const packs = new Map();
for (const item of byId.values()) {
  if (!packs.has(item.pack)) packs.set(item.pack, []);
  packs.get(item.pack).push(item);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let files = 0;
const summary = {};
for (const [pack, items] of [...packs].sort()) {
  // Sorting by id spreads every source and difficulty evenly over the shards.
  items.sort((a, b) => (a.id < b.id ? -1 : 1));
  const shards = Math.ceil(items.length / SHARD);
  for (let s = 0; s < shards; s++) {
    const rows = items
      .slice(Math.floor((s * items.length) / shards), Math.floor(((s + 1) * items.length) / shards))
      .map((x) => [x.id, DIFFICULTY[x.difficulty] ?? 1, SOURCES[x.source], x.q, x.a, ...x.wrong]);
    writeFileSync(`${OUT}/${pack}-${s}.json`, JSON.stringify(rows));
    files++;
  }
  summary[pack] = `${items.length} in ${shards}`;
}
console.log(summary);
console.log('total', byId.size, 'questions in', files, 'files');
console.log('from', { nexplay: NEXPLAY_QUESTIONS.length + NEXPLAY_QUESTIONS_2.length, otdb: otdb.length, facts: facts.length, otqa: otqa.length });
const size = readdirSync(OUT).reduce((n, f) => n + readFileSync(`${OUT}/${f}`).length, 0);
console.log('size', Math.round(size / 1024), 'KB');
