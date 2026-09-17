// ─────────────────────────────────────────────────────────────
//  NET CLOCK — 프레임 번호 기반 클럭 동기화 (Phase 3)
//  SFV식 "한쪽만 롤백" 버그 방지: 앞선 쪽을 잠시 멈춰 리드 상한을 유지한다.
//  "10초에 1프레임 손실은 눈에 안 띈다" (GGPO/Ars Technica).
// ─────────────────────────────────────────────────────────────

export interface ClockStats {
  localFrame: number;
  remoteFrame: number;
  lead: number;
  stalls: number;
}

/** 리드 상한을 강제하는 간단한 페이서. 전송 계층과 무관한 순수 로직. */
export class FramePacer {
  /** 허용 리드 (프레임). 초과하면 앞선 쪽이 쉬어야 한다. */
  maxLead: number;
  private stalls = 0;

  constructor(maxLead = 2) {
    this.maxLead = maxLead;
  }

  /** 이번 틱에 진행해도 되는지. false면 1프레임 대기(입력 반복 없이 쉼). */
  shouldAdvance(localFrame: number, remoteFrame: number): boolean {
    if (localFrame - remoteFrame > this.maxLead) {
      this.stalls++;
      return false;
    }
    return true;
  }

  stats(localFrame: number, remoteFrame: number): ClockStats {
    return {
      localFrame,
      remoteFrame,
      lead: localFrame - remoteFrame,
      stalls: this.stalls,
    };
  }
}
