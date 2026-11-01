import { get, onChildAdded, remove, serverTimestamp, set, update } from 'firebase/database';
import type { AnyGame, PlayerInfo } from '~/engine/types';
import { serverNow } from './firebase';
import { MatchRunner, type Snapshot } from './runner';
import { roomRef, type RoomMeta, type RoomPlayer } from './rooms';
import { loadSeen } from './seen';

export const seatedInfos = (players: Record<string, RoomPlayer>): PlayerInfo[] =>
  Object.entries(players)
    .sort((a, b) => a[1].seat - b[1].seat)
    .map(([id, p]) => ({ id, name: p.name, bot: p.bot }));

/**
 * Runs on the room host's device while a match is being played. It is the referee: it reads the
 * move queue, applies legal moves, runs timers and computer players, and publishes what each
 * player is allowed to see. If the host drops, another player takes over from `host/state`.
 */
export class RoomHost {
  private runner: MatchRunner | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stopMoves: () => void = () => {};
  private queued: Snapshot | null = null;
  private flushing = false;
  private finished = false;
  private stopped = false;

  constructor(
    private code: string,
    private game: AnyGame,
    private meta: RoomMeta,
    private players: Record<string, RoomPlayer>
  ) {}

  async boot() {
    const saved = await get(roomRef(this.code, 'host'));
    if (this.stopped) return;
    const infos = seatedInfos(this.players);
    this.runner = new MatchRunner(this.game, infos, {
      turnSeconds: this.meta.turnSeconds,
      now: serverNow,
      onUpdate: (snap) => this.queue(snap)
    });
    this.setPlayers(this.players);
    const prev = saved.val() as { match: number; state: string } | null;
    const config = { ...this.game.defaultConfig, ...this.meta.config };
    if (prev && prev.match === this.meta.match && prev.state) {
      const state = JSON.parse(prev.state);
      await this.game.prepare?.(config, new Set(), state);
      if (this.stopped) return;
      this.runner.resume(state);
    } else {
      const avoid = this.game.prepare ? await this.seenByTable() : new Set<string>();
      await this.game.prepare?.(config, avoid);
      if (this.stopped) return;
      this.runner.start(this.meta.config, avoid);
    }
    this.listen();
    this.timer = setInterval(() => this.runner?.step(), 200);
  }

  /** Everything anyone at the table has already been shown in this game, so nobody gets a repeat. */
  private async seenByTable(): Promise<Set<string>> {
    const avoid = new Set(loadSeen(this.game.id));
    const shared = (await get(roomRef(this.code, 'seen')).catch(() => null))?.val() as Record<string, { game: string; ids: string }> | null;
    for (const [uid, s] of Object.entries(shared ?? {})) {
      if (this.players[uid] && s?.game === this.game.id && typeof s.ids === 'string') for (const id of s.ids.split(' ')) if (id) avoid.add(id);
    }
    return avoid;
  }

  setPlayers(players: Record<string, RoomPlayer>) {
    this.players = players;
    this.runner?.setDisconnected(Object.entries(players).filter(([, p]) => !p.bot && !p.connected).map(([id]) => id));
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.stopMoves();
  }

  private listen() {
    this.stopMoves = onChildAdded(roomRef(this.code, 'moves'), (snap) => {
      const item = snap.val() as { uid: string; match: number; move: string } | null;
      remove(snap.ref).catch(() => {});
      if (!item || item.match !== this.meta.match || !this.runner) return;
      let move: unknown;
      try {
        move = JSON.parse(item.move);
      } catch {
        return;
      }
      const err = this.runner.move(item.uid, move);
      if (err) set(roomRef(this.code, `errors/${item.uid}`), { msg: err, t: serverTimestamp() }).catch(() => {});
    });
  }

  /** Several moves can land in the same moment. Only the newest picture is sent. */
  private queue(snap: Snapshot) {
    this.queued = snap;
    if (!this.flushing) {
      this.flushing = true;
      queueMicrotask(() => this.flush());
    }
  }

  private flush() {
    this.flushing = false;
    const s = this.queued;
    if (!s || !this.runner || this.stopped) return;
    this.queued = null;
    const match = this.meta.match;
    const publicView = JSON.stringify(s.viewFor(null));
    const updates: Record<string, unknown> = {
      host: { match, state: JSON.stringify(this.runner.state) },
      public: {
        match,
        rev: s.rev,
        view: publicView,
        actors: s.actors,
        deadline: s.deadline,
        turnDeadline: s.turnDeadline,
        result: s.result ? JSON.stringify(s.result) : null,
        lastMove: s.lastMove ? JSON.stringify(s.lastMove) : null,
        at: serverTimestamp()
      }
    };
    for (const [id, p] of Object.entries(this.players)) {
      if (p.bot) continue;
      const mine = JSON.stringify(s.viewFor(id));
      updates[`views/${id}`] = mine === publicView ? { match, rev: s.rev, same: true } : { match, rev: s.rev, view: mine };
    }
    if (s.result && !this.finished) {
      this.finished = true;
      updates['meta/status'] = 'ended';
      if (!s.result.draw) for (const id of s.result.ranking[0] ?? []) if (this.players[id]) updates[`players/${id}/wins`] = (this.players[id].wins ?? 0) + 1;
      if (this.timer) clearInterval(this.timer);
    }
    update(roomRef(this.code), updates).catch((e) => console.error('NexPlay host write failed', e));
  }
}
