import { useMemo } from 'react';
import {
  analyze, conclude, drillFor, fixHintFor, habitIndex,
  type AnalysisBlock,
} from '../game/analysis';
import {
  ARCHETYPE_META, archetypeOf, archetypeTraits, computeDNA, type RawProfile,
} from '../game/dna';
import { recommendMission, type Mission } from '../game/missions';

interface Props {
  raw: RawProfile;
  accuracy: number;          // SIMULA 예측 적중률
  lost: boolean;
  breakdown?: { label: string; v: number; color: string }[];
  cause?: { headline: string; chain: string[]; tag: string; color: string };
  onDrill: (target: string) => void;
  onMission: (m: Mission) => void;
  onRetry: () => void;
  onLab: () => void;
  compact?: boolean;
}

const SEV: Record<AnalysisBlock['severity'], { c: string; bg: string; label: string }> = {
  critical: { c: '#fb7185', bg: 'rgba(251,113,133,.08)', label: 'CRITICAL' },
  warn: { c: '#fbbf24', bg: 'rgba(251,191,36,.07)', label: 'WARNING' },
  info: { c: '#67e8f9', bg: 'rgba(103,232,249,.06)', label: 'NOTICE' },
};

export default function SimulaAnalysis({
  raw, accuracy, lost, breakdown, cause, onDrill, onMission, onRetry, onLab,
}: Props) {
  const blocks = useMemo(() => analyze(raw), [raw]);
  const verdict = useMemo(() => conclude(blocks, raw), [blocks, raw]);
  const hIndex = useMemo(() => habitIndex(blocks, accuracy), [blocks, accuracy]);
  const primary = blocks[0];
  const drill = primary ? drillFor(primary.fixTarget) : null;
  const mission = useMemo(() => (primary ? recommendMission(primary.fixTarget) : null), [primary]);
  const dna = useMemo(() => computeDNA(raw), [raw]);
  const arch = useMemo(() => archetypeOf(dna), [dna]);
  const aMeta = ARCHETYPE_META[arch.type];
  const traits = useMemo(() => archetypeTraits(arch.type, dna, raw), [arch.type, dna, raw]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 p-3 backdrop-blur-md">
      <div className="mx-auto my-4 w-full max-w-3xl overflow-hidden rounded-xl border border-white/15 bg-[#070a14] shadow-[0_0_70px_rgba(0,0,0,.9)]">
        {/* 헤더 */}
        <div className={`relative overflow-hidden px-6 py-5 ${lost ? 'bg-gradient-to-r from-fuchsia-600/25' : 'bg-gradient-to-r from-cyan-500/20'} to-transparent`}>
          <div className="pointer-events-none absolute inset-0 opacity-20 [background:repeating-linear-gradient(0deg,transparent_0_2px,rgba(0,0,0,.8)_2px_3px)]" />
          <div className="relative">
            <div className="font-mono text-[10px] tracking-[0.3em] text-white/40">SIMULA의 분석</div>
            <h2 className={`mt-1 text-[26px] font-black leading-tight tracking-tight md:text-3xl ${lost ? 'text-fuchsia-300' : 'text-cyan-200'}`}>
              {lost ? '당신의 습관에게 패배' : '습관 탈출 성공'}
            </h2>
            <p className="mt-1.5 font-mono text-[11px] text-white/45">
              당신이 진 상대는 SIMULA가 아니라, SIMULA가 복사한 당신입니다.
            </p>
          </div>
        </div>

        {/* 전투 타입 */}
        <div
          className="relative overflow-hidden border-b border-white/10 px-6 py-4"
          style={{ background: `linear-gradient(100deg, ${aMeta.color}1f, transparent 70%)` }}
        >
          <div className="pointer-events-none absolute -right-4 -top-6 select-none text-[100px] leading-none opacity-[0.08]">
            {aMeta.icon}
          </div>
          <div className="relative">
            <div className="font-mono text-[10px] tracking-[0.25em] text-white/40">당신의 전투 타입</div>
            <div className="flex flex-wrap items-end gap-x-3">
              <h3 className="text-[clamp(1.5rem,5vw,2.1rem)] font-black leading-none tracking-tighter" style={{ color: aMeta.color }}>
                {aMeta.icon} {arch.type.replace(/_/g, ' ')}
              </h3>
              <span className="font-mono text-lg font-black text-white">{arch.score}%</span>
              <span className="font-mono text-[10px] text-white/35">
                보조 {ARCHETYPE_META[arch.runnerUp].kr} {arch.runnerScore}%
              </span>
            </div>
            <div className="mt-0.5 text-[12px] text-white/55">{aMeta.kr} · {aMeta.tagline}</div>
            <ul className="mt-2 space-y-0.5">
              {traits.map((t) => (
                <li key={t} className="flex gap-1.5 text-[12.5px] leading-snug text-white/70">
                  <span style={{ color: aMeta.color }}>▸</span><span>{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 rounded-md border border-rose-400/25 bg-rose-500/[0.07] px-3 py-1.5">
              <span className="font-mono text-[9px] tracking-[0.2em] text-rose-300/70">SIMULA가 노리는 지점</span>
              <div className="text-[12px] leading-snug text-white/65">{aMeta.weak}</div>
            </div>
          </div>
        </div>

        {/* 습관 지수 */}
        <div className="flex items-center gap-4 border-b border-white/10 px-6 py-4">
          <div className="relative h-[76px] w-[76px] shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="9" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={hIndex > 66 ? '#fb7185' : hIndex > 38 ? '#fbbf24' : '#7dffc2'}
                strokeWidth="9" strokeLinecap="round"
                strokeDasharray={`${(hIndex / 100) * 264} 264`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-xl font-black text-white">{hIndex}</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] tracking-[0.2em] text-white/40">HABIT INDEX · 습관 지수</div>
            <div className="text-[13px] leading-relaxed text-white/70">
              {hIndex > 66
                ? '당신의 입력은 거의 완전히 읽히고 있습니다. 근육 기억이 곧 패배 원인입니다.'
                : hIndex > 38
                  ? '몇 가지 상황에서 선택이 고정되어 있습니다. 그 지점만 고치면 크게 달라집니다.'
                  : '입력의 예측 가능성이 낮습니다. 좋은 상태입니다.'}
            </div>
            <div className="mt-1 font-mono text-[10px] text-white/35">
              SIMULA 예측 적중률 {Math.round(accuracy * 100)}% · 수집 표본 {raw.totalActs}
            </div>
          </div>
        </div>

        {/* 패배 원인 + 피해 분해 */}
        {(cause || (breakdown && breakdown.length > 0)) && (
          <div className="border-b border-white/10 px-5 py-4">
            {cause && (
              <div className="rounded-lg border px-4 py-3" style={{ borderColor: `${cause.color}44`, background: `${cause.color}0c` }}>
                <div className="flex items-center gap-2">
                  <span className="rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-black tracking-widest"
                    style={{ background: `${cause.color}26`, color: cause.color }}>{cause.tag}</span>
                  <span className="font-mono text-[9.5px] tracking-[0.2em] text-white/35">패배 원인</span>
                </div>
                <div className="mt-1.5 text-[14.5px] font-black leading-snug text-white">{cause.headline}</div>
                <div className="mt-1.5 space-y-0.5">
                  {cause.chain.map((c, i) => (
                    <div key={c} className="flex items-start gap-2">
                      <span className="mt-[3px] font-mono text-[9px]" style={{ color: cause.color }}>
                        {i + 1 < cause.chain.length ? '┃' : '┗'}
                      </span>
                      <span className="text-[11.5px] leading-snug text-white/55">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {breakdown && breakdown.length > 0 && (
              <div className="mt-3">
                <div className="font-mono text-[10px] tracking-[0.2em] text-white/35">피해 분해 · 어디서 맞았는가</div>
                <div className="mt-1.5 space-y-1.5">
                  {breakdown.map((b) => (
                    <div key={b.label} className="flex items-center gap-2">
                      <span className="w-24 shrink-0 text-[11.5px] text-white/60">{b.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full transition-[width] duration-700"
                          style={{ width: `${b.v * 100}%`, background: b.color, boxShadow: `0 0 8px ${b.color}70` }} />
                      </div>
                      <span className="w-9 text-right font-mono text-[11px] font-bold" style={{ color: b.color }}>
                        {Math.round(b.v * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 분석 블록 */}
        <div className="space-y-2 px-5 py-4">
          {blocks.length === 0 && (
            <div className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-5 text-center text-[13px] text-white/45">
              아직 뚜렷한 손버릇이 잡히지 않았습니다. 더 싸워주세요.
            </div>
          )}
          {blocks.map((b, i) => {
            const s = SEV[b.severity];
            return (
              <div key={b.id} className="overflow-hidden rounded-lg border" style={{ borderColor: `${s.c}44`, background: s.bg }}>
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 font-mono text-[10px] font-black" style={{ color: s.c }}>{String(i + 1).padStart(2, '0')}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-widest" style={{ background: `${s.c}22`, color: s.c }}>
                        {s.label}
                      </span>
                      {b.stat && (
                        <span className="font-mono text-[9px] text-white/35">{b.stat.label} {b.stat.value}</span>
                      )}
                    </div>
                    <div className="mt-1.5 text-[14.5px] font-bold leading-snug text-white">{b.headline}</div>
                    {b.detail.map((d) => (
                      <div key={d} className="mt-0.5 text-[12px] leading-relaxed text-white/50">{d}</div>
                    ))}
                    <div className="mt-2 rounded-md border border-white/10 bg-black/40 px-3 py-2">
                      <div className="font-mono text-[9px] tracking-[0.2em] text-fuchsia-300/70">AI 대응</div>
                      <div className="mt-0.5 font-mono text-[11.5px] text-white/70">{b.counter}</div>
                    </div>
                    <div className="mt-1.5 text-[11.5px] text-emerald-300/70">→ {fixHintFor(b.fixTarget)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 결론 */}
        <div className="mx-5 mb-4 rounded-lg border border-white/15 bg-gradient-to-r from-white/[0.06] to-transparent px-5 py-4">
          <div className="font-mono text-[10px] tracking-[0.25em] text-white/35">결론</div>
          <div className="mt-1 text-[19px] font-black leading-snug tracking-tight text-white md:text-[21px]">
            “{verdict}”
          </div>
        </div>

        {/* HABIT BREAK MISSION 제안 */}
        {mission && (
          <div className="mx-5 mb-3 overflow-hidden rounded-lg border" style={{ borderColor: `${mission.color}55`, background: `${mission.color}0f` }}>
            <div className="px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] tracking-[0.25em]" style={{ color: mission.color }}>
                  HABIT BREAK MISSION
                </span>
                <span className="animate-pulse rounded-sm bg-rose-500/25 px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-widest text-rose-200">
                  추천
                </span>
              </div>
              <div className="mt-1 text-lg font-black text-white">{mission.title}</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-white/60">{mission.desc}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[10px]">
                {mission.rules.filter((r) => r.kind !== 'requireWin').map((r) => (
                  <span key={r.label} className="rounded border px-2 py-1" style={{ borderColor: `${mission.color}44`, color: mission.color }}>
                    {r.label}
                  </span>
                ))}
                <span className="rounded border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-emerald-200">
                  보상 · {mission.reward}
                </span>
              </div>
            </div>
            <button
              onClick={() => onMission(mission)}
              className="w-full border-t py-3 font-mono text-xs font-bold tracking-[0.2em] text-white transition hover:brightness-125 active:scale-[0.99]"
              style={{ borderColor: `${mission.color}33`, background: `${mission.color}26` }}
            >
              ▸ 미션 도전 — 습관을 쓰지 않고 이긴다
            </button>
          </div>
        )}

        {/* 교정 훈련 제안 */}
        {drill && (
          <div className="mx-5 mb-4 overflow-hidden rounded-lg border border-emerald-400/30 bg-emerald-400/[0.06]">
            <div className="px-5 py-3">
              <div className="font-mono text-[10px] tracking-[0.25em] text-emerald-300/80">HABIT CORRECTION DRILL</div>
              <div className="mt-1 text-lg font-black text-white">{drill.title}</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-white/60">{drill.desc}</p>
              <div className="mt-2 flex flex-wrap gap-2 font-mono text-[10px]">
                <span className="rounded border border-white/15 bg-black/40 px-2 py-1 text-white/60">목표 · {drill.goal} ×{drill.target}</span>
                {drill.banned.length > 0 && (
                  <span className="rounded border border-rose-400/30 bg-rose-400/10 px-2 py-1 text-rose-200">
                    봉인 · {drill.banned.join(', ')}
                  </span>
                )}
                <span className="rounded border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-emerald-200">
                  보상 · {drill.reward}
                </span>
              </div>
            </div>
            <button
              onClick={() => onDrill(drill.id)}
              className="w-full border-t border-emerald-400/20 bg-emerald-400/15 py-3 font-mono text-xs font-bold tracking-[0.2em] text-emerald-100 transition hover:bg-emerald-400/25 active:scale-[0.99]"
            >
              ▸ 습관 교정 훈련 시작
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-white/10 px-5 py-4">
          <button onClick={onRetry} className="flex-1 rounded-md border border-cyan-300/50 bg-cyan-400/15 py-2.5 font-mono text-xs font-bold tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-400/25 active:scale-95">
            다시 싸운다
          </button>
          <button onClick={onLab} className="flex-1 rounded-md border border-white/20 py-2.5 font-mono text-xs tracking-[0.2em] text-white/60 transition hover:bg-white/10 active:scale-95">
            AI LAB
          </button>
        </div>
      </div>
    </div>
  );
}
