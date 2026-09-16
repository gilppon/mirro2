// ─────────────────────────────────────────────────────────────
//  META LAYER — AI 파이터 저장 / 비동기 PvP / 랭킹
//  플레이어가 접속하지 않아도 AI는 남아서 계속 싸운다.
// ─────────────────────────────────────────────────────────────
import { Engine } from './engine';
import { DnaBot } from './dnaBot';
import {
  archetypeOf, computeDNA, emptyRaw, powerOf,
  type Archetype, type DNA, type RawProfile,
} from './dna';

export interface AiFighter {
  id: string;
  name: string;
  owner: string;
  dna: DNA;
  raw: RawProfile | null;
  archetype: Archetype;
  archScore: number;
  power: number;
  wins: number;
  losses: number;
  rating: number;
  generation: number;
  isPlayer: boolean;
  flag?: string;
}

export interface MatchResult {
  a: string; b: string;
  winner: 'a' | 'b';
  scoreA: number; scoreB: number;
  dmgA: number; dmgB: number;
  rounds: number;
  log: string[];
}

export interface OfflineReport {
  challenges: number;
  wins: number;
  losses: number;
  ratingDelta: number;
  newRivals: string[];
  highlights: string[];
}

export const TRAIN_TARGET = 220;   // AI 생성에 필요한 행동 샘플

const D = (o: Partial<DNA>): DNA => ({
  aggression: 50, defense: 50, counter: 50, grab: 30, pressure: 50, risk: 50,
  repetition: 45, zoning: 30, aerial: 25, clutch: 50, okizemeLow: 45,
  cornerEscape: 45, superTiming: 50, panic: 30, frameTrap: 35, ...o,
});

// ── 세계 랭킹 AI 로스터 (8 아키타입 전부 대표)
export const RIVALS: AiFighter[] = [
  mkRival('AI-VOLT', 'Kaito', '🇯🇵', D({ aggression: 94, pressure: 95, defense: 12, risk: 78, grab: 34, repetition: 56, counter: 30, zoning: 6, clutch: 88, okizemeLow: 72, panic: 14, frameTrap: 40 }), 1840),
  mkRival('AI-SABLE', 'Noor', '🇫🇷', D({ aggression: 24, defense: 84, counter: 93, risk: 20, grab: 22, pressure: 24, repetition: 28, zoning: 42, panic: 18, frameTrap: 30 }), 1795),
  mkRival('AI-SNARE', 'Wen', '🇸🇬', D({ frameTrap: 94, pressure: 72, counter: 66, aggression: 62, defense: 48, repetition: 50, grab: 40, aerial: 10, zoning: 22 }), 1740),
  mkRival('AI-MAW', 'Bruno', '🇧🇷', D({ grab: 95, aggression: 74, pressure: 84, defense: 32, risk: 66, repetition: 62, zoning: 4, okizemeLow: 38, panic: 22 }), 1668),
  mkRival('AI-NULL', 'Eva', '🇩🇪', D({ repetition: 6, aerial: 62, risk: 86, aggression: 60, counter: 46, defense: 38, grab: 44, zoning: 36, panic: 34, frameTrap: 22 }), 1602),
  mkRival('AI-BASTION', 'Omar', '🇪🇬', D({ defense: 96, aggression: 16, counter: 60, risk: 8, pressure: 12, grab: 28, repetition: 54, zoning: 52, aerial: 6, panic: 26 }), 1544),
  mkRival('AI-LOOP', 'Sora', '🇰🇷', D({ repetition: 95, aggression: 70, pressure: 64, defense: 34, counter: 30, risk: 48, grab: 32, frameTrap: 52 }), 1490),
  mkRival('AI-FLIGHT', 'Lia', '🇨🇦', D({ panic: 92, aerial: 88, aggression: 56, defense: 30, counter: 22, pressure: 40, risk: 62, repetition: 48, cornerEscape: 84 }), 1380),
];

function mkRival(name: string, owner: string, flag: string, dna: DNA, rating: number): AiFighter {
  const a = archetypeOf(dna);
  return {
    id: name, name, owner, flag, dna, raw: null,
    archetype: a.type, archScore: a.score, power: powerOf(dna),
    wins: Math.round(rating / 22), losses: Math.round(rating / 38),
    rating, generation: 1, isPlayer: false,
  };
}

export function buildPlayerAi(raw: RawProfile, name: string, generation: number, prev?: AiFighter): AiFighter {
  const dna = computeDNA(raw);
  const a = archetypeOf(dna);
  return {
    id: 'player-ai',
    name,
    owner: 'YOU',
    flag: '🧬',
    dna, raw,
    archetype: a.type, archScore: a.score,
    power: powerOf(dna),
    wins: prev?.wins ?? 0,
    losses: prev?.losses ?? 0,
    rating: prev?.rating ?? 1200,
    generation,
    isPlayer: true,
  };
}

export function botOf(f: AiFighter, seed: number): DnaBot {
  return new DnaBot(f.dna, seed, f.raw);
}

// ── 헤드리스 시뮬레이션: 실제 엔진을 그대로 돌린다
export function simulateMatch(a: AiFighter, b: AiFighter, seed: number): MatchResult {
  const eng = new Engine();
  eng.setDeterminism(seed);   // 같은 시드 → 항상 같은 경기 (리그 재현·서버 재검증의 전제)
  eng.setupAiMatch(botOf(a, seed), botOf(b, seed ^ 0x9e3779b9), [a.name, b.name], true);
  let guard = 0;
  while (eng.phase !== 'matchEnd' && guard < 26000) {
    eng.step({ moveDir: 0, dash: 0, jump: false, crouch: false, block: false, attack: null });
    if (eng.phase === 'roundEnd') eng.phaseTimer = 0;
    if (eng.phase === 'intro') eng.phaseTimer = 0;
    guard++;
  }
  const winner = eng.wins[0] > eng.wins[1] ? 'a' : 'b';
  const log: string[] = [];
  log.push(`${a.name} ${eng.wins[0]} : ${eng.wins[1]} ${b.name}`);
  log.push(`가한 피해 ${eng.stats.dmgDealt.toFixed(0)} / 받은 피해 ${eng.stats.dmgTaken.toFixed(0)}`);
  log.push(`최대 콤보 ${eng.stats.maxCombo}HIT · 캔슬 ${eng.stats.cancels}회`);
  return {
    a: a.name, b: b.name, winner,
    scoreA: eng.wins[0], scoreB: eng.wins[1],
    dmgA: eng.stats.dmgDealt, dmgB: eng.stats.dmgTaken,
    rounds: eng.round, log,
  };
}

// ── 접속하지 않은 동안의 도전 처리
export function runOffline(me: AiFighter, pool: AiFighter[], count: number, seed: number): OfflineReport {
  let wins = 0, losses = 0;
  const highlights: string[] = [];
  for (let i = 0; i < count; i++) {
    const opp = pool[(seed + i * 7) % pool.length];
    const r = simulateMatch(me, opp, seed + i * 131);
    if (r.winner === 'a') {
      wins++;
      if (r.scoreB === 0 && highlights.length < 3) highlights.push(`${opp.name} 상대 퍼펙트 2:0 방어`);
    } else {
      losses++;
      if (r.scoreA === 0 && highlights.length < 3) highlights.push(`${opp.name}에게 0:2 완패 — 약점 노출`);
    }
  }
  const ratingDelta = wins * 14 - losses * 11;
  const names = ['AI-RIFT', 'AI-QUARTZ', 'AI-OBSIDIAN', 'AI-LUMEN', 'AI-VESPER', 'AI-HALO'];
  const newRivals = names
    .slice(seed % 3, (seed % 3) + (1 + (seed % 3)))
    .map((n) => n);
  return { challenges: count, wins, losses, ratingDelta, newRivals, highlights };
}

// ── 저장소
const KEY = 'mnb.save.v1';

export interface SaveData {
  raw: RawProfile;
  ai: AiFighter | null;
  generation: number;
  history: { gen: number; dna: DNA; at: number }[];
  lastSeen: number;
  rivalRatings: Record<string, number>;
  simulaXp: number;
}

export function loadSave(): SaveData {
  try {
    const s = localStorage.getItem(KEY);
    if (s) {
      const d = JSON.parse(s) as SaveData;
      if (d && d.raw) {
        // 누락 필드 보정
        const base = emptyRaw();
        d.raw = { ...base, ...d.raw };
        if (!Array.isArray(d.raw.byBucket)) d.raw.byBucket = base.byBucket;
        d.history = d.history ?? [];
        d.rivalRatings = d.rivalRatings ?? {};
        d.simulaXp = d.simulaXp ?? 0;
        return d;
      }
    }
  } catch { /* noop */ }
  return { raw: emptyRaw(), ai: null, generation: 0, history: [], lastSeen: Date.now(), rivalRatings: {}, simulaXp: 0 };
}

export function persist(d: SaveData) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* noop */ }
}

export function mergeRaw(base: RawProfile, add: RawProfile, decay = 0.82): RawProfile {
  // 오래된 습관은 서서히 옅어지고 새 플레이가 성향을 바꾼다 (재훈련 → 진화)
  const out = emptyRaw();
  const num = (x: number, y: number) => x * decay + y;
  const rec = (A: Record<string, number>, B: Record<string, number>) => {
    const o: Record<string, number> = {};
    for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) o[k] = (A[k] ?? 0) * decay + (B[k] ?? 0);
    return o;
  };
  out.actions = rec(base.actions, add.actions);
  out.okizeme = rec(base.okizeme, add.okizeme);
  out.lowHpActs = rec(base.lowHpActs, add.lowHpActs);
  out.corneredActs = rec(base.corneredActs, add.corneredActs);
  out.bigrams = rec(base.bigrams, add.bigrams);
  out.routes = rec(base.routes, add.routes);
  out.pressureActs = rec(base.pressureActs ?? {}, add.pressureActs ?? {});
  out.wakeupActs = rec(base.wakeupActs ?? {}, add.wakeupActs ?? {});
  out.postHitActs = rec(base.postHitActs ?? {}, add.postHitActs ?? {});
  out.postBlockActs = rec(base.postBlockActs ?? {}, add.postBlockActs ?? {});
  out.trigrams = rec(base.trigrams ?? {}, add.trigrams ?? {});
  out.punished = rec(base.punished ?? {}, add.punished ?? {});
  out.used = rec(base.used ?? {}, add.used ?? {});
  out.predictedBy = rec(base.predictedBy ?? {}, add.predictedBy ?? {});
  out.byBucket = base.byBucket.map((arr, i) => {
    const other = add.byBucket[i] ?? [];
    const len = Math.max(arr.length, other.length);
    const o: number[] = [];
    for (let j = 0; j < len; j++) o.push((arr[j] ?? 0) * decay + (other[j] ?? 0));
    return o;
  });
  const keys: (keyof RawProfile)[] = [
    'counterActs', 'totalActs', 'superHpSum', 'superCount', 'superOppHpSum',
    'hits', 'whiffs', 'blocked', 'taken', 'dealt', 'rounds', 'matches',
    'frames', 'nearFrames', 'farFrames', 'blockFrames', 'cancels',
  ];
  for (const k of keys) (out[k] as number) = num(base[k] as number, add[k] as number);
  out.maxCombo = Math.max(base.maxCombo, add.maxCombo);
  return out;
}
