import { FLOORS } from '../game/dungeon';
import { archLabel, type GhostState, type LeagueDigest } from '../game/ghost';
import { ARCHETYPE_META } from '../game/dna';
import type { AiFighter } from '../game/meta';

interface Props {
  seasonPass?: boolean;
  onStore?: () => void;
  ai: AiFighter | null;
  ghost: GhostState;
  digest: LeagueDigest | null;
  dungeonCleared: number[];
  onMirror: () => void;
  onUpload: () => void;
  onLeague: () => void;
  onFloor: (n: number) => void;
  onTrain: () => void;
}

function ModeCard({
  tag, title, desc, color, icon, disabled, badge, onClick, children,
}: {
  tag: string; title: string; desc: string; color: string; icon: string;
  disabled?: boolean; badge?: string; onClick: () => void; children?: React.ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border transition"
      style={{ borderColor: `${color}33`, background: `linear-gradient(140deg, ${color}14, transparent 65%)`, opacity: disabled ? 0.45 : 1 }}
    >
      <div className="pointer-events-none absolute -right-3 -top-4 select-none text-[76px] leading-none opacity-[0.08]">{icon}</div>
      <div className="relative p-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] tracking-[0.3em]" style={{ color }}>{tag}</span>
          {badge && (
            <span className="animate-pulse rounded-sm px-1.5 py-0.5 font-mono text-[8px] font-black tracking-widest"
              style={{ background: `${color}26`, color }}>
              {badge}
            </span>
          )}
        </div>
        <h3 className="mt-1 text-xl font-black tracking-tight text-white">{title}</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-white/50">{desc}</p>
        {children}
        <button
          onClick={onClick}
          disabled={disabled}
          className="mt-3 w-full rounded-md border py-2.5 font-mono text-[11px] font-bold tracking-[0.2em] transition enabled:hover:brightness-150 disabled:cursor-not-allowed active:scale-[0.98]"
          style={{ borderColor: `${color}55`, background: `${color}1c`, color }}
        >
          {disabled ? '먼저 AI를 생성하세요' : '▸ 시작'}
        </button>
      </div>
    </div>
  );
}

export default function ModeHub(p: Props) {
  const hasAi = !!p.ai;
  const meta = p.ai ? ARCHETYPE_META[p.ai.archetype] : null;

  return (
    <div className="space-y-3">
      {/* ── 리그 다이제스트 (반복 접속 훅) */}
      {p.digest && p.ghost.uploaded && (
        <div className="overflow-hidden rounded-lg border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/[0.12] to-transparent">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-400" />
              <span className="font-mono text-[10px] tracking-[0.3em] text-fuchsia-300/90">GHOST ACTIVITY</span>
            </div>
            <span className="font-mono text-[9px] text-white/30">
              업로드 v{p.ghost.version} · 누적 {p.ghost.totalWins}승 {p.ghost.totalLosses}패
            </span>
          </div>

          <div className="px-4 py-3">
            <div className="text-[15px] font-bold text-white">
              <span className="text-fuchsia-300">{p.ai?.name}</span> 전적
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
              <div>
                <div className="font-mono text-[9px] tracking-widest text-white/35">오늘 도전받음</div>
                <div className="font-mono text-3xl font-black leading-none text-white">{p.digest.todayChallenges}<span className="text-sm text-white/40">번</span></div>
              </div>
              <div>
                <div className="font-mono text-[9px] tracking-widest text-white/35">전적</div>
                <div className="font-mono text-2xl font-black leading-none">
                  <span className="text-cyan-300">{p.digest.wins}승</span>
                  <span className="mx-1 text-white/25">/</span>
                  <span className="text-rose-300">{p.digest.losses}패</span>
                </div>
              </div>
              <div>
                <div className="font-mono text-[9px] tracking-widest text-white/35">레이팅</div>
                <div className={`font-mono text-2xl font-black leading-none ${p.digest.ratingDelta >= 0 ? 'text-cyan-200' : 'text-rose-200'}`}>
                  {p.digest.ratingDelta >= 0 ? '+' : ''}{p.digest.ratingDelta}
                </div>
              </div>
              {p.digest.streak > 1 && (
                <div>
                  <div className="font-mono text-[9px] tracking-widest text-white/35">최고 연승</div>
                  <div className="font-mono text-2xl font-black leading-none text-amber-300">{p.digest.streak}</div>
                </div>
              )}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-rose-400/25 bg-rose-500/[0.07] px-3 py-2">
                <div className="font-mono text-[9px] tracking-[0.2em] text-rose-300/70">가장 많이 당한 공격</div>
                <div className="mt-0.5 text-[14px] font-bold text-white">{p.digest.mostPunishedBy}</div>
              </div>
              <div className="rounded-md border border-emerald-400/25 bg-emerald-400/[0.06] px-3 py-2">
                <div className="font-mono text-[9px] tracking-[0.2em] text-emerald-300/70">가장 강한 습관</div>
                <div className="mt-0.5 text-[14px] font-bold text-white">{p.digest.strongestHabit}</div>
              </div>
            </div>

            {p.digest.newRivals.length > 0 && (
              <div className="mt-2 font-mono text-[10px] text-white/40">
                새로운 라이벌 {p.digest.newRivals.length}명 생성: {p.digest.newRivals.join(', ')}
              </div>
            )}

            {/* 최근 로그 */}
            <div className="mt-3 max-h-[126px] space-y-0.5 overflow-y-auto">
              {p.digest.logs.slice(0, 8).map((l) => (
                <div key={l.id} className="flex items-center gap-2 rounded-sm bg-black/30 px-2 py-1 font-mono text-[10px]">
                  <span className={`w-5 font-black ${l.win ? 'text-cyan-300' : 'text-rose-300'}`}>{l.win ? 'W' : 'L'}</span>
                  <span className="w-4">{l.oppFlag}</span>
                  <span className="min-w-0 flex-1 truncate text-white/60">{l.opp}</span>
                  <span className="text-white/35">{l.score}</span>
                  <span className={`w-9 text-right ${l.delta >= 0 ? 'text-cyan-300/70' : 'text-rose-300/70'}`}>
                    {l.delta >= 0 ? '+' : ''}{l.delta}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 모드 카드 */}
      <div className="grid gap-3 md:grid-cols-2">
        <ModeCard
          tag="MODE 01" title="Mirror Battle" icon="◉" color="#38f2ff"
          desc="내 습관을 학습한 AI와 직접 싸웁니다. 이 게임의 메인 모드입니다."
          disabled={!hasAi} onClick={p.onMirror}
          badge={hasAi ? 'MAIN' : undefined}
        >
          {p.ai && meta && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-white/10 bg-black/30 px-2.5 py-1.5">
              <span className="font-mono text-[10px] text-white/35">나</span>
              <span className="font-mono text-[10px] text-white/25">vs</span>
              <span className="truncate font-mono text-[11px] font-bold" style={{ color: meta.color }}>
                {meta.icon} {p.ai.name}
              </span>
            </div>
          )}
        </ModeCard>

        <ModeCard
          tag="MODE 02" title="Ghost Upload" icon="☁" color="#b478ff"
          desc="내 AI를 서버에 올립니다. 접속하지 않아도 다른 유저가 내 AI에게 도전합니다."
          disabled={!hasAi} onClick={p.onUpload}
          badge={p.ghost.uploaded ? `v${p.ghost.version} ONLINE` : undefined}
        >
          <div className="mt-2 flex items-center gap-2 rounded-md border px-2.5 py-1.5"
            style={{ borderColor: p.ghost.uploaded ? 'rgba(125,255,194,.3)' : 'rgba(255,255,255,.1)', background: 'rgba(0,0,0,.3)' }}>
            <span className={`h-1.5 w-1.5 rounded-full ${p.ghost.uploaded ? 'animate-pulse bg-emerald-400' : 'bg-white/25'}`} />
            <span className="font-mono text-[10px]" style={{ color: p.ghost.uploaded ? '#7dffc2' : 'rgba(255,255,255,.35)' }}>
              {p.ghost.uploaded
                ? `GHOST ONLINE · 누적 ${p.ghost.totalChallenges}회 도전받음`
                : 'GHOST OFFLINE — 업로드하면 상시 대전이 시작됩니다'}
            </span>
          </div>
        </ModeCard>

        <ModeCard
          tag="MODE 03" title="AI vs AI League" icon="⚔" color="#ff9a3c"
          desc="직접 조작하지 않습니다. 내 AI를 리그에 출전시켜 랭커·친구 AI와 겨룹니다."
          disabled={!hasAi} onClick={p.onLeague}
        >
          <div className="mt-2 flex flex-wrap gap-1">
            {['랭킹 1위 AI', '친구 AI', '랜덤 유저 AI'].map((s) => (
              <span key={s} className="rounded border border-orange-400/25 bg-orange-400/10 px-1.5 py-0.5 font-mono text-[9px] text-orange-200/80">
                {s}
              </span>
            ))}
          </div>
        </ModeCard>

        <ModeCard
          tag="MODE 04" title="Habit Dungeon" icon="▲" color="#fb7185"
          desc="층마다 하나의 습관을 봉인합니다. 격투게임이 처음이어도 무엇을 고쳐야 할지 알 수 있습니다."
          onClick={() => p.onFloor(p.dungeonCleared.length + 1 > 5 ? 5 : p.dungeonCleared.length + 1)}
        >
          <div className="mt-2 space-y-1">
            {FLOORS.map((f) => {
              const done = p.dungeonCleared.includes(f.n);
              const locked = f.n > 1 && !p.dungeonCleared.includes(f.n - 1);
              return (
                <button
                  key={f.n}
                  onClick={(e) => { e.stopPropagation(); if (!locked) p.onFloor(f.n); }}
                  disabled={locked}
                  className="flex w-full items-center gap-2 rounded border px-2 py-1 text-left transition enabled:hover:brightness-150 disabled:opacity-35"
                  style={{
                    borderColor: done ? 'rgba(125,255,194,.35)' : `${f.color}28`,
                    background: done ? 'rgba(125,255,194,.06)' : `${f.color}0a`,
                  }}
                >
                  <span className="font-mono text-[9px] text-white/35">{f.n}F</span>
                  <span className="text-[11px]" style={{ color: f.color }}>{f.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-[11.5px] font-bold text-white/80">{f.name}</span>
                  {done && <span className="font-mono text-[9px] text-emerald-300">CLEAR</span>}
                  {locked && <span className="font-mono text-[9px] text-white/25">잠금</span>}
                </button>
              );
            })}
          </div>
        </ModeCard>
      </div>

      {/* 시즌 패스 */}
      {p.onStore && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-2.5"
          style={{
            borderColor: p.seasonPass ? 'rgba(255,79,163,.4)' : 'rgba(255,255,255,.12)',
            background: p.seasonPass ? 'rgba(255,79,163,.08)' : 'rgba(255,255,255,.02)',
          }}
        >
          <div>
            <div className="font-mono text-[9px] tracking-[0.25em] text-fuchsia-300/70">GHOST LEAGUE · SEASON 01</div>
            <div className="text-[13px] font-bold text-white">
              {p.seasonPass ? '시즌 패스 활성 — 랭킹 참가 중' : '시즌 랭킹에 참가하고 한정 코스메틱을 획득하세요'}
            </div>
            <div className="font-mono text-[9px] text-white/30">매칭·승률 보정 없음 · 코스메틱과 아카이브만 제공</div>
          </div>
          <button
            onClick={p.onStore}
            className="rounded-md border border-fuchsia-400/45 bg-fuchsia-500/15 px-4 py-2 font-mono text-[10px] font-bold tracking-[0.2em] text-fuchsia-100 transition hover:bg-fuchsia-500/25"
          >
            {p.seasonPass ? '▦ 상점' : '▦ 시즌 패스 보기'}
          </button>
        </div>
      )}

      {/* 훈련 */}
      <button
        onClick={p.onTrain}
        className="w-full rounded-lg border border-cyan-300/40 bg-cyan-400/10 py-3 font-mono text-xs font-bold tracking-[0.25em] text-cyan-100 transition hover:bg-cyan-400/20 active:scale-[0.99]"
      >
        ▸ 자유 훈련 (습관 수집)
      </button>

      {p.ai && (
        <div className="text-center font-mono text-[9px] text-white/25">
          {archLabel(p.ai.archetype)} · POWER {p.ai.power} · RATING {p.ai.rating}
        </div>
      )}
    </div>
  );
}
