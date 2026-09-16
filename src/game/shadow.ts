// ─────────────────────────────────────────────────────────────
//  SHADOW PROTOCOL — Shadow as a Service (Phase 2)
//  "당신이 없는 동안, 당신의 AI가 당신을 위해 싸운다."
//
//  이 모듈은 비동기 PvP의 **계약(contract)** 을 정의한다.
//  ① ShadowPayload  — 업로드 직렬화 형식 + 무결성 시그니처
//  ② ShadowServer   — 서버 인터페이스 (실서버는 이 계약을 구현한다.
//                      현재는 LocalShadowServer가 localStorage 백엔드로 동작)
//  ③ 시즌 로스터     — 시즌 시드 하나로 커뮤니티 섀도우 전체가 결정론 재현
//  ④ verifyMatch    — 재시뮬 대조 검증 (치팅 원천 차단의 핵심)
//
//  결정론(Phase 0-A) 덕분에 서버는 시뮬레이터를 직접 돌려
//  클라이언트가 보고한 결과를 그대로 검증할 수 있다.
// ─────────────────────────────────────────────────────────────
import type { DNA, RawProfile, Archetype } from './dna';
import { archetypeOf } from './dna';
import { Rng, hashStr } from './rng';
import { simulateMatch, type AiFighter, type MatchResult } from './meta';

// ─────────────────────────────────────────────────────────────
//  ① 페이로드 & 무결성
// ─────────────────────────────────────────────────────────────

/** 업로드되는 섀도우의 직렬화 형식 (수 KB — DNA + 요약 + 시그니처) */
export interface ShadowPayload {
  v: 1;
  name: string;
  owner: string;
  flag: string;
  dna: DNA;
  raw: RawProfile | null;
  rating: number;
  generation: number;
  /** 무결성 시그니처 — payload 내용의 FNV 폴딩 해시 (변조 감지) */
  sig: string;
}

/** 시그니처 계산 — sig 필드를 제외한 모든 내용을 해시 */
export function shadowSig(p: Omit<ShadowPayload, 'sig'>): string {
  const core = JSON.stringify({ v: p.v, name: p.name, owner: p.owner, dna: p.dna, rating: p.rating, generation: p.generation });
  return hashStr(0x811c9dc5, core).toString(16).padStart(8, '0');
}

export function serializeShadow(me: AiFighter): ShadowPayload {
  const base = {
    v: 1 as const, name: me.name, owner: me.owner, flag: me.flag ?? '🧬',
    dna: me.dna, raw: me.raw, rating: me.rating, generation: me.generation,
  };
  return { ...base, sig: shadowSig(base) };
}

/** 시그니처 검증 — 변조된 페이로드는 false */
export function shadowIntact(p: ShadowPayload): boolean {
  const { sig, ...rest } = p;
  return shadowSig(rest) === sig;
}

/** 페이로드 → 엔진 대전용 파이터 */
export function toFighter(p: ShadowPayload): AiFighter {
  const a = archetypeOf(p.dna);
  return {
    id: `shadow-${p.sig}`, name: p.name, owner: p.owner, flag: p.flag,
    dna: p.dna, raw: p.raw, archetype: a.type, archScore: a.score,
    power: 0, wins: 0, losses: 0, rating: p.rating,
    generation: p.generation, isPlayer: false,
  };
}

// ─────────────────────────────────────────────────────────────
//  ② 서버 인터페이스
// ─────────────────────────────────────────────────────────────

/** 매치 검증 결과 — 클라이언트가 보고한 결과가 재시뮬과 일치하는가 */
export interface MatchVerification {
  ok: boolean;
  seed: number;
  reason?: string;
  recalced: MatchResult;
}

/**
 * 서버가 할 일의 원형: 같은 시드로 다시 시뮬레이션해 결과 대조.
 * 결정론 코어(Phase 0-A)가 없으면 이 검증은 불가능하다.
 */
export function verifyMatch(a: AiFighter, b: AiFighter, seed: number, claimed: MatchResult): MatchVerification {
  const recalced = simulateMatch(a, b, seed);
  const ok = recalced.winner === claimed.winner
    && recalced.scoreA === claimed.scoreA
    && recalced.scoreB === claimed.scoreB
    && recalced.rounds === claimed.rounds;
  return {
    ok, seed, recalced,
    reason: ok ? undefined : '재시뮬 결과가 보고와 불일치 — 결과 폐기',
  };
}

export interface ShadowServer {
  /** 내 섀도우 업로드 (버전 갱신) */
  upload(p: ShadowPayload): ShadowPayload;
  /** 리그 풀 조회: 내 섀도우 + 시즌 커뮤니티 로스터 */
  fetchPool(me: ShadowPayload, count: number): ShadowPayload[];
  /** 결과 검증 — 서버 재검증 통과 시에만 true (랭킹 반영 전제) */
  verify(seed: number, claimed: MatchResult, a: ShadowPayload, b: ShadowPayload): boolean;
}

/** 현재 단계의 기본 구현: localStorage 백엔드. 실서버로 교체 가능. */
export class LocalShadowServer implements ShadowServer {
  private key = 'mnb.shadow.v1';

  private loadAll(): ShadowPayload[] {
    try { return JSON.parse(localStorage.getItem(this.key) ?? '[]') as ShadowPayload[]; }
    catch { return []; }
  }
  private saveAll(list: ShadowPayload[]) {
    try { localStorage.setItem(this.key, JSON.stringify(list.slice(0, 12))); } catch { /* noop */ }
  }

  upload(p: ShadowPayload): ShadowPayload {
    const list = this.loadAll().filter((x) => x.owner !== p.owner);
    list.unshift(p);
    this.saveAll(list);
    return p;
  }

  fetchPool(me: ShadowPayload, count: number): ShadowPayload[] {
    const season = generateShadows(SEASON.seed, count);
    const saved = this.loadAll().filter((p) => p.owner !== me.owner && shadowIntact(p));
    return [...saved, ...season].filter((p) => p.name !== me.name);
  }

  verify(seed: number, claimed: MatchResult, a: ShadowPayload, b: ShadowPayload): boolean {
    if (!shadowIntact(a) || !shadowIntact(b)) return false;
    return verifyMatch(toFighter(a), toFighter(b), seed, claimed).ok;
  }
}

// ─────────────────────────────────────────────────────────────
//  ③ 시즌 & 절차적 커뮤니티 로스터
// ─────────────────────────────────────────────────────────────

/** 시즌 상수 — 시즌이 바뀌면 seed가 바뀌고, 커뮤니티 로스터 전체가 새로 생성된다 */
export const SEASON = { n: 1, seed: 0x5eed01 } as const;

const TIERS = [
  { min: 1900, kr: 'GM', en: 'GRANDMASTER', color: '#ff4fa3' },
  { min: 1750, kr: '다이아', en: 'DIAMOND', color: '#5ee7ff' },
  { min: 1550, kr: '플래티넘', en: 'PLATINUM', color: '#b478ff' },
  { min: 1350, kr: '골드', en: 'GOLD', color: '#ffd447' },
  { min: 1150, kr: '실버', en: 'SILVER', color: '#9aa7c7' },
  { min: 0, kr: '브론즈', en: 'BRONZE', color: '#c77d4f' },
] as const;

export function tierOf(rating: number): { kr: string; en: string; color: string } {
  for (const t of TIERS) if (rating >= t.min) return t;
  return TIERS[TIERS.length - 1];
}

// ── 절차적 커뮤니티: 시드 하나가 24명의 "다른 유저들"을 재현한다 ──
const OWNERS = [
  'Kaito', 'Yuna', 'Minseo', 'Alex', 'Noor', 'Bruno', 'Wen', 'Eva', 'Omar', 'Sora',
  'Lia', 'Jin', 'Marta', 'Ravi', 'Chen', 'Dana', 'Paulo', 'Amir', 'Lena', 'Kofi',
  'Saki', 'Theo', 'Nadia', 'Roy',
];
const FLAGS = ['🇯🇵', '🇰🇷', '🇫🇷', '🇺🇸', '🇧🇷', '🇩🇪', '🇸🇬', '🇨🇦', '🇪🇬', '🇸🇪', '🇲🇽', '🇮🇳'];
const AI_PREFIX = ['ARC', 'MIRR', 'VOLT', 'SABLE', 'QUARTZ', 'OBSID', 'LUMEN', 'VESPER', 'HALO', 'CINDER', 'NOVA', 'ECHO'];

/** 8 아키타입 DNA 템플릿 — 커뮤니티 섀도우의 뼈대 */
const TEMPLATES: Record<Archetype, DNA> = {
  RUSHER:           { aggression: 92, defense: 22, repetition: 54, risk: 76, grab: 30, aerial: 30, pressure: 94, counter: 26, zoning: 8, clutch: 82, okizemeLow: 66, cornerEscape: 40, superTiming: 62, panic: 14, frameTrap: 42 },
  COUNTER_HUNTER:   { aggression: 26, defense: 80, repetition: 30, risk: 20, grab: 24, aerial: 12, pressure: 28, counter: 92, zoning: 40, clutch: 60, okizemeLow: 40, cornerEscape: 55, superTiming: 70, panic: 18, frameTrap: 34 },
  THROW_ADDICT:     { aggression: 76, defense: 36, repetition: 60, risk: 62, grab: 94, aerial: 18, pressure: 82, counter: 40, zoning: 6, clutch: 55, okizemeLow: 38, cornerEscape: 44, superTiming: 50, panic: 22, frameTrap: 48 },
  TURTLE_GUARD:     { aggression: 18, defense: 94, repetition: 52, risk: 10, grab: 28, aerial: 8, pressure: 16, counter: 58, zoning: 50, clutch: 40, okizemeLow: 46, cornerEscape: 60, superTiming: 56, panic: 26, frameTrap: 30 },
  PANIC_JUMPER:     { aggression: 58, defense: 32, repetition: 46, risk: 60, grab: 30, aerial: 88, pressure: 44, counter: 24, zoning: 34, clutch: 42, okizemeLow: 60, cornerEscape: 84, superTiming: 40, panic: 92, frameTrap: 20 },
  COMBO_REPEATER:   { aggression: 72, defense: 34, repetition: 94, risk: 48, grab: 32, aerial: 22, pressure: 64, counter: 30, zoning: 22, clutch: 50, okizemeLow: 52, cornerEscape: 46, superTiming: 66, panic: 30, frameTrap: 52 },
  FRAME_TRAP_LOVER: { aggression: 62, defense: 50, repetition: 52, risk: 40, grab: 40, aerial: 10, pressure: 72, counter: 66, zoning: 22, clutch: 58, okizemeLow: 44, cornerEscape: 50, superTiming: 72, panic: 20, frameTrap: 94 },
  RANDOM_TRICKSTER: { aggression: 60, defense: 40, repetition: 6, risk: 86, grab: 44, aerial: 60, pressure: 50, counter: 46, zoning: 36, clutch: 48, okizemeLow: 50, cornerEscape: 62, superTiming: 46, panic: 34, frameTrap: 22 },
};

const ARCH_KEYS = Object.keys(TEMPLATES) as Archetype[];

/**
 * 시즌 커뮤니티 로스터 생성 — 완전 결정론.
 * 같은 seasonSeed → 항상 동일한 24명 (서버·클라이언트가 시드만 공유하면 로스터가 일치).
 */
export function generateShadows(seasonSeed: number, count = 24): ShadowPayload[] {
  const rng = new Rng(seasonSeed);
  const out: ShadowPayload[] = [];
  for (let i = 0; i < count; i++) {
    const arch = ARCH_KEYS[Math.floor(rng.next() * ARCH_KEYS.length)];
    const owner = OWNERS[(i + Math.floor(rng.next() * OWNERS.length)) % OWNERS.length] + `_${100 + Math.floor(rng.next() * 900)}`;
    const flag = FLAGS[Math.floor(rng.next() * FLAGS.length)];
    const name = `${AI_PREFIX[Math.floor(rng.next() * AI_PREFIX.length)]}-${String(101 + Math.floor(rng.next() * 899))}`;
    // rating 분포: 전체 티어에 고르게 — 평준 매칭이 항상 상대를 찾도록
    const rating = 980 + Math.floor(Math.pow(rng.next(), 0.85) * 940);
    const dna: DNA = { ...TEMPLATES[arch] };
    // 지터: 같은 아키타입이라도 조금씩 다른 개성 (±14)
    const keys = Object.keys(dna) as (keyof DNA)[];
    for (const k of keys) {
      dna[k] = Math.max(2, Math.min(98, Math.round(dna[k] + (rng.next() * 2 - 1) * 14)));
    }
    const base = {
      v: 1 as const, name, owner, flag, dna, raw: null,
      rating, generation: 1 + Math.floor(rng.next() * 12),
    };
    out.push({ ...base, sig: shadowSig(base) });
  }
  // 유니크 이름 보장 (중복 시 접미사)
  const seen = new Map<string, number>();
  for (const p of out) {
    const n = (seen.get(p.name) ?? 0) + 1;
    seen.set(p.name, n);
    if (n > 1) p.name = `${p.name}#${n}`;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
//  ④ 평준 매칭 — 레이팅 근접 가중 룰렛 (시드 결정론)
// ─────────────────────────────────────────────────────────────

export function pickOpponent(me: { rating: number }, pool: AiFighter[], seed: number, exclude: Set<string> = new Set()): AiFighter {
  const cands = pool.filter((p) => !exclude.has(p.id));
  if (!cands.length) return pool[Math.abs(seed) % pool.length];
  // 근접 가중(쿼드러틱 감쇠): rating 차 0 → 가중 1, 360 → 0.2, 720+ → ~0
  const weights = cands.map((p) => {
    const d = Math.abs(p.rating - me.rating) / 180;
    return 1 / (1 + d * d);
  });
  const tot = weights.reduce((a, b) => a + b, 0);
  let t = new Rng(seed).next() * tot;
  for (let i = 0; i < cands.length; i++) {
    t -= weights[i];
    if (t <= 0) return cands[i];
  }
  return cands[cands.length - 1];
}