// ─────────────────────────────────────────────────────────────
//  CHARACTER RIG v2 — 셀 셰이딩용 해부학 리그
//  OPERATOR : 테크슈트 헬멧 파이터
//  SIMULA   : 무면(無面) 액체 거울 도플갱어
// ─────────────────────────────────────────────────────────────
import { ARENA, MOVES, type AttackId } from './types';

export interface P { x: number; y: number }
export const pt = (x: number, y: number): P => ({ x, y });

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 2본 IK: root→end 사이 중간 관절 위치. bend 방향으로 굽는다 */
function ik(root: P, end: P, l1: number, l2: number, bend: number): P {
  const dx = end.x - root.x, dy = end.y - root.y;
  let d = Math.hypot(dx, dy);
  const max = (l1 + l2) * 0.99;
  if (d > max) d = max;
  if (d < 0.001) d = 0.001;
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const mx = root.x + ux * a, my = root.y + uy * a;
  return pt(mx + -uy * h * bend, my + ux * h * bend);
}

// ── 신체 치수 (픽셀) ──────────────────────────────
export const DIM = {
  headH: 30, headW: 22,
  neck: 7,
  torsoLen: 50,      // 어깨 → 골반
  waistAt: 0.55,     // 허리 위치 비율
  shoulderW: 46,
  hipW: 27,
  upperArm: 31,
  foreArm: 29,
  thigh: 44,
  shin: 43,
};

export interface Rig {
  x: number; baseY: number; facing: number;
  lean: number; scaleY: number; crouch: number;
  pelvis: P; waist: P; chest: P; neck: P; head: P;
  headTilt: number;
  shoulderF: P; shoulderB: P;
  elbowF: P; handF: P;
  elbowB: P; handB: P;
  hipF: P; hipB: P;
  kneeF: P; footF: P;
  kneeB: P; footB: P;
  cloth: P[];
  airborne: boolean;
  twist: number;
}

export interface PoseInput {
  x: number; y: number; facing: number; state: string;
  move: AttackId | null; moveFrame: number; wobble: number;
  blocking?: boolean; blockLow?: boolean; crouching?: boolean;
  vx?: number;
}

function phaseOf(move: AttackId | null, fr: number) {
  const m = MOVES[(move ?? 'light') as AttackId];
  if (fr <= m.startup) return { p: 'startup' as const, t: fr / Math.max(1, m.startup), m };
  if (fr <= m.startup + m.active) return { p: 'active' as const, t: (fr - m.startup) / Math.max(1, m.active), m };
  return { p: 'recovery' as const, t: (fr - m.startup - m.active) / Math.max(1, m.recovery), m };
}

// ── 힙 케이프 (짧은 자락) 물리 ────────────────────
export function simCloth(prev: P[] | null, anchor: P, fc: number, vx: number, time: number, n = 4): P[] {
  const seg = 11;
  if (!prev || prev.length !== n) {
    return Array.from({ length: n }, (_, i) =>
      pt(anchor.x - fc * seg * (i + 1) * 0.45, anchor.y + seg * (i + 1) * 0.85));
  }
  const out: P[] = [];
  let cur = anchor;
  for (let i = 0; i < n; i++) {
    const p = prev[i];
    const wind = -fc * (4 + Math.abs(vx) * 2.0) + Math.sin(time * 0.005 + i * 1.3) * 1.8;
    let nx = p.x + wind * 0.16;
    let ny = p.y + 2.1;
    const d = Math.hypot(nx - cur.x, ny - cur.y) || 1;
    const k = seg / d;
    nx = cur.x + (nx - cur.x) * k;
    ny = cur.y + (ny - cur.y) * k;
    const floorLimit = ARENA.floorY - 1;
    if (ny > floorLimit) ny = floorLimit;
    const np = pt(lerp(p.x, nx, 0.5), lerp(p.y, ny, 0.5));
    out.push(np);
    cur = np;
  }
  return out;
}

export function buildRig(
  f: PoseInput, time: number, clothPrev: P[] | null, floorY = ARENA.floorY,
): Rig {
  const fc = f.facing;
  const baseY = floorY + Math.min(0, f.y);
  const airborne = f.y < -14;
  const breath = Math.sin(time * 0.0036 + f.x * 0.014);
  const crouchK = (f.crouching || f.blockLow) ? 1 : 0;

  let lean = 0, twist = 0, scaleY = 1;
  let hipH = 76 - crouchK * 24 + breath * 1.2;
  let headTilt = 0;

  // 목표 위치
  let hF = pt(f.x + fc * 31, baseY - 132);
  let hB = pt(f.x + fc * 11, baseY - 125);
  let fF = pt(f.x + fc * 23, baseY);
  let fB = pt(f.x - fc * 19, baseY);

  const st = f.state;

  if (st === 'jump') {
    fF = pt(f.x + fc * 17, baseY - 30);
    fB = pt(f.x - fc * 21, baseY - 12);
    hF = pt(f.x + fc * 34, baseY - 142);
    hB = pt(f.x - fc * 24, baseY - 118);
    lean = fc * 0.1; hipH = 72;
  } else if (st === 'dash') {
    lean = fc * 0.32; hipH = 66; headTilt = fc * 0.1;
    hF = pt(f.x + fc * 44, baseY - 114);
    hB = pt(f.x - fc * 36, baseY - 102);
    fF = pt(f.x + fc * 36, baseY);
    fB = pt(f.x - fc * 33, baseY - 8);
  } else if (st === 'hitstun') {
    lean = -fc * 0.38; hipH = 70; headTilt = -fc * 0.42;
    hF = pt(f.x - fc * 12, baseY - 146);
    hB = pt(f.x - fc * 32, baseY - 126);
    fF = pt(f.x + fc * 30, baseY);
    fB = pt(f.x - fc * 11, baseY);
  } else if (st === 'down' || st === 'ko') {
    scaleY = 0.55; hipH = 24; lean = -fc * 0.5; headTilt = -fc * 0.7;
    hF = pt(f.x - fc * 36, baseY - 10);
    hB = pt(f.x - fc * 46, baseY - 5);
    fF = pt(f.x + fc * 42, baseY - 3);
    fB = pt(f.x + fc * 28, baseY - 12);
  } else if (st === 'blockstun' || f.blocking) {
    lean = -fc * (st === 'blockstun' ? 0.24 : 0.13);
    const low = !!f.blockLow;
    hF = pt(f.x + fc * 21, baseY - (low ? 82 : 138));
    hB = pt(f.x + fc * 12, baseY - (low ? 71 : 124));
    fF = pt(f.x + fc * 13, baseY);
    fB = pt(f.x - fc * 27, baseY);
    headTilt = -fc * 0.1;
  } else if (st === 'attack' && f.move) {
    const { p, t, m } = phaseOf(f.move, f.moveFrame);
    const R = m.reach * 0.8;
    switch (f.move) {
      case 'light': {
        const e = p === 'startup' ? -18 + t * 16
          : p === 'active' ? R * (0.6 + t * 0.4) : R * (1 - t) * 0.6;
        hF = pt(f.x + fc * (24 + e), baseY - 130);
        hB = pt(f.x + fc * 8, baseY - 124);
        lean = fc * 0.16 * (p === 'active' ? 1 : 0.4);
        twist = fc * 0.6; fF = pt(f.x + fc * 26, baseY);
        break;
      }
      case 'heavy': {
        if (p === 'startup') {
          hF = pt(f.x - fc * (16 + t * 28), baseY - 158 - t * 28);
          hB = pt(f.x - fc * (28 + t * 12), baseY - 132);
          lean = -fc * 0.28 * t; headTilt = -fc * 0.16 * t; twist = -fc * 0.7 * t;
        } else {
          const k = p === 'active' ? t : 1;
          hF = pt(f.x + fc * (32 + R * 0.7 * k), baseY - 184 + 96 * k);
          hB = pt(f.x + fc * (8 + 28 * k), baseY - 140 + 46 * k);
          lean = fc * 0.36; headTilt = fc * 0.18; twist = fc * 0.9;
        }
        fF = pt(f.x + fc * 30, baseY); fB = pt(f.x - fc * 28, baseY);
        hipH = 72;
        break;
      }
      case 'low': {
        hipH = 40; scaleY = 0.93;
        const k = p === 'startup' ? t * 0.34 : p === 'active' ? 0.44 + t * 0.56 : 1 - t * 0.6;
        fF = pt(f.x + fc * (20 + R * 0.92 * k), baseY - 7);
        fB = pt(f.x - fc * 15, baseY);
        hF = pt(f.x + fc * 8, baseY - 58);
        hB = pt(f.x - fc * 30, baseY - 42);
        lean = -fc * 0.16;
        break;
      }
      case 'grab': {
        const k = p === 'startup' ? t : p === 'recovery' ? 1 - t : 1;
        hF = pt(f.x + fc * (26 + 50 * k), baseY - 126);
        hB = pt(f.x + fc * (18 + 44 * k), baseY - 110);
        lean = fc * 0.22; hipH = 72; twist = fc * 0.5;
        fF = pt(f.x + fc * 26, baseY);
        break;
      }
      case 'wave': {
        if (p === 'startup') {
          hF = pt(f.x - fc * (12 + t * 30), baseY - 92);
          hB = pt(f.x - fc * (22 + t * 32), baseY - 84);
          lean = -fc * 0.24 * t; hipH = 68 - t * 5; twist = -fc * 0.7 * t;
        } else {
          hF = pt(f.x + fc * 62, baseY - 114);
          hB = pt(f.x + fc * 48, baseY - 104);
          lean = fc * 0.28; twist = fc * 0.5;
        }
        fB = pt(f.x - fc * 38, baseY); fF = pt(f.x + fc * 17, baseY);
        break;
      }
      case 'upper': {
        const r = p === 'startup' ? t : 1;
        hF = pt(f.x + fc * (14 + 20 * r), baseY - 158 - 56 * r);
        hB = pt(f.x - fc * 22, baseY - 108);
        fF = pt(f.x + fc * 22, baseY + 4);
        fB = pt(f.x - fc * 11, baseY - 28 * r);
        lean = fc * 0.32; headTilt = fc * 0.2; twist = fc * 0.8;
        hipH = 78 + r * 8;
        break;
      }
      case 'slide': {
        hipH = 28; scaleY = 0.9;
        fF = pt(f.x + fc * 68, baseY - 5);
        fB = pt(f.x - fc * 9, baseY);
        hF = pt(f.x - fc * 28, baseY - 50);
        hB = pt(f.x - fc * 42, baseY - 28);
        lean = fc * 0.58; headTilt = fc * 0.3;
        break;
      }
      case 'super': {
        const s = Math.sin(f.moveFrame * 0.85);
        hF = pt(f.x + fc * (52 + s * 30), baseY - 124 + s * 16);
        hB = pt(f.x + fc * (38 - s * 28), baseY - 110 - s * 14);
        fF = pt(f.x + fc * 30, baseY); fB = pt(f.x - fc * 30, baseY);
        lean = fc * 0.28; twist = fc * s; hipH = 74;
        break;
      }
      case 'burst': {
        const k = p === 'startup' ? t : 1;
        hF = pt(f.x + fc * (24 + 46 * k), baseY - 142 - 24 * k);
        hB = pt(f.x - fc * (24 + 46 * k), baseY - 142 - 24 * k);
        hipH = 76 + k * 8;
        break;
      }
    }
  } else if (st === 'walk') {
    const s = Math.sin(time * 0.015);
    fF = pt(f.x + fc * (18 + s * 14), baseY - Math.max(0, s) * 8);
    fB = pt(f.x - fc * (18 + s * 14), baseY - Math.max(0, -s) * 8);
    hF = pt(f.x + fc * (28 - s * 8), baseY - 134);
    hB = pt(f.x + fc * (10 + s * 9), baseY - 124);
    hipH = 75 - Math.abs(s) * 3; lean = fc * 0.07;
  } else {
    // idle — 파이팅 스탠스
    const b = Math.sin(time * 0.0036 + 1.1);
    hF = pt(f.x + fc * 30, baseY - 133 + b * 2.4);
    hB = pt(f.x + fc * 10, baseY - 126 + b * 1.8);
    fF = pt(f.x + fc * 23, baseY);
    fB = pt(f.x - fc * 20, baseY - Math.max(0, -Math.sin(time * 0.0036)) * 1);
    lean = fc * 0.05;
  }

  // ── 코어 체인
  const pelvis = pt(f.x + Math.sin(lean) * 8, baseY - hipH);
  const chestH = DIM.torsoLen * scaleY;
  const waist = pt(pelvis.x + Math.sin(lean) * chestH * 0.45, pelvis.y - chestH * DIM.waistAt);
  const chest = pt(waist.x + Math.sin(lean) * chestH * 0.6, waist.y - chestH * (1 - DIM.waistAt));
  const neck = pt(chest.x + Math.sin(lean) * DIM.neck, chest.y - DIM.neck * scaleY);
  const head = pt(neck.x + fc * 3 + Math.sin(lean + headTilt) * 10, neck.y - DIM.headH * 0.5 * scaleY);

  const tw = 1 - Math.abs(twist) * 0.3;
  const shoulderF = pt(chest.x + fc * DIM.shoulderW * 0.40 * tw, chest.y + 4);
  const shoulderB = pt(chest.x - fc * DIM.shoulderW * 0.54 * tw, chest.y + 6);
  const hipF = pt(pelvis.x + fc * DIM.hipW * 0.42, pelvis.y + 1);
  const hipB = pt(pelvis.x - fc * DIM.hipW * 0.52, pelvis.y + 2);

  const elbowF = ik(shoulderF, hF, DIM.upperArm, DIM.foreArm, fc * 0.85);
  const elbowB = ik(shoulderB, hB, DIM.upperArm, DIM.foreArm, fc * 0.85);
  const kneeF = ik(hipF, fF, DIM.thigh * scaleY, DIM.shin * scaleY, -fc);
  const kneeB = ik(hipB, fB, DIM.thigh * scaleY, DIM.shin * scaleY, -fc);

  const cloth = simCloth(clothPrev, pt(pelvis.x - fc * 5, pelvis.y - 6), fc, f.vx ?? 0, time);

  return {
    x: f.x, baseY, facing: fc, lean, scaleY, crouch: crouchK,
    pelvis, waist, chest, neck, head, headTilt,
    shoulderF, shoulderB, elbowF, handF: hF, elbowB, handB: hB,
    hipF, hipB, kneeF, footF: fF, kneeB, footB: fB,
    cloth, airborne, twist,
  };
}
