import { describe, it, expect } from 'vitest';
import { humanLikeness, humanLikenessLabel } from './humanlikeness';
import { computeDNA, emptyRaw, type RawProfile } from './dna';

/** RawProfile에 행동 기록을 시뮬레이션으로 채우는 헬퍼 */
function seedRaw(over: Partial<RawProfile> = {}): RawProfile {
  const r = emptyRaw();
  r.frames = 3600; r.nearFrames = 1200; r.farFrames = 1400;
  r.hits = 60; r.whiffs = 18; r.blocked = 22;
  r.totalActs = 94;   // 40+22+18+8+6
  r.routes = { 'light>heavy': 12, 'low>grab': 8, 'light>light>heavy': 5 };
  for (const k of ['light', 'heavy', 'low', 'grab', 'wave']) r.actions[k] = 0;
  r.actions.light = 40; r.actions.heavy = 22; r.actions.low = 18; r.actions.grab = 8; r.actions.wave = 6;
  return { ...r, ...over };
}

describe('humanLikeness', () => {
  it('데이터가 충분한 균형 잡힌 플레이는 중상 점수가 나온다', () => {
    const raw = seedRaw();
    raw.okizeme = { light: 10, grab: 6, block: 4 };
    raw.lowHpActs = { heavy: 8, wave: 5, low: 3 };
    raw.corneredActs = { dashB: 6, block: 5, light: 3 };
    raw.pressureActs = { block: 8, dashB: 5, light: 2 };
    const dna = computeDNA(raw);
    const hl = humanLikeness(dna, raw);
    expect(hl.enough).toBe(true);
    expect(hl.confidence).toBeGreaterThan(0);
    expect(hl.score).toBeGreaterThan(40);
    expect(hl.score).toBeLessThanOrEqual(100);
    expect(hl.parts).toHaveLength(5);
  });

  it('완전 고정된 분포(단일 행동)는 행동 다양성이 낮다', () => {
    const raw = seedRaw();
    raw.actions = { light: 200 };
    raw.routes = { 'light>light': 30 };
    const dna = computeDNA(raw);
    const hl = humanLikeness(dna, raw);
    const ent = hl.parts.find((p) => p.key === 'entropy')!;
    expect(ent.score).toBeLessThan(35);
  });

  it('상황별 분포가 기본 분포와 동일하면 적응 점수가 낮다', () => {
    const raw = seedRaw();
    // 상황별 분포를 기본 분포와 동일하게 복제 → 적응 없음
    const clone = { ...raw.actions };
    raw.okizeme = { ...clone };
    raw.lowHpActs = { ...clone };
    raw.corneredActs = { ...clone };
    raw.pressureActs = { ...clone };
    const dna = computeDNA(raw);
    const hl = humanLikeness(dna, raw);
    const adapt = hl.parts.find((p) => p.key === 'adaptation')!;
    expect(adapt.score).toBeLessThan(30);
  });

  it('헛스윙이 전혀 없으면 실수 지표가 낮다 (기계적)', () => {
    const raw = seedRaw({ whiffs: 0 });
    const dna = computeDNA(raw);
    const hl = humanLikeness(dna, raw);
    const whiff = hl.parts.find((p) => p.key === 'whiff')!;
    expect(whiff.score).toBeLessThan(50);
  });

  it('데이터가 부족하면 enough=false', () => {
    const raw = seedRaw({ totalActs: 10 });
    const dna = computeDNA(raw);
    const hl = humanLikeness(dna, raw);
    expect(hl.enough).toBe(false);
    expect(humanLikenessLabel(hl)).toBe('데이터 부족');
  });

  it('결정론적 — 같은 입력이면 같은 점수', () => {
    const raw = seedRaw();
    const a = humanLikeness(computeDNA(raw), raw);
    const b = humanLikeness(computeDNA(raw), raw);
    expect(a.score).toBe(b.score);
    expect(a.parts.map((p) => p.score)).toEqual(b.parts.map((p) => p.score));
  });
});