// ─────────────────────────────────────────────────────────────
//  DNA FIGHTER — Combat DNA로 구동되는 AI 파이터 (복제 인격)
//  플레이어가 없어도 서버(로컬)에 남아 상시 대전한다.
// ─────────────────────────────────────────────────────────────
import { NEUTRAL_INTENT, type AttackId, type Intent } from './types';
import type { DNA, RawProfile } from './dna';
import { Rng } from './rng';

// 하위 호환: 기존 import 경로(`./dnaBot`)로 Rng를 쓰던 코드가 계속 동작한다.
export { Rng };

export interface BotState {
  dist: number;
  actionable: boolean;
  myHp: number; oppHp: number;
  meter: number;
  oppAirborne: boolean;
  oppAttacking: boolean;
  oppRecovering: boolean;
  oppDown: boolean;
  cornered: boolean;
  oppCornered: boolean;
  facingRight: boolean;
  canCancel: boolean;          // 캔슬 창 열림
  cancelOptions: AttackId[];
}

/** 결정론적 난수 — `rng.ts`의 공용 구현을 재노출 (기존 코드 경로 유지) */

const mk = (o: Partial<Intent>): Intent => ({ ...NEUTRAL_INTENT, ...o });

export class DnaBot {
  dna: DNA;
  raw: RawProfile | null;
  rng: Rng;
  private plan: Intent | null = null;
  private hold = 0;
  private delay = 0;
  private queued: Intent | null = null;
  private lastKind: string = 'none';
  lastLabel = '';

  constructor(dna: DNA, seed = 12345, raw: RawProfile | null = null) {
    this.dna = dna; this.rng = new Rng(seed); this.raw = raw;
  }

  reset() { this.plan = null; this.hold = 0; this.delay = 0; this.queued = null; }

  private r() { return this.rng.next(); }
  private n(v: number) { return v / 100; }

  /** 플레이어가 실제로 그 상황에서 쓰던 행동을 우선 샘플링 */
  private sampleLearned(pool: Record<string, number> | undefined, allow: string[]): string | null {
    if (!pool) return null;
    let tot = 0;
    for (const k of allow) tot += pool[k] ?? 0;
    if (tot < 2) return null;
    let t = this.r() * tot;
    for (const k of allow) {
      t -= pool[k] ?? 0;
      if (t <= 0) return k;
    }
    return null;
  }

  private bigramNext(allow: string[]): string | null {
    const bg = this.raw?.bigrams;
    if (!bg) return null;
    const cands: [string, number][] = [];
    for (const k of allow) {
      const v = bg[`${this.lastKind}>${k}`] ?? 0;
      if (v > 0) cands.push([k, v]);
    }
    if (!cands.length) return null;
    // 반복 패턴 수치가 높을수록 학습된 연결을 그대로 따라간다
    if (this.r() > this.n(this.dna.repetition) * 0.85 + 0.12) return null;
    let tot = cands.reduce((s, c) => s + c[1], 0);
    let t = this.r() * tot;
    for (const [k, v] of cands) { t -= v; if (t <= 0) return k; }
    return cands[0][0];
  }

  decide(s: BotState): Intent {
    // ── 캔슬 (콤보 지속력 = 압박 + 반복)
    if (s.canCancel && s.cancelOptions.length) {
      const want = this.n(this.dna.pressure) * 0.55 + this.n(this.dna.aggression) * 0.4 + 0.1;
      if (this.r() < want) {
        const opts = s.cancelOptions;
        if (opts.includes('super') && s.meter >= 100 &&
            this.r() < this.n(this.dna.superTiming) * (s.oppHp < 40 ? 1.1 : 0.35)) {
          return mk({ attack: 'super' });
        }
        const pick = this.bigramNext(opts) ?? opts[Math.floor(this.r() * opts.length)];
        if (pick && pick !== 'super') return mk({ attack: pick as AttackId });
      }
    }

    if (this.delay > 0) {
      this.delay--;
      if (this.delay === 0 && this.queued) { this.plan = this.queued; this.hold = 8; this.queued = null; }
      else return this.plan ? mk({ block: this.plan.block, crouch: this.plan.crouch }) : mk({});
    }
    if (this.plan && this.hold > 0) {
      this.hold--;
      const out = { ...this.plan };
      this.plan.attack = null; this.plan.dash = 0; this.plan.jump = false;
      return out;
    }
    if (!s.actionable) return mk({});

    const intent = this.choose(s);
    // 반응 속도: 카운터 성향이 높을수록 빠르다
    const react = Math.max(2, Math.round(16 - this.n(this.dna.counter) * 10 - this.n(this.dna.pressure) * 3));
    this.queued = intent;
    this.delay = 1 + Math.floor(this.r() * react);
    this.plan = mk({ block: intent.block, crouch: intent.crouch });
    return this.plan;
  }

  private note(k: string) { this.lastKind = k; this.lastLabel = k; }

  private choose(s: BotState): Intent {
    const d = this.dna;
    const fwd = s.facingRight ? 1 : -1;
    const lowHp = s.myHp < 32;
    const near = s.dist < 132;
    const mid = s.dist >= 132 && s.dist < 250;
    const far = s.dist >= 250;

    // ── 1. 확정 처형
    if (s.oppRecovering && near && this.r() < 0.55 + this.n(d.aggression) * 0.4) {
      this.note('heavy');
      return mk({ attack: this.r() < this.n(d.risk) ? 'heavy' : 'light' });
    }

    // ── 2. 궁극기 타이밍 (학습된 사용 습관)
    if (s.meter >= 100) {
      const want = this.n(d.superTiming) * (s.oppHp < 35 ? 1.25 : 0.4);
      if (s.dist < 190 && this.r() < want * 0.45) { this.note('super'); return mk({ attack: 'super' }); }
    }
    if (s.meter >= 50 && s.meter < 100 && near && this.r() < 0.05 + this.n(d.risk) * 0.07) {
      this.note('burst'); return mk({ attack: 'burst' });
    }

    // ── 3. 대공
    if (s.oppAirborne && s.dist < 170 && this.r() < 0.35 + this.n(d.counter) * 0.5) {
      this.note('upper'); return mk({ attack: 'upper' });
    }

    // ── 4. 카운터: 상대 공격 발생 중
    if (s.oppAttacking && near) {
      const c = this.n(d.counter);
      const r = this.r();
      if (r < c * 0.55) { this.note('upper'); return mk({ attack: 'upper' }); }
      if (r < c * 0.55 + this.n(d.defense) * 0.6) {
        this.note('block'); return mk({ block: true, crouch: this.r() < this.n(d.okizemeLow) });
      }
      if (r < 0.9) { this.note('block'); return mk({ block: true }); }
    }

    // ── 5. 기상 공방 (다운 후 행동 습관 그대로 복제)
    if (s.oppDown && s.dist < 200) {
      const learned = this.sampleLearned(this.raw?.okizeme, ['low', 'heavy', 'grab', 'light', 'slide', 'wave']);
      if (learned) { this.note(learned); return mk({ attack: learned as AttackId, moveDir: fwd }); }
      const r = this.r();
      if (r < this.n(d.okizemeLow)) { this.note('low'); return mk({ attack: 'low' }); }
      if (r < this.n(d.okizemeLow) + this.n(d.grab) * 0.5) { this.note('grab'); return mk({ attack: 'grab', moveDir: fwd }); }
      this.note('walkF'); return mk({ moveDir: fwd });
    }

    // ── 6. 체력 낮을 때 습관
    if (lowHp) {
      const pool = this.sampleLearned(this.raw?.lowHpActs, [
        'light', 'heavy', 'low', 'grab', 'wave', 'upper', 'slide', 'block', 'dashB', 'jump',
      ]);
      if (pool && this.r() < 0.62) {
        this.note(pool);
        return this.kindToIntent(pool, fwd, s);
      }
      if (this.r() > this.n(d.clutch)) { this.note('block'); return mk({ block: true, moveDir: -fwd }); }
    }

    // ── 6b. ★ 패닉 반응: 압박받으면 학습된 도피를 그대로 재현
    const pressured = near && (s.oppAttacking || s.cornered || s.oppRecovering === false);
    if (pressured) {
      const learned = this.sampleLearned(this.raw?.pressureActs, [
        'jump', 'dashB', 'walkB', 'block', 'blockLow', 'upper', 'grab', 'light', 'low', 'heavy', 'slide',
      ]);
      const panicRoll = this.r() < this.n(d.panic) * 0.85;
      if (learned && panicRoll) { this.note(learned); return this.kindToIntent(learned, fwd, s); }
      if (panicRoll && this.n(d.aerial) > 0.5) { this.note('jump'); return mk({ jump: true, moveDir: -fwd }); }
    }

    // ── 6c. ★ 프레임 트랩: 가드시킨 뒤 일부러 틈을 만들어 낚는다
    if (near && this.n(d.frameTrap) > 0.55 && this.r() < this.n(d.frameTrap) * 0.35) {
      this.note('light');
      return mk({ attack: this.r() < 0.6 ? 'light' : 'low' });
    }

    // ── 7. 코너 상황
    if (s.cornered && near) {
      if (this.r() < this.n(d.cornerEscape)) {
        this.note('dashB');
        return this.r() < this.n(d.aerial) ? mk({ jump: true, moveDir: -fwd }) : mk({ attack: 'upper' });
      }
    }

    // ── 8. 거리별 공격 습관 (학습된 버킷 분포 우선)
    const bucket = s.dist < 96 ? 0 : s.dist < 168 ? 1 : s.dist < 260 ? 2 : s.dist < 370 ? 3 : 4;
    const bpool = this.raw?.byBucket?.[bucket];
    if (bpool && bpool.length) {
      const tot = bpool.reduce((a, b) => a + b, 0);
      if (tot > 4 && this.r() < 0.55) {
        let t = this.r() * tot;
        for (let i = 0; i < bpool.length; i++) {
          t -= bpool[i];
          if (t <= 0) {
            const kind = BUCKET_KEYS[i];
            if (kind) { this.note(kind); return this.kindToIntent(kind, fwd, s); }
            break;
          }
        }
      }
    }

    // ── 9. DNA 기반 기본 행동
    const r = this.r();
    if (far) {
      if (r < this.n(d.zoning) * 0.9) { this.note('wave'); return mk({ attack: 'wave' }); }
      if (r < this.n(d.zoning) * 0.9 + this.n(d.aggression) * 0.55) { this.note('dashF'); return mk({ dash: fwd }); }
      if (r < 0.9) { this.note('walkF'); return mk({ moveDir: fwd }); }
      this.note('walkB'); return mk({ moveDir: -fwd });
    }
    if (mid) {
      if (r < this.n(d.zoning) * 0.45) { this.note('wave'); return mk({ attack: 'wave' }); }
      if (r < this.n(d.aggression) * 0.42) { this.note('slide'); return mk({ attack: 'slide' }); }
      if (r < this.n(d.aggression) * 0.66) { this.note('heavy'); return mk({ attack: 'heavy' }); }
      if (r < this.n(d.aggression) * 0.66 + this.n(d.pressure) * 0.3) { this.note('dashF'); return mk({ dash: fwd }); }
      if (r < 0.86) { this.note('walkF'); return mk({ moveDir: fwd }); }
      this.note('block'); return mk({ block: true });
    }
    // 근거리
    const ag = this.n(d.aggression), gr = this.n(d.grab), df = this.n(d.defense);
    if (r < ag * 0.34) { this.note('light'); return mk({ attack: 'light' }); }
    if (r < ag * 0.34 + ag * 0.2) { this.note('low'); return mk({ attack: 'low' }); }
    if (r < ag * 0.54 + gr * 0.42) { this.note('grab'); return mk({ attack: 'grab', moveDir: fwd }); }
    if (r < ag * 0.54 + gr * 0.42 + this.n(d.risk) * 0.18) { this.note('heavy'); return mk({ attack: 'heavy' }); }
    if (r < 0.62 + df * 0.3) { this.note('block'); return mk({ block: true, crouch: this.r() < 0.4 }); }
    if (this.r() < this.n(d.aerial) * 0.5) { this.note('jump'); return mk({ jump: true, moveDir: fwd }); }
    this.note('walkB'); return mk({ moveDir: -fwd });
  }

  private kindToIntent(kind: string, fwd: number, s: BotState): Intent {
    switch (kind) {
      case 'block': return mk({ block: true });
      case 'blockLow': return mk({ block: true, crouch: true });
      case 'jump': return mk({ jump: true, moveDir: fwd });
      case 'dashF': return mk({ dash: fwd });
      case 'dashB': return mk({ dash: -fwd });
      case 'walkF': return mk({ moveDir: fwd });
      case 'walkB': return mk({ moveDir: -fwd });
      case 'super': return s.meter >= 100 ? mk({ attack: 'super' }) : mk({ attack: 'heavy' });
      case 'burst': return s.meter >= 50 ? mk({ attack: 'burst' }) : mk({ attack: 'light' });
      default: return mk({ attack: kind as AttackId, moveDir: kind === 'grab' ? fwd : 0 });
    }
  }
}

export const BUCKET_KEYS: string[] = [
  'light', 'heavy', 'low', 'grab', 'wave', 'upper', 'slide', 'super', 'burst',
  'block', 'blockLow', 'jump', 'dashF', 'dashB', 'walkF', 'walkB',
];
