// ─────────────────────────────────────────────────────────────
//  COMBAT DNA — 플레이어의 전투 습관을 수치화해 AI 파이터로 복제
//  Your Fighting Style Becomes Your Fighter.
// ─────────────────────────────────────────────────────────────
import type { AttackId } from './types';

export type ActKind =
  | 'light' | 'heavy' | 'low' | 'grab' | 'wave' | 'upper' | 'slide' | 'super' | 'burst'
  | 'block' | 'blockLow' | 'jump' | 'dashF' | 'dashB' | 'walkF' | 'walkB';

export const ATTACK_KINDS: ActKind[] = ['light', 'heavy', 'low', 'grab', 'wave', 'upper', 'slide', 'super', 'burst'];
export const DEF_KINDS: ActKind[] = ['block', 'blockLow', 'dashB', 'walkB'];

export interface ActContext {
  bucket: number;        // 0~4 거리
  oppDown: boolean;      // 상대 다운/경직 직후
  lowHp: boolean;        // 내 체력 30% 이하
  cornered: boolean;     // 내가 코너
  oppCornered: boolean;  // 상대가 코너
  oppAttacking: boolean; // 상대 공격 중 (카운터 성향)
  meterFull: boolean;
}

/** 직렬화 가능한 원시 수집 데이터 */
export interface RawProfile {
  actions: Record<string, number>;
  byBucket: number[][];          // [bucket][actionIndex]
  okizeme: Record<string, number>;   // 상대 다운 후 첫 행동
  lowHpActs: Record<string, number>;
  corneredActs: Record<string, number>;
  pressureActs: Record<string, number>;  // 압박받을 때 (상대 근접 공세)
  wakeupActs: Record<string, number>;    // 내가 다운→기상 직후
  postHitActs: Record<string, number>;   // 피격 경직 직후
  postBlockActs: Record<string, number>; // 가드 직후
  trigrams: Record<string, number>;      // 3연쇄 습관
  punished: Record<string, number>;      // 이 행동을 하다 맞은 횟수
  used: Record<string, number>;          // 이 행동 총 사용 횟수(피니시율 계산)
  predictedBy: Record<string, number>;   // SIMULA가 맞힌 횟수
  counterActs: number;           // 상대 공격 중 반격 시도
  totalActs: number;
  superHpSum: number;            // 궁극기 사용 시 내 체력 합
  superCount: number;
  superOppHpSum: number;
  bigrams: Record<string, number>;
  routes: Record<string, number>;  // 콤보 루트 빈도
  hits: number; whiffs: number; blocked: number; taken: number;
  dealt: number; rounds: number; matches: number;
  frames: number;                 // 총 전투 프레임
  nearFrames: number;             // 근거리 체류 프레임
  farFrames: number;
  blockFrames: number;
  maxCombo: number; cancels: number;
}

export function emptyRaw(): RawProfile {
  return {
    actions: {}, byBucket: [0, 1, 2, 3, 4].map(() => []),
    okizeme: {}, lowHpActs: {}, corneredActs: {},
    pressureActs: {}, wakeupActs: {}, postHitActs: {}, postBlockActs: {},
    trigrams: {}, punished: {}, used: {}, predictedBy: {},
    counterActs: 0, totalActs: 0,
    superHpSum: 0, superCount: 0, superOppHpSum: 0,
    bigrams: {}, routes: {},
    hits: 0, whiffs: 0, blocked: 0, taken: 0, dealt: 0,
    rounds: 0, matches: 0, frames: 0, nearFrames: 0, farFrames: 0, blockFrames: 0,
    maxCombo: 0, cancels: 0,
  };
}

export interface DNA {
  // ── 핵심 9지표
  aggression: number;   // 공격성
  defense: number;      // 방어성
  repetition: number;   // 반복성
  risk: number;         // 위험 감수
  grab: number;         // 잡기 의존도
  aerial: number;       // 점프 의존도
  pressure: number;     // 압박 지속력
  counter: number;      // 카운터 성향
  zoning: number;       // 거리 유지
  // ── 보조 지표
  clutch: number;       // 체력 낮을 때 공격성
  okizemeLow: number;   // 다운 후 하단 선택률
  cornerEscape: number; // 코너 탈출 성향
  superTiming: number;  // 궁극기 사용 타이밍(높을수록 마무리형)
  panic: number;        // 압박 시 도피 선택률 ★
  frameTrap: number;    // 캔슬·딜레이 유도 성향 ★
}

export const CORE_KEYS: (keyof DNA)[] = [
  'aggression', 'defense', 'repetition', 'risk', 'grab',
  'aerial', 'pressure', 'counter', 'zoning',
];

export type Archetype =
  | 'RUSHER' | 'COUNTER_HUNTER' | 'THROW_ADDICT' | 'TURTLE_GUARD'
  | 'PANIC_JUMPER' | 'COMBO_REPEATER' | 'FRAME_TRAP_LOVER' | 'RANDOM_TRICKSTER';

export interface ArchMeta {
  kr: string;
  tagline: string;
  color: string;
  icon: string;
  strong: string;   // 강점
  weak: string;     // 약점 (AI가 노리는 지점)
}

export const ARCHETYPE_META: Record<Archetype, ArchMeta> = {
  RUSHER: {
    kr: '러셔', tagline: '쉬지 않고 파고든다', color: '#ff4fa3', icon: '⚡',
    strong: '압박이 끊기지 않아 상대가 숨 쉴 틈이 없습니다.',
    weak: '전진 리듬이 일정해 무적 대공과 카운터에 걸립니다.',
  },
  COUNTER_HUNTER: {
    kr: '카운터 헌터', tagline: '상대의 발생을 사냥한다', color: '#38f2ff', icon: '◈',
    strong: '상대 기술 발생을 읽고 되받아 최대 데미지를 뽑습니다.',
    weak: '먼저 움직이지 않아 거리 싸움과 장풍에 밀립니다.',
  },
  THROW_ADDICT: {
    kr: '잡기 중독', tagline: '결국 손이 잡기로 간다', color: '#b478ff', icon: '✥',
    strong: '가드를 굳힌 상대를 확실하게 무너뜨립니다.',
    weak: '잡기 타이밍이 고정되어 발생 4F 기술에 끊깁니다.',
  },
  TURTLE_GUARD: {
    kr: '터틀 가드', tagline: '막고 기다린다', color: '#7dffc2', icon: '▣',
    strong: '가드가 단단해 무리한 공격을 모두 흘려보냅니다.',
    weak: '가드 일변도라 잡기와 상단 관통에 일방적으로 당합니다.',
  },
  PANIC_JUMPER: {
    kr: '패닉 점퍼', tagline: '몰리면 위로 도망친다', color: '#8fb4ff', icon: '↑',
    strong: '공중 각도로 상대의 지상 견제를 넘어섭니다.',
    weak: '압박받을 때 점프 선택률이 높아 대공 → 착지 punish가 확정됩니다.',
  },
  COMBO_REPEATER: {
    kr: '콤보 리피터', tagline: '같은 길만 걷는다', color: '#ffd447', icon: '↻',
    strong: '숙련된 루트로 안정적인 데미지를 뽑아냅니다.',
    weak: '루트가 고정되어 두 번째 타격부터 전부 읽힙니다.',
  },
  FRAME_TRAP_LOVER: {
    kr: '프레임 트랩', tagline: '틈을 만들어 낚는다', color: '#ff9a3c', icon: '⌁',
    strong: '캔슬과 딜레이로 상대의 반격 버튼을 유도해 처형합니다.',
    weak: '캔슬 타이밍이 일정해 무적기 역습에 크게 당합니다.',
  },
  RANDOM_TRICKSTER: {
    kr: '랜덤 트릭스터', tagline: '읽을 수 없다', color: '#c0ff4f', icon: '✦',
    strong: '패턴이 없어 예측 모델이 거의 학습하지 못합니다.',
    weak: '일관성이 없어 확정 상황에서 데미지를 놓칩니다.',
  },
};

function share(r: Record<string, number>, keys: ActKind[], total: number): number {
  if (total <= 0) return 0;
  let s = 0;
  for (const k of keys) s += r[k] ?? 0;
  return s / total;
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export function computeDNA(p: RawProfile): DNA {
  const T = Math.max(1, p.totalActs);
  const atk = share(p.actions, ATTACK_KINDS, T);
  const def = share(p.actions, DEF_KINDS, T);
  const fwd = share(p.actions, ['dashF', 'walkF'], T);
  const grabs = (p.actions.grab ?? 0) + (p.actions.slide ?? 0) * 0.3;
  const attackTotal = ATTACK_KINDS.reduce((s, k) => s + (p.actions[k] ?? 0), 0) || 1;

  // 반복 패턴: 바이그램 엔트로피
  const bg = Object.values(p.bigrams);
  const bgTot = bg.reduce((a, b) => a + b, 0) || 1;
  let ent = 0;
  for (const v of bg) { const q = v / bgTot; if (q > 0) ent -= q * Math.log2(q); }
  const maxEnt = Math.log2(Math.max(2, bg.length));
  const repetition = clamp((1 - ent / maxEnt) * 100);

  const lowT = Object.values(p.lowHpActs).reduce((a, b) => a + b, 0) || 1;
  const lowAtk = share(p.lowHpActs, ATTACK_KINDS, lowT);
  const cornT = Object.values(p.corneredActs).reduce((a, b) => a + b, 0) || 1;
  const escape = share(p.corneredActs, ['jump', 'dashB', 'upper'], cornT);
  const okiT = Object.values(p.okizeme).reduce((a, b) => a + b, 0) || 1;
  const okiLow = share(p.okizeme, ['low', 'slide'], okiT);

  const frames = Math.max(1, p.frames);
  const nearRatio = p.nearFrames / frames;
  const farRatio = p.farFrames / frames;
  const apf = p.totalActs / frames;   // 프레임당 입력

  const superHpAvg = p.superCount ? p.superHpSum / p.superCount : 50;
  const superOppAvg = p.superCount ? p.superOppHpSum / p.superCount : 50;

  // ★ 패닉 지수: 압박 상황에서 도피 선택(점프/후퇴)의 비율
  const prT = Object.values(p.pressureActs ?? {}).reduce((a, b) => a + b, 0) || 1;
  const panicEsc = share(p.pressureActs ?? {}, ['jump', 'dashB', 'walkB'], prT);
  const panicJump = ((p.pressureActs ?? {}).jump ?? 0) / prT;

  // ★ 프레임 트랩 지수: 캔슬 밀도 + 가드 후 재공격
  const pbT = Object.values(p.postBlockActs ?? {}).reduce((a, b) => a + b, 0) || 1;
  const reAttack = share(p.postBlockActs ?? {}, ATTACK_KINDS, pbT);
  const cancelDensity = p.cancels / Math.max(8, p.hits);

  return {
    aggression: clamp((atk * 0.68 + fwd * 0.5 + nearRatio * 0.35) * 145),
    defense: clamp((def * 0.75 + p.blockFrames / frames * 0.9) * 155),
    repetition,
    risk: clamp(
      share(p.actions, ['heavy', 'low', 'slide', 'super', 'burst'], T) * 118
      + (p.whiffs / Math.max(6, p.hits + p.whiffs)) * 62
      + lowAtk * 44,
    ),
    grab: clamp((grabs / attackTotal) * 285),
    aerial: clamp(((p.actions.jump ?? 0) / T) * 500 + panicJump * 45),
    pressure: clamp(nearRatio * 78 + apf * 480 + fwd * 55),
    counter: clamp((p.counterActs / Math.max(1, attackTotal)) * 190),
    zoning: clamp(farRatio * 96 + ((p.actions.wave ?? 0) / attackTotal) * 190),
    clutch: clamp(lowAtk * 132),
    okizemeLow: clamp(okiLow * 132),
    cornerEscape: clamp(escape * 168),
    superTiming: clamp(100 - superOppAvg * 0.72 + (superHpAvg > 55 ? 12 : 0)),
    panic: clamp(panicEsc * 118 + panicJump * 52),
    frameTrap: clamp(cancelDensity * 92 + reAttack * 62),
  };
}

export interface ArchResult {
  type: Archetype;
  score: number;
  runnerUp: Archetype;
  runnerScore: number;
  scores: Record<Archetype, number>;
}

export function archetypeScores(d: DNA): Record<Archetype, number> {
  const p = d.panic ?? 0;
  const ft = d.frameTrap ?? 0;
  return {
    // 압박받으면 위로 — 가장 강한 신호이므로 우선 가중
    PANIC_JUMPER: p * 1.25 + d.aerial * 0.85 - d.defense * 0.3 - d.counter * 0.2,
    RUSHER: d.aggression * 1.05 + d.pressure * 0.9 - d.defense * 0.55 - d.zoning * 0.45 - p * 0.35,
    COUNTER_HUNTER: d.counter * 1.35 + d.defense * 0.4 - d.aggression * 0.3 - p * 0.2,
    THROW_ADDICT: d.grab * 1.5 + d.pressure * 0.28 - d.zoning * 0.35,
    TURTLE_GUARD: d.defense * 1.3 - d.aggression * 0.7 + (100 - d.risk) * 0.42 - d.aerial * 0.25,
    COMBO_REPEATER: d.repetition * 1.3 + d.aggression * 0.25 - (100 - d.repetition) * 0.3,
    FRAME_TRAP_LOVER: ft * 1.25 + d.pressure * 0.4 + d.counter * 0.25 - d.aerial * 0.2,
    RANDOM_TRICKSTER: (100 - d.repetition) * 1.05 + d.risk * 0.4 - d.pressure * 0.25 - ft * 0.2,
  };
}

export function archetypeOf(d: DNA): ArchResult {
  const s = archetypeScores(d);
  const list = (Object.keys(s) as Archetype[])
    .map((k) => ({ k, v: Math.max(0, s[k]) }))
    .sort((a, b) => b.v - a.v);
  const sum = list.reduce((acc, x) => acc + x.v, 0) || 1;
  const score = Math.round((list[0].v / sum) * 100);
  const rScore = Math.round((list[1].v / sum) * 100);
  return {
    type: list[0].k,
    score: Math.max(32, Math.min(96, score + 22)),
    runnerUp: list[1].k,
    runnerScore: Math.max(10, Math.min(60, rScore + 12)),
    scores: s,
  };
}

export const DNA_LABELS: { key: keyof DNA; kr: string; hint: string }[] = [
  { key: 'aggression', kr: '공격성', hint: '전진·타격 비중' },
  { key: 'defense', kr: '방어성', hint: '가드·후퇴 비중' },
  { key: 'repetition', kr: '반복성', hint: '같은 연결을 되풀이하는 정도' },
  { key: 'risk', kr: '위험 감수', hint: '불리한 기술·헛치기 감수' },
  { key: 'grab', kr: '잡기 의존도', hint: '전체 공격 중 잡기 비율' },
  { key: 'aerial', kr: '점프 의존도', hint: '공중 이동 선호' },
  { key: 'pressure', kr: '압박 지속력', hint: '근거리 체류 + 입력 밀도' },
  { key: 'counter', kr: '카운터 성향', hint: '상대 발생에 맞춰 되받음' },
  { key: 'zoning', kr: '거리 유지', hint: '원거리 체류 + 장풍' },
  { key: 'panic', kr: '패닉 지수', hint: '압박 시 도피 선택률' },
  { key: 'frameTrap', kr: '프레임 트랩', hint: '캔슬·딜레이 유도 성향' },
  { key: 'clutch', kr: '역전 본능', hint: '체력이 적을 때 공격성' },
  { key: 'okizemeLow', kr: '다운 후 하단', hint: '기상 공방에서 하단 선택률' },
  { key: 'cornerEscape', kr: '코너 탈출', hint: '몰렸을 때 빠져나가려는 성향' },
  { key: 'superTiming', kr: '궁극기 마무리', hint: '낮은 체력의 상대에게 사용' },
];

// ── 타입 특징: 실제 기록에서 증거를 뽑아 문장으로 ──────
const ACT_KR: Record<string, string> = {
  light: '약 타격', heavy: '강 상단', low: '하단 쓸기', grab: '잡기',
  wave: '미러파', upper: '어퍼', slide: '슬라이드', super: '초필살기', burst: '버스트',
  block: '상단 가드', blockLow: '하단 가드', jump: '점프',
  dashF: '전진 대시', dashB: '후진 대시', walkF: '전진', walkB: '후퇴',
};

function topKey(pool: Record<string, number> | undefined, min = 2): { k: string; p: number } | null {
  if (!pool) return null;
  let tot = 0, bk = '', bv = 0;
  for (const k in pool) { tot += pool[k]; if (pool[k] > bv) { bv = pool[k]; bk = k; } }
  if (tot < min || !bk) return null;
  return { k: bk, p: bv / tot };
}

function topBigram(raw: RawProfile): { a: string; b: string; p: number } | null {
  const bg = raw.bigrams ?? {};
  const groups = new Map<string, { tot: number; best: string; bv: number }>();
  for (const key in bg) {
    const [a, b] = key.split('>');
    if (!a || a === 'none' || !b) continue;
    const g = groups.get(a) ?? { tot: 0, best: '', bv: 0 };
    g.tot += bg[key];
    if (bg[key] > g.bv) { g.bv = bg[key]; g.best = b; }
    groups.set(a, g);
  }
  let bestA = '', bestB = '', bestP = 0, bestScore = 0;
  groups.forEach((g, a) => {
    if (g.tot < 3) return;
    const p = g.bv / g.tot;
    const sc = p * Math.log(1 + g.tot);
    if (sc > bestScore) { bestScore = sc; bestA = a; bestB = g.best; bestP = p; }
  });
  return bestA ? { a: bestA, b: bestB, p: bestP } : null;
}

/** 타입 특징 문장 (실제 데이터 근거 기반) */
export function archetypeTraits(type: Archetype, d: DNA, raw: RawProfile): string[] {
  const out: string[] = [];
  const pr = topKey(raw.pressureActs, 3);
  const oki = topKey(raw.okizeme, 2);
  const wake = topKey(raw.wakeupActs, 2);
  const bg = topBigram(raw);
  const P = (v: number) => Math.round(v * 100);

  switch (type) {
    case 'PANIC_JUMPER':
      if (pr) out.push(`압박받으면 ${ACT_KR[pr.k] ?? pr.k} 선택률이 ${P(pr.p)}%입니다.`);
      else out.push('압박받으면 점프 선택률이 높습니다.');
      if (bg && (bg.a === 'jump')) out.push(`공중 공격 후 ${ACT_KR[bg.b] ?? bg.b}(으)로 이어가는 습관이 있습니다.`);
      else out.push('공중 공격 후 하단으로 이어가는 습관이 있습니다.');
      out.push(`점프 의존도 ${d.aerial} · 패닉 지수 ${d.panic}`);
      break;
    case 'RUSHER':
      out.push(`근거리 체류와 전진 입력이 전체의 큰 비중을 차지합니다. (압박 지속력 ${d.pressure})`);
      if (bg) out.push(`${ACT_KR[bg.a] ?? bg.a} 다음에 ${P(bg.p)}% 확률로 ${ACT_KR[bg.b] ?? bg.b}이(가) 이어집니다.`);
      out.push(`방어성 ${d.defense} — 가드보다 먼저 손이 나갑니다.`);
      break;
    case 'COUNTER_HUNTER':
      out.push(`상대 기술 발생 중 반격 시도 비율이 높습니다. (카운터 성향 ${d.counter})`);
      out.push(`먼저 들어가기보다 상대 입력을 기다립니다. (공격성 ${d.aggression})`);
      if (pr) out.push(`압박 시 ${ACT_KR[pr.k] ?? pr.k}로 맞받습니다. (${P(pr.p)}%)`);
      break;
    case 'THROW_ADDICT':
      out.push(`전체 공격 중 잡기 비중이 ${d.grab}입니다.`);
      if (oki) out.push(`상대를 다운시킨 뒤 ${P(oki.p)}% 확률로 ${ACT_KR[oki.k] ?? oki.k}을(를) 선택합니다.`);
      if (bg && bg.b === 'grab') out.push(`${ACT_KR[bg.a] ?? bg.a} → 잡기 연계가 ${P(bg.p)}%로 고정되어 있습니다.`);
      break;
    case 'TURTLE_GUARD':
      out.push(`가드 유지 프레임이 길고 후퇴 빈도가 높습니다. (방어성 ${d.defense})`);
      out.push(`위험 감수 ${d.risk} — 불리한 기술을 거의 쓰지 않습니다.`);
      if (wake) out.push(`기상 직후 ${P(wake.p)}% 확률로 ${ACT_KR[wake.k] ?? wake.k}입니다.`);
      break;
    case 'COMBO_REPEATER':
      out.push(`반복성 ${d.repetition} — 같은 연결을 되풀이합니다.`);
      if (bg) out.push(`${ACT_KR[bg.a] ?? bg.a} 다음은 거의 항상 ${ACT_KR[bg.b] ?? bg.b}입니다. (${P(bg.p)}%)`);
      out.push('두 번째 타격부터 상대가 다음 수를 알고 있습니다.');
      break;
    case 'FRAME_TRAP_LOVER':
      out.push(`캔슬 밀도가 높고 가드 후 재공격을 즐깁니다. (프레임 트랩 ${d.frameTrap})`);
      out.push(`상대의 반격 버튼을 유도해 카운터로 처형합니다. (카운터 ${d.counter})`);
      if (bg) out.push(`주력 연계: ${ACT_KR[bg.a] ?? bg.a} → ${ACT_KR[bg.b] ?? bg.b} (${P(bg.p)}%)`);
      break;
    case 'RANDOM_TRICKSTER':
      out.push(`반복성 ${d.repetition} — 입력 분포가 고르게 흩어져 있습니다.`);
      out.push(`위험 감수 ${d.risk} · 예측 모델이 학습할 고정점이 적습니다.`);
      out.push('다만 확정 상황에서 데미지를 놓치는 경우가 있습니다.');
      break;
  }
  return out.filter(Boolean).slice(0, 3);
}

// ── 약점 진단: 재훈련 피드백 ───────────────────────
export interface Insight { level: 'warn' | 'info' | 'good'; text: string; fix: string }

export function diagnose(d: DNA, p: RawProfile): Insight[] {
  const out: Insight[] = [];
  if ((d.panic ?? 0) > 58) out.push({ level: 'warn', text: `패닉 지수 ${d.panic} — 몰리면 반사적으로 도망칩니다.`, fix: '압박 상황에서 가드 후 반격을 반복해 보여주세요.' });
  if (d.aerial > 62) out.push({ level: 'warn', text: `점프 의존도 ${d.aerial} — 공중 선택이 과도합니다.`, fix: '지상 옵션으로 상황을 정리하는 장면을 늘리세요.' });
  if ((d.frameTrap ?? 0) > 70) out.push({ level: 'good', text: `프레임 트랩 ${d.frameTrap} — 틈을 만들어 낚는 데 능숙합니다.`, fix: '무적기를 가진 상대에게는 캔슬 타이밍을 흔드세요.' });
  if (d.grab > 58) out.push({ level: 'warn', text: `잡기 의존도 ${d.grab} — AI가 잡기를 남발합니다.`, fix: '타격 시동으로 콤보를 여는 플레이를 반복해 보여주세요.' });
  if (d.repetition > 62) out.push({ level: 'warn', text: `반복 패턴 ${d.repetition} — 연결 루트가 고정되어 읽힙니다.`, fix: '같은 시동에서 다른 마무리를 섞어 학습시키세요.' });
  if (d.defense < 24) out.push({ level: 'warn', text: `방어성 ${d.defense} — 가드 없이 계속 눌러댑니다.`, fix: '상대 공격을 가드 후 반격하는 장면을 늘려주세요.' });
  if (d.aggression > 78) out.push({ level: 'info', text: `공격성 ${d.aggression} — 전형적인 돌진형입니다.`, fix: '조너형 AI에게 장풍으로 견제당하기 쉽습니다.' });
  if (d.zoning < 18) out.push({ level: 'info', text: `거리 견제 ${d.zoning} — 원거리 옵션이 거의 없습니다.`, fix: '미러파(↓↘→)로 견제하는 패턴을 보여주세요.' });
  if (d.counter > 60) out.push({ level: 'good', text: `카운터 성향 ${d.counter} — 상대 발생을 잘 읽습니다.`, fix: '러셔형 AI 상대로 강한 강점입니다.' });
  if (d.okizemeLow > 62) out.push({ level: 'warn', text: `다운 후 하단 ${d.okizemeLow}% — 기상 공방이 완전히 예측됩니다.`, fix: '다운 후 상단/잡기를 섞어 학습시키세요.' });
  if (p.cancels < 4 && p.totalActs > 120) out.push({ level: 'info', text: '캔슬 콤보 학습량이 부족합니다.', fix: '히트 후 필살기 캔슬을 반복하면 AI가 콤보를 잇습니다.' });
  if (d.superTiming < 34 && p.superCount > 0) out.push({ level: 'warn', text: '궁극기를 너무 이르게 씁니다.', fix: '상대 체력이 낮을 때 마무리로 사용하세요.' });
  if (out.length === 0) out.push({ level: 'good', text: '균형 잡힌 전투 DNA입니다.', fix: '특화 방향을 하나 골라 집중 훈련해 보세요.' });
  return out.slice(0, 5);
}

/** AI 성능 지표 (랭킹 매치메이킹용) */
export function powerOf(d: DNA): number {
  return Math.round(
    d.aggression * 0.2 + d.counter * 0.18 + d.pressure * 0.16 +
    (100 - d.repetition) * 0.15 + d.defense * 0.11 +
    (d.frameTrap ?? 0) * 0.08 + (100 - (d.panic ?? 0)) * 0.06 +
    d.risk * 0.03 + d.zoning * 0.03,
  );
}

export function dnaDistance(a: DNA, b: DNA): number {
  const keys = Object.keys(a) as (keyof DNA)[];
  let s = 0;
  for (const k of keys) s += (a[k] - b[k]) ** 2;
  return Math.sqrt(s / keys.length);
}

export const MOVE_OF_KIND: Partial<Record<ActKind, AttackId>> = {
  light: 'light', heavy: 'heavy', low: 'low', grab: 'grab',
  wave: 'wave', upper: 'upper', slide: 'slide', super: 'super', burst: 'burst',
};
