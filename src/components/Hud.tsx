import type { GameSnapshot } from '../hooks/useMirrorGame';

function Bar({ v, max, color, right }: { v: number; max: number; color: string; right?: boolean }) {
  const pct = Math.max(0, Math.min(100, (v / max) * 100));
  return (
    <div className={`relative h-5 w-full overflow-hidden border border-white/20 bg-black/60 ${right ? 'skew-x-[8deg]' : 'skew-x-[-8deg]'}`}>
      <div className="absolute inset-0 opacity-30 [background:repeating-linear-gradient(90deg,transparent_0_10px,rgba(255,255,255,.35)_10px_11px)]" />
      <div
        className={`absolute inset-y-0 transition-[width] duration-150 ${right ? 'right-0' : 'left-0'}`}
        style={{ width: `${pct}%`, background: color, boxShadow: `0 0 18px ${color}` }}
      />
    </div>
  );
}

function Meter({ v, color, right }: { v: number; color: string; right?: boolean }) {
  const seg = 4;
  const filled = Math.floor((v / 100) * seg);
  return (
    <div className={`flex gap-1 ${right ? 'flex-row-reverse' : ''}`}>
      {Array.from({ length: seg }).map((_, i) => (
        <div
          key={i}
          className={`h-2 w-8 skew-x-[-20deg] border ${i === 1 || i === 3 ? 'border-white/45' : 'border-white/15'}`}
          style={{
            background: i < filled ? (i >= 2 && filled >= 4 ? '#ffffff' : color) : 'rgba(255,255,255,0.06)',
            boxShadow: i < filled ? `0 0 10px ${color}` : 'none',
          }}
        />
      ))}
    </div>
  );
}

export default function Hud({ s }: { s: GameSnapshot }) {
  const b = s.brain;
  const modeLabel = s.isAiMatch ? 'ASYNC AI MATCH' : `LV.${b.stageLv} ${b.stageKr}`;
  const modeColor = s.isAiMatch ? 'text-white/60' : '';
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 select-none px-3 pt-3 md:px-5 md:pt-4">
      <div className="flex items-start gap-2 md:gap-4">
        {/* 플레이어 */}
        <div className="flex-1">
          <div className="mb-1 flex items-end justify-between">
            <span className="truncate font-mono text-[11px] font-bold tracking-[0.2em] text-cyan-300 md:text-xs">
              {s.isAiMatch ? s.names[0] : 'OPERATOR / 당신'}
            </span>
            <span className="font-mono text-[11px] text-white/60">{Math.ceil(s.pHp)}</span>
          </div>
          <Bar v={s.pHp} max={100} color="linear-gradient(90deg,#0ea5c8,#67e8f9)" />
          <div className="mt-1.5 flex items-center gap-2">
            <Meter v={s.pMeter} color="#7dffc2" />
            <span className="font-mono text-[9px] tracking-widest text-emerald-300/70">NOISE {Math.floor(s.pMeter)}%</span>
          </div>
        </div>

        {/* 중앙 */}
        <div className="flex w-24 shrink-0 flex-col items-center md:w-32">
          <div className="flex items-center gap-1">
            {[0, 1].map((i) => (
              <span key={`w${i}`} className={`h-2 w-2 rotate-45 border ${s.wins[0] > i ? 'border-cyan-300 bg-cyan-300' : 'border-cyan-300/30'}`} />
            ))}
            <span className="mx-1 font-mono text-[10px] text-white/40">R{s.round}</span>
            {[0, 1].map((i) => (
              <span key={`l${i}`} className={`h-2 w-2 rotate-45 border ${s.wins[1] > i ? 'border-fuchsia-400 bg-fuchsia-400' : 'border-fuchsia-400/30'}`} />
            ))}
          </div>
          <div className="font-mono text-3xl font-black leading-none text-white drop-shadow-[0_0_10px_rgba(120,220,255,.6)] md:text-4xl">
            {String(s.timeLeft).padStart(2, '0')}
          </div>
          <div
            className={`font-mono text-[9px] font-bold tracking-[0.15em] ${modeColor} md:text-[10px]`}
            style={s.isAiMatch ? undefined : { color: b.stageColor }}
          >
            {s.isAiMatch ? modeLabel : `${b.stageIcon} ${modeLabel}`}
          </div>
        </div>

        {/* 시뮬라 */}
        <div className="flex-1">
          <div className="mb-1 flex items-end justify-between">
            <span className="font-mono text-[11px] text-white/60">{Math.ceil(s.aHp)}</span>
            <span className="truncate font-mono text-[11px] font-bold tracking-[0.2em] text-fuchsia-300 md:text-xs">
              {s.isAiMatch ? s.names[1] : 'SIMULA / 도플갱어'}
            </span>
          </div>
          <Bar v={s.aHp} max={100} color="linear-gradient(270deg,#d946ef,#fb7185)" right />
          <div className="mt-1.5 flex items-center justify-end gap-2">
            {!s.isAiMatch && (
              <div className="hidden items-center gap-1.5 sm:flex">
                <span className="font-mono text-[9px] text-white/30">
                  {b.nextStageKr ? `${b.nextStageKr} ${Math.ceil(b.stageRemain)}` : 'MAX'}
                </span>
                <div className="h-1 w-16 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${b.stageRatio * 100}%`, background: b.stageColor }} />
                </div>
              </div>
            )}
            <span className="font-mono text-[9px] tracking-widest text-fuchsia-300/70">ABSORB {Math.floor(s.brain.absorption * 100)}%</span>
            <Meter v={s.aMeter} color="#ff4fa3" right />
          </div>
        </div>
      </div>

      {/* 상태 배지 */}
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {s.isAiMatch && (
          <span className="rounded-sm border border-white/25 bg-black/50 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-white/70">
            관전 중 — 당신의 AI가 스스로 싸웁니다
          </span>
        )}
        {!s.isAiMatch && (s.reads > 0 || s.breaks > 0) && (
          <span className="rounded-sm border border-white/15 bg-black/55 px-2 py-0.5 font-mono text-[10px] tracking-widest">
            <span className="text-rose-300">읽힘 {s.reads}</span>
            <span className="mx-1 text-white/20">/</span>
            <span className="text-emerald-300">벗어남 {s.breaks}</span>
          </span>
        )}
        {!s.isAiMatch && s.desync && (
          <span className="animate-pulse rounded-sm border border-emerald-400/60 bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-emerald-300">
            SIMULA DESYNC — 반격 기회
          </span>
        )}
        {s.brain.mirroring && (
          <span className="rounded-sm border border-fuchsia-400/60 bg-fuchsia-500/10 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-fuchsia-300">
            MIRRORING −0.01s
          </span>
        )}
        {s.pMeter >= 50 && s.pMeter < 100 && (
          <span className="rounded-sm border border-emerald-300/50 bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-emerald-200">
            노이즈 버스트 READY [O]
          </span>
        )}
        {s.pMeter >= 100 && (
          <span className="animate-pulse rounded-sm border border-white/70 bg-white/15 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-white">
            초필살기 READY [↓↘→ ↓↘→ + 공격 / R]
          </span>
        )}
      </div>
    </div>
  );
}
