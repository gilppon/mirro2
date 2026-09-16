// ─────────────────────────────────────────────────────────────
//  DETERMINISTIC RNG — 재현성의 토대
//  같은 시드는 항상 같은 수열을 낸다.
//  리플레이 재생 / 비동기 리그 / 서버 재검증 / 롤백 넷코드의 전제조건.
// ─────────────────────────────────────────────────────────────

/**
 * xorshift32 기반 결정론적 난수 생성기.
 * `dnaBot.ts`에서 시작된 것을 공용 모듈로 승격 — 모든 AI/엔진이 이걸 공유한다.
 */
export class Rng {
  private s: number;
  constructor(seed: number) { this.s = (seed >>> 0) || 1; }

  next(): number {
    this.s ^= this.s << 13; this.s >>>= 0;
    this.s ^= this.s >> 17;
    this.s ^= this.s << 5; this.s >>>= 0;
    return this.s / 4294967296;
  }

  /** 롤백 스냅샷용 내부 상태 */
  get state(): number { return this.s; }
  set state(v: number) { this.s = (v >>> 0) || 1; }
}

/** 시드 → 난수 함수. Engine/Brain에 주입할 때 사용. */
export function seededRandom(seed: number): () => number {
  const r = new Rng(seed);
  return () => r.next();
}

/** 시드 혼합 — 좌/우 봇에 상관관계 없는 독립 시드를 줄 때 사용. */
export function mixSeed(seed: number, salt: number): number {
  return hash32(seed >>> 0, salt >>> 0);
}

/** 결정론적 32bit 해시 (FNV-1a 변형). 디싱크 체크섬용. */
export function hash32(...nums: number[]): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < nums.length; i++) {
    let x = Math.imul(nums[i] | 0, 0x01000193);
    x ^= x >>> 15;
    h = (h ^ x) >>> 0;
    h = Math.imul(h, 0x85ebca6b) >>> 0;
  }
  return h >>> 0;
}

/** 문자열 폴딩 해시 — 문자열 상태를 체크섬에 섞을 때 */
export function hashStr(h: number, s: string): number {
  let out = h >>> 0;
  for (let i = 0; i < s.length; i++) {
    out = hash32(out, s.charCodeAt(i));
  }
  return out >>> 0;
}

/**
 * 부동소수점을 체크섬용 정수로 양자화한다.
 * (0.1 + 0.2 문제로 인한 미세 오차가 디싱크로 오판되지 않도록)
 */
export function q(v: number, scale = 1000): number {
  return Math.round((Number.isFinite(v) ? v : 0) * scale) | 0;
}
