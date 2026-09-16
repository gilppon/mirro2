// ─────────────────────────────────────────────────────────────
//  SIMULA — 신경망 도플갱어의 두뇌
//  플레이어의 입력 속도 / 간격 / 습관 n-gram / 시선 이동을
//  실시간 학습하고, 2라운드부터 0.01초 먼저 복사한다.
// ─────────────────────────────────────────────────────────────
import type { AttackId, Intent } from './types';
import { NEUTRAL_INTENT } from './types';
import { stageOf, stageProgress, type StageDef } from './evolution';

export type LAction =
  | 'light' | 'heavy' | 'low' | 'grab'
  | 'wave' | 'upper' | 'slide' | 'super'
  | 'block' | 'blockLow' | 'jump' | 'dashF' | 'dashB' | 'walkF' | 'walkB';

export const L_ACTIONS: LAction[] = [
  'light', 'heavy', 'low', 'grab', 'wave', 'upper', 'slide', 'super',
  'block', 'blockLow', 'jump', 'dashF', 'dashB', 'walkF', 'walkB',
];

export const ACTION_KR: Record<LAction, string> = {
  light: '약', heavy: '강', low: '하단', grab: '잡기',
  wave: '미러파', upper: '어퍼', slide: '슬라이드', super: '초필살기',
  block: '상단가드', blockLow: '하단가드', jump: '점프',
  dashF: '전진대시', dashB: '후진대시', walkF: '전진', walkB: '후퇴',
};

export const ACTION_COLOR: Record<LAction, string> = {
  light: '#38f2ff', heavy: '#ff4fa3', low: '#ffd447', grab: '#b478ff',
  wave: '#5ee7ff', upper: '#ff7a45', slide: '#c0ff4f', super: '#ffffff',
  block: '#7dffc2', blockLow: '#4bd3a0', jump: '#8fb4ff',
  dashF: '#ff9a3c', dashB: '#ff6b6b', walkF: '#9aa7c7', walkB: '#6c7794',
};

export const DIST_BUCKETS = ['밀착', '근거리', '중거리', '원거리', '초원거리'];

export function bucketOf(dist: number): number {
  if (dist < 96) return 0;
  if (dist < 168) return 1;
  if (dist < 260) return 2;
  if (dist < 370) return 3;
  return 4;
}

type Counts = Partial<Record<LAction, number>>;

function addCount(map: Map<string, Counts>, key: string, a: LAction, w = 1) {
  let c = map.get(key);
  if (!c) { c = {}; map.set(key, c); }
  c[a] = (c[a] ?? 0) + w;
}

function total(c: Counts): number {
  let s = 0;
  for (const k in c) s += c[k as LAction] ?? 0;
  return s;
}

export interface Prediction {
  action: LAction;
  p: number;
  entropy: number;
  dist: Record<LAction, number>;
}

export interface BrainSnapshot {
  absorption: number;
  samples: number;
  apm: number;
  avgInterval: number;
  fastestInterval: number;
  reaction: number;
  accuracy: number;
  hits: number;
  misses: number;
  prediction: LAction | null;
  confidence: number;
  entropy: number;
  mirroring: boolean;
  topPatterns: { seq: string; next: LAction; p: number; n: number }[];
  actionDist: { a: LAction; p: number; n: number }[];
  spacing: number[];
  gaze: number[];
  gazeSpeed: number;
  gazeLead: number;
  focus: string;
  tapSpeed: number;
  lastLog: string[];
  xp: number;
  stageLv: number;
  stageKey: string;
  stageKr: string;
  stageEn: string;
  stageColor: string;
  stageIcon: string;
  stageQuote: string;
  stageSummary: string;
  stageRatio: number;
  stageRemain: number;
  nextStageKr: string | null;
  levelUpFlash: number;
}

const TARGET_SAMPLES = 46;

export class MirrorBrain {
  round = 1;
  /** 결정론 주입용 난수 (기본: Math.random — 기존 동작 유지). Engine.setDeterminism이 시드 RNG로 교체한다. */
  rng: () => number = Math.random;
  // ── 학습 저장소
  private global: Counts = {};
  private ctx1 = new Map<string, Counts>();   // key: dist|prev
  private ctx2 = new Map<string, Counts>();   // key: prev2>prev
  private ctxDist = new Map<string, Counts>();// key: dist
  history: LAction[] = [];
  samples = 0;

  // ── 타이밍 학습
  private lastActionT = 0;
  intervalEMA = 420;
  fastestInterval = 9999;
  private actionTimes: number[] = [];
  reactionEMA = 320;
  private stimulusT: number | null = null;
  tapSpeed = 0;

  // ── 공간 / 시선 학습
  spacing = [0, 0, 0, 0, 0];
  gaze = [0, 0, 0, 0, 0, 0];
  gazeSpeed = 0;
  private lastGaze: { x: number; y: number; t: number } | null = null;
  private gazeDir = 0;
  gazeLeadHit = 0;
  gazeLeadTotal = 0;

  // ── 예측 상태
  live: Prediction | null = null;
  predictHits = 0;
  predictMisses = 0;
  mirroring = false;
  mirrorFlashT = 0;
  log: string[] = [];

  // ── AI 실행 상태
  /** 던전 5층: 이 행동들만 사용한다 (플레이어의 최악 습관) */
  worstHabits: string[] = [];

  private plan: { intent: Intent; frames: number } | null = null;
  private delay = 0;
  private queued: Intent | null = null;
  private queuedHold = 8;
  desync = 0;

  reset(full: boolean) {
    this.plan = null; this.delay = 0; this.queued = null; this.desync = 0;
    if (full) {
      this.global = {}; this.ctx1.clear(); this.ctx2.clear(); this.ctxDist.clear();
      this.history = []; this.samples = 0; this.predictHits = 0; this.predictMisses = 0;
      this.spacing = [0, 0, 0, 0, 0]; this.gaze = [0, 0, 0, 0, 0, 0];
      this.intervalEMA = 420; this.fastestInterval = 9999; this.actionTimes = [];
      this.reactionEMA = 320; this.log = []; this.round = 1; this.live = null;
      this.gazeLeadHit = 0; this.gazeLeadTotal = 0; this.tapSpeed = 0;
    }
    if (this.levelUpFlash > 0) this.levelUpFlash = 0;
    this.justLeveled = null;
  }

  get absorption(): number {
    return Math.min(1, this.samples / TARGET_SAMPLES);
  }

  // ── 진화 단계 (누적 XP 기반)
  xp = 0;
  stage: StageDef = stageOf(0);
  levelUpFlash = 0;
  justLeveled: StageDef | null = null;

  setXp(v: number) {
    this.xp = v;
    const s = stageOf(v);
    if (s.lv !== this.stage.lv) {
      const up = s.lv > this.stage.lv;
      this.stage = s;
      if (up) {
        this.justLeveled = s;
        this.levelUpFlash = 150;
        this.pushLog(`진화 — Lv.${s.lv} ${s.kr}`);
      }
    } else this.stage = s;
  }

  addXp(v: number) { this.setXp(this.xp + v); }

  get params() {
    const p = this.stage.p;
    // 라운드가 진행될수록 단계 내에서도 조금씩 날카로워진다
    const r = Math.min(3, this.round) - 1;
    return {
      model: Math.min(1, p.model * (1 + r * 0.1)),
      react: Math.max(2, Math.round(p.react * (1 - r * 0.12))),
      aggro: Math.min(1, p.aggro + r * 0.05),
      mirror: Math.min(1, p.mirror * (1 + r * 0.22)),
      punish: Math.min(1, p.punish * (1 + r * 0.15)),
      mimic: p.mimic,
      noise: Math.max(0.03, p.noise * (1 - r * 0.18)),
    };
  }

  get dmgScale() { return this.stage.p.dmgScale; }

  pushLog(s: string) {
    this.log.unshift(s);
    if (this.log.length > 7) this.log.pop();
  }

  // ── 관찰: 플레이어가 이산 행동을 취함
  observe(a: LAction, dist: number, t: number): { predicted: boolean; p: number } {
    const prev = this.history[this.history.length - 1] ?? 'none';
    const prev2 = this.history[this.history.length - 2] ?? 'none';
    const b = bucketOf(dist);

    // 예측 검증 (습관 붕괴 판정)
    let predicted = false;
    let p = 0;
    if (this.live && this.samples > 5) {
      p = this.live.p;
      predicted = this.live.action === a;
      if (this.live.p > 0.3) {
        if (predicted) this.predictHits++;
        else this.predictMisses++;
      }
    }

    // 가중 학습 (최근 입력일수록 더 강하게)
    const w = 1 + Math.min(1.2, this.samples * 0.012);
    this.global[a] = (this.global[a] ?? 0) + w;
    addCount(this.ctxDist, `${b}`, a, w);
    addCount(this.ctx1, `${b}|${prev}`, a, w);
    addCount(this.ctx2, `${prev2}>${prev}`, a, w * 1.15);

    this.history.push(a);
    if (this.history.length > 240) this.history.shift();
    this.samples++;

    // 타이밍
    if (this.lastActionT > 0) {
      const dt = t - this.lastActionT;
      if (dt > 40 && dt < 2600) {
        this.intervalEMA = this.intervalEMA * 0.82 + dt * 0.18;
        if (dt < this.fastestInterval) this.fastestInterval = dt;
      }
    }
    this.lastActionT = t;
    this.actionTimes.push(t);
    if (this.actionTimes.length > 90) this.actionTimes.shift();

    // 반응속도 (시뮬라의 공격 발생 → 플레이어의 첫 방어/반격)
    if (this.stimulusT !== null) {
      const rt = t - this.stimulusT;
      if (rt > 60 && rt < 1200) {
        this.reactionEMA = this.reactionEMA * 0.75 + rt * 0.25;
        this.stimulusT = null;
      }
    }

    // 시선 선행 지수: 포인터가 움직인 방향과 실제 이동 방향의 일치율
    if (a === 'walkF' || a === 'dashF' || a === 'walkB' || a === 'dashB') {
      const wantF = a === 'walkF' || a === 'dashF';
      this.gazeLeadTotal++;
      if ((this.gazeDir > 0 && wantF) || (this.gazeDir < 0 && !wantF)) this.gazeLeadHit++;
    }
    return { predicted, p };
  }

  observeStimulus(t: number) { this.stimulusT = t; }

  observeSpacing(dist: number) {
    this.spacing[bucketOf(dist)] += 1;
  }

  observeTap(gapMs: number) {
    if (gapMs > 20 && gapMs < 1500) {
      this.tapSpeed = this.tapSpeed === 0 ? gapMs : this.tapSpeed * 0.85 + gapMs * 0.15;
    }
  }

  observeGaze(nx: number, ny: number, t: number) {
    const zx = nx < 0.34 ? 0 : nx < 0.67 ? 1 : 2;
    const zy = ny < 0.5 ? 0 : 1;
    this.gaze[zy * 3 + zx] += 1;
    if (this.lastGaze) {
      const dt = Math.max(16, t - this.lastGaze.t);
      const dx = nx - this.lastGaze.x;
      const dy = ny - this.lastGaze.y;
      const sp = (Math.hypot(dx, dy) * 1000) / dt;
      this.gazeSpeed = this.gazeSpeed * 0.9 + sp * 0.1;
      if (Math.abs(dx) > 0.004) this.gazeDir = this.gazeDir * 0.6 + Math.sign(dx) * 0.4;
    }
    this.lastGaze = { x: nx, y: ny, t };
  }

  // ── 예측 (백오프 혼합 n-gram)
  predict(dist: number): Prediction {
    const prev = this.history[this.history.length - 1] ?? 'none';
    const prev2 = this.history[this.history.length - 2] ?? 'none';
    const b = bucketOf(dist);

    const c2 = this.ctx2.get(`${prev2}>${prev}`) ?? {};
    const c1 = this.ctx1.get(`${b}|${prev}`) ?? {};
    const cd = this.ctxDist.get(`${b}`) ?? {};
    const n2 = total(c2), n1 = total(c1), nd = total(cd), ng = total(this.global);

    const w2 = n2 / (n2 + 4.5), w1 = n1 / (n1 + 4), wd = nd / (nd + 6);
    const score: Record<string, number> = {};
    let sum = 0;
    for (const a of L_ACTIONS) {
      const p2 = n2 ? (c2[a] ?? 0) / n2 : 0;
      const p1 = n1 ? (c1[a] ?? 0) / n1 : 0;
      const pd = nd ? (cd[a] ?? 0) / nd : 0;
      const pg = ng ? (this.global[a] ?? 0) / ng : 1 / L_ACTIONS.length;
      const v = 0.02 + w2 * 1.35 * p2 + w1 * 1.1 * p1 + wd * 0.7 * pd + 0.55 * pg;
      score[a] = v; sum += v;
    }
    const dist2 = {} as Record<LAction, number>;
    let best: LAction = 'light', bp = 0, ent = 0;
    for (const a of L_ACTIONS) {
      const p = score[a] / sum;
      dist2[a] = p;
      if (p > 0) ent -= p * Math.log2(p);
      if (p > bp) { bp = p; best = a; }
    }
    const pred: Prediction = { action: best, p: bp, entropy: ent / Math.log2(L_ACTIONS.length), dist: dist2 };
    this.live = pred;
    return pred;
  }

  // ── 노이즈 버스트: 학습 데이터 훼손
  scramble() {
    const decay = (c: Counts) => { for (const k in c) c[k as LAction] = (c[k as LAction] ?? 0) * 0.22; };
    decay(this.global);
    this.ctx1.forEach(decay); this.ctx2.forEach(decay); this.ctxDist.forEach(decay);
    this.samples = Math.floor(this.samples * 0.3);
    this.history = this.history.slice(-2);
    this.predictHits = Math.floor(this.predictHits * 0.4);
    this.pushLog('⚠ 학습 데이터 손상 — 신경망 재구축 중');
  }

  // ── 의사결정
  decide(s: {
    dist: number; actionable: boolean; playerAirborne: boolean;
    playerAttacking: boolean; playerBlocking: boolean; playerRecovering: boolean;
    meter: number; aiHp: number; facingRight: boolean; t: number;
  }): Intent {
    if (this.desync > 0) { this.desync--; this.plan = null; return { ...NEUTRAL_INTENT }; }

    if (this.delay > 0) {
      this.delay--;
      if (this.delay === 0 && this.queued) {
        this.plan = { intent: this.queued, frames: this.queuedHold };
        this.queued = null;
      } else {
        return this.plan?.intent ?? { ...NEUTRAL_INTENT };
      }
    }
    if (this.plan && this.plan.frames > 0) {
      this.plan.frames--;
      const it = this.plan.intent;
      // 공격/대시는 1프레임만 (엣지 입력)
      const out: Intent = { ...it };
      it.attack = null; it.dash = 0; it.jump = false;
      return out;
    }
    if (!s.actionable) return { ...NEUTRAL_INTENT };

    const P = this.params;
    const pred = this.predict(s.dist);

    // ── 던전 5층: 플레이어의 최악 습관만으로 싸운다
    if (this.worstHabits.length) {
      const f = s.facingRight ? 1 : -1;
      const mkW = (o: Partial<Intent>): Intent => ({ ...NEUTRAL_INTENT, ...o });
      const pick = this.worstHabits[Math.floor(this.rng() * this.worstHabits.length)] as LAction;
      let it = this.kindToIntent(pick, f, mkW);
      if (s.dist > 230 && !['wave', 'dashF', 'walkF', 'jump'].includes(pick)) it = mkW({ dash: f });
      const rct = Math.max(2, Math.round(P.react * 0.7));
      this.queuedHold = 10;
      this.queued = it; this.delay = rct;
      const hold = mkW({ block: it.block, crouch: it.crouch });
      this.plan = { intent: hold, frames: rct };
      return hold;
    }
    const useModel = this.rng() < P.model * Math.min(1, 0.35 + this.absorption) && this.samples > 4;
    const fwd = s.facingRight ? 1 : -1;
    const mk = (o: Partial<Intent>): Intent => ({ ...NEUTRAL_INTENT, ...o });

    let intent: Intent = mk({});
    let mirrorPicked = false;
    this.mirroring = false;

    // ── 0. 확정 처형: 플레이어가 경직/리커버리 → 풀 콤보
    if (s.playerRecovering && s.dist < 130) {
      intent = mk({ attack: s.dist < 80 ? 'heavy' : 'light', moveDir: fwd });
    }
    // ── 1. 초필살기 (메터 100)
    else if (s.meter >= 100 && s.dist < 210 && this.rng() < 0.18 + 0.09 * this.stage.lv) {
      intent = mk({ attack: 'super' });
      this.pushLog('시뮬라: 역-학습 오버라이드 발동');
    }
    // ── 1b. 버스트 (메터 50)
    else if (s.meter >= 50 && s.meter < 100 && s.dist < 175 && this.rng() < 0.1 + 0.08 * this.round) {
      intent = mk({ attack: 'burst' });
      this.pushLog('시뮬라: 흡수한 패턴 방출');
    }
    // ── 2. 미러 선행 복사 (0.01초 먼저) — Lv.3+
    else if (
      this.stage.lv >= 3 && useModel && pred.p > 0.28 && s.dist < 170 &&
      this.rng() < P.mirror && isAttack(pred.action)
    ) {
      mirrorPicked = true;
      intent = mk({ attack: toAttack(pred.action) as AttackId, moveDir: 0 });
    }
    // ── 3. 습관 처벌 (Lv.4+) — 예측 기반 카운터
    else if (useModel && pred.p > 0.2 && this.rng() < 0.35 + P.punish * 0.65) {
      intent = this.counter(pred.action, s.dist, fwd, mk);
      if (this.stage.lv >= 4 && pred.p > 0.45 && this.rng() < 0.25) {
        this.pushLog(`습관 처벌: ${ACTION_KR[pred.action]} 대응`);
      }
    }
    // ── 4. 모방 (Lv.2+) — 플레이어가 자주 쓰는 기술을 그대로 따라 함
    else if (this.stage.p.mimic > 0 && this.rng() < P.mimic && this.samples > 6) {
      const m = this.sampleFavorite(s.dist);
      if (m) {
        intent = this.kindToIntent(m, fwd, mk);
        if (this.rng() < 0.12) this.pushLog(`모방: ${ACTION_KR[m]}`);
      } else intent = this.baseline(s.dist, fwd, mk, P.aggro);
    }
    // ── 5. 기본 행동
    else {
      intent = this.baseline(s.dist, fwd, mk, P.aggro);
    }

    // ── 노이즈: 완전 무결하지 않게
    if (this.rng() < P.noise) {
      intent = this.baseline(s.dist, fwd, mk, P.aggro * 0.8);
      mirrorPicked = false;
    }
    // 대공 반사
    if (s.playerAirborne && s.dist < 165 && this.rng() < 0.3 + 0.25 * this.round) {
      intent = mk({ attack: 'heavy' });
      mirrorPicked = false;
    }

    if (mirrorPicked) {
      this.mirroring = true;
      this.mirrorFlashT = 34;
      this.pushLog(`미러링: ${ACTION_KR[pred.action]} 선행 복사`);
    }

    // 선행 복사는 사실상 지연 없이 (0.01초 먼저 나가는 연출)
    const isMove = !intent.attack && intent.dash === 0 && !intent.jump;
    const react = mirrorPicked ? 1
      : isMove ? Math.max(1, Math.round(P.react * 0.3))
        : Math.max(1, Math.round(P.react * (0.6 + this.rng() * 0.8)));
    this.queuedHold = isMove ? 14 + Math.floor(this.rng() * 12) : 8;
    this.queued = intent;
    this.delay = react;
    this.plan = { intent: mk({ block: intent.block, crouch: intent.crouch }), frames: react };
    return this.plan.intent;
  }

  /** 모방자: 플레이어가 이 거리에서 자주 쓰는 행동을 샘플링 */
  private sampleFavorite(dist: number): LAction | null {
    const b = bucketOf(dist);
    const pool = this.ctxDist.get(`${b}`) ?? this.global;
    const allow: LAction[] = ['light', 'heavy', 'low', 'grab', 'wave', 'upper', 'slide', 'block', 'jump', 'dashF', 'dashB'];
    let tot = 0;
    for (const a of allow) tot += pool[a] ?? 0;
    if (tot < 3) return null;
    let t = this.rng() * tot;
    for (const a of allow) { t -= pool[a] ?? 0; if (t <= 0) return a; }
    return null;
  }

  private kindToIntent(k: LAction, fwd: number, mk: (o: Partial<Intent>) => Intent): Intent {
    switch (k) {
      case 'block': return mk({ block: true });
      case 'blockLow': return mk({ block: true, crouch: true });
      case 'jump': return mk({ jump: true, moveDir: fwd });
      case 'dashF': return mk({ dash: fwd });
      case 'dashB': return mk({ dash: -fwd });
      case 'walkF': return mk({ moveDir: fwd });
      case 'walkB': return mk({ moveDir: -fwd });
      case 'super': return mk({ attack: 'light' });
      default: return mk({ attack: k as AttackId, moveDir: k === 'grab' ? fwd : 0 });
    }
  }

  private counter(a: LAction, dist: number, fwd: number, mk: (o: Partial<Intent>) => Intent): Intent {
    switch (a) {
      case 'light':
      case 'heavy':
        if (dist < 118) return this.rng() < 0.5 ? mk({ block: true }) : mk({ attack: 'upper' });
        return mk({ attack: 'low' });
      case 'low':
        return dist < 130 ? mk({ block: true, crouch: true }) : mk({ attack: 'heavy' });
      case 'grab':
        return mk({ attack: 'light', moveDir: fwd });
      case 'wave':
        return dist > 230 ? mk({ attack: 'wave' }) : mk({ attack: 'slide' });
      case 'upper':
        return mk({ block: true });
      case 'slide':
        return dist < 150 ? mk({ block: true, crouch: true }) : mk({ attack: 'wave' });
      case 'super':
        return mk({ block: true, dash: -fwd });
      case 'block':
        return dist < 92 ? mk({ attack: 'grab' }) : mk({ moveDir: fwd, dash: dist > 150 ? fwd : 0 });
      case 'blockLow':
        return dist < 92 ? mk({ attack: 'grab' }) : mk({ attack: 'heavy', moveDir: fwd });
      case 'jump':
        return mk({ attack: 'upper' });
      case 'dashF':
        return dist > 140 ? mk({ attack: 'heavy' }) : mk({ attack: 'light' });
      case 'dashB':
      case 'walkB':
        return mk({ moveDir: fwd, dash: dist > 170 ? fwd : 0, attack: dist < 110 ? 'grab' : null });
      case 'walkF':
        return mk({ attack: dist < 140 ? 'low' : 'light' });
      default:
        return mk({ moveDir: fwd });
    }
  }

  private baseline(dist: number, fwd: number, mk: (o: Partial<Intent>) => Intent, aggro: number): Intent {
    const r = this.rng();
    const sp = 0.2 + this.round * 0.16;  // 라운드가 오를수록 필살기 사용 증가
    if (dist > 240) {
      if (r < sp * 0.85) return mk({ attack: 'wave' });
      if (r < 0.5) return mk({ dash: fwd });
      if (r < 0.88) return mk({ moveDir: fwd });
      return mk({ moveDir: -fwd });
    }
    if (dist > 140) {
      if (r < sp * 0.5) return mk({ attack: 'slide' });
      if (r < sp * 0.75) return mk({ attack: 'wave' });
      if (r < aggro * 0.7) return mk({ attack: 'heavy' });
      if (r < 0.78) return mk({ moveDir: fwd });
      if (r < 0.88) return mk({ dash: -fwd });
      return mk({ block: true });
    }
    if (r < aggro * 0.36) return mk({ attack: 'light' });
    if (r < aggro * 0.56) return mk({ attack: 'low' });
    if (r < aggro * 0.7) return mk({ attack: 'grab' });
    if (r < aggro * 0.7 + sp * 0.35) return mk({ attack: 'upper' });
    if (r < 0.92) return mk({ block: true, crouch: this.rng() < 0.45 });
    return mk({ moveDir: -fwd });
  }

  topPatterns(): { seq: string; next: LAction; p: number; n: number }[] {
    const out: { seq: string; next: LAction; p: number; n: number }[] = [];
    this.ctx2.forEach((c, key) => {
      const n = total(c);
      if (n < 2.4) return;
      let best: LAction = 'light', bp = 0;
      for (const a of L_ACTIONS) {
        const p = (c[a] ?? 0) / n;
        if (p > bp) { bp = p; best = a; }
      }
      const parts = key.split('>');
      if (parts[0] === 'none') return;
      const seq = parts.map((x) => ACTION_KR[x as LAction] ?? '?').join(' → ');
      out.push({ seq, next: best, p: bp, n });
    });
    out.sort((x, y) => y.p * Math.log(1 + y.n) - x.p * Math.log(1 + x.n));
    return out.slice(0, 4);
  }

  tickFlash() { if (this.levelUpFlash > 0) this.levelUpFlash--; }

  snapshot(): BrainSnapshot {
    const ng = total(this.global);
    const actionDist = L_ACTIONS
      .map((a) => ({ a, p: ng ? (this.global[a] ?? 0) / ng : 0, n: this.global[a] ?? 0 }))
      .filter((d) => d.n > 0)
      .sort((x, y) => y.p - x.p)
      .slice(0, 6);
    const span = this.actionTimes.length > 1
      ? (this.actionTimes[this.actionTimes.length - 1] - this.actionTimes[0]) / 1000
      : 0;
    const apm = span > 1 ? (this.actionTimes.length / span) * 60 : 0;
    const gz = this.gaze.reduce((a, b) => a + b, 0) || 1;
    const leftHalf = (this.gaze[0] + this.gaze[3]) / gz;
    const rightHalf = (this.gaze[2] + this.gaze[5]) / gz;
    const focus = rightHalf > leftHalf + 0.15 ? '시뮬라 고정' : leftHalf > rightHalf + 0.15 ? '자기 캐릭터 고정' : '중앙 스캔';
    const tot = this.predictHits + this.predictMisses;
    return {
      absorption: this.absorption,
      samples: this.samples,
      apm,
      avgInterval: this.intervalEMA,
      fastestInterval: this.fastestInterval === 9999 ? 0 : this.fastestInterval,
      reaction: this.reactionEMA,
      accuracy: tot ? this.predictHits / tot : 0,
      hits: this.predictHits,
      misses: this.predictMisses,
      prediction: this.live?.action ?? null,
      confidence: this.live?.p ?? 0,
      entropy: this.live?.entropy ?? 1,
      mirroring: this.mirrorFlashT > 0,
      topPatterns: this.topPatterns(),
      actionDist,
      spacing: this.spacing.slice(),
      gaze: this.gaze.slice(),
      gazeSpeed: this.gazeSpeed,
      gazeLead: this.gazeLeadTotal ? this.gazeLeadHit / this.gazeLeadTotal : 0,
      focus,
      tapSpeed: this.tapSpeed,
      lastLog: this.log.slice(0, 5),
      xp: Math.round(this.xp),
      stageLv: this.stage.lv,
      stageKey: this.stage.key,
      stageKr: this.stage.kr,
      stageEn: this.stage.en,
      stageColor: this.stage.color,
      stageIcon: this.stage.icon,
      stageQuote: this.stage.quote,
      stageSummary: this.stage.summary,
      stageRatio: stageProgress(this.xp).ratio,
      stageRemain: stageProgress(this.xp).remain,
      nextStageKr: stageProgress(this.xp).next?.kr ?? null,
      levelUpFlash: this.levelUpFlash,
    };
  }
}

export function isAttack(a: LAction): boolean {
  return a === 'light' || a === 'heavy' || a === 'low' || a === 'grab'
    || a === 'wave' || a === 'upper' || a === 'slide';
}
export function toAttack(a: LAction): AttackId | null {
  return isAttack(a) ? (a as AttackId) : null;
}
