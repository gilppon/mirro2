interface Props {
  matches: number;
  reads: number;
  breaks: number;
  stageLv: number;
  accuracy: number;
}

const GOAL_MATCHES = 10;

export default function MvpTracker({ matches, reads, breaks, stageLv, accuracy }: Props) {
  const pct = Math.min(1, matches / GOAL_MATCHES);
  const felt = reads >= 5 && stageLv >= 3;
  const total = reads + breaks;
  const rate = total ? reads / total : 0;

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <span className="font-mono text-[10px] tracking-[0.25em] text-white/40">FIRST GOAL</span>
        <span className="font-mono text-[9px] text-white/25">10판 안에 “읽힌다”를 체감하기</span>
      </div>

      <div className="p-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="font-mono text-[9px] tracking-widest text-white/35">플레이한 매치</div>
            <div className="font-mono text-3xl font-black leading-none text-white">
              {matches}<span className="text-sm text-white/30"> / {GOAL_MATCHES}</span>
            </div>
          </div>
          <div
            className={`rounded-md border px-3 py-1.5 text-center ${felt ? 'border-rose-400/50 bg-rose-500/12' : 'border-white/12 bg-black/30'}`}
          >
            <div className="font-mono text-[9px] tracking-widest text-white/35">체감 여부</div>
            <div className={`font-mono text-[12px] font-black ${felt ? 'text-rose-300' : 'text-white/40'}`}>
              {felt ? '읽히는 중' : '수집 중'}
            </div>
          </div>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-rose-500 transition-[width] duration-500"
            style={{ width: `${pct * 100}%` }}
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {[
            ['읽힌 횟수', `${reads}`, '#fb7185'],
            ['벗어난 횟수', `${breaks}`, '#7dffc2'],
            ['피독률', `${Math.round(rate * 100)}%`, rate > 0.5 ? '#fb7185' : '#67e8f9'],
          ].map(([l, v, c]) => (
            <div key={l} className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-center">
              <div className="font-mono text-[8.5px] text-white/35">{l}</div>
              <div className="font-mono text-[15px] font-black" style={{ color: c as string }}>{v}</div>
            </div>
          ))}
        </div>

        <div className="mt-2 rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-[10px] leading-relaxed text-white/45">
          {matches < 3
            ? 'SIMULA는 아직 관찰 중입니다. 평소대로 싸워주세요.'
            : stageLv < 3
              ? `Lv.3 예측자가 되면 READ 연출이 시작됩니다. 예측 적중률 ${Math.round(accuracy * 100)}%`
              : reads < 5
                ? '패턴이 잡히고 있습니다. 곧 읽히기 시작합니다.'
                : rate > 0.5
                  ? '당신은 지금 읽히고 있습니다. Habit Break 미션으로 패턴을 끊으세요.'
                  : '예측을 잘 벗어나고 있습니다. 이 감각을 유지하세요.'}
        </div>
      </div>
    </div>
  );
}
