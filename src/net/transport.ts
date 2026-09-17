// ─────────────────────────────────────────────────────────────
//  NET TRANSPORT — 롤백 세션용 전송 계층 추상화 (Phase 3)
//  Engine/RollbackSession은 이 인터페이스만 본다.
//  실전: WebRTC DataChannel 구현체로 교체. 테스트/로컬: LoopbackTransport.
// ─────────────────────────────────────────────────────────────
import type { Intent } from '../game/types';

export interface NetPacket {
  /** 입력 프레임 번호 */
  frame: number;
  /** 해당 프레임의 송신자 입력 */
  intent: Intent;
  /** 송신자 체크섬 (디싱크 감지용, 선택) */
  checksum?: number;
}

export interface NetTransport {
  send(pkt: NetPacket): void;
  /** 도착한 패킷을 모두 꺼낸다 (수신 버퍼 비움) */
  drain(): NetPacket[];
  /** 인위적 지연/손실 시뮬레이션용 틱 (실전 구현은 no-op) */
  tickFrame?(): void;
}

/** 동일 프로세스 내 양방향 루프백 — 결정론/롤백 테스트용. */
export class LoopbackTransport {
  private a2b: { pkt: NetPacket; at: number }[] = [];
  private b2a: { pkt: NetPacket; at: number }[] = [];
  private now = 0;
  /** 편도 지연 (프레임) */
  delayFrames: number;
  /** 패킷 손실률 (0~1) — 손실된 패킷은 재전송되지 않음(롤백이 커버) */
  lossRate: number;
  private drop: () => number;

    constructor(delayFrames = 3, lossRate = 0, drop?: () => number) {
    this.delayFrames = delayFrames;
    this.lossRate = lossRate;
    // 기본값: 결정론적(절대 드롭하지 않음). 테스트/재현성을 위해 Math.random을 사용하지 않는다.
    this.drop = drop ?? (() => 1);
  }

  epA: NetTransport = {
    send: (pkt) => this.push('a2b', pkt),
    drain: () => this.pull('b2a'),
    tickFrame: () => {},
  };
  epB: NetTransport = {
    send: (pkt) => this.push('b2a', pkt),
    drain: () => this.pull('a2b'),
    tickFrame: () => {},
  };

  /** 가상 시간 1프레임 전진 */
  tickFrame() {
    this.now++;
  }

  private push(dir: 'a2b' | 'b2a', pkt: NetPacket) {
    if (this.drop() < this.lossRate) return;
    const item = { pkt, at: this.now + this.delayFrames };
    if (dir === 'a2b') this.a2b.push(item);
    else this.b2a.push(item);
  }

  private pull(dir: 'a2b' | 'b2a'): NetPacket[] {
    const q = dir === 'a2b' ? this.a2b : this.b2a;
    const out: NetPacket[] = [];
    for (let i = q.length - 1; i >= 0; i--) {
      if (q[i].at <= this.now) {
        out.push(q[i].pkt);
        q.splice(i, 1);
      }
    }
    out.sort((x, y) => x.frame - y.frame);
    return out;
  }
}
