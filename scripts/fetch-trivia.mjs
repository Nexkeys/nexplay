// Downloads multiple choice questions from the Open Trivia Database (CC BY-SA 4.0, https://opentdb.com).
// The API allows one request every five seconds, so this takes a few minutes. Output is committed.
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const CATEGORIES = {
  general: 9,
  science: 17,
  tech: 18,
  football: 21,
  geography: 22,
  history: 23,
  music: 12,
  film: 11,
  animals: 27
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// curl respects HTTPS_PROXY, which some build environments need.
const get = async (url) => JSON.parse(execFileSync('curl', ['-s', '-m', '30', url]).toString());

const token = (await get('https://opentdb.com/api_token.php?command=request')).token;
const out = [];
const seen = new Set();
for (const [pack, id] of Object.entries(CATEGORIES)) {
  for (const difficulty of ['easy', 'medium', 'hard']) {
    await wait(5500);
    const res = await get(`https://opentdb.com/api.php?amount=50&category=${id}&difficulty=${difficulty}&type=multiple&encode=url3986&token=${token}`);
    if (res.response_code !== 0 && !res.results?.length) {
      console.log(pack, difficulty, 'code', res.response_code);
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
        pack: pack === 'football' ? 'sport' : pack,
        difficulty,
        q: question,
        a: d(q.correct_answer),
        wrong: q.incorrect_answers.map(d),
        source: 'otdb'
      });
    }
    console.log(pack, difficulty, out.length);
  }
}
writeFileSync('app/engine/data/trivia-otdb.json', JSON.stringify({ attribution: 'Questions from the Open Trivia Database (opentdb.com), licensed CC BY-SA 4.0.', questions: out }));
console.log('total', out.length);
