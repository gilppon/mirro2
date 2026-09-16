import { MISSIONS, recommendMission, type Mission } from '../game/missions';

interface Props {
  onStart: (m: Mission) => void;
  recommendTarget?: string;
  cleared: string[];
  compact?: boolean;
}

const TIER_LABEL: Record<number, string> = { 1: 'EASY', 2: 'HARD', 3: 'EXTREME' };

export default function MissionBoard({ onStart, recommendTarget, cleared, compact }: Props) {
  const rec = recommendTarget ? recommendMission(recommendTarget) : null;

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div>
          <span className="font-mono text-[10px] tracking-[0.25em] text-rose-300/80">HABIT BREAK MISSION</span>
          <span className="ml-2 font-mono text-[9px] text-white/25">이기는 게 아니라, 습관을 쓰지 않고 이기는 것</span>
        </div>
        <span className="font-mono text-[9px] text-white/30">{cleared.length} / {MISSIONS.length} 클리어</span>
      </div>

      <div className={`grid gap-1.5 p-2 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
        {MISSIONS.map((m) => {
          const done = cleared.includes(m.id);
          const isRec = rec?.id === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onStart(m)}
              className="group relative overflow-hidden rounded-md border p-3 text-left transition hover:brightness-125 active:scale-[0.98]"
              style={{
                borderColor: done ? 'rgba(125,255,194,.4)' : `${m.color}33`,
                background: done ? 'rgba(125,255,194,.05)' : `${m.color}0d`,
              }}
            >
              {isRec && (
                <span className="absolute right-2 top-2 animate-pulse rounded-sm bg-rose-500/25 px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-widest text-rose-200">
                  추천
                </span>
              )}
              {done && (
                <span className="absolute right-2 top-2 rounded-sm bg-emerald-400/20 px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-widest text-emerald-200">
                  CLEARED
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[8.5px] tracking-widest" style={{ color: m.color }}>{m.sub}</span>
                <span className="rounded-sm border border-white/10 px-1 font-mono text-[8px] text-white/35">
                  {TIER_LABEL[m.tier]}
                </span>
              </div>
              <div className="mt-1 pr-12 text-[13px] font-bold leading-snug text-white">{m.title}</div>
              <p className="mt-1 text-[11px] leading-snug text-white/45">{m.desc}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {m.rules.filter((r) => r.kind !== 'requireWin').map((r) => (
                  <span
                    key={r.label}
                    className="rounded border px-1.5 py-0.5 font-mono text-[9px]"
                    style={{ borderColor: `${m.color}40`, color: m.color }}
                  >
                    {r.label}
                  </span>
                ))}
              </div>
              <div className="mt-1.5 font-mono text-[9px] text-emerald-300/60">보상 · {m.reward}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
