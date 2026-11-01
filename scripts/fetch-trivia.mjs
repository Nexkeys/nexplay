// Downloads multiple choice questions from the Open Trivia Database (CC BY-SA 4.0, https://opentdb.com).
// The API allows one request every five seconds, so this takes about ten minutes. Output is committed
// to scripts/sources, and `npm run data` builds the game packs from it.
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const CATEGORIES = {
  general: 9,
  books: 10,
  science: 17,
  tech: 18,
  maths: 19,
  mythology: 20,
  football: 21,
  geography: 22,
  history: 23,
  politics: 24,
  art: 25,
  animals: 27,
  vehicles: 28,
  gadgets: 30,
  music: 12,
  film: 11
};
// Smaller categories fold into the packs players pick from.
const PACK = { football: 'sport', books: 'general', art: 'general', vehicles: 'general', maths: 'science', mythology: 'history', politics: 'history', gadgets: 'tech' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// curl respects HTTPS_PROXY, which some build environments need.
const get = async (url) => {
  for (let tries = 0; ; tries++) {
    try {
      return JSON.parse(execFileSync('curl', ['-s', '-m', '30', url]).toString());
    } catch (e) {
      if (tries >= 4) throw e;
      await wait(10000);
    }
  }
};

const token = (await get('https://opentdb.com/api_token.php?command=request')).token;
const out = [];
const seen = new Set();
for (const [pack, id] of Object.entries(CATEGORIES)) {
  for (const difficulty of ['easy', 'medium', 'hard']) {
    // Page through until the token has handed out every question in this category and difficulty.
    // The API returns nothing when fewer than `amount` are left, so the last pages ask for fewer.
    let amount = 50;
    for (;;) {
    await wait(5500);
    const res = await get(`https://opentdb.com/api.php?amount=${amount}&category=${id}&difficulty=${difficulty}&type=multiple&encode=url3986&token=${token}`);
    // 5 means slow down: wait and ask again.
    if (res.response_code === 5) {
      await wait(15000);
      continue;
    }
    if (!res.results?.length) {
      if (amount === 1) break;
      amount = amount > 10 ? 10 : 1;
      continue;
    }
    for (const q of res.results) {
      const d = (s) => decodeURIComponent(s);
      const question = d(q.question);
      if (seen.has(question)) continue;
      // Skip questions that depend on "which of these" lists or images, and very long ones.
      if (question.length > 160 || /following|below|pictured|this image/i.test(question)) continue;
      seen.add(question);
      out.push({
        pack: PACK[pack] ?? pack,
        difficulty,
        q: question,
        a: d(q.correct_answer),
        wrong: q.incorrect_answers.map(d),
        source: 'otdb'
      });
    }
    }
    console.log(pack, difficulty, out.length);
  }
}
writeFileSync('scripts/sources/otdb.json', JSON.stringify({ attribution: 'Questions from the Open Trivia Database (opentdb.com), licensed CC BY-SA 4.0.', questions: out }));
console.log('total', out.length);
