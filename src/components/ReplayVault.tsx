import { useMemo, useState } from 'react';
import { ARCHETYPE_META, type Archetype } from '../game/dna';
import { diffReplays, timeline, topActions, type Replay } from '../game/replay';
import { KR } from '../game/analysis';

interface Props {
  replays: Replay[];
  slots: number;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onStore: () => void;
}

function Timeline({ r }: { r: Replay }) {
  const tl = useMemo(() => timeline(r, 48), [r]);
  const max = Math.max(1, ...tl.map((b) => b.act + b.read + b.hit + b.taken));
  return (
    <div className="flex h-14 items-end gap-[1px]">
      {tl.map((b, i) => {
        const total = b.act + b.read + b.hit + b.taken;
        const h = (total / max) * 100;
        return (
          <div key={i} className="flex flex-1 flex-col-reverse" style={{ height: `${Math.max(4, h)}%` }} title={`입력 ${b.act} · 읽힘 ${b.read}`}>
            {b.taken > 0 && <div className="w-full bg-rose-500/80" style={{ height: `${(b.taken / total) * 100}%` }} />}
            {b.hit > 0 && <div className="w-full bg-cyan-400/80" style={{ height: `${(b.hit / total) * 100}%` }} />}
            {b.read > 0 && <div className="w-full bg-fuchsia-400" style={{ height: `${(b.read / total) * 100}%` }} />}
            {b.act > 0 && <div className="w-full bg-white/25" style={{ height: `${(b.act / total) * 100}%` }} />}
          </div>
        );
      })}
    </div>
  );
}

export default function ReplayVault({ replays, slots, onPin, onDelete, onStore }: Props) {
  const [sel, setSel] = useState<string[]>([]);
  const picked = replays.filter((r) => sel.includes(r.id));
  const diff = picked.length === 2 ? diffReplays(picked[1], picked[0]) : null;

  const toggle = (id: string) => {
    setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s.slice(-1), id]);
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <span className="font-mono text-[10px] tracking-[0.25em] text-white/40">REPLAY ANALYSIS</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-white/30">{replays.length} / {slots} 슬롯</span>
          <button onClick={onStore} className="rounded border border-cyan-400/35 bg-cyan-400/10 px-2 py-0.5 font-mono text-[9px] tracking-widest text-cyan-200 transition hover:bg-cyan-400/20">
            + 슬롯 확장
          </button>
        </div>
      </div>

      {replays.length === 0 && (
        <div className="px-3 py-6 text-center font-mono text-[11px] text-white/25">
          아직 저장된 리플레이가 없습니다. 매치를 완료하면 자동 저장됩니다.
        </div>
      )}

      {/* 비교 결과 */}
      {diff && (
        <div className="border-b border-white/10 bg-black/30 px-3 py-2.5">
          <div className="font-mono text-[9.5px] tracking-[0.2em] text-white/35">
            비교 · {new Date(picked[1].at).toLocaleDateString()} → {new Date(picked[0].at).toLocaleDateString()}
          </div>
          <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
            {diff.slice(0, 6).map((d) => {
              const good = (d.key === 'repetition' || d.key === 'panic' || d.key === 'grab' || d.key === 'aerial')
                ? d.delta < 0 : d.delta > 0;
              const c = d.delta === 0 ? '#64748b' : good ? '#7dffc2' : '#fb7185';
              return (
                <div key={d.key} className="flex items-center gap-2 rounded bg-white/[0.03] px-2 py-1">
                  <span className="w-16 shrink-0 text-[11px] text-white/60">{d.kr}</span>
                  <span className="font-mono text-[10px] text-white/35">{d.before}</span>
                  <span className="font-mono text-[10px] text-white/20">→</span>
                  <span className="font-mono text-[11px] font-bold text-white/80">{d.after}</span>
                  <span className="ml-auto font-mono text-[11px] font-black" style={{ color: c }}>
                    {d.delta > 0 ? '+' : ''}{d.delta}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 리스트 */}
      <div className="max-h-[380px] divide-y divide-white/5 overflow-y-auto">
        {replays.map((r) => {
          const on = sel.includes(r.id);
          const m = ARCHETYPE_META[r.archetype as Archetype];
          const tops = topActions(r, 4);
          return (
            <div key={r.id} className={`px-3 py-2.5 transition ${on ? 'bg-cyan-400/[0.07]' : ''}`}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggle(r.id)}
                  className="h-3.5 w-3.5 shrink-0 rounded-sm border transition"
                  style={{ borderColor: on ? '#67e8f9' : 'rgba(255,255,255,.25)', background: on ? '#67e8f9' : 'transparent' }}
                />
                <span className={`font-mono text-[10px] font-black ${r.result === 'win' ? 'text-cyan-300' : 'text-rose-300'}`}>
                  {r.result === 'win' ? 'WIN' : 'LOSE'}
                </span>
                <span className="font-mono text-[10px] text-white/45">{r.score}</span>
                <span className="truncate font-mono text-[9.5px] text-white/30">{r.mode}</span>
                <span className="ml-auto shrink-0 font-mono text-[9px] text-white/25">
                  {new Date(r.at).toLocaleDateString()} {new Date(r.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="mt-1.5"><Timeline r={r} /></div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9.5px]">
                {m && <span style={{ color: m.color }}>{m.icon} {r.archetype.replace(/_/g, ' ')} {r.archScore}%</span>}
                <span className="text-white/30">Lv.{r.stageLv} {r.stageKr}</span>
                <span className="text-rose-300/70">읽힘 {r.reads}</span>
                <span className="text-emerald-300/70">벗어남 {r.breaks}</span>
                <span className="text-amber-300/60">최다연속 {r.worstStreak}</span>
                <span className="text-white/30">피해 {r.dmgDealt.toFixed(0)}/{r.dmgTaken.toFixed(0)}</span>
              </div>

              {r.cause && (
                <div className="mt-1 truncate rounded bg-rose-500/[0.07] px-2 py-1 text-[10.5px] text-rose-200/70">
                  {r.cause}
                </div>
              )}

              <div className="mt-1.5 flex items-center gap-1">
                {tops.map((t) => (
                  <span key={t.a} className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[9px] text-white/45">
                    {KR(t.a)} ×{t.c}
                  </span>
                ))}
                <button onClick={() => onPin(r.id)} className="ml-auto rounded border border-white/15 px-1.5 py-0.5 font-mono text-[9px] text-white/40 transition hover:bg-white/10">
                  {r.pinned ? '📌 고정됨' : '고정'}
                </button>
                <button onClick={() => onDelete(r.id)} className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[9px] text-white/25 transition hover:bg-rose-500/15 hover:text-rose-300">
                  삭제
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {replays.length > 1 && (
        <div className="border-t border-white/10 px-3 py-2 font-mono text-[9.5px] text-white/30">
          두 개를 선택하면 그 사이 습관 변화를 비교합니다. 과거의 나와 지금의 나.
        </div>
      )}
    </div>
  );
}
