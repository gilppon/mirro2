// ─────────────────────────────────────────────────────────────
//  ROLLBACK SESSION — GGPO 방식 롤백 넷코드 코어 (Phase 3)
//  전송 계층과 무관하게 동작하는 순수 세션 로직:
//   - 로컬 입력은 즉시 적용, 원격 입력은 "마지막 수신값"으로 예측해 선행 시뮬레이션
//   - 실제 원격 입력이 도착해 예측이 틀렸으면 → 마지막 정확 스냅샷으로 롤백 후 재시뮬
//  전제: Engine이 결정론 모드(setDeterminism + stepNet) + 스냅샷/복원/체크섬 보유.
// ─────────────────────────────────────────────────────────────
import { NEUTRAL_INTENT, type Intent } from './types';
import type { Engine, EngineSnapshot } from './engine';

export interface RollbackStats {
  frames: number;
  rollbacks: number;
  rolledBackFrames: number;
  avgRollbackDepth: number;
  predictedCorrectly: number;
  lastRollbackDepth: number;
  confirmedFrame: number;
}

/** 프레임 번호가 붙은 입력 1건 — 전송 패킷의 기본 단위. */
export interface InputEntry {
  frame: number;
  intent: Intent;
}

function cloneIntent(i: Intent): Intent {
  return { moveDir: i.moveDir, dash: i.dash, jump: i.jump, crouch: i.crouch, block: i.block, attack: i.attack };
}

function sameIntent(a: Intent, b: Intent): boolean {
  return a.moveDir === b.moveDir && a.dash === b.dash && a.jump === b.jump
    && a.crouch === b.crouch && a.block === b.block && a.attack === b.attack;
}

/**
 * 롤백 세션 — 로컬/원격 입력 스트림을 프레임 번호로 정렬하고
 * 엔진 상태를 확정/예측/롤백 관리한다. 양쪽 클라이언트가 대칭으로 사용한다.
 */
export class RollbackSession {
  private eng: Engine;
  private localLeft: boolean;
  inputDelay: number;
  snapshotEvery: number;

  private local: Map<number, Intent> = new Map();
  private remoteActual: Map<number, Intent> = new Map();
  private remoteUsed: Map<number, Intent> = new Map();
  private snaps: Map<number, EngineSnapshot> = new Map();

  frame = 0;
  confirmedFrame = -1;

  private rollbacks = 0;
  private rolledBackFrames = 0;
  private predicted = 0;
  private predictedHit = 0;
  private lastRollbackDepth = 0;

  constructor(eng: Engine, localLeft: boolean, inputDelay = 1, snapshotEvery = 1) {
    this.eng = eng;
    this.localLeft = localLeft;
    this.inputDelay = Math.max(0, Math.min(4, Math.floor(inputDelay)));
    this.snapshotEvery = Math.max(1, Math.floor(snapshotEvery));
  }

  setDeterminism(seed: number) {
    this.eng.setDeterminism(seed);
  }

  /** 내 입력을 기록한다. inputDelay만큼 미래 프레임에 적용(입력 지연 흡수). */
  addLocalInput(frame: number, intent: Intent) {
    this.local.set(frame + this.inputDelay, cloneIntent(intent));
  }

  /** 원격 입력 수신. 이미 예측으로 지나간 프레임이면 롤백+재시뮬한다. */
  receiveRemote(frame: number, intent: Intent): { rolledBack: boolean; depth: number } {
    const prev = this.remoteActual.get(frame);
    if (prev && sameIntent(prev, intent)) return { rolledBack: false, depth: 0 };
    this.remoteActual.set(frame, cloneIntent(intent));
    if (frame >= this.frame) {
      this.updateConfirmed();
      return { rolledBack: false, depth: 0 };
    }
    const used = this.remoteUsed.get(frame);
    if (used && sameIntent(used, intent)) {
      this.updateConfirmed();
      return { rolledBack: false, depth: 0 };
    }
    const depth = this.frame - frame;
    this.rollbackTo(frame);
    this.updateConfirmed();
    return { rolledBack: true, depth };
  }

    /** 1프레임 진행. 로컬 입력은 즉시, 원격 미도착이면 마지막 값으로 예측. */
  tick(): { predicted: boolean } {
    const f = this.frame;
    if (f % this.snapshotEvery === 0) this.snaps.set(f, this.eng.snapshot());
    if (this.snaps.size > 700) {
      const keys = [...this.snaps.keys()];
      this.snaps.delete(Math.min(...keys));
    }
    const localIntent = this.local.get(f) ?? { ...NEUTRAL_INTENT };
    this.local.set(f, cloneIntent(localIntent));
    const actual = this.remoteActual.get(f);
    let used: Intent;
    let predicted = false;
    if (actual) {
      used = cloneIntent(actual);
      this.predicted++;
      this.predictedHit++;
    } else {
      used = cloneIntent(this.lastRemoteIntent());
      this.predicted++;
      predicted = true;
    }
    this.remoteUsed.set(f, cloneIntent(used));
    if (this.localLeft) this.eng.stepNet(localIntent, used);
    else this.eng.stepNet(used, localIntent);
    this.updateConfirmed();
    // 세션 프레임을 전진 — 이것이 없으면 receiveRemote에서 frame >= this.frame이 항상 참이 되어 롤백이 절대 발생하지 않는다.
    this.frame++;
    return { predicted };
  }

  private lastRemoteIntent(): Intent {
    for (let f = this.frame - 1; f >= 0; f--) {
      const v = this.remoteActual.get(f) ?? this.remoteUsed.get(f);
      if (v) return v;
    }
    return { ...NEUTRAL_INTENT };
  }

    /** base 프레임(최초 스냅샷)으로 되돌린 뒤 targetFrame까지 재시뮬레이션한다.
   *  재시뮬 범위는 고정: 실제 진행에서 이동한 프레임 수와 무관하게 RNG 소비량을 일치시킨다.
   */
  private rollbackTo(frame: number) {
    // restore 전에 현재 프레임을 캡처 — restore가 엔진의 frame만 되돌리지 세션의 this.frame은 유지한다.
    const targetFrame = this.frame;
    let base: number | undefined;
    for (let b = frame; b >= 0; b--) {
      if (this.snaps.has(b)) { base = b; break; }
    }
    if (base == null) return;
    const snap = this.snaps.get(base)!;
    this.eng.restore(snap);
    this.rollbacks++;
    this.lastRollbackDepth = this.frame - frame;
    this.rolledBackFrames += this.frame - base;
    // stale 스냅샷(base+1 ~ targetFrame-1) 삭제 — 재시뮬로 갱신될 예정
    for (const k of [...this.snaps.keys()]) {
      if (k > base) this.snaps.delete(k);
    }
    for (let f = base; f < targetFrame; f++) {
      if (f % this.snapshotEvery === 0) this.snaps.set(f, this.eng.snapshot());
      const localIntent = this.local.get(f) ?? { ...NEUTRAL_INTENT };
      const actual = this.remoteActual.get(f);
      const used = actual ? cloneIntent(actual) : cloneIntent(this.remoteUsed.get(f) ?? { ...NEUTRAL_INTENT });
      this.remoteUsed.set(f, cloneIntent(used));
      if (this.localLeft) this.eng.stepNet(localIntent, used);
      else this.eng.stepNet(used, localIntent);
    }
  }

  private updateConfirmed() {
    let c = this.confirmedFrame;
    while (this.remoteActual.has(c + 1) && this.local.has(c + 1)) c++;
    this.confirmedFrame = c;
  }

  checksum(): number {
    return this.eng.checksum();
  }

  stats(): RollbackStats {
    return {
      frames: this.frame,
      rollbacks: this.rollbacks,
      rolledBackFrames: this.rolledBackFrames,
      avgRollbackDepth: this.rollbacks === 0 ? 0 : this.rolledBackFrames / this.rollbacks,
      predictedCorrectly: this.predicted === 0 ? 1 : this.predictedHit / this.predicted,
      lastRollbackDepth: this.lastRollbackDepth,
      confirmedFrame: this.confirmedFrame,
    };
  }
}
