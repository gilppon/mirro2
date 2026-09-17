// ─────────────────────────────────────────────────────────────
//  FAIR PLAY ENFORCEMENT TEST — Phase 4 (F-1)
//  "모든 상품이 cosmetics/information/utility여야 한다"는 불변식을
//  테스트 레벨에서 강제한다. store.ts의 FAIR_PLAY_STATEMENT를 코드로 검증.
// ─────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { CATALOG } from './store';

describe('Fair Play (No Pay-to-Win 강제)', () => {
  it('코스메틱/편의/정보 상품으로만 구성된다', () => {
    // 외형(skin/hud/fx)·유틸리티·시즌패스는 반드시 cosmetic: true.
    // DLC 중 정보 제공형(분석 도구)만 cosmetic: false를 허용한다.
    for (const item of CATALOG) {
      expect(item).toHaveProperty('cosmetic');
      if (item.kind !== 'dlc') {
        expect(item.cosmetic, `${item.id}(${item.kind})는 반드시 cosmetic이어야 함`).toBe(true);
      }
    }
  });

  it('cosmetic이 아닌 상품은 "전투 영향 없음"을 명시 선언해야 한다 (향후 추가분 강제)', () => {
    // 규칙: cosmetic: false인 상품이 늘어날 때마다 개발자는
    // tag/desc에 "전투 영향 없음"을 선언해야만 테스트를 통과한다.
    // 이것이 FAIR_PLAY_STATEMENT("선언")를 "강제"로 바꾸는 장치다.
    for (const item of CATALOG) {
      if (!item.cosmetic) {
        const decl = `${item.tag ?? ''} ${item.desc}`;
        expect(decl, `${item.id}가 cosmetic:false인데 "전투 영향 없음"을 선언하지 않음`).toContain('전투 영향 없음');
      }
    }
  });

  it('상품 ID가 유일하다', () => {
    const ids = CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('모든 상품 가격이 0 이상', () => {
    for (const item of CATALOG) {
      expect(item.price, `${item.id}의 가격이 음수`).toBeGreaterThanOrEqual(0);
    }
  });

  it('cosmetic이고 combat 영향이 없는 상품만 존재 (No Pay-to-Win 불변식)', () => {
    // Phase 4 확장성 검증: 앞으로 새 상품이 추가되어도
    // "전투 판정/프레임/데미지/게이지/학습속도"에 영향 주는 항목은
    // 절대 카탈로그에 들어올 수 없다.
    const bannedTags = ['damage', 'frames', 'speed', 'meter', 'learn', 'winrate', 'bias'];
    for (const item of CATALOG) {
      const tag = item.tag?.toLowerCase() ?? '';
      for (const b of bannedTags) {
        // "전투 영향 없음" 태그 자체는 허용 (tag에 banned 단어가 들어 있으면 불허)
        expect(tag, `${item.id}의 tag "${item.tag}"가 전투 영향을 암시함`).not.toContain(b);
      }
    }
  });

  it('패시브/능동 효과(bullets)가 전투에 영향을 줄 수 있는 설명은 포함하지 않는다', () => {
    const bannedPhrases = ['데미지', '피해', '속도', '이속', '공격력', '방어력', '게이지', '리절트', '매칭 보정'];
    for (const item of CATALOG) {
      const text = `${item.name} ${item.desc} ${(item.bullets ?? []).join(' ')}`.toLowerCase();
      for (const b of bannedPhrases) {
        expect(text, `${item.id}의 설명에 "${b}"이 포함되어 있음 — 전투 영향 암시`).not.toContain(b.toLowerCase());
      }
    }
  });
});
