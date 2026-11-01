import { sha256 } from '../sha256';
import { hash01 } from '../timed';
import type { BotLevel, GameDef, MatchResult, PlayerId, Rng } from '../types';

// ---------------------------------------------------------------------------------------------
// Arena: everyone picks a move at the same moment, then the round resolves all at once.
//   Strike beats Charge (chargers take 50% more), Block beats Strike (parry and counter),
//   Charge beats Block (free energy while they hide), and Specials spend energy to break the loop.
// Blocking again right after a block is weaker, and a third block in a row fails, so it is no
// safe spam. After a set number of rounds the arena shrinks and everyone takes rising damage.
// ---------------------------------------------------------------------------------------------

export type ClassId = 'warrior' | 'mage' | 'rogue' | 'cleric';
export type Action = 'strike' | 'block' | 'charge' | 'special';
export type Guard = 'full' | 'half' | 'none';
export type Length = 'short' | 'normal' | 'long';

export interface ClassInfo {
  name: string;
  role: string;
  hp: number;
  strike: number;
  crit: number;
  /** Energy gained by charging. */
  charge: number;
  special: { name: string; cost: number; target: boolean; text: string };
}

export const CLASS_IDS: ClassId[] = ['warrior', 'mage', 'rogue', 'cleric'];

export const RULES = {
  maxEnergy: 5,
  startEnergy: 1,
  /** A fresh Block that stops a strike hits back for this much and gains this much energy. */
  counter: 6,
  parryEnergy: 1,
  critMult: 1.5,
  /** Anyone hit while charging takes this much more. */
  openMult: 1.5,
  cleave: 22,
  splash: 5,
  backstab: 26,
  fireball: 20,
  burn: 4,
  burnRounds: 2,
  heal: 18,
  /** Sudden death damage grows by this much every round. */
  storm: 2
};

/** Numbers for a normal length match. Short and long matches scale HP. */
export const CLASSES: Record<ClassId, ClassInfo> = {
  warrior: {
    name: 'Warrior',
    role: 'Tough brawler. Cleave smashes through blocks.',
    hp: 72,
    strike: 11,
    crit: 0.1,
    charge: 2,
    special: { name: 'Cleave', cost: 3, target: true, text: `${RULES.cleave} to your target and ${RULES.splash} to every other foe. Blocks cannot stop it. A charging target is stunned.` }
  },
  mage: {
    name: 'Mage',
    role: 'Glass cannon. Charges fast, Fireball burns.',
    hp: 68,
    strike: 9,
    crit: 0.1,
    charge: 3,
    special: { name: 'Fireball', cost: 3, target: true, text: `${RULES.fireball} damage, then a burn of ${RULES.burn} a round for ${RULES.burnRounds} rounds. Charging gives the Mage 3 energy.` }
  },
  rogue: {
    name: 'Rogue',
    role: 'Sneaky. Crits often, Backstab hits hard.',
    hp: 66,
    strike: 11,
    crit: 0.25,
    charge: 2,
    special: { name: 'Backstab', cost: 2, target: true, text: `${RULES.backstab} damage and it can crit. A fresh Block makes it miss and stuns you.` }
  },
  cleric: {
    name: 'Cleric',
    role: 'Survivor. Mend heals and guards.',
    hp: 70,
    strike: 11,
    crit: 0.1,
    charge: 2,
    special: { name: 'Mend', cost: 3, target: false, text: `Heal ${RULES.heal} before hits land, put out a burn, and guard like a fresh Block.` }
  }
};

export const LENGTHS: Record<Length, { hp: number; suddenDeath: number }> = {
  short: { hp: 0.75, suddenDeath: 8 },
  normal: { hp: 1, suddenDeath: 10 },
  long: { hp: 1.4, suddenDeath: 15 }
};

export const CLASS_MS = 15000;
export const REVEAL_MS = 4000;

export interface ArenaPick {
  action: Action;
  target?: PlayerId | null;
  /** Did not pick in time, so blocked automatically. */
  auto?: boolean;
}

/** What a fighter did in a resolved round, as everyone saw it. */
export interface Played {
  a: Action | 'stunned';
  t?: PlayerId | null;
  /** Could they afford their special at the time. Bots read habits by situation. */
  rich: boolean;
  auto?: boolean;
}

export interface Fighter {
  id: PlayerId;
  cls: ClassId | null;
  hp: number;
  maxHp: number;
  energy: number;
  alive: boolean;
  /** Rounds of burn left. */
  burn: number;
  /** Skips the next round. */
  stunned: boolean;
  /** Blocks in a row so far. */
  streak: number;
  /** Round they were knocked out, 0 while standing. */
  fell: number;
  /** HP at the start of the round they fell, for breaking ties. */
  hpBefore: number;
  dealt: number;
}

export type Via = 'strike' | 'counter' | 'cleave' | 'splash' | 'fireball' | 'backstab' | 'burn' | 'storm';

export type LogEntry =
  | { k: 'hit'; by: PlayerId | null; to: PlayerId; n: number; via: Via; crit?: boolean; open?: boolean; guard?: Guard; burn?: boolean }
  | { k: 'parry'; by: PlayerId; from: PlayerId; via: 'strike' | 'backstab' }
  | { k: 'charge'; by: PlayerId; energy: number }
  | { k: 'heal'; by: PlayerId; n: number }
  | { k: 'stun'; to: PlayerId }
  | { k: 'broken'; by: PlayerId }
  | { k: 'auto'; by: PlayerId }
  | { k: 'idle'; by: PlayerId }
  | { k: 'storm'; n: number }
  | { k: 'ko'; to: PlayerId };

export interface ArenaConfig extends Record<string, unknown> {
  seconds: number;
  length: Length;
}

export interface ArenaState {
  players: PlayerId[];
  bots: Record<PlayerId, BotLevel>;
  fighters: Record<PlayerId, Fighter>;
  phase: 'class' | 'choose' | 'reveal' | 'result' | 'over';
  round: number;
  seconds: number;
  length: Length;
  /** First round of sudden death. */
  suddenDeath: number;
  start: number;
  deadline: number;
  /** Sealed picks this round. Hidden in `view`. */
  commits: Record<PlayerId, string>;
  /** Revealed (or bot) picks this round. Hidden in `view` until the round resolves. */
  picks: Record<PlayerId, ArenaPick>;
  /** What happened last round. */
  log: LogEntry[];
  /** Everyone's picks last round, shown once it resolves. */
  played: Record<PlayerId, Played>;
  /** Recent rounds for each fighter, newest last. */
  past: Record<PlayerId, Played[]>;
}

export type ArenaMove =
  | { type: 'class'; cls: ClassId }
  | { type: 'commit'; hash: string }
  | { type: 'reveal'; action: Action; target?: PlayerId | null; salt: string }
  | { type: 'bot' };

/** What a player sees. Other fighters' picks stay hidden until the round resolves. */
export type ArenaView = Omit<ArenaState, 'commits'> & {
  /** Fighters who have locked in this round. */
  locked: PlayerId[];
  /** The viewer's own sealed fingerprint, so their device can reveal the matching pick. */
  myCommit: string | null;
};

export const commitHash = (action: Action, target: PlayerId | null | undefined, salt: string) => sha256(`${action}:${target ?? ''}:${salt}`);

const ACTIONS: Action[] = ['strike', 'block', 'charge', 'special'];

export const guardOf = (f: Pick<Fighter, 'streak'>): Guard => (f.streak <= 0 ? 'full' : f.streak === 1 ? 'half' : 'none');
export const specialOf = (f: Pick<Fighter, 'cls'>) => CLASSES[f.cls ?? 'warrior'].special;
export const resultMs = (log: LogEntry[]) => Math.min(7000, 3000 + 320 * log.filter((e) => !(e.k === 'hit' && e.via === 'storm')).length);
export const stormDamage = (s: Pick<ArenaState, 'round' | 'suddenDeath'>, round = s.round) => (round >= s.suddenDeath ? RULES.storm * (round - s.suddenDeath + 1) : 0);
export const needsTarget = (f: Pick<Fighter, 'cls'>, action: Action) => action === 'strike' || (action === 'special' && specialOf(f).target);

const living = (s: ArenaState) => s.players.filter((p) => s.fighters[p].alive);
const foesOf = (s: ArenaState, id: PlayerId) => living(s).filter((p) => p !== id);
/** Players who still have to lock in a pick this round. */
const pickers = (s: ArenaState) => living(s).filter((p) => !s.fighters[p].stunned);

/** Error message, or null when this pick is legal for the fighter right now. */
export function checkPick(s: Pick<ArenaState, 'fighters'>, id: PlayerId, action: Action, target?: PlayerId | null): string | null {
  const f = s.fighters[id];
  if (!f?.alive) return 'You are out.';
  if (f.stunned) return 'You are stunned this round.';
  if (!ACTIONS.includes(action)) return 'Unknown move.';
  if (action === 'special' && f.energy < specialOf(f).cost) return 'Not enough energy.';
  if (needsTarget(f, action)) {
    if (!target || target === id || !s.fighters[target]?.alive) return 'Pick a fighter to target.';
  }
  return null;
}

// --- setup and phases ---------------------------------------------------------------------------

function makeFighter(id: PlayerId): Fighter {
  return { id, cls: null, hp: 0, maxHp: 0, energy: RULES.startEnergy, alive: true, burn: 0, stunned: false, streak: 0, fell: 0, hpBefore: 0, dealt: 0 };
}

function newRound(s: ArenaState, now: number): ArenaState {
  return { ...s, phase: 'choose', round: s.round + 1, start: now, deadline: now + s.seconds * 1000, commits: {}, picks: {} };
}

/** Everyone has a class (random for anyone who did not choose): the fight begins. */
function beginFight(s: ArenaState, rng: Rng, now: number): ArenaState {
  const scale = LENGTHS[s.length].hp;
  const fighters = { ...s.fighters };
  for (const p of s.players) {
    const cls = fighters[p].cls ?? rng.pick(CLASS_IDS);
    const hp = Math.round(CLASSES[cls].hp * scale);
    fighters[p] = { ...fighters[p], cls, hp, maxHp: hp };
  }
  return newRound({ ...s, fighters }, now);
}

/** Once every fighter is sealed in, humans reveal; bots already picked. */
function afterCommit(s: ArenaState, rng: Rng, now: number): ArenaState {
  const ids = pickers(s);
  if (!ids.every((p) => s.commits[p])) return s;
  if (ids.every((p) => s.picks[p])) return resolve(s, rng, now);
  return { ...s, phase: 'reveal', deadline: now + REVEAL_MS };
}

// --- resolving a round ---------------------------------------------------------------------------

/** Works out a whole round at once. Exported for tests. */
export function resolve(s: ArenaState, rng: Rng, now: number): ArenaState {
  const round = s.round;
  const alive = living(s);
  const F: Record<PlayerId, Fighter> = {};
  for (const p of s.players) F[p] = { ...s.fighters[p] };
  const log: LogEntry[] = [];
  const played: Record<PlayerId, Played> = {};
  const acts: Record<PlayerId, ArenaPick | null> = {};

  for (const p of alive) {
    const f = F[p];
    const rich = f.energy >= specialOf(f).cost;
    if (f.stunned) {
      acts[p] = null;
      played[p] = { a: 'stunned', rich };
      log.push({ k: 'idle', by: p });
      continue;
    }
    let pick = s.picks[p];
    if (!pick || checkPick(s, p, pick.action, pick.target)) pick = { action: 'block', auto: true };
    acts[p] = pick;
    played[p] = { a: pick.action, t: needsTarget(f, pick.action) ? pick.target : null, rich, ...(pick.auto ? { auto: true } : {}) };
    if (pick.auto) log.push({ k: 'auto', by: p });
  }

  const guard: Record<PlayerId, Guard | null> = {};
  const mending = (p: PlayerId) => acts[p]?.action === 'special' && F[p].cls === 'cleric';
  // Mend also guards like a fresh Block, without tiring the cleric's block.
  for (const p of alive) guard[p] = acts[p]?.action === 'block' ? guardOf(F[p]) : mending(p) ? 'full' : null;
  for (const p of alive) if (guard[p] === 'none') log.push({ k: 'broken', by: p });
  const charging = (p: PlayerId) => acts[p]?.action === 'charge';

  // Energy: specials are paid for, charges fill up.
  for (const p of alive) {
    const a = acts[p];
    if (a?.action === 'special') F[p].energy -= specialOf(F[p]).cost;
    if (a?.action === 'charge') {
      F[p].energy = Math.min(RULES.maxEnergy, F[p].energy + CLASSES[F[p].cls!].charge);
      log.push({ k: 'charge', by: p, energy: F[p].energy });
    }
  }

  // Heals land first, so a well timed Mend can save you.
  const burnedBefore: Record<PlayerId, number> = {};
  for (const p of alive) {
    if (acts[p]?.action === 'special' && F[p].cls === 'cleric') {
      const n = Math.min(RULES.heal, F[p].maxHp - F[p].hp);
      F[p].hp += n;
      F[p].burn = 0;
      log.push({ k: 'heal', by: p, n });
    }
    burnedBefore[p] = F[p].burn;
  }

  const dmg: Record<PlayerId, number> = Object.fromEntries(alive.map((p) => [p, 0]));
  const stuns = new Set<PlayerId>();
  const burns = new Set<PlayerId>();
  const parried = new Set<PlayerId>();

  const hit = (by: PlayerId, to: PlayerId, base: number, via: 'strike' | 'backstab' | 'fireball' | 'cleave' | 'splash') => {
    // Cleave smashes straight through any guard.
    const g = via === 'cleave' || via === 'splash' ? null : guard[to];
    const strikeLike = via === 'strike' || via === 'backstab';
    if (strikeLike && g === 'full') {
      parried.add(to);
      log.push({ k: 'parry', by: to, from: by, via });
      if (via === 'backstab') stuns.add(by);
      else {
        dmg[by] += RULES.counter;
        F[to].dealt += RULES.counter;
        log.push({ k: 'hit', by: to, to: by, n: RULES.counter, via: 'counter' });
      }
      return;
    }
    let mult = 1;
    const crit = via !== 'cleave' && via !== 'splash' && rng.next() < CLASSES[F[by].cls!].crit;
    if (crit) mult *= RULES.critMult;
    const open = charging(to);
    if (open) mult *= RULES.openMult;
    const reduced = g === 'full' || (g === 'half' && strikeLike);
    if (reduced) mult *= 0.5;
    const n = Math.round(base * mult);
    dmg[to] += n;
    F[by].dealt += n;
    const burn = via === 'fireball' && g !== 'full';
    if (burn) burns.add(to);
    if (via === 'cleave' && open) stuns.add(to);
    log.push({ k: 'hit', by, to, n, via, ...(crit ? { crit } : {}), ...(open ? { open } : {}), ...(reduced && g ? { guard: g } : {}), ...(burn ? { burn } : {}) });
  };

  for (const p of alive) {
    const a = acts[p];
    if (!a) continue;
    const f = F[p];
    if (a.action === 'strike') hit(p, a.target!, CLASSES[f.cls!].strike, 'strike');
    else if (a.action === 'special') {
      if (f.cls === 'rogue') hit(p, a.target!, RULES.backstab, 'backstab');
      else if (f.cls === 'mage') hit(p, a.target!, RULES.fireball, 'fireball');
      else if (f.cls === 'warrior') {
        hit(p, a.target!, RULES.cleave, 'cleave');
        for (const q of alive) if (q !== p && q !== a.target) hit(p, q, RULES.splash, 'splash');
      }
    }
  }

  for (const p of parried) F[p].energy = Math.min(RULES.maxEnergy, F[p].energy + RULES.parryEnergy);
  for (const p of alive) F[p].hp -= dmg[p];

  // Burns from earlier rounds tick, then fresh burns are lit.
  for (const p of alive) {
    if (burnedBefore[p] > 0) {
      F[p].hp -= RULES.burn;
      F[p].burn = burnedBefore[p] - 1;
      log.push({ k: 'hit', by: null, to: p, n: RULES.burn, via: 'burn' });
    }
    if (burns.has(p)) F[p].burn = RULES.burnRounds;
  }

  const storm = stormDamage(s);
  if (storm) {
    log.push({ k: 'storm', n: storm });
    for (const p of alive) {
      F[p].hp -= storm;
      log.push({ k: 'hit', by: null, to: p, n: storm, via: 'storm' });
    }
  }

  for (const p of alive) {
    const f = F[p];
    f.streak = acts[p]?.action === 'block' ? f.streak + 1 : 0;
    f.stunned = false;
    if (f.hp <= 0) {
      f.alive = false;
      f.fell = round;
      f.hpBefore = s.fighters[p].hp;
      f.hp = 0;
      f.burn = 0;
      log.push({ k: 'ko', to: p });
    }
  }
  // A stunned fighter cannot charge or backstab, so nobody is ever stunned twice in a row.
  for (const p of stuns) {
    if (F[p].alive) {
      F[p].stunned = true;
      log.push({ k: 'stun', to: p });
    }
  }

  const past = { ...s.past };
  for (const p of alive) past[p] = [...(past[p] ?? []), played[p]].slice(-16);

  const over = s.players.filter((p) => F[p].alive).length <= 1;
  const next: ArenaState = { ...s, fighters: F, log, played, past, commits: {}, picks: {} };
  if (over) return { ...next, phase: 'over', deadline: 0 };
  return { ...next, phase: 'result', start: now, deadline: now + resultMs(log) };
}

// --- results and text ------------------------------------------------------------------------------

/**
 * Last one standing first, then by the round they fell (later is better), then by HP at the start
 * of that round. When the last fighters fall together, they share first place.
 */
export function standings(s: ArenaState): PlayerId[][] {
  const anyAlive = s.players.some((q) => s.fighters[q].alive);
  const lastRound = Math.max(0, ...s.players.map((p) => s.fighters[p].fell));
  const key = (p: PlayerId) => {
    const f = s.fighters[p];
    if (f.alive) return `alive:${p}`;
    if (!anyAlive && f.fell === lastRound) return 'last';
    return `${f.fell}:${f.hpBefore}`;
  };
  const order = [...s.players].sort((a, b) => {
    const fa = s.fighters[a], fb = s.fighters[b];
    if (fa.alive !== fb.alive) return fa.alive ? -1 : 1;
    if (fa.alive) return fb.hp - fa.hp;
    if (fa.fell !== fb.fell) return fb.fell - fa.fell;
    if (key(a) === 'last') return 0;
    return fb.hpBefore - fa.hpBefore;
  });
  const groups: PlayerId[][] = [];
  let prev = '';
  for (const p of order) {
    const k = key(p);
    if (groups.length && k === prev) groups[groups.length - 1].push(p);
    else groups.push([p]);
    prev = k;
  }
  return groups;
}

/** One readable line per event, or null for events that are only animated. */
export function describe(e: LogEntry, name: (id: PlayerId) => string, s?: Pick<ArenaState, 'fighters'>): string | null {
  const special = (id: PlayerId) => (s?.fighters[id] ? specialOf(s.fighters[id]).name : 'special');
  switch (e.k) {
    case 'hit': {
      if (e.via === 'storm') return null;
      if (e.via === 'burn') return `${name(e.to)} burns for ${e.n}`;
      if (e.via === 'counter') return `${name(e.by!)} countered ${name(e.to)} for ${e.n}`;
      if (e.via === 'splash') return `${name(e.by!)}'s Cleave caught ${name(e.to)} for ${e.n}`;
      const what = e.via === 'strike' ? `${name(e.by!)} struck ${name(e.to)}` : `${name(e.by!)}'s ${special(e.by!)} hit ${name(e.to)}`;
      const extra = [e.crit && 'critical!', e.open && 'caught charging', e.guard === 'full' && 'half blocked', e.guard === 'half' && 'through a tired block', e.burn && 'burning']
        .filter(Boolean)
        .join(', ');
      return `${what} for ${e.n}${extra ? ` (${extra})` : ''}`;
    }
    case 'parry':
      return e.via === 'backstab' ? `${name(e.by)} blocked ${name(e.from)}'s Backstab` : `${name(e.by)} blocked ${name(e.from)}'s strike`;
    case 'charge':
      return `${name(e.by)} charged up (${e.energy} energy)`;
    case 'heal':
      return e.n ? `${name(e.by)} mended ${e.n} HP` : `${name(e.by)} cast Mend at full HP`;
    case 'stun':
      return `${name(e.to)} is stunned next round`;
    case 'broken':
      return `${name(e.by)} blocked too often: guard broken`;
    case 'auto':
      return `${name(e.by)} ran out of time and blocked`;
    case 'idle':
      return `${name(e.by)} was stunned and could not act`;
    case 'storm':
      return `The arena shrinks! Everyone takes ${e.n}`;
    case 'ko':
      return `${name(e.to)} is knocked out!`;
  }
}

// --- computer players -----------------------------------------------------------------------------

type Dist = Record<Action, number>;

/** How likely an opponent is to do each thing this round, before looking at their habits. */
function prior(f: Fighter): Dist {
  const rich = f.energy >= specialOf(f).cost;
  const d: Dist = rich ? { strike: 0.3, block: 0.2, charge: 0.15, special: 0.35 } : { strike: 0.45, block: 0.25, charge: 0.3, special: 0 };
  if (f.energy >= RULES.maxEnergy) d.charge = 0.02;
  if (f.cls === 'cleric' && f.hp > f.maxHp - 10) d.special = 0.03;
  if (f.streak >= 1) d.block *= f.streak >= 2 ? 0.1 : 0.4;
  const sum = d.strike + d.block + d.charge + d.special;
  return { strike: d.strike / sum, block: d.block / sum, charge: d.charge / sum, special: d.special / sum };
}

/** Hard bots blend the prior with what this fighter actually did in the same situation. */
function predict(s: ArenaState, o: PlayerId, habits: boolean): Dist {
  const f = s.fighters[o];
  const base = prior(f);
  if (!habits) return base;
  const rich = f.energy >= specialOf(f).cost;
  const counts: Dist = { strike: 0, block: 0, charge: 0, special: 0 };
  let total = 0;
  const hist = s.past[o] ?? [];
  hist.forEach((h, i) => {
    if (h.a === 'stunned') return;
    const w = Math.pow(0.85, hist.length - 1 - i) * (h.rich === rich ? 1 : 0.35);
    counts[h.a] += w;
    total += w;
  });
  if (total === 0) return base;
  const k = 2;
  const d = {} as Dist;
  for (const a of ACTIONS) d[a] = (base[a] * k + counts[a]) / (k + total);
  if (!rich) {
    d.strike += d.special;
    d.special = 0;
  }
  // Guards weaken when repeated, and players know it.
  if (f.streak >= 1) {
    const cut = d.block * (f.streak >= 2 ? 0.7 : 0.35);
    d.block -= cut;
    d.strike += cut;
  }
  return d;
}

/** Chance that `o` aims a targeted attack at `me`. */
function aimAt(s: ArenaState, o: PlayerId, me: PlayerId, habits: boolean): number {
  const foes = foesOf(s, o);
  if (foes.length <= 1) return 1;
  const weight = (p: PlayerId) => 1 + 1.2 * (1 - s.fighters[p].hp / s.fighters[p].maxHp);
  const base = weight(me) / foes.reduce((n, p) => n + weight(p), 0);
  if (!habits) return base;
  const aimed = (s.past[o] ?? []).filter((h) => h.t && s.fighters[h.t]?.alive);
  if (!aimed.length) return base;
  let mine = 0, total = 0;
  aimed.forEach((h, i) => {
    const w = Math.pow(0.8, aimed.length - 1 - i);
    total += w;
    if (h.t === me) mine += w;
  });
  return (base * 1.5 + mine) / (1.5 + total);
}

/** Roughly how much damage one point of energy is worth to each class, used to value Charge. */
function energyValue(f: Fighter) {
  if (f.cls === 'cleric') return 3 + 7 * (1 - f.hp / f.maxHp);
  return f.cls === 'mage' ? 7 : f.cls === 'rogue' ? 6 : 5.5;
}

type HitVia = 'strike' | 'backstab' | 'fireball' | 'cleave' | 'splash';

/** Expected value of one attack on `t`, given how `t` is likely to act. */
function expectedHit(by: Fighter, t: Fighter, base: number, via: HitVia, d: Dist) {
  const crit = via === 'cleave' || via === 'splash' ? 1 : 1 + (RULES.critMult - 1) * CLASSES[by.cls!].crit;
  const g = via === 'cleave' || via === 'splash' ? null : guardOf(t);
  const strikeLike = via === 'strike' || via === 'backstab';
  const parried = strikeLike && g === 'full' ? d.block : 0;
  let dealt = 0;
  let backfire = 0;
  if (parried) backfire += parried * (via === 'backstab' ? 16 : RULES.counter + energyValue(t));
  else dealt += d.block * base * crit * (g === 'full' || (g === 'half' && strikeLike) ? 0.5 : 1);
  dealt += d.charge * base * crit * RULES.openMult;
  dealt += (d.strike + d.special) * base * crit;
  let bonus = 0;
  if (via === 'fireball') bonus += (1 - (g === 'full' ? d.block : 0)) * RULES.burn * RULES.burnRounds * 0.8;
  if (via === 'cleave') bonus += d.charge * 10;
  // Knocking someone out is worth a lot more than the damage alone.
  if (base * crit >= t.hp) bonus += 30 * (1 - parried);
  return Math.min(dealt, t.hp + 5) - backfire + bonus;
}

/** What `o` would do to `me` with a special this round, given my action. */
function incomingSpecial(of: Fighter, aim: number, g: Guard | null, open: number, charging: boolean): number {
  const oi = CLASSES[of.cls!];
  const crit = 1 + (RULES.critMult - 1) * oi.crit;
  if (of.cls === 'warrior') return aim * (RULES.cleave * open + (charging ? 12 : 0)) + (1 - aim) * RULES.splash * open;
  if (of.cls === 'mage') return aim * (RULES.fireball * crit * open * (g === 'full' ? 0.5 : 1) + (g === 'full' ? 0 : 8));
  if (of.cls === 'rogue') return g === 'full' ? -aim * 10 : aim * RULES.backstab * crit * open * (g === 'half' ? 0.5 : 1);
  return 0;
}

/** Scores one pick for `me`: damage dealt and energy gained, minus damage it is likely to take. */
function scorePick(s: ArenaState, me: PlayerId, pick: ArenaPick, preds: Record<PlayerId, Dist>, aims: Record<PlayerId, number>): number {
  const f = s.fighters[me];
  const foes = foesOf(s, me);
  const room = RULES.maxEnergy - f.energy;
  const ev = energyValue(f);
  let value = 0;
  if (pick.action === 'strike') {
    value += expectedHit(f, s.fighters[pick.target!], CLASSES[f.cls!].strike, 'strike', preds[pick.target!]);
  } else if (pick.action === 'special') {
    value -= specialOf(f).cost * ev * 0.7;
    const t = pick.target ? s.fighters[pick.target] : null;
    if (f.cls === 'rogue') value += expectedHit(f, t!, RULES.backstab, 'backstab', preds[t!.id]);
    else if (f.cls === 'mage') value += expectedHit(f, t!, RULES.fireball, 'fireball', preds[t!.id]);
    else if (f.cls === 'warrior') {
      value += expectedHit(f, t!, RULES.cleave, 'cleave', preds[t!.id]);
      for (const q of foes) if (q !== t!.id) value += expectedHit(f, s.fighters[q], RULES.splash, 'splash', preds[q]);
    } else value += Math.min(RULES.heal, f.maxHp - f.hp) * 1.1 + f.burn * RULES.burn;
  } else if (pick.action === 'charge') {
    value += Math.min(CLASSES[f.cls!].charge, room) * ev;
  }

  // Incoming damage, weighted more heavily when low.
  const danger = 1 + (1 - f.hp / f.maxHp);
  const g = pick.action === 'block' ? guardOf(f) : pick.action === 'special' && f.cls === 'cleric' ? 'full' : null;
  const charging = pick.action === 'charge';
  const open = charging ? RULES.openMult : 1;
  let taken = 0;
  let parries = 0;
  let lethal = 0;
  // What is left after this round's burn and the shrinking arena.
  const life = f.hp - (f.burn && !(pick.action === 'special' && f.cls === 'cleric') ? RULES.burn : 0) - stormDamage(s) + (pick.action === 'special' && f.cls === 'cleric' ? RULES.heal : 0);
  for (const o of foes) {
    const of = s.fighters[o];
    if (of.stunned) continue;
    const d = preds[o];
    const aim = aims[o];
    const crit = 1 + (RULES.critMult - 1) * CLASSES[of.cls!].crit;
    const pStrike = d.strike * aim;
    const strikeHit = CLASSES[of.cls!].strike * crit * open * (g === 'half' ? 0.5 : 1);
    if (g === 'full') parries += pStrike;
    else {
      taken += pStrike * strikeHit;
      if (strikeHit >= life) lethal += pStrike;
    }
    const special = incomingSpecial(of, aim, g, open, charging);
    taken += d.special * special;
    if (aim > 0 && special / aim >= life) lethal += d.special * aim;
  }
  value -= taken * danger;
  // Trading blows to the death only earns a shared place at best, so a low fighter plays safer.
  value -= 45 * Math.min(1, lethal);
  if (parries) value += Math.min(1, parries) * (RULES.counter + ev * Math.min(1, room)) + Math.max(0, parries - 1) * RULES.counter;
  if (g === 'none') value -= 3;
  return value;
}

export function legalPicks(s: ArenaState, me: PlayerId): ArenaPick[] {
  const f = s.fighters[me];
  const foes = foesOf(s, me);
  const out: ArenaPick[] = [{ action: 'block' }, { action: 'charge' }];
  for (const t of foes) out.push({ action: 'strike', target: t });
  if (f.energy >= specialOf(f).cost) {
    if (specialOf(f).target) for (const t of foes) out.push({ action: 'special', target: t });
    else out.push({ action: 'special' });
  }
  return out;
}

/** The computer's pick for this round. Runs inside `apply`, so nobody can see it early. */
export function botPick(s: ArenaState, me: PlayerId, level: BotLevel, rand: () => number): ArenaPick {
  const f = s.fighters[me];
  const options = legalPicks(s, me);
  const foes = foesOf(s, me);
  const anyFoe = () => foes[Math.floor(rand() * foes.length)];
  if (level === 'easy') {
    // Mostly random, with a soft spot for whatever is affordable and flashy.
    const r = rand();
    const specials = options.filter((o) => o.action === 'special');
    if (specials.length && r < 0.3) return specials[Math.floor(rand() * specials.length)];
    if (r < 0.6) return { action: 'strike', target: anyFoe() };
    if (r < 0.8) return { action: 'block' };
    return f.energy < RULES.maxEnergy ? { action: 'charge' } : { action: 'strike', target: anyFoe() };
  }
  const habits = level === 'hard';
  const preds: Record<PlayerId, Dist> = {};
  const aims: Record<PlayerId, number> = {};
  for (const o of foes) {
    preds[o] = predict(s, o, habits);
    aims[o] = aimAt(s, o, me, habits);
  }
  const scored = options.map((p) => ({ p, v: scorePick(s, me, p, preds, aims) + (rand() - 0.5) * (habits ? 3 : 8) }));
  scored.sort((a, b) => b.v - a.v);
  // Medium sometimes settles for its second idea; hard plays its best read.
  if (!habits && scored.length > 1 && rand() < 0.25) return scored[1].p;
  return scored[0].p;
}

/** Fraction of the timer a bot waits before locking in, so it feels like a person. */
const BOT_WHEN: Record<BotLevel, [number, number]> = { easy: [0.3, 0.85], medium: [0.2, 0.7], hard: [0.15, 0.6] };

function botReady(s: ArenaState, player: PlayerId, level: BotLevel, now: number, total: number, ids: PlayerId[], done: (p: PlayerId) => boolean) {
  const [lo, hi] = BOT_WHEN[level];
  let when = lo + (hi - lo) * hash01(`${s.phase}:${s.round}:${player}`);
  // Once every person has locked in, the computer players do not keep them waiting long.
  if (ids.filter((p) => !s.bots[p]).every(done)) when *= 0.3;
  return (now - s.start) / total >= when;
}

// --- the game --------------------------------------------------------------------------------------

export const arena: GameDef<ArenaState, ArenaMove, ArenaConfig> = {
  id: 'arena',
  minPlayers: 2,
  maxPlayers: 8,
  selfTimed: true,
  defaultConfig: { seconds: 10, length: 'normal' },
  setup(players, config, { now }) {
    const length: Length = config.length === 'short' || config.length === 'long' ? config.length : 'normal';
    const ids = players.map((p) => p.id);
    return {
      players: ids,
      bots: Object.fromEntries(players.filter((p) => p.bot).map((p) => [p.id, p.bot!])),
      fighters: Object.fromEntries(ids.map((p) => [p, makeFighter(p)])),
      phase: 'class',
      round: 0,
      seconds: Math.min(30, Math.max(5, Number(config.seconds) || 10)),
      length,
      suddenDeath: LENGTHS[length].suddenDeath,
      start: now,
      deadline: now + CLASS_MS,
      commits: {},
      picks: {},
      log: [],
      played: {},
      past: Object.fromEntries(ids.map((p) => [p, []]))
    };
  },
  actors(s) {
    if (s.phase === 'class') return s.players.filter((p) => !s.fighters[p].cls);
    if (s.phase === 'choose') return pickers(s).filter((p) => !s.commits[p]);
    if (s.phase === 'reveal') return pickers(s).filter((p) => s.commits[p] && !s.picks[p]);
    return [];
  },
  validate(s, player, move) {
    const f = s.fighters[player];
    if (!f) return 'You are not playing.';
    switch (move?.type) {
      case 'class':
        if (s.phase !== 'class') return 'Fighters are already chosen.';
        if (f.cls) return 'You already chose.';
        return CLASS_IDS.includes(move.cls) ? null : 'Unknown class.';
      case 'bot':
        if (!s.bots[player]) return 'Picks must be sealed first.';
        if (s.phase !== 'choose') return 'Wait for the next round.';
        if (s.commits[player]) return 'Already locked in.';
        return f.alive && !f.stunned ? null : 'You cannot act this round.';
      case 'commit':
        if (s.phase !== 'choose') return 'Too late for this round.';
        if (!f.alive) return 'You are out.';
        if (f.stunned) return 'You are stunned this round.';
        return typeof move.hash === 'string' && move.hash.length === 64 ? null : 'Bad seal.';
      case 'reveal': {
        if (s.phase !== 'reveal') return 'Nothing to reveal yet.';
        const c = s.commits[player];
        if (!c || s.picks[player]) return 'Nothing to reveal.';
        if (commitHash(move.action, move.target, String(move.salt)) !== c) return 'That does not match what you locked in.';
        return checkPick(s, player, move.action, move.target);
      }
      default:
        return 'Unknown move.';
    }
  },
  apply(s, player, move, { rng, now }) {
    switch (move.type) {
      case 'class': {
        const n = { ...s, fighters: { ...s.fighters, [player]: { ...s.fighters[player], cls: move.cls } } };
        return n.players.every((p) => n.fighters[p].cls) ? beginFight(n, rng, now) : n;
      }
      case 'bot': {
        const pick = botPick(s, player, s.bots[player], () => rng.next());
        return afterCommit({ ...s, commits: { ...s.commits, [player]: 'bot' }, picks: { ...s.picks, [player]: pick } }, rng, now);
      }
      case 'commit':
        // A new seal replaces the old one while the round is still open.
        return afterCommit({ ...s, commits: { ...s.commits, [player]: move.hash } }, rng, now);
      case 'reveal': {
        const n = { ...s, picks: { ...s.picks, [player]: { action: move.action, target: needsTarget(s.fighters[player], move.action) ? move.target ?? null : null } } };
        // Anyone who never sealed a pick blocks automatically.
        return pickers(n).every((p) => n.picks[p] || !n.commits[p]) ? resolve(n, rng, now) : n;
      }
    }
  },
  deadline(s) {
    return s.phase === 'over' ? null : s.deadline;
  },
  tick(s, { rng, now }) {
    if (s.phase === 'over' || now < s.deadline) return null;
    if (s.phase === 'class') return beginFight(s, rng, now);
    if (s.phase === 'result') return newRound(s, now);
    // Time is up. Whoever sealed a pick still gets to reveal it; everyone else blocks automatically.
    if (s.phase === 'choose' && pickers(s).some((p) => s.commits[p] && !s.picks[p])) return { ...s, phase: 'reveal', deadline: now + REVEAL_MS };
    return resolve(s, rng, now);
  },
  result(s) {
    if (s.phase !== 'over') return null;
    const ranking = standings(s);
    const scores = Object.fromEntries(s.players.map((p) => [p, s.fighters[p].dealt]));
    const top = ranking[0];
    const draw = top.length > 1;
    const w = s.fighters[top[0]];
    const summary = draw
      ? `The last fighters fell together in round ${w.fell} and share the win. Scores are damage dealt.`
      : `Last one standing after ${s.round} rounds: the ${CLASSES[w.cls!].name}, with ${w.hp} HP left. Scores are damage dealt.`;
    return { ranking, scores, draw, summary } satisfies MatchResult;
  },
  view(s, viewer): ArenaView {
    const { commits, ...rest } = s;
    const locked = Object.keys(commits);
    const myCommit = viewer && commits[viewer] && commits[viewer] !== 'bot' ? commits[viewer] : null;
    if (s.phase === 'choose' || s.phase === 'reveal') {
      const own = viewer ? s.picks[viewer] : undefined;
      return { ...rest, picks: own && viewer ? { [viewer]: own } : {}, locked, myCommit };
    }
    return { ...rest, locked, myCommit };
  },
  bot(s, player, level, { rng, now }) {
    const f = s.fighters[player];
    if (!f) return null;
    if (s.phase === 'class') {
      if (f.cls) return null;
      if (!botReady(s, player, level, now, CLASS_MS * 0.6, s.players, (p) => !!s.fighters[p].cls)) return null;
      // Bots spread over the classes so a table of computers is varied.
      const taken = new Set(s.players.map((p) => s.fighters[p].cls).filter(Boolean));
      const fresh = CLASS_IDS.filter((c) => !taken.has(c));
      return { type: 'class', cls: rng.pick(fresh.length ? fresh : CLASS_IDS) };
    }
    if (s.phase !== 'choose' || s.commits[player] || !f.alive || f.stunned) return null;
    if (!botReady(s, player, level, now, s.seconds * 1000, pickers(s), (p) => !!s.commits[p])) return null;
    return { type: 'bot' };
  }
};
