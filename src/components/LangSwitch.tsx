import { useState } from 'react';
import { LANGS, useI18n, type Lang } from '../i18n';

interface Props {
  variant?: 'full' | 'compact';
  onPick?: () => void;
}

export default function LangSwitch({ variant = 'compact', onPick }: Props) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);

  if (variant === 'full') {
    return (
      <div className="grid grid-cols-3 gap-2">
        {LANGS.map((l) => {
          const on = l.id === lang;
          return (
            <button
              key={l.id}
              onClick={() => { setLang(l.id as Lang); onPick?.(); }}
              className="group relative overflow-hidden rounded-md border py-3 transition"
              style={{
                borderColor: on ? 'rgba(103,232,249,.6)' : 'rgba(255,255,255,.12)',
                background: on ? 'rgba(103,232,249,.12)' : 'rgba(255,255,255,.02)',
              }}
            >
              <div className="text-2xl leading-none">{l.flag}</div>
              <div className="mt-1.5 text-[13px] font-black text-white/85">{l.native}</div>
              <div className="font-mono text-[9px] tracking-widest text-white/35">{l.label}</div>
              {on && (
                <span className="absolute inset-x-0 bottom-0 h-[3px] bg-cyan-300"
                  style={{ boxShadow: '0 0 10px #67e8f9' }} />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded border border-white/15 bg-black/50 px-2 py-1 font-mono text-[9px] tracking-widest text-white/60 backdrop-blur transition hover:bg-white/15"
      >
        <span>{LANGS.find((l) => l.id === lang)?.flag}</span>
        <span>{LANGS.find((l) => l.id === lang)?.label}</span>
        <span className="text-white/30">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-36 overflow-hidden rounded-md border border-white/15 bg-[#070a14]/97 backdrop-blur">
            {LANGS.map((l) => (
              <button
                key={l.id}
                onClick={() => { setLang(l.id as Lang); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-white/10"
                style={{ background: l.id === lang ? 'rgba(103,232,249,.12)' : undefined }}
              >
                <span>{l.flag}</span>
                <span className="flex-1 text-[12px] text-white/80">{l.native}</span>
                {l.id === lang && <span className="text-cyan-300">●</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
