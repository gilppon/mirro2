import { ACTION_COLOR, ACTION_KR } from '../game/brain';
import type { GameSnapshot } from '../hooks/useMirrorGame';

interface Props { s: GameSnapshot; onRestart: () => void; onTitle: () => void }

function verdict(s: GameSnapshot): string {
  const acc = s.brain.accuracy;
  const top = s.brain.actionDist[0];
  const interval = s.brain.avgInterval;
  const parts: string[] = [];
  if (top) parts.push(`전체 입력의 ${Math.round(top.p * 100)}%가 "${ACTION_KR[top.a]}"에 집중되어 있었습니다.`);
  parts.push(
    interval < 260
      ? `평균 ${interval.toFixed(0)}ms의 고속 연타 리듬은 주기성이 뚜렷해 예측 모델에 최적의 먹잇감이었습니다.`
      : `평균 입력 간격 ${interval.toFixed(0)}ms — 리듬 변주가 있었지만 거리별 선택은 일정했습니다.`,
  );
  parts.push(
    acc > 0.5
      ? `시뮬라는 당신의 다음 입력을 ${Math.round(acc * 100)}% 확률로 맞혔습니다. 근육 기억이 곧 약점입니다.`
      : `예측 적중률 ${Math.round(acc * 100)}% — 습관을 의도적으로 무너뜨리는 데 성공했습니다.`,
  );
  return parts.join(' ');
}

function Cell({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="font-mono text-[9px] tracking-widest text-white/40">{label}</div>
      <div className="font-mono text-lg font-black" style={{ color: color ?? '#e2e8f0' }}>
        {value}<span className="ml-0.5 text-[10px] font-normal text-white/35">{unit}</span>
      </div>
    </div>
  );
}

export default function ResultScreen({ s, onRestart, onTitle }: Props) {
  const win = s.matchWinner === 'player';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm">
      <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-xl border border-white/15 bg-[#070a14] shadow-[0_0_60px_rgba(0,0,0,.8)]">
        <div className={`relative overflow-hidden px-6 py-6 ${win ? 'bg-gradient-to-r from-cyan-500/20' : 'bg-gradient-to-r from-fuchsia-600/20'} to-transparent`}>
          <div className="font-mono text-[10px] tracking-[0.3em] text-white/40">MATCH REPORT · {s.wins[0]} : {s.wins[1]}</div>
          <h2 className={`mt-1 text-4xl font-black tracking-tight ${win ? 'text-cyan-200' : 'text-fuchsia-300'}`}>
            {win ? '습관 탈출 성공' : '당신의 습관에게 패배'}
          </h2>
          <p className="mt-1 font-mono text-[11px] text-white/45">
            {win ? 'SIMULA의 예측 모델이 붕괴했습니다 — 반사신경 역-학습 해제' : 'SIMULA가 당신의 근육 기억을 완전 복제했습니다'}
          </p>
        </div>

        <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
          <div>
            <h3 className="mb-2 font-mono text-[10px] tracking-[0.25em] text-white/40">COMBAT LOG</h3>
            <div className="grid grid-cols-2 gap-2">
              <Cell label="가한 피해" value={s.stats.dmgDealt.toFixed(0)} color="#67e8f9" />
              <Cell label="받은 피해" value={s.stats.dmgTaken.toFixed(0)} color="#f0abfc" />
              <Cell label="최대 콤보" value={`${s.stats.maxCombo}`} unit="hit" color="#fde68a" />
              <Cell label="최대 콤보 데미지" value={s.stats.maxComboDmg.toFixed(0)} color="#fbbf24" />
              <Cell label="캔슬 성공" value={`${s.stats.cancels}`} unit="회" color="#ffd447" />
              <Cell label="필살기 / 초필" value={`${s.stats.specials} / ${s.stats.supers}`} color="#5ee7ff" />
              <Cell label="역-학습 성공" value={`${s.stats.habitBreaks}`} unit="회" color="#7dffc2" />
              <Cell label="헛친 기술" value={`${s.stats.whiffs}`} color="#fca5a5" />
            </div>
            <h3 className="mb-2 mt-4 font-mono text-[10px] tracking-[0.25em] text-white/40">BIOMETRICS</h3>
            <div className="grid grid-cols-2 gap-2">
              <Cell label="평균 입력간격" value={s.brain.avgInterval.toFixed(0)} unit="ms" />
              <Cell label="반응속도" value={s.brain.reaction.toFixed(0)} unit="ms" />
              <Cell label="APM" value={s.brain.apm.toFixed(0)} />
              <Cell label="예측 적중률" value={`${Math.round(s.brain.accuracy * 100)}`} unit="%" color={s.brain.accuracy > 0.5 ? '#fb7185' : '#7dffc2'} />
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-mono text-[10px] tracking-[0.25em] text-white/40">흡수된 습관 n-GRAM</h3>
            <div className="space-y-1">
              {s.brain.topPatterns.length === 0 && <div className="font-mono text-[11px] text-white/25">수집된 패턴 없음</div>}
              {s.brain.topPatterns.map((p) => (
                <div key={p.seq} className="flex items-center gap-2 rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1.5">
                  <span className="flex-1 truncate font-mono text-[11px] text-white/70">{p.seq}</span>
                  <span className="font-mono text-[10px] text-white/25">▶</span>
                  <span className="font-mono text-[11px] font-bold" style={{ color: ACTION_COLOR[p.next] }}>{ACTION_KR[p.next]}</span>
                  <span className="w-9 text-right font-mono text-[11px] text-white/45">{Math.round(p.p * 100)}%</span>
                </div>
              ))}
            </div>
            <h3 className="mb-2 mt-4 font-mono text-[10px] tracking-[0.25em] text-white/40">행동 편향</h3>
            <div className="space-y-1">
              {s.brain.actionDist.slice(0, 5).map((d) => (
                <div key={d.a} className="flex items-center gap-2">
                  <span className="w-14 shrink-0 font-mono text-[11px] text-white/55">{ACTION_KR[d.a]}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full" style={{ width: `${d.p * 100}%`, background: ACTION_COLOR[d.a] }} />
                  </div>
                  <span className="w-8 text-right font-mono text-[10px] text-white/35">{Math.round(d.p * 100)}%</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[10px] text-white/50">
              시선 패턴: <span className="text-fuchsia-300">{s.brain.focus}</span> · 시선 선행 일치율{' '}
              <span className="text-cyan-300">{Math.round(s.brain.gazeLead * 100)}%</span>
            </div>
          </div>
        </div>

        <div className="mx-6 mb-5 rounded-md border border-fuchsia-400/25 bg-fuchsia-500/[0.06] px-4 py-3">
          <div className="font-mono text-[10px] tracking-[0.25em] text-fuchsia-300/80">SIMULA의 진단</div>
          <p className="mt-1 text-[13px] leading-relaxed text-white/70">{verdict(s)}</p>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-white/10 px-6 py-4">
          <button
            onClick={onRestart}
            className="rounded-md border border-cyan-300/50 bg-cyan-400/15 px-6 py-2.5 font-mono text-xs font-bold tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-400/25 active:scale-95"
          >
            계속 훈련 ▸ 데이터 누적
          </button>
          <button
            onClick={onTitle}
            className="rounded-md border border-fuchsia-400/50 bg-fuchsia-500/15 px-6 py-2.5 font-mono text-xs font-bold tracking-[0.2em] text-fuchsia-100 transition hover:bg-fuchsia-500/25 active:scale-95"
          >
            ▸ SIMULA의 분석 보기
          </button>
        </div>
      </div>
    </div>
  );
}
