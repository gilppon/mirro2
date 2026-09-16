// ─────────────────────────────────────────────────────────────
//  READ MOMENT — "아, 방금 읽혔다."
//  이 게임의 중독성은 체력이 깎이는 순간이 아니라
//  내가 읽혔다는 것을 깨닫는 순간에 있다.
// ─────────────────────────────────────────────────────────────
import { ACTION_KR } from './brain';
import type { LAction } from './brain';

export type ReadKind = 'read' | 'predicted' | 'punished' | 'broke';

export interface ReadEvent {
  kind: ReadKind;
  big: string;        // 대형 영문 태그
  kr: string;         // 한글 선고 문장
  sub: string;        // 부가 정보
  action: string;
  conf: number;
  repeat: number;     // 같은 행동 반복 횟수
  life: number;
  maxLife: number;
  color: string;
}

const KR = (k: string) => ACTION_KR[k as LAction] ?? k;

/** 반복 횟수에 따라 문장이 점점 날카로워진다 */
function repeatLine(act: string, n: number): string {
  const a = KR(act);
  if (n >= 8) return `또 ${a}입니다. ${n}번째.`;
  if (n >= 5) return `당신은 또 ${a}했습니다.`;
  if (n >= 3) return `이번에도 ${a}.`;
  return `${a} — 예측됨.`;
}

export function makeRead(
  kind: ReadKind,
  action: string,
  conf: number,
  repeat: number,
): ReadEvent {
  switch (kind) {
    case 'read':
      return {
        kind, big: 'READ', kr: repeatLine(action, repeat),
        sub: `SIMULA predicted your ${action.toUpperCase()}`,
        action, conf, repeat, life: 74, maxLife: 74, color: '#ff4fa3',
      };
    case 'predicted':
      return {
        kind, big: 'PREDICTED', kr: repeatLine(action, repeat),
        sub: `예측 신뢰도 ${Math.round(conf * 100)}% — 발생 전에 대응됨`,
        action, conf, repeat, life: 92, maxLife: 92, color: '#fb7185',
      };
    case 'punished':
      return {
        kind, big: 'PUNISHED', kr: `${KR(action)}은(는) 이미 읽혔습니다.`,
        sub: '습관이 그대로 반격으로 돌아왔습니다',
        action, conf, repeat, life: 100, maxLife: 100, color: '#ff2e5e',
      };
    case 'broke':
      return {
        kind, big: 'UNREADABLE', kr: '예측을 벗어났습니다.',
        sub: `SIMULA의 ${KR(action)} 예측이 빗나갔습니다`,
        action, conf, repeat, life: 80, maxLife: 80, color: '#7dffc2',
      };
  }
}

/** 세션 내 읽힌 횟수 통계 */
export interface ReadTally {
  reads: number;
  breaks: number;
  byAction: Record<string, number>;
  streak: number;      // 연속으로 읽힌 횟수
  worstStreak: number;
}

export function emptyTally(): ReadTally {
  return { reads: 0, breaks: 0, byAction: {}, streak: 0, worstStreak: 0 };
}

export function tallyRead(t: ReadTally, action: string) {
  t.reads++;
  t.byAction[action] = (t.byAction[action] ?? 0) + 1;
  t.streak++;
  t.worstStreak = Math.max(t.worstStreak, t.streak);
}

export function tallyBreak(t: ReadTally) {
  t.breaks++;
  t.streak = 0;
}

export function readRate(t: ReadTally): number {
  const n = t.reads + t.breaks;
  return n ? t.reads / n : 0;
}
