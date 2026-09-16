import { useCallback } from 'react';
import type { BtnId } from '../hooks/useMirrorGame';

interface Props {
  press: (b: BtnId) => void;
  release: (b: BtnId) => void;
  burstReady: boolean;
  superReady: boolean;
}

function Btn({
  id, label, hint, color, press, release, big, disabled,
}: {
  id: BtnId; label: string; hint?: string; color: string;
  press: (b: BtnId) => void; release: (b: BtnId) => void; big?: boolean; disabled?: boolean;
}) {
  const down = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (disabled) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    press(id);
  }, [disabled, id, press]);
  const up = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    release(id);
  }, [id, release]);

  return (
    <button
      type="button"
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerLeave={up}
      onContextMenu={(e) => e.preventDefault()}
      disabled={disabled}
      className={`relative flex select-none flex-col items-center justify-center rounded-full border font-mono font-bold backdrop-blur-sm transition-all active:scale-90 active:brightness-200 disabled:opacity-25 ${
        big ? 'h-16 w-16 text-sm' : 'h-12 w-12 text-xs'
      }`}
      style={{
        borderColor: `${color}55`,
        background: `radial-gradient(circle at 50% 30%, ${color}2e, ${color}0d)`,
        color,
        boxShadow: `inset 0 0 16px ${color}1a, 0 0 0 1px ${color}12`,
      }}
    >
      <span className="leading-none">{label}</span>
      {hint && <span className="mt-0.5 text-[8px] font-normal opacity-50">{hint}</span>}
    </button>
  );
}

export default function TouchPad({ press, release, burstReady, superReady }: Props) {
  return (
    <div className="flex w-full touch-none select-none items-end justify-between gap-2">
      {/* ── 좌측: 이동 */}
      <div className="grid grid-cols-3 grid-rows-2 gap-1">
        <div />
        <Btn id="jump" label="▲" hint="W" color="#8fb4ff" press={press} release={release} />
        <div />
        <Btn id="left" label="◀" hint="A" color="#9aa7c7" press={press} release={release} />
        <Btn id="down" label="▼" hint="S" color="#9aa7c7" press={press} release={release} />
        <Btn id="right" label="▶" hint="D" color="#9aa7c7" press={press} release={release} />
      </div>

      {/* ── 중앙: 대시 */}
      <div className="hidden flex-col gap-1 pb-2 sm:flex">
        <Btn id="dashB" label="≪" hint="Q" color="#ff6b6b" press={press} release={release} />
        <Btn id="dashF" label="≫" hint="E" color="#ff9a3c" press={press} release={release} />
      </div>

      {/* ── 우측: 공격 + 필살기 */}
      <div className="flex items-end gap-1.5">
        <div className="grid grid-cols-2 gap-1">
          <Btn id="light" label="약" hint="J" color="#38f2ff" press={press} release={release} />
          <Btn id="heavy" label="강" hint="K" color="#ff4fa3" press={press} release={release} />
          <Btn id="low" label="하단" hint="L" color="#ffd447" press={press} release={release} />
          <Btn id="grab" label="잡기" hint="I" color="#b478ff" press={press} release={release} />
        </div>

        <Btn id="block" label="가드" hint="SHIFT" color="#7dffc2" press={press} release={release} big />

        <div className="grid grid-cols-3 gap-1">
          <Btn id="wave" label="파" hint="1" color="#5ee7ff" press={press} release={release} />
          <Btn id="upper" label="어" hint="2" color="#ff7a45" press={press} release={release} />
          <Btn id="slide" label="슬" hint="3" color="#c0ff4f" press={press} release={release} />
        </div>

        <div className="flex flex-col gap-1">
          <div className={superReady ? 'animate-pulse' : ''}>
            <Btn id="super" label="초필" hint="R" color="#ffffff" press={press} release={release} disabled={!superReady} />
          </div>
          <div className={burstReady ? 'animate-pulse' : ''}>
            <Btn id="burst" label="버스트" hint="O" color="#7dffc2" press={press} release={release} disabled={!burstReady} />
          </div>
        </div>
      </div>
    </div>
  );
}
