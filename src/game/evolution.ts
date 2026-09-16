// ─────────────────────────────────────────────────────────────
//  SIMULA EVOLUTION — AI는 한 번에 완성되지 않는다
//  관찰자 → 모방자 → 예측자 → 처벌자 → 복제자 → 배신자
// ─────────────────────────────────────────────────────────────
import type { Archetype } from './dna';

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

// ─────────────────────────────────────────────────────────────
//  다차원 난이도 (arXiv 2211.02759, Halina & Guzdial)
//  "난이도 레벨당 전략 1개"는 인간 같지 않다.
//  같은 진화 단계(LV)라도 전략(아키타입 variant)이 달라야
//  시뮬라가 한 명 더 있는 것처럼 느껴진다.
// ─────────────────────────────────────────────────────────────
export type VariantParam = 'model' | 'mimic' | 'react' | 'aggro' | 'mirror' | 'punish' | 'noise';

export interface VariantDef {
  key: Archetype;
  kr: string;
  en: string;
  /** 이 variant가 시뮬라에게 부여하는 전략 정체성 */
  motto: string;
  /** StageDef.p 각 항목의 승수 (dmgScale은 건드리지 않는다 — 난이도 조작 금지 원칙) */
  mod: Partial<Record<VariantParam, number>>;
}

export const VARIANTS: VariantDef[] = [
  {
    key: 'RUSHER', kr: '돌진형', en: 'RUSHER',
    motto: '거리를 지우고 밀어붙입니다.',
    mod: { aggro: 1.28, react: 0.84, punish: 0.82, mirror: 0.8, noise: 0.85 },
  },
  {
    key: 'COUNTER_HUNTER', kr: '카운터 사냥꾼', en: 'COUNTER HUNTER',
    motto: '당신이 먼저 움직이기를 기다립니다.',
    mod: { punish: 1.34, model: 1.12, aggro: 0.78, react: 0.9 },
  },
  {
    key: 'THROW_ADDICT', kr: '잡기 중독자', en: 'THROW ADDICT',
    motto: '가드는 결국 뚫립니다.',
    mod: { aggro: 1.06, mimic: 1.22, noise: 1.18 },
  },
  {
    key: 'TURTLE_GUARD', kr: '거북이 수비', en: 'TURTLE GUARD',
    motto: '실수를 기다리는 벽이 됩니다.',
    mod: { aggro: 0.68, punish: 1.18, react: 1.12 },
  },
  {
    key: 'PANIC_JUMPER', kr: '패닉 점퍼', en: 'PANIC JUMPER',
    motto: '예측할 수 없는 움직임이 방어입니다.',
    mod: { noise: 1.55, aggro: 0.86, mirror: 0.9 },
  },
  {
    key: 'COMBO_REPEATER', kr: '콤보 반복자', en: 'COMBO REPEATER',
    motto: '배운 연결을 끝까지 재현합니다.',
    mod: { mimic: 1.4, model: 1.06 },
  },
  {
    key: 'FRAME_TRAP_LOVER', kr: '프레임 트랩꾼', en: 'FRAME TRAP LOVER',
    motto: '틈을 파고 물어뜯습니다.',
    mod: { model: 1.16, punish: 1.12, mirror: 1.1 },
  },
  {
    key: 'RANDOM_TRICKSTER', kr: '무작위 트릭스터', en: 'RANDOM TRICKSTER',
    motto: '저를 읽는 것 자체가 헛수고입니다.',
    mod: { noise: 1.85, model: 0.84, punish: 0.78 },
  },
];

/** 스테이지 파라미터에 variant 변조 적용 (결정론 — 승수 곱 후 클램프) */
export function applyVariant(p: StageDef['p'], v: VariantDef | null): StageDef['p'] {
  if (!v) return p;
  const m = v.mod;
  const cl = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
  return {
    model: cl(p.model * (m.model ?? 1), 0, 1),
    mimic: cl(p.mimic * (m.mimic ?? 1), 0, 1),
    react: cl(Math.round(p.react * (m.react ?? 1)), 2, 30),
    aggro: cl(p.aggro * (m.aggro ?? 1), 0.05, 1),
    mirror: cl(p.mirror * (m.mirror ?? 1), 0, 1),
    punish: cl(p.punish * (m.punish ?? 1), 0, 1),
    noise: cl(p.noise * (m.noise ?? 1), 0.02, 1),
    dmgScale: p.dmgScale,
  };
}

/** 시드 기반 variant 선택 (같은 시드 → 같은 variant, 시뮬레이션 재현성 유지) */
export function pickVariant(seed: number): VariantDef {
  return VARIANTS[Math.abs(Math.floor(seed)) % VARIANTS.length];
}
