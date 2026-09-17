// ─────────────────────────────────────────────────────────────
//  SEASON & SHADOW URL TESTS — Phase 4 (C-4, C-5)
//  1) 시즌 보상 체계 (티어별 코스메틱, No Pay-to-Win)
//  2) 섀도우 공유 URL (base64 round-trip)
// ─────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import {
  SEASON, tierOf, seasonRewards, SEASON_REWARDS, generateShadows,
  encodeShadowUrl, decodeShadowUrl,
} from './shadow';
import { CATALOG } from './store';

describe('Season System (C-4)', () => {
  it('시즌 상수가 결정론 시드를 갖는다', () => {
    expect(SEASON.n).toBe(1);
    expect(SEASON.seed).toBe(0x5eed01);
  });

  it('티어 경계가 올바르게 매겨진다 (1800 → 다이아, 800 → 브론즈)', () => {
    expect(tierOf(1900).en).toBe('GRANDMASTER');
    expect(tierOf(1800).en).toBe('DIAMOND');
    expect(tierOf(1350).en).toBe('GOLD');
    expect(tierOf(1000).en).toBe('BRONZE');
    expect(tierOf(0).en).toBe('BRONZE');
  });

  it('브론즈 티어(첫 등급) 보상을 획득한다', () => {
    const rewards = seasonRewards(200);  // 브론즈
    expect(rewards.length).toBeGreaterThan(0);
    expect(rewards.some((r) => r.itemId === 'skin.mercury')).toBe(true);
  });

  it('GM 티어 보상을 모두 획득한다', () => {
    const rewards = seasonRewards(2000);  // GM
    expect(rewards).toHaveLength(SEASON_REWARDS.length);
  });

  it('시즌 보상 아이템 ID가 모두 카탈로그에 존재한다', () => {
    const catalogIds = new Set(CATALOG.map((i) => i.id));
    for (const r of SEASON_REWARDS) {
      expect(catalogIds.has(r.itemId)).toBe(true);
    }
  });

  it('시즌 보상 아이템이 모두 cosmetic=true (No Pay-to-Win)', () => {
    const catalogMap = new Map(CATALOG.map((i) => [i.id, i]));
    for (const r of SEASON_REWARDS) {
      const item = catalogMap.get(r.itemId);
      expect(item, `보상 ${r.itemId}이 카탈로그에 없음`).toBeDefined();
      expect(item!.cosmetic, `보상 ${r.itemId}이 전투에 영향을 줌!`).toBe(true);
    }
  });
});

describe('Shadow Share URL (C-5)', () => {
  it('섀도우를 URL 문자열로 인코딩/디코딩이 round-trip 된다', () => {
    const pool = generateShadows(SEASON.seed, 24);
    const shadow = pool[0];
    const encoded = encodeShadowUrl(shadow);
    expect(encoded.length).toBeLessThan(500);
    const decoded = decodeShadowUrl(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.name).toBe(shadow.name);
    expect(decoded!.dna.aggression).toBe(shadow.dna.aggression);
    expect(decoded!.sig).toBe(shadow.sig);  // 시그니처 보존
  });

  it('변조된 URL 디코딩은 null을 반환한다', () => {
    expect(decodeShadowUrl('!!!invalid')).toBeNull();
    expect(decodeShadowUrl('')).toBeNull();
  });
});
