import { useState } from 'react';
import {
  BASE_PRICE, CATALOG, FAIR_PLAY_STATEMENT, type StoreItem, type Wallet,
} from '../game/store';

interface Props {
  wallet: Wallet;
  aiName: string;
  onBuy: (item: StoreItem) => void;
  onEquip: (item: StoreItem) => void;
  onRename: () => void;
  onClose: () => void;
}

const TABS: { k: string; label: string; kinds: string[] }[] = [
  { k: 'all', label: '전체', kinds: ['dlc', 'pass', 'skin', 'hud', 'fx', 'utility'] },
  { k: 'dlc', label: 'DLC', kinds: ['dlc'] },
  { k: 'pass', label: '시즌 패스', kinds: ['pass'] },
  { k: 'cos', label: '코스메틱', kinds: ['skin', 'hud', 'fx'] },
  { k: 'util', label: '편의 기능', kinds: ['utility'] },
];

function Price({ v }: { v: number }) {
  if (v === 0) return <span className="font-mono text-[11px] text-emerald-300">기본 제공</span>;
  return <span className="font-mono text-[13px] font-black text-white">${v.toFixed(2)}</span>;
}

export default function StoreScreen({ wallet, aiName, onBuy, onEquip, onRename, onClose }: Props) {
  const [tab, setTab] = useState('all');
  const kinds = TABS.find((t) => t.k === tab)?.kinds ?? [];
  const items = CATALOG.filter((i) => kinds.includes(i.kind));

  return (
    <div className="fixed inset-0 z-[55] overflow-y-auto bg-[#04060d]/97 backdrop-blur-sm">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(217,70,239,.12),transparent_55%)]" />

      <div className="relative mx-auto max-w-5xl px-4 py-6">
        {/* 헤더 */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-fuchsia-300/80">MIRROR NEURAL BRAWLER · STORE</div>
            <h2 className="text-2xl font-black tracking-tight md:text-3xl">AI 분신을 꾸미고, 리그를 확장하세요</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded border border-white/20 px-3 py-1.5 font-mono text-[10px] tracking-widest text-white/55 transition hover:bg-white/10"
          >
            ✕ 닫기
          </button>
        </div>

        {/* 본편 */}
        <div className="mt-4 overflow-hidden rounded-lg border border-cyan-300/25 bg-gradient-to-r from-cyan-500/[0.1] to-transparent">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <div className="font-mono text-[10px] tracking-[0.25em] text-cyan-300/80">BASE GAME · STEAM</div>
              <div className="mt-0.5 text-lg font-black text-white">본편 — 전 모드 · 전 시스템 포함</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {['Mirror Battle', 'Ghost Upload', 'AI League', 'Habit Dungeon', 'Combat DNA', 'SIMULA 6단계 진화'].map((s) => (
                  <span key={s} className="rounded border border-white/15 bg-black/30 px-1.5 py-0.5 font-mono text-[9px] text-white/55">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-3xl font-black text-white">${BASE_PRICE}</div>
              <div className="font-mono text-[9px] text-emerald-300/70">구매 완료 · 소유 중</div>
            </div>
          </div>
          <div className="border-t border-white/10 bg-black/30 px-4 py-2 font-mono text-[10px] text-white/40">
            무료 게임이 아닌 <b className="text-white/70">단일 유료 구매</b> 모델입니다. 본편에 모든 핵심 루프가 포함되며, 추가 판매는 확장·외형·편의 기능에 한정됩니다.
          </div>
        </div>

        {/* 페어플레이 서약 */}
        <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[15px] text-emerald-300">✓</span>
            <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-emerald-300">NO PAY-TO-WIN GUARANTEE</span>
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-white/65">{FAIR_PLAY_STATEMENT}</p>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            <div className="rounded border border-rose-400/25 bg-rose-500/[0.06] px-2.5 py-1.5">
              <div className="font-mono text-[9px] tracking-[0.2em] text-rose-300/70">판매하지 않는 것</div>
              <div className="text-[11.5px] text-white/60">능력치 강화 · 데미지 증가 · 학습 가속 · 매칭 보정 · 습관 자동 교정</div>
            </div>
            <div className="rounded border border-cyan-400/25 bg-cyan-400/[0.06] px-2.5 py-1.5">
              <div className="font-mono text-[9px] tracking-[0.2em] text-cyan-300/70">판매하는 것</div>
              <div className="text-[11.5px] text-white/60">외형 · 아레나 · 분석 도구 · 저장 슬롯 · 시즌 참가</div>
            </div>
          </div>
        </div>

        {/* 내 AI 커스터마이징 */}
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-mono text-[10px] tracking-[0.25em] text-white/40">MY FIGHTER</div>
              <div className="text-lg font-black text-white">{aiName}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] text-white/40">
                이름 변경권 <b className="text-emerald-300">{wallet.renames}</b>회 · 리플레이 슬롯 <b className="text-cyan-300">{wallet.replaySlots}</b>
              </span>
              <button
                onClick={onRename}
                disabled={wallet.renames <= 0}
                className="rounded border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 font-mono text-[10px] tracking-widest text-emerald-200 transition enabled:hover:bg-emerald-400/20 disabled:opacity-30"
              >
                ✎ 이름 변경
              </button>
            </div>
          </div>
        </div>

        {/* 탭 */}
        <div className="mt-4 flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`rounded px-3 py-1.5 font-mono text-[10px] tracking-widest transition ${
                tab === t.k ? 'bg-fuchsia-500/20 text-fuchsia-200' : 'text-white/40 hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 상품 */}
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => {
            const owned = wallet.owned.includes(it.id) || it.price === 0;
            const equipped = wallet.equippedSkin === it.id || wallet.equippedHud === it.id;
            const equippable = it.kind === 'skin' || it.kind === 'hud';
            return (
              <div
                key={it.id}
                className="relative flex flex-col overflow-hidden rounded-lg border p-3"
                style={{ borderColor: `${it.color}30`, background: `${it.color}0b` }}
              >
                <div className="pointer-events-none absolute -right-2 -top-3 select-none text-[54px] leading-none opacity-[0.09]">
                  {it.icon}
                </div>
                <div className="relative flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[9px] tracking-[0.25em]" style={{ color: it.color }}>{it.sub}</span>
                    {it.tag && (
                      <span className="rounded-sm border px-1 py-0.5 font-mono text-[8px]"
                        style={{ borderColor: `${it.color}40`, color: `${it.color}cc` }}>
                        {it.tag}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[15px] font-black text-white">{it.name}</div>
                  <p className="mt-1 text-[11.5px] leading-snug text-white/50">{it.desc}</p>
                  {it.bullets && (
                    <ul className="mt-1.5 space-y-0.5">
                      {it.bullets.map((b) => (
                        <li key={b} className="flex gap-1.5 font-mono text-[10px] text-white/40">
                          <span style={{ color: it.color }}>▸</span>{b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="relative mt-2.5 flex items-center justify-between gap-2 border-t border-white/10 pt-2">
                  <Price v={it.price} />
                  {owned ? (
                    equippable ? (
                      <button
                        onClick={() => onEquip(it)}
                        disabled={equipped}
                        className="rounded border px-2.5 py-1 font-mono text-[10px] tracking-widest transition enabled:hover:brightness-150 disabled:opacity-50"
                        style={{ borderColor: `${it.color}55`, background: `${it.color}18`, color: it.color }}
                      >
                        {equipped ? '장착 중' : '장착'}
                      </button>
                    ) : (
                      <span className="font-mono text-[10px] tracking-widest text-emerald-300">✓ 보유 중</span>
                    )
                  ) : (
                    <button
                      onClick={() => onBuy(it)}
                      className="rounded border px-3 py-1 font-mono text-[10px] font-bold tracking-widest transition hover:brightness-150 active:scale-95"
                      style={{ borderColor: `${it.color}55`, background: `${it.color}1c`, color: it.color }}
                    >
                      구매
                    </button>
                  )}
                </div>

                {it.cosmetic && it.kind !== 'utility' && (
                  <div className="relative mt-1 font-mono text-[8.5px] text-white/25">전투 성능 영향 없음</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-black/30 px-4 py-3 font-mono text-[10px] leading-relaxed text-white/35">
          ※ 본 화면은 상점 UI 데모입니다. 실제 결제는 발생하지 않으며 구매 버튼은 로컬에 소유 상태만 기록합니다.
          시즌 패스는 자동 갱신되지 않는 단건 구매 방식이며, 시즌 종료 후에도 획득한 코스메틱은 영구 보유됩니다.
        </div>
      </div>
    </div>
  );
}
