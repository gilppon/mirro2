// ─────────────────────────────────────────────────────────────
//  MIRROR NEURAL BRAWLER — core types & frame data
// ─────────────────────────────────────────────────────────────

export type AttackId =
  | 'light' | 'heavy' | 'low' | 'grab'
  | 'wave' | 'upper' | 'slide'
  | 'super' | 'burst';

export type Height = 'mid' | 'high' | 'low' | 'grab' | 'unblockable';
export type MoveClass = 'normal' | 'command' | 'special' | 'super';

export interface MoveDef {
  id: AttackId;
  kr: string;
  en: string;
  cmd: string;              // 커맨드 표기
  cls: MoveClass;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  chip: number;
  hitstun: number;
  blockstun: number;
  reach: number;
  height: Height;
  meterGain: number;
  meterCost: number;
  pushback: number;
  cancelTo?: AttackId[];    // 히트/가드 시 캔슬 가능 기술
  invuln?: [number, number];
  launch?: number;          // 띄우기 (음수 vy)
  knockdown?: boolean;
  advance?: number;         // 발동 시 전진 속도
  multi?: { times: number; interval: number };
  projectile?: { speed: number; life: number; damage: number; chip: number };
}

const SPECIALS: AttackId[] = ['wave', 'upper', 'slide'];

export const MOVES: Record<AttackId, MoveDef> = {
  light: {
    id: 'light', kr: '약 타격', en: 'JAB', cmd: 'J', cls: 'normal',
    startup: 4, active: 3, recovery: 9,
    damage: 6, chip: 1, hitstun: 15, blockstun: 9,
    reach: 104, height: 'mid', meterGain: 7, meterCost: 0, pushback: 3.2,
    cancelTo: ['light', 'heavy', 'low', ...SPECIALS, 'super'],
  },
  heavy: {
    id: 'heavy', kr: '강 상단', en: 'OVERHEAD', cmd: 'K', cls: 'normal',
    startup: 12, active: 4, recovery: 20,
    damage: 14, chip: 3, hitstun: 24, blockstun: 14,
    reach: 126, height: 'high', meterGain: 11, meterCost: 0, pushback: 6.5,
    cancelTo: [...SPECIALS, 'super'],
  },
  low: {
    id: 'low', kr: '하단 쓸기', en: 'SWEEP', cmd: 'L', cls: 'normal',
    startup: 8, active: 4, recovery: 17,
    damage: 10, chip: 2, hitstun: 20, blockstun: 11,
    reach: 118, height: 'low', meterGain: 9, meterCost: 0, pushback: 4.5,
    cancelTo: ['heavy', ...SPECIALS, 'super'],
  },
  grab: {
    id: 'grab', kr: '잡기', en: 'THROW', cmd: 'I', cls: 'normal',
    startup: 5, active: 2, recovery: 24,
    damage: 13, chip: 0, hitstun: 46, blockstun: 0,
    reach: 76, height: 'grab', meterGain: 10, meterCost: 0, pushback: 9,
    knockdown: true,
  },
  // ── 필살기 ────────────────────────────────
  wave: {
    id: 'wave', kr: '미러파', en: 'MIRROR WAVE', cmd: '↓↘→ + 공격', cls: 'special',
    startup: 12, active: 3, recovery: 23,
    damage: 0, chip: 0, hitstun: 22, blockstun: 12,
    reach: 0, height: 'mid', meterGain: 9, meterCost: 0, pushback: 5,
    cancelTo: ['super'],
    projectile: { speed: 7.6, life: 96, damage: 9, chip: 2 },
  },
  upper: {
    id: 'upper', kr: '리플렉스 어퍼', en: 'REFLEX UPPER', cmd: '→↓↘ + 공격', cls: 'special',
    startup: 4, active: 12, recovery: 26,
    damage: 16, chip: 3, hitstun: 44, blockstun: 15,
    reach: 98, height: 'mid', meterGain: 13, meterCost: 0, pushback: 7,
    cancelTo: ['super'], invuln: [1, 8], launch: -13.4, knockdown: true, advance: 3.4,
  },
  slide: {
    id: 'slide', kr: '글리치 슬라이드', en: 'GLITCH SLIDE', cmd: '↓↙← + 공격', cls: 'special',
    startup: 9, active: 10, recovery: 21,
    damage: 12, chip: 2, hitstun: 36, blockstun: 12,
    reach: 116, height: 'low', meterGain: 11, meterCost: 0, pushback: 9,
    cancelTo: ['super'], knockdown: true, advance: 9.2,
  },
  // ── 초필살기 / 버스트 ─────────────────────
  super: {
    id: 'super', kr: '역-학습 오버라이드', en: 'REVERSE OVERRIDE', cmd: '↓↘→ ↓↘→ + 공격', cls: 'super',
    startup: 6, active: 22, recovery: 30,
    damage: 12, chip: 2, hitstun: 24, blockstun: 10,
    reach: 150, height: 'mid', meterGain: 0, meterCost: 100, pushback: 5,
    invuln: [1, 10], advance: 2.6, knockdown: true,
    multi: { times: 5, interval: 4 },
  },
  burst: {
    id: 'burst', kr: '노이즈 버스트', en: 'NOISE BURST', cmd: 'O', cls: 'super',
    startup: 13, active: 7, recovery: 22,
    damage: 19, chip: 0, hitstun: 40, blockstun: 0,
    reach: 168, height: 'unblockable', meterGain: 0, meterCost: 50, pushback: 12,
    knockdown: true,
  },
};

export const MOVE_ORDER: AttackId[] = ['light', 'heavy', 'low', 'grab', 'wave', 'upper', 'slide', 'burst', 'super'];

export interface Projectile {
  owner: 'player' | 'simula';
  x: number; y: number; vx: number;
  damage: number; chip: number;
  life: number; age: number;
  dead: boolean;
}

export type FighterState =
  | 'idle' | 'walk' | 'crouch' | 'jump' | 'dash'
  | 'attack' | 'blockstun' | 'hitstun' | 'down' | 'desync' | 'ko';

export interface Fighter {
  id: 'player' | 'simula';
  x: number;
  y: number;          // 0 = on floor, negative = airborne
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  meter: number;
  state: FighterState;
  timer: number;          // frames left in timed state
  move: AttackId | null;
  moveFrame: number;
  hasHit: boolean;
  blocking: boolean;
  blockLow: boolean;
  crouching: boolean;
  dashDir: number;
  combo: number;
  flash: number;          // hit flash
  guardFlash: number;
  wobble: number;         // liquid wobble accumulator
  lastAction: string;
  cancelWindow: number;   // >0 이면 캔슬 가능
  cancelFrom: AttackId | null;
  hitCount: number;       // 다단히트 카운터
  chainDepth: number;     // 현재 콤보 루트 길이
  invuln: boolean;
  superFlash: number;
}

export interface Intent {
  moveDir: number;         // -1 | 0 | 1 (screen direction)
  dash: number;            // -1 | 0 | 1 (edge)
  jump: boolean;           // edge
  crouch: boolean;         // hold
  block: boolean;          // hold
  attack: AttackId | null; // edge
}

export const NEUTRAL_INTENT: Intent = {
  moveDir: 0, dash: 0, jump: false, crouch: false, block: false, attack: null,
};

export interface FxText {
  x: number; y: number; vy: number;
  life: number; maxLife: number;
  text: string; color: string; size: number;
}

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
  kind: 'spark' | 'drip' | 'ring' | 'shard';
}

export const ARENA = {
  w: 960,
  h: 540,
  floorY: 424,
  left: 74,
  right: 886,
};

export const PHYS = {
  walk: 3.1,
  backWalk: 2.4,
  dashSpeed: 9.4,
  dashFrames: 12,
  dashRecover: 6,
  jumpVy: -14.2,
  gravity: 0.72,
  friction: 0.82,
  bodyHalf: 30,
};

export type Phase = 'intro' | 'fight' | 'roundEnd' | 'matchEnd';
