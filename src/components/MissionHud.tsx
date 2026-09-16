import type { Mission } from '../game/missions';

export interface MissionSnap {
  id: string;
  title: string;
  color: string;
  failed: boolean;
  cleared: boolean;
  failReason: string;
  rules: { label: string; detail: string; ok: boolean; kind: string; count: number; limit?: number }[];
}

interface Props {
  snap: MissionSnap;
  mission: Mission | null;
  onQuit: () => void;
  onRetry: () => void;
}

export default function MissionHud({ snap, onQuit, onRetry }: Props) {
  const status = snap.failed ? 'FAILED' : snap.cleared ? 'CLEARED' : 'ACTIVE';
  const sc = snap.failed ? '#fb7185' : snap.cleared ? '#7dffc2' : snap.color;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[96px] z-20 flex justify-center px-3">
      <div
        className="pointer-events-auto w-full max-w-lg rounded-lg border bg-black/80 px-3.5 py-2.5 backdrop-blur-md transition-colors"
        style={{ borderColor: `${sc}66`, boxShadow: `0 0 24px ${sc}22` }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-black tracking-widest ${snap.failed ? 'animate-pulse' : ''}`}
              style={{ background: `${sc}22`, color: sc }}
            >
              {status}
            </span>
            <span className="truncate text-[12.5px] font-bold text-white">{snap.title}</span>
          </div>
          <div className="flex shrink-0 gap-1">
            {(snap.failed || snap.cleared) && (
              <button
                onClick={onRetry}
                className="rounded border border-white/25 bg-white/10 px-2 py-0.5 font-mono text-[9px] tracking-widest text-white/80 transition hover:bg-white/20"
              >
                재도전
              </button>
            )}
            <button
              onClick={onQuit}
              className="rounded border border-white/15 px-2 py-0.5 font-mono text-[9px] tracking-widest text-white/45 transition hover:bg-white/10"
            >
              포기
            </button>
          </div>
        </div>

        {/* 규칙 라인 */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {snap.rules.map((r) => {
            const limited = r.kind === 'countLimit' && r.limit !== undefined;
            const ratio = limited ? Math.min(1, r.count / (r.limit || 1)) : 0;
            const c = !r.ok ? '#fb7185' : limited && ratio >= 1 ? '#fbbf24' : '#9fe8ff';
            return (
              <div
                key={r.label}
                className="flex items-center gap-1.5 rounded border px-2 py-1"
                style={{ borderColor: `${c}44`, background: `${c}0e` }}
              >
                <span className="font-mono text-[9.5px]" style={{ color: c }}>
                  {r.ok ? '●' : '✕'}
                </span>
                <span className="text-[10.5px] text-white/75">{r.label}</span>
                <span className="font-mono text-[10px] font-bold" style={{ color: c }}>{r.detail}</span>
                {limited && (
                  <span className="ml-0.5 flex gap-[2px]">
                    {Array.from({ length: Math.min(6, r.limit || 0) }).map((_, i) => (
                      <span
                        key={i}
                        className="h-2.5 w-[3px] rounded-sm"
                        style={{ background: i < r.count ? c : 'rgba(255,255,255,.15)' }}
                      />
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {snap.failed && (
          <div className="mt-1.5 rounded border border-rose-400/35 bg-rose-500/10 px-2 py-1 font-mono text-[10px] text-rose-200">
            ✕ {snap.failReason}
          </div>
        )}
        {snap.cleared && (
          <div className="mt-1.5 rounded border border-emerald-400/40 bg-emerald-400/10 px-2 py-1 font-mono text-[10px] text-emerald-200">
            ✓ 습관을 쓰지 않고 이겼습니다 — 근육 기억이 갱신됩니다
          </div>
        )}
      </div>
    </div>
  );
}
