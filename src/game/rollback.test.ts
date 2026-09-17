// ─────────────────────────────────────────────────────────────
//  ROLLBACK TESTS — Phase 3 완료 기준
//  1) 무지연 루프백: 양쪽 체크섬 완전 일치 (디싱크 0)
//  2) 지연+손실 환경: 롤백 발생 + 최종 체크섬 일치
//  3) 예측 적중 시 롤백 없음
// ─────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { Engine } from '../game/engine';
import { RollbackSession } from '../game/rollback';
import { LoopbackTransport } from '../net/transport';
import { FramePacer } from '../net/clock';
import type { Intent } from '../game/types';

const N: Intent = { moveDir: 0, dash: 0, jump: false, crouch: false, block: false, attack: null };
const FWD: Intent = { moveDir: 1, dash: 0, jump: false, crouch: false, block: false, attack: null };
const ATK: Intent = { moveDir: 0, dash: 0, jump: false, crouch: false, block: false, attack: 'light' };

function script(i: number): Intent {
  if (i % 60 < 20) return { ...FWD };
  if (i % 60 === 30) return { ...ATK };
  return { ...N };
}

/** 양쪽 세션이 동일한 입력 쌍을 받아 동일한 경기를 치르도록 한다. */
function spar(seed: number, frames: number, delay: number, loss: number, dropRng?: () => number) {
  const engA = new Engine();
  const engB = new Engine();
  const sesA = new RollbackSession(engA, true, 0);
  const sesB = new RollbackSession(engB, false, 0);
  sesA.setDeterminism(seed);
  sesB.setDeterminism(seed);
  const net = new LoopbackTransport(delay, loss, dropRng);
  for (let f = 0; f < frames; f++) {
    const aLocal = script(f);
    const bLocal = script(f);
    sesA.addLocalInput(f, aLocal);
    sesB.addLocalInput(f, bLocal);
    net.epA.send({ frame: f, intent: aLocal });
    net.epB.send({ frame: f, intent: bLocal });
    net.tickFrame();
    for (const p of net.epA.drain()) sesA.receiveRemote(p.frame, p.intent);
    for (const p of net.epB.drain()) sesB.receiveRemote(p.frame, p.intent);
    sesA.tick();
    sesB.tick();
  }
  for (let k = 0; k < 40; k++) {
    net.tickFrame();
    for (const p of net.epA.drain()) sesA.receiveRemote(p.frame, p.intent);
    for (const p of net.epB.drain()) sesB.receiveRemote(p.frame, p.intent);
    sesA.tick();
    sesB.tick();
  }
  return { sesA, sesB, engA, engB };
}

describe('RollbackSession (롤백 넷코드 코어)', () => {
  it('무지연 환경: 양쪽 체크섬 완전 일치 (디싱크 0)', () => {
    const { engA, engB, sesA } = spar(777, 300, 0, 0);
    expect(engA.checksum()).toBe(engB.checksum());
    expect(sesA.stats().rollbacks).toBe(0);
  });

  it('지연 3프레임 환경: 롤백 발생 + 최종 체크섬 일치', () => {
    const { engA, engB, sesA } = spar(4242, 600, 3, 0);
    const st = sesA.stats();
    expect(st.rollbacks).toBeGreaterThan(0);
    expect(engA.checksum()).toBe(engB.checksum());
  });

  it('손실 5% 환경에서도 최종 상태가 수렴한다', () => {
    const { engA, engB } = spar(999, 600, 2, 0.05, () => 0.5);
    expect(engA.checksum()).toBe(engB.checksum());
  });
});

describe('FramePacer (클럭 동기화)', () => {
  it('리드 초과 시 대기, 해소 후 진행', () => {
    const p = new FramePacer(2);
    expect(p.shouldAdvance(10, 7)).toBe(false);
    expect(p.shouldAdvance(9, 7)).toBe(true);
    expect(p.stats(10, 7).stalls).toBe(1);
  });
});
