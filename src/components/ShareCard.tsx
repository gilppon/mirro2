import { useCallback, useRef, useState } from 'react';
import DnaRadar from './DnaRadar';
import { ARCHETYPE_META, CORE_KEYS, DNA_LABELS, archetypeOf, archetypeTraits, type DNA, type RawProfile } from '../game/dna';

interface Props {
  dna: DNA;
  raw: RawProfile;
  name: string;
  generation: number;
  power: number;
  rating: number;
  wins: number;
  losses: number;
  stageLv: number;
  stageKr: string;
  reads: number;
  breaks: number;
  onClose: () => void;
}

const FRAMES = [
  { id: 'neon', kr: '네온', bg: 'linear-gradient(140deg,#0a1128,#1a0a24 60%,#04060d)' },
  { id: 'chrome', kr: '크롬', bg: 'linear-gradient(140deg,#151a26,#2b3243 55%,#0a0d14)' },
  { id: 'blood', kr: '배신자', bg: 'linear-gradient(140deg,#2a0813,#4a0f22 55%,#0d0407)' },
  { id: 'void', kr: '보이드', bg: 'linear-gradient(140deg,#0a0a12,#191428 60%,#050508)' },
];

export default function ShareCard(p: Props) {
  const [frame, setFrame] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const arch = archetypeOf(p.dna);
  const meta = ARCHETYPE_META[arch.type];
  const traits = archetypeTraits(arch.type, p.dna, p.raw);
  const core = DNA_LABELS.filter((l) => CORE_KEYS.includes(l.key));
  const total = p.reads + p.breaks;
  const readRate = total ? Math.round((p.reads / total) * 100) : 0;

  const shareText =
    `나의 전투 타입: ${arch.type.replace(/_/g, ' ')} ${arch.score}%\n` +
    `${p.name} GEN ${p.generation} · POWER ${p.power} · RATING ${p.rating}\n` +
    `공격성 ${p.dna.aggression} / 방어성 ${p.dna.defense} / 반복성 ${p.dna.repetition} / 패닉 ${p.dna.panic}\n` +
    `SIMULA Lv.${p.stageLv} ${p.stageKr} · 피독률 ${readRate}%\n` +
    `#MirrorNeuralBrawler #CombatDNA`;

  const copy = useCallback(() => {
    navigator.clipboard?.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => { /* noop */ });
  }, [shareText]);

  // SVG → PNG 내보내기 (외부 의존 없이). 공유/저장이 같은 캔버스를 재사용.
  const renderCard = useCallback(() => {
    const W = 1200, H = 630;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    if (!c) return null;
    const g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#0a1128'); g.addColorStop(0.6, '#1a0a24'); g.addColorStop(1, '#04060d');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // 글로우
    const rg = c.createRadialGradient(W * 0.78, H * 0.3, 20, W * 0.78, H * 0.3, 420);
    rg.addColorStop(0, `${meta.color}33`); rg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = rg; c.fillRect(0, 0, W, H);
    // 그리드
    c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1;
    for (let x = 0; x < W; x += 44) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (let y = 0; y < H; y += 44) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }

    c.fillStyle = 'rgba(255,255,255,.45)';
    c.font = '600 20px monospace';
    c.fillText('MIRROR NEURAL BRAWLER · COMBAT DNA', 62, 74);

    c.fillStyle = '#fff'; c.font = '700 26px sans-serif';
    c.fillText('당신의 전투 타입', 62, 138);
    c.fillStyle = meta.color; c.font = '900 86px sans-serif';
    c.fillText(`${arch.type.replace(/_/g, ' ')}`, 62, 226);
    c.fillStyle = '#fff'; c.font = '900 52px monospace';
    c.fillText(`${arch.score}%`, 62, 290);
    c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '500 24px sans-serif';
    c.fillText(`${meta.kr} · ${meta.tagline}`, 170, 288);

    // 지표
    let y = 356;
    c.font = '600 22px sans-serif';
    for (const l of core.slice(0, 6)) {
      const v = p.dna[l.key] ?? 0;
      c.fillStyle = 'rgba(255,255,255,.55)';
      c.fillText(l.kr, 62, y);
      c.fillStyle = 'rgba(255,255,255,.1)';
      c.fillRect(210, y - 16, 300, 12);
      c.fillStyle = v > 70 ? '#fb7185' : v > 45 ? meta.color : '#7dffc2';
      c.fillRect(210, y - 16, 300 * (v / 100), 12);
      c.fillStyle = '#fff'; c.font = '700 22px monospace';
      c.fillText(String(v).padStart(2, '0'), 528, y);
      c.font = '600 22px sans-serif';
      y += 40;
    }

    // 우측 정보
    c.textAlign = 'right';
    c.fillStyle = 'rgba(255,255,255,.4)'; c.font = '600 20px monospace';
    c.fillText(`${p.name} · GEN ${p.generation}`, W - 62, 138);
    c.fillStyle = '#fff'; c.font = '900 40px monospace';
    c.fillText(`POWER ${p.power}`, W - 62, 190);
    c.fillStyle = 'rgba(255,255,255,.55)'; c.font = '600 22px monospace';
    c.fillText(`RATING ${p.rating} · ${p.wins}승 ${p.losses}패`, W - 62, 226);
    c.fillStyle = meta.color;
    c.fillText(`SIMULA Lv.${p.stageLv} ${p.stageKr}`, W - 62, 262);
    c.fillStyle = readRate > 50 ? '#fb7185' : '#7dffc2';
    c.fillText(`피독률 ${readRate}%`, W - 62, 298);

    c.textAlign = 'left';
    c.fillStyle = 'rgba(255,255,255,.35)'; c.font = '500 20px sans-serif';
    traits.slice(0, 2).forEach((t, i) => c.fillText(`▸ ${t}`, 62, 600 + i * 0 - 40 + i * 28));
    c.fillStyle = 'rgba(255,255,255,.25)'; c.font = '600 18px monospace';
    c.textAlign = 'right';
    c.fillText('#MirrorNeuralBrawler', W - 62, H - 40);

    return cv;
  }, [arch, meta, p, core, traits, readRate]);

  const download = useCallback(() => {
    const cv = renderCard();
    if (!cv) return;
    cv.toBlob((b) => {
      if (!b) return;
      const url = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = url; a.download = `${p.name}-combat-dna.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    });
  }, [renderCard, p]);

  // 모바일 바이럴 루프: Web Share API 파일 공유 → 텍스트 공유 순 폴백
  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
  const share = useCallback(() => {
    const cv = renderCard();
    if (!cv) return;
    cv.toBlob((b) => {
      const file = b ? [new File([b], `${p.name}-combat-dna.png`, { type: 'image/png' })] : [];
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (file.length && nav.canShare?.({ files: file })) {
        nav.share({ files: file, title: 'Combat DNA', text: shareText }).catch(() => { /* dismissed */ });
      } else if ('share' in navigator) {
        (navigator as Navigator & { share: (d: { title: string; text: string }) => Promise<void> })
          .share({ title: 'Combat DNA', text: shareText }).catch(() => { /* dismissed */ });
      }
    });
  }, [renderCard, p, shareText]);

  return (
    <div className="fixed inset-0 z-[58] overflow-y-auto bg-black/93 p-4 backdrop-blur-sm">
      <div className="mx-auto max-w-3xl py-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.3em] text-fuchsia-300/80">SHAREABLE PROFILE CARD</span>
          <button onClick={p.onClose} className="rounded border border-white/20 px-3 py-1.5 font-mono text-[10px] tracking-widest text-white/55 transition hover:bg-white/10">
            ✕ 닫기
          </button>
        </div>

        {/* 카드 프리뷰 */}
        <div
          ref={ref}
          className="relative overflow-hidden rounded-xl border"
          style={{ borderColor: `${meta.color}55`, background: FRAMES[frame].bg, aspectRatio: '1200 / 630' }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:34px_34px]" />
          <div
            className="pointer-events-none absolute right-0 top-0 h-full w-1/2"
            style={{ background: `radial-gradient(circle at 70% 30%, ${meta.color}33, transparent 65%)` }}
          />
          <div className="pointer-events-none absolute -right-4 top-4 select-none text-[190px] leading-none opacity-[0.09]">
            {meta.icon}
          </div>

          <div className="relative flex h-full flex-col justify-between p-[4%]">
            <div className="flex items-start justify-between">
              <span className="font-mono text-[clamp(7px,1.1vw,12px)] tracking-[0.3em] text-white/45">
                MIRROR NEURAL BRAWLER · COMBAT DNA
              </span>
              <div className="text-right font-mono">
                <div className="text-[clamp(7px,1vw,11px)] text-white/40">{p.name} · GEN {p.generation}</div>
                <div className="text-[clamp(12px,2.2vw,26px)] font-black text-white">POWER {p.power}</div>
                <div className="text-[clamp(7px,1vw,11px)] text-white/50">RATING {p.rating} · {p.wins}승 {p.losses}패</div>
              </div>
            </div>

            <div className="flex items-end gap-[3%]">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[clamp(7px,1.1vw,12px)] tracking-[0.25em] text-white/45">당신의 전투 타입</div>
                <div
                  className="truncate text-[clamp(20px,4.6vw,54px)] font-black leading-none tracking-tighter"
                  style={{ color: meta.color, textShadow: `0 0 30px ${meta.color}66` }}
                >
                  {arch.type.replace(/_/g, ' ')}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-[clamp(14px,2.6vw,30px)] font-black text-white">{arch.score}%</span>
                  <span className="truncate text-[clamp(8px,1.3vw,15px)] text-white/55">{meta.kr} · {meta.tagline}</span>
                </div>
                <ul className="mt-[2%] space-y-[2px]">
                  {traits.slice(0, 2).map((t) => (
                    <li key={t} className="truncate text-[clamp(7px,1.15vw,13px)] text-white/50">▸ {t}</li>
                  ))}
                </ul>
              </div>
              <div className="hidden w-[26%] shrink-0 sm:block">
                <DnaRadar dna={p.dna} color={meta.color} size={180} labels={false} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-[1.5%] sm:grid-cols-5">
              {core.slice(0, 5).map((l) => {
                const v = p.dna[l.key] ?? 0;
                return (
                  <div key={l.key} className="rounded border border-white/10 bg-black/35 px-[6%] py-[4%]">
                    <div className="truncate font-mono text-[clamp(5px,0.85vw,9px)] text-white/35">{l.kr}</div>
                    <div className="font-mono text-[clamp(11px,2vw,22px)] font-black text-white/90">{v}</div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between font-mono text-[clamp(6px,1vw,11px)]">
              <span style={{ color: meta.color }}>SIMULA Lv.{p.stageLv} {p.stageKr}</span>
              <span className={readRate > 50 ? 'text-rose-300' : 'text-emerald-300'}>피독률 {readRate}%</span>
              <span className="text-white/25">#MirrorNeuralBrawler</span>
            </div>
          </div>
        </div>

        {/* 프레임 선택 */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] tracking-widest text-white/35">프레임</span>
          {FRAMES.map((f, i) => (
            <button
              key={f.id}
              onClick={() => setFrame(i)}
              className={`rounded border px-2.5 py-1 font-mono text-[10px] tracking-wider transition ${
                frame === i ? 'border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-200' : 'border-white/12 text-white/40 hover:bg-white/5'
              }`}
            >
              {f.kr}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={download} className="flex-1 rounded-md border border-cyan-300/50 bg-cyan-400/15 py-2.5 font-mono text-xs font-bold tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-400/25">
            ⤓ PNG 저장 (1200×630)
          </button>
          {canNativeShare && (
            <button onClick={share} className="flex-1 rounded-md border border-fuchsia-400/50 bg-fuchsia-500/15 py-2.5 font-mono text-xs font-bold tracking-[0.2em] text-fuchsia-100 transition hover:bg-fuchsia-500/25">
              ↗ 공유하기
            </button>
          )}
          <button onClick={copy} className="flex-1 rounded-md border border-white/20 py-2.5 font-mono text-xs tracking-[0.2em] text-white/70 transition hover:bg-white/10">
            {copied ? '✓ 복사됨' : '⧉ 텍스트 복사'}
          </button>
        </div>

        <pre className="mt-3 whitespace-pre-wrap rounded-md border border-white/10 bg-black/40 px-3 py-2 font-mono text-[10.5px] leading-relaxed text-white/45">
{shareText}
        </pre>
      </div>
    </div>
  );
}
