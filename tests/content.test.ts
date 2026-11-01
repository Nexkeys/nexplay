import { describe, expect, it } from 'vitest';
import { trivia, type TriviaState } from '~/engine/games/trivia';
import { wordRace, type WordState } from '~/engine/games/word-race';
import { createRng } from '~/engine/rng';

const players = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B', bot: 'easy' as const }
];

/** Plays `games` matches in a row, each avoiding everything shown before, and returns every id shown. */
async function trivialRun(pack: string, games: number, questions = 15) {
  const seen = new Set<string>();
  const shown: string[] = [];
  for (let g = 0; g < games; g++) {
    const config = { pack, questions, seconds: 20 };
    await trivia.prepare!(config, seen);
    let s = trivia.setup(players, config, { rng: createRng(g + 1), now: 0, avoid: seen }) as TriviaState;
    for (;;) {
      const id = trivia.seen!(trivia.view(s, 'a'))[0];
      shown.push(id);
      seen.add(id);
      if (s.n >= s.total) break;
      // Ending the reveal moves on to the next question.
      s = trivia.tick!({ ...s, phase: 'reveal', deadline: 0 }, { rng: createRng(g), now: 1 })!;
    }
  }
  return shown;
}

describe('trivia question pools', () => {
  it('has a large pool in every pack', async () => {
    const files = import.meta.glob('../app/engine/data/trivia/*.json', { import: 'default', eager: true }) as Record<string, unknown[]>;
    const total = Object.values(files).reduce((n, rows) => n + rows.length, 0);
    expect(total).toBeGreaterThan(18000);
  });

  it('never repeats a question across 50 mixed games of 15', async () => {
    const shown = await trivialRun('mixed', 50);
    expect(shown).toHaveLength(750);
    expect(new Set(shown).size).toBe(750);
  }, 60_000);

  it('never repeats within a pack until the whole pack has been played', async () => {
    const shown = await trivialRun('afrobeats', 4);
    expect(new Set(shown).size).toBe(shown.length);
  });

  it('does not send the question list to players', async () => {
    const config = { pack: 'mixed', questions: 10, seconds: 20 };
    await trivia.prepare!(config, new Set());
    const s = trivia.setup(players, config, { rng: createRng(3), now: 0 }) as TriviaState;
    expect(s.queue).toHaveLength(10);
    expect((trivia.view(s, 'a') as TriviaState).queue).toEqual([]);
  });

  it('resumes a saved match on a device that has loaded nothing', async () => {
    const config = { pack: 'science', questions: 5, seconds: 20 };
    await trivia.prepare!(config, new Set());
    const s = trivia.setup(players, config, { rng: createRng(4), now: 0 }) as TriviaState;
    await trivia.prepare!(config, new Set(), s);
    const next = trivia.tick!({ ...s, phase: 'reveal', deadline: 0 }, { rng: createRng(4), now: 1 })!;
    expect(next.question.text).toBeTruthy();
  });
});

describe('word race puzzle pools', () => {
  for (const mode of ['unscramble', 'hunt'] as const) {
    it(`never repeats a ${mode} puzzle across 40 games`, async () => {
      const seen = new Set<string>();
      let rounds = 0;
      for (let g = 0; g < 40; g++) {
        const config = { mode, rounds: mode === 'hunt' ? 3 : 8, seconds: 60 };
        await wordRace.prepare!(config, seen);
        const s = wordRace.setup(players, config, { rng: createRng(g + 7), now: 0, avoid: seen }) as WordState;
        expect((wordRace.view(s, 'a') as WordState).queue).toEqual([]);
        for (const p of s.queue) {
          const id = `${mode[0]}:${p[0]}`;
          expect(seen.has(id)).toBe(false);
          seen.add(id);
          rounds++;
        }
      }
      expect(rounds).toBe(mode === 'hunt' ? 120 : 320);
    }, 60_000);
  }
});
