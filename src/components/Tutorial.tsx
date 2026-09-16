import { useEffect, useState } from 'react';

// ─────────────────────────────────────────────────────────────
//  TUTORIAL — 첫 3분 온보딩 (Phase 1, E-3)
//  1. 조작  2. 캔슬 콤보  3. 이 게임의 핵심(역-학습)
//  첫 진입 1회만 표시. localStorage 'mnb.tutorial.v1' = 'done'
// ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    tag: '01 / CONTROLS',
    title: '움직이고, 때립니다',
    body: '방향키·WASD로 이동, Space로 점프, Shift로 가드합니다. 공격은 네 개 — J 약타격, K 강타격, L 하단, I 잡기.',
    keys: [
      ['← →', '이동 / 두 번 = 대시'],
      ['J K L I', '약 · 강 · 하단 · 잡기'],
      ['Space', '점프'],
      ['Shift', '가드 (누른 채 + ↓ = 하단가드)'],
    ] as [string, string][],
  },
  {
    tag: '02 / COMBO',
    title: '캔슬로 연결합니다',
    body: '약타격(J)이 맞는 순간, 시동 프레임이 남아 있습니다. 그 틈에 다음 기술을 넣으면 콤보가 됩니다. ↓↘→ 계열의 특수기는 커맨드 입력 또는 직행 키로 쓸 수 있습니다.',
    keys: [
      ['J → K', '약 → 강 캔슬 (기본 연결)'],
      ['↓↘→ + 공격', '미러파 (장풍)'],
      ['→↓↘ + 공격', '리플렉스 어퍼 (무적 대공)'],
      ['O', '노이즈 버스트 (가드 불가, 게이지 50)'],
    ] as [string, string][],
  },
  {
    tag: '03 / THE MIRROR',
    title: '당신이 읽힙니다',
    body: '시뮬라는 당신의 입력을 학습합니다. 점프를 반복하면 점프를 잡고, 하단 뒤 잡기를 반복하면 그 연결을 기다립니다. "READ MOMENT"가 뜨는 순간이 습관이 들킨 순간입니다 — 같은 수를 두 번 쓰지 마십시오. 예측을 벗어날수록 게이지가 오릅니다.',
    keys: [
      ['READ', '습관이 예측당함 — 피해를 입습니다'],
      ['UNREADABLE', '예측을 벗어남 — 게이지 보너스'],
      ['진화', '시뮬라는 라운드마다 당신을 더 닮아갑니다'],
    ] as [string, string][],
  },
];

export default function Tutorial({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  // Enter로 진행
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); last ? onDone() : setStep((v) => v + 1); }
      if (e.key === 'Escape') { e.preventDefault(); onDone(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [last, onDone]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-cyan-400/40 bg-[#070b16]/95 shadow-[0_0_60px_rgba(34,211,238,.18)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <span className="font-mono text-[10px] tracking-[0.3em] text-cyan-300/80">{s.tag}</span>
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 w-6 rounded-full ${i <= step ? 'bg-cyan-400' : 'bg-white/15'}`} />
            ))}
          </div>
        </div>

        <div className="px-6 py-6">
          <h2 className="text-xl font-black tracking-tight text-white md:text-2xl">{s.title}</h2>
          <p className="mt-3 text-[13px] leading-relaxed text-white/70">{s.body}</p>
          <div className="mt-5 space-y-2">
            {s.keys.map(([k, d]) => (
              <div key={k} className="flex items-center gap-3">
                <kbd className="min-w-[92px] rounded border border-cyan-400/40 bg-cyan-400/10 px-2 py-1 text-center font-mono text-[11px] font-bold text-cyan-200">
                  {k}
                </kbd>
                <span className="text-[12px] text-white/60">{d}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
          <button
            onClick={onDone}
            className="font-mono text-[11px] text-white/40 transition hover:text-white/70"
          >
            건너뛰기 (ESC)
          </button>
          <button
            onClick={() => (last ? onDone() : setStep((v) => v + 1))}
            className="rounded-md border border-cyan-400/60 bg-cyan-500/20 px-6 py-2 font-mono text-[12px] font-bold tracking-[0.2em] text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,.25)] transition hover:bg-cyan-500/30 active:scale-95"
          >
            {last ? '훈련 시작 →' : '다음 →'}
          </button>
        </div>
      </div>
    </div>
  );
}

const TKEY = 'mnb.tutorial.v1';

export function tutorialDone(): boolean {
  try { return localStorage.getItem(TKEY) === 'done'; } catch { return true; }
}

export function markTutorialDone() {
  try { localStorage.setItem(TKEY, 'done'); } catch { /* noop */ }
}