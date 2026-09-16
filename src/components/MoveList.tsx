import { useState } from 'react';
import { MOVES, MOVE_ORDER, type AttackId } from '../game/types';

const CLS_LABEL: Record<string, { t: string; c: string }> = {
  normal: { t: '통상기', c: '#9aa7c7' },
  command: { t: '커맨드기', c: '#ffd447' },
  special: { t: '필살기', c: '#5ee7ff' },
  super: { t: '초필살기', c: '#ffffff' },
};

const COMBOS: { name: string; route: string[]; dmg: string; note: string; tier: string }[] = [
  {
    name: '기본 체인',
    route: ['약', '약', '강'],
    dmg: '≈ 24',
    note: '약 타격은 히트/가드 확인 후 2회까지 체인. 가장 안전한 시작.',
    tier: '#38f2ff',
  },
  {
    name: '하단 시동 필살',
    route: ['하단 쓸기', '강 상단', '미러파'],
    dmg: '≈ 32',
    note: '하단 쓸기로 상단 가드를 무너뜨린 뒤 강 → 미러파로 마무리.',
    tier: '#ffd447',
  },
  {
    name: '대공 처형',
    route: ['약', '리플렉스 어퍼'],
    dmg: '≈ 21',
    note: '어퍼는 1~8F 무적. 시뮬라의 점프·러시를 그대로 띄워버립니다.',
    tier: '#ff7a45',
  },
  {
    name: '슬라이드 압박',
    route: ['글리치 슬라이드', '(다운)', '약'],
    dmg: '≈ 18',
    note: '하단 판정 + 고속 전진. 다운 후 기상 압박으로 리듬을 흔드세요.',
    tier: '#c0ff4f',
  },
  {
    name: '오버라이드 피니시',
    route: ['약', '강 상단', '역-학습 오버라이드'],
    dmg: '≈ 58',
    note: '게이지 100% 소모. 통상기 → 초필살기 캔슬로 라운드를 끝냅니다.',
    tier: '#ffffff',
  },
];

function FrameRow({ id }: { id: AttackId }) {
  const m = MOVES[id];
  const cl = CLS_LABEL[m.cls];
  const adv = m.blockstun - m.recovery;
  return (
    <tr className="border-t border-white/5">
      <td className="py-1.5 pr-2">
        <div className="font-bold text-white/85">{m.kr}</div>
        <div className="font-mono text-[9px] text-white/35">{m.cmd}</div>
      </td>
      <td className="pr-2 font-mono text-[10px]" style={{ color: cl.c }}>{cl.t}</td>
      <td className="pr-2 text-center font-mono text-[10px] text-cyan-200">{m.startup}F</td>
      <td className="pr-2 text-center font-mono text-[10px] text-white/60">
        {m.projectile ? m.projectile.damage : m.multi ? `${m.damage}×${m.multi.times}` : m.damage}
      </td>
      <td className="pr-2 text-center font-mono text-[10px]" style={{ color: adv >= 0 ? '#7dffc2' : '#fb7185' }}>
        {adv >= 0 ? `+${adv}` : adv}
      </td>
      <td className="text-center font-mono text-[10px] text-white/45">
        {m.height === 'low' ? '하단' : m.height === 'high' ? '상단' : m.height === 'grab' ? '잡기' : m.height === 'unblockable' ? '가드불가' : '중단'}
      </td>
    </tr>
  );
}

export default function MoveList() {
  const [tab, setTab] = useState<'combo' | 'frame'>('combo');
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02]">
      <div className="flex items-center gap-1 border-b border-white/10 px-2 py-1.5">
        <span className="mr-2 font-mono text-[10px] tracking-[0.2em] text-white/35">COMBAT DATA</span>
        {([['combo', '콤보 레시피'], ['frame', '프레임 데이터']] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded px-2.5 py-1 font-mono text-[10px] tracking-wider transition ${
              tab === k ? 'bg-cyan-400/15 text-cyan-200' : 'text-white/40 hover:bg-white/5'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'combo' ? (
        <div className="grid gap-1.5 p-2 sm:grid-cols-2 xl:grid-cols-3">
          {COMBOS.map((c) => (
            <div key={c.name} className="rounded-md border border-white/10 bg-black/30 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold" style={{ color: c.tier }}>{c.name}</span>
                <span className="font-mono text-[10px] text-amber-200/70">{c.dmg}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                {c.route.map((r, i) => (
                  <span key={`${r}-${i}`} className="flex items-center gap-1">
                    {i > 0 && <span className="font-mono text-[9px] text-white/25">▸</span>}
                    <span className="rounded-sm border border-white/15 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-white/80">
                      {r}
                    </span>
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-white/45">{c.note}</p>
            </div>
          ))}
          <div className="rounded-md border border-emerald-400/25 bg-emerald-400/[0.05] p-2.5 sm:col-span-2 xl:col-span-1">
            <div className="text-[12px] font-bold text-emerald-300">캔슬 규칙</div>
            <ul className="mt-1.5 space-y-0.5 text-[11px] leading-snug text-white/55">
              <li>▸ 기술이 <b className="text-white">맞거나 가드</b>되면 18F 동안 캔슬 창이 열립니다.</li>
              <li>▸ 통상기 → 필살기 → 초필살기 순으로만 연결됩니다.</li>
              <li>▸ 같은 통상기는 2회까지, 한 콤보는 최대 5단계.</li>
              <li>▸ 콤보가 길어질수록 데미지 보정(최대 −58%)이 걸립니다.</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto p-2">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="font-mono text-[9px] tracking-widest text-white/30">
                <th className="pb-1 pr-2">기술 / 커맨드</th>
                <th className="pb-1 pr-2">분류</th>
                <th className="pb-1 pr-2 text-center">발생</th>
                <th className="pb-1 pr-2 text-center">위력</th>
                <th className="pb-1 pr-2 text-center">가드 후</th>
                <th className="pb-1 text-center">판정</th>
              </tr>
            </thead>
            <tbody>
              {MOVE_ORDER.map((id) => <FrameRow key={id} id={id} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
