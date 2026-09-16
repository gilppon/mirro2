// ─────────────────────────────────────────────────────────────
//  HABIT DUNGEON — 층마다 하나의 습관을 봉인한다
// ─────────────────────────────────────────────────────────────
import type { Mission, Rule } from './missions';

export interface Floor {
  n: number;
  name: string;
  sub: string;
  desc: string;
  color: string;
  icon: string;
  rules: Rule[];
  /** SIMULA 진화 단계 강제 */
  stageLv: number;
  /** 5층 전용: 플레이어 최악의 습관만 사용 */
  worstHabitOnly?: boolean;
  reward: string;
}

export const FLOORS: Floor[] = [
  {
    n: 1, name: '점프 금지', sub: 'GROUNDED', icon: '↑', color: '#8fb4ff',
    desc: '공중으로 도망칠 수 없습니다. 지상에서 해결하는 법을 배웁니다.',
    rules: [
      { kind: 'countLimit', acts: ['jump'], limit: 0, label: '점프 완전 금지' },
      { kind: 'requireWin', label: '매치 승리' },
    ],
    stageLv: 2, reward: '점프 의존도 −30 · 패닉 지수 −20',
  },
  {
    n: 2, name: '하단 공격 제한', sub: 'NO SWEEP', icon: '⌄', color: '#ffd447',
    desc: '하단 쓸기와 슬라이드를 3회까지만 쓸 수 있습니다. 상단과 잡기로 길을 찾으세요.',
    rules: [
      { kind: 'countLimit', acts: ['low', 'slide'], limit: 3, label: '하단 계열 3회 이하' },
      { kind: 'requireWin', label: '매치 승리' },
    ],
    stageLv: 3, reward: '다운 후 하단 편중 −28',
  },
  {
    n: 3, name: '같은 콤보 반복 금지', sub: 'NO LOOP', icon: '↻', color: '#ff9a3c',
    desc: '동일한 콤보 루트를 두 번째로 쓰는 순간 실패합니다. 매번 다른 길을 찾아야 합니다.',
    rules: [
      { kind: 'noRepeatCombo', limit: 1, label: '동일 콤보 루트 1회만' },
      { kind: 'requireWin', label: '매치 승리' },
    ],
    stageLv: 4, reward: '반복성 −35 · 연쇄 고정도 −40',
  },
  {
    n: 4, name: '잡기 대응 필수', sub: 'ANSWER THE THROW', icon: '✥', color: '#b478ff',
    desc: '압박당할 때 회피는 금지. 가드로 버티고 잡기를 타격으로 끊어내야 합니다.',
    rules: [
      {
        kind: 'contextForce', context: 'pressure',
        banned: ['jump', 'dashB', 'walkB', 'grab'],
        forced: ['block', 'blockLow', 'light'],
        label: '압박 시 회피·잡기 금지 · 가드/약 타격 대응',
      },
      { kind: 'requireWin', label: '매치 승리' },
    ],
    stageLv: 5, reward: '잡기 의존도 −25 · 압박 지속력 +22',
  },
  {
    n: 5, name: 'AI가 내 최악의 습관만 사용', sub: 'YOUR WORST SELF', icon: '✖', color: '#ff2e5e',
    desc: 'SIMULA가 배신자 단계로 각성해, 당신의 가장 고질적인 습관만을 무기로 사용합니다. 당신이 스스로에게 했던 짓을 그대로 돌려받습니다.',
    rules: [
      { kind: 'noRepeatOki', limit: 1, label: '기상 공방 중복 금지' },
      { kind: 'requireWin', label: '매치 승리' },
    ],
    stageLv: 6, worstHabitOnly: true,
    reward: '전 습관 가중치 −40 · 배신자 격파 칭호',
  },
];

export function floorToMission(f: Floor): Mission {
  return {
    id: `dungeon-${f.n}`,
    title: `${f.n}층 · ${f.name}`,
    sub: f.sub,
    desc: f.desc,
    rules: f.rules,
    reward: f.reward,
    tier: f.n <= 2 ? 1 : f.n <= 4 ? 2 : 3,
    color: f.color,
    targetHabit: f.n === 1 ? 'jump' : f.n === 2 ? 'low' : f.n === 3 ? 'chain' : f.n === 4 ? 'grab' : 'okizemeLow',
  };
}

export function loadDungeon(): number[] {
  try { return JSON.parse(localStorage.getItem('mnb.dungeon') ?? '[]'); } catch { return []; }
}
export function saveDungeon(cleared: number[]) {
  try { localStorage.setItem('mnb.dungeon', JSON.stringify(cleared)); } catch { /* noop */ }
}
