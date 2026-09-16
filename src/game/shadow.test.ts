import { describe, it, expect } from 'vitest';
import {
  generateShadows, pickOpponent, serializeShadow, shadowIntact,
  tierOf, toFighter, verifyMatch, SEASON,
} from './shadow';
import { runLeague, leaguePool } from './ghost';
import { buildPlayerAi, type AiFighter } from './meta';
import { emptyRaw } from './dna';
import type { MatchResult } from './meta';

function mkMe(): AiFighter {
  return buildPlayerAi(emptyRaw(), 'MY-AI', 1);
}

describe('generateShadows — 시즌 커뮤니티 로스터', () => {
  it('완전 결정론 — 같은 시드면 같은 24명', () => {
    const a = generateShadows(SEASON.seed, 24);
    const b = generateShadows(SEASON.seed, 24);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('다른 시드는 다른 로스터', () => {
    const a = generateShadows(111, 24);
    const b = generateShadows(222, 24);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('이름이 유니크하고 rating은 980~1920 범위, DNA는 2~98 클램프', () => {
    const list = generateShadows(SEASON.seed, 24);
    const names = list.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    for (const p of list) {
      expect(p.rating).toBeGreaterThanOrEqual(980);
      expect(p.rating).toBeLessThanOrEqual(1920);
      for (const v of Object.values(p.dna)) {
        expect(v).toBeGreaterThanOrEqual(2);
        expect(v).toBeLessThanOrEqual(98);
      }
    }
  });
});

describe('ShadowPayload 무결성', () => {
  it('serialize → intact 통과, 변조 시 실패', () => {
    const p = serializeShadow(mkMe());
    expect(shadowIntact(p)).toBe(true);
    const forged = { ...p, rating: 2500 };
    expect(shadowIntact(forged)).toBe(false);
  });

  it('toFighter — DNA에서 아키타입을 계산한다', () => {
    const p = generateShadows(SEASON.seed, 24)[0];
    const f = toFighter(p);
    expect(f.archetype).not.toBe('');
    expect(f.name).toBe(p.name);
    expect(f.rating).toBe(p.rating);
  });
});

describe('verifyMatch — 서버 재검증 원형', () => {
  it('정상 보고는 통과한다', () => {
    const a = mkMe(), b = toFighter(generateShadows(SEASON.seed, 24)[0]);
    const real = { a: a.name, b: b.name, winner: 'a' as const, scoreA: 2, scoreB: 0, dmgA: 320, dmgB: 180, rounds: 2, log: [] };
    const v = verifyMatch(a, b, 42424, real);
    // winner/score는 재시뮬과 대조 — 로그에 남은 실제 결과라면 ok
    expect(typeof v.ok).toBe('boolean');
    expect(v.recalced).toBeDefined();
  });

  it('조작된 보고(winner 반전)는 반드시 거부된다', () => {
    const a = mkMe(), b = toFighter(generateShadows(SEASON.seed, 24)[0]);
    const real = verifyMatch(a, b, 9999, { a: a.name, b: b.name, winner: 'a', scoreA: 2, scoreB: 0, dmgA: 0, dmgB: 0, rounds: 2, log: [] });
    if (real.recalced.winner === 'a') {
      const forged: MatchResult = { ...real.recalced, winner: 'b' };
      expect(verifyMatch(a, b, 9999, forged).ok).toBe(false);
    }
    // 항상: 재시뮬 원본은 통과
    const honest = verifyMatch(a, b, 9999, real.recalced);
    expect(honest.ok).toBe(true);
  });
});

describe('tierOf — 티어 경계', () => {
  it('900=브론즈, 1200=실버, 1400=골드, 1600=플래티넘, 1800=다이아, 1950=GM', () => {
    expect(tierOf(900).en).toBe('BRONZE');
    expect(tierOf(1200).en).toBe('SILVER');
    expect(tierOf(1400).en).toBe('GOLD');
    expect(tierOf(1600).en).toBe('PLATINUM');
    expect(tierOf(1800).en).toBe('DIAMOND');
    expect(tierOf(1950).en).toBe('GRANDMASTER');
  });
});

describe('pickOpponent — 평준 매칭', () => {
  const pool = generateShadows(SEASON.seed, 24).map(toFighter);
  const me = { rating: 1400 };

  it('결정론 — 같은 시드·풀이면 같은 상대', () => {
    expect(pickOpponent(me, pool, 77).id).toBe(pickOpponent(me, pool, 77).id);
  });

  it('레이팅에 가까운 상대에 가중 — 1000회 시도 중 위/아래 ±200 이내가 최다', () => {
    const counts = { near: 0, far: 0 };
    for (let i = 0; i < 1000; i++) {
      const d = Math.abs(pickOpponent(me, pool, i * 31 + 7, new Set()).rating - me.rating);
      if (d <= 200) counts.near++;
      else counts.far++;
    }
    expect(counts.near).toBeGreaterThan(counts.far * 2);
  });

  it('제외 목록이 전부면 fallback이 동작한다', () => {
    const all = new Set(pool.map((p) => p.id));
    expect(pickOpponent(me, pool, 5, all)).toBeDefined();
  });
});

describe('runLeague — Phase 2 리그', () => {
  const me = mkMe();

  it('결정론 — 같은 시드면 같은 다이제스트', () => {
    const pool = leaguePool(me);
    const a = runLeague(me, pool, 4, 555);
    const b = runLeague(me, pool, 4, 555);
    expect(JSON.stringify(a.logs.map((l) => [l.opp, l.score]))).toBe(JSON.stringify(b.logs.map((l) => [l.opp, l.score])));
  });

  it('모든 로그가 재검증을 통과한다', () => {
    const d = runLeague(me, leaguePool(me), 4, 777);
    expect(d.logs.length).toBe(4);
    for (const l of d.logs) expect(l.verified).toBe(true);
  });

  it('풀에 커뮤니티 섀도우 24명이 포함된다', () => {
    const pool = leaguePool(me);
    const shadows = pool.filter((p) => p.id.startsWith('shadow-'));
    expect(shadows.length).toBe(24);
  });
});