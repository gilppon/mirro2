import { STAGES, stageOf, stageProgress } from '../game/evolution';

// ── 전투 중 레벨업 컷인 ────────────────────────────
export function LevelUpCinematic({
  lv, kr, en, color, icon, quote, summary, flash,
}: {
  lv: number; kr: string; en: string; color: string; icon: string;
  quote: string; summary: string; flash: number;
}) {
  const a = Math.min(1, flash / 40);
  const isFinal = lv === 6;
  return (
    <div
      className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
      style={{ opacity: a }}
    >
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="absolute inset-x-0 h-[46%] bg-gradient-to-b from-transparent to-black/90"
        style={{ top: 0 }}
      />
      <div className="relative w-full px-6 text-center">
        <div
          className="mx-auto mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] tracking-[0.35em]"
          style={{ borderColor: `${color}77`, color, background: `${color}14` }}
        >
          <span className="animate-pulse">●</span> SIMULA EVOLVED
        </div>
        <div className="flex items-center justify-center gap-3">
          <span className="text-[clamp(2rem,7vw,3.6rem)] leading-none" style={{ color }}>{icon}</span>
          <div className="text-left">
            <div className="font-mono text-[11px] tracking-[0.3em] text-white/45">LV.{lv}</div>
            <div
              className="text-[clamp(1.8rem,7vw,3.4rem)] font-black leading-none tracking-tighter"
              style={{ color, textShadow: `0 0 34px ${color}88` }}
            >
              {kr}
            </div>
            <div className="font-mono text-[11px] tracking-[0.25em] text-white/40">{en}</div>
          </div>
        </div>
        <div className="mx-auto mt-3 max-w-lg">
          <div
            className={`rounded-md border px-4 py-2.5 ${isFinal ? 'animate-pulse' : ''}`}
            style={{ borderColor: `${color}55`, background: 'rgba(0,0,0,.6)' }}
          >
            <div className={`${isFinal ? 'text-[15px]' : 'text-[13.5px]'} font-bold leading-snug text-white`}>
              “{quote}”
            </div>
            <div className="mt-1 font-mono text-[10px] text-white/45">{summary}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── HUD 배지 ──────────────────────────────────────
export function StageBadge({
  lv, kr, color, icon, ratio, remain, nextKr,
}: {
  lv: number; kr: string; color: string; icon: string;
  ratio: number; remain: number; nextKr: string | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-1.5 rounded-sm border px-2 py-0.5"
        style={{ borderColor: `${color}66`, background: `${color}16` }}
      >
        <span className="text-[11px]" style={{ color }}>{icon}</span>
        <span className="font-mono text-[10px] font-black tracking-widest" style={{ color }}>
          LV.{lv} {kr}
        </span>
      </div>
      <div className="hidden items-center gap-1.5 sm:flex">
        <div className="h-1 w-20 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${ratio * 100}%`, background: color }} />
        </div>
        <span className="font-mono text-[9px] text-white/30">
          {nextKr ? `${nextKr}까지 ${Math.ceil(remain)}` : 'MAX'}
        </span>
      </div>
    </div>
  );
}

// ── 진화 트랙 (LAB / 타이틀) ───────────────────────
export function EvolutionTrack({ xp, compact }: { xp: number; compact?: boolean }) {
  const cur = stageOf(xp);
  const prog = stageProgress(xp);
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 px-3 py-2">
        <span className="font-mono text-[10px] tracking-[0.25em] text-white/40">SIMULA EVOLUTION</span>
        <span className="font-mono text-[9px] text-white/30">
          XP {Math.round(xp)}
          {prog.next ? ` · ${prog.next.kr}까지 ${Math.ceil(prog.remain)}` : ' · MAX'}
        </span>
      </div>

      {/* 진행 바 */}
      <div className="px-3 pt-3">
        <div className="relative h-1.5 rounded-full bg-white/[0.07]">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
            style={{
              width: `${((cur.lv - 1) / 5 + (prog.ratio / 5)) * 100}%`,
              background: `linear-gradient(90deg, #6c7794, ${cur.color})`,
              boxShadow: `0 0 12px ${cur.color}66`,
            }}
          />
          {STAGES.map((s, i) => (
            <span
              key={s.lv}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 rounded-[2px] border"
              style={{
                left: `calc(${(i / 5) * 100}% - 5px)`,
                borderColor: xp >= s.need ? s.color : 'rgba(255,255,255,.2)',
                background: xp >= s.need ? s.color : '#0a0e1a',
                boxShadow: xp >= s.need ? `0 0 10px ${s.color}99` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* 단계 리스트 */}
      <div className={`grid gap-1.5 p-3 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {STAGES.map((s) => {
          const reached = xp >= s.need;
          const active = s.lv === cur.lv;
          return (
            <div
              key={s.lv}
              className="relative overflow-hidden rounded-md border p-2.5 transition"
              style={{
                borderColor: active ? `${s.color}88` : reached ? `${s.color}33` : 'rgba(255,255,255,.07)',
                background: active ? `${s.color}12` : reached ? `${s.color}07` : 'rgba(255,255,255,.015)',
                opacity: reached ? 1 : 0.45,
              }}
            >
              {active && (
                <span className="absolute right-2 top-2 animate-pulse rounded-sm px-1.5 py-0.5 font-mono text-[8px] font-black tracking-widest" style={{ background: `${s.color}25`, color: s.color }}>
                  NOW
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-[13px]" style={{ color: reached ? s.color : '#64748b' }}>{s.icon}</span>
                <span className="font-mono text-[9px] tracking-widest text-white/35">LV.{s.lv}</span>
                <span className="text-[13px] font-black" style={{ color: reached ? s.color : '#94a3b8' }}>{s.kr}</span>
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-white/50">{s.summary}</div>
              {reached && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {s.abilities.map((ab) => (
                    <span key={ab} className="rounded border px-1 py-0.5 font-mono text-[8.5px]" style={{ borderColor: `${s.color}35`, color: `${s.color}cc` }}>
                      {ab}
                    </span>
                  ))}
                </div>
              )}
              {!reached && (
                <div className="mt-1.5 font-mono text-[9px] text-white/25">잠금 · XP {s.need} 필요</div>
              )}
            </div>
          );
        })}
      </div>

      {/* 최종 단계 예고 */}
      {cur.lv < 6 && (
        <div className="border-t border-white/10 bg-black/40 px-3 py-2">
          <div className="font-mono text-[9px] tracking-[0.2em] text-white/25">FINAL STAGE</div>
          <div className="text-[12px] text-white/45">
            <b className="text-white/70">Lv.6 배신자</b> — SIMULA는 이제 당신을 모방하지 않습니다. 당신을 공략합니다.
          </div>
        </div>
      )}
    </div>
  );
}
