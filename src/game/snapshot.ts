// ─────────────────────────────────────────────────────────────
//  SNAPSHOT — 롤백/재검증용 상태 복제
//  Map/Set/배열/일반 객체를 재귀 복제한다. 함수는 상태가 아니므로 제외.
// ─────────────────────────────────────────────────────────────

/** 깊은 복제 — JSON 대신 사용 (Map·Set 보존, 함수 제외). 순수 데이터 상태에만 사용할 것. */
export function deepClone<T>(v: T): T {
  if (v === null || typeof v !== 'object') return v;
  if (v instanceof Map) {
    const out = new Map<unknown, unknown>();
    for (const [k, val] of v) out.set(deepClone(k), deepClone(val));
    return out as unknown as T;
  }
  if (v instanceof Set) {
    const out = new Set<unknown>();
    for (const val of v) out.add(deepClone(val));
    return out as unknown as T;
  }
  if (Array.isArray(v)) {
    return v.map((x) => deepClone(x)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'function') continue;
    out[k] = deepClone(val);
  }
  return out as T;
}
