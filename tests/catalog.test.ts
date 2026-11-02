import { describe, expect, it } from 'vitest';
import { GAMES, loadGame } from '~/engine/catalog';
import { BOARDS } from '~/components/boards';

describe('every game explains itself', () => {
  for (const g of GAMES) {
    it(`${g.name} has three short How to play steps and full rules`, () => {
      expect(g.howTo).toHaveLength(3);
      for (const step of g.howTo) {
        expect(step.length, step).toBeLessThanOrEqual(130);
        expect(/\p{Extended_Pictographic}/u.test(step), step).toBe(false);
      }
      expect(g.rules.length).toBeGreaterThan(0);
      expect(g.blurb.length).toBeGreaterThan(20);
    });
  }
});

describe('every game is wired up', () => {
  for (const g of GAMES) {
    it(`${g.name} loads an engine and a board`, async () => {
      const engine = await loadGame(g.id);
      expect(engine.id).toBe(g.id);
      expect(BOARDS[g.id]).toBeTruthy();
    });
  }
});
