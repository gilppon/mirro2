// ─────────────────────────────────────────────────────────────
//  SIMULA EVOLUTION — AI는 한 번에 완성되지 않는다
//  관찰자 → 모방자 → 예측자 → 처벌자 → 복제자 → 배신자
// ─────────────────────────────────────────────────────────────

export interface StageDef {
  lv: number;
  key: string;
  kr: string;
  en: string;
  color: string;
  icon: string;
  /** 이 단계에 도달하기 위한 누적 학습 샘플 */
  need: number;
  summary: string;
  detail: string;
  /** 단계 진입 시 SIMULA가 하는 말 */
  quote: string;
  abilities: string[];
  /** 행동 파라미터 */
  p: {
    model: number;      // 예측 모델 신뢰 비중
    mimic: number;      // 플레이어 최빈 행동 모방 확률
    react: number;      // 반응 지연 프레임
    aggro: number;      // 공격 성향
    mirror: number;     // 선행 복사 확률
    punish: number;     // 습관 카운터 확률
    noise: number;      // 무작위성
    dmgScale: number;   // 데미지 배율
  };
}

export const STAGES: StageDef[] = [
  {
    lv: 1, key: 'observer', kr: '관찰자', en: 'OBSERVER',
    color: '#6c7794', icon: '◌', need: 0,
    summary: '플레이어 입력을 기록만 함',
    detail: '거의 반격하지 않습니다. 당신의 입력 속도, 간격, 거리 선호를 조용히 적재합니다.',
    quote: '기록을 시작합니다.',
    abilities: ['입력 로깅', '거리 샘플링'],
    p: { model: 0.02, mimic: 0, react: 20, aggro: 0.3, mirror: 0, punish: 0, noise: 0.5, dmgScale: 0.72 },
  },
  {
    lv: 2, key: 'mimic', kr: '모방자', en: 'MIMIC',
    color: '#5ee7ff', icon: '◑', need: 70,
    summary: '자주 쓰는 공격을 따라 함',
    detail: '당신이 자주 쓰는 기술을 그대로 흉내 내기 시작합니다. 아직 타이밍은 어설픕니다.',
    quote: '당신의 손버릇을 따라 해 보겠습니다.',
    abilities: ['최빈 행동 모방', '거리별 선택 복사'],
    p: { model: 0.14, mimic: 0.42, react: 15, aggro: 0.45, mirror: 0, punish: 0.06, noise: 0.34, dmgScale: 0.84 },
  },
  {
    lv: 3, key: 'predictor', kr: '예측자', en: 'PREDICTOR',
    color: '#38f2ff', icon: '◈', need: 170,
    summary: '다음 입력을 예측하기 시작함',
    detail: 'n-gram 습관 모델로 당신의 다음 입력을 확률 예측합니다. 예측 신뢰도가 화면에 표시됩니다.',
    quote: '다음에 무엇을 누를지 보입니다.',
    abilities: ['n-gram 예측', '상황별 대응 선택'],
    p: { model: 0.55, mimic: 0.3, react: 11, aggro: 0.56, mirror: 0.08, punish: 0.22, noise: 0.24, dmgScale: 0.92 },
  },
  {
    lv: 4, key: 'punisher', kr: '처벌자', en: 'PUNISHER',
    color: '#ff9a3c', icon: '⌁', need: 320,
    summary: '반복 습관을 카운터함',
    detail: '고정된 연결과 반복 루트를 노려 확정 반격을 넣습니다. 같은 실수를 두 번 하면 그대로 처형당합니다.',
    quote: '같은 길로 두 번 오지 마십시오.',
    abilities: ['습관 카운터', '리커버리 처형', '기상 압박'],
    p: { model: 0.8, mimic: 0.22, react: 8, aggro: 0.68, mirror: 0.2, punish: 0.55, noise: 0.16, dmgScale: 1 },
  },
  {
    lv: 5, key: 'replica', kr: '복제자', en: 'REPLICA',
    color: '#ff4fa3', icon: '◉', need: 520,
    summary: '플레이어와 거의 같은 스타일로 싸움',
    detail: '당신의 Combat DNA를 그대로 입고 싸웁니다. 거울을 마주한 것과 같은 대전이 됩니다.',
    quote: '이제 우리는 같은 방식으로 싸웁니다.',
    abilities: ['Combat DNA 완전 복제', '콤보 루트 재현', '선행 복사'],
    p: { model: 0.95, mimic: 0.62, react: 6, aggro: 0.74, mirror: 0.42, punish: 0.66, noise: 0.1, dmgScale: 1.06 },
  },
  {
    lv: 6, key: 'betrayer', kr: '배신자', en: 'BETRAYER',
    color: '#ffffff', icon: '✖', need: 800,
    summary: '플레이어 습관을 역이용해서 플레이어를 압도함',
    detail: 'SIMULA는 이제 당신을 모방하지 않습니다. 당신을 공략합니다. 모든 습관이 약점으로 환산되어 되돌아옵니다.',
    quote: 'SIMULA는 이제 당신을 모방하지 않습니다. 당신을 공략합니다.',
    abilities: ['약점 집중 공략', '0.01초 선행 복사', '습관 역이용 콤보', '데미지 보정 +12%'],
    p: { model: 1, mimic: 0.24, react: 4, aggro: 0.82, mirror: 0.6, punish: 0.86, noise: 0.05, dmgScale: 1.12 },
  },
];

export function stageOf(xp: number): StageDef {
  let s = STAGES[0];
  for (const st of STAGES) if (xp >= st.need) s = st;
  return s;
}

export function nextStage(lv: number): StageDef | null {
  return STAGES.find((s) => s.lv === lv + 1) ?? null;
}

/** 현재 단계 내 진행도 0~1 */
export function stageProgress(xp: number): { cur: StageDef; next: StageDef | null; ratio: number; remain: number } {
  const cur = stageOf(xp);
  const next = nextStage(cur.lv);
  if (!next) return { cur, next: null, ratio: 1, remain: 0 };
  const span = next.need - cur.need;
  const done = xp - cur.need;
  return { cur, next, ratio: Math.max(0, Math.min(1, done / span)), remain: Math.max(0, next.need - xp) };
}

/** XP 획득량: 행동 종류/예측 성공에 따라 가중 */
export function xpForAction(predicted: boolean): number {
  return predicted ? 2.2 : 1;
}
