// ─────────────────────────────────────────────────────────────
//  REPLAY ANALYSIS — 과거의 나와 지금의 나를 비교한다
// ─────────────────────────────────────────────────────────────
import type { DNA } from './dna';

export interface ReplayEvent {
  f: number;              // 프레임
  t: 'act' | 'read' | 'break' | 'hit' | 'taken' | 'ko';
  a?: string;             // 행동
  v?: number;             // 값 (데미지 등)
  conf?: number;
}

export interface Replay {
  id: string;
  at: number;
  mode: string;           // TRAINING / MIRROR / DUNGEON 3F ...
  result: 'win' | 'lose';
  score: string;
  durationF: number;
  stageLv: number;
  stageKr: string;
  dna: DNA;
  archetype: string;
  archScore: number;
  reads: number;
  breaks: number;
  worstStreak: number;
  accuracy: number;
  dmgDealt: number;
  dmgTaken: number;
  maxCombo: number;
  cause: string | null;
  events: ReplayEvent[];
  pinned?: boolean;
}

const KEY = 'mnb.replays';

export function loadReplays(): Replay[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}

export function saveReplays(list: Replay[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* noop */ }
}

/** 슬롯 한도에 맞춰 저장 (고정된 리플레이는 유지) */
export function pushReplay(list: Replay[], r: Replay, slots: number): Replay[] {
  const next = [r, ...list];
  const pinned = next.filter((x) => x.pinned);
  const rest = next.filter((x) => !x.pinned);
  const room = Math.max(0, slots - pinned.length);
  return [...pinned, ...rest.slice(0, room)].sort((a, b) => b.at - a.at);
}

export interface ReplayDiff {
  key: keyof DNA;
  kr: string;
  before: number;
  after: number;
  delta: number;
}

const CMP: { key: keyof DNA; kr: string }[] = [
  { key: 'aggression', kr: '공격성' }, { key: 'defense', kr: '방어성' },
  { key: 'repetition', kr: '반복성' }, { key: 'grab', kr: '잡기 의존' },
  { key: 'aerial', kr: '점프 의존' }, { key: 'panic', kr: '패닉 지수' },
  { key: 'counter', kr: '카운터' }, { key: 'pressure', kr: '압박 지속' },
];

export function diffReplays(a: Replay, b: Replay): ReplayDiff[] {
  return CMP.map(({ key, kr }) => {
    const before = a.dna[key] ?? 0;
    const after = b.dna[key] ?? 0;
    return { key, kr, before, after, delta: after - before };
  }).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
}

/** 이벤트를 구간별 밀도로 압축 (타임라인 시각화용) */
export function timeline(r: Replay, buckets = 48): { act: number; read: number; hit: number; taken: number }[] {
  const out = Array.from({ length: buckets }, () => ({ act: 0, read: 0, hit: 0, taken: 0 }));
  const span = Math.max(1, r.durationF);
  for (const e of r.events) {
    const i = Math.min(buckets - 1, Math.floor((e.f / span) * buckets));
    if (e.t === 'act') out[i].act++;
    else if (e.t === 'read') out[i].read++;
    else if (e.t === 'hit') out[i].hit++;
    else if (e.t === 'taken') out[i].taken++;
  }
  return out;
}

/** 가장 자주 나온 행동 Top N */
export function topActions(r: Replay, n = 5): { a: string; c: number }[] {
  const m = new Map<string, number>();
  for (const e of r.events) if (e.t === 'act' && e.a) m.set(e.a, (m.get(e.a) ?? 0) + 1);
  return [...m.entries()].map(([a, c]) => ({ a, c })).sort((x, y) => y.c - x.c).slice(0, n);
}
