import { useMemo } from 'react';
import DnaRadar from './DnaRadar';
import {
  ARCHETYPE_META, CORE_KEYS, DNA_LABELS, archetypeOf, archetypeTraits,
  type DNA, type RawProfile,
} from '../game/dna';

interface Props {
  dna: DNA;
  raw: RawProfile;
  name?: string;
  generation?: number;
  power?: number;
  compare?: DNA;
  compareName?: string;
}

function Row({ label, v, hint, accent }: { label: string; v: number; hint: string; accent: string }) {
  const c = v > 74 ? '#fb7185' : v > 48 ? accent : '#7dffc2';
  return (
    <div className="group/row">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] text-white/70">{label}</span>
        <span className="font-mono text-[12px] font-black tabular-nums" style={{ color: c }}>
          {String(v).padStart(2, '0')}
        </span>
      </div>
      <div className="mt-0.5 h-[5px] overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${v}%`, background: c, boxShadow: `0 0 8px ${c}70` }}
        />
      </div>
      <div className="mt-0.5 hidden font-mono text-[9px] text-white/25 group-hover/row:block">{hint}</div>
    </div>
  );
}

export default function CombatDnaCard({
  dna, raw, name, generation, power, compare, compareName,
}: Props) {
  const arch = useMemo(() => archetypeOf(dna), [dna]);
  const meta = ARCHETYPE_META[arch.type];
  const runnerMeta = ARCHETYPE_META[arch.runnerUp];
  const traits = useMemo(() => archetypeTraits(arch.type, dna, raw), [arch.type, dna, raw]);
  const coreLabels = DNA_LABELS.filter((l) => CORE_KEYS.includes(l.key));

  return (
    <div
      className="overflow-hidden rounded-xl border bg-[#070a14]"
      style={{ borderColor: `${meta.color}44`, boxShadow: `0 0 40px ${meta.color}12` }}
    >
      {/* 타입 헤더 */}
      <div className="relative overflow-hidden px-5 py-4" style={{ background: `linear-gradient(100deg, ${meta.color}22, transparent 70%)` }}>
        <div className="pointer-events-none absolute -right-6 -top-6 select-none text-[120px] leading-none opacity-[0.07]">
          {meta.icon}
        </div>
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.3em] text-white/40">COMBAT DNA</span>
            {name && (
              <span className="rounded-sm border border-white/15 px-1.5 py-0.5 font-mono text-[9px] text-white/55">
                {name}{generation ? ` · GEN ${generation}` : ''}
              </span>
            )}
            {power !== undefined && (
              <span className="rounded-sm border border-white/15 px-1.5 py-0.5 font-mono text-[9px] text-white/55">
                POWER {power}
              </span>
            )}
          </div>
          <div className="mt-1.5 font-mono text-[10px] tracking-[0.2em] text-white/45">당신의 전투 타입</div>
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <h3
              className="text-[clamp(1.6rem,5vw,2.4rem)] font-black leading-none tracking-tighter"
              style={{ color: meta.color, textShadow: `0 0 26px ${meta.color}55` }}
            >
              {meta.icon} {arch.type.replace(/_/g, ' ')}
            </h3>
            <span className="font-mono text-xl font-black text-white">{arch.score}%</span>
          </div>
          <div className="mt-0.5 text-[12.5px] text-white/60">
            {meta.kr} · <span className="italic">{meta.tagline}</span>
          </div>
          <div className="mt-1 font-mono text-[10px] text-white/30">
            보조 성향 {runnerMeta.kr} {arch.runnerScore}%
          </div>
        </div>
      </div>

      {/* 특징 */}
      <div className="border-t border-white/10 px-5 py-3">
        <div className="font-mono text-[10px] tracking-[0.2em] text-white/35">특징</div>
        <ul className="mt-1.5 space-y-1">
          {traits.map((t) => (
            <li key={t} className="flex gap-2 text-[12.5px] leading-relaxed text-white/75">
              <span style={{ color: meta.color }}>▸</span>
              <span>{t}</span>
            </li>
          ))}
          {traits.length === 0 && (
            <li className="text-[12px] text-white/30">표본이 더 필요합니다.</li>
          )}
        </ul>
      </div>

      {/* 강점 / 약점 */}
      <div className="grid gap-2 border-t border-white/10 px-5 py-3 sm:grid-cols-2">
        <div className="rounded-md border border-emerald-400/20 bg-emerald-400/[0.05] px-3 py-2">
          <div className="font-mono text-[9px] tracking-[0.2em] text-emerald-300/70">STRENGTH</div>
          <div className="mt-0.5 text-[12px] leading-snug text-white/65">{meta.strong}</div>
        </div>
        <div className="rounded-md border border-rose-400/25 bg-rose-500/[0.06] px-3 py-2">
          <div className="font-mono text-[9px] tracking-[0.2em] text-rose-300/70">AI가 노리는 약점</div>
          <div className="mt-0.5 text-[12px] leading-snug text-white/65">{meta.weak}</div>
        </div>
      </div>

      {/* 지표 + 레이더 */}
      <div className="grid gap-4 border-t border-white/10 px-5 py-4 sm:grid-cols-[1fr_200px]">
        <div className="grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
          {coreLabels.map((l) => (
            <Row key={l.key} label={l.kr} v={dna[l.key]} hint={l.hint} accent={meta.color} />
          ))}
        </div>
        <div className="relative mx-auto w-full max-w-[200px]">
          <DnaRadar dna={dna} compare={compare} color={meta.color} size={200} />
          {compare && compareName && (
            <div className="mt-1 text-center font-mono text-[9px] text-fuchsia-300/60">
              ─ ─ {compareName}
            </div>
          )}
        </div>
      </div>

      {/* 보조 지표 */}
      <div className="grid grid-cols-3 gap-1.5 border-t border-white/10 px-5 py-3 sm:grid-cols-6">
        {DNA_LABELS.filter((l) => !CORE_KEYS.includes(l.key)).map((l) => {
          const v = dna[l.key] ?? 0;
          const hot = l.key === 'panic' || l.key === 'frameTrap';
          return (
            <div
              key={l.key}
              className="rounded-md border px-2 py-1.5"
              style={{
                borderColor: hot && v > 60 ? 'rgba(251,113,133,.35)' : 'rgba(255,255,255,.08)',
                background: hot && v > 60 ? 'rgba(251,113,133,.07)' : 'rgba(0,0,0,.25)',
              }}
            >
              <div className="truncate font-mono text-[8.5px] text-white/35">{l.kr}</div>
              <div className="font-mono text-[15px] font-black tabular-nums text-white/85">{v}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
