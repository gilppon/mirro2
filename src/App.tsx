import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMirrorGame } from './hooks/useMirrorGame';
import { sfx } from './game/audio';
import { archetypeOf, computeDNA, emptyRaw, type DNA } from './game/dna';
import {
  RIVALS, botOf, buildPlayerAi, loadSave, mergeRaw, persist,
  runOffline, simulateMatch,
  type AiFighter, type MatchResult, type OfflineReport, type SaveData,
} from './game/meta';
import Hud from './components/Hud';
import TouchPad from './components/TouchPad';
import TitleScreen from './components/TitleScreen';
import ResultScreen from './components/ResultScreen';
import LabScreen from './components/LabScreen';
import SimulaAnalysis from './components/SimulaAnalysis';
import DrillHud from './components/DrillHud';
import MissionHud from './components/MissionHud';
import {
  DRILLS, analyze, conclude, defeatBreakdown, defeatCause, drillFor, topOf,
} from './game/analysis';
import { LevelUpCinematic, StageBadge } from './components/EvolutionUi';
import ModeHub from './components/ModeHub';
import { DefeatVerdict, VictoryVerdict, type DefeatData, type VictoryData } from './components/VerdictScreen';
import { FLOORS, floorToMission, loadDungeon, saveDungeon } from './game/dungeon';
import {
  leaguePool, loadGhost, runLeague, saveGhost, saveLogs,
  type GhostState, type LeagueDigest,
} from './game/ghost';
import { ACTION_KR as AKR } from './game/brain';
import StoreScreen from './components/StoreScreen';
import MvpTracker from './components/MvpTracker';
import ReplayVault from './components/ReplayVault';
import ShareCard from './components/ShareCard';
import { loadReplays, pushReplay, saveReplays, type Replay } from './game/replay';
import {
  loadWallet, saveWallet, skinColor, hudColor,
  type StoreItem, type Wallet,
} from './game/store';
import { STAGES } from './game/evolution';
import { missionById, type Mission } from './game/missions';

type Screen = 'title' | 'lab' | 'train' | 'aimatch';

const AI_NAMES = ['AI-GILHO', 'AI-NOVA', 'AI-REPLICA', 'AI-ECHO', 'AI-VERSE'];

export default function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [muted, setMuted] = useState(false);
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [report, setReport] = useState<OfflineReport | null>(null);
  const [lastMatch, setLastMatch] = useState<MatchResult | null>(null);
  const [genFlash, setGenFlash] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<AiFighter | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [, setActiveDrill] = useState<string | null>(null);
  const [clearedMissions, setClearedMissions] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('mnb.missions') ?? '[]'); } catch { return []; }
  });
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [ghost, setGhost] = useState<GhostState>(() => loadGhost());
  const [digest, setDigest] = useState<LeagueDigest | null>(null);
  const [dungeonCleared, setDungeonCleared] = useState<number[]>(() => loadDungeon());
  const [activeFloor, setActiveFloor] = useState<number | null>(null);
  const [defeat, setDefeat] = useState<DefeatData | null>(null);
  const [victory, setVictory] = useState<VictoryData | null>(null);
  const [uploadFx, setUploadFx] = useState(false);
  const [wallet, setWallet] = useState<Wallet>(() => loadWallet());
  const [storeOpen, setStoreOpen] = useState(false);
  const [buyFx, setBuyFx] = useState<string | null>(null);
  const [lastCause, setLastCause] = useState<DefeatData['cause'] | null>(null);
  const [replays, setReplays] = useState<Replay[]>(() => loadReplays());
  const [shareOpen, setShareOpen] = useState(false);
  const beforeRef = useRef<{ aerial: number; grab: number; repetition: number; panic: number } | null>(null);

  const spectate = screen === 'aimatch';
  const { canvasRef, snapshot, press, release, restart, engine } = useMirrorGame(
    screen === 'train' || screen === 'aimatch',
    spectate,
  );

  // ── 접속하지 않은 동안의 비동기 도전 처리
  useEffect(() => {
    if (!save.ai || report) return;
    const away = Date.now() - save.lastSeen;
    const count = Math.max(3, Math.min(12, Math.floor(away / 45000) + 5));
    const r = runOffline(save.ai, RIVALS, count, (save.generation * 977 + count) >>> 0);
    setReport(r);
    const ai = { ...save.ai, wins: save.ai.wins + r.wins, losses: save.ai.losses + r.losses, rating: Math.max(900, save.ai.rating + r.ratingDelta) };
    const next = { ...save, ai, lastSeen: Date.now() };
    setSave(next); persist(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save.ai?.id]);

  // ── 드릴 완료 시 실제로 습관 데이터를 교정한다
  const drillDoneRef = useRef(false);
  useEffect(() => {
    if (!snapshot.drillDone) { drillDoneRef.current = false; return; }
    if (drillDoneRef.current) return;
    drillDoneRef.current = true;
    const eng = engine.current;
    const id = snapshot.drillId;
    if (!eng || !id) return;
    const d = DRILLS[id] ?? drillFor(id);
    const raw = { ...save.raw };
    const shrink = (pool: Record<string, number>) => {
      const o = { ...pool };
      for (const b of d.banned) if (o[b]) o[b] *= 0.35;
      return o;
    };
    raw.pressureActs = shrink(raw.pressureActs ?? {});
    raw.wakeupActs = shrink(raw.wakeupActs ?? {});
    raw.corneredActs = shrink(raw.corneredActs ?? {});
    raw.lowHpActs = shrink(raw.lowHpActs ?? {});
    raw.postHitActs = shrink(raw.postHitActs ?? {});
    raw.actions = shrink(raw.actions ?? {});
    if (d.id === 'chain') {
      const t: Record<string, number> = {};
      for (const k in raw.trigrams ?? {}) t[k] = raw.trigrams[k] * 0.4;
      raw.trigrams = t;
    }
    const nextAi = save.ai ? buildPlayerAi(raw, save.ai.name, save.generation, save.ai) : null;
    const next: SaveData = { ...save, raw, ai: nextAi, lastSeen: Date.now() };
    setSave(next); persist(next);
    sfx.superFlash();
  }, [snapshot.drillDone, snapshot.drillId, engine, save]);

  // ── 매치 종료 연출: 패배 = DefeatVerdict / 미션 클리어 = VictoryVerdict
  const verdictRef = useRef(false);
  useEffect(() => {
    if (screen !== 'train' || snapshot.phase !== 'matchEnd') { verdictRef.current = false; return; }
    if (verdictRef.current) return;
    verdictRef.current = true;

    const b = snapshot.brain;
    const lost = snapshot.wins[1] > snapshot.wins[0];
    const ms = snapshot.mission;

    const t = setTimeout(() => {
      // 미션/던전 클리어 → 승리 연출
      if (ms?.cleared) {
        const before = beforeRef.current;
        const after = computeDNA(save.raw);
        const key: keyof DNA = activeFloor === 1 ? 'aerial'
          : activeFloor === 4 ? 'grab' : activeFloor === 3 ? 'repetition'
            : ms.id === 'lowJump' || ms.id === 'holdGuard' ? 'panic'
              : ms.id === 'noLowGrab' ? 'grab' : 'repetition';
        const label = key === 'aerial' ? '점프 의존도' : key === 'grab' ? '잡기 의존도'
          : key === 'panic' ? '패닉 지수' : '반복성';
        setVictory({
          title: activeFloor ? `${activeFloor}층 돌파 — 습관 봉인 성공` : '습관 교정 성공',
          metricLabel: label,
          before: before ? (before[key as keyof typeof before] ?? after[key]) : after[key],
          after: after[key],
          failCount: b.misses,
          verdict: b.misses > b.hits ? '당신은 더 이상 읽히지 않습니다.' : '습관 하나를 잘라냈습니다. 계속하세요.',
        });
        sfx.superFlash();
        return;
      }
      // 패배 → 예측 연출
      if (lost && b.prediction && b.samples > 8) {
        const eng = engine.current!;
        const pr = topOf(liveRaw.pressureActs, 3);
        const cause = defeatCause({
          dmgTaken: eng.stats.dmgTaken,
          dmgAfterRead: eng.dmgAfterRead,
          dmgWhileAttacking: eng.dmgWhileAttacking,
          dmgInCorner: eng.dmgInCorner,
          dmgAirborne: eng.dmgAirborne,
          byMove: eng.dmgBySimulaMove,
          reads: eng.tally.reads,
          breaks: eng.tally.breaks,
          worstStreak: eng.tally.worstStreak,
          topPressureAct: pr?.act ?? null,
          topPressureP: pr?.p ?? 0,
        });
        setDefeat({
          predicted: AKR[b.prediction] ?? b.prediction,
          actual: AKR[b.prediction] ?? b.prediction,
          accuracy: b.accuracy,
          verdict: conclude(analyze(liveRaw), liveRaw),
          stageKr: b.stageKr,
          stageLv: b.stageLv,
          cause,
          reads: eng.tally.reads,
          breaks: eng.tally.breaks,
          worstStreak: eng.tally.worstStreak,
        });
        setLastCause(cause);
        return;
      }
      if (!ms) setShowReport(true);
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, snapshot.phase]);

  // ── 매치 종료 시 리플레이 자동 저장
  const replayRef = useRef(false);
  useEffect(() => {
    if (screen !== 'train' || snapshot.phase !== 'matchEnd') { replayRef.current = false; return; }
    if (replayRef.current) return;
    replayRef.current = true;
    const eng = engine.current;
    if (!eng || eng.pBot) return;
    const dna = computeDNA(liveRaw);
    const a = archetypeOf(dna);
    const won = snapshot.wins[0] > snapshot.wins[1];
    const pr = topOf(liveRaw.pressureActs, 3);
    const cause = defeatCause({
      dmgTaken: eng.stats.dmgTaken, dmgAfterRead: eng.dmgAfterRead,
      dmgWhileAttacking: eng.dmgWhileAttacking, dmgInCorner: eng.dmgInCorner,
      dmgAirborne: eng.dmgAirborne, byMove: eng.dmgBySimulaMove,
      reads: eng.tally.reads, breaks: eng.tally.breaks, worstStreak: eng.tally.worstStreak,
      topPressureAct: pr?.act ?? null, topPressureP: pr?.p ?? 0,
    });
    const r: Replay = {
      id: `r${Date.now()}`, at: Date.now(),
      mode: activeFloor ? `DUNGEON ${activeFloor}F` : snapshot.mission ? `MISSION · ${snapshot.mission.title}` : eng.aBot ? 'MIRROR BATTLE' : 'TRAINING',
      result: won ? 'win' : 'lose',
      score: `${snapshot.wins[0]}:${snapshot.wins[1]}`,
      durationF: eng.frame,
      stageLv: snapshot.brain.stageLv, stageKr: snapshot.brain.stageKr,
      dna, archetype: a.type, archScore: a.score,
      reads: eng.tally.reads, breaks: eng.tally.breaks, worstStreak: eng.tally.worstStreak,
      accuracy: snapshot.brain.accuracy,
      dmgDealt: eng.stats.dmgDealt, dmgTaken: eng.stats.dmgTaken,
      maxCombo: eng.stats.maxCombo,
      cause: won ? null : cause.headline,
      events: eng.replayEvents.slice(0, 900),
    };
    setReplays((prev) => { const next = pushReplay(prev, r, wallet.replaySlots); saveReplays(next); return next; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, snapshot.phase]);

  const pinReplay = useCallback((id: string) => {
    setReplays((prev) => {
      const next = prev.map((r) => r.id === id ? { ...r, pinned: !r.pinned } : r);
      saveReplays(next); return next;
    });
  }, []);
  const delReplay = useCallback((id: string) => {
    setReplays((prev) => { const next = prev.filter((r) => r.id !== id); saveReplays(next); return next; });
  }, []);

  // ── 던전 클리어 기록
  useEffect(() => {
    const ms = snapshot.mission;
    if (!ms?.cleared || !activeFloor) return;
    setDungeonCleared((prev) => {
      if (prev.includes(activeFloor)) return prev;
      const out = [...prev, activeFloor].sort((a, b) => a - b);
      saveDungeon(out);
      return out;
    });
  }, [snapshot.mission, activeFloor]);

  const toLab = useCallback(() => {
    // 훈련 중 수집한 데이터를 저장소에 반영
    const eng = engine.current;
    if (eng && eng.recording && eng.recorder.totalActs > 0 && !eng.pBot) {
      const merged = mergeRaw(save.raw, eng.recorder, 0.9);
      const nextAi = save.ai ? buildPlayerAi(merged, save.ai.name, save.generation, save.ai) : null;
      const next: SaveData = { ...save, raw: merged, ai: nextAi, lastSeen: Date.now() };
      setSave(next); persist(next);
      Object.assign(eng.recorder, emptyRaw());
    }
    sfx.ui();
    setScreen('lab');
  }, [engine, save]);

  const startTrain = useCallback(() => {
    const eng = engine.current!;
    eng.pBot = null; eng.aBot = null;
    eng.recording = true; eng.headless = false;
    eng.names = ['당신', '시뮬라'];
    eng.drill = null; eng.drillProgress = 0; eng.drillFails = 0; eng.drillDone = false;
    eng.clearMission(); setActiveMission(null);
    eng.setWorstHabitMode([]);
    setActiveFloor(null);
    setActiveDrill(null);
    setShowReport(false); setDefeat(null); setVictory(null);
    restart();
    eng.brain.setXp(save.simulaXp ?? 0);
    sfx.ui();
    setScreen('train');
  }, [engine, restart, save.simulaXp]);

  // ── SIMULA 진화 XP 저장 + 레벨업 사운드
  const lvRef = useRef(1);
  useEffect(() => {
    if (screen !== 'train') return;
    const lv = snapshot.brain.stageLv;
    if (lv !== lvRef.current) {
      if (lv > lvRef.current) sfx.superFlash();
      lvRef.current = lv;
    }
  }, [screen, snapshot.brain.stageLv]);

  useEffect(() => {
    if (screen !== 'train') return;
    const xp = snapshot.brain.xp;
    if (xp > (save.simulaXp ?? 0)) {
      const next = { ...save, simulaXp: xp };
      setSave(next); persist(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.brain.stageLv, screen]);

  // ── 습관 교정 드릴 시작
  const startDrill = useCallback((id: string) => {
    const eng = engine.current!;
    const d = DRILLS[id] ?? drillFor(id);
    eng.pBot = null; eng.aBot = null;
    eng.recording = true; eng.headless = false;
    eng.names = ['당신', '시뮬라'];
    restart();
    eng.startDrill(d.id, d.banned, d.required ?? [], d.target);
    setActiveDrill(d.id);
    setShowReport(false);
    sfx.ui();
    setScreen('train');
  }, [engine, restart]);

  // ── 상점: 구매 / 장착 / 이름 변경
  const buyItem = useCallback((it: StoreItem) => {
    setWallet((w) => {
      if (w.owned.includes(it.id)) return w;
      const next: Wallet = {
        ...w,
        owned: [...w.owned, it.id],
        renames: it.id === 'util.rename' ? w.renames + 3 : w.renames,
        replaySlots: it.id === 'util.slots' ? w.replaySlots + 20 : w.replaySlots,
        seasonPass: it.id === 'pass.season' ? true : w.seasonPass,
        equippedSkin: it.kind === 'skin' ? it.id : w.equippedSkin,
        equippedHud: it.kind === 'hud' ? it.id : w.equippedHud,
      };
      saveWallet(next);
      return next;
    });
    setBuyFx(it.name);
    sfx.ui();
    setTimeout(() => setBuyFx(null), 1800);
  }, []);

  const equipItem = useCallback((it: StoreItem) => {
    setWallet((w) => {
      const next: Wallet = {
        ...w,
        equippedSkin: it.kind === 'skin' ? it.id : w.equippedSkin,
        equippedHud: it.kind === 'hud' ? it.id : w.equippedHud,
      };
      saveWallet(next);
      return next;
    });
    sfx.ui();
  }, []);

  const renameAi = useCallback(() => {
    if (!save.ai || wallet.renames <= 0) return;
    const v = window.prompt('AI 파이터의 새 이름을 입력하세요 (최대 14자)', save.ai.name);
    if (!v) return;
    const name = v.trim().slice(0, 14) || save.ai.name;
    const next = { ...save, ai: { ...save.ai, name } };
    setSave(next); persist(next);
    setWallet((w) => { const nw = { ...w, renames: w.renames - 1 }; saveWallet(nw); return nw; });
    sfx.ui();
  }, [save, wallet.renames]);

  // 장착된 스킨/HUD 색을 엔진·UI에 반영
  const accent = hudColor(wallet.equippedHud);
  useEffect(() => {
    const eng = engine.current;
    if (eng) eng.skinColor = skinColor(wallet.equippedSkin);
  }, [wallet.equippedSkin, engine]);

  // ── Mirror Battle: 내가 직접 내 AI와 싸운다
  const startMirrorBattle = useCallback(() => {
    const eng = engine.current!;
    const me = save.ai;
    if (!me) return;
    eng.pBot = null;                                   // 좌측 = 사람
    eng.aBot = botOf(me, (Date.now() & 0xffff) + 17);  // 우측 = 내 AI 복제본
    eng.recording = true; eng.headless = false;
    eng.names = ['당신', me.name];
    eng.clearMission(); setActiveMission(null);
    eng.setWorstHabitMode([]);
    setActiveFloor(null); setShowReport(false); setDefeat(null); setVictory(null);
    restart();
    setOpponent({ ...me });
    sfx.ui();
    setScreen('train');
  }, [engine, restart, save.ai]);

  // ── 시작 시 고스트 활동 리포트
  useEffect(() => {
    if (!ghost.uploaded || !save.ai || digest) return;
    const away = Date.now() - (save.lastSeen || Date.now());
    const n = Math.max(4, Math.min(17, Math.floor(away / 40000) + 6));
    const d = runLeague(save.ai, leaguePool(save.ai), n, (ghost.version * 613 + n) >>> 0);
    setDigest(d); saveLogs(d.logs);
    const g = {
      ...ghost,
      totalChallenges: ghost.totalChallenges + d.todayChallenges,
      totalWins: ghost.totalWins + d.wins, totalLosses: ghost.totalLosses + d.losses,
    };
    setGhost(g); saveGhost(g);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghost.uploaded, save.ai?.id]);

  // ── Ghost Upload
  const uploadGhost = useCallback(() => {
    if (!save.ai) return;
    const g: GhostState = {
      uploaded: true, uploadedAt: Date.now(), version: ghost.version + 1,
      totalChallenges: ghost.totalChallenges, totalWins: ghost.totalWins, totalLosses: ghost.totalLosses,
    };
    setGhost(g); saveGhost(g);
    setUploadFx(true);
    sfx.superFlash();
    setTimeout(() => setUploadFx(false), 2400);
    // 업로드 즉시 리그 활동 시작
    const pool = leaguePool(save.ai);
    const d = runLeague(save.ai, pool, 6 + (g.version % 5), (Date.now() & 0xffff) >>> 0);
    setDigest(d);
    saveLogs(d.logs);
    const g2 = {
      ...g,
      totalChallenges: g.totalChallenges + d.todayChallenges,
      totalWins: g.totalWins + d.wins, totalLosses: g.totalLosses + d.losses,
    };
    setGhost(g2); saveGhost(g2);
    const ai = { ...save.ai, rating: Math.max(900, save.ai.rating + d.ratingDelta), wins: save.ai.wins + d.wins, losses: save.ai.losses + d.losses };
    const next = { ...save, ai }; setSave(next); persist(next);
  }, [save, ghost]);

  // ── AI League 일괄 출전
  const runLeagueNow = useCallback(() => {
    if (!save.ai) return;
    const pool = leaguePool(save.ai);
    const d = runLeague(save.ai, pool, 9, (Date.now() & 0x7fff) >>> 0);
    setDigest(d); saveLogs(d.logs);
    const g = {
      ...ghost,
      totalChallenges: ghost.totalChallenges + d.todayChallenges,
      totalWins: ghost.totalWins + d.wins, totalLosses: ghost.totalLosses + d.losses,
    };
    setGhost(g); saveGhost(g);
    const ai = { ...save.ai, rating: Math.max(900, save.ai.rating + d.ratingDelta), wins: save.ai.wins + d.wins, losses: save.ai.losses + d.losses };
    const next = { ...save, ai }; setSave(next); persist(next);
    sfx.ui();
  }, [save, ghost]);

  // ── Habit Dungeon 입장
  const enterFloor = useCallback((n: number) => {
    const f = FLOORS.find((x) => x.n === n);
    if (!f) return;
    const eng = engine.current!;
    eng.pBot = null; eng.aBot = null;
    eng.recording = true; eng.headless = false;
    eng.names = ['당신', `SIMULA ${f.n}F`];
    eng.drill = null; eng.drillProgress = 0; eng.drillFails = 0; eng.drillDone = false;
    restart();
    // 층에 맞춰 SIMULA 진화 단계 강제
    const st = STAGES.find((s) => s.lv === f.stageLv);
    if (st) eng.brain.setXp(st.need);
    // 5층: 플레이어의 최악 습관 추출 → SIMULA 무기로
    if (f.worstHabitOnly) {
      const blocks = analyze(save.raw);
      const worst = [...new Set(blocks.map((b) => b.fixTarget).filter((t) => t !== 'chain'))];
      eng.setWorstHabitMode(worst.length ? worst.slice(0, 4) : ['jump', 'low', 'grab']);
    } else eng.setWorstHabitMode([]);
    const m = floorToMission(f);
    eng.startMission(m);
    setActiveMission(m);
    setActiveFloor(n);
    setActiveDrill(null);
    setShowReport(false);
    const d = computeDNA(save.raw);
    beforeRef.current = { aerial: d.aerial, grab: d.grab, repetition: d.repetition, panic: d.panic };
    sfx.ui();
    setScreen('train');
  }, [engine, restart, save.raw]);

  // ── HABIT BREAK MISSION 시작
  const startMission = useCallback((m: Mission) => {
    const eng = engine.current!;
    eng.pBot = null; eng.aBot = null;
    eng.recording = true; eng.headless = false;
    eng.names = ['당신', '시뮬라'];
    eng.drill = null; eng.drillProgress = 0; eng.drillFails = 0; eng.drillDone = false;
    restart();
    eng.startMission(m);
    setActiveMission(m);
    setActiveDrill(null);
    setShowReport(false);
    sfx.ui();
    setScreen('train');
  }, [engine, restart]);

  const quitMission = useCallback(() => {
    engine.current?.clearMission();
    setActiveMission(null);
  }, [engine]);

  // ── 미션 클리어 시 실제 습관 데이터 교정 + 기록
  const missionDoneRef = useRef<string | null>(null);
  useEffect(() => {
    const ms = snapshot.mission;
    if (!ms || !ms.cleared) { if (!ms) missionDoneRef.current = null; return; }
    if (missionDoneRef.current === ms.id) return;
    missionDoneRef.current = ms.id;

    const m = missionById(ms.id);
    if (!m) return;

    // 보상: 겨냥한 손버릇 가중치를 실제로 감쇠
    const raw = { ...save.raw };
    const targets = m.rules.flatMap((r) => [...(r.acts ?? []), ...(r.banned ?? []), ...(r.seq ?? [])]);
    const shrink = (pool: Record<string, number> | undefined, k: number) => {
      const o = { ...(pool ?? {}) };
      for (const t of targets) if (o[t]) o[t] *= k;
      return o;
    };
    raw.pressureActs = shrink(raw.pressureActs, 0.3);
    raw.corneredActs = shrink(raw.corneredActs, 0.35);
    raw.wakeupActs = shrink(raw.wakeupActs, 0.4);
    raw.postHitActs = shrink(raw.postHitActs, 0.4);
    raw.lowHpActs = shrink(raw.lowHpActs, 0.45);
    raw.actions = shrink(raw.actions, 0.55);
    if (m.id === 'noRepeatCombo' || m.id === 'okiVariety') {
      const t: Record<string, number> = {};
      for (const k in raw.trigrams ?? {}) t[k] = raw.trigrams[k] * 0.35;
      raw.trigrams = t;
      const bg: Record<string, number> = {};
      for (const k in raw.bigrams ?? {}) bg[k] = raw.bigrams[k] * 0.5;
      raw.bigrams = bg;
    }
    if (m.id === 'noLowGrab') {
      const bg = { ...(raw.bigrams ?? {}) };
      for (const k of ['low>grab', 'slide>grab']) if (bg[k]) bg[k] *= 0.15;
      raw.bigrams = bg;
    }
    const nextAi = save.ai ? buildPlayerAi(raw, save.ai.name, save.generation, save.ai) : null;
    const next: SaveData = { ...save, raw, ai: nextAi, lastSeen: Date.now() };
    setSave(next); persist(next);

    setClearedMissions((prev) => {
      if (prev.includes(ms.id)) return prev;
      const out = [...prev, ms.id];
      try { localStorage.setItem('mnb.missions', JSON.stringify(out)); } catch { /* noop */ }
      return out;
    });
    sfx.superFlash();
  }, [snapshot.mission, save]);

  const quitDrill = useCallback(() => {
    const eng = engine.current!;
    eng.drill = null; eng.drillProgress = 0; eng.drillFails = 0; eng.drillDone = false;
    setActiveDrill(null);
  }, [engine]);

  const startAiMatch = useCallback((opp: AiFighter, mirror = false) => {
    const eng = engine.current!;
    const me = save.ai;
    if (!me) return;
    const left = botOf(me, (Date.now() & 0xffff) + 7);
    const right = mirror ? botOf(me, (Date.now() & 0xffff) + 991) : botOf(opp, (Date.now() & 0xffff) + 313);
    eng.setupAiMatch(left, right, [me.name, mirror ? `${me.name} (MIRROR)` : opp.name], false);
    setOpponent(mirror ? { ...me, name: `${me.name} (MIRROR)` } : opp);
    sfx.ui();
    setScreen('aimatch');
  }, [engine, save.ai]);

  const quickSim = useCallback((opp: AiFighter) => {
    if (!save.ai) return;
    const r = simulateMatch(save.ai, opp, (Date.now() & 0x7fffffff));
    setLastMatch(r);
    const delta = r.winner === 'a' ? 16 : -13;
    const ai = {
      ...save.ai,
      wins: save.ai.wins + (r.winner === 'a' ? 1 : 0),
      losses: save.ai.losses + (r.winner === 'b' ? 1 : 0),
      rating: Math.max(900, save.ai.rating + delta),
    };
    const next = { ...save, ai };
    setSave(next); persist(next);
    sfx.ui();
  }, [save]);

  const generateAi = useCallback(() => {
    const gen = save.generation + 1;
    const name = AI_NAMES[Math.min(gen - 1, AI_NAMES.length - 1)];
    const ai = buildPlayerAi(save.raw, name, gen, save.ai ?? undefined);
    const next: SaveData = {
      ...save, ai, generation: gen,
      history: [...save.history, { gen, dna: ai.dna, at: Date.now() }],
      lastSeen: Date.now(),
    };
    setSave(next); persist(next);
    setGenFlash(name);
    sfx.superFlash();
    setTimeout(() => setGenFlash(null), 2600);
  }, [save]);

  const resetAll = useCallback(() => {
    const fresh = loadSave();
    const blank: SaveData = { ...fresh, raw: emptyRaw(), ai: null, generation: 0, history: [], lastSeen: Date.now() };
    setSave(blank); persist(blank); setReport(null); setLastMatch(null);
    engine.current?.recorder && Object.assign(engine.current.recorder, emptyRaw());
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => { sfx.enabled = m; return !m; });
  }, []);

  const liveRaw = useMemo(() => {
    if (screen !== 'train') return save.raw;
    const eng = engine.current;
    if (!eng) return save.raw;
    return mergeRaw(save.raw, eng.recorder, 1);
  }, [screen, snapshot.samples, save.raw, engine]);

  if (screen === 'title') {
    return <TitleScreen onStart={() => { sfx.ui(); setScreen(save.ai || save.raw.totalActs > 0 ? 'lab' : 'train'); }} />;
  }

  if (screen === 'lab') {
    return (
      <div style={{ ['--accent' as string]: accent }}>
        <LabScreen
          simulaXp={save.simulaXp ?? 0}
          raw={save.raw}
          ai={save.ai}
          generation={save.generation}
          report={report}
          lastMatch={lastMatch}
          onTrain={startTrain}
          onGenerate={generateAi}
          onFight={(o) => startAiMatch(o)}
          onMirror={() => save.ai && startAiMatch(save.ai, true)}
          onSimulate={quickSim}
          onReset={resetAll}
          onDrill={startDrill}
          onMission={startMission}
          clearedMissions={clearedMissions}
          accuracy={snapshot.brain.accuracy}
          replayVault={
            <ReplayVault
              replays={replays}
              slots={wallet.replaySlots}
              onPin={pinReplay}
              onDelete={delReplay}
              onStore={() => { sfx.ui(); setStoreOpen(true); }}
            />
          }
          onShare={() => { sfx.ui(); setShareOpen(true); }}
          tracker={
            <MvpTracker
              matches={Math.round(save.raw.matches ?? 0)}
              reads={snapshot.reads}
              breaks={snapshot.breaks}
              stageLv={snapshot.brain.stageLv}
              accuracy={snapshot.brain.accuracy}
            />
          }
          modeHub={
            <ModeHub
              seasonPass={wallet.seasonPass}
              onStore={() => { sfx.ui(); setStoreOpen(true); }}
              ai={save.ai}
              ghost={ghost}
              digest={digest}
              dungeonCleared={dungeonCleared}
              onMirror={startMirrorBattle}
              onUpload={uploadGhost}
              onLeague={runLeagueNow}
              onFloor={enterFloor}
              onTrain={startTrain}
            />
          }
        />
        {genFlash && <GenerationFlash name={genFlash} />}
        {uploadFx && <UploadFlash name={save.ai?.name ?? 'AI'} v={ghost.version} />}
        <button
          onClick={() => { sfx.ui(); setStoreOpen(true); }}
          className="fixed bottom-4 right-4 z-40 rounded-full border border-fuchsia-400/50 bg-fuchsia-500/20 px-5 py-3 font-mono text-[11px] font-bold tracking-[0.2em] text-fuchsia-100 shadow-[0_0_30px_rgba(217,70,239,.25)] backdrop-blur transition hover:bg-fuchsia-500/30 active:scale-95"
        >
          ▦ STORE
        </button>
        {storeOpen && (
          <StoreScreen
            wallet={wallet}
            aiName={save.ai?.name ?? '미생성 AI'}
            onBuy={buyItem}
            onEquip={equipItem}
            onRename={renameAi}
            onClose={() => setStoreOpen(false)}
          />
        )}
        {shareOpen && save.ai && (
          <ShareCard
            dna={save.ai.dna}
            raw={save.raw}
            name={save.ai.name}
            generation={save.generation}
            power={save.ai.power}
            rating={save.ai.rating}
            wins={save.ai.wins}
            losses={save.ai.losses}
            stageLv={snapshot.brain.stageLv}
            stageKr={snapshot.brain.stageKr}
            reads={replays.reduce((s, r) => s + r.reads, 0)}
            breaks={replays.reduce((s, r) => s + r.breaks, 0)}
            onClose={() => setShareOpen(false)}
          />
        )}
        {buyFx && (
          <div className="pointer-events-none fixed inset-x-0 top-6 z-[70] flex justify-center">
            <div className="rounded-md border border-emerald-400/50 bg-emerald-400/15 px-5 py-2.5 font-mono text-[11px] font-bold tracking-widest text-emerald-100 backdrop-blur">
              ✓ {buyFx} 획득 — 전투 성능에는 영향이 없습니다
            </div>
          </div>
        )}
      </div>
    );
  }

  const b = snapshot.brain;
  const isAi = screen === 'aimatch';

  return (
    <div className="fixed inset-0 w-full overflow-hidden bg-black text-white select-none">
      {/* ── 전체화면 캔버스 ── */}
      <div className="absolute inset-0 flex items-center justify-center">
        <canvas ref={canvasRef} className="h-full w-full object-contain" />
      </div>

      {/* ── HUD (960×540 아레나 영역에 정렬) ── */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="pointer-events-none relative aspect-[16/9] h-full w-full max-w-full">
        <Hud s={snapshot} />

        {/* 좌상단: 모드 라벨 + 진화 단계 */}
        <div className="absolute left-3 top-[15%] flex flex-col gap-1.5">
          <span className="font-mono text-[10px] font-black tracking-[0.2em] text-white/70">
            {isAi ? 'ASYNC AI MATCH'
              : activeFloor ? `DUNGEON ${activeFloor}F`
                : snapshot.mission ? 'HABIT BREAK' : 'TRAINING'}
          </span>
          {!isAi && (
            <StageBadge
              lv={b.stageLv} kr={b.stageKr} color={b.stageColor} icon={b.stageIcon}
              ratio={b.stageRatio} remain={b.stageRemain} nextKr={b.nextStageKr}
            />
          )}
        </div>

        {/* 우상단: 컨트롤 */}
        <div className="pointer-events-auto absolute right-3 top-[15%] flex gap-1.5">
          <button onClick={toggleMute} className="rounded border border-white/15 bg-black/50 px-2 py-1 font-mono text-[9px] tracking-widest text-white/50 backdrop-blur transition hover:bg-white/15">
            {muted ? '🔇' : '🔊'}
          </button>
          <button onClick={toLab} className="rounded border border-cyan-300/40 bg-cyan-400/10 px-2 py-1 font-mono text-[9px] tracking-widest text-cyan-200 backdrop-blur transition hover:bg-cyan-400/25">
            ✕ 종료
          </button>
        </div>

        {/* 오버레이: 결과 / 연출 */}
        {snapshot.phase === 'matchEnd' && !isAi && !showReport && !snapshot.mission && (
          <ResultScreen s={snapshot} onRestart={startTrain} onTitle={() => setShowReport(true)} />
        )}
            {snapshot.phase === 'matchEnd' && !isAi && snapshot.mission && (
              <MissionResult
                snap={snapshot.mission}
                onRetry={() => activeMission && startMission(activeMission)}
                onLab={() => { quitMission(); toLab(); }}
                onFree={() => { quitMission(); startTrain(); }}
              />
            )}
            {!isAi && b.levelUpFlash > 0 && (
              <LevelUpCinematic
                lv={b.stageLv} kr={b.stageKr} en={b.stageEn}
                color={b.stageColor} icon={b.stageIcon}
                quote={b.stageQuote} summary={b.stageSummary}
                flash={b.levelUpFlash}
              />
            )}
            {snapshot.mission && !isAi && (
              <MissionHud
                snap={snapshot.mission}
                mission={activeMission}
                onQuit={quitMission}
                onRetry={() => activeMission && startMission(activeMission)}
              />
            )}
            {snapshot.drillId && !isAi && (
              <DrillHud
                drill={DRILLS[snapshot.drillId] ?? drillFor(snapshot.drillId)}
                progress={snapshot.drillProgress}
                fails={snapshot.drillFails}
                done={snapshot.drillDone}
                onQuit={quitDrill}
              />
            )}
        {snapshot.phase === 'matchEnd' && isAi && (
          <AiMatchResult s={snapshot} onAgain={() => opponent && startAiMatch(opponent)} onLab={toLab} />
        )}
      </div>
      </div>

      {/* ── 데스크톱 키 안내 (하단 중앙, 잠깐 표시) ── */}
      {!isAi && snapshot.phase === 'fight' && snapshot.round === 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[104px] flex justify-center">
          <span className="rounded border border-white/10 bg-black/55 px-3 py-1 font-mono text-[9.5px] tracking-wider text-white/35 backdrop-blur">
            A/D 이동 · W 점프 · S 웅크림 · SHIFT 가드 · J/K/L/I 공격 · 1/2/3 필살기 · R 초필살기
          </span>
        </div>
      )}

      {/* ── 터치 컨트롤 (오버레이 · 결과 화면에서는 숨김) ── */}
      {!isAi && snapshot.phase !== 'matchEnd' && !b.levelUpFlash && (
        <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3">
          <TouchPad press={press} release={release} burstReady={snapshot.pMeter >= 50} superReady={snapshot.pMeter >= 100} />
        </div>
      )}

      {storeOpen && (
        <StoreScreen
          wallet={wallet}
          aiName={save.ai?.name ?? '미생성 AI'}
          onBuy={buyItem}
          onEquip={equipItem}
          onRename={renameAi}
          onClose={() => setStoreOpen(false)}
        />
      )}

      {/* 감정 연출 — 패배 / 승리 */}
      {defeat && (
        <DefeatVerdict d={defeat} onNext={() => { setDefeat(null); setShowReport(true); }} />
      )}
      {victory && (
        <VictoryVerdict d={victory} onNext={() => { setVictory(null); quitMission(); setActiveFloor(null); toLab(); }} />
      )}

      {/* SIMULA의 분석 리포트 */}
      {showReport && !isAi && (
        <SimulaAnalysis
          raw={liveRaw}
          accuracy={snapshot.brain.accuracy}
          lost={snapshot.wins[1] > snapshot.wins[0]}
          cause={lastCause ?? undefined}
          breakdown={engine.current ? defeatBreakdown({
            dmgTaken: engine.current.stats.dmgTaken,
            dmgAfterRead: engine.current.dmgAfterRead,
            dmgWhileAttacking: engine.current.dmgWhileAttacking,
            dmgInCorner: engine.current.dmgInCorner,
            dmgAirborne: engine.current.dmgAirborne,
            byMove: engine.current.dmgBySimulaMove,
            reads: snapshot.reads, breaks: snapshot.breaks,
            worstStreak: snapshot.worstStreak,
            topPressureAct: null, topPressureP: 0,
          }) : undefined}
          onDrill={startDrill}
          onMission={startMission}
          onRetry={startTrain}
          onLab={toLab}
        />
      )}
    </div>
  );
}

// ── 미션 결과
function MissionResult({ snap, onRetry, onLab, onFree }: {
  snap: NonNullable<ReturnType<typeof useMirrorGame>['snapshot']['mission']>;
  onRetry: () => void; onLab: () => void; onFree: () => void;
}) {
  const ok = snap.cleared;
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/88 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-xl border bg-[#070a14]" style={{ borderColor: ok ? 'rgba(125,255,194,.4)' : 'rgba(251,113,133,.4)' }}>
        <div className={`px-5 py-4 ${ok ? 'bg-gradient-to-r from-emerald-500/20' : 'bg-gradient-to-r from-rose-600/20'} to-transparent`}>
          <div className="font-mono text-[10px] tracking-[0.3em] text-white/40">HABIT BREAK MISSION</div>
          <div className={`mt-1 text-3xl font-black tracking-tight ${ok ? 'text-emerald-300' : 'text-rose-300'}`}>
            {ok ? 'MISSION CLEAR' : 'MISSION FAILED'}
          </div>
          <div className="mt-0.5 text-[13px] text-white/60">{snap.title}</div>
        </div>
        <div className="space-y-1.5 px-5 py-4">
          {snap.rules.map((r) => (
            <div key={r.label} className="flex items-center justify-between rounded border border-white/10 bg-white/[0.03] px-3 py-1.5">
              <span className="text-[12px] text-white/70">{r.label}</span>
              <span className={`font-mono text-[11px] font-bold ${r.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                {r.ok ? `✓ ${r.detail}` : '✕ 위반'}
              </span>
            </div>
          ))}
          {!ok && snap.failReason && (
            <div className="rounded border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
              {snap.failReason}
            </div>
          )}
          {ok && (
            <div className="rounded border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[12.5px] leading-relaxed text-emerald-100">
              습관을 쓰지 않고 이겼습니다. 해당 손버릇의 가중치가 실제로 낮아졌으며,
              당신의 AI 파이터 성향에도 즉시 반영되었습니다.
            </div>
          )}
        </div>
        <div className="flex gap-2 border-t border-white/10 px-5 py-4">
          <button onClick={onRetry} className="flex-1 rounded-md border border-white/25 bg-white/10 py-2.5 font-mono text-xs font-bold tracking-widest text-white/85 transition hover:bg-white/20">
            재도전
          </button>
          <button onClick={onFree} className="flex-1 rounded-md border border-cyan-300/40 bg-cyan-400/10 py-2.5 font-mono text-xs tracking-widest text-cyan-200 transition hover:bg-cyan-400/20">
            자유 훈련
          </button>
          <button onClick={onLab} className="flex-1 rounded-md border border-white/15 py-2.5 font-mono text-xs tracking-widest text-white/55 transition hover:bg-white/10">
            AI LAB
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Ghost 업로드 연출
function UploadFlash({ name, v }: { name: string; v: number }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="text-center">
        <div className="font-mono text-[11px] tracking-[0.4em] text-violet-300/80">GHOST UPLOAD COMPLETE</div>
        <div className="mt-2 text-6xl">☁</div>
        <div className="mt-1 bg-gradient-to-r from-violet-200 via-white to-fuchsia-300 bg-clip-text text-4xl font-black tracking-tighter text-transparent">
          {name}
        </div>
        <div className="mt-2 font-mono text-sm text-white/60">
          v{v} · 이제 당신이 없어도 싸웁니다
        </div>
        <div className="mt-1 font-mono text-[11px] text-emerald-300/70">
          전 세계 유저가 당신의 AI에 도전할 수 있습니다
        </div>
      </div>
    </div>
  );
}

// ── AI 생성 연출
function GenerationFlash({ name }: { name: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="text-center">
        <div className="font-mono text-[11px] tracking-[0.4em] text-cyan-300/80">NEURAL CLONE COMPLETE</div>
        <div className="mt-2 animate-pulse bg-gradient-to-r from-cyan-200 via-white to-fuchsia-300 bg-clip-text text-6xl font-black tracking-tighter text-transparent">
          {name}
        </div>
        <div className="mt-2 font-mono text-sm text-white/60">생성 완료 — 이제 당신 대신 싸웁니다</div>
      </div>
    </div>
  );
}





function AiMatchResult({ s, onAgain, onLab }: {
  s: ReturnType<typeof useMirrorGame>['snapshot']; onAgain: () => void; onLab: () => void;
}) {
  const win = s.wins[0] > s.wins[1];
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#070a14] p-5 text-center">
        <div className="font-mono text-[10px] tracking-[0.3em] text-white/40">ASYNC MATCH RESULT</div>
        <div className={`mt-1 text-3xl font-black ${win ? 'text-cyan-200' : 'text-fuchsia-300'}`}>
          {win ? `${s.names[0]} 승리` : `${s.names[1]} 승리`}
        </div>
        <div className="mt-1 font-mono text-lg text-white/70">{s.wins[0]} : {s.wins[1]}</div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-white/55">
          {win
            ? '당신의 전투 DNA가 통했습니다. 이 성향을 더 강화하려면 같은 플레이를 반복 학습시키세요.'
            : '상대 스타일에 카운터당했습니다. LAB에서 약점 진단을 확인하고 새로운 플레이를 보여주세요.'}
        </p>
        <div className="mt-4 flex gap-2">
          <button onClick={onAgain} className="flex-1 rounded-md border border-white/20 py-2.5 font-mono text-xs tracking-widest text-white/70 transition hover:bg-white/10">
            리매치
          </button>
          <button onClick={onLab} className="flex-1 rounded-md border border-cyan-300/50 bg-cyan-400/15 py-2.5 font-mono text-xs font-bold tracking-widest text-cyan-100 transition hover:bg-cyan-400/25">
            ▸ AI LAB
          </button>
        </div>
      </div>
    </div>
  );
}


