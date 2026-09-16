// ─────────────────────────────────────────────────────────────
//  DETERMINISM TESTS — ROADMAP Phase 0-A 완료 기준
//  1) 같은 시드 → 같은 경기  2) 스냅샷 → 복원 → 재시뮬 → 동일 체크섬
// ─────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { Engine } from './engine';
import { Rng, seededRandom } from './rng';
import { deepClone } from './snapshot';

const NEUTRAL = { moveDir: 0, dash: 0, jump: false, crouch: false, block: false, attack: null };

/** 시드 고정 후 중립 입력만으로 끝까지 진행한 경기 요약 (전투 흐름의 지문) */
function runMatch(seed: number) {
  const eng = new Engine();
  eng.setDeterminism(seed);
  let guard = 0;
  while (eng.phase !== 'matchEnd' && guard < 26000) {
    eng.step(NEUTRAL);
    if (eng.phase === 'roundEnd') eng.phaseTimer = 0;
    if (eng.phase === 'intro') eng.phaseTimer = 0;
    guard++;
  }
  return {
    wins: [...eng.wins],
    checksum: eng.checksum(),
    dmgDealt: Math.round(eng.stats.dmgDealt * 100),
    dmgTaken: Math.round(eng.stats.dmgTaken * 100),
    maxCombo: eng.stats.maxCombo,
    frames: eng.frame,
  };
}

describe('Rng (결정론 난수)', () => {
  it('같은 시드는 항상 같은 수열을 낸다', () => {
    const a = seededRandom(12345);
    const b = seededRandom(12345);
    const seqA = Array.from({ length: 200 }, () => a());
    const seqB = Array.from({ length: 200 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('다른 시드는 다른 수열을 낸다', () => {
    const a = seededRandom(1);
    const b = seededRandom(2);
    const seqA = Array.from({ length: 32 }, () => a());
    const seqB = Array.from({ length: 32 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('상태 저장/복원이 정확하다 (롤백의 기반)', () => {
    const r = new Rng(777);
    r.next();
    const saved = r.state;
    const expected = new Rng(777);
    expected.next();
    const expectedNext = expected.next();
    r.next(); // 진행시킨 뒤
    r.state = saved; // 되돌리면
    expect(r.next()).toBe(expectedNext); // 같은 다음 값
  });
});

describe('Engine 결정론 (같은 시드 → 같은 경기)', () => {
  it('동일 시드 2회 실행 → 완전히 동일한 결과', () => {
    const a = runMatch(4242);
    const b = runMatch(4242);
    expect(a.frames).toBeGreaterThan(0);
    expect(b).toEqual(a);
  });

  it('서로 다른 시드로도 각각 재현 가능하다', () => {
    expect(runMatch(1)).toEqual(runMatch(1));
    expect(runMatch(987654321)).toEqual(runMatch(987654321));
  });
});

describe('Engine 스냅샷/복원 (롤백 시뮬레이션)', () => {
  it('snapshot → 300프레임 진행 → restore → 재시뮬 → 체크섬 일치', () => {
    const eng = new Engine();
    eng.setDeterminism(999);
    for (let i = 0; i < 600; i++) eng.step(NEUTRAL);

    const snap = eng.snapshot();
    expect(snap.frame).toBe(600);
    const before = eng.checksum();

    for (let i = 0; i < 300; i++) eng.step(NEUTRAL);
    const afterFirst = eng.checksum();

    eng.restore(snap);
    expect(eng.checksum()).toBe(before);
    for (let i = 0; i < 300; i++) eng.step(NEUTRAL);
    expect(eng.checksum()).toBe(afterFirst);
  });
});

describe('deepClone (스냅샷 직렬화 기반)', () => {
  it('Map과 중첩 객체를 보존한다', () => {
    const src = { m: new Map([['a', { n: 1 }]]), arr: [1, [2, 3]], s: '한글' };
    const out = deepClone(src);
    expect(out).toEqual(src);
    expect(out.m).toBeInstanceOf(Map);
    expect(out.m.get('a')).toEqual({ n: 1 });
    expect(out).not.toBe(src);
    // 깊은 복제 — 원본 변경이 복제본에 영향 없음
    src.m.get('a')!.n = 99;
    expect(out.m.get('a')!.n).toBe(1);
  });

  it('함수는 복제하지 않는다 (상태가 아님)', () => {
    const src = { x: 1, f: () => 42 };
    const out = deepClone(src);
    expect(out.x).toBe(1);
    expect((out as Record<string, unknown>).f).toBeUndefined();
  });
});
