import { useCallback, useEffect, useRef, useState } from 'react';
import { loadGame } from '~/engine/catalog';
import type { AnyGame, BotLevel, GameId } from '~/engine/types';
import { MatchRunner, type Snapshot } from './runner';
import type { Seat, StageProps } from './stage';

const BOT_NAMES = ['Ada', 'Bayo', 'Chidi', 'Dami', 'Efe', 'Femi', 'Gozie'];
const BOT_COLOURS = ['#9be8d9', '#c48bff', '#ffd98c', '#7ab8ff', '#ff7a8a', '#b4e07a', '#f2b7a9'];

export interface LocalSetup {
  game: GameId;
  config: Record<string, unknown>;
  level: BotLevel;
  opponents: number;
  me: { id: string; name: string; avatar: string };
  turnSeconds: number;
}

/** Plays a match entirely on this device against computer players. */
export function useLocalMatch(setup: LocalSetup | null) {
  const [game, setGame] = useState<AnyGame | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [wins, setWins] = useState<Record<string, number>>({});
  const runner = useRef<MatchRunner | null>(null);

  const seats: Seat[] = setup
    ? [
        { id: setup.me.id, name: setup.me.name, avatar: setup.me.avatar, bot: null, connected: true, seat: 0, wins: wins[setup.me.id] ?? 0 },
        ...Array.from({ length: setup.opponents }, (_, i) => ({
          id: `cpu-${i}`,
          name: `${BOT_NAMES[i]} (bot)`,
          avatar: BOT_COLOURS[i],
          bot: setup.level,
          connected: true,
          seat: i + 1,
          wins: wins[`cpu-${i}`] ?? 0
        }))
      ]
    : [];

  useEffect(() => {
    if (!setup) return;
    let live = true;
    loadGame(setup.game).then((g) => live && setGame(g));
    return () => {
      live = false;
    };
  }, [setup?.game]);

  useEffect(() => {
    if (!game || !setup) return;
    const r = new MatchRunner(
      game,
      seats.map((s) => ({ id: s.id, name: s.name, bot: s.bot })),
      { turnSeconds: setup.turnSeconds, now: Date.now, onUpdate: setSnap }
    );
    runner.current = r;
    r.start(setup.config);
    const t = setInterval(() => r.step(), 150);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, round, setup?.game, setup?.opponents, setup?.level, JSON.stringify(setup?.config)]);

  const result = snap?.result ?? null;
  const counted = useRef(-1);
  useEffect(() => {
    if (!result || counted.current === round || result.draw) return;
    counted.current = round;
    setWins((w) => {
      const next = { ...w };
      for (const id of result.ranking[0] ?? []) next[id] = (next[id] ?? 0) + 1;
      return next;
    });
  }, [result, round]);

  const send = useCallback((move: unknown) => {
    const err = runner.current?.move(setup!.me.id, move) ?? null;
    setError(err);
    if (err) setTimeout(() => setError(null), 2600);
  }, [setup?.me.id]);

  const stage: StageProps | null =
    snap && setup
      ? {
          view: snap.viewFor(setup.me.id),
          me: setup.me.id,
          seats,
          actors: snap.actors,
          deadline: snap.deadline,
          turnDeadline: snap.turnDeadline,
          turnSeconds: setup.turnSeconds,
          lastMove: snap.lastMove,
          result: snap.result,
          rev: snap.rev,
          send,
          now: Date.now
        }
      : null;

  return { stage, error, round, rematch: () => setRound((r) => r + 1) };
}
