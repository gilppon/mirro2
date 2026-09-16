// ─────────────────────────────────────────────────────────────
//  HABIT BREAK MISSION — 손버릇을 강제로 끊는 제약 규칙 엔진
//  "이기는 것"이 아니라 "습관을 쓰지 않고 이기는 것"이 목표
// ─────────────────────────────────────────────────────────────
import { ACTION_KR } from './brain';
import type { LAction } from './brain';

export const KRA = (k: string): string => ACTION_KR[k as LAction] ?? k;

export type RuleKind =
  | 'countLimit'      // 특정 행동 N회 이하
  | 'noRepeatCombo'   // 같은 콤보 루트 N회 이상 반복 금지
  | 'noSequence'      // 특정 연계(A→B) 금지
  | 'contextForce'    // 특정 상황에서 반드시 지정 행동
  | 'noRepeatOki'     // 다운 후 같은 선택 연속 금지
  | 'requireWin';     // 승리 필수

export interface Rule {
  kind: RuleKind;
  acts?: string[];       // 대상 행동
  limit?: number;        // 허용 횟수 / 반복 허용치
  seq?: [string, string];// 금지 연계
  context?: 'pressure' | 'okizeme' | 'cornered' | 'lowHp';
  forced?: string[];     // 강제 행동
  banned?: string[];     // 해당 상황 금지 행동
  label: string;         // UI 표시 문구
}

export interface Mission {
  id: string;
  title: string;
  sub: string;
  desc: string;
  rules: Rule[];
  reward: string;
  tier: 1 | 2 | 3;
  color: string;
  targetHabit: string;   // 어떤 손버릇을 겨냥하는가
}

export const MISSIONS: Mission[] = [
  {
    id: 'lowJump',
    title: '점프 5회 이하로 승리',
    sub: 'GROUNDED',
    desc: '위로 도망치는 습관을 끊습니다. 공중은 가장 읽히기 쉬운 공간입니다.',
    rules: [
      { kind: 'countLimit', acts: ['jump'], limit: 5, label: '점프 5회 이하' },
      { kind: 'requireWin', label: '매치 승리' },
    ],
    reward: '압박 반응 편중 −20 · 점프 빈도 −25',
    tier: 1, color: '#8fb4ff', targetHabit: 'jump',
  },
  {
    id: 'noRepeatCombo',
    title: '같은 콤보 3회 이상 반복 금지',
    sub: 'NO LOOP',
    desc: '손이 기억한 루트를 강제로 갈아엎습니다. 같은 연결을 3번째 쓰는 순간 실패합니다.',
    rules: [
      { kind: 'noRepeatCombo', limit: 2, label: '동일 콤보 루트 2회까지' },
      { kind: 'requireWin', label: '매치 승리' },
    ],
    reward: '반복 패턴 −30 · 연쇄 고정도 −35',
    tier: 2, color: '#ffd447', targetHabit: 'chain',
  },
  {
    id: 'noLowGrab',
    title: '하단 공격 후 잡기 연계 금지',
    sub: 'BREAK THE LINK',
    desc: '하단 → 잡기는 가장 흔한 무의식 연계입니다. 이 고리를 끊으면 상대는 당신을 읽지 못합니다.',
    rules: [
      { kind: 'noSequence', seq: ['low', 'grab'], label: '하단 → 잡기 금지' },
      { kind: 'noSequence', seq: ['slide', 'grab'], label: '슬라이드 → 잡기 금지' },
      { kind: 'requireWin', label: '매치 승리' },
    ],
    reward: '잡기 의존도 −25 · 연쇄 고정도 −20',
    tier: 2, color: '#b478ff', targetHabit: 'grab',
  },
  {
    id: 'holdGuard',
    title: '압박 상황에서 회피 대신 가드 유지',
    sub: 'STAND YOUR GROUND',
    desc: '몰렸을 때 도망치지 않습니다. 점프·후진 대시를 봉인하고 가드로 버틴 뒤 반격합니다.',
    rules: [
      {
        kind: 'contextForce', context: 'pressure',
        banned: ['jump', 'dashB', 'walkB'],
        forced: ['block', 'blockLow'],
        label: '압박 시 회피 금지 · 가드 유지',
      },
      { kind: 'requireWin', label: '매치 승리' },
    ],
    reward: '압박 지속력 +22 · 코너 탈출 의존 −20',
    tier: 3, color: '#7dffc2', targetHabit: 'jump',
  },
  {
    id: 'okiVariety',
    title: '상대 다운 후 같은 선택지 반복 금지',
    sub: 'MIX THE WAKEUP',
    desc: '기상 공방은 가장 예측당하는 구간입니다. 다운시킬 때마다 다른 선택지를 강제합니다.',
    rules: [
      { kind: 'noRepeatOki', limit: 1, label: '기상 공방 연속 중복 금지' },
      { kind: 'requireWin', label: '매치 승리' },
    ],
    reward: '다운 후 하단 편중 −28 · 반복 패턴 −18',
    tier: 3, color: '#ff9a3c', targetHabit: 'okizemeLow',
  },
];

export function missionById(id: string): Mission | null {
  return MISSIONS.find((m) => m.id === id) ?? null;
}

/** 손버릇 진단 결과 → 추천 미션 */
export function recommendMission(target: string): Mission {
  const map: Record<string, string> = {
    jump: 'lowJump',
    dashB: 'holdGuard',
    walkB: 'holdGuard',
    block: 'noRepeatCombo',
    blockLow: 'okiVariety',
    grab: 'noLowGrab',
    low: 'noLowGrab',
    slide: 'noLowGrab',
    light: 'noRepeatCombo',
    heavy: 'noRepeatCombo',
    upper: 'holdGuard',
    chain: 'noRepeatCombo',
    okizemeLow: 'okiVariety',
  };
  return missionById(map[target] ?? 'noRepeatCombo') ?? MISSIONS[0];
}

// ── 실행 중 상태 ─────────────────────────────────
export interface RuleState {
  rule: Rule;
  count: number;     // 현재 카운트 (countLimit / 위반 횟수)
  ok: boolean;       // 아직 유효한가
  detail: string;    // 실시간 표시 문구
}

export interface MissionRun {
  mission: Mission;
  states: RuleState[];
  failed: boolean;
  failReason: string;
  cleared: boolean;
  violations: { at: number; text: string }[];
}

export function initRun(m: Mission): MissionRun {
  return {
    mission: m,
    states: m.rules.map((rule) => ({
      rule, count: 0, ok: true,
      detail: rule.kind === 'countLimit' ? `0 / ${rule.limit}` : '대기',
    })),
    failed: false, failReason: '', cleared: false, violations: [],
  };
}

export function activeRuleLabels(run: MissionRun): string[] {
  return run.states
    .filter((s) => s.rule.kind !== 'requireWin')
    .map((s) => s.rule.label);
}
