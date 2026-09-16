// ─────────────────────────────────────────────────────────────
//  HUMAN-LIKENESS — "시뮬라가 얼마나 인간처럼 싸우는가"
//  (arXiv 2108.03599, Yuda 외 — 플레이스타일의 human-likeness
//   자동 평가 아이디어를 이 프로젝트의 DNA/RawProfile에 맞게 구현)
//
//  지표 설계 원칙: 인간은 완전 무작위도, 완전 고정도 아니다.
//  ① 행동 분포의 엔트로피가 "중간 어딘가"에 있을수록 인간형
//  ② 상황(기상/저체력/코너/압박)에 따라 행동이 달라질수록 인간형
//  ③ 콤보 루트가 다양하면서도 주력이 존재할수록 인간형
//  ④ 헛스윙(whiff)이 존재할수록 인간형 (AI는 헛스윙이 거의 없다)
//  ⑤ 거리 활용이 극단적이지 않을수록 인간형
// ─────────────────────────────────────────────────────────────
import type { DNA, RawProfile } from './dna';
import { ATTACK_KINDS } from './dna';

export interface HLPart {
  key: string;
  kr: string;
  score: number;   // 0~100
  note: string;
}

export interface HumanLikeness {
  score: number;          // 0~100 종합
  confidence: number;     // 0~1 (데이터량 기반)
  parts: HLPart[];
  enough: boolean;        // 분석 가능한 최소 데이터 확보 여부
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** 0~1 정규화 엔트로피 (최대 분할 수 기준) */
function normEntropy(counts: number[]): number {
  const k = counts.filter((c) => c > 0).length;
  if (k <= 1) return 0;
  const tot = counts.reduce((a, b) => a + b, 0);
  if (tot <= 0) return 0;
  let h = 0;
  for (const c of counts) {
    if (c <= 0) continue;
    const p = c / tot;
    h -= p * Math.log(p);
  }
  return h / Math.log(counts.length);
}

/** 벨 커브: target에 가까울수록 1, 멀어질수록 0 (폭 spread) */
function bell(x: number, target: number, spread: number): number {
  if (spread <= 0) return x === target ? 1 : 0;
  const d = Math.abs(x - target) / spread;
  return clamp01(1 - d * d);
}

/** 두 분포의 유사도 (1 - 평균 절대 차 / 2) — 0~1, 1이면 동일 */
function distSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let ta = 0, tb = 0;
  for (const k of keys) { ta += a[k] ?? 0; tb += b[k] ?? 0; }
  if (ta <= 0 || tb <= 0) return 0;   // 상황별 데이터가 없으면 "적응 없음"으로 판정
  let diff = 0;
  for (const k of keys) diff += Math.abs((a[k] ?? 0) / ta - (b[k] ?? 0) / tb);
  return clamp01(1 - (diff / 2) / 0.55);
}

/**
 * 인간다움 지표.
 * @param dna  Combat DNA (computeDNA 결과)
 * @param raw  원시 수집 데이터 — 시뮬라가 복제한 대상 자체
 */
export function humanLikeness(dna: DNA, raw: RawProfile): HumanLikeness {
  const parts: HLPart[] = [];

  // ── 데이터 신뢰도
  const enough = raw.totalActs >= 60;
  const confidence = clamp01(raw.totalActs / 220);

  // ① 행동 분포 엔트로피 — 인간 구간은 "편향되었지만 고정되지 않은" 0.45~0.8
  const actCounts = ATTACK_KINDS.map((k) => raw.actions[k] ?? 0);
  const ent = normEntropy(actCounts);
  const entScore = Math.round(bell(ent, 0.62, 0.38) * 100);
  parts.push({
    key: 'entropy', kr: '행동 다양성', score: entScore,
    note: ent > 0.85 ? '분포가 너무 무작위입니다 — 기계적 무작위성.' :
      ent < 0.3 ? '행동이 거의 고정되어 있습니다 — 반복 봇처럼 보입니다.' :
        '편향과 다양성의 균형이 인간적입니다.',
  });

  // ② 상황 적응도 — 기본 분포 대비 상황별 분포의 변화량
  const situ: [string, string, Record<string, number>][] = [
    ['okizeme', '기상 공방', raw.okizeme],
    ['lowHp', '저체력', raw.lowHpActs],
    ['corner', '코너', raw.corneredActs],
    ['pressure', '압박', raw.pressureActs],
  ];
  let adaptSum = 0, adaptN = 0;
  const adaptNotes: string[] = [];
  for (const [, kr, dist] of situ) {
    if (Object.keys(dist).length === 0) continue;
    const sim = distSimilarity(raw.actions, dist);
    adaptSum += sim;
    adaptN++;
    if (sim > 0.82) adaptNotes.push(`${kr}`);
  }
  // 완전 동일(sim≈1)하면 적응 없음 → 인간은 상황마다 다르게 싸운다
  const adaptScore = adaptN === 0 ? 40 : Math.round((1 - adaptSum / adaptN) * 130);
  parts.push({
    key: 'adaptation', kr: '상황 적응', score: Math.max(0, Math.min(100, adaptScore)),
    note: adaptN === 0 ? '상황별 데이터 부족.' :
      adaptNotes.length === 0 ? '상황마다 행동을 바꿉니다 — 매우 인간적입니다.' :
        `${adaptNotes.join('·')} 상황에서도 같은 분포 — 상황 판단이 부족합니다.`,
  });

  // ③ 콤보 루트 — 다양성 + 주력 존재 (엔트로피 0.35~0.85 구간이 인간형)
  const routes = Object.values(raw.routes ?? {});
  const routeEnt = normEntropy(routes);
  const routeScore = routes.length < 3 ? 30 : Math.round(bell(routeEnt, 0.6, 0.45) * 100);
  parts.push({
    key: 'routes', kr: '콤보 습관', score: routeScore,
    note: routes.length < 3 ? '콤보 루트 데이터 부족.' :
      routeEnt > 0.9 ? '루트가 너무 흩어져 있습니다 — 조합이 기계적입니다.' :
        '주력 루트가 있으면서 변형도 섞습니다.',
  });

  // ④ 헛스윙 — 인간은 실수한다. whiff 비율 8~35% 구간이 인간형
  const swing = raw.hits + raw.whiffs + raw.blocked;
  const whiffRate = swing > 0 ? raw.whiffs / swing : 0.5;
  const whiffScore = swing < 10 ? 35 : Math.round(bell(whiffRate, 0.2, 0.24) * 100);
  parts.push({
    key: 'whiff', kr: '실수(헛스윙)', score: whiffScore,
    note: swing < 10 ? '타격 데이터 부족.' :
      whiffRate < 0.05 ? '헛스윙이 거의 없습니다 — 기계적 정확도.' :
        whiffRate > 0.5 ? '너무 많이 빗나갑니다 — 통제가 부족합니다.' :
          '적절한 수준의 실수 — 인간적입니다.',
  });

  // ⑤ 거리 활용 — 근거리/원거리 체류가 모두 존재할수록 인간형
  const tf = raw.frames || 1;
  const near = raw.nearFrames / tf;
  const far = raw.farFrames / tf;
  const spreadScore = Math.round(bell(near + far, 0.75, 0.5) * 100);
  parts.push({
    key: 'spacing', kr: '거리 활용', score: spreadScore,
    note: near + far < 0.35 ? '중거리에만 머뭅니다 — 관찰 데이터가 단조롭습니다.' :
      '다양한 거리에서 행동합니다.',
  });

  // ── 반복성 페널티: 너무 반복적이면 감점 (DNA repetition 활용)
  const repPenalty = Math.max(0, (dna.repetition - 70) * 0.35);

  const base = parts.reduce((s, p) => s + p.score, 0) / parts.length;
  const score = Math.max(0, Math.min(100, Math.round(base - repPenalty)));
  return { score, confidence, parts, enough };
}

/** 등급 문장 (UI 표시용) */
export function humanLikenessLabel(hl: HumanLikeness): string {
  if (!hl.enough) return '데이터 부족';
  if (hl.score >= 78) return '인간 구별 불가';
  if (hl.score >= 62) return '거의 인간 같음';
  if (hl.score >= 45) return '기계 냄새가 남';
  return '명백한 AI';
}