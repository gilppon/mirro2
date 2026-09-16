import { ARCHETYPE_META, type Archetype } from '../game/dna';
import { STAGES } from '../game/evolution';
import CharacterPreview from './CharacterPreview';

interface Props { onStart: () => void }

const LOOP = [
  { n: '01', t: '전투한다', d: '당신이 직접 싸웁니다.' },
  { n: '02', t: '습관을 수집한다', d: '입력 속도·간격·상황별 선택을 초당 60회 기록.' },
  { n: '03', t: '다음 행동을 예측한다', d: 'n-gram 습관 모델이 당신의 손을 읽습니다.' },
  { n: '04', t: '맞출수록 강해진다', d: '적중률이 오를수록 SIMULA가 먼저 움직입니다.' },
  { n: '05', t: '습관 때문에 패배한다', d: '당신이 진 상대는 SIMULA가 아니라 당신입니다.' },
  { n: '06', t: '리포트로 약점 확인', d: '“압박받을 때 점프 67%” — 손버릇이 문장이 됩니다.' },
  { n: '07', t: '훈련으로 교정한다', d: '금지 드릴로 근육 기억을 다시 씁니다.' },
  { n: '08', t: '다시 싸운다', d: '고친 습관으로 예측 모델을 붕괴시키세요.' },
];

const MECH = [
  {
    k: 'ANALYSIS',
    t: 'Next Input Prediction',
    d: '거리·직전 행동·상황을 조건으로 다음 입력을 확률 예측합니다. 신뢰도와 예측불가능성이 실시간으로 표시됩니다.',
    c: 'from-cyan-500/20 to-transparent border-cyan-400/30 text-cyan-300',
  },
  {
    k: 'ANALYSIS',
    t: 'Input Biometrics · Habit n-Gram',
    d: '평균 입력 간격, 최속 연타, APM, 반응속도, 시선 이동. 그리고 3연쇄 손버릇까지 n-gram으로 추출합니다.',
    c: 'from-fuchsia-500/20 to-transparent border-fuchsia-400/30 text-fuchsia-300',
  },
  {
    k: 'PROFILE',
    t: 'Action Bias · Live Combat DNA',
    d: '공격성·방어성·카운터·잡기 의존도·압박 지속력·위험 감수·반복 패턴이 싸우는 동안 실시간으로 움직입니다.',
    c: 'from-emerald-500/20 to-transparent border-emerald-400/30 text-emerald-300',
  },
  {
    k: 'VERDICT',
    t: 'SIMULA의 진단',
    d: '“당신은 위기로 몰리면 위로 도망갑니다.” 수치가 아니라 문장으로 당신의 손버릇을 마주하게 됩니다.',
    c: 'from-amber-500/20 to-transparent border-amber-400/30 text-amber-300',
  },
];

const KEYS: [string, string][] = [
  ['A / D', '이동 (더블 탭 = 대시)'],
  ['W', '점프 · S 웅크리기'],
  ['SHIFT', '상단 가드 (S+SHIFT = 하단 가드)'],
  ['J / K', '약 타격 / 강 상단'],
  ['L / I', '하단 쓸기 / 잡기'],
  ['↓↘→ +공격', '미러파 (장풍) — 또는 키 1'],
  ['→↓↘ +공격', '리플렉스 어퍼 (무적 대공) — 키 2'],
  ['↓↙← +공격', '글리치 슬라이드 (하단 돌진) — 키 3'],
  ['↓↘→ ×2', '초필살기 역-학습 오버라이드 — 키 R'],
  ['O', '노이즈 버스트 (게이지 50%)'],
];

export default function TitleScreen({ onStart }: Props) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#04060d] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(217,70,239,.20),transparent_55%),radial-gradient(circle_at_20%_80%,rgba(34,211,238,.16),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:44px_44px]" />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 md:py-16">
        <div className="grid items-center gap-8 md:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 font-mono text-[10px] tracking-[0.25em] text-fuchsia-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-400" />
              AI 습관 분석 격투게임 · SELF-MIRROR FIGHTING
            </div>
            <h1 className="text-[clamp(2.4rem,7vw,4.6rem)] font-black leading-[0.92] tracking-tighter">
              <span className="block bg-gradient-to-r from-cyan-200 via-white to-fuchsia-300 bg-clip-text text-transparent">
                MIRROR NEURAL
              </span>
              <span className="block bg-gradient-to-r from-fuchsia-400 via-rose-300 to-cyan-200 bg-clip-text text-transparent">
                BRAWLER
              </span>
            </h1>
            <p className="mt-3 font-mono text-sm tracking-[0.2em] text-white/45">
              Train Yourself. Fight Yourself. Beat Everyone.
            </p>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/70">
              일반 격투게임은 <b className="text-white">상대를 이기는</b> 게임입니다.
              이 게임은 <b className="text-fuchsia-300">내 반복 행동과 손버릇을 깨는</b> 게임입니다.
              AI가 당신의 입력 패턴을 학습하고, 그 습관을 그대로 이용해 당신을 이깁니다.
              <b className="text-emerald-300"> 이기려면 자기 자신을 배신해야 합니다.</b>
            </p>

            <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-2 font-mono text-[9px] tracking-[0.25em] text-white/35">CORE LOOP</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
                {LOOP.map((s) => (
                  <div key={s.n} className="group">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-[9px] text-cyan-300/60">{s.n}</span>
                      <span className="text-[11.5px] font-bold text-white/80">{s.t}</span>
                    </div>
                    <div className="font-mono text-[9px] leading-snug text-white/30">{s.d}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={onStart}
                className="group relative overflow-hidden rounded-md border border-cyan-300/50 bg-gradient-to-r from-cyan-500/25 to-fuchsia-500/25 px-8 py-3.5 font-mono text-sm font-bold tracking-[0.2em] text-white transition-all hover:border-cyan-200 hover:shadow-[0_0_30px_rgba(34,211,238,.35)] active:scale-95"
              >
                <span className="relative z-10">▸ 내 AI 파이터 만들기</span>
                <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-0" />
              </button>
              <span className="font-mono text-[11px] text-white/35">직접 싸울수록 AI가 당신을 닮아갑니다</span>
            </div>
          </div>

          {/* 캐릭터 VS — 실제 게임 렌더러로 실시간 렌더링 */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-2xl bg-[radial-gradient(circle,rgba(217,70,239,.2),transparent_70%)] blur-2xl" />
            <div className="relative grid grid-cols-2 gap-2">
              {/* OPERATOR */}
              <div className="relative overflow-hidden rounded-xl border border-cyan-300/25 bg-[#05070f]">
                <CharacterPreview who="operator" size={220} pose="idle" className="mx-auto block" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute inset-0 opacity-[0.15] [background:repeating-linear-gradient(0deg,transparent_0_2px,rgba(0,0,0,.9)_2px_3px)]" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="font-mono text-[9px] tracking-[0.3em] text-cyan-300">PLAYER</div>
                  <div className="text-lg font-black tracking-tight">오퍼레이터</div>
                  <p className="mt-0.5 text-[10.5px] leading-snug text-white/50">
                    바이저 너머로 세계를 읽는 테크슈트 파이터. 당신의 손이 곧 이 캐릭터의 신경입니다.
                  </p>
                </div>
              </div>
              {/* SIMULA */}
              <div className="relative overflow-hidden rounded-xl border border-fuchsia-400/25 bg-[#05070f]">
                <CharacterPreview who="simula" size={220} pose="idle" className="mx-auto block" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute inset-0 opacity-[0.15] [background:repeating-linear-gradient(0deg,transparent_0_2px,rgba(0,0,0,.9)_2px_3px)]" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="font-mono text-[9px] tracking-[0.3em] text-fuchsia-300">DOPPELGÄNGER</div>
                  <div className="text-lg font-black tracking-tight">시뮬라</div>
                  <p className="mt-0.5 text-[10.5px] leading-snug text-white/50">
                    이목구비가 없는 액체 거울. 습관을 흡수할수록 표면이 선명해지고, 끝내 당신이 됩니다.
                  </p>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2">
              <span className="block rounded-full border border-white/25 bg-black/85 px-3 py-1 font-mono text-[13px] font-black tracking-widest text-white backdrop-blur">
                VS
              </span>
            </div>
            <div className="mt-2 text-center font-mono text-[9px] text-white/25">
              ↑ 게임 내 실시간 렌더링 · 관절 IK · 셀 셰이딩
            </div>
          </div>
        </div>

        {/* 메커니즘 */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MECH.map((m) => (
            <div key={m.k} className={`rounded-lg border bg-gradient-to-b p-4 ${m.c}`}>
              <div className="font-mono text-[10px] tracking-[0.25em] opacity-80">{m.k}</div>
              <div className="mt-1 text-lg font-bold text-white">{m.t}</div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-white/60">{m.d}</p>
            </div>
          ))}
        </div>

        {/* 게임 모드 */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ['MODE 01', 'Mirror Battle', '내 습관을 학습한 AI와 싸우는 메인 모드', '◉', '#38f2ff'],
            ['MODE 02', 'Ghost Upload', '접속하지 않아도 내 AI가 대신 싸웁니다', '☁', '#b478ff'],
            ['MODE 03', 'AI vs AI League', '조작 없이 내 AI를 리그에 출전시킵니다', '⚔', '#ff9a3c'],
            ['MODE 04', 'Habit Dungeon', '층마다 하나의 습관을 봉인하는 5층 챌린지', '▲', '#fb7185'],
          ] as const).map(([tag, t, d, ic, c]) => (
            <div key={t} className="relative overflow-hidden rounded-lg border p-3"
              style={{ borderColor: `${c}33`, background: `${c}0d` }}>
              <div className="pointer-events-none absolute -right-2 -top-3 select-none text-[54px] leading-none opacity-[0.09]">{ic}</div>
              <div className="relative">
                <div className="font-mono text-[9px] tracking-[0.3em]" style={{ color: c }}>{tag}</div>
                <div className="mt-0.5 text-[15px] font-black text-white">{t}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-white/45">{d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* SIMULA 진화 단계 */}
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-mono text-[10px] tracking-[0.25em] text-white/40">SIMULA EVOLUTION · 적도 성장합니다</h3>
            <span className="font-mono text-[9px] text-white/25">6단계 · 누적 학습량으로 진화</span>
          </div>
          <div className="mt-3 grid gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
            {STAGES.map((s) => (
              <div
                key={s.lv}
                className="relative overflow-hidden rounded-md border p-2.5"
                style={{ borderColor: `${s.color}35`, background: `${s.color}0c` }}
              >
                <div className="flex items-center gap-1.5">
                  <span style={{ color: s.color }}>{s.icon}</span>
                  <span className="font-mono text-[9px] tracking-widest text-white/35">LV.{s.lv}</span>
                </div>
                <div className="mt-0.5 text-[13px] font-black" style={{ color: s.color }}>{s.kr}</div>
                <div className="mt-0.5 text-[10.5px] leading-snug text-white/45">{s.summary}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-md border border-white/20 bg-white/[0.05] px-4 py-2.5">
            <div className="font-mono text-[9px] tracking-[0.25em] text-white/30">FINAL STAGE · Lv.6 배신자</div>
            <div className="mt-0.5 text-[15px] font-black tracking-tight text-white">
              “SIMULA는 이제 당신을 모방하지 않습니다. <span className="text-rose-300">당신을 공략합니다.</span>”
            </div>
          </div>
        </div>

        {/* 전투 타입 */}
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-mono text-[10px] tracking-[0.25em] text-white/40">COMBAT DNA · 당신은 어떤 타입입니까?</h3>
            <span className="font-mono text-[9px] text-white/25">9개 지표 · 8개 전투 타입</span>
          </div>
          <div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(ARCHETYPE_META) as Archetype[]).map((k) => {
              const m = ARCHETYPE_META[k];
              return (
                <div
                  key={k}
                  className="rounded-md border p-2.5 transition hover:brightness-125"
                  style={{ borderColor: `${m.color}30`, background: `${m.color}0c` }}
                >
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: m.color }}>{m.icon}</span>
                    <span className="text-[12px] font-black tracking-tight" style={{ color: m.color }}>
                      {k.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="mt-0.5 font-mono text-[9px] text-white/35">{m.kr} · {m.tagline}</div>
                  <div className="mt-1 text-[10.5px] leading-snug text-white/45">{m.weak}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-9">
            {['공격성', '방어성', '반복성', '위험 감수', '잡기 의존도', '점프 의존도', '압박 지속력', '카운터 성향', '거리 유지'].map((s) => (
              <div key={s} className="rounded border border-white/10 bg-black/30 px-1.5 py-1 text-center font-mono text-[9px] text-white/45">
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* 5대 핵심 시스템 */}
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-mono text-[10px] tracking-[0.25em] text-white/40">CORE SYSTEMS · 이 게임을 이루는 5가지</h3>
            <span className="font-mono text-[9px] text-white/25">전부 실제 데이터로 작동합니다</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {([
              ['01', '패배 원인 분석', '문장화', '수치가 아니라 인과 사슬로 왜 졌는지 설명합니다.', '#fb7185', '⌗'],
              ['02', 'Habit Break', '훈련 모드', '습관을 봉인한 채 이겨야 하는 제약 미션과 5층 던전.', '#7dffc2', '▲'],
              ['03', 'Combat DNA', '타입 시스템', '9지표 · 8타입. 내 플레이가 곧 파이터의 정체성.', '#38f2ff', '◈'],
              ['04', 'AI 성장 단계', '6단계 진화', '관찰자에서 배신자까지, 적도 함께 자랍니다.', '#ff9a3c', '✖'],
              ['05', '예측당한 순간', '전투 연출', '읽힌 순간 시간이 멈춥니다. 이 게임의 중독성.', '#ff4fa3', '⚡'],
            ] as const).map(([n, t, s, d, c, ic]) => (
              <div key={n} className="relative overflow-hidden rounded-md border p-3"
                style={{ borderColor: `${c}30`, background: `${c}0c` }}>
                <div className="pointer-events-none absolute -right-1 -top-2 select-none text-[44px] leading-none opacity-[0.1]">{ic}</div>
                <div className="relative">
                  <div className="font-mono text-[9px] tracking-[0.3em]" style={{ color: c }}>{n}</div>
                  <div className="mt-0.5 text-[13.5px] font-black leading-tight text-white">{t}</div>
                  <div className="font-mono text-[9px]" style={{ color: `${c}bb` }}>{s}</div>
                  <div className="mt-1 text-[10.5px] leading-snug text-white/45">{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* READ MOMENT */}
        <div className="relative overflow-hidden rounded-lg border border-rose-400/30 bg-gradient-to-r from-rose-600/[0.14] to-transparent p-5">
          <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background:repeating-linear-gradient(0deg,transparent_0_2px,#fff_2px_3px)]" />
          <div className="relative grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="font-mono text-[10px] tracking-[0.3em] text-rose-300/80">THE CORE FEELING</div>
              <h3 className="mt-1 text-[clamp(1.3rem,4.5vw,1.9rem)] font-black leading-tight tracking-tight text-white">
                “아, 방금 읽혔다.”
              </h3>
              <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/60">
                맞아서 체력이 깎이는 것은 재미가 아닙니다. 이 게임의 중독성은{' '}
                <b className="text-rose-200">AI가 나를 읽어낸 그 순간</b>에 있습니다.
                예측이 적중하면 화면이 느려지고, 당신의 캐릭터에 락온 조준선이 그려지며,
                SIMULA가 당신의 손버릇을 이름으로 부릅니다.
              </p>
            </div>
            <div className="shrink-0 rounded-lg border border-rose-400/35 bg-black/60 px-6 py-4 text-center">
              <div className="font-mono text-[clamp(1.6rem,6vw,2.4rem)] font-black leading-none tracking-tighter text-white">
                PREDICTED
              </div>
              <div className="mt-1 text-[14px] font-black text-rose-300">당신은 또 점프했습니다.</div>
              <div className="mt-0.5 font-mono text-[9.5px] text-white/40">
                SIMULA predicted your JUMP · ×7
              </div>
            </div>
          </div>
        </div>

        {/* 수익 모델 */}
        <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-cyan-300/25 bg-gradient-to-r from-cyan-500/[0.08] to-transparent p-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="font-mono text-[10px] tracking-[0.25em] text-cyan-300/80">BASE GAME · STEAM</div>
                <div className="mt-0.5 text-lg font-black text-white">단일 유료 구매 — 전 모드 포함</div>
              </div>
              <div className="font-mono text-3xl font-black text-white">$12.99</div>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-white/55">
              무료 게임이 아닙니다. 본편 하나로 Mirror Battle · Ghost Upload · AI League · Habit Dungeon ·
              Combat DNA · SIMULA 6단계 진화가 모두 포함됩니다. 추가 판매는 확장과 외형에만 한정됩니다.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['AI 성격 팩', '추가 스테이지', 'AI 리포트 확장팩', '시즌 패스', '스킨 / HUD 테마', '프로필 카드'].map((s) => (
                <span key={s} className="rounded border border-white/12 bg-black/30 px-1.5 py-0.5 font-mono text-[9px] text-white/45">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/[0.06] p-4">
            <div className="flex items-center gap-2">
              <span className="text-emerald-300">✓</span>
              <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-emerald-300">NO PAY-TO-WIN</span>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/65">
              데미지, 프레임 데이터, AI 학습 속도, 매칭 보정에 영향을 주는 상품은 <b className="text-white">존재하지 않습니다.</b>
            </p>
            <div className="mt-2 space-y-1 font-mono text-[10.5px]">
              <div className="text-rose-300/70">✕ 능력치 강화 · 학습 가속 · 습관 자동 교정</div>
              <div className="text-cyan-300/70">○ 외형 · 아레나 · 분석 도구 · 저장 슬롯</div>
            </div>
          </div>
        </div>

        {/* 조작 + 공략 */}
        <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <h3 className="font-mono text-[10px] tracking-[0.25em] text-white/40">CONTROLS · 키보드 / 터치 모두 지원</h3>
            <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {KEYS.map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <kbd className="min-w-[62px] rounded border border-white/20 bg-black/50 px-2 py-1 text-center font-mono text-[10px] text-cyan-200">{k}</kbd>
                  <span className="text-[12px] text-white/60">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
            <h3 className="font-mono text-[10px] tracking-[0.25em] text-emerald-300/70">SURVIVAL PROTOCOL · 공략</h3>
            <ul className="mt-3 space-y-1.5 text-[12.5px] leading-relaxed text-white/65">
              <li>▸ <b className="text-rose-300">HABIT BREAK MISSION</b>: “점프 5회 이하로 승리”, “같은 콤보 3회 반복 금지”처럼 <b className="text-white">습관을 쓰지 않고 이기는</b> 제약 미션이 있습니다.</li>
              <li>▸ <b className="text-white">캔슬 콤보</b>: 기술이 히트/가드되면 18F 캔슬 창이 열립니다. 통상기 → 필살기 → 초필살기로 연결하세요.</li>
              <li>▸ <b className="text-white">가위바위보 삼각형</b>: 잡기 &gt; 가드 &gt; 타격 &gt; 잡기. 강 상단은 하단 가드를 뚫고, 하단 쓸기는 상단 가드를 뚫습니다.</li>
              <li>▸ <b className="text-emerald-300">예측 실패</b>를 유도하면 시뮬라가 동기화 오류(DESYNC)로 경직되고 노이즈 게이지가 크게 찹니다.</li>
              <li>▸ 게이지 100%에서 <b className="text-emerald-300">노이즈 버스트(O)</b>는 시뮬라가 수집한 학습 데이터를 물리적으로 파괴합니다.</li>
              <li>▸ 패널의 <b className="text-white">예측불가능성</b> 수치를 70% 이상으로 유지하세요. 리듬이 일정하면 반드시 읽힙니다.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
