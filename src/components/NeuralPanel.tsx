import { ACTION_COLOR, ACTION_KR, DIST_BUCKETS, type BrainSnapshot } from '../game/brain';

function Section({ title, tag, children }: { title: string; tag?: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-white/10 px-3 py-2.5">
      <div className="mb-1.5 flex items-baseline justify-between">
        <h3 className="font-mono text-[10px] font-bold tracking-[0.18em] text-white/45">{title}</h3>
        {tag && <span className="font-mono text-[9px] text-white/30">{tag}</span>}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: string }) {
  return (
    <div className="rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1.5">
      <div className="font-mono text-[9px] tracking-wider text-white/40">{label}</div>
      <div className="font-mono text-sm font-bold leading-tight" style={{ color: accent ?? '#dbeafe' }}>
        {value}
        {unit && <span className="ml-0.5 text-[9px] font-normal text-white/40">{unit}</span>}
      </div>
    </div>
  );
}

import { topOf } from '../game/analysis';
import type { RawProfile } from '../game/dna';

export default function NeuralPanel({ b, round, raw }: { b: BrainSnapshot; round: number; raw?: RawProfile }) {
  const pressure = raw ? topOf(raw.pressureActs, 3) : null;
  const wake = raw ? topOf(raw.wakeupActs, 2) : null;
  const conf = Math.round(b.confidence * 100);
  const predColor = b.prediction ? ACTION_COLOR[b.prediction] : '#6b7280';
  const maxSpacing = Math.max(1, ...b.spacing);
  const maxGaze = Math.max(1, ...b.gaze);

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-[#070a14]/90 backdrop-blur">
      {/* 진화 단계 헤더 */}
      <div className="relative overflow-hidden px-3 py-3" style={{ background: `linear-gradient(120deg, ${b.stageColor}1c, transparent 70%)` }}>
        <div className="pointer-events-none absolute -right-2 -top-3 select-none text-[64px] leading-none opacity-[0.09]">
          {b.stageIcon}
        </div>
        <div className="relative flex items-start justify-between">
          <div className="min-w-0">
            <div className="font-mono text-[10px] tracking-[0.25em] text-white/40">SIMULA EVOLUTION</div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-[11px] font-black tracking-widest text-white/50">LV.{b.stageLv}</span>
              <span className="text-xl font-black tracking-tight" style={{ color: b.stageColor }}>{b.stageKr}</span>
            </div>
            <div className="truncate font-mono text-[9px] text-white/35">{b.stageEn} · {b.stageSummary}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-mono text-[9px] text-white/35">XP</div>
            <div className="font-mono text-lg font-black text-white">{b.xp}</div>
          </div>
        </div>
        <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${b.stageRatio * 100}%`, background: b.stageColor, boxShadow: `0 0 10px ${b.stageColor}` }} />
        </div>
        <div className="relative mt-1 flex justify-between font-mono text-[9px] text-white/30">
          <span>흡수율 {Math.floor(b.absorption * 100)}% · 샘플 {b.samples}</span>
          <span>{b.nextStageKr ? `다음: ${b.nextStageKr}` : '최종 단계'}</span>
        </div>
      </div>

      <div className="border-t border-white/10 px-3 py-2">
        <div className="rounded-md border px-2.5 py-1.5" style={{ borderColor: `${b.stageColor}33`, background: `${b.stageColor}0c` }}>
          <div className="text-[11.5px] leading-snug text-white/75">“{b.stageQuote}”</div>
        </div>
      </div>

      {/* 흡수율 */}
      <div className="relative hidden px-3 py-3">
        <div className="relative flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] tracking-[0.25em] text-fuchsia-300/80">NEURAL ABSORPTION</div>
          </div>
        </div>
        <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-rose-500 transition-[width] duration-300"
            style={{ width: `${b.absorption * 100}%` }}
          />
        </div>
        <div className="relative mt-1 flex justify-between font-mono text-[9px] text-white/30">
          <span>샘플 {b.samples}</span>
          <span>{round === 1 ? '수집 중…' : round === 2 ? '패턴 적용 중' : '선행 복사 활성'}</span>
        </div>
      </div>

      {/* 예측 */}
      <Section title="NEXT INPUT PREDICTION" tag={`신뢰도 ${conf}%`}>
        <div
          className="relative flex items-center gap-3 overflow-hidden rounded-md border px-3 py-2.5"
          style={{ borderColor: `${predColor}55`, background: `${predColor}12` }}
        >
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[9px] tracking-widest text-white/40">당신의 다음 행동</div>
            <div className="truncate text-xl font-black tracking-tight" style={{ color: predColor }}>
              {b.prediction ? ACTION_KR[b.prediction] : '―'}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[9px] text-white/40">적중률</div>
            <div className="font-mono text-lg font-bold text-white">{Math.round(b.accuracy * 100)}%</div>
          </div>
          {b.mirroring && (
            <div className="absolute inset-0 animate-pulse border-2 border-fuchsia-400/70" />
          )}
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full transition-[width] duration-200" style={{ width: `${conf}%`, background: predColor }} />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[9px] text-white/35">
          <span>예측 성공 {b.hits} / 실패 {b.misses}</span>
          <span className={b.entropy > 0.72 ? 'text-emerald-300' : 'text-rose-300'}>
            예측불가능성 {Math.round(b.entropy * 100)}%
          </span>
        </div>
      </Section>

      {/* 상황별 손버릇 */}
      {(pressure || wake) && (
        <Section title="SITUATIONAL HABIT" tag="상황별 반응">
          <div className="space-y-1.5">
            {pressure && (
              <div className="rounded-md border border-rose-400/30 bg-rose-500/[0.07] px-3 py-2">
                <div className="font-mono text-[9px] tracking-widest text-rose-300/70">압박받을 때</div>
                <div className="mt-0.5 text-[13px] font-bold text-white">
                  {pressure.kr} <span className="font-mono text-rose-300">{Math.round(pressure.p * 100)}%</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-rose-400" style={{ width: `${pressure.p * 100}%` }} />
                </div>
              </div>
            )}
            {wake && (
              <div className="rounded-md border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2">
                <div className="font-mono text-[9px] tracking-widest text-amber-300/70">기상 직후</div>
                <div className="mt-0.5 text-[13px] font-bold text-white">
                  {wake.kr} <span className="font-mono text-amber-300">{Math.round(wake.p * 100)}%</span>
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* 입력 지표 */}
      <Section title="INPUT BIOMETRICS" tag="실시간">
        <div className="grid grid-cols-3 gap-1.5">
          <Stat label="평균 입력간격" value={b.avgInterval.toFixed(0)} unit="ms" accent="#67e8f9" />
          <Stat label="최속 입력" value={b.fastestInterval ? b.fastestInterval.toFixed(0) : '—'} unit="ms" accent="#a5f3fc" />
          <Stat label="APM" value={b.apm.toFixed(0)} accent="#fde68a" />
          <Stat label="반응속도" value={b.reaction.toFixed(0)} unit="ms" accent="#f0abfc" />
          <Stat label="연타 간격" value={b.tapSpeed ? b.tapSpeed.toFixed(0) : '—'} unit="ms" accent="#fca5a5" />
          <Stat label="시선 선행" value={`${Math.round(b.gazeLead * 100)}`} unit="%" accent="#93c5fd" />
        </div>
      </Section>

      {/* 습관 패턴 */}
      <Section title="HABIT n-GRAM" tag="흡수된 콤보 습관">
        <div className="space-y-1">
          {b.topPatterns.length === 0 && (
            <div className="py-2 text-center font-mono text-[10px] text-white/25">패턴 수집 대기 중…</div>
          )}
          {b.topPatterns.map((p) => (
            <div key={p.seq} className="flex items-center gap-2 rounded-sm bg-white/[0.03] px-2 py-1">
              <span className="flex-1 truncate font-mono text-[10px] text-white/70">{p.seq}</span>
              <span className="font-mono text-[10px] text-white/30">▶</span>
              <span className="font-mono text-[10px] font-bold" style={{ color: ACTION_COLOR[p.next] }}>
                {ACTION_KR[p.next]}
              </span>
              <span className="w-8 text-right font-mono text-[10px] text-white/45">{Math.round(p.p * 100)}%</span>
            </div>
          ))}
        </div>
      </Section>

      {/* 행동 분포 */}
      <Section title="ACTION BIAS" tag="행동 편향">
        <div className="space-y-1">
          {b.actionDist.map((d) => (
            <div key={d.a} className="flex items-center gap-2">
              <span className="w-14 shrink-0 font-mono text-[10px] text-white/55">{ACTION_KR[d.a]}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${d.p * 100}%`, background: ACTION_COLOR[d.a], boxShadow: `0 0 8px ${ACTION_COLOR[d.a]}80` }}
                />
              </div>
              <span className="w-7 text-right font-mono text-[9px] text-white/35">{Math.round(d.p * 100)}%</span>
            </div>
          ))}
          {b.actionDist.length === 0 && <div className="py-1 font-mono text-[10px] text-white/25">—</div>}
        </div>
      </Section>

      {/* 거리 + 시선 */}
      <Section title="SPACING / GAZE" tag={b.focus}>
        <div className="flex gap-3">
          <div className="flex flex-1 items-end gap-1">
            {b.spacing.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-12 w-full items-end rounded-sm bg-white/[0.05]">
                  <div
                    className="w-full rounded-sm bg-gradient-to-t from-cyan-500/80 to-cyan-200 transition-[height] duration-300"
                    style={{ height: `${(v / maxSpacing) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-[7px] text-white/35">{DIST_BUCKETS[i]}</span>
              </div>
            ))}
          </div>
          <div className="w-24 shrink-0">
            <div className="grid grid-cols-3 grid-rows-2 gap-0.5">
              {b.gaze.map((v, i) => (
                <div
                  key={i}
                  className="h-5 rounded-[2px] border border-white/10"
                  style={{ background: `rgba(217,70,239,${0.08 + (v / maxGaze) * 0.8})` }}
                />
              ))}
            </div>
            <div className="mt-1 font-mono text-[8px] text-white/30">시선 히트맵 · 이동속도 {b.gazeSpeed.toFixed(2)}</div>
          </div>
        </div>
      </Section>

      {/* 로그 */}
      <div className="mt-auto border-t border-white/10 bg-black/40 px-3 py-2">
        <div className="h-16 space-y-0.5 overflow-hidden font-mono text-[9px] leading-relaxed">
          {b.lastLog.length === 0 && <div className="text-white/25">&gt; 신경망 대기 중…</div>}
          {b.lastLog.map((l, i) => (
            <div key={`${l}-${i}`} style={{ opacity: 1 - i * 0.18 }} className="truncate text-emerald-300/80">
              &gt; {l}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
