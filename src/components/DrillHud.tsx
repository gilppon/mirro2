import { KR } from '../game/analysis';
import type { Drill } from '../game/analysis';

interface Props {
  drill: Drill;
  progress: number;
  fails: number;
  done: boolean;
  onQuit: () => void;
}

export default function DrillHud({ drill, progress, fails, done, onQuit }: Props) {
  const pct = Math.min(100, (progress / drill.target) * 100);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-3">
      <div className="pointer-events-auto mx-auto max-w-xl rounded-lg border border-emerald-400/35 bg-black/80 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[9px] tracking-[0.25em] text-emerald-300/80">HABIT CORRECTION</div>
            <div className="truncate text-[13px] font-bold text-white">{drill.title}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-mono text-[9px] text-white/35">진행</div>
              <div className="font-mono text-sm font-black text-emerald-300">{progress}/{drill.target}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[9px] text-white/35">습관 발동</div>
              <div className="font-mono text-sm font-black text-rose-400">{fails}</div>
            </div>
            <button
              onClick={onQuit}
              className="rounded border border-white/20 px-2 py-1 font-mono text-[9px] tracking-widest text-white/50 transition hover:bg-white/10"
            >
              종료
            </button>
          </div>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300 transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {drill.banned.map((b) => (
            <span key={b} className="rounded border border-rose-400/40 bg-rose-500/10 px-1.5 py-0.5 font-mono text-[9px] text-rose-200">
              봉인 {KR(b)}
            </span>
          ))}
          {(drill.required ?? []).map((b) => (
            <span key={b} className="rounded border border-cyan-400/30 bg-cyan-400/10 px-1.5 py-0.5 font-mono text-[9px] text-cyan-200">
              요구 {KR(b)}
            </span>
          ))}
          {done && (
            <span className="animate-pulse rounded border border-emerald-300/60 bg-emerald-400/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-100">
              교정 완료 — 습관이 갱신되었습니다
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
