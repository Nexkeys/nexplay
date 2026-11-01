import { limitToLast, onChildAdded, onValue, query, remove, set, update } from 'firebase/database';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadGame } from '~/engine/catalog';
import type { AnyGame, BotLevel, GameId, MatchResult } from '~/engine/types';
import { serverNow } from './firebase';
import { RoomHost } from './host';
import { useIdentity } from './identity';
import {
  addBot,
  claimHost,
  closeRoom,
  heartbeat,
  HEARTBEAT_MS,
  isExpired,
  joinRoom,
  kickPlayer,
  leaveRoom,
  roomRef,
  sendEmote,
  sendMove,
  setReady,
  setRoomConfig,
  trackPresence,
  type JoinResult,
  type PublicState,
  type RoomMeta,
  type RoomPlayer
} from './rooms';
import { addSeen, sharedSeen } from './seen';
import type { Seat, StageProps } from './stage';

export interface Emote {
  id: string;
  uid: string;
  e: string;
  t: number;
}

type MineView = { match: number; rev: number; view?: string; same?: boolean };

const HOST_TIMEOUT = 5000;

export function useRoom(code: string) {
  const { uid, name, avatar, ready: authReady } = useIdentity();
  const [join, setJoin] = useState<JoinResult | 'loading' | 'error'>('loading');
  const [expired, setExpired] = useState(false);
  const [meta, setMeta] = useState<RoomMeta | null>(null);
  const [metaLoaded, setMetaLoaded] = useState(false);
  const [players, setPlayers] = useState<Record<string, RoomPlayer>>({});
  const [pub, setPub] = useState<PublicState | null>(null);
  const [mine, setMine] = useState<MineView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emotes, setEmotes] = useState<Emote[]>([]);
  const [game, setGame] = useState<AnyGame | null>(null);

  // Join once signed in. A started room lets latecomers watch.
  useEffect(() => {
    if (!authReady || !uid) return;
    let live = true;
    joinRoom(code, uid, name, avatar)
      .then((r) => live && setJoin(r))
      .catch(() => live && setJoin('error'));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, uid, code]);

  // Live data.
  useEffect(() => {
    if (!uid || join === 'loading' || join === 'missing' || join === 'error') return;
    const offs = [
      onValue(roomRef(code, 'meta'), (s) => {
        setMeta(s.val());
        setMetaLoaded(true);
      }),
      onValue(roomRef(code, 'players'), (s) => setPlayers(s.val() ?? {})),
      onValue(roomRef(code, 'public'), (s) => setPub(s.val())),
      onValue(roomRef(code, `views/${uid}`), (s) => setMine(s.val())),
      onValue(roomRef(code, `errors/${uid}`), (s) => {
        const v = s.val() as { msg: string } | null;
        if (!v) return;
        setError(v.msg);
        remove(s.ref).catch(() => {});
        setTimeout(() => setError(null), 2800);
      }),
      onChildAdded(query(roomRef(code, 'emotes'), limitToLast(1)), (s) => {
        const v = s.val() as Omit<Emote, 'id'>;
        if (!v || serverNow() - v.t > 8000) return;
        const item = { ...v, id: s.key! };
        setEmotes((list) => [...list.slice(-5), item]);
        setTimeout(() => setEmotes((list) => list.filter((x) => x.id !== item.id)), 3200);
      })
    ];
    return () => offs.forEach((off) => off());
  }, [uid, code, join]);

  const seated = !!(uid && players[uid]);

  useEffect(() => {
    if (!uid || !seated) return;
    return trackPresence(code, uid);
  }, [uid, code, seated]);

  useEffect(() => {
    if (!meta?.game) return;
    let live = true;
    loadGame(meta.game).then((g) => live && setGame(g));
    return () => {
      live = false;
    };
  }, [meta?.game]);

  const isHost = !!(uid && meta?.hostUid === uid);

  // The host's device runs the match.
  const host = useRef<RoomHost | null>(null);
  const playersRef = useRef(players);
  playersRef.current = players;
  useEffect(() => {
    if (!game || !meta || !isHost || meta.status !== 'playing' || game.id !== meta.game) return;
    const h = new RoomHost(code, game, meta, playersRef.current);
    host.current = h;
    h.boot().catch((e) => console.error(e));
    return () => {
      h.stop();
      host.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, isHost, meta?.status, meta?.match, code]);
  useEffect(() => host.current?.setPlayers(players), [players]);

  // Host takeover: if the host has been gone for a few seconds, the next player in seat order steps in.
  useEffect(() => {
    if (!meta || !uid || isHost || !seated) return;
    const hostPlayer = players[meta.hostUid];
    if (hostPlayer?.connected) return;
    const successor = Object.entries(players)
      .filter(([, p]) => !p.bot && p.connected)
      .sort((a, b) => a[1].seat - b[1].seat)[0]?.[0];
    if (successor !== uid) return;
    const t = setTimeout(() => claimHost(code, uid, meta.hostUid).catch(() => {}), HOST_TIMEOUT);
    return () => clearTimeout(t);
  }, [meta, players, uid, isHost, seated, code]);

  // Quick match rooms start on their own once two players are in.
  const humans = Object.values(players).filter((p) => !p.bot);
  useEffect(() => {
    if (!isHost || !meta?.quick || meta.status !== 'lobby' || meta.match > 0) return;
    if (Object.keys(players).length >= Math.max(2, meta.minPlayers)) {
      const t = setTimeout(() => startMatch(), 1500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, meta?.quick, meta?.status, Object.keys(players).length]);

  // Keep the room open while the host is here. When everyone has gone, the heartbeat stops and the room expires.
  const metaRef = useRef(meta);
  metaRef.current = meta;
  useEffect(() => {
    if (!isHost) return;
    const beat = () => {
      const m = metaRef.current;
      if (m && !isExpired(m)) heartbeat(code, m, playersRef.current).catch(() => {});
    };
    beat();
    const t = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [isHost, code, meta?.status, Object.keys(players).length]);

  // Anyone still looking at a room whose time is up sees it close, and the room is cleared away.
  useEffect(() => {
    if (!meta?.expiresAt) return;
    const check = () => {
      if (isExpired(metaRef.current)) {
        setExpired(true);
        closeRoom(code).catch(() => {});
      }
    };
    check();
    const t = setInterval(check, 1000);
    return () => clearInterval(t);
  }, [meta?.expiresAt, code]);

  const seats: Seat[] = useMemo(
    () =>
      Object.entries(players)
        .map(([id, p]) => ({ id, name: p.name, avatar: p.avatar, bot: p.bot ?? null, connected: p.connected, seat: p.seat, wins: p.wins ?? 0, ready: !!p.ready }))
        .sort((a, b) => a.seat - b.seat),
    [players]
  );

  const match = meta?.match ?? 0;
  const live = pub && pub.match === match ? pub : null;
  const viewJson = live ? (mine && mine.match === match && !mine.same && mine.view ? mine.view : live.view) : null;
  const view = useMemo(() => (viewJson ? JSON.parse(viewJson) : null), [viewJson]);

  // Remember what this player has been shown, and tell the host before the next match so it is not repeated.
  const seenIds = view && seated && game?.seen && game.id === meta?.game ? game.seen(view).join(' ') : '';
  useEffect(() => {
    if (seenIds && meta?.game) addSeen(meta.game, seenIds.split(' '));
  }, [seenIds, meta?.game]);
  useEffect(() => {
    if (!uid || !seated || !game?.seen || game.id !== meta?.game || meta?.status !== 'lobby') return;
    set(roomRef(code, `seen/${uid}`), { game: game.id, ids: sharedSeen(game.id) }).catch(() => {});
  }, [uid, seated, game, meta?.game, meta?.status, code]);
  const result = useMemo(() => (live?.result ? (JSON.parse(live.result) as MatchResult) : null), [live?.result]);
  const lastMove = useMemo(() => (live?.lastMove ? JSON.parse(live.lastMove) : null), [live?.lastMove]);

  const send = useCallback(
    (move: unknown) => {
      if (!uid) return;
      sendMove(code, uid, match, move).catch(() => setError('Could not send your move. Check your connection.'));
    },
    [code, uid, match]
  );

  const stage: StageProps | null =
    live && view
      ? {
          view,
          me: seated ? uid : null,
          seats,
          actors: live.actors ?? [],
          deadline: live.deadline ?? 0,
          turnDeadline: live.turnDeadline ?? 0,
          turnSeconds: meta?.turnSeconds ?? 0,
          lastMove,
          result,
          rev: live.rev,
          send,
          now: serverNow
        }
      : null;

  const startMatch = useCallback(async () => {
    if (!meta) return;
    await update(roomRef(code), {
      'meta/status': 'playing',
      'meta/match': meta.match + 1,
      public: null,
      views: null,
      moves: null,
      host: null,
      emotes: null
    });
  }, [code, meta]);

  const backToLobby = useCallback(async () => {
    const patch: Record<string, unknown> = { 'meta/status': 'lobby' };
    for (const [id, p] of Object.entries(players)) if (!p.bot && id !== uid) patch[`players/${id}/ready`] = false;
    await update(roomRef(code), patch);
  }, [code, players, uid]);

  return {
    code,
    uid,
    join,
    expired,
    loaded: metaLoaded,
    meta,
    players,
    seats,
    humans: humans.length,
    isHost,
    seated,
    game,
    stage,
    error,
    emotes,
    actions: {
      start: startMatch,
      backToLobby,
      ready: (r: boolean) => uid && setReady(code, uid, r),
      addBot: (level: BotLevel) => addBot(code, players, level),
      kick: (id: string) => kickPlayer(code, id),
      config: (patch: Partial<Pick<RoomMeta, 'config' | 'maxPlayers' | 'turnSeconds' | 'visibility'>> & { game?: GameId }) => setRoomConfig(code, patch),
      emote: (e: string) => uid && sendEmote(code, uid, e),
      leave: () => uid && leaveRoom(code, uid, meta, players)
    }
  };
}

export type RoomApi = ReturnType<typeof useRoom>;
