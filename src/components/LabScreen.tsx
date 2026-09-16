import { useMemo } from 'react';
import DnaRadar from './DnaRadar';
import CombatDnaCard from './CombatDnaCard';
import { EvolutionTrack } from './EvolutionUi';
import {
  ARCHETYPE_META, archetypeOf, computeDNA, diagnose,
  type RawProfile,
} from '../game/dna';
import { RIVALS, TRAIN_TARGET, type AiFighter, type MatchResult, type OfflineReport } from '../game/meta';
import { leaguePool } from '../game/ghost';
import { DRILLS, analyze, conclude, drillFor, habitIndex } from '../game/analysis';
import MissionBoard from './MissionBoard';
import type { Mission } from '../game/missions';

interface Props {
  raw: RawProfile;
  ai: AiFighter | null;
  generation: number;
  report: OfflineReport | null;
  lastMatch: MatchResult | null;
  onTrain: () => void;
  onGenerate: () => void;
  onFight: (opp: AiFighter) => void;
  onMirror: () => void;
  onSimulate: (opp: AiFighter) => void;
  onReset: () => void;
  onDrill: (id: string) => void;
  onMission: (m: Mission) => void;
  clearedMissions: string[];
  accuracy: number;
  simulaXp: number;
  modeHub?: React.ReactNode;
  tracker?: React.ReactNode;
  replayVault?: React.ReactNode;
  onShare?: () => void;
}

export default function LabScreen(p: Props) {
  const { raw, ai, generation } = p;
  const progress = Math.min(1, raw.totalActs / TRAIN_TARGET);
  const liveDna = useMemo(() => computeDNA(raw), [raw]);
  const liveArch = useMemo(() => archetypeOf(liveDna), [liveDna]);
  const shown = ai?.dna ?? liveDna;
  const arch = ai ? { type: ai.archetype, score: ai.archScore } : liveArch;
  const meta = ARCHETYPE_META[arch.type];
  const insights = useMemo(() => diagnose(shown, raw), [shown, raw]);
  const blocks = useMemo(() => analyze(raw), [raw]);
  const verdict = useMemo(() => conclude(blocks, raw), [blocks, raw]);
  const hIndex = useMemo(() => habitIndex(blocks, p.accuracy), [blocks, p.accuracy]);
  const ranked = useMemo(() => {
    const all: AiFighter[] = ai ? [...leaguePool(ai), ai] : [...RIVALS];
    return all.sort((x, y) => y.rating - x.rating);
  }, [ai]);

  return (
    <div className="min-h-screen w-full bg-[#04060d] pb-10 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(217,70,239,.14),transparent_55%),radial-gradient(circle_at_0%_60%,rgba(34,211,238,.12),transparent_55%)]" />

      <div className="relative mx-auto max-w-6xl px-4 pt-6">
        {/* 헤더 */}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-cyan-300/70">AI FIGHTER LAB</div>
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">
              당신의 플레이가 곧 파이터가 됩니다
            </h1>
            <p className="mt-1 font-mono text-[11px] text-white/40">
              플레이 → 학습 → AI 복제 → AI 대전 → 약점 발견 → 재훈련 → 진화
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={p.onTrain} className="rounded-md border border-cyan-300/50 bg-cyan-400/15 px-5 py-2.5 font-mono text-xs font-bold tracking-[0.15em] text-cyan-100 transition hover:bg-cyan-400/25 active:scale-95">
              ▸ 훈련 (직접 플레이)
            </button>
            <button onClick={p.onReset} className="rounded-md border border-white/15 px-3 py-2.5 font-mono text-[10px] tracking-widest text-white/40 transition hover:bg-white/10">
              데이터 초기화
            </button>
          </div>
        </div>

        {/* 오프라인 리포트 */}
        {p.report && p.report.challenges > 0 && (
          <div className="mb-4 overflow-hidden rounded-lg border border-fuchsia-400/30 bg-gradient-to-r from-fuchsia-500/10 to-transparent">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
              <div>
                <div className="font-mono text-[10px] tracking-[0.25em] text-fuchsia-300/80">WHILE YOU WERE AWAY</div>
                <div className="text-[15px] font-bold">
                  당신이 없는 동안 <span className="text-fuchsia-300">{ai?.name ?? '내 AI'}</span>가{' '}
                  <span className="text-white">{p.report.challenges}번</span> 도전받았습니다
                </div>
              </div>
              <div className="flex items-center gap-3 font-mono text-sm">
                <span className="text-cyan-300">{p.report.wins}승</span>
                <span className="text-white/25">/</span>
                <span className="text-rose-300">{p.report.losses}패</span>
                <span className={`rounded px-2 py-0.5 text-[11px] ${p.report.ratingDelta >= 0 ? 'bg-cyan-400/15 text-cyan-200' : 'bg-rose-400/15 text-rose-200'}`}>
                  RATING {p.report.ratingDelta >= 0 ? '+' : ''}{p.report.ratingDelta}
                </span>
              </div>
              <div className="font-mono text-[10px] text-white/45">
                새로운 라이벌 {p.report.newRivals.length}명 생성: {p.report.newRivals.join(', ')}
              </div>
            </div>
            {p.report.highlights.length > 0 && (
              <div className="border-t border-white/10 px-4 py-2 font-mono text-[10px] text-white/50">
                {p.report.highlights.map((h) => <div key={h}>▸ {h}</div>)}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          {/* ── 좌: DNA 프로필 */}
          <section className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            {!ai ? (
              <div className="mb-4 rounded-md border border-cyan-400/25 bg-cyan-400/[0.05] p-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-cyan-300/80">TRAINING DATA</span>
                  <span className="font-mono text-xs text-white/60">{raw.totalActs} / {TRAIN_TARGET}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-white/55">
                  {progress >= 1
                    ? '충분한 전투 데이터가 수집되었습니다. AI 파이터를 생성할 수 있습니다.'
                    : `직접 싸워서 습관을 보여주세요. ${Math.ceil((TRAIN_TARGET - raw.totalActs))}개의 행동이 더 필요합니다. (약 ${Math.max(1, Math.ceil((TRAIN_TARGET - raw.totalActs) / 70))}라운드)`}
                </p>
                <button
                  disabled={progress < 1}
                  onClick={p.onGenerate}
                  className="mt-3 w-full rounded-md border border-fuchsia-400/50 bg-fuchsia-500/20 py-2.5 font-mono text-xs font-bold tracking-[0.2em] text-white transition enabled:hover:bg-fuchsia-500/30 disabled:opacity-30 active:scale-95"
                >
                  ▸ AI 파이터 생성
                </button>
              </div>
            ) : (
              <div className="mb-3 flex items-center justify-between rounded-md border px-3 py-2" style={{ borderColor: `${meta.color}44`, background: `${meta.color}10` }}>
                <div>
                  <div className="font-mono text-[10px] tracking-[0.2em] text-white/40">GENERATION {generation}</div>
                  <div className="text-lg font-black" style={{ color: meta.color }}>{ai.name}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-[10px] text-white/40">RATING</div>
                  <div className="text-lg font-black text-white">{ai.rating}</div>
                  <div className="text-[10px] text-white/40">{ai.wins}승 {ai.losses}패</div>
                </div>
              </div>
            )}

            <CombatDnaCard
              dna={shown}
              raw={raw}
              name={ai?.name}
              generation={ai ? generation : undefined}
              power={ai?.power}
            />
            {ai && p.onShare && (
              <button
                onClick={p.onShare}
                className="mt-2 w-full rounded-md border border-fuchsia-400/40 bg-fuchsia-500/12 py-2.5 font-mono text-[11px] font-bold tracking-[0.2em] text-fuchsia-100 transition hover:bg-fuchsia-500/22 active:scale-[0.99]"
              >
                ▣ 전투 프로필 카드 만들기 · SNS 공유
              </button>
            )}

            {/* 손버릇 분석 */}
            <div className="mt-4 overflow-hidden rounded-lg border border-fuchsia-400/25 bg-fuchsia-500/[0.05]">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <span className="font-mono text-[10px] tracking-[0.25em] text-fuchsia-300/80">SIMULA의 분석 · 손버릇</span>
                <span className="font-mono text-[10px] text-white/40">
                  HABIT INDEX <b className="text-white">{hIndex}</b>
                </span>
              </div>
              <div className="space-y-1.5 p-3">
                {blocks.length === 0 && (
                  <div className="py-2 text-center font-mono text-[11px] text-white/30">
                    아직 뚜렷한 손버릇이 잡히지 않았습니다. 더 싸워주세요.
                  </div>
                )}
                {blocks.map((b) => (
                  <div key={b.id} className="rounded-md border border-white/10 bg-black/30 px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-bold leading-snug text-white/90">{b.headline}</div>
                        <div className="mt-0.5 font-mono text-[10.5px] text-fuchsia-300/70">AI 대응: {b.counter}</div>
                      </div>
                      <button
                        onClick={() => p.onDrill(drillFor(b.fixTarget).id)}
                        className="shrink-0 rounded border border-emerald-400/40 bg-emerald-400/10 px-2 py-1 font-mono text-[9px] tracking-wider text-emerald-200 transition hover:bg-emerald-400/25"
                      >
                        교정 훈련
                      </button>
                    </div>
                  </div>
                ))}
                {blocks.length > 0 && (
                  <div className="rounded-md border border-white/15 bg-gradient-to-r from-white/[0.06] to-transparent px-3 py-2.5">
                    <div className="font-mono text-[9px] tracking-[0.2em] text-white/30">결론</div>
                    <div className="mt-0.5 text-[15px] font-black tracking-tight text-white">“{verdict}”</div>
                  </div>
                )}
              </div>
            </div>

            {/* 리플레이 분석 */}
            {p.replayVault && <div className="mt-4">{p.replayVault}</div>}

            {/* SIMULA 진화 단계 */}
            <div className="mt-4">
              <EvolutionTrack xp={p.simulaXp} />
            </div>

            {/* HABIT BREAK MISSION */}
            <div className="mt-4">
              <MissionBoard
                onStart={p.onMission}
                recommendTarget={blocks[0]?.fixTarget}
                cleared={p.clearedMissions}
              />
            </div>

            {/* 교정 드릴 라이브러리 */}
            <div className="mt-4">
              <div className="mb-1.5 font-mono text-[10px] tracking-[0.2em] text-white/40">CORRECTION DRILLS · 습관 교정 훈련</div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {Object.values(DRILLS).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => p.onDrill(d.id)}
                    className="group rounded-md border border-white/10 bg-white/[0.03] p-2.5 text-left transition hover:border-emerald-400/40 hover:bg-emerald-400/[0.07]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] font-bold text-white/85">{d.title}</span>
                      <span className="font-mono text-[9px] text-emerald-300/70">×{d.target}</span>
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/45">{d.desc}</div>
                    {d.banned.length > 0 && (
                      <div className="mt-1 font-mono text-[9px] text-rose-300/60">봉인: {d.banned.join(', ')}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 약점 진단 */}
            <div className="mt-4">
              <div className="mb-1.5 font-mono text-[10px] tracking-[0.2em] text-white/40">DNA 기반 진단 · 재훈련 가이드</div>
              <div className="space-y-1.5">
                {insights.map((i) => (
                  <div
                    key={i.text}
                    className="rounded-md border px-3 py-2"
                    style={{
                      borderColor: i.level === 'warn' ? 'rgba(251,113,133,.3)' : i.level === 'good' ? 'rgba(125,255,194,.3)' : 'rgba(255,255,255,.1)',
                      background: i.level === 'warn' ? 'rgba(251,113,133,.06)' : i.level === 'good' ? 'rgba(125,255,194,.05)' : 'rgba(255,255,255,.02)',
                    }}
                  >
                    <div className="text-[12.5px] font-semibold text-white/85">{i.text}</div>
                    <div className="mt-0.5 text-[11.5px] text-white/45">→ {i.fix}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── 우: 모드 / 랭킹 */}
          <section className="space-y-4">
            {p.tracker}
            {p.modeHub}

            {/* 마지막 AI 대전 결과 */}
            {p.lastMatch && (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="font-mono text-[10px] tracking-[0.2em] text-white/40">LAST AI MATCH</div>
                <div className="mt-1 font-mono text-sm">
                  <span className={p.lastMatch.winner === 'a' ? 'font-bold text-cyan-300' : 'text-white/50'}>{p.lastMatch.a}</span>
                  <span className="mx-2 text-white/40">{p.lastMatch.scoreA} : {p.lastMatch.scoreB}</span>
                  <span className={p.lastMatch.winner === 'b' ? 'font-bold text-fuchsia-300' : 'text-white/50'}>{p.lastMatch.b}</span>
                </div>
                {p.lastMatch.log.slice(1).map((l) => (
                  <div key={l} className="font-mono text-[10px] text-white/35">{l}</div>
                ))}
              </div>
            )}

            {/* 스타일 비교 (공유용 카드) */}
            {ai && (
              <div className="overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent">
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                  <span className="font-mono text-[10px] tracking-[0.25em] text-white/45">STYLE COMPARE</span>
                  <span className="font-mono text-[9px] text-white/25">vs {ranked[0].isPlayer ? ranked[1].name : ranked[0].name}</span>
                </div>
                <div className="grid grid-cols-[1fr_130px_1fr] items-center gap-2 p-3">
                  <div className="text-center">
                    <div className="font-mono text-[10px] text-white/35">당신</div>
                    <div className="text-[13px] font-black leading-tight" style={{ color: meta.color }}>
                      {meta.icon} {ai.archetype.replace(/_/g, ' ')}
                    </div>
                    <div className="font-mono text-2xl font-black text-white">{ai.archScore}%</div>
                  </div>
                  <div className="mx-auto h-[130px] w-[130px]">
                    <DnaRadar
                      dna={ai.dna}
                      compare={(ranked[0].isPlayer ? ranked[1] : ranked[0]).dna}
                      color={meta.color}
                      compareColor="#ff4fa3"
                      size={150}
                      labels={false}
                    />
                  </div>
                  <div className="text-center">
                    <div className="font-mono text-[10px] text-white/35">
                      {(ranked[0].isPlayer ? ranked[1] : ranked[0]).owner}
                    </div>
                    <div className="text-[13px] font-black leading-tight text-fuchsia-300">
                      {ARCHETYPE_META[(ranked[0].isPlayer ? ranked[1] : ranked[0]).archetype].icon}{' '}
                      {(ranked[0].isPlayer ? ranked[1] : ranked[0]).archetype.replace(/_/g, ' ')}
                    </div>
                    <div className="font-mono text-2xl font-black text-white">
                      {(ranked[0].isPlayer ? ranked[1] : ranked[0]).archScore}%
                    </div>
                  </div>
                </div>
                <div className="border-t border-white/10 px-3 py-2 font-mono text-[10px] text-white/35">
                  #MirrorNeuralBrawler · {ai.name} GEN {generation} · {ai.wins}승 {ai.losses}패
                </div>
              </div>
            )}

            {/* 랭킹 */}
            <div className="rounded-lg border border-white/10 bg-white/[0.02]">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <span className="font-mono text-[10px] tracking-[0.25em] text-white/45">GLOBAL AI LADDER</span>
                <span className="font-mono text-[9px] text-white/25">상시 대기 중인 복제본</span>
              </div>
              <div className="max-h-[430px] divide-y divide-white/5 overflow-y-auto">
                {ranked.map((f, i) => {
                  const m = ARCHETYPE_META[f.archetype];
                  return (
                    <div key={f.id} className={`flex items-center gap-2 px-3 py-2 ${f.isPlayer ? 'bg-cyan-400/[0.07]' : ''}`}>
                      <span className="w-5 shrink-0 font-mono text-[11px] text-white/30">{i + 1}</span>
                      <span className="w-5 shrink-0 text-center text-[13px]">{f.flag}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] font-bold" style={{ color: f.isPlayer ? '#67e8f9' : '#e2e8f0' }}>
                          {f.name}
                          {(f.id === 'AI-JUNO' || f.id === 'AI-TIDE') && (
                            <span className="ml-1 rounded-sm bg-emerald-400/20 px-1 py-0.5 font-mono text-[8px] text-emerald-200">친구</span>
                          )}
                        </div>
                        <div className="truncate font-mono text-[9px]" style={{ color: m.color }}>
                          {m.icon} {f.archetype.replace(/_/g, ' ')} {f.archScore}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-[11px] text-white/70">{f.rating}</div>
                        <div className="font-mono text-[9px] text-white/30">PWR {f.power}</div>
                      </div>
                      {!f.isPlayer && (
                        <div className="flex shrink-0 flex-col gap-1">
                          <button
                            disabled={!ai}
                            onClick={() => p.onFight(f)}
                            className="rounded border border-fuchsia-400/40 bg-fuchsia-500/15 px-2 py-1 font-mono text-[9px] tracking-wider text-fuchsia-200 transition enabled:hover:bg-fuchsia-500/30 disabled:opacity-25"
                          >
                            AI 대전
                          </button>
                          <button
                            disabled={!ai}
                            onClick={() => p.onSimulate(f)}
                            className="rounded border border-white/15 px-2 py-1 font-mono text-[9px] tracking-wider text-white/45 transition enabled:hover:bg-white/10 disabled:opacity-25"
                          >
                            즉시 시뮬
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
