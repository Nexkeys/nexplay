import type { BotLevel } from './types';

/** Stable pseudo random number in [0, 1) for a key, so a bot's timing is the same on every host. */
export function hash01(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** How quickly and how reliably a computer player answers timed questions. */
export const BOT_SPEED: Record<BotLevel, { accuracy: number; min: number; max: number }> = {
  easy: { accuracy: 0.45, min: 0.45, max: 0.95 },
  medium: { accuracy: 0.7, min: 0.25, max: 0.7 },
  hard: { accuracy: 0.9, min: 0.12, max: 0.45 }
};

/** When (as a fraction of the time limit) a bot answers, and whether it gets it right. */
export function botPlan(key: string, level: BotLevel, difficulty = 1) {
  const s = BOT_SPEED[level];
  const when = s.min + (s.max - s.min) * hash01(`${key}:t`);
  const correct = hash01(`${key}:c`) < s.accuracy / difficulty;
  return { when, correct };
}
