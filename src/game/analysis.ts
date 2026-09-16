// ─────────────────────────────────────────────────────────────
//  SIMULA ANALYSIS — 손버릇을 자연어로 진단한다
//  "당신은 위기로 몰리면 위로 도망갑니다."
// ─────────────────────────────────────────────────────────────
import type { RawProfile } from './dna';
import { ACTION_KR } from './brain';
import type { LAction } from './brain';

export const KR = (k: string): string => ACTION_KR[k as LAction] ?? k;

/** 상황별 최빈 행동 + 확률 */
export interface Tendency {
  act: string;
  kr: string;
  p: number;
  n: number;
}

export function topOf(pool: Record<string, number> | undefined, min = 3): Tendency | null {
  if (!pool) return null;
  let tot = 0, best = '', bv = 0;
  for (const k in pool) { tot += pool[k]; if (pool[k] > bv) { bv = pool[k]; best = k; } }
  if (tot < min || !best) return null;
  return { act: best, kr: KR(best), p: bv / tot, n: Math.round(tot) };
}

/** 가장 강한 3연쇄 패턴 */
export function topChain(raw: RawProfile): { seq: string[]; p: number; n: number } | null {
  const tri = raw.trigrams;
  if (!tri) return null;
  const groups = new Map<string, { tot: number; best: string; bv: number }>();
  for (const key in tri) {
    const parts = key.split('>');
    if (parts.length !== 3 || parts[0] === 'none' || parts[1] === 'none') continue;
    const ctx = `${parts[0]}>${parts[1]}`;
    const g = groups.get(ctx) ?? { tot: 0, best: '', bv: 0 };
    g.tot += tri[key];
    if (tri[key] > g.bv) { g.bv = tri[key]; g.best = parts[2]; }
    groups.set(ctx, g);
  }
  let bestCtx = '', bestScore = 0, bestP = 0, bestN = 0, bestNext = '';
  groups.forEach((g, ctx) => {
    if (g.tot < 3) return;
    const p = g.bv / g.tot;
    const score = p * Math.log(1 + g.tot);
    if (score > bestScore) { bestScore = score; bestCtx = ctx; bestP = p; bestN = Math.round(g.tot); bestNext = g.best; }
  });
  if (!bestCtx) return null;
  const [a, b] = bestCtx.split('>');
  return { seq: [KR(a), KR(b), KR(bestNext)], p: bestP, n: bestN };
}

/** 이 행동을 쓸 때마다 얼마나 맞는가 = 처벌률 */
export function punishRate(raw: RawProfile, act: string): number {
  const u = raw.used?.[act] ?? 0;
  const p = raw.punished?.[act] ?? 0;
  return u >= 3 ? p / u : 0;
}

export interface AnalysisBlock {
  id: string;
  headline: string;      // 굵은 진단 문장
  detail: string[];      // 근거 라인
  counter: string;       // SIMULA의 대응
  severity: 'critical' | 'warn' | 'info';
  fixTarget: string;     // 교정 훈련 타깃 키
  stat?: { label: string; value: string };
}

const ESCAPE_LABEL: Record<string, string> = {
  jump: '위로 도망갑니다',
  dashB: '뒤로 물러납니다',
  walkB: '뒤로 물러납니다',
  block: '가드에 웅크립니다',
  blockLow: '하단 가드로 굳습니다',
  upper: '무적기에 의존합니다',
  grab: '잡기로 뚫으려 합니다',
  light: '약 타격으로 비벼댑니다',
  heavy: '큰 기술을 휘두릅니다',
  low: '하단으로 받아칩니다',
  slide: '슬라이드로 파고듭니다',
  wave: '장풍으로 거리를 벌립니다',
  super: '초필살기를 던집니다',
  burst: '버스트로 리셋합니다',
};

const COUNTER_PLAN: Record<string, string> = {
  jump: '대공 공격 → 착지 프레임 punish → 콤보 연결',
  dashB: '전진 대시로 거리 압축 → 잡기 확정',
  walkB: '미러파로 퇴로 차단 → 슬라이드 추격',
  block: '가드 강요 후 잡기 → 다운 → 기상 압박',
  blockLow: '강 상단으로 하단 가드 관통 → 캔슬 콤보',
  upper: '가드 후 최대 리커버리 punish → 초필살기',
  grab: '잡기 발생 전 약 타격으로 끊기 → 카운터 히트',
  light: '무적 어퍼로 발생 우위 → 띄우기',
  heavy: '발생 12F 확인 후 백대시 → 헛치기 punish',
  low: '점프로 하단 회피 → 공중 공격 → 착지 콤보',
  slide: '하단 가드 고정 → 가드 후 확정 반격',
  wave: '점프 관통 → 착지 압박',
  super: '무적 구간 종료 대기 → 리커버리 처형',
  burst: '거리 유지 후 발생 회피 → 게이지 소진 확인',
};

const FIX_HINT: Record<string, string> = {
  jump: '압박당할 때 지상 가드 → 반격으로 전환하세요.',
  dashB: '후퇴 대신 가드 후 확정 반격을 연습하세요.',
  walkB: '거리를 유지하려 하지 말고 발생 빠른 기술로 끊으세요.',
  block: '가드만 하지 말고 가드 후 잡기 대응을 섞으세요.',
  blockLow: '상단 가드를 섞어 상하단 읽기를 흩뜨리세요.',
  upper: '무적기 남발 대신 가드를 먼저 선택하세요.',
  grab: '타격 시동으로 콤보를 여는 선택지를 늘리세요.',
  light: '약 타격 연타 대신 거리를 조절하세요.',
  heavy: '느린 기술은 확정 상황에서만 쓰세요.',
  low: '하단 일변도를 깨고 상단·잡기를 섞으세요.',
  slide: '슬라이드는 가드당하면 불리합니다. 빈도를 줄이세요.',
  wave: '근거리 옵션을 함께 보여주세요.',
  super: '초필살기는 상대 체력이 낮을 때 마무리로 쓰세요.',
  burst: '버스트는 학습 리셋 타이밍에 맞춰 쓰세요.',
};

function pct(v: number) { return Math.round(v * 100); }

export function fixHintFor(act: string): string {
  return FIX_HINT[act] ?? '같은 상황에서 다른 선택지를 의도적으로 섞으세요.';
}

export function analyze(raw: RawProfile): AnalysisBlock[] {
  const out: AnalysisBlock[] = [];

  // ── 1. 압박받을 때의 도피 습관 (가장 핵심)
  const pressure = topOf(raw.pressureActs, 4);
  if (pressure && pressure.p >= 0.34) {
    out.push({
      id: 'pressure',
      headline: `당신은 압박받을 때 ${pressure.kr}을(를) 선택할 확률이 ${pct(pressure.p)}%입니다.`,
      detail: [
        `SIMULA는 2라운드부터 이 습관을 예측했습니다.`,
        `표본 ${pressure.n}회 · 압박 상황에서만 집계`,
      ],
      counter: COUNTER_PLAN[pressure.act] ?? '해당 행동 발생 직후 확정 반격',
      severity: pressure.p >= 0.55 ? 'critical' : 'warn',
      fixTarget: pressure.act,
      stat: { label: '압박 반응 편중', value: `${pct(pressure.p)}%` },
    });
  }

  // ── 2. 반복 3연쇄
  const chain = topChain(raw);
  if (chain && chain.p >= 0.3) {
    out.push({
      id: 'chain',
      headline: `반복 패턴이 고정되어 있습니다: ${chain.seq.join(' → ')}`,
      detail: [
        `앞 두 행동이 나오면 ${pct(chain.p)}% 확률로 ${chain.seq[2]}이(가) 이어집니다.`,
        `이 연결은 ${chain.n}회 관측되었습니다.`,
      ],
      counter: `${chain.seq[1]} 시점에 선행 입력 → ${chain.seq[2]} 발생 전 카운터`,
      severity: chain.p >= 0.5 ? 'critical' : 'warn',
      fixTarget: 'chain',
      stat: { label: '연쇄 고정도', value: `${pct(chain.p)}%` },
    });
  }

  // ── 3. 기상 습관
  const wake = topOf(raw.wakeupActs, 3);
  if (wake && wake.p >= 0.4) {
    out.push({
      id: 'wakeup',
      headline: `다운에서 일어난 직후 ${pct(wake.p)}% 확률로 ${wake.kr}을(를) 씁니다.`,
      detail: ['기상 프레임은 가장 읽히기 쉬운 구간입니다.', `표본 ${wake.n}회`],
      counter: `기상 타이밍에 맞춰 ${wake.act === 'block' ? '잡기 확정' : '발생 우위 기술 겹치기'}`,
      severity: wake.p >= 0.6 ? 'critical' : 'warn',
      fixTarget: wake.act,
      stat: { label: '기상 편중', value: `${pct(wake.p)}%` },
    });
  }

  // ── 4. 피격 직후 (경직 풀리자마자의 손버릇)
  const post = topOf(raw.postHitActs, 3);
  if (post && post.p >= 0.42) {
    out.push({
      id: 'posthit',
      headline: `맞은 직후 반사적으로 ${wrapVerb(post.act, post.kr)} (${pct(post.p)}%)`,
      detail: ['경직이 풀리는 순간의 반응은 의식이 아니라 근육이 결정합니다.', `표본 ${post.n}회`],
      counter: '경직 종료 프레임에 기술 겹치기 → 카운터 히트 확정',
      severity: 'warn',
      fixTarget: post.act,
      stat: { label: '피격 후 반사', value: `${pct(post.p)}%` },
    });
  }

  // ── 5. 코너
  const corner = topOf(raw.corneredActs, 3);
  if (corner && corner.p >= 0.4) {
    out.push({
      id: 'corner',
      headline: `코너에 몰리면 ${pct(corner.p)}% 확률로 ${corner.kr}입니다.`,
      detail: ['탈출 루트가 하나뿐이면 그것은 탈출이 아닙니다.', `표본 ${corner.n}회`],
      counter: COUNTER_PLAN[corner.act] ?? '탈출 경로 차단 후 압박 지속',
      severity: corner.p >= 0.6 ? 'critical' : 'info',
      fixTarget: corner.act,
      stat: { label: '코너 반응 편중', value: `${pct(corner.p)}%` },
    });
  }

  // ── 6. 체력 위기
  const low = topOf(raw.lowHpActs, 3);
  if (low && low.p >= 0.4) {
    out.push({
      id: 'lowhp',
      headline: `체력이 30% 아래일 때 ${pct(low.p)}% 확률로 ${low.kr}을(를) 씁니다.`,
      detail: ['위기 상황의 선택은 그 사람의 기본값을 드러냅니다.', `표본 ${low.n}회`],
      counter: '체력 임계점 진입 시 해당 행동 대비 포지션 선점',
      severity: 'info',
      fixTarget: low.act,
      stat: { label: '위기 반응 편중', value: `${pct(low.p)}%` },
    });
  }

  // ── 7. 처벌률 높은 기술
  let worst = '', worstRate = 0, worstN = 0;
  for (const k in (raw.used ?? {})) {
    const r = punishRate(raw, k);
    if (r > worstRate && (raw.used[k] ?? 0) >= 5) { worstRate = r; worst = k; worstN = raw.used[k]; }
  }
  if (worst && worstRate >= 0.4) {
    out.push({
      id: 'punish',
      headline: `${KR(worst)}을(를) 쓸 때마다 ${pct(worstRate)}% 확률로 맞고 있습니다.`,
      detail: [`${worstN}회 사용 중 ${Math.round(worstN * worstRate)}회 피격.`, '이 기술은 지금 당신에게 손해입니다.'],
      counter: '해당 기술 발생을 기다렸다가 확정 반격',
      severity: worstRate >= 0.6 ? 'critical' : 'warn',
      fixTarget: worst,
      stat: { label: '처벌률', value: `${pct(worstRate)}%` },
    });
  }

  return out.slice(0, 5);
}

function wrapVerb(act: string, kr: string): string {
  const v = ESCAPE_LABEL[act];
  return v ? v.replace('습니다', '습니다').replace(/^/, '') : `${kr}을(를) 씁니다`;
}

/** 최종 한 줄 결론 */
export function conclude(blocks: AnalysisBlock[], raw: RawProfile): string {
  const p = blocks.find((b) => b.id === 'pressure');
  if (p) {
    const map: Record<string, string> = {
      jump: '당신은 위기로 몰리면 위로 도망갑니다.',
      dashB: '당신은 위기로 몰리면 뒤로 물러섭니다.',
      walkB: '당신은 위기로 몰리면 거리를 벌리려 합니다.',
      block: '당신은 위기로 몰리면 몸을 웅크립니다.',
      blockLow: '당신은 위기로 몰리면 아래로 굳습니다.',
      upper: '당신은 위기로 몰리면 무적기에 기댑니다.',
      grab: '당신은 위기로 몰리면 상대를 붙잡으려 합니다.',
      light: '당신은 위기로 몰리면 버튼을 연타합니다.',
      heavy: '당신은 위기로 몰리면 한 방을 노립니다.',
      low: '당신은 위기로 몰리면 발밑을 노립니다.',
      slide: '당신은 위기로 몰리면 앞으로 뛰어듭니다.',
      wave: '당신은 위기로 몰리면 거리를 두려 합니다.',
      super: '당신은 위기로 몰리면 모든 것을 겁니다.',
    };
    return map[p.fixTarget] ?? '당신은 위기로 몰릴 때 같은 선택을 반복합니다.';
  }
  const c = blocks.find((b) => b.id === 'chain');
  if (c) return '당신의 손은 생각보다 먼저 같은 길을 갑니다.';
  if ((raw.totalActs ?? 0) < 60) return '아직 습관이 드러나기에는 표본이 부족합니다.';
  return '당신의 입력은 아직 예측하기 어렵습니다. 좋은 신호입니다.';
}

// ── 패배 원인 인과 사슬 ────────────────────────────
export interface DefeatCause {
  headline: string;        // 한 문장 원인
  chain: string[];         // 인과 단계
  ratio: number;           // 이 원인이 차지한 피해 비율
  tag: string;
  color: string;
  fixTarget: string;
}

export interface DefeatInput {
  dmgTaken: number;
  dmgAfterRead: number;
  dmgWhileAttacking: number;
  dmgInCorner: number;
  dmgAirborne: number;
  byMove: Record<string, number>;
  reads: number;
  breaks: number;
  worstStreak: number;
  topPressureAct: string | null;
  topPressureP: number;
}

const MOVE_KR: Record<string, string> = {
  light: '약 타격', heavy: '강 상단', low: '하단 쓸기', grab: '잡기',
  wave: '미러파', upper: '리플렉스 어퍼', slide: '글리치 슬라이드',
  super: '역-학습 오버라이드', burst: '노이즈 버스트',
};

/** 가장 큰 패배 원인을 찾아 인과 사슬로 서술 */
export function defeatCause(d: DefeatInput): DefeatCause {
  const T = Math.max(1, d.dmgTaken);
  let topMove = '', topMoveDmg = 0;
  for (const k in d.byMove) if (d.byMove[k] > topMoveDmg) { topMoveDmg = d.byMove[k]; topMove = k; }
  const mv = MOVE_KR[topMove] ?? topMove;

  const cands: DefeatCause[] = [];

  // 1. 읽혀서 맞았다 — 최우선
  if (d.dmgAfterRead / T > 0.28) {
    cands.push({
      headline: '읽힌 직후에 맞았습니다.',
      chain: [
        `SIMULA가 당신의 다음 입력을 예측 (${d.reads}회 적중)`,
        '예측된 행동의 발생 프레임에 맞춰 대응 배치',
        `받은 피해의 ${Math.round((d.dmgAfterRead / T) * 100)}%가 예측 직후 발생`,
      ],
      ratio: d.dmgAfterRead / T, tag: 'PREDICTED', color: '#fb7185',
      fixTarget: d.topPressureAct ?? 'chain',
    });
  }
  // 2. 압박 상황 도피 습관
  if (d.topPressureAct && d.topPressureP > 0.42) {
    cands.push({
      headline: `압박받을 때 ${KR(d.topPressureAct)}을(를) ${Math.round(d.topPressureP * 100)}% 확률로 선택했습니다.`,
      chain: [
        '근거리 압박 상황 진입',
        `당신의 선택이 ${KR(d.topPressureAct)}으로 고정됨`,
        'SIMULA가 해당 행동 전용 대응을 선점',
      ],
      ratio: d.topPressureP * 0.8, tag: 'PANIC', color: '#8fb4ff',
      fixTarget: d.topPressureAct,
    });
  }
  // 3. 기술 내밀다가 맞았다
  if (d.dmgWhileAttacking / T > 0.3) {
    cands.push({
      headline: '기술을 내미는 순간을 계속 카운터당했습니다.',
      chain: [
        '공격 발생 프레임이 일정한 리듬으로 반복',
        'SIMULA가 발생 타이밍을 학습',
        `받은 피해의 ${Math.round((d.dmgWhileAttacking / T) * 100)}%가 공격 중 발생`,
      ],
      ratio: d.dmgWhileAttacking / T, tag: 'COUNTERED', color: '#ff9a3c',
      fixTarget: 'chain',
    });
  }
  // 4. 코너
  if (d.dmgInCorner / T > 0.42) {
    cands.push({
      headline: '코너에서 빠져나오지 못했습니다.',
      chain: [
        '코너 진입 후 탈출 루트가 한 가지로 고정',
        'SIMULA가 탈출 경로를 차단',
        `받은 피해의 ${Math.round((d.dmgInCorner / T) * 100)}%가 코너에서 발생`,
      ],
      ratio: d.dmgInCorner / T, tag: 'CORNERED', color: '#ffd447',
      fixTarget: 'dashB',
    });
  }
  // 5. 공중에서 맞았다
  if (d.dmgAirborne / T > 0.22) {
    cands.push({
      headline: '공중에 뜬 순간을 반복해서 처벌당했습니다.',
      chain: [
        '압박 상황에서 점프를 선택',
        'SIMULA가 대공으로 요격 후 착지 프레임 punish',
        `받은 피해의 ${Math.round((d.dmgAirborne / T) * 100)}%가 공중·착지에서 발생`,
      ],
      ratio: d.dmgAirborne / T, tag: 'ANTI-AIR', color: '#67e8f9',
      fixTarget: 'jump',
    });
  }
  // 6. 특정 기술에 일방적으로 당함
  if (topMove && topMoveDmg / T > 0.38) {
    cands.push({
      headline: `${mv} 하나에 전체 피해의 ${Math.round((topMoveDmg / T) * 100)}%를 내줬습니다.`,
      chain: [
        `SIMULA가 ${mv}를 반복 사용`,
        '당신의 대응 선택이 매번 동일',
        '같은 기술에 같은 방식으로 계속 피격',
      ],
      ratio: topMoveDmg / T, tag: 'ONE MOVE', color: '#b478ff',
      fixTarget: 'block',
    });
  }

  if (!cands.length) {
    return {
      headline: '결정적인 습관은 드러나지 않았습니다.',
      chain: ['피해가 여러 상황에 고르게 분산됨', '예측 모델이 고정점을 찾지 못함'],
      ratio: 0, tag: 'CLEAN', color: '#7dffc2', fixTarget: 'chain',
    };
  }
  cands.sort((a, b) => b.ratio - a.ratio);
  return cands[0];
}

/** 패배 원인 전체 목록 (리포트용) */
export function defeatBreakdown(d: DefeatInput): { label: string; v: number; color: string }[] {
  const T = Math.max(1, d.dmgTaken);
  return [
    { label: '읽힌 직후 피격', v: d.dmgAfterRead / T, color: '#fb7185' },
    { label: '공격 중 카운터', v: d.dmgWhileAttacking / T, color: '#ff9a3c' },
    { label: '코너 피격', v: d.dmgInCorner / T, color: '#ffd447' },
    { label: '공중 피격', v: d.dmgAirborne / T, color: '#67e8f9' },
  ].filter((x) => x.v > 0.02).sort((a, b) => b.v - a.v);
}

/** 습관 지수 0~100 (높을수록 읽히기 쉬움) */
export function habitIndex(blocks: AnalysisBlock[], accuracy: number): number {
  let s = accuracy * 52;
  for (const b of blocks) {
    s += b.severity === 'critical' ? 15 : b.severity === 'warn' ? 9 : 4;
  }
  return Math.max(0, Math.min(100, Math.round(s)));
}

// ── 습관 교정 훈련 드릴 ───────────────────────────
export interface Drill {
  id: string;
  title: string;
  desc: string;
  goal: string;
  banned: string[];      // 금지 행동 (사용 시 실패)
  required?: string[];   // 요구 행동
  target: number;        // 목표 횟수
  reward: string;
}

export const DRILLS: Record<string, Drill> = {
  jump: {
    id: 'jump', title: '지상 봉인 드릴',
    desc: '압박받는 상황에서 점프를 완전히 봉인합니다. 도망칠 곳이 없을 때 무엇을 할 수 있는지 몸에 새깁니다.',
    goal: '점프 없이 가드 후 반격 성공',
    banned: ['jump'], required: ['block'], target: 6,
    reward: '압박 반응 편중 −20',
  },
  grab: {
    id: 'grab', title: '잡기 금지 드릴',
    desc: '잡기를 봉인하고 타격 시동으로만 상대를 무너뜨립니다.',
    goal: '타격 시동 콤보 성공',
    banned: ['grab'], required: ['light', 'low'], target: 8,
    reward: '잡기 의존도 −25',
  },
  block: {
    id: 'block', title: '가드 해제 드릴',
    desc: '가드 대신 회피와 발생 우위로 상황을 정리합니다.',
    goal: '가드 없이 카운터 히트 달성',
    banned: ['block', 'blockLow'], target: 5,
    reward: '방어 편중 −18',
  },
  low: {
    id: 'low', title: '상하단 교란 드릴',
    desc: '하단 일변도를 깨고 상단·잡기를 의도적으로 섞습니다.',
    goal: '상단 → 하단 → 잡기 순환 달성',
    banned: [], required: ['heavy', 'low', 'grab'], target: 9,
    reward: '반복 패턴 −22',
  },
  chain: {
    id: 'chain', title: '패턴 파괴 드릴',
    desc: '같은 3연쇄를 두 번 연속 사용하지 않습니다. 손이 가는 길을 의식적으로 끊습니다.',
    goal: '연속 중복 없이 콤보 성공',
    banned: [], target: 10,
    reward: '연쇄 고정도 −30',
  },
  upper: {
    id: 'upper', title: '무적기 절제 드릴',
    desc: '리플렉스 어퍼를 봉인하고 가드 후 확정 반격으로 대응합니다.',
    goal: '어퍼 없이 라운드 승리',
    banned: ['upper'], target: 5,
    reward: '위험 감수 −15',
  },
  light: {
    id: 'light', title: '연타 절제 드릴',
    desc: '약 타격 연타를 봉인하고 거리 조절로 상황을 만듭니다.',
    goal: '중거리 유지하며 승리',
    banned: ['light'], target: 6,
    reward: '반복 패턴 −16',
  },
  dashB: {
    id: 'dashB', title: '전진 강제 드릴',
    desc: '후진 대시를 봉인합니다. 물러설 수 없을 때의 선택지를 늘립니다.',
    goal: '후퇴 없이 압박 유지',
    banned: ['dashB', 'walkB'], target: 6,
    reward: '압박 지속력 +20',
  },
};

export function drillFor(target: string): Drill {
  return DRILLS[target] ?? DRILLS.chain;
}
