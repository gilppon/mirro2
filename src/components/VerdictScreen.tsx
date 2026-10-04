import { useEffect, useState } from 'react';

// 타자기 효과
function useTypeIn(text: string, delay: number, speed = 34) {
  const [out, setOut] = useState('');
  useEffect(() => {
    setOut('');
    let i = 0;
    let t: number | undefined;
    const start = setTimeout(() => {
      t = window.setInterval(() => {
        i++;
        setOut(text.slice(0, i));
        if (i >= text.length && t !== undefined) window.clearInterval(t);
      }, speed);
    }, delay);
    return () => {
      clearTimeout(start);
      if (t !== undefined) window.clearInterval(t);
    };
  }, [text, delay, speed]);
  return out;
}

function Reveal({ children, delay }: { children: React.ReactNode; delay: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      className="transition-all duration-500"
      style={{ opacity: on ? 1 : 0, transform: on ? 'translateY(0)' : 'translateY(10px)' }}
    >
      {children}
    </div>
  );
}

function Field({ label, value, color, big, delay }: {
  label: string; value: string; color: string; big?: boolean; delay: number;
}) {
  return (
    <Reveal delay={delay}>
      <div className="border-l-2 pl-3" style={{ borderColor: `${color}66` }}>
        <div className="font-mono text-[10px] tracking-[0.25em] text-white/35">{label}</div>
        <div
          className={`font-black leading-tight tracking-tight ${big ? 'text-[clamp(1.7rem,6vw,2.6rem)]' : 'text-[clamp(1.1rem,4vw,1.5rem)]'}`}
          style={{ color, textShadow: `0 0 24px ${color}44` }}
        >
          {value}
        </div>
      </div>
    </Reveal>
  );
}

// ═══════════════════════════════════════════════
//  패배 연출
// ═══════════════════════════════════════════════
export interface DefeatData {
  predicted: string;
  actual: string;
  accuracy: number;
  verdict: string;
  stageKr: string;
  stageLv: number;
  cause: { headline: string; chain: string[]; tag: string; color: string };
  reads: number;
  breaks: number;
  worstStreak: number;
}

export function DefeatVerdict({ d, onNext }: { d: DefeatData; onNext: () => void }) {
  const head = useTypeIn('SIMULA가 당신의 다음 입력을 예측했습니다.', 250, 28);
  const match = d.predicted === d.actual;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/94 p-4">
      {/* 붉은 노이즈 배경 */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(251,113,133,.16),transparent_65%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background:repeating-linear-gradient(0deg,transparent_0_2px,#fff_2px_3px)]" />

      <div className="relative w-full max-w-xl">
        <div className="min-h-[28px] font-mono text-[13px] tracking-wide text-rose-200/90 md:text-[15px]">
          {head}
          <span className="ml-0.5 animate-pulse">▌</span>
        </div>

        <div className="mt-6 space-y-4">
          <Field label="예측된 입력" value={d.predicted} color="#fb7185" big delay={1500} />
          <Field label="실제 입력" value={d.actual} color={match ? '#fb7185' : '#7dffc2'} big delay={2300} />
          <Field label="예측 성공률" value={`${Math.round(d.accuracy * 100)}%`} color="#fbbf24" delay={3100} />
        </div>

        {/* 읽힘 통계 */}
        <Reveal delay={3700}>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              ['읽힌 횟수', `${d.reads}`, '#fb7185'],
              ['벗어난 횟수', `${d.breaks}`, '#7dffc2'],
              ['최다 연속 피독', `${d.worstStreak}회`, '#fbbf24'],
            ].map(([l, v, c]) => (
              <div key={l} className="rounded border border-white/12 bg-black/40 px-3 py-1.5">
                <div className="font-mono text-[8.5px] tracking-widest text-white/35">{l}</div>
                <div className="font-mono text-[15px] font-black" style={{ color: c as string }}>{v}</div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* 패배 원인 인과 사슬 */}
        <Reveal delay={4200}>
          <div
            className="mt-4 overflow-hidden rounded-lg border"
            style={{ borderColor: `${d.cause.color}55`, background: `${d.cause.color}0d` }}
          >
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
              <span className="rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-black tracking-widest"
                style={{ background: `${d.cause.color}26`, color: d.cause.color }}>
                {d.cause.tag}
              </span>
              <span className="font-mono text-[9.5px] tracking-[0.2em] text-white/35">패배 원인</span>
            </div>
            <div className="px-4 py-3">
              <div className="text-[15px] font-black leading-snug text-white">{d.cause.headline}</div>
              <div className="mt-2 space-y-1">
                {d.cause.chain.map((c, i) => (
                  <div key={c} className="flex items-start gap-2">
                    <span className="mt-[3px] font-mono text-[9px]" style={{ color: d.cause.color }}>
                      {i + 1 < d.cause.chain.length ? '┃' : '┗'}
                    </span>
                    <span className="text-[12px] leading-snug text-white/60">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={5000}>
          <div className="mt-5 border-t border-white/15 pt-4">
            <div className="font-mono text-[10px] tracking-[0.3em] text-white/30">결론</div>
            <div className="mt-1 text-[clamp(1.25rem,5vw,1.85rem)] font-black leading-snug tracking-tight text-white">
              {d.verdict}
            </div>
            <div className="mt-2 font-mono text-[11px] text-rose-300/60">
              SIMULA Lv.{d.stageLv} {d.stageKr} — 당신이 진 상대는 당신입니다.
            </div>
          </div>
        </Reveal>

        <Reveal delay={5700}>
          <button
            onClick={onNext}
            className="mt-6 w-full rounded-md border border-rose-400/50 bg-rose-500/15 py-3 font-mono text-xs font-bold tracking-[0.25em] text-rose-100 transition hover:bg-rose-500/25 active:scale-[0.99]"
          >
            ▸ 습관 분석 보기
          </button>
        </Reveal>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  승리 / 교정 성공 연출
// ═══════════════════════════════════════════════
export interface VictoryData {
  metricLabel: string;
  before: number;
  after: number;
  failCount: number;
  verdict: string;
  title: string;
}

export function VictoryVerdict({ d, onNext }: { d: VictoryData; onNext: () => void }) {
  const head = useTypeIn(d.title, 250, 30);
  const down = d.after < d.before;
  const diff = Math.abs(d.after - d.before);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/94 p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(125,255,194,.16),transparent_65%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background:repeating-linear-gradient(0deg,transparent_0_2px,#fff_2px_3px)]" />

      <div className="relative w-full max-w-xl">
        <div className="min-h-[28px] font-mono text-[13px] tracking-[0.2em] text-emerald-200/90 md:text-[15px]">
          {head}
          <span className="ml-0.5 animate-pulse">▌</span>
        </div>

        <div className="mt-6 space-y-4">
          <Field label={`이전 ${d.metricLabel}`} value={`${d.before}%`} color="#94a3b8" delay={1400} />
          <Reveal delay={2100}>
            <div className="flex items-center gap-3 pl-3">
              <span className="font-mono text-2xl" style={{ color: down ? '#7dffc2' : '#fbbf24' }}>
                {down ? '▼' : '▲'}
              </span>
              <span className="font-mono text-sm" style={{ color: down ? '#7dffc2' : '#fbbf24' }}>
                {down ? '-' : '+'}{diff}
              </span>
            </div>
          </Reveal>
          <Field label={`현재 ${d.metricLabel}`} value={`${d.after}%`} color="#7dffc2" big delay={2600} />
          <Field label="SIMULA의 예측 실패" value={`${d.failCount}회`} color="#67e8f9" delay={3400} />
        </div>

        <Reveal delay={4200}>
          <div className="mt-7 border-t border-white/15 pt-5">
            <div className="font-mono text-[10px] tracking-[0.3em] text-white/30">결론</div>
            <div className="mt-1 text-[clamp(1.25rem,5vw,1.85rem)] font-black leading-snug tracking-tight text-white">
              {d.verdict}
            </div>
          </div>
        </Reveal>

        <Reveal delay={5000}>
          <button
            onClick={onNext}
            className="mt-6 w-full rounded-md border border-emerald-400/50 bg-emerald-400/15 py-3 font-mono text-xs font-bold tracking-[0.25em] text-emerald-100 transition hover:bg-emerald-400/25 active:scale-[0.99]"
          >
            ▸ 계속
          </button>
        </Reveal>
      </div>
    </div>
  );
}
