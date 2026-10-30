import { createRng } from '~/engine/rng';
import type { AnyGame, BotLevel, MatchResult, PlayerId, PlayerInfo } from '~/engine/types';

export interface Snapshot {
  rev: number;
  /** What each viewer sees. `null` is a spectator. */
  viewFor(viewer: PlayerId | null): unknown;
  actors: PlayerId[];
  /** Game clock (rounds, reveals) for timed games. */
  deadline: number;
  /** Per turn timer for turn based games, 0 when off. */
  turnDeadline: number;
  result: MatchResult | null;
  /** Last applied move, for sounds and animation cues. */
  lastMove: { by: PlayerId; move: unknown } | null;
}

export interface RunnerOptions {
  turnSeconds: number;
  now(): number;
  onUpdate(snapshot: Snapshot): void;
}

/**
 * Runs one match of a game: applies validated moves, drives timers and plays for computer players.
 * The online host and the offline vs computer mode both use this.
 */
export class MatchRunner {
  state: unknown;
  private rev = 0;
  private actorsKey = '';
  private actorsSince = 0;
  private turnDeadline = 0;
  private lastMove: Snapshot['lastMove'] = null;
  private rng = createRng();
  private disconnected = new Set<PlayerId>();

  constructor(
    readonly game: AnyGame,
    readonly players: PlayerInfo[],
    private opts: RunnerOptions,
    initial?: unknown
  ) {
    this.state = initial;
  }

  start(config: Record<string, unknown>) {
    const now = this.opts.now();
    this.state = this.game.setup(this.players, { ...this.game.defaultConfig, ...config }, { rng: this.rng, now });
    this.refreshActors(now);
    this.emit();
  }

  /** Resume from a saved state, for example after taking over as host. */
  resume(state: unknown) {
    this.state = state;
    this.refreshActors(this.opts.now());
    this.emit();
  }

  setDisconnected(ids: PlayerId[]) {
    this.disconnected = new Set(ids);
  }

  get result(): MatchResult | null {
    return this.game.result(this.state);
  }

  /** Returns an error message for the player, or null when the move was applied. */
  move(player: PlayerId, move: unknown): string | null {
    if (this.result) return 'The game is over.';
    const err = this.game.validate(this.state, player, move);
    if (err) return err;
    const now = this.opts.now();
    this.state = this.game.apply(this.state, player, move, { rng: this.rng, now });
    this.lastMove = { by: player, move };
    this.refreshActors(now);
    this.emit();
    return null;
  }

  /** Call often (a few times a second): runs timers and computer turns. */
  step() {
    if (this.result) return;
    const now = this.opts.now();
    const ticked = this.game.tick?.(this.state, { rng: this.rng, now });
    if (ticked) {
      this.state = ticked;
      this.lastMove = null;
      this.refreshActors(now);
      this.emit();
      return;
    }
    const actors = this.game.actors(this.state) as PlayerId[];
    for (const id of actors) {
      const p = this.players.find((x) => x.id === id);
      if (!p?.bot) continue;
      // Turn based computer players take a short, human feeling pause.
      if (!this.game.selfTimed && now - this.actorsSince < this.botDelay(p.bot)) continue;
      const move = this.game.bot(this.state, id, p.bot as BotLevel, { rng: this.rng, now });
      if (move && !this.move(id, move)) return;
    }
    // Turn timer and absent players: play an easy move for them so the game keeps going.
    const absentDue = now - this.actorsSince > 12000;
    if (!this.game.selfTimed && ((this.turnDeadline && now > this.turnDeadline) || absentDue)) {
      for (const id of actors) {
        const p = this.players.find((x) => x.id === id);
        if (p?.bot) continue;
        if (!(this.turnDeadline && now > this.turnDeadline) && !this.disconnected.has(id)) continue;
        const move = this.game.bot(this.state, id, 'easy', { rng: this.rng, now });
        if (move && !this.move(id, move)) return;
      }
    }
  }

  private botDelay(level: string) {
    return level === 'hard' ? 650 : level === 'medium' ? 900 : 1150;
  }

  private refreshActors(now: number) {
    const actors = this.game.actors(this.state) as PlayerId[];
    const key = actors.join(',') + '|' + this.rev;
    const changed = actors.join(',') !== this.actorsKey.split('|')[0] || !this.game.selfTimed;
    if (changed) {
      this.actorsSince = now;
      this.turnDeadline = !this.game.selfTimed && this.opts.turnSeconds > 0 && actors.length ? now + this.opts.turnSeconds * 1000 : 0;
    }
    this.actorsKey = key;
  }

  snapshot(): Snapshot {
    const state = this.state;
    const game = this.game;
    return {
      rev: this.rev,
      viewFor: (viewer) => game.view(state, viewer),
      actors: game.actors(state),
      deadline: game.deadline?.(state) ?? 0,
      turnDeadline: this.turnDeadline,
      result: game.result(state),
      lastMove: this.lastMove
    };
  }

  private emit() {
    this.rev += 1;
    this.opts.onUpdate(this.snapshot());
  }
}
