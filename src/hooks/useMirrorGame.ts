import { useCallback, useEffect, useRef, useState } from 'react';
import { Engine, type MatchStats } from '../game/engine';
import { render } from '../game/render';
import { sfx } from '../game/audio';
import { ARENA, type AttackId, type Intent, type Phase } from '../game/types';
import type { BrainSnapshot } from '../game/brain';
import type { MissionSnap } from '../components/MissionHud';

export type BtnId = 'left' | 'right' | 'down' | 'block' | 'jump' | 'dashF' | 'dashB'
  | 'light' | 'heavy' | 'low' | 'grab' | 'burst'
  | 'wave' | 'upper' | 'slide' | 'super';

// ── 커맨드 인식: 방향 토큰 시퀀스 매칭 ─────────────
type DirTok = 'n' | 'f' | 'b' | 'd' | 'df' | 'db' | 'u';

const IS_F = (t: DirTok) => t === 'f' || t === 'df';
const IS_B = (t: DirTok) => t === 'b' || t === 'db';
const IS_D = (t: DirTok) => t === 'd' || t === 'df' || t === 'db';

/** 부분수열 매칭 (마지막 매치 인덱스 반환, 실패 시 -1) */
function matchSeq(toks: DirTok[], tests: ((t: DirTok) => boolean)[]): number {
  let ti = 0;
  for (let i = 0; i < toks.length; i++) {
    if (tests[ti](toks[i])) {
      ti++;
      if (ti === tests.length) return i;
    }
  }
  return -1;
}

export type Motion = 'none' | 'qcf' | 'dp' | 'qcb' | 'dqcf';

export function detectMotion(log: { d: DirTok; t: number }[], now: number): Motion {
  const win = log.filter((e) => now - e.t < 620);
  if (win.length < 2) return 'none';
  const toks = win.map((e) => e.d);
  // 커맨드 마무리 방향은 버튼 입력 직전(320ms 이내)이어야 성립
  const fresh = (idx: number) => idx >= 0 && now - win[idx].t < 320;

  const i4 = matchSeq(toks, [IS_D, IS_F, IS_D, IS_F]);
  if (fresh(i4)) return 'dqcf';
  const iDp = matchSeq(toks, [(t) => t === 'f', IS_D, IS_F]);
  if (fresh(iDp)) return 'dp';
  const iB = matchSeq(toks, [IS_D, IS_B]);
  if (fresh(iB)) return 'qcb';
  const iF = matchSeq(toks, [IS_D, IS_F]);
  if (fresh(iF)) return 'qcf';
  return 'none';
}

export interface GameSnapshot {
  phase: Phase;
  round: number;
  wins: [number, number];
  timeLeft: number;
  pHp: number; aHp: number;
  pMeter: number; aMeter: number;
  pCombo: number; aCombo: number;
  desync: boolean;
  matchWinner: 'player' | 'simula' | null;
  stats: MatchStats;
  brain: BrainSnapshot;
  names: [string, string];
  isAiMatch: boolean;
  samples: number;
  drillId: string | null;
  drillProgress: number;
  drillFails: number;
  drillDone: boolean;
  mission: MissionSnap | null;
  reads: number;
  breaks: number;
  readStreak: number;
  worstStreak: number;
}

/** HUD 스냅샷 더티체크 키 — 스칼라만으로 구성해 할당 없이 비교. 중립 상황 리렌더 제거. */
function snapKey(eng: Engine): string {
  const r = eng.run;
  const mission = r ? `${r.mission.id}|${r.failed ? 1 : 0}|${r.cleared ? 1 : 0}|${r.states.map((s) => `${s.ok ? 1 : 0}:${s.count}`).join(",")}` : "-";
  return [
    eng.phase, eng.round, eng.wins[0], eng.wins[1], Math.max(0, Math.ceil(eng.timeLeft / 60)),
    eng.p.hp, eng.a.hp, eng.p.meter, eng.a.meter,
    eng.brain.desync > 0 ? 1 : 0, eng.matchWinner ?? "-",
    eng.recorder.totalActs, eng.drill?.id ?? "-", eng.drillProgress, eng.drillFails, eng.drillDone ? 1 : 0,
    eng.tally.reads, eng.tally.breaks, eng.tally.streak, eng.tally.worstStreak,
    mission,
  ].join("|");
}

function snap(eng: Engine): GameSnapshot {
  return {
    phase: eng.phase,
    round: eng.round,
    wins: [eng.wins[0], eng.wins[1]],
    timeLeft: Math.max(0, Math.ceil(eng.timeLeft / 60)),
    pHp: eng.p.hp, aHp: eng.a.hp,
    pMeter: eng.p.meter, aMeter: eng.a.meter,
    pCombo: eng.a.combo, aCombo: eng.p.combo,
    desync: eng.brain.desync > 0,
    matchWinner: eng.matchWinner,
    stats: { ...eng.stats },
    brain: eng.brain.snapshot(),
    names: [eng.names[0], eng.names[1]],
    isAiMatch: !!eng.aBot && !!eng.pBot,
    samples: eng.recorder.totalActs,
    drillId: eng.drill?.id ?? null,
    drillProgress: eng.drillProgress,
    drillFails: eng.drillFails,
    drillDone: eng.drillDone,
    reads: eng.tally.reads,
    breaks: eng.tally.breaks,
    readStreak: eng.tally.streak,
    worstStreak: eng.tally.worstStreak,
    mission: eng.run
      ? {
        id: eng.run.mission.id,
        title: eng.run.mission.title,
        color: eng.run.mission.color,
        failed: eng.run.failed,
        cleared: eng.run.cleared,
        failReason: eng.run.failReason,
        rules: eng.run.states.map((s) => ({
          label: s.rule.label,
          detail: s.detail,
          ok: s.ok,
          kind: s.rule.kind,
          count: s.count,
          limit: s.rule.limit,
        })),
      }
      : null,
  };
}

export function useMirrorGame(active: boolean, spectate = false) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engRef = useRef<Engine | null>(null);
  if (!engRef.current) engRef.current = new Engine();

  const input = useRef({
    left: false, right: false, down: false, block: false,
    jump: false, dash: 0, attack: null as AttackId | null,
    lastL: 0, lastR: 0, lastPress: 0,
    aAge: 0, jAge: 0, dAge: 0,
    dirLog: [] as { d: DirTok; t: number }[],
    lastDir: 'n' as DirTok,
    motionFlash: { m: 'none' as Motion, t: 0 },
  });

  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => snap(engRef.current!));

  const doAttack = useCallback((a: AttackId) => {
    const now = performance.now();
    const i = input.current;
    if (i.lastPress) engRef.current?.brain.observeTap(now - i.lastPress);
    i.lastPress = now;
    i.attack = a;
    i.aAge = 0;
  }, []);

  // 커맨드 입력 → 필살기 변환
  const doAttackWithMotion = useCallback((base: AttackId) => {
    const i = input.current;
    const eng = engRef.current!;
    const now = performance.now();
    const motion = detectMotion(i.dirLog, now);
    let out: AttackId = base;
    if (motion === 'dqcf' && eng.p.meter >= 100) out = 'super';
    else if (motion === 'dp') out = 'upper';
    else if (motion === 'qcb') out = 'slide';
    else if (motion === 'qcf') out = 'wave';
    if (out !== base) {
      i.dirLog = [];
      i.motionFlash = { m: motion, t: now };
    }
    doAttack(out);
  }, [doAttack]);

  const press = useCallback((b: BtnId) => {
    const i = input.current;
    const now = performance.now();
    switch (b) {
      case 'left':
        if (now - i.lastL < 260) i.dash = -1;
        i.lastL = now; i.left = true; break;
      case 'right':
        if (now - i.lastR < 260) i.dash = 1;
        i.lastR = now; i.right = true; break;
      case 'down': i.down = true; break;
      case 'block': i.block = true; break;
      case 'jump': i.jump = true; break;
      case 'dashF': i.dash = engRef.current ? engRef.current.p.facing : 1; break;
      case 'dashB': i.dash = engRef.current ? -engRef.current.p.facing : -1; break;
      case 'light': case 'heavy': case 'low':
        doAttackWithMotion(b); break;
      case 'grab': case 'burst':
        doAttack(b); break;
      case 'wave': case 'upper': case 'slide': case 'super':
        doAttack(b); break;
    }
  }, [doAttack, doAttackWithMotion]);

  const release = useCallback((b: BtnId) => {
    const i = input.current;
    if (b === 'left') i.left = false;
    else if (b === 'right') i.right = false;
    else if (b === 'down') i.down = false;
    else if (b === 'block') i.block = false;
  }, []);

  const restart = useCallback(() => {
    engRef.current?.resetMatch();
    setSnapshot(snap(engRef.current!));
  }, []);

  // ── 키보드
  useEffect(() => {
    if (!active || spectate) return;
    const KEYS: Record<string, BtnId> = {
      arrowleft: 'left', a: 'left',
      arrowright: 'right', d: 'right',
      arrowdown: 'down', s: 'down',
      arrowup: 'jump', w: 'jump', ' ': 'jump',
      shift: 'block',
      j: 'light', k: 'heavy', l: 'low', i: 'grab', u: 'grab',
      o: 'burst', enter: 'burst',
      q: 'dashB', e: 'dashF',
      // 커맨드가 어려울 때를 위한 직행 키
      '1': 'wave', '2': 'upper', '3': 'slide', '4': 'super', r: 'super',
    };
    const down = (ev: KeyboardEvent) => {
      const k = ev.key.toLowerCase();
      const b = KEYS[k];
      if (!b) return;
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(k)) ev.preventDefault();
      if (ev.repeat) {
        if (b === 'left' || b === 'right' || b === 'down' || b === 'block') return;
        return;
      }
      press(b);
    };
    const up = (ev: KeyboardEvent) => {
      const b = KEYS[ev.key.toLowerCase()];
      if (b) release(b);
    };
    const blur = () => {
      const i = input.current;
      i.left = i.right = i.down = i.block = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [active, spectate, press, release]);

  // ── 시선(포인터) 추적
  useEffect(() => {
    if (!active) return;
    const el = canvasRef.current;
    if (!el) return;
    const onMove = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const nx = (ev.clientX - r.left) / Math.max(1, r.width);
      const ny = (ev.clientY - r.top) / Math.max(1, r.height);
      if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) {
        engRef.current?.brain.observeGaze(nx, ny, performance.now());
      }
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [active]);

  // ── 메인 루프
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const eng = engRef.current!;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = ARENA.w * dpr;
    canvas.height = ARENA.h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let tick = 0;
    let lastKey = '';
    let pHp = eng.p.hp, aHp = eng.a.hp, prevPhase = eng.phase, prevMirror = 0, prevProj = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      let dt = now - last;
      last = now;
      if (dt > 120) dt = 120;
      acc += dt;
      let steps = 0;
      while (acc >= 16.6667 && steps < 4) {
        const i = input.current;

        // 방향 토큰 기록 (커맨드 인식용, 캐릭터 방향 기준)
        const fwdRight = eng.p.facing === 1;
        const h = (i.right ? 1 : 0) + (i.left ? -1 : 0);
        const fb = h === 0 ? 0 : (h > 0) === fwdRight ? 1 : -1;
        let tok: DirTok = 'n';
        if (i.down) tok = fb > 0 ? 'df' : fb < 0 ? 'db' : 'd';
        else if (fb > 0) tok = 'f';
        else if (fb < 0) tok = 'b';
        if (tok !== i.lastDir) {
          i.lastDir = tok;
          if (tok !== 'n') {
            i.dirLog.push({ d: tok, t: now });
            if (i.dirLog.length > 12) i.dirLog.shift();
          }
        }

        const intent: Intent = {
          moveDir: (i.right ? 1 : 0) + (i.left ? -1 : 0),
          dash: i.dash,
          jump: i.jump,
          crouch: i.down,
          block: i.block,
          attack: i.attack,
        };
        eng.step(intent);

        // 선입력 버퍼 (약 6프레임) — 경직 중 입력도 살려준다
        if (i.attack) {
          if (eng.p.state === 'attack' && eng.p.moveFrame <= 1) { i.attack = null; i.aAge = 0; }
          else if (++i.aAge > 6) { i.attack = null; i.aAge = 0; }
        }
        if (i.jump) {
          if (eng.p.state === 'jump') { i.jump = false; i.jAge = 0; }
          else if (++i.jAge > 5) { i.jump = false; i.jAge = 0; }
        }
        if (i.dash !== 0) {
          if (eng.p.state === 'dash') { i.dash = 0; i.dAge = 0; }
          else if (++i.dAge > 5) { i.dash = 0; i.dAge = 0; }
        }
        acc -= 16.6667;
        steps++;
        tick++;

        // 사운드 훅
        if (eng.p.hp < pHp) sfx.hit(pHp - eng.p.hp > 9);
        if (eng.a.hp < aHp) sfx.hit(aHp - eng.a.hp > 9);
        pHp = eng.p.hp; aHp = eng.a.hp;
        if (eng.p.guardFlash === 12 || eng.a.guardFlash === 12) sfx.block();
        if (eng.brain.mirrorFlashT === 34 && prevMirror !== 34) sfx.mirror();
        prevMirror = eng.brain.mirrorFlashT;
        if (eng.brain.desync === 22) sfx.habitBreak();
        // READ 연출 사운드
        if (eng.read && eng.read.life === eng.read.maxLife) {
          if (eng.read.kind === 'broke') sfx.unread();
          else sfx.read(eng.read.kind === 'punished' || eng.read.kind === 'predicted');
        }
        if (eng.projectiles.length > prevProj) sfx.fireball();
        prevProj = eng.projectiles.length;
        if (eng.p.superFlash === 70 || eng.a.superFlash === 70) sfx.superFlash();
        for (const f of [eng.p, eng.a]) {
          if (f.state === 'attack' && f.moveFrame === 1 && f.move &&
              (f.move === 'upper' || f.move === 'slide')) sfx.special();
        }
        if (eng.phase !== prevPhase) {
          if (eng.phase === 'roundEnd') sfx.ko();
          prevPhase = eng.phase;
        }
      }
      render(ctx, eng, now);
      if (tick % 5 === 0) {
        const k = snapKey(eng);
        if (k !== lastKey) {
          lastKey = k;
          setSnapshot(snap(eng));
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return { canvasRef, snapshot, press, release, restart, engine: engRef, setSnapshot };
}
