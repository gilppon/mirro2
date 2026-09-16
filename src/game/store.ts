// ─────────────────────────────────────────────────────────────
//  STORE — AI 분신 / 분석 / 리그를 판다
//  원칙: 전투 능력치에 영향을 주는 상품은 존재하지 않는다 (No Pay-to-Win)
// ─────────────────────────────────────────────────────────────

export type ItemKind = 'dlc' | 'skin' | 'hud' | 'fx' | 'utility' | 'pass';

export interface StoreItem {
  id: string;
  kind: ItemKind;
  name: string;
  sub: string;
  desc: string;
  price: number;          // USD
  color: string;
  icon: string;
  /** 전투에 영향 없음을 명시 */
  cosmetic: boolean;
  tag?: string;
  bullets?: string[];
}

export const BASE_PRICE = 12.99;

export const CATALOG: StoreItem[] = [
  // ── DLC
  {
    id: 'dlc.personalities', kind: 'dlc', icon: '⚙', color: '#38f2ff',
    name: 'AI 성격 팩', sub: 'PERSONALITY PACK', price: 4.99, cosmetic: true,
    desc: 'SIMULA의 말투·연출·진화 서사를 교체합니다. 학습 알고리즘과 전투 성능은 동일합니다.',
    bullets: ['냉소적 분석가 · ARCHIVIST', '조롱하는 도플갱어 · JESTER', '침묵하는 관측자 · VOID'],
    tag: '연출 전용',
  },
  {
    id: 'dlc.stages', kind: 'dlc', icon: '▦', color: '#b478ff',
    name: '추가 스테이지', sub: 'ARENA PACK', price: 3.99, cosmetic: true,
    desc: '신경망 코어, 수은 해면, 붕괴한 서버룸 등 아레나 6종. 판정과 거리 수치는 기본 아레나와 완전히 동일합니다.',
    bullets: ['MERCURY SEA', 'COLLAPSED SERVER', 'NEURAL CORE'],
    tag: '동일 판정',
  },
  {
    id: 'dlc.report', kind: 'dlc', icon: '⌗', color: '#ff9a3c',
    name: 'AI 리포트 확장팩', sub: 'DEEP ANALYSIS', price: 5.99, cosmetic: false,
    desc: '분석 심화 도구. 프레임 단위 타임라인, 상황별 히트맵, 세대 간 DNA 추이 그래프, CSV 내보내기.',
    bullets: ['프레임 타임라인', '세대별 DNA 추이', '상황별 선택 히트맵', 'CSV / PNG 내보내기'],
    tag: '정보 제공 · 전투 영향 없음',
  },
  {
    id: 'dlc.characters', kind: 'dlc', icon: '✧', color: '#ffd447',
    name: '신규 캐릭터', sub: 'FIGHTER PACK', price: 6.99, cosmetic: true,
    desc: '동일 프레임 데이터를 공유하는 대체 바디 4종. 외형·이펙트만 달라지며 기술 성능은 완전히 동일합니다.',
    bullets: ['GLASS / 유리질', 'ASH / 재', 'TIDE / 유체', 'WIRE / 선형'],
    tag: '동일 프레임',
  },

  // ── 시즌 패스
  {
    id: 'pass.season', kind: 'pass', icon: '◈', color: '#ff4fa3',
    name: 'Ghost League 시즌 패스', sub: 'SEASON 01', price: 7.99, cosmetic: true,
    desc: '시즌 리그 참가 + 주간 리포트 아카이브 + 시즌 한정 스킨/HUD/카드 프레임. 매칭 품질과 승률 보정은 없습니다.',
    bullets: ['시즌 랭킹 참가', '주간 고스트 리포트 아카이브', '시즌 한정 코스메틱 12종', '리플레이 무제한 보관'],
    tag: '랭킹 보정 없음',
  },

  // ── 코스메틱
  {
    id: 'skin.mercury', kind: 'skin', icon: '◉', color: '#cfe0f5',
    name: 'MERCURY', sub: 'AI SKIN', price: 1.99, cosmetic: true,
    desc: '기본 수은 크롬. 가장 순수한 거울 질감.',
  },
  {
    id: 'skin.crimson', kind: 'skin', icon: '◉', color: '#ff4f6d',
    name: 'CRIMSON', sub: 'AI SKIN', price: 1.99, cosmetic: true,
    desc: '배신자 각성 상태의 핏빛 크롬.',
  },
  {
    id: 'skin.aurora', kind: 'skin', icon: '◉', color: '#7dffc2',
    name: 'AURORA', sub: 'AI SKIN', price: 1.99, cosmetic: true,
    desc: '오로라 간섭 무늬가 흐르는 표면.',
  },
  {
    id: 'skin.void', kind: 'skin', icon: '◉', color: '#8b5cf6',
    name: 'VOID', sub: 'AI SKIN', price: 1.99, cosmetic: true,
    desc: '빛을 삼키는 무광 흑체.',
  },
  {
    id: 'hud.classic', kind: 'hud', icon: '▤', color: '#38f2ff',
    name: 'NEURAL BLUE', sub: 'HUD THEME', price: 0, cosmetic: true, desc: '기본 테마.',
  },
  {
    id: 'hud.amber', kind: 'hud', icon: '▤', color: '#ffb347',
    name: 'AMBER CRT', sub: 'HUD THEME', price: 1.49, cosmetic: true,
    desc: '호박색 브라운관 테마. 스캔라인 강화.',
  },
  {
    id: 'hud.mono', kind: 'hud', icon: '▤', color: '#e2e8f0',
    name: 'MONOCHROME', sub: 'HUD THEME', price: 1.49, cosmetic: true,
    desc: '무채색 미니멀 테마.',
  },
  {
    id: 'fx.glitch', kind: 'fx', icon: '✦', color: '#c0ff4f',
    name: 'DATA SHARD', sub: 'HIT EFFECT', price: 1.49, cosmetic: true,
    desc: '타격 시 데이터 파편이 흩어지는 이펙트.',
  },

  // ── 편의 기능
  {
    id: 'util.rename', kind: 'utility', icon: '✎', color: '#7dffc2',
    name: 'AI 이름 변경권', sub: 'RENAME TOKEN', price: 0.99, cosmetic: true,
    desc: '내 AI 파이터의 이름을 원하는 대로 바꿉니다. 최초 1회는 무료입니다.',
    tag: '최초 1회 무료',
  },
  {
    id: 'util.slots', kind: 'utility', icon: '⛁', color: '#5ee7ff',
    name: '리플레이 분석 슬롯 +20', sub: 'REPLAY SLOTS', price: 2.49, cosmetic: true,
    desc: '기본 3슬롯에서 23슬롯으로 확장. 과거 습관과 지금을 비교할 수 있습니다.',
    tag: '저장 공간',
  },
  {
    id: 'util.card', kind: 'utility', icon: '▣', color: '#f0abfc',
    name: 'AI 전투 프로필 카드', sub: 'PROFILE CARD', price: 1.99, cosmetic: true,
    desc: '공유용 고해상도 프로필 카드. 프레임 8종과 배경 6종을 선택할 수 있습니다.',
    tag: 'SNS 공유',
  },
];

export const SKINS = CATALOG.filter((i) => i.kind === 'skin');
export const HUDS = CATALOG.filter((i) => i.kind === 'hud');

export interface Wallet {
  owned: string[];
  equippedSkin: string;
  equippedHud: string;
  renames: number;      // 남은 이름 변경 횟수
  replaySlots: number;
  seasonPass: boolean;
}

export function loadWallet(): Wallet {
  try {
    const s = localStorage.getItem('mnb.wallet');
    if (s) {
      const w = JSON.parse(s) as Wallet;
      return {
        owned: w.owned ?? [], equippedSkin: w.equippedSkin ?? 'skin.mercury',
        equippedHud: w.equippedHud ?? 'hud.classic', renames: w.renames ?? 1,
        replaySlots: w.replaySlots ?? 3, seasonPass: w.seasonPass ?? false,
      };
    }
  } catch { /* noop */ }
  return {
    owned: ['skin.mercury', 'hud.classic'],
    equippedSkin: 'skin.mercury', equippedHud: 'hud.classic',
    renames: 1, replaySlots: 3, seasonPass: false,
  };
}

export function saveWallet(w: Wallet) {
  try { localStorage.setItem('mnb.wallet', JSON.stringify(w)); } catch { /* noop */ }
}

export function skinColor(id: string): string {
  return CATALOG.find((i) => i.id === id)?.color ?? '#cfe0f5';
}

export function hudColor(id: string): string {
  return CATALOG.find((i) => i.id === id)?.color ?? '#38f2ff';
}

/** 이 상품이 전투에 영향을 주는가 — 항상 false여야 한다 */
export const FAIR_PLAY_STATEMENT =
  '판매되는 모든 상품은 외형·정보·편의 기능입니다. 데미지, 프레임 데이터, AI 학습 속도, 매칭 보정에 영향을 주는 상품은 존재하지 않으며 앞으로도 판매하지 않습니다.';
