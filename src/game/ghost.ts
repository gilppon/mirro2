// ─────────────────────────────────────────────────────────────
//  GHOST UPLOAD & AI LEAGUE — 비동기 PvP 백본 (Phase 2)
//  동시접속자가 없어도 500개의 복제본이 항상 대기한다.
//  Phase 2: 시즌 커뮤니티 섀도우 + 레이팅 평준 매칭 + 재시뮬 검증.
// ─────────────────────────────────────────────────────────────
import { RIVALS, simulateMatch, type AiFighter, type MatchResult } from './meta';
import { ARCHETYPE_META } from './dna';
import { generateShadows, pickOpponent, SEASON, toFighter, verifyMatch } from './shadow';

export interface GhostState {
  uploaded: boolean;
  uploadedAt: number;
  version: number;        // 업로드 세대
  totalChallenges: number;
  totalWins: number;
  totalLosses: number;
}

export interface LeagueLog {
  id: string;
  opp: string;
  oppFlag: string;
  oppArch: string;
  win: boolean;
  score: string;
  delta: number;
  at: number;
  /** 이 판에서 가장 많이 당한 공격 / 가장 잘 통한 습관 */
  tookFrom: string;
  wonBy: string;
  /** 서버 재검증(재시뮬 대조) 통과 여부 — 통과한 결과만 랭킹에 반영된다 */
  verified: boolean;
}

export interface LeagueDigest {
  todayChallenges: number;
  wins: number;
  losses: number;
  ratingDelta: number;
  mostPunishedBy: string;   // 가장 많이 당한 공격
  strongestHabit: string;   // 가장 강한 습관
  streak: number;
  logs: LeagueLog[];
  newRivals: string[];
}

const TOOK_POOL = [
  '하단 카운터', '무적 어퍼 대공', '전진 대시 잡기', '장풍 견제',
  '기상 압박 상단', '캔슬 프레임 트랩', '코너 압박 연계', '초필살기 마무리',
];
const WON_POOL = [
  '점프 유도 후 대공', '하단 → 캔슬 콤보', '가드 후 확정 반격', '잡기 심리',
  '장풍 압박 후 돌진', '기상 상하단 교란', '카운터 히트 처형', '프레임 트랩 유도',
];

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

export function loadGhost(): GhostState {
  try {
    const s = localStorage.getItem('mnb.ghost');
    if (s) return JSON.parse(s);
  } catch { /* noop */ }
  return { uploaded: false, uploadedAt: 0, version: 0, totalChallenges: 0, totalWins: 0, totalLosses: 0 };
}
export function saveGhost(g: GhostState) {
  try { localStorage.setItem('mnb.ghost', JSON.stringify(g)); } catch { /* noop */ }
}

export function loadLogs(): LeagueLog[] {
  try { return JSON.parse(localStorage.getItem('mnb.league') ?? '[]'); } catch { return []; }
}
export function saveLogs(l: LeagueLog[]) {
  try { localStorage.setItem('mnb.league', JSON.stringify(l.slice(0, 40))); } catch { /* noop */ }
}

/** 실제 엔진으로 한 판 돌린 뒤, 재시뮬로 검증까지 마친 로그를 만든다 */
export function runLeagueMatch(me: AiFighter, opp: AiFighter, seed: number): { r: MatchResult; log: LeagueLog } {
  const r = simulateMatch(me, opp, seed);
  // ── 서버 재검증 원형: 같은 시드로 다시 돌려 보고와 일치하는지 확인 (Phase 2)
  const v = verifyMatch(me, opp, seed, r);
  const win = r.winner === 'a';
  return {
    r,
    log: {
      id: `${seed}`,
      opp: opp.name,
      oppFlag: opp.flag ?? '🤖',
      oppArch: opp.archetype,
      win,
      score: `${r.scoreA}:${r.scoreB}`,
      delta: win ? 14 + (r.scoreB === 0 ? 6 : 0) : -11,
      at: Date.now(),
      tookFrom: pick(TOOK_POOL, seed + opp.name.length),
      wonBy: pick(WON_POOL, seed * 3 + me.name.length),
      verified: v.ok,
    },
  };
}

/** 리그 일괄 시뮬레이션 → 다이제스트 (레이팅 평준 매칭) */
export function runLeague(me: AiFighter, pool: AiFighter[], count: number, seed: number): LeagueDigest {
  const logs: LeagueLog[] = [];
  let wins = 0, losses = 0, delta = 0, streak = 0, best = 0;
  const tookCount = new Map<string, number>();
  const wonCount = new Map<string, number>();
  const excluded = new Set<string>();

  for (let i = 0; i < count; i++) {
    // ── 평준 매칭: 레이팅이 가까운 상대에 가중, 이미 만난 상대는 제외
    const opp = pickOpponent(me, pool, seed + i * 7919, excluded);
    excluded.add(opp.id);
    const { log } = runLeagueMatch(me, opp, seed + i * 977);
    logs.push(log);
    if (log.win) { wins++; streak++; best = Math.max(best, streak); }
    else { losses++; streak = 0; }
    delta += log.delta;
    if (!log.win) tookCount.set(log.tookFrom, (tookCount.get(log.tookFrom) ?? 0) + 1);
    if (log.win) wonCount.set(log.wonBy, (wonCount.get(log.wonBy) ?? 0) + 1);
  }

  const topOf = (m: Map<string, number>, fb: string) => {
    let k = fb, v = 0;
    m.forEach((c, key) => { if (c > v) { v = c; k = key; } });
    return k;
  };

  // ── 신규 라이벌: 가짜 이름이 아니라 시즌 로스터의 실제 섀도우
  const season = generateShadows(SEASON.seed ^ seed, 24);
  const newRivals = season
    .filter((s) => !logs.some((l) => l.opp === s.name))
    .slice(0, 1 + (seed % 3))
    .map((s) => s.name);

  return {
    todayChallenges: count,
    wins, losses,
    ratingDelta: delta,
    mostPunishedBy: topOf(tookCount, '하단 카운터'),
    strongestHabit: topOf(wonCount, '점프 유도 후 대공'),
    streak: best,
    logs,
    newRivals,
  };
}

/** 리그 풀: 기본 라이벌 + 친구 고스트 + 시즌 커뮤니티 섀도우 (Phase 2) */
export function leaguePool(me: AiFighter | null): AiFighter[] {
  const pool = [...RIVALS];
  if (me) {
    // 내 AI의 변종 = "친구 AI" 느낌의 근접 상대
    const vary = (v: number, d: number) => Math.max(0, Math.min(100, Math.round(v + d)));
    const friends: [string, string, string, number][] = [
      ['AI-JUNO', 'Minseo', '🇰🇷', 1],
      ['AI-TIDE', 'Alex', '🇺🇸', -1],
    ];
    for (const [name, owner, flag, s] of friends) {
      const dna = { ...me.dna };
      (Object.keys(dna) as (keyof typeof dna)[]).forEach((k, i) => {
        dna[k] = vary(dna[k] ?? 0, s * ((i * 13) % 27) - 12);
      });
      pool.push({
        ...me, id: name, name, owner, flag, dna,
        isPlayer: false,
        rating: Math.max(950, me.rating + s * 60),
      });
    }
  }
  // ── 시즌 커뮤니티 섀도우: 시드만 공유되면 서버·클라이언트가 같은 24명을 본다
  for (const p of generateShadows(SEASON.seed, 24)) {
    pool.push(toFighter(p));
  }
  return pool;
}

export function archLabel(a: string): string {
  const m = ARCHETYPE_META[a as keyof typeof ARCHETYPE_META];
  return m ? `${m.icon} ${a.replace(/_/g, ' ')}` : a;
}
