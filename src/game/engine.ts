// ─────────────────────────────────────────────────────────────
//  격투 시뮬레이션 엔진 (고정 60fps 스텝)
// ─────────────────────────────────────────────────────────────
import {
  ARENA, MOVES, NEUTRAL_INTENT, PHYS,
  type AttackId, type Fighter, type FxText, type Intent, type MoveDef,
  type Particle, type Phase, type Projectile,
} from './types';
import { Rng, hash32, hashStr, q } from './rng';
import { deepClone } from './snapshot';

/** 롤백 넷코드/서버 재검증용 스냅샷. 함수와 클래스 인스턴스 참조는 제외된 순수 상태. */
export interface EngineSnapshot {
  frame: number;
  rngState: number | null;
  eng: Record<string, unknown>;
  brain: Record<string, unknown>;
}
import { ACTION_KR, MirrorBrain, type LAction } from './brain';
import { emptyRaw, type ActKind, type RawProfile } from './dna';
import { BUCKET_KEYS, DnaBot, type BotState } from './dnaBot';
import { KRA, initRun, type Mission, type MissionRun } from './missions';
import { xpForAction } from './evolution';
import {
  emptyTally, makeRead, tallyBreak, tallyRead,
  type ReadEvent, type ReadKind, type ReadTally,
} from './readmoment';
import type { ReplayEvent } from './replay';

export interface TrailSample {
  x: number; y: number; facing: 1 | -1; state: string; move: AttackId | null; moveFrame: number;
}

export interface MatchStats {
  dmgDealt: number; dmgTaken: number; hits: number; blocked: number;
  whiffs: number; maxCombo: number; habitBreaks: number; bursts: number;
  maxComboDmg: number; cancels: number; specials: number; supers: number;
}

export interface ComboFeed {
  hits: number; dmg: number; route: string[]; life: number; best: boolean;
}

function makeFighter(id: 'player' | 'simula', x: number, facing: 1 | -1): Fighter {
  return {
    id, x, y: 0, vx: 0, vy: 0, facing,
    hp: 100, maxHp: 100, meter: 0,
    state: 'idle', timer: 0, move: null, moveFrame: 0, hasHit: false,
    blocking: false, blockLow: false, crouching: false, dashDir: 0,
    combo: 0, flash: 0, guardFlash: 0, wobble: 0, lastAction: '',
    cancelWindow: 0, cancelFrom: null, hitCount: 0, chainDepth: 0,
    invuln: false, superFlash: 0,
  };
}

const EMPTY_STATS = (): MatchStats => ({
  dmgDealt: 0, dmgTaken: 0, hits: 0, blocked: 0, whiffs: 0, maxCombo: 0,
  habitBreaks: 0, bursts: 0, maxComboDmg: 0, cancels: 0, specials: 0, supers: 0,
});

export class Engine {
  p = makeFighter('player', 320, 1);
  a = makeFighter('simula', 640, -1);
  brain = new MirrorBrain();

  frame = 0;
  round = 1;
  wins: [number, number] = [0, 0];
  phase: Phase = 'intro';
  phaseTimer = 130;
  timeLeft = 60 * 60;
  hitStop = 0;
  shake = 0;
  flashScreen = 0;
  glitch = 0;
  texts: FxText[] = [];
  particles: Particle[] = [];
  trail: TrailSample[] = [];
  banner = '';
  bannerSub = '';
  roundWinner: 'player' | 'simula' | 'draw' | null = null;
  matchWinner: 'player' | 'simula' | null = null;
  stats: MatchStats = EMPTY_STATS();
  comboCounter = 0;
  projectiles: Projectile[] = [];
  comboFeed: ComboFeed = { hits: 0, dmg: 0, route: [], life: 0, best: false };
  bestComboDmg = 0;

  // ── AI 육성 레이어
  recorder: RawProfile = emptyRaw();
  recording = true;              // 인간 플레이 시 DNA 수집
  pBot: DnaBot | null = null;    // 좌측(내 AI) 봇 — 설정 시 무인 대전
  aBot: DnaBot | null = null;    // 우측 봇 — 설정 시 MirrorBrain 대신 사용
  headless = false;              // 연출/FX 생략 (비동기 시뮬레이션)
  names: [string, string] = ['당신', '시뮬라'];
  skinColor = '#cfe0f5';   // 장착된 AI 스킨 (코스메틱)
  private lastKind = 'none';
  private lastKind2 = 'none';
  private oppWasDown = false;
  private iWasDown = false;
  private iWasHit = false;
  private iWasBlocking = false;
  private pendingMove: AttackId | null = null;   // 처벌률 측정용

  // ── 습관 교정 드릴
  drill: { id: string; banned: string[]; required: string[]; target: number } | null = null;
  drillProgress = 0;
  drillFails = 0;
  drillDone = false;
  drillMsg = '';

  // ── HABIT BREAK MISSION
  run: MissionRun | null = null;
  private comboRouteCounts = new Map<string, number>();
  private okiHistory: string[] = [];
  private lastOkiAct = '';

  // ── READ MOMENT
  read: ReadEvent | null = null;
  tally: ReadTally = emptyTally();
  /** 패배 원인 추적: SIMULA의 기술별 누적 피해 / 내가 맞은 상황 */
  dmgBySimulaMove: Record<string, number> = {};
  dmgAfterRead = 0;          // 읽힌 직후 받은 피해
  dmgWhileAttacking = 0;     // 내가 기술 내다가 맞은 피해
  dmgInCorner = 0;           // 코너에서 받은 피해
  dmgAirborne = 0;           // 공중에서 맞은 피해

  // ── 리플레이 기록
  replayEvents: ReplayEvent[] = [];
  private logEvent(t: ReplayEvent['t'], a?: string, v?: number, conf?: number) {
    if (this.headless || this.pBot) return;
    if (this.replayEvents.length > 1400) return;
    this.replayEvents.push({ f: this.frame, t, a, v, conf });
  }
  slowMo = 0;                     // >0 이면 프레임 스킵 (슬로우 모션)
  private pendingRead: { act: string; conf: number; repeat: number; at: number } | null = null;
  private actStreak: { act: string; n: number } = { act: '', n: 0 };

  // 플레이어 행동 추출용 상태
  private walkHold = 0;
  private prevBlock = false;

  // ── 결정론 주입 (ROADMAP Phase 0-A)
  // 기본값은 기존 동작과 동일(Math.random / performance.now) — 실전 플레이에는 영향 없음.
  // 헤드리스/AI 시뮬레이션에서는 setDeterminism()으로 시드 난수·고정 시계를 주입해 재현성을 확보한다.
  private rng: () => number = Math.random;
  private now: () => number = () => performance.now();
  /** 결정론 모드에서 사용 중인 RNG 인스턴스 (스냅샷이 내부 상태를 캡처하기 위해 보유) */
  private rngSource: Rng | null = null;

  /** 시드 난수 + 고정 시계 주입. 비동기 리그 재현·서버 재검증·롤백의 전제조건. */
  setDeterminism(seed: number) {
    const r = new Rng(seed);
    this.rngSource = r;
    const fn = () => r.next();
    this.rng = fn;
    this.brain.rng = fn;
    this.now = () => 0;
  }

  constructor() { this.startRound(1, true); }

  startRound(n: number, full: boolean) {
    const keepXp = this.brain.xp;
    this.round = n;
    this.brain.round = n;
    this.brain.reset(full);
    this.brain.xp = keepXp;
    this.brain.setXp(keepXp);
    this.p = makeFighter('player', 320, 1);
    this.a = makeFighter('simula', 640, -1);
    if (!full) { this.p.meter = 20; this.a.meter = 10; }
    this.timeLeft = 60 * 60;
    this.phase = 'intro';
    this.phaseTimer = 130;
    this.roundWinner = null;
    this.texts = []; this.particles = []; this.trail = [];
    this.comboCounter = 0;
    if (this.headless) { this.phase = 'fight'; this.phaseTimer = 0; }
    this.banner = `ROUND ${n}`;
    this.bannerSub = this.aBot ? `${this.names[0]}  vs  ${this.names[1]}  —  거울 대전` :
      n === 1 ? '관찰 모드 — 시뮬라가 당신의 습관을 수집합니다'
        : n === 2 ? '미러 모드 — 학습된 패턴으로 반격합니다'
          : '퍼펙트 미러 — 0.01초 선행 복사 개시';
    this.projectiles = [];
    this.comboFeed = { hits: 0, dmg: 0, route: [], life: 0, best: false };
    this.read = null; this.pendingRead = null; this.slowMo = 0;
    this.actStreak = { act: '', n: 0 };
    if (full) {
      this.tally = emptyTally();
      this.dmgBySimulaMove = {};
      this.dmgAfterRead = 0; this.dmgWhileAttacking = 0;
      this.dmgInCorner = 0; this.dmgAirborne = 0;
      this.replayEvents = [];
    }
    this.lastKind = 'none'; this.lastKind2 = 'none';
    this.iWasDown = false; this.iWasHit = false; this.iWasBlocking = false;
    this.pendingMove = null;
    if (full) { this.stats = EMPTY_STATS(); this.bestComboDmg = 0; }
  }

  resetMatch() {
    this.wins = [0, 0];
    this.matchWinner = null;
    this.frame = 0;
    this.pBot?.reset(); this.aBot?.reset();
    this.startRound(1, true);
  }

  /** AI vs AI 대전 모드로 전환 */
  setupAiMatch(left: DnaBot, right: DnaBot, names: [string, string], headless = false) {
    this.pBot = left; this.aBot = right;
    this.names = names;
    this.recording = false;
    this.headless = headless;
    this.resetMatch();
    if (headless) { this.phase = 'fight'; this.phaseTimer = 0; this.banner = ''; }
  }

  // ── 유틸
  private actionable(f: Fighter) {
    return f.state === 'idle' || f.state === 'walk' || f.state === 'crouch';
  }
  private airborne(f: Fighter) { return f.y < -14; }
  private recovering(f: Fighter) {
    if (f.state !== 'attack' || !f.move) return false;
    const m = MOVES[f.move];
    return f.moveFrame > m.startup + m.active;
  }

  spawnText(x: number, y: number, text: string, color: string, size = 18) {
    if (this.headless) return;
    this.texts.push({ x, y: ARENA.floorY + y, vy: -0.85, life: 62, maxLife: 62, text, color, size });
  }

  spawnParticles(x: number, y: number, n: number, color: string, kind: Particle['kind'] = 'spark', power = 1) {
    if (this.headless) return;
    for (let i = 0; i < n; i++) {
      const ang = this.rng() * Math.PI * 2;
      const sp = (1.5 + this.rng() * 6) * power;
      this.particles.push({
        x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1.4,
        life: 24 + this.rng() * 26, maxLife: 50,
        color, size: 1.6 + this.rng() * 3.4, kind,
      });
    }
  }

  // ── 메인 스텝
  step(pIntent: Intent) {
    this.frame++;
    this.updateFx();

    if (this.hitStop > 0) { this.hitStop--; return; }
    // 슬로우 모션: 2프레임 중 1프레임만 진행
    if (this.slowMo > 0) {
      this.slowMo--;
      if (this.slowMo % 2 === 1) return;
    }

    if (this.phase === 'intro') {
      this.phaseTimer--;
      this.idleBreathe();
      if (this.phaseTimer <= 0) { this.phase = 'fight'; this.banner = ''; }
      return;
    }
    if (this.phase === 'roundEnd' || this.phase === 'matchEnd') {
      this.phaseTimer--;
      this.simulateFighter(this.p, { ...NEUTRAL_INTENT }, this.a);
      this.simulateFighter(this.a, { ...NEUTRAL_INTENT }, this.p);
      if (this.phaseTimer <= 0 && this.phase === 'roundEnd') {
        if (this.wins[0] >= 2 || this.wins[1] >= 2) {
          this.matchWinner = this.wins[0] >= 2 ? 'player' : 'simula';
          this.phase = 'matchEnd';
          this.phaseTimer = 90;
          this.evalMissionEnd(this.matchWinner === 'player');
        } else {
          this.startRound(this.round + 1, false);
        }
      }
      return;
    }

    // ── FIGHT
    this.timeLeft--;
    const dist = Math.abs(this.p.x - this.a.x);
    const useBrain = !this.aBot || !this.pBot;   // 미러 배틀에서도 학습은 계속
    if (useBrain) {
      if (this.frame % 4 === 0) this.brain.predict(dist);
      if (this.frame % 10 === 0) this.brain.observeSpacing(dist);
    }
    if (!this.headless && this.frame % 2 === 0) {
      this.trail.push({ x: this.p.x, y: this.p.y, facing: this.p.facing, state: this.p.state, move: this.p.move, moveFrame: this.p.moveFrame });
      if (this.trail.length > 22) this.trail.shift();
    }

    // 좌측: 사람 or 내 AI 복제본
    let leftIntent = pIntent;
    if (this.pBot) leftIntent = this.pBot.decide(this.botState(this.p, this.a));
    if (useBrain && !this.pBot) this.extractPlayerActions(leftIntent);
    if (this.recording && !this.pBot) this.recordSpacing(dist);

    const aIntent = this.aBot
      ? this.aBot.decide(this.botState(this.a, this.p))
      : this.brain.decide({
        dist,
        actionable: this.actionable(this.a) || (this.a.state === 'dash' && this.a.timer < PHYS.dashFrames - 4),
        playerAirborne: this.airborne(this.p),
        playerAttacking: this.p.state === 'attack',
        playerBlocking: this.p.blocking,
        playerRecovering: this.recovering(this.p) || this.p.state === 'hitstun' || this.p.state === 'down',
        meter: this.a.meter,
        aiHp: this.a.hp,
        facingRight: this.a.facing === 1,
        t: this.now(),
      });
    pIntent = leftIntent;

    this.simulateFighter(this.p, pIntent, this.a);
    this.aiCancel();
    this.simulateFighter(this.a, aIntent, this.p);
    this.separate();
    this.updateProjectiles();

    if (this.brain.mirrorFlashT > 0) this.brain.mirrorFlashT--;
    this.brain.tickFlash();

    // 라운드 종료 판정
    if (this.p.hp <= 0 || this.a.hp <= 0) {
      const pw = this.a.hp <= 0 && this.p.hp > 0;
      this.endRound(pw ? 'player' : this.p.hp <= 0 && this.a.hp <= 0 ? 'draw' : 'simula');
    } else if (this.timeLeft <= 0) {
      this.endRound(this.p.hp > this.a.hp ? 'player' : this.a.hp > this.p.hp ? 'simula' : 'draw');
    }
  }

  private endRound(w: 'player' | 'simula' | 'draw') {
    this.roundWinner = w;
    this.phase = 'roundEnd';
    this.phaseTimer = 170;
    this.hitStop = 12;
    this.shake = 16;
    this.flashScreen = 1;
    if (w === 'player') this.wins[0]++;
    else if (w === 'simula') this.wins[1]++;
    else { this.wins[0]++; this.wins[1]++; }
    if (this.recording && !this.pBot) {
      const r = this.recorder;
      // SIMULA가 예측 적중한 행동 기록
      const acc = this.brain.snapshot();
      if (acc.prediction) r.predictedBy[acc.prediction] = (r.predictedBy[acc.prediction] ?? 0) + acc.hits;
      r.rounds++;
      r.hits = this.stats.hits; r.whiffs = this.stats.whiffs; r.blocked = this.stats.blocked;
      r.dealt = this.stats.dmgDealt; r.taken = this.stats.dmgTaken;
      r.maxCombo = Math.max(r.maxCombo, this.stats.maxCombo);
      r.cancels = this.stats.cancels;
      if (this.wins[0] >= 2 || this.wins[1] >= 2) r.matches++;
    }
    if (this.aBot && this.pBot) { this.banner = w === 'player' ? `${this.names[0]} WIN` : `${this.names[1]} WIN`; }
    const tp = this.brain.topPatterns()[0];
    if (tp) this.brain.pushLog(`습관 확정: ${tp.seq} ▶ ${ACTION_KR[tp.next]} ${Math.round(tp.p * 100)}%`);
    this.brain.pushLog(`라운드 ${this.round} 종료 — 흡수율 ${Math.floor(this.brain.absorption * 100)}%`);
    if (this.aBot) {
      this.banner = `K.O. — ${w === 'player' ? this.names[0] : this.names[1]}`;
      this.bannerSub = `${this.wins[0]} : ${this.wins[1]}`;
    } else {
      this.banner = w === 'player' ? 'K.O. — 습관 탈출 성공' : w === 'simula' ? 'K.O. — 당신의 습관에 패배' : 'DRAW';
      this.bannerSub = w === 'player' ? '시뮬라의 예측 모델이 붕괴했습니다' : '시뮬라가 당신을 0.01초 앞섰습니다';
    }
    if (this.p.hp <= 0) this.p.state = 'ko';
    if (this.a.hp <= 0) this.a.state = 'ko';
  }

  private idleBreathe() {
    for (const f of [this.p, this.a]) { f.wobble += 0.05; f.vx *= 0.8; }
  }

  // ── 플레이어의 이산 행동을 추출해 두뇌에 학습시킨다
  private extractPlayerActions(it: Intent) {
    const f = this.p;
    if (it.attack && this.canAct(f, it.attack)) {
      if (it.attack !== 'burst') this.notePlayer(it.attack as LAction);
      this.recordAct(it.attack as ActKind);
    }
    if (it.dash !== 0 && this.actionable(f)) {
      const k = it.dash === f.facing ? 'dashF' : 'dashB';
      this.notePlayer(k); this.recordAct(k);
    }
    if (it.jump && this.actionable(f)) { this.notePlayer('jump'); this.recordAct('jump'); }
    if (it.block && !this.prevBlock && this.actionable(f)) {
      const k = it.crouch ? 'blockLow' : 'block';
      this.notePlayer(k); this.recordAct(k);
    }
    this.prevBlock = it.block;

    if (it.moveDir !== 0 && !it.block && this.actionable(f)) {
      this.walkHold++;
      if (this.walkHold === 15 || (this.walkHold > 15 && this.walkHold % 34 === 0)) {
        const k = it.moveDir === f.facing ? 'walkF' : 'walkB';
        this.notePlayer(k); this.recordAct(k);
      }
    } else this.walkHold = 0;
    // 상대가 다운하면 다음 행동을 기상 공방으로 기록
    if (this.a.state === 'down') this.oppWasDown = true;
  }

  private canAct(f: Fighter, id: AttackId) {
    if (f.meter < MOVES[id].meterCost) return false;
    if (this.canCancelInto(f, id)) return true;
    if (!this.actionable(f) && !(f.state === 'dash' && f.timer < PHYS.dashFrames - 3)) return false;
    if (this.airborne(f)) return false;
    return true;
  }

  // ── 캔슬 판정: 히트/가드 확인 후 지정된 기술로 연결
  private canCancelInto(f: Fighter, id: AttackId): boolean {
    if (f.state !== 'attack' || !f.move || f.cancelWindow <= 0) return false;
    const from = MOVES[f.move];
    if (!from.cancelTo || !from.cancelTo.includes(id)) return false;
    if (id === f.move && from.cls !== 'normal') return false;
    // 같은 노멀 반복은 2회까지 (약→약→강 체인)
    if (id === f.move && f.chainDepth >= 2) return false;
    if (f.chainDepth >= 5) return false;
    return true;
  }

  // ── 봇에게 넘길 관전 상태
  private botState(me: Fighter, opp: Fighter): BotState {
    const dist = Math.abs(me.x - opp.x);
    const cancelOptions = (me.state === 'attack' && me.move && me.cancelWindow > 0)
      ? (MOVES[me.move].cancelTo ?? []).filter((id) => this.canCancelInto(me, id) && me.meter >= MOVES[id].meterCost)
      : [];
    return {
      dist,
      actionable: this.actionable(me) || (me.state === 'dash' && me.timer < PHYS.dashFrames - 4),
      myHp: me.hp, oppHp: opp.hp, meter: me.meter,
      oppAirborne: this.airborne(opp),
      oppAttacking: opp.state === 'attack' && !!opp.move && opp.moveFrame <= MOVES[opp.move].startup + 2,
      oppRecovering: this.recovering(opp) || opp.state === 'hitstun' || opp.state === 'blockstun',
      oppDown: opp.state === 'down',
      cornered: me.x < ARENA.left + 96 || me.x > ARENA.right - 96,
      oppCornered: opp.x < ARENA.left + 96 || opp.x > ARENA.right - 96,
      facingRight: me.facing === 1,
      canCancel: cancelOptions.length > 0,
      cancelOptions,
    };
  }

  // ── Combat DNA 수집
  private recordSpacing(dist: number) {
    const r = this.recorder;
    r.frames++;
    if (dist < 140) r.nearFrames++;
    else if (dist > 260) r.farFrames++;
    if (this.p.blocking) r.blockFrames++;
  }

  private recordAct(kind: ActKind) {
    if (!this.recording || this.pBot) return;
    const r = this.recorder;
    const opp = this.a;
    const dist = Math.abs(this.p.x - this.a.x);
    const bucket = dist < 96 ? 0 : dist < 168 ? 1 : dist < 260 ? 2 : dist < 370 ? 3 : 4;

    r.actions[kind] = (r.actions[kind] ?? 0) + 1;
    r.totalActs++;
    r.used[kind] = (r.used[kind] ?? 0) + 1;
    const bi = BUCKET_KEYS.indexOf(kind);
    if (bi >= 0) {
      const arr = r.byBucket[bucket];
      while (arr.length < BUCKET_KEYS.length) arr.push(0);
      arr[bi]++;
    }
    r.bigrams[`${this.lastKind}>${kind}`] = (r.bigrams[`${this.lastKind}>${kind}`] ?? 0) + 1;
    const tk = `${this.lastKind2}>${this.lastKind}>${kind}`;
    r.trigrams[tk] = (r.trigrams[tk] ?? 0) + 1;
    this.lastKind2 = this.lastKind;
    this.lastKind = kind;
    this.pendingMove = kind as AttackId;

    // ── 압박 상황: 상대가 근접해서 공세 중 / 내가 코너 + 상대 근접
    const oppNear = dist < 150;
    const oppAggro = opp.state === 'attack' || opp.state === 'dash' ||
      (opp.state === 'walk' && Math.sign(opp.x - this.p.x) !== opp.facing);
    const meCorner = this.p.x < ARENA.left + 110 || this.p.x > ARENA.right - 110;
    if (oppNear && (oppAggro || meCorner)) {
      r.pressureActs[kind] = (r.pressureActs[kind] ?? 0) + 1;
    }
    // ── 내 기상 직후
    if (this.iWasDown) { r.wakeupActs[kind] = (r.wakeupActs[kind] ?? 0) + 1; this.iWasDown = false; }
    // ── 피격 직후
    if (this.iWasHit) { r.postHitActs[kind] = (r.postHitActs[kind] ?? 0) + 1; this.iWasHit = false; }
    // ── 가드 직후
    if (this.iWasBlocking) { r.postBlockActs[kind] = (r.postBlockActs[kind] ?? 0) + 1; this.iWasBlocking = false; }

    this.logEvent('act', kind);
    // 미션 규칙 판정 (oppWasDown 소비 전에)
    this.evalMissionAct(kind);

    // 상대 다운 직후 첫 행동 (기상 공방 습관)
    if (this.oppWasDown) {
      r.okizeme[kind] = (r.okizeme[kind] ?? 0) + 1;
      this.oppWasDown = false;
    }
    this.checkDrill(kind);
    if (this.p.hp < 32) r.lowHpActs[kind] = (r.lowHpActs[kind] ?? 0) + 1;
    if (this.p.x < ARENA.left + 96 || this.p.x > ARENA.right - 96) {
      r.corneredActs[kind] = (r.corneredActs[kind] ?? 0) + 1;
    }
    // 카운터 성향: 상대 기술 발생 중에 공격을 시도
    if (opp.state === 'attack' && opp.move && opp.moveFrame <= MOVES[opp.move].startup + 3) {
      if (kind !== 'block' && kind !== 'blockLow' && kind !== 'walkB' && kind !== 'dashB') r.counterActs++;
    }
    if (kind === 'super' || kind === 'burst') {
      r.superCount++; r.superHpSum += this.p.hp; r.superOppHpSum += this.a.hp;
    }
  }

  // ═══════════════════════════════════════════════
  //  HABIT BREAK MISSION — 규칙 판정
  // ═══════════════════════════════════════════════
  /** 던전 5층: SIMULA가 플레이어의 최악 습관만 사용 */
  setWorstHabitMode(acts: string[]) {
    this.brain.worstHabits = acts;
  }

  startMission(m: Mission) {
    this.run = initRun(m);
    this.comboRouteCounts.clear();
    this.okiHistory = [];
    this.lastOkiAct = '';
  }

  clearMission() { this.run = null; }

  private violate(text: string) {
    const run = this.run;
    if (!run || run.failed) return;
    run.violations.push({ at: this.frame, text });
    run.failed = true;
    run.failReason = text;
    this.glitch = 34;
    this.shake = 16;
    this.flashScreen = 0.8;
    this.hitStop = 6;
    this.spawnText(this.p.x, -212, '습관 발동 — 미션 실패', '#fb7185', 20);
    this.spawnParticles(this.p.x, ARENA.floorY - 80, 24, '#fb7185', 'shard', 1.3);
    this.banner = 'HABIT DETECTED';
    this.bannerSub = text;
  }

  private isPressured(): boolean {
    const dist = Math.abs(this.p.x - this.a.x);
    const oppAggro = this.a.state === 'attack' || this.a.state === 'dash';
    const meCorner = this.p.x < ARENA.left + 110 || this.p.x > ARENA.right - 110;
    const meHurt = this.p.state === 'blockstun' || this.p.state === 'hitstun';
    return dist < 155 && (oppAggro || meCorner || meHurt);
  }

  /** 행동 입력 시점의 미션 규칙 검사 */
  private evalMissionAct(kind: string) {
    const run = this.run;
    if (!run || run.failed || run.cleared) return;
    const pressured = this.isPressured();

    for (const st of run.states) {
      const r = st.rule;
      switch (r.kind) {
        case 'countLimit': {
          if (!r.acts?.includes(kind)) break;
          st.count++;
          st.detail = `${st.count} / ${r.limit}`;
          if (st.count > (r.limit ?? 0)) {
            st.ok = false;
            this.violate(`${KRA(kind)} ${r.limit}회 초과 (${st.count}회)`);
          } else if (st.count === r.limit) {
            this.spawnText(this.p.x, -190, `${KRA(kind)} 잔여 0`, '#fbbf24', 15);
          }
          break;
        }
        case 'noSequence': {
          const [a, b] = r.seq!;
          if (this.lastKind === a && kind === b) {
            st.ok = false; st.count++;
            this.violate(`${KRA(a)} → ${KRA(b)} 연계 사용`);
          } else {
            st.detail = '유지 중';
          }
          break;
        }
        case 'contextForce': {
          if (!pressured) { st.detail = '대기'; break; }
          if (r.banned?.includes(kind)) {
            st.ok = false; st.count++;
            this.violate(`압박 상황에서 ${KRA(kind)} 사용 (회피 금지)`);
          } else if (r.forced?.includes(kind)) {
            st.count++;
            st.detail = `가드 유지 ${st.count}회`;
            this.spawnText(this.p.x, -178, '버팀 +1', '#7dffc2', 14);
          }
          break;
        }
        case 'noRepeatOki': {
          if (!this.oppWasDown) break;
          if (this.lastOkiAct && this.lastOkiAct === kind) {
            st.ok = false; st.count++;
            this.violate(`기상 공방에서 ${KRA(kind)} 연속 반복`);
          } else {
            this.okiHistory.push(kind);
            st.count = new Set(this.okiHistory).size;
            st.detail = `선택지 ${st.count}종`;
            this.spawnText(this.p.x, -178, `MIX +1 (${st.count}종)`, '#ff9a3c', 14);
          }
          this.lastOkiAct = kind;
          break;
        }
        default: break;
      }
    }
  }

  /** 콤보 종료 시 루트 반복 검사 */
  private evalMissionRoute(route: string[]) {
    const run = this.run;
    if (!run || run.failed || run.cleared || route.length < 2) return;
    const st = run.states.find((s) => s.rule.kind === 'noRepeatCombo');
    if (!st) return;
    const key = route.join('>');
    const n = (this.comboRouteCounts.get(key) ?? 0) + 1;
    this.comboRouteCounts.set(key, n);
    st.count = Math.max(st.count, n);
    st.detail = `최다 반복 ${st.count}회`;
    if (n > (st.rule.limit ?? 2)) {
      st.ok = false;
      this.violate(`동일 콤보 반복: ${route.join(' ▸ ')} (${n}회)`);
    } else if (n === st.rule.limit) {
      this.spawnText(this.p.x, -196, `이 루트 잔여 0`, '#fbbf24', 15);
    }
  }

  /** 매치 종료 시 최종 판정 */
  private evalMissionEnd(playerWon: boolean) {
    const run = this.run;
    if (!run || run.failed) return;
    const needWin = run.states.find((s) => s.rule.kind === 'requireWin');
    if (needWin) {
      needWin.count = playerWon ? 1 : 0;
      needWin.detail = playerWon ? '승리' : '패배';
      if (!playerWon) {
        run.failed = true;
        run.failReason = '매치 패배 — 습관은 지켰지만 승리하지 못했습니다';
        return;
      }
    }
    const ctx = run.states.find((s) => s.rule.kind === 'contextForce');
    if (ctx && ctx.count < 3) {
      run.failed = true;
      run.failReason = '압박 상황에서 가드로 버틴 횟수가 부족합니다 (3회 필요)';
      return;
    }
    const oki = run.states.find((s) => s.rule.kind === 'noRepeatOki');
    if (oki && oki.count < 2) {
      run.failed = true;
      run.failReason = '기상 공방 선택지가 2종 미만입니다';
      return;
    }
    run.cleared = true;
    this.banner = 'HABIT BREAK 성공';
    this.bannerSub = run.mission.reward;
    this.flashScreen = 1;
    this.spawnParticles(this.p.x, ARENA.floorY - 80, 40, '#7dffc2', 'ring', 1.8);
  }

  // ── 드릴 판정: 금지 행동 사용 시 즉시 실패, 요구 행동 순환 시 진행
  private checkDrill(kind: string) {
    const d = this.drill;
    if (!d || this.drillDone) return;
    if (d.banned.includes(kind)) {
      this.drillFails++;
      this.drillMsg = `금지된 습관 사용: ${kind}`;
      this.glitch = 20;
      this.shake = 10;
      this.spawnText(this.p.x, -206, '습관 발동 — 실패', '#fb7185', 18);
      this.p.hp = Math.max(1, this.p.hp - 6);
    }
  }

  /** 드릴 목표 달성 신호 (히트 확정 시 호출) */
  private drillTick(kind: string) {
    const d = this.drill;
    if (!d || this.drillDone) return;
    if (d.required.length && !d.required.includes(kind)) return;
    this.drillProgress++;
    this.spawnText(this.p.x, -186, `교정 ${this.drillProgress}/${d.target}`, '#7dffc2', 16);
    if (this.drillProgress >= d.target) {
      this.drillDone = true;
      this.drillMsg = '교정 완료';
      this.banner = '습관 교정 완료';
      this.bannerSub = '새로운 선택지가 근육 기억에 기록되었습니다';
      this.flashScreen = 1;
      this.spawnParticles(this.p.x, ARENA.floorY - 80, 34, '#7dffc2', 'ring', 1.6);
    }
  }

  startDrill(id: string, banned: string[], required: string[], target: number) {
    this.drill = { id, banned, required, target };
    this.drillProgress = 0; this.drillFails = 0; this.drillDone = false; this.drillMsg = '';
  }

  private notePlayer(a: LAction) {
    const dist = Math.abs(this.p.x - this.a.x);
    const res = this.brain.observe(a, dist, this.now());
    // 진화 XP: 관찰할수록 SIMULA가 자란다
    this.brain.addXp(xpForAction(res.predicted));
    // ── 같은 행동 연속 카운트
    if (this.actStreak.act === a) this.actStreak.n++;
    else this.actStreak = { act: a, n: 1 };
    const repeat = Math.round(this.recorder.used[a] ?? this.actStreak.n);

    const lv = this.brain.stage.lv;
    if (lv >= 3 && this.brain.samples > 6 && res.p > 0.3) {
      if (res.predicted) {
        this.a.meter = Math.min(100, this.a.meter + 5);
        tallyRead(this.tally, a);
        // READ 연출 — 예측당한 순간
        this.fireRead(res.p > 0.55 ? 'predicted' : 'read', a, res.p, repeat);
        // 이 예측이 실제 피격으로 이어지면 PUNISHED로 승격
        this.pendingRead = { act: a, conf: res.p, repeat, at: this.frame };
      } else {
        this.p.meter = Math.min(100, this.p.meter + 17);
        this.brain.desync = 22;
        this.stats.habitBreaks++;
        this.glitch = 26;
        tallyBreak(this.tally);
        this.fireRead('broke', this.brain.live?.action ?? a, res.p, repeat);
        this.spawnText(this.p.x, -196, '역-학습! +17', '#7dffc2', 20);
        this.spawnParticles(this.a.x, ARENA.floorY - 90, 12, '#7dffc2', 'shard', 1.1);
        this.brain.pushLog('예측 실패 — 동기화 오류');
      }
    }
  }

  /** READ 연출 발화 — 슬로우 모션 + 대형 태그 */
  private fireRead(kind: ReadKind, act: string, conf: number, repeat: number) {
    if (this.headless) return;
    // 같은 연출 도배 방지
    if (this.read && this.read.kind === kind && this.read.life > this.read.maxLife * 0.6) return;
    this.logEvent(kind === 'broke' ? 'break' : 'read', act, undefined, conf);
    this.read = makeRead(kind, act, conf, repeat);
    const heavy = kind === 'punished' || kind === 'predicted';
    this.slowMo = heavy ? 26 : 14;
    this.hitStop = Math.max(this.hitStop, heavy ? 7 : 4);
    this.shake = Math.max(this.shake, heavy ? 12 : 6);
    this.glitch = Math.max(this.glitch, heavy ? 22 : 12);
    if (kind === 'broke') { this.flashScreen = 0.55; this.slowMo = 18; }
  }

  // ── 캐릭터 시뮬레이션
  private simulateFighter(f: Fighter, it: Intent, opp: Fighter) {
    f.wobble += 0.08 + Math.abs(f.vx) * 0.012;
    if (f.flash > 0) f.flash--;
    if (f.guardFlash > 0) f.guardFlash--;
    if (f.state === 'ko') { f.y = Math.min(0, f.y + 2); f.vx *= 0.9; f.x += f.vx; return; }

    // 자동 정면
    if (this.actionable(f)) f.facing = opp.x >= f.x ? 1 : -1;

    switch (f.state) {
      case 'hitstun':
      case 'blockstun':
      case 'down':
      case 'desync': {
        f.timer--;
        f.x += f.vx; f.vx *= 0.86;
        if (this.airborne(f) || f.y < 0) { f.vy += PHYS.gravity; f.y += f.vy; if (f.y > 0) { f.y = 0; f.vy = 0; } }
        if (f.timer <= 0) { f.state = 'idle'; f.combo = 0; f.blocking = false; f.invuln = false; }
        break;
      }
      case 'attack': {
        f.moveFrame++;
        const m = MOVES[f.move ?? 'light'];
        if (f.cancelWindow > 0) f.cancelWindow--;
        f.invuln = !!m.invuln && f.moveFrame >= m.invuln[0] && f.moveFrame <= m.invuln[1];

        // 캔슬 입력 처리 (가장 먼저)
        if (it.attack && this.canAct(f, it.attack)) {
          this.startAttack(f, it.attack, true);
          break;
        }

        f.x += f.vx; f.vx *= m.id === 'slide' ? 0.94 : 0.8;

        // 승룡권형 상승 / 공중 판정
        if (m.launch) {
          if (f.moveFrame === m.startup) { f.vy = m.launch; f.y = -1; }
          if (f.y < 0 || f.vy !== 0) {
            f.vy += PHYS.gravity;
            f.y += f.vy;
            if (f.y >= 0) { f.y = 0; f.vy = 0; }
          }
        }
        // 전진 판정
        if (f.moveFrame === m.startup) {
          if (m.advance) f.vx = f.facing * m.advance;
          else if (m.id === 'heavy' || m.id === 'grab') f.vx = f.facing * 2.2;
          if (m.projectile) this.spawnProjectile(f, m);
        }

        const inActive = f.moveFrame > m.startup && f.moveFrame <= m.startup + m.active;
        if (inActive && !f.hasHit && !m.projectile) this.resolveHit(f, opp, m);
        // 다단 히트 리셋
        if (inActive && m.multi && f.hasHit && f.hitCount < m.multi.times && f.moveFrame % m.multi.interval === 0) {
          f.hasHit = false;
        }
        if (f.moveFrame === m.startup + m.active + 1 && !f.hasHit && f.hitCount === 0 && !m.projectile) {
          if (f.id === 'player') this.stats.whiffs++;
          if (m.id === 'grab') this.spawnText(f.x, -120, 'WHIFF', '#7c8398', 14);
        }
        if (f.moveFrame >= m.startup + m.active + m.recovery && f.y >= 0) {
          f.state = 'idle'; f.move = null; f.moveFrame = 0; f.hasHit = false;
          f.hitCount = 0; f.cancelWindow = 0; f.chainDepth = 0; f.invuln = false;
        }
        break;
      }
      case 'dash': {
        f.timer--;
        f.x += f.dashDir * PHYS.dashSpeed * (f.timer / PHYS.dashFrames + 0.45);
        if (f.timer <= PHYS.dashFrames - 4 && it.attack && this.canAct(f, it.attack)) {
          this.startAttack(f, it.attack);
          break;
        }
        if (f.timer <= 0) { f.state = 'idle'; }
        break;
      }
      case 'jump': {
        f.vy += PHYS.gravity;
        f.y += f.vy;
        f.x += f.vx;
        if (f.y >= 0) { f.y = 0; f.vy = 0; f.vx = 0; f.state = 'idle'; }
        break;
      }
      default: {
        // idle / walk / crouch — 입력 처리
        f.blocking = false; f.crouching = false;
        f.x += f.vx; f.vx *= PHYS.friction;

        if (it.attack && this.canAct(f, it.attack)) { this.startAttack(f, it.attack); break; }
        if (it.dash !== 0) {
          f.state = 'dash'; f.timer = PHYS.dashFrames; f.dashDir = it.dash;
          f.lastAction = it.dash === f.facing ? 'dashF' : 'dashB';
          this.spawnParticles(f.x, ARENA.floorY - 10, 5, f.id === 'player' ? '#38f2ff' : '#cfe6ff', 'spark', 0.5);
          break;
        }
        if (it.jump) {
          f.state = 'jump'; f.vy = PHYS.jumpVy;
          f.vx = it.moveDir * 3.4;
          break;
        }
        if (it.block) {
          f.blocking = true; f.blockLow = it.crouch; f.crouching = it.crouch;
          f.state = 'idle';
          break;
        }
        if (it.crouch) { f.state = 'crouch'; f.crouching = true; break; }
        if (it.moveDir !== 0) {
          const fwd = it.moveDir === f.facing;
          f.x += it.moveDir * (fwd ? PHYS.walk : PHYS.backWalk);
          f.state = 'walk';
        } else f.state = 'idle';
      }
    }
    f.x = Math.max(ARENA.left, Math.min(ARENA.right, f.x));
  }

  private startAttack(f: Fighter, id: AttackId, cancel = false) {
    const m = MOVES[id];
    f.meter = Math.max(0, f.meter - m.meterCost);
    if (cancel) {
      f.chainDepth = id === f.move ? f.chainDepth + 1 : f.chainDepth + 1;
      const label = MOVES[id].kr;
      this.spawnText(f.x, -168 + f.y, `CANCEL ▸ ${label}`, '#ffd447', 15);
      if (f.id === 'player') this.stats.cancels++;
      this.hitStop = Math.max(this.hitStop, 2);
    } else f.chainDepth = 0;
    f.state = 'attack'; f.move = id; f.moveFrame = 0; f.hasHit = false;
    f.hitCount = 0; f.cancelWindow = 0; f.invuln = false;
    f.blocking = false; f.vx *= 0.25;
    f.lastAction = id;
    if (f.id === 'player') {
      if (m.cls === 'special') this.stats.specials++;
      if (m.cls === 'super' && id === 'super') this.stats.supers++;
    }
    if (m.cls === 'special') {
      this.spawnText(f.x, -196 + f.y, m.kr, f.id === 'player' ? '#5ee7ff' : '#ff86c3', 16);
      this.spawnParticles(f.x, ARENA.floorY - 60, 10, f.id === 'player' ? '#5ee7ff' : '#ff86c3', 'spark', 0.8);
    }
    if (id === 'super') {
      this.hitStop = 22; this.flashScreen = 1; this.shake = 18;
      f.superFlash = 70;
      this.spawnText(f.x, -230, m.kr, f.id === 'player' ? '#67e8f9' : '#ff4fa3', 24);
      this.spawnParticles(f.x, ARENA.floorY - 80, 40, f.id === 'player' ? '#9ff4ff' : '#ff86c3', 'ring', 1.8);
      if (f.id === 'player') this.brain.pushLog('오버라이드 — 예측 모델 강제 정지');
    }
    if (id === 'burst') {
      this.shake = 14; this.flashScreen = 0.6;
      if (f.id === 'player') {
        this.brain.scramble();
        this.stats.bursts++;
        this.spawnText(f.x, -210, '노이즈 버스트 — 학습 데이터 파괴', '#7dffc2', 19);
      } else {
        this.spawnText(f.x, -210, '흡수 패턴 방출', '#ff4fa3', 19);
      }
      this.spawnParticles(f.x, ARENA.floorY - 70, 30, f.id === 'player' ? '#7dffc2' : '#ff4fa3', 'ring', 1.6);
    }
    // 시뮬라의 공격 = 플레이어 반응속도 측정용 자극
    if (f.id === 'simula') this.brain.observeStimulus(this.now());
  }

  // ── 비상체 (미러파)
  private spawnProjectile(f: Fighter, m: MoveDef) {
    const pr = m.projectile!;
    this.projectiles.push({
      owner: f.id,
      x: f.x + f.facing * 44,
      y: ARENA.floorY - 92,
      vx: f.facing * pr.speed,
      damage: pr.damage, chip: pr.chip,
      life: pr.life, age: 0, dead: false,
    });
    this.spawnParticles(f.x + f.facing * 44, ARENA.floorY - 92, 10,
      f.id === 'player' ? '#7ff0ff' : '#ff86c3', 'spark', 0.8);
  }

  private updateProjectiles() {
    const list = this.projectiles;
    for (const pr of list) {
      pr.x += pr.vx; pr.age++;
      if (pr.age > pr.life || pr.x < ARENA.left - 60 || pr.x > ARENA.right + 60) pr.dead = true;
    }
    // 비상체 충돌 (파동 상쇄)
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const A = list[i], B = list[j];
        if (A.dead || B.dead || A.owner === B.owner) continue;
        if (Math.abs(A.x - B.x) < 34) {
          A.dead = B.dead = true;
          this.spawnParticles((A.x + B.x) / 2, A.y, 24, '#ffffff', 'spark', 1.5);
          this.spawnText((A.x + B.x) / 2, A.y - ARENA.floorY, 'CLASH', '#ffd447', 18);
          this.shake = 8;
        }
      }
    }
    // 피격 판정
    for (const pr of list) {
      if (pr.dead) continue;
      const def = pr.owner === 'player' ? this.a : this.p;
      if (def.state === 'ko' || def.invuln) continue;
      if (Math.abs(def.x - pr.x) > 40 || def.y < -70) continue;
      pr.dead = true;
      const fake: MoveDef = {
        ...MOVES.wave, damage: pr.damage, chip: pr.chip, reach: 60, pushback: 6,
      };
      const att = pr.owner === 'player' ? this.p : this.a;
      this.applyDamage(att, def, fake, pr.x);
    }
    this.projectiles = list.filter((p) => !p.dead);
  }

  private resolveHit(att: Fighter, def: Fighter, m: MoveDef) {
    const dx = def.x - att.x;
    const dist = Math.abs(dx);
    if (Math.sign(dx) !== att.facing && dist > 12) return;
    if (dist > m.reach + PHYS.bodyHalf) return;
    if (def.state === 'down' || def.state === 'ko') return;
    if (def.invuln) return;
    const defAir = this.airborne(def);
    if ((m.height === 'grab' || m.height === 'low') && defAir) return;
    if (m.height === 'grab' && (def.state === 'attack' || def.state === 'dash' || def.state === 'hitstun')) return;
    this.applyDamage(att, def, m, def.x);
  }

  private applyDamage(att: Fighter, def: Fighter, m: MoveDef, srcX: number) {
    const defAir = this.airborne(def);
    att.hasHit = true;
    att.hitCount++;
    const hy = ARENA.floorY - 78 + def.y;

    const canBlock =
      def.blocking && !defAir &&
      (m.height === 'mid' || (m.height === 'high' && !def.blockLow) || (m.height === 'low' && def.blockLow));

    if (canBlock) {
      def.hp = Math.max(0, def.hp - m.chip);
      def.state = 'blockstun'; def.timer = m.blockstun;
      def.vx = att.facing * m.pushback * 0.7;
      att.vx = -att.facing * m.pushback * 0.25;
      def.guardFlash = 12;
      def.meter = Math.min(100, def.meter + 5);
      att.meter = Math.min(100, att.meter + m.meterGain * 0.4);
      this.hitStop = 3; this.shake = 4;
      this.spawnParticles(srcX - att.facing * 24, hy, 8, '#9fe8ff', 'spark', 0.7);
      this.spawnText(def.x, -132 + def.y, 'GUARD', '#9fe8ff', 14);
      if (def.id === 'player') { this.stats.blocked++; this.iWasBlocking = true; }
      // 가드 시에도 캔슬 가능 (가드 확인 콤보)
      if (att.state === 'attack' && att.move) att.cancelWindow = 16;
      return;
    }

        const wasAttacking = def.id === 'player' && def.state === 'attack';
        if (wasAttacking) this.dmgWhileAttacking += m.damage;
        const counter = def.state === 'attack' && def.move !== null && def.moveFrame <= MOVES[def.move].startup;
    const scale = Math.max(0.42, 1 - 0.085 * def.combo);
    let dmg = m.damage * scale * (counter ? 1.65 : 1);
    if (att.id === 'simula' && !this.aBot) dmg *= this.brain.dmgScale;
    dmg = Math.round(dmg * 10) / 10;

    def.hp = Math.max(0, def.hp - dmg);
    def.combo++;
    def.flash = 9;
    def.blocking = false;

    const lastMulti = !m.multi || att.hitCount >= m.multi.times;
    const knock = (m.knockdown && lastMulti) || m.height === 'grab';
    const juggle = !!m.launch && lastMulti;
    def.state = knock || juggle ? 'down' : 'hitstun';
    def.timer = knock || juggle ? m.hitstun : m.hitstun + (counter ? 8 : 0);
    def.move = null; def.moveFrame = 0;
    def.cancelWindow = 0; def.chainDepth = 0; def.invuln = false;
    def.vx = att.facing * m.pushback * (knock ? 1.5 : m.multi ? 0.25 : 1);
    if (juggle) { def.vy = -11; def.y = -1; }
    else if (knock) { def.vy = -7.5; def.y = -1; }
    att.meter = Math.min(100, att.meter + m.meterGain);
    def.meter = Math.min(100, def.meter + m.meterGain * 0.45);

    const big = m.id === 'heavy' || m.id === 'burst' || m.cls === 'special' || m.cls === 'super';
    this.hitStop = m.id === 'super' ? 4 : big ? 8 : 5;
    this.shake = big ? 13 : 7;
    const col = att.id === 'player' ? '#38f2ff' : '#ff4fa3';
    this.spawnParticles(srcX - att.facing * 18, hy, counter ? 22 : 14, col, 'spark', counter ? 1.5 : 1);
    if (counter) this.spawnText(def.x, -176 + def.y, 'COUNTER', '#ffd447', 20);
    this.spawnText(def.x + 20, -140 + def.y, `-${dmg.toFixed(0)}`, col, 20);

    // 캔슬 창 개방 (히트 확인 콤보)
    if (att.state === 'attack' && att.move && lastMulti) att.cancelWindow = 18;

    // ── 예측 직후 피격 = PUNISHED 승격 (읽혀서 맞았다)
    if (def.id === 'player' && att.id === 'simula' && this.pendingRead
        && this.frame - this.pendingRead.at < 70 && !this.aBot) {
      const pr = this.pendingRead;
      this.pendingRead = null;
      this.fireRead('punished', pr.act, pr.conf, pr.repeat);
      this.brain.pushLog(`처형: ${pr.act} 예측 → 확정 반격`);
    }
    if (def.id === 'player' && this.recording && !this.pBot) {
      this.iWasHit = true;
      // 처벌률: 내가 무언가를 하다가 맞았다
      if (this.pendingMove) {
        this.recorder.punished[this.pendingMove] = (this.recorder.punished[this.pendingMove] ?? 0) + 1;
      }
      if (knock || juggle) this.iWasDown = true;
    }
    if (att.id === 'player' && this.recording && !this.pBot && m.cls !== 'super') {
      this.drillTick(att.move ?? m.id);
    }

    this.logEvent(att.id === 'player' ? 'hit' : 'taken', m.id, dmg);
    if (att.id === 'player') {
      this.stats.dmgDealt += dmg; this.stats.hits++;
      this.comboCounter = def.combo;
      this.stats.maxCombo = Math.max(this.stats.maxCombo, def.combo);
      // 콤보 피드
      const cf = this.comboFeed;
      if (cf.life <= 0 || def.combo === 1) { cf.hits = 0; cf.dmg = 0; cf.route = []; cf.best = false; }
      cf.hits = def.combo; cf.dmg += dmg; cf.life = 110;
      const label = MOVES[(att.move ?? 'light') as AttackId].kr;
      if (cf.route[cf.route.length - 1] !== label || !m.multi) cf.route.push(label);
      if (cf.route.length > 7) cf.route.shift();
      if (cf.dmg > this.bestComboDmg) { this.bestComboDmg = cf.dmg; cf.best = true; }
      this.stats.maxComboDmg = Math.max(this.stats.maxComboDmg, cf.dmg);
    } else {
      this.stats.dmgTaken += dmg;
      // ── 패배 원인 수집
      const mv = m.id;
      this.dmgBySimulaMove[mv] = (this.dmgBySimulaMove[mv] ?? 0) + dmg;
      if (this.pendingRead || (this.read && this.read.life > this.read.maxLife * 0.35)) this.dmgAfterRead += dmg;
      if (this.p.x < ARENA.left + 120 || this.p.x > ARENA.right - 120) this.dmgInCorner += dmg;
      if (defAir) this.dmgAirborne += dmg;
    }
    if (def.id === 'player' && this.brain.mirrorFlashT > 0) {
      this.spawnText(att.x, -214, '0.01초 선행 복사 적중', '#ff4fa3', 16);
    }
  }

  // ── 시뮬라의 캔슬 콤보 루틴 (라운드가 오를수록 길어진다)
  private aiCancel() {
    const f = this.a;
    if (f.state !== 'attack' || !f.move || f.cancelWindow <= 0 || f.cancelWindow > 14) return;
    const from = MOVES[f.move];
    if (!from.cancelTo) return;
    const chance = this.round === 1 ? 0.28 : this.round === 2 ? 0.6 : 0.82;
    if (this.rng() > chance) { f.cancelWindow = 0; return; }
    const dist = Math.abs(this.p.x - this.a.x);
    const opts = from.cancelTo.filter((id) => {
      const m = MOVES[id];
      if (f.meter < m.meterCost) return false;
      if (id === 'wave' && dist < 150) return false;
      if (id === 'grab') return false;
      if (id === f.move && f.chainDepth >= 2) return false;
      return true;
    });
    if (!opts.length) return;
    // 초필살기 마무리 우선
    const pick = opts.includes('super') && f.meter >= 100 && this.rng() < 0.55
      ? 'super'
      : opts.filter((o) => o !== 'super')[Math.floor(this.rng() * Math.max(1, opts.filter((o) => o !== 'super').length))];
    if (!pick) return;
    if (this.canCancelInto(f, pick) && f.meter >= MOVES[pick].meterCost) {
      this.startAttack(f, pick, true);
    }
  }

  // ── 롤백 스냅샷 (ROADMAP Phase 0-A)
  /** 순수 상태만 복제한다. 함수(메서드·rng/now)와 클래스 인스턴스(brain/aBot/pBot)는 제외. */
  snapshot(): EngineSnapshot {
    const eng: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(this)) {
      if (typeof v === 'function' || k === 'rng' || k === 'now' || k === 'rngSource'
        || k === 'brain' || k === 'aBot' || k === 'pBot') continue;
      eng[k] = deepClone(v);
    }
    const brain: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(this.brain)) {
      if (typeof v === 'function' || k === 'rng') continue;
      brain[k] = deepClone(v);
    }
    return { frame: this.frame, rngState: this.rngSource ? this.rngSource.state : null, eng, brain };
  }

  /** 스냅샷 복원 — 복원 후 동일 입력으로 재시뮬레이션하면 같은 상태에 도달한다(롤백의 기반). */
  restore(s: EngineSnapshot) {
    if (s.rngState != null && this.rngSource) this.rngSource.state = s.rngState;
    const self = this as unknown as Record<string, unknown>;
    for (const [k, v] of Object.entries(s.eng)) self[k] = deepClone(v);
    const b = this.brain as unknown as Record<string, unknown>;
    for (const [k, v] of Object.entries(s.brain)) b[k] = deepClone(v);
  }

  /** 디싱크 감지용 체크섬 — 핵심 전투 상태만 양자화해서 해시한다. */
  checksum(): number {
    let h = hash32(
      this.frame, this.round, this.timeLeft,
      q(this.p.x), q(this.p.y), q(this.p.hp), q(this.p.meter),
      q(this.a.x), q(this.a.y), q(this.a.hp), q(this.a.meter),
      this.wins[0], this.wins[1], this.comboCounter,
    );
    h = hashStr(h, `${this.phase}|${this.roundWinner ?? ''}|${this.matchWinner ?? ''}`);
    return h >>> 0;
  }

  private separate() {
    const min = 54;
    const dx = this.a.x - this.p.x;
    const d = Math.abs(dx);
    if (d < min) {
      const push = (min - d) / 2;
      const s = Math.sign(dx) || 1;
      this.p.x -= s * push; this.a.x += s * push;
      this.p.x = Math.max(ARENA.left, Math.min(ARENA.right, this.p.x));
      this.a.x = Math.max(ARENA.left, Math.min(ARENA.right, this.a.x));
    }
  }

  private updateFx() {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life--; t.y += t.vy; t.vy *= 0.97;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life--; p.x += p.vx; p.y += p.vy;
      p.vy += p.kind === 'ring' ? 0 : 0.24;
      p.vx *= 0.96;
      if (p.kind === 'ring') { p.vx *= 1.04; p.vy *= 1.04; }
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    if (this.shake > 0) this.shake *= 0.86;
    if (this.flashScreen > 0) this.flashScreen *= 0.88;
    if (this.glitch > 0) this.glitch--;
    if (this.read) { this.read.life--; if (this.read.life <= 0) this.read = null; }
    if (this.pendingRead && this.frame - this.pendingRead.at > 70) this.pendingRead = null;
    if (this.comboFeed.life > 0) {
      this.comboFeed.life--;
      // 콤보 종료 시점에 루트 반복 검사
      if (this.comboFeed.life === 0 && this.comboFeed.route.length >= 2) {
        this.evalMissionRoute(this.comboFeed.route);
      }
    }
    if (this.p.superFlash > 0) this.p.superFlash--;
    if (this.a.superFlash > 0) this.a.superFlash--;
  }
}
