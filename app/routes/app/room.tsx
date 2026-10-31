import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Avatar } from '~/components/Avatar';
import { GameArt } from '~/components/GameArt';
import { Icon } from '~/components/Icon';
import { GameScreen } from '~/components/game/GameScreen';
import { Settings } from '~/components/game/Settings';
import { GAMES, gameMeta, isTurnBased, TURN_TIMERS } from '~/engine/catalog';
import type { BotLevel, GameId } from '~/engine/types';
import { useIdentity } from '~/lib/identity';
import { serverNow } from '~/lib/firebase';
import { isCode, joinRoom, normaliseCode, type RoomMeta } from '~/lib/rooms';
import { firstName } from '~/lib/stage';
import { useRoom, type RoomApi } from '~/lib/useRoom';

export function meta({ params }: { params: { code?: string } }) {
  return [{ title: `Room ${params.code ?? ''} · NexPlay` }, { name: 'robots', content: 'noindex' }];
}

export default function RoomPage() {
  const params = useParams();
  const code = normaliseCode(params.code ?? '');
  if (!isCode(code)) return <Problem title="That is not a room code" text="Room codes are five letters and numbers, like K7QPM." />;
  return <Room code={code} />;
}

function Room({ code }: { code: string }) {
  const room = useRoom(code);
  const nav = useNavigate();
  const { meta } = room;

  if (room.join === 'expired' || room.expired)
    return <Problem title="This room has expired" text="Room codes close when nobody uses them, and rooms close a few minutes after everyone has left. Start a new room and share the fresh code." />;
  if (room.join === 'missing') return <Problem title="Room not found" text={`There is no room ${code}. Codes expire after 15 minutes if nobody joins, and rooms close a few minutes after everyone leaves. Check the code, or start a new room.`} />;
  if (room.join === 'full') return <Problem title="This room is full" text="Every seat is taken. Ask the host to make space, or start your own room." />;
  if (room.join === 'error') return <Problem title="Could not join" text="Check your internet connection and try again." />;
  if (room.join === 'loading' || !room.loaded) return <Loading text={`Joining room ${code}…`} />;
  if (!meta) return <Problem title="This room has closed" text="The host closed the room." />;

  const leave = async () => {
    await room.actions.leave();
    nav('/play');
  };

  if (meta.status === 'lobby') return <Lobby room={room} onLeave={leave} />;

  const actions = room.isHost ? (
    <>
      <button className="btn" onClick={() => room.actions.start()}>
        <Icon name="refresh" /> Play again
      </button>
      <button className="btn dark" onClick={() => room.actions.backToLobby()}>
        Back to lobby
      </button>
    </>
  ) : (
    <>
      <p className="muted small">Waiting for {firstName(room.players[meta.hostUid]?.name ?? 'the host')} to start the next game…</p>
      <button className="btn dark" onClick={leave}>
        Leave room
      </button>
    </>
  );

  return (
    <GameScreen
      game={meta.game}
      stage={room.stage}
      chip={
        <span className="gchip mono">
          Room {code}
          {!room.seated && ' · watching'}
        </span>
      }
      error={room.error}
      emotes={room.emotes}
      onEmote={(e) => room.actions.emote(e)}
      onLeave={leave}
      actions={actions}
      recordKey={`${code}:${meta.match}`}
    />
  );
}

const TIMERS = TURN_TIMERS.map((s) => ({ value: s, label: `${s}s` }));

function Lobby({ room, onLeave }: { room: RoomApi; onLeave: () => void }) {
  const meta = room.meta!;
  const id = useIdentity();
  const info = gameMeta(meta.game)!;
  const [copied, setCopied] = useState(false);
  const [botLevel, setBotLevel] = useState<BotLevel>('medium');
  const [choosing, setChoosing] = useState(false);
  const config = { ...(room.game?.id === meta.game ? room.game.defaultConfig : {}), ...(meta.config ?? {}) };
  const max = Math.min(meta.maxPlayers, info.players[1]);
  const count = room.seats.length;
  const notReady = room.seats.filter((s) => !s.bot && !s.ready && s.id !== meta.hostUid);
  const minNeeded = Math.max(2, info.players[0]);
  const canStart = room.isHost && count >= minNeeded && count <= info.players[1] && notReady.length === 0;
  const me = room.uid ? room.players[room.uid] : null;
  const link = typeof window !== 'undefined' ? `${window.location.origin}/room/${meta.code}` : '';
  const turnBased = isTurnBased(meta.game);

  const share = async () => {
    const text = `Join my ${info.name} game on NexPlay. Room code ${meta.code}`;
    try {
      if (navigator.share) await navigator.share({ title: 'NexPlay', text, url: link });
      else {
        await navigator.clipboard.writeText(`${text}: ${link}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* cancelled */
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(meta.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const switchGame = async (g: GameId) => {
    const next = gameMeta(g)!;
    setChoosing(false);
    // Remove computer players that no longer fit.
    const over = count - next.players[1];
    if (over > 0) for (const s of room.seats.filter((x) => x.bot).slice(-over)) await room.actions.kick(s.id);
    await room.actions.config({ game: g, config: {}, maxPlayers: next.players[1] });
  };

  let startNote = '';
  if (count < minNeeded) startNote = `Need at least ${minNeeded} players. Share the code or add a computer player.`;
  else if (count > info.players[1]) startNote = `${info.name} takes at most ${info.players[1]} players.`;
  else if (notReady.length) startNote = `Waiting for ${notReady.map((s) => firstName(s.name)).join(', ')} to be ready.`;

  return (
    <div className="page-lobby">
      <section className="lobby-head" style={{ ['--tint' as string]: info.colour }}>
        <div className="lh-art">
          <GameArt id={meta.game} size={150} />
        </div>
        <div className="lh-text">
          <span className="mono">{meta.quick ? 'Quick match' : 'Private room'}</span>
          <h1>{info.name}</h1>
          <p>{info.tagline}</p>
          {room.isHost && !meta.quick && (
            <button className="link" onClick={() => setChoosing(true)}>
              Change game
            </button>
          )}
        </div>
        <div className="code-card">
          <span className="mono">Room code</span>
          <button className="code" onClick={copy} aria-label={`Room code ${meta.code}, tap to copy`}>
            {meta.code.split('').map((c, i) => (
              <motion.span key={i} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 * i }}>
                {c}
              </motion.span>
            ))}
          </button>
          <InviteTimer meta={meta} />
          <div className="code-actions">
            <button className="btn small" onClick={share}>
              <Icon name="share" size={18} /> Invite
            </button>
            <button className="btn small dark" onClick={copy}>
              <Icon name={copied ? 'check' : 'copy'} size={18} /> {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </section>

      <div className="lobby-body">
        <section className="panel seats-panel">
          <div className="panel-head">
            <h2>Players</h2>
            <span className="mono">
              {count} / {max}
            </span>
          </div>
          <ul className="seats">
            <AnimatePresence initial={false}>
              {room.seats.map((s) => (
                <motion.li key={s.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className={s.id === room.uid ? 'me' : ''}>
                  <Avatar name={s.name} colour={s.avatar} size={44} bot={!!s.bot} off={!s.connected} />
                  <span className="who">
                    <b>
                      {firstName(s.name)}
                      {s.id === room.uid && <em> you</em>}
                    </b>
                    <small>
                      {s.id === meta.hostUid ? (
                        <>
                          <Icon name="crown" size={12} /> Host
                        </>
                      ) : s.bot ? (
                        `Computer · ${s.bot}`
                      ) : !s.connected ? (
                        'Away'
                      ) : s.ready ? (
                        'Ready'
                      ) : (
                        'Not ready'
                      )}
                    </small>
                  </span>
                  {s.wins > 0 && (
                    <span className="wins" aria-label={`${s.wins} ${s.wins === 1 ? 'win' : 'wins'} this session`}>
                      <Icon name="trophy" size={14} /> {s.wins}
                    </span>
                  )}
                  {(s.ready || s.id === meta.hostUid) && s.connected && <span className="ready-dot" aria-hidden="true" />}
                  {room.isHost && s.id !== room.uid && (
                    <button className="kick" onClick={() => room.actions.kick(s.id)} aria-label={`Remove ${s.name}`}>
                      <Icon name="close" size={16} />
                    </button>
                  )}
                </motion.li>
              ))}
              {Array.from({ length: Math.max(0, max - count) }, (_, i) => (
                <motion.li key={`empty${i}`} layout className="empty">
                  <span className="seat-hole" />
                  <span className="who">
                    <b>Open seat</b>
                    <small>Waiting for a player…</small>
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {room.isHost && count < max && (
            <div className="add-bot">
              <div className="seg small" role="radiogroup" aria-label="Computer level">
                {(['easy', 'medium', 'hard'] as BotLevel[]).map((l) => (
                  <button key={l} role="radio" aria-checked={botLevel === l} className={botLevel === l ? 'on' : ''} onClick={() => setBotLevel(l)}>
                    {l}
                  </button>
                ))}
              </div>
              <button className="btn small dark" onClick={() => room.actions.addBot(botLevel)}>
                <Icon name="bot" size={18} /> Add computer
              </button>
            </div>
          )}
        </section>

        <section className="panel rules-panel">
          <div className="panel-head">
            <h2>House rules</h2>
            {!room.isHost && <span className="mono">set by the host</span>}
          </div>
          <Settings meta={info} config={config} readOnly={!room.isHost} onChange={(patch) => room.actions.config({ config: { ...(meta.config ?? {}), ...patch } })} />
          {info.players[1] > 2 && (
            <div className="set-choice">
              <span>
                <b>Seats</b>
              </span>
              <div className="seg">
                {Array.from({ length: info.players[1] - 1 }, (_, i) => i + 2).map((n) => (
                  <button key={n} className={max === n ? 'on' : ''} disabled={!room.isHost || n < count} onClick={() => room.actions.config({ maxPlayers: n })}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
          {turnBased && (
            <div className="set-choice">
              <span>
                <b>Turn timer</b>
                <small>Run out of time and a random move is played for you, so nobody is left waiting.</small>
              </span>
              <div className="seg">
                {TIMERS.map((t) => (
                  <button key={t.value} className={meta.turnSeconds === t.value ? 'on' : ''} disabled={!room.isHost} onClick={() => room.actions.config({ turnSeconds: t.value })}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="lobby-bar">
        <button className="btn dark" onClick={onLeave}>
          Leave
        </button>
        <p className="note">{room.isHost ? startNote || 'Everyone is ready.' : room.seated ? (me?.ready ? `Waiting for ${firstName(room.players[meta.hostUid]?.name ?? 'the host')} to start…` : 'Tap ready when you are set.') : 'You are watching.'}</p>
        {room.isHost ? (
          <button className="btn go" disabled={!canStart} onClick={() => room.actions.start()}>
            <Icon name="play" /> Start game
          </button>
        ) : room.seated ? (
          <button className={`btn go${me?.ready ? ' dark' : ''}`} onClick={() => room.actions.ready(!me?.ready)}>
            {me?.ready ? 'Not ready' : "I'm ready"}
          </button>
        ) : (
          <button className="btn go" disabled={count >= max} onClick={() => id.uid && joinRoom(meta.code, id.uid, id.name, id.avatar)}>
            Take a seat
          </button>
        )}
      </div>

      <AnimatePresence>
        {choosing && (
          <motion.div className="sheet-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setChoosing(false)}>
            <motion.div className="sheet" initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} onClick={(e) => e.stopPropagation()}>
              <button className="gbtn close" onClick={() => setChoosing(false)} aria-label="Close">
                <Icon name="close" />
              </button>
              <h3>Switch game</h3>
              <div className="pick-grid">
                {GAMES.map((g) => (
                  <button key={g.id} onClick={() => switchGame(g.id)} className={g.id === meta.game ? 'on' : ''}>
                    <span className="art" style={{ ['--tint' as string]: g.colour }}>
                      <GameArt id={g.id} size={84} />
                    </span>
                    <b>{g.name}</b>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InviteTimer({ meta }: { meta: RoomMeta }) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(t);
  }, []);
  if (meta.everJoined || meta.quick || !meta.expiresAt) return <p className="invite-note">Code stays open while players are here.</p>;
  const left = Math.max(0, meta.expiresAt - now);
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return (
    <p className={`invite-note${left < 120000 ? ' soon' : ''}`}>
      Code expires in {m}:{String(s).padStart(2, '0')} if nobody joins
    </p>
  );
}

export function Loading({ text }: { text: string }) {
  return (
    <div className="center-card">
      <span className="boot-mark">
        <i />
      </span>
      <p>{text}</p>
    </div>
  );
}

export function Problem({ title, text }: { title: string; text: string }) {
  return (
    <div className="center-card">
      <h1>{title}</h1>
      <p>{text}</p>
      <Link to="/play" className="btn">
        Back to games
      </Link>
    </div>
  );
}
