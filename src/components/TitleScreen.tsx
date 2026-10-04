import { useCallback, useEffect, useMemo, useState } from 'react';
import { ARCHETYPE_META, type Archetype } from '../game/dna';
import { STAGES } from '../game/evolution';
import CharacterPreview from './CharacterPreview';
import { sfx } from '../game/audio';
import { useI18n } from '../i18n';
import LangSwitch from './LangSwitch';

export type MenuId = 'training' | 'dungeon' | 'mirror' | 'league' | 'lab' | 'store';

interface Props {
  onSelect: (id: MenuId) => void;
  hasAi?: boolean;
  aiName?: string;
  aiArch?: string;
  dungeonCleared?: number;
  simulaLv?: number;
  generation?: number;
}

interface MenuItem {
  id: MenuId;
  label: string;
  kr: string;
  desc: string;
  color: string;
  icon: string;
  locked?: boolean;
  badge?: string;
}

function buildMenu(t: (k: string) => string): MenuItem[] {
  return [
    {
      id: 'training', label: 'TRAINING', kr: t('menu.training'), desc: t('menu.training.d'),
      color: '#38f2ff', icon: '▶', badge: 'MAIN',
    },
    {
      id: 'dungeon', label: 'HABIT DUNGEON', kr: t('menu.dungeon'), desc: t('menu.dungeon.d'),
      color: '#fb7185', icon: '▲',
    },
    {
      id: 'mirror', label: 'MIRROR BATTLE', kr: t('menu.mirror'), desc: t('menu.mirror.d'),
      color: '#b478ff', icon: '◉',
    },
    {
      id: 'league', label: 'GHOST LEAGUE', kr: t('menu.league'), desc: t('menu.league.d'),
      color: '#ff9a3c', icon: '⚔',
    },
    {
      id: 'lab', label: 'AI LAB', kr: t('menu.lab'), desc: t('menu.lab.d'),
      color: '#7dffc2', icon: '⌗',
    },
    {
      id: 'store', label: 'STORE', kr: t('menu.store'), desc: t('menu.store.d'),
      color: '#f0abfc', icon: '▦',
    },
  ];
}

// ── SF식 로고 ─────────────────────────────────────
function Logo() {
  return (
    <div className="relative select-none">
      <div
        className="text-[clamp(2.2rem,8.5vw,5.4rem)] font-black italic leading-[0.82] tracking-tighter"
        style={{ transform: 'skewX(-11deg)' }}
      >
        <div
          className="bg-gradient-to-b from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent"
          style={{ filter: 'drop-shadow(0 3px 0 #062a3d) drop-shadow(0 0 28px rgba(56,242,255,.4))' }}
        >
          MIRROR NEURAL
        </div>
        <div
          className="bg-gradient-to-b from-fuchsia-200 via-rose-300 to-fuchsia-600 bg-clip-text text-transparent"
          style={{ filter: 'drop-shadow(0 3px 0 #3d0620) drop-shadow(0 0 28px rgba(255,79,163,.45))' }}
        >
          BRAWLER
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2" style={{ transform: 'skewX(-11deg)' }}>
        <span className="h-[2px] w-8 bg-cyan-400" />
        <span className="font-mono text-[clamp(7px,1.4vw,11px)] font-bold tracking-[0.28em] text-cyan-200/70">
          AI 습관 분석 격투 · SELF-MIRROR FIGHTING
        </span>
      </div>
    </div>
  );
}

// ── 배경 ─────────────────────────────────────────
function Backdrop({ accent }: { accent: string }) {
  return (
    <>
      {/* 상단 스포트라이트 */}
      <div
        className="pointer-events-none absolute inset-0 transition-colors duration-700"
        style={{
          background: `radial-gradient(ellipse 90% 62% at 50% -12%, ${accent}2e, transparent 62%),
                       radial-gradient(ellipse 60% 50% at 15% 108%, rgba(34,211,238,.14), transparent 60%),
                       radial-gradient(ellipse 60% 50% at 88% 105%, rgba(217,70,239,.16), transparent 60%)`,
        }}
      />
      {/* 대각 스트라이프 */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.045]"
        style={{
          background: `repeating-linear-gradient(115deg, transparent 0 26px, #fff 26px 27px)`,
        }}
      />
      {/* 격자 */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:52px_52px]" />
      {/* 스캔라인 */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background:repeating-linear-gradient(0deg,transparent_0_2px,rgba(0,0,0,.85)_2px_3px)]" />
      {/* 비네트 */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(0,0,0,.82))]" />
    </>
  );
}

export default function TitleScreen({
  onSelect, hasAi, aiName, aiArch, dungeonCleared = 0, simulaLv = 1, generation = 0,
}: Props) {
  const { t } = useI18n();
  const [attract, setAttract] = useState(true);
  const [sel, setSel] = useState(0);

  const move = useCallback((d: number, n: number) => {
    setSel((s) => {
      const next = (s + d + n) % n;
      if (next !== s) sfx.ui();
      return next;
    });
  }, []);

  const MENU = useMemo(() => buildMenu(t), [t]);
  const items = useMemo(() => MENU.map((m) => ({
    ...m,
    locked: (m.id === 'mirror' || m.id === 'league') && !hasAi,
  })), [MENU, hasAi]);

  const cur = items[sel];
  const accent = cur.color;

  const confirm = useCallback(() => {
    if (attract) { setAttract(false); return; }
    if (!cur.locked) onSelect(cur.id);
  }, [attract, cur, onSelect]);

  // 키보드 내비게이션
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'enter', 'w', 's'].includes(k)) {
        e.preventDefault();
      }
      if (attract) {
        if (k === ' ' || k === 'enter' || k.startsWith('arrow') || 'wasd'.includes(k)) setAttract(false);
        return;
      }
      if (k === 'arrowup' || k === 'w') move(-1, items.length);
      else if (k === 'arrowdown' || k === 's') move(1, items.length);
      else if (k === ' ' || k === 'enter') confirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [attract, confirm, items.length, move]);

  const archMeta = aiArch ? ARCHETYPE_META[aiArch as Archetype] : null;
  const stage = STAGES[Math.max(0, Math.min(5, simulaLv - 1))];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#03050b] text-white">
      <Backdrop accent={accent} />

      {/* ═══ 어트랙트 모드 (PRESS START) ═══ */}
      {attract ? (
        <button
          onClick={() => setAttract(false)}
          className="absolute inset-0 z-20 flex cursor-pointer flex-col items-center justify-center"
        >
          <Logo />
          <div className="mt-12 animate-[pulse_1.25s_ease-in-out_infinite] font-mono text-[clamp(11px,2.4vw,17px)] font-black tracking-[0.42em] text-white/85">
            {t('app.pressAnyKey')}
          </div>
          <div className="mt-3 font-mono text-[10px] tracking-[0.2em] text-white/30">
            {t('app.insertCoin')}
          </div>
          {/* VS 엠블럼 */}
          <div
            className="mt-8 font-mono text-[clamp(28px,7vw,58px)] font-black italic leading-none tracking-tighter"
            style={{
              transform: 'skewX(-11deg)',
              color: 'transparent',
              WebkitTextStroke: '1.5px rgba(255,255,255,.22)',
            }}
          >
            VS
          </div>

          {/* 언어 선택 */}
          <div
            className="mt-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 font-mono text-[9px] tracking-[0.3em] text-white/35">LANGUAGE</div>
            <LangSwitch variant="full" />
          </div>
          {/* 하단 캐릭터 실루엣 */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center opacity-30">
            <CharacterPreview who="simula" size={520} className="translate-y-[26%]" />
          </div>
        </button>
      ) : (
      /* ═══ 메인 메뉴 ═══ */
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 md:px-8">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-4">
          <div className="scale-90 origin-left md:scale-100"><Logo /></div>
          {/* 스테이터스 */}
          <div className="flex shrink-0 flex-col items-end gap-1.5 pt-1">
            <div className="flex items-center gap-2" style={{ transform: 'skewX(-11deg)' }}>
              <span
                className="rounded-sm border px-2 py-0.5 font-mono text-[10px] font-black tracking-widest"
                style={{ borderColor: `${stage.color}66`, background: `${stage.color}18`, color: stage.color }}
              >
                SIMULA LV.{stage.lv} {stage.kr}
              </span>
            </div>
            {hasAi && archMeta && (
              <div className="flex items-center gap-2" style={{ transform: 'skewX(-11deg)' }}>
                <span
                  className="rounded-sm border px-2 py-0.5 font-mono text-[10px] font-black tracking-widest"
                  style={{ borderColor: `${archMeta.color}55`, background: `${archMeta.color}14`, color: archMeta.color }}
                >
                  {archMeta.icon} {aiName}
                </span>
              </div>
            )}
            <div className="font-mono text-[9px] tracking-widest text-white/25">
              DUNGEON {dungeonCleared}/5 · {t('lab.generation')} {generation ?? '—'}
            </div>
            <div className="mt-1"><LangSwitch variant="compact" /></div>
          </div>
        </div>

        {/* 본문 */}
        <div className="mt-5 grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
          {/* ── 좌: 메뉴 리스트 ── */}
          <div className="flex flex-col justify-center gap-1.5">
            {items.map((m, i) => {
              const on = i === sel;
              return (
                <button
                  key={m.id}
                  onMouseEnter={() => { if (sel !== i) { setSel(i); sfx.ui(); } }}
                  onClick={() => { if (!m.locked) onSelect(m.id); }}
                  className="group relative w-full text-left"
                  style={{ opacity: m.locked ? 0.38 : 1 }}
                >
                  {/* 뒤 배경 바 */}
                  <div
                    className="absolute inset-y-0 left-0 transition-all duration-200"
                    style={{
                      width: on ? 'calc(100% - 6px)' : '0%',
                      transform: 'skewX(-11deg)',
                      background: `linear-gradient(90deg, ${m.color}, ${m.color}22)`,
                      boxShadow: on ? `0 0 26px ${m.color}55` : 'none',
                    }}
                  />
                  <div
                    className="relative flex items-center gap-3 px-4 py-2.5 md:py-3"
                    style={{ transform: 'skewX(-11deg)' }}
                  >
                    <span
                      className="w-4 shrink-0 font-mono text-[13px] font-black transition-all"
                      style={{ color: m.color, opacity: on ? 1 : 0.25 }}
                    >
                      {on ? '▶' : '▷'}
                    </span>
                    <span
                      className="text-[clamp(15px,3.2vw,26px)] font-black italic leading-none tracking-tight transition-colors"
                      style={{
                        color: on ? '#04070e' : 'rgba(255,255,255,.72)',
                        textShadow: on ? 'none' : '0 0 18px rgba(255,255,255,.08)',
                      }}
                    >
                      {m.label}
                    </span>
                    <span
                      className="ml-auto shrink-0 font-mono text-[10px] font-bold tracking-widest"
                      style={{ color: on ? 'rgba(4,7,14,.7)' : `${m.color}bb` }}
                    >
                      {m.locked ? 'LOCKED' : m.kr}
                    </span>
                  </div>
                  {m.badge && !m.locked && (
                    <span
                      className="absolute right-1 top-1 rounded-sm px-1.5 py-[1px] font-mono text-[8px] font-black tracking-widest"
                      style={{ background: '#04070e', color: m.color, transform: 'skewX(-11deg)' }}
                    >
                      {m.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[9.5px] tracking-wider text-white/28">
              <span>↑↓ / W S 선택</span>
              <span>ENTER / CLICK 결정</span>
              <span className="text-cyan-300/40">Your Fighting Style Becomes Your Fighter.</span>
            </div>
          </div>

          {/* ── 우: 모드 프리뷰 ── */}
          <div className="relative flex flex-col justify-center">
            <div
              className="relative overflow-hidden border-l-2 bg-black/45 backdrop-blur-sm transition-colors duration-300"
              style={{ borderColor: accent, boxShadow: `inset 0 0 60px ${accent}12` }}
            >
              {/* 상단 라벨 */}
              <div
                className="flex items-center justify-between px-4 py-1.5"
                style={{ background: `linear-gradient(90deg, ${accent}33, transparent)`, transform: 'skewX(-11deg)' }}
              >
                <span className="font-mono text-[10px] font-black tracking-[0.3em]" style={{ color: accent }}>
                  {cur.icon} {cur.label}
                </span>
                <span className="font-mono text-[9px] tracking-widest text-white/40">{cur.kr}</span>
              </div>

              {/* 캐릭터 프리뷰 */}
              <div className="relative flex items-end justify-center overflow-hidden">
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: `radial-gradient(ellipse 70% 60% at 50% 62%, ${accent}26, transparent 68%)` }}
                />
                <CharacterPreview
                  who={sel <= 1 || sel === 4 ? 'simula' : 'operator'}
                  size={330}
                  pose={sel === 0 || sel === 2 ? 'idle' : 'guard'}
                  className="relative z-10 scale-95"
                />
                {sel === 0 && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center opacity-25">
                    <CharacterPreview who="operator" size={280} pose="attack" className="translate-x-16 translate-y-3" />
                  </div>
                )}
              </div>

              {/* 설명 */}
              <div className="border-t border-white/10 px-4 py-3">
                <p className="text-[12.5px] leading-relaxed text-white/65">{cur.desc}</p>
                {cur.locked && (
                  <div className="mt-2 rounded border border-rose-400/35 bg-rose-500/10 px-2.5 py-1.5 font-mono text-[10px] text-rose-200">
                    {t('menu.locked.ai')}
                  </div>
                )}
              </div>

              {/* 진입 버튼 */}
              <button
                onClick={() => { if (!cur.locked) onSelect(cur.id); }}
                disabled={cur.locked}
                className="w-full py-3 font-mono text-[13px] font-black tracking-[0.3em] transition-all enabled:hover:brightness-125 active:scale-[0.99] disabled:opacity-30"
                style={{ background: `linear-gradient(90deg, ${accent}, ${accent}88)`, color: '#04070e' }}
              >
                {cur.locked ? 'LOCKED' : 'PRESS ENTER'}
              </button>
            </div>
          </div>
        </div>

        {/* 코어 루프 티커 */}
        <div
          className="mt-3 overflow-hidden border-y border-white/10 bg-black/40 py-1.5"
          style={{ transform: 'skewX(-11deg)' }}
        >
          <div className="flex items-center gap-2 overflow-x-auto px-3 font-mono text-[9.5px] tracking-wider text-white/40 [scrollbar-width:none]">
            {['① 전투한다', '② 습관을 수집한다', '③ 다음 입력을 예측한다', '④ 맞출수록 강해진다',
              '⑤ 습관 때문에 패배한다', '⑥ 리포트로 약점 확인', '⑦ 훈련으로 교정한다', '⑧ 다시 싸운다'].map((s) => (
              <span key={s} className="shrink-0 whitespace-nowrap">{s}</span>
            ))}
          </div>
        </div>

        {/* 하단 바 */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[9px] tracking-widest text-white/25">
          <span>VER 1.0 · MIRROR NEURAL BRAWLER</span>
          <span className="flex items-center gap-3">
            <span>© 2026 SELF-MIRROR FIGHTING SYSTEM</span>
            <span className="text-white/40">NO PAY-TO-WIN</span>
          </span>
        </div>
      </div>
      )}
    </div>
  );
}
