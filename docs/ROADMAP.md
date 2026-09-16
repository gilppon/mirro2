# MIRROR NEURAL BRAWLER — 고도화 로드맵

> 셉: **"당신의 입력 습관을 실시간 학습해 0.01초 먼저 복사하는 신경망 도플갱어 '시뮬라'와의 반사신경 역-학습 투"**

작성 근거: ① 코드베이스 정적 분석(타입체크 0 에러 / 빌드 성공), ② 웹 리서치(롤백 넷코드, 투게임 AI 논문, 비동기 PvP 사례)

---

## Part 0. 리서치 결과와 근거 등급

| 주제 | 출처 | 등급 |
|---|---|---|
| 롤백 넷코드의 작동 원리·요구조건·실패 모드 | Wikipedia **GGPO** + Ars Technica 롤백 심층 기사 | ✅ 확보 |
| 격투게임 AI: 다차원 난이도, 플레이스타일 식별, 개인화 DDA, 월드모델 기반 상대 | **arXiv 4편** | ✅ 확보 |
| Killer Instinct Shadow Lab (가장 직접적인 선례) | fandom/ki.infil 접근 403·404 | ⚠️ 미확보 (널리 알려진 선례로만 참조) |
| Forza Drivatar 상세 메커니즘 | Wikipedia Forza (시리즈 개요만 회수) | ⚠️ 부분확보 |
| 모바일 게임 D1/D7/D30 벤치마크 수치 | businessofapps 확인 실패 | ❌ 미확보 → 수치 인용하지 않음 |

### 확보한 논문 4편

1. **arXiv 2211.02759** (2022, Halina & Guzdial) — *Diversity-based Deep RL Towards Multidimensional Difficulty for Fighting Game AI*. 기존 격투게임 AI는 "난이도 레벨당 전략 1개"뿐이다. **난이도는 같은데 전략이 여러 개인 "다차원 난이도"** 를 제안. human-authored 보상보다 다양성·성능 모두 우수.
2. **arXiv 2108.03599** (2021, Yuda 외, Universal Fighting Engine) — 플레이스타일을 자동 절차로 비교 평가해 **human-likeness와 다양성**을 측정하는 방법.
3. **arXiv (2024, Fuchs/Gieseke/Dockhorn, ICE_AI)** — 2-에이전트 구조: 하나는 플레이어를 *모방*하도록 학습, 다른 하나는 그 모방자를 *이기도록* 학습 → **개인화 동적 난이도 조정(DDA)**. 본 프로젝트의 "복제자 → 배신자" 진화와 개념적으로 동일.
4. **arXiv 2603.00825** (2026, COMBAT) — Tekken 3 기반 diffusion world model이 명시적 상대 정책 레이블 없이 반응형 상대 행동을 창발적으로 학습.

### GGPO / 롤백 핵심 (검증된 내용)

- 다음 프레임 입력을 **예측해서 즉시 시뮬레이션** → 실제 입력이 도착해 틀렸으면 **마지막 정확 상태로 롤백 후 재시뮬레이션**.
- 전제조건 2개: **① 결정론적 시뮬레이션, ② 상태 저장/복원(save/restore)**.
- **클럭 동기화가 깨지면 "한쪽만 롤백"되는 치명적 버그** (SFV 온라인 평판 악화 원인으로 지목). 앞선 쪽을 1~2프레임 잠 멈춰 따라잡게 하는 것이 해법 — "10초에 1프레임 손실은 눈에 안 띈다."
- GGPO는 2019-10-09 **MIT 라이선스로 오픈소스화** — 브라우저/WebRTC 이식이 법적으로 자유로움.

---

## Part 1. 코드 검증에서 나온 결정적 발견

### 1-1. 좋은 소식: AI 대전은 이미 "거의 결정론적"

- `dnaBot.ts` — 시드 기반 xorshift `Rng`가 존재하고, `DnaBot`은 `rng.next()`만 사용.
- `meta.ts` `simulateMatch(a, b, seed)` — `botOf(a, seed)` / `botOf(b, seed ^ 0x9e3779b9)`로 우 봇에 **독립 시드** 부여.
- `engine.ts` — `spawnParticles`/`spawnText`가 `if (this.headless) return;`로 조기 반환 → 드리스 시뮬레이션에서 파티클 난수가 상태에 안 섞임.
- `engine.ts` — AI vs AI에선 `brain.decide()`를 타지 않고 `aBot.decide()`만 사용.

### 1-2. 나쁜 소식: 결정론을 깨는 정확히 3곳

| # | 위치 | 문제 | 영향 |
|---|---|---|---|
| A | `engine.ts` `aiCancel()` 내부 `Math.random()` | `headless` 가드 없음 | 리그/고스트 시뮬레이션 결과가 비재현적 |
| B | `engine.ts` `brain.decide({ t: performance.now() })`, `brain.observe(..., performance.now())` | 실제 벽시계를 시뮬레이션 입력으로 주입 | 기기/부하에 따라 결과 분기 |
| C | `brain.ts` raw `Math.random()` 17곳 | 시드 RNG 미사용 | 시뮬라 결정이 재현 불가 → 롤백/서버 검증 불가 |

### 1-3. 상태 직렬화 관점

| 상태 | 형태 | 판정 |
|---|---|---|
| `engine.comboRouteCounts` | `Map<string, number>` | ️ JSON 불가, 배열 변환 필요 |
| `brain.ctx1 / ctx2 / ctxDist` | `Map<string, Counts>` ×3 | ⚠️ 동일 |
| `brain.global`, `dna.raw.*` | `Record<string, number>` | ✅ JSON 가능 |
| `DnaBot.rng` | number 1개 | ✅ 완벽 |
| 파티클/텍스트/트레일 | 순수 객체 배열 | ✅ 프레젠테이션 전용(상태 제외) |

**결론: `Map` 4개만 처리하면 `Engine + DnaBot + Brain` 전체가 스냅샷 가능한 순수 데이터 덩어리다.**

---

## Part 2. 7대 고도화 전략 (요약)

| 전략 | 내용 | 공수 | 순서 |
|---|---|---|---|
| **A. 결정론 코어** | 난수/시계 DI, 스냅샷/복원, 체크섬, 회귀 테스트 | 3~5일 | **Phase 0 (전제)** |
| **B. 실시간 온라인** | WebRTC DataChannel + 롤백(GGPO 방식), 클럭 동기화 | 3~5주 | Phase 3 |
| **C. Shadow as a Service** | 실사람 AI 섀도우 리그, 서버 재검증, 진짜 오프라인 다이제스트 | 4~7주 | Phase 2 |
| **D. 학습 품질** | 다차원 난이도(같은 LV·복수 아키타입), 2-에이전트, humanLikeness 지표 | 2~3주 | Phase 1 |
| **E. 온보딩/리텐션** | 220샘플 게이지 서사화, 튜토리얼 3단계, 재방문 훅 3종 | 2~3주 | Phase 1 |
| **F. 수익화/공정성** | cosmetic 강제 테스트, 시즌 패스, FAIR_PLAY 문명화 | 1~2주 | Phase 4 |
| **G. 품질 인프라** | git, vitest, 결정론 테스트, 문서 | 1주 | **Phase 0** |

**안티패턴 금지:** 승률 기반 난이도 조작(역-학습 정체성 붕괴) / Pay-to-Win / 서버 재검증 없는 P2P 랭킹 / 롤백 전 지연기반 넷코드 출시.

---

## Part 3. 구현 상태 (2026-09-16 업데이트)

### ✅ Phase 0-A 완료 — 결정론 코어

| 작업 | 상태 | 위치 |
|---|---|---|
| 공용 결정론 RNG 모듈 (xorshift32, 시드 믹싱, FNV 해시, 양자화) | ✅ | `src/game/rng.ts` |
| `DnaBot` → 공용 `Rng`로 승격 | ✅ | `src/game/dnaBot.ts` |
| Engine 난수 주입 — `Math.random()` 7곳 → `this.rng()` | ✅ | `src/game/engine.ts` |
| Engine 시계 주입 — `performance.now()` 3곳 → `this.now()` | ✅ | `src/game/engine.ts` |
| Brain 난수 주입 — `Math.random()` 17곳 → `this.rng()` | ✅ | `src/game/brain.ts` |
| `Engine.setDeterminism(seed)` — 시드 RNG(Rng 인스턴스) + 고정 시계 주입, brain.rng 공유 | ✅ | `src/game/engine.ts` |
| `Engine.snapshot()/restore()` — Map/Set 포함 deepClone, **RNG 내부 상태까지 캡처** | ✅ | `engine.ts` + `src/game/snapshot.ts` |
| `Engine.checksum()` — 디싱크 감지용 양자화 해시 | ✅ | `src/game/engine.ts` |
| `simulateMatch` 시드 주입 (`eng.setDeterminism(seed)`) | ✅ | `src/game/meta.ts` |
| 결정론 회귀 테스트 **8개 전부 통과** | ✅ | `src/game/determinism.test.ts` |
| git 저장소 초기화 + Phase 0-A 커밋 (`7b5ee11`) | ✅ | `.git/` |

**검증 결과:**
- `tsc --noEmit` → **0 에러**
- `vitest run` → **8/8 통과** (같은 시드 → 같은 경기 / 다른 시드 각각 재현 / 스냅샷→복원→재시뮬→체크섬 일치 / Rng 상태 저장·복원 / deepClone Map 보존·함수 제외)
- `npm run build` → **성공** (dist/index.html 559.41 kB, 69 modules)

**설계 원칙 (준수됨):**
- 기본값은 기존 동작 그대로(`Math.random`/`performance.now`) — 실전 플레이 감성 무변경.
- 결정론은 `setDeterminism()`을 호출한 시뮬레이션에만 적용.
- 전투 타이밍 로직은 건드리지 않고 난수 소스만 교체.

### 다음 단계 (Phase 0 잔여 → Phase 1)

1. ~~`git init`~~ ✅ / ~~vitest~~ ✅ / ~~결정론~~ ✅
2. Phase 1: 다차원 난이도(D-1, evolution.ts에 아키타입 variant 축), `humanLikeness()` 지표(D-3), 튜토리얼 3단계(E-3)
3. Phase 2: 섀도우 서버(C-1~C-3) — `simulateMatch`의 시드 재현성이 서버 재검증의 기반이 됨 (이번에 확보됨)
4. Phase 3: 롤백 넷코드(B) — `snapshot()/restore()/checksum()`이 이미 준비됨 (이번에 확보됨)
