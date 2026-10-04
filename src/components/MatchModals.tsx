import type { useMirrorGame } from "../hooks/useMirrorGame";

type MissionSnap = NonNullable<ReturnType<typeof useMirrorGame>["snapshot"]["mission"]>;
type Snap = ReturnType<typeof useMirrorGame>["snapshot"];

export function MissionResult({ snap, onRetry, onLab, onFree }: {
  snap: MissionSnap;
  onRetry: () => void; onLab: () => void; onFree: () => void;
}) {
  const ok = snap.cleared;
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/88 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-xl border bg-[#070a14]" style={{ borderColor: ok ? 'rgba(125,255,194,.4)' : 'rgba(251,113,133,.4)' }}>
        <div className={`px-5 py-4 ${ok ? 'bg-gradient-to-r from-emerald-500/20' : 'bg-gradient-to-r from-rose-600/20'} to-transparent`}>
          <div className="font-mono text-[10px] tracking-[0.3em] text-white/40">HABIT BREAK MISSION</div>
          <div className={`mt-1 text-3xl font-black tracking-tight ${ok ? 'text-emerald-300' : 'text-rose-300'}`}>
            {ok ? 'MISSION CLEAR' : 'MISSION FAILED'}
          </div>
          <div className="mt-0.5 text-[13px] text-white/60">{snap.title}</div>
        </div>
        <div className="space-y-1.5 px-5 py-4">
          {snap.rules.map((r) => (
            <div key={r.label} className="flex items-center justify-between rounded border border-white/10 bg-white/[0.03] px-3 py-1.5">
              <span className="text-[12px] text-white/70">{r.label}</span>
              <span className={`font-mono text-[11px] font-bold ${r.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                {r.ok ? `✓ ${r.detail}` : '✕ 위반'}
              </span>
            </div>
          ))}
          {!ok && snap.failReason && (
            <div className="rounded border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
              {snap.failReason}
            </div>
          )}
          {ok && (
            <div className="rounded border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[12.5px] leading-relaxed text-emerald-100">
              습관을 쓰지 않고 이겼습니다. 해당 손버릇의 가중치가 실제로 낮아졌으며,
              당신의 AI 파이터 성향에도 즉시 반영되었습니다.
            </div>
          )}
        </div>
        <div className="flex gap-2 border-t border-white/10 px-5 py-4">
          <button onClick={onRetry} className="flex-1 rounded-md border border-white/25 bg-white/10 py-2.5 font-mono text-xs font-bold tracking-widest text-white/85 transition hover:bg-white/20">
            재도전
          </button>
          <button onClick={onFree} className="flex-1 rounded-md border border-cyan-300/40 bg-cyan-400/10 py-2.5 font-mono text-xs tracking-widest text-cyan-200 transition hover:bg-cyan-400/20">
            자유 훈련
          </button>
          <button onClick={onLab} className="flex-1 rounded-md border border-white/15 py-2.5 font-mono text-xs tracking-widest text-white/55 transition hover:bg-white/10">
            AI LAB
          </button>
        </div>
      </div>
    </div>
  );
}

export function UploadFlash({ name, v }: { name: string; v: number }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="text-center">
        <div className="font-mono text-[11px] tracking-[0.4em] text-violet-300/80">GHOST UPLOAD COMPLETE</div>
        <div className="mt-2 text-6xl">☁</div>
        <div className="mt-1 bg-gradient-to-r from-violet-200 via-white to-fuchsia-300 bg-clip-text text-4xl font-black tracking-tighter text-transparent">
          {name}
        </div>
        <div className="mt-2 font-mono text-sm text-white/60">
          v{v} · 이제 당신이 없어도 싸웁니다
        </div>
        <div className="mt-1 font-mono text-[11px] text-emerald-300/70">
          전 세계 유저가 당신의 AI에 도전할 수 있습니다
        </div>
      </div>
    </div>
  );
}

export function GenerationFlash({ name }: { name: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="text-center">
        <div className="font-mono text-[11px] tracking-[0.4em] text-cyan-300/80">NEURAL CLONE COMPLETE</div>
        <div className="mt-2 animate-pulse bg-gradient-to-r from-cyan-200 via-white to-fuchsia-300 bg-clip-text text-6xl font-black tracking-tighter text-transparent">
          {name}
        </div>
        <div className="mt-2 font-mono text-sm text-white/60">생성 완료 — 이제 당신 대신 싸웁니다</div>
      </div>
    </div>
  );
}

export function AiMatchResult({ s, onAgain, onLab }: {
  s: Snap; onAgain: () => void; onLab: () => void;
}) {
  const win = s.wins[0] > s.wins[1];
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#070a14] p-5 text-center">
        <div className="font-mono text-[10px] tracking-[0.3em] text-white/40">ASYNC MATCH RESULT</div>
        <div className={`mt-1 text-3xl font-black ${win ? 'text-cyan-200' : 'text-fuchsia-300'}`}>
          {win ? `${s.names[0]} 승리` : `${s.names[1]} 승리`}
        </div>
        <div className="mt-1 font-mono text-lg text-white/70">{s.wins[0]} : {s.wins[1]}</div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-white/55">
          {win
            ? '당신의 전투 DNA가 통했습니다. 이 성향을 더 강화하려면 같은 플레이를 반복 학습시키세요.'
            : '상대 스타일에 카운터당했습니다. LAB에서 약점 진단을 확인하고 새로운 플레이를 보여주세요.'}
        </p>
        <div className="mt-4 flex gap-2">
          <button onClick={onAgain} className="flex-1 rounded-md border border-white/20 py-2.5 font-mono text-xs tracking-widest text-white/70 transition hover:bg-white/10">
            리매치
          </button>
          <button onClick={onLab} className="flex-1 rounded-md border border-cyan-300/50 bg-cyan-400/15 py-2.5 font-mono text-xs font-bold tracking-widest text-cyan-100 transition hover:bg-cyan-400/25">
            ▸ AI LAB
          </button>
        </div>
      </div>
    </div>
  );
}
