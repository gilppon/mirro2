// ─────────────────────────────────────────────────────────────
//  CHARACTER PAINT — 셀 셰이딩 (아웃라인 → 필 → 하이라이트)
// ─────────────────────────────────────────────────────────────
import { ARENA } from './types';
import { DIM, type P, type Rig } from './character';

export interface Palette {
  hi: string;        // 명부
  mid: string;       // 중간톤
  lo: string;        // 암부
  armor: string;     // 장갑판
  accent: string;    // 발광 라인
  visor: string;
  cloth: string;
  outline: string;   // 외곽선
}

export const OPERATOR_PAL: Palette = {
  hi: '#2f7fa6', mid: '#16465f', lo: '#0a2434',
  armor: '#071620', accent: '#38f2ff', visor: '#a8f8ff',
  cloth: '#0d3a4e', outline: '#01070c',
};

export function simulaPal(skin: string, betrayer: boolean): Palette {
  if (betrayer) {
    return {
      hi: '#ff9fb8', mid: '#8c2742', lo: '#2c0a16',
      armor: '#1d0510', accent: '#ff2e5e', visor: '#ffd8e2',
      cloth: '#3d0d1d', outline: '#0d0206',
    };
  }
  return {
    hi: '#f4f9ff', mid: skin, lo: '#47536e',
    armor: '#2a3348', accent: '#cfe9ff', visor: '#ffffff',
    cloth: '#39455e', outline: '#070a12',
  };
}

export interface BodyOpts {
  pal: Palette;
  glow: number;
  flash: boolean;
  faceless: boolean;
  visorLit: number;
  silhouette?: string;
  time: number;
}

// ── 경로 빌더 (fill/stroke 공용) ───────────────────
/**
 * 2세그먼트 사지 — 두 캡슐을 한 경로의 서브패스로 추가.
 * fill()의 non-zero winding이 두 도형을 자동 합집합한다.
 */
function bonePath(ctx: CanvasRenderingContext2D, a: P, m: P, b: P, w1: number, w2: number, w3: number) {
  capsule(ctx, a, m, w1, w2);
  capsule(ctx, m, b, w2, w3);
}

/** 캡슐(테이퍼) 서브패스 추가 — beginPath 호출 없음 */
function capsule(ctx: CanvasRenderingContext2D, a: P, b: P, w1: number, w2: number) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const s1 = Math.atan2(ny, nx);
  const s2 = Math.atan2(-ny, -nx);
  // 시계 방향으로 통일해야 non-zero 합집합이 보장된다
  const cw = s2 > s1;
  ctx.moveTo(a.x + nx * w1, a.y + ny * w1);
  ctx.lineTo(b.x + nx * w2, b.y + ny * w2);
  ctx.arc(b.x, b.y, w2, s1, s2, !cw);
  ctx.lineTo(a.x - nx * w1, a.y - ny * w1);
  ctx.arc(a.x, a.y, w1, s2, s1, !cw);
  ctx.closePath();
}



/** 몸통 — 어깨→허리→골반 유기적 형태 */
function torsoPath(ctx: CanvasRenderingContext2D, r: Rig) {
  const fc = r.facing;
  const sw = DIM.shoulderW * 0.5;
  const hw = DIM.hipW * 0.5;
  ctx.beginPath();
  // 앞쪽 어깨에서 시작
  ctx.moveTo(r.chest.x + fc * sw * 0.95, r.chest.y - 4);
  // 옆구리 → 골반
  ctx.quadraticCurveTo(
    r.waist.x + fc * hw * 1.15, r.waist.y - 4,
    r.pelvis.x + fc * hw * 0.95, r.pelvis.y + 4,
  );
  // 골반 하단
  ctx.quadraticCurveTo(r.pelvis.x, r.pelvis.y + 13, r.pelvis.x - fc * hw * 0.95, r.pelvis.y + 4);
  // 반대 옆구리
  ctx.quadraticCurveTo(
    r.waist.x - fc * hw * 1.15, r.waist.y - 4,
    r.chest.x - fc * sw * 0.95, r.chest.y - 4,
  );
  // 어깨 상단
  ctx.quadraticCurveTo(r.chest.x, r.chest.y - 15, r.chest.x + fc * sw * 0.95, r.chest.y - 4);
  ctx.closePath();
}

/** 머리 — 캐릭터별 실루엣 */
function headPath(ctx: CanvasRenderingContext2D, r: Rig, faceless: boolean) {
  const fc = r.facing;
  const w = DIM.headW * 0.5, h = DIM.headH * 0.5;
  ctx.save();
  ctx.translate(r.head.x, r.head.y);
  ctx.rotate(r.headTilt * 0.55);
  ctx.beginPath();
  if (faceless) {
    // 매끈한 타원형 두상
    ctx.moveTo(0, -h);
    ctx.bezierCurveTo(fc * w * 1.05, -h * 0.92, fc * w * 1.1, h * 0.5, fc * w * 0.72, h * 0.88);
    ctx.quadraticCurveTo(0, h * 1.05, -fc * w * 0.78, h * 0.82);
    ctx.bezierCurveTo(-fc * w * 1.08, h * 0.4, -fc * w * 1.0, -h * 0.9, 0, -h);
  } else {
    // 헬멧 — 각진 상부 + 턱 가드
    ctx.moveTo(-fc * w * 0.6, -h);
    ctx.lineTo(fc * w * 0.55, -h);
    ctx.quadraticCurveTo(fc * w * 1.08, -h * 0.86, fc * w * 1.0, -h * 0.12);
    ctx.lineTo(fc * w * 1.0, h * 0.4);
    ctx.quadraticCurveTo(fc * w * 0.96, h * 0.92, fc * w * 0.3, h * 0.98);
    ctx.lineTo(-fc * w * 0.55, h * 0.92);
    ctx.quadraticCurveTo(-fc * w * 0.82, h * 0.3, -fc * w * 0.78, -h * 0.3);
    ctx.quadraticCurveTo(-fc * w * 0.8, -h * 0.92, -fc * w * 0.6, -h);
  }
  ctx.closePath();
  ctx.restore();
}

/** 목 */
function neckPath(ctx: CanvasRenderingContext2D, r: Rig) {
  ctx.beginPath();
  capsule(ctx, r.chest, r.neck, 8, 6.5);
}

/** 힙 케이프 */
function clothPath(ctx: CanvasRenderingContext2D, r: Rig) {
  const c = r.cloth;
  if (c.length < 2) return;
  const fc = r.facing;
  const a = r.pelvis;
  ctx.beginPath();
  ctx.moveTo(a.x + fc * 10, a.y - 12);
  for (let i = 0; i < c.length; i++) {
    const w = 11 - i * 1.6;
    ctx.lineTo(c[i].x + fc * w, c[i].y);
  }
  for (let i = c.length - 1; i >= 0; i--) {
    const w = 11 - i * 1.6;
    ctx.lineTo(c[i].x - fc * w * 0.7, c[i].y + 4);
  }
  ctx.lineTo(a.x - fc * 12, a.y - 9);
  ctx.closePath();
}

// ── 파츠 목록 (그리기 순서대로) ───────────────────
type Part = { build: (ctx: CanvasRenderingContext2D) => void };

function partsBack(r: Rig, o: BodyOpts): Part[] {
  const s = r.scaleY;
  return [
    { build: (c) => clothPath(c, r) },
    { build: (c) => bonePath(c, r.hipB, r.kneeB, r.footB, 12 * s, 9 * s, 6 * s) },
    { build: (c) => bonePath(c, r.shoulderB, r.elbowB, r.handB, 9, 7, 5) },
    { build: (c) => torsoPath(c, r) },
    { build: (c) => neckPath(c, r) },
    { build: (c) => headPath(c, r, o.faceless) },
    { build: (c) => bonePath(c, r.hipF, r.kneeF, r.footF, 13 * s, 10 * s, 6.5 * s) },
  ];
}

function partFront(r: Rig): Part {
  return { build: (c) => bonePath(c, r.shoulderF, r.elbowF, r.handF, 10, 8, 5.6) };
}

// ═══════════════════════════════════════════════════
//  본문 렌더
// ═══════════════════════════════════════════════════
export function drawBody(ctx: CanvasRenderingContext2D, r: Rig, o: BodyOpts) {
  const pal = o.pal;
  const solid = o.silhouette;
  const fc = r.facing;

  const bodyGrad = (() => {
    if (solid) return solid;
    const g = ctx.createLinearGradient(r.x - 34, r.head.y - 14, r.x + 34, r.baseY + 4);
    if (o.flash) { g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#ffe9f2'); g.addColorStop(1, '#cfe6f5'); return g; }
    g.addColorStop(0, pal.hi);
    g.addColorStop(0.34, pal.mid);
    g.addColorStop(0.72, pal.lo);
    g.addColorStop(1, pal.mid);
    return g;
  })();

  const back = partsBack(r, o);

  ctx.save();
  if (o.glow > 0 && !solid) {
    ctx.shadowColor = pal.accent;
    ctx.shadowBlur = 10 + o.glow * 16;
  }

  // ── 1. 아웃라인 패스 (확장)
  if (!solid) {
    ctx.fillStyle = pal.outline;
    ctx.strokeStyle = pal.outline;
    ctx.lineWidth = 4.5;
    ctx.lineJoin = 'round';
    for (const p of back) { p.build(ctx); ctx.fill(); ctx.stroke(); }
  }

  // ── 2. 필 패스
  ctx.fillStyle = bodyGrad;
  for (const p of back) { p.build(ctx); ctx.fill(); }

  ctx.restore();

  // ── 3. 명암 / 의상 (실루엣 모드에서는 생략)
  if (!solid) {
    shadeTop(ctx, r, pal);
    costume(ctx, r, o);
  }

  // ── 4. 앞 팔 (몸통 위에 별도 아웃라인)
  const front = partFront(r);
  ctx.save();
  if (!solid) {
    ctx.fillStyle = pal.outline;
    ctx.strokeStyle = pal.outline;
    ctx.lineWidth = 4;
    front.build(ctx); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = bodyGrad;
  front.build(ctx); ctx.fill();
  ctx.restore();
  if (solid) return;

  // 앞팔 하이라이트
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(r.shoulderF.x + fc * 4, r.shoulderF.y - 5);
  ctx.lineTo(r.elbowF.x + fc * 3, r.elbowF.y - 4);
  ctx.lineTo(r.handF.x + fc * 2, r.handF.y - 3);
  ctx.stroke();
  ctx.restore();
  // 장갑 / 어깨
  glove(ctx, r.handF, r.elbowF, pal, 7.4);
  shoulderPad(ctx, r.shoulderF, fc, pal, true);

  // ── 림라이트: 외곽선 안쪽에 아주 얇은 발광 테두리
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = pal.accent;
  ctx.lineWidth = 1.4;
  ctx.lineJoin = 'round';
  for (const p of back) { p.build(ctx); ctx.stroke(); }
  ctx.globalAlpha = 0.55;
  front.build(ctx); ctx.stroke();
  ctx.restore();
}

/** 상단 광원 명암 — 몸통/다리 위쪽 밝게 */
function shadeTop(ctx: CanvasRenderingContext2D, r: Rig, pal: Palette) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  // 몸통 앞모서리
  ctx.beginPath();
  ctx.moveTo(r.chest.x + r.facing * 14, r.chest.y - 3);
  ctx.quadraticCurveTo(r.waist.x + r.facing * 10, r.waist.y, r.pelvis.x + r.facing * 8, r.pelvis.y + 2);
  ctx.stroke();
  // 다리 앞모서리
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(r.hipF.x + r.facing * 8, r.hipF.y);
  ctx.lineTo(r.kneeF.x + r.facing * 6, r.kneeF.y);
  ctx.lineTo(r.footF.x + r.facing * 4, r.footF.y - 4);
  ctx.stroke();
  ctx.restore();
  void pal;
}

// ── 의상 파츠 ─────────────────────────────────────
function costume(ctx: CanvasRenderingContext2D, r: Rig, o: BodyOpts) {
  const fc = r.facing;
  const pal = o.pal;

  // 흉갑
  ctx.save();
  ctx.fillStyle = pal.armor;
  ctx.beginPath();
  ctx.moveTo(r.chest.x + fc * 13, r.chest.y - 2);
  ctx.quadraticCurveTo(r.chest.x + fc * 17, r.chest.y + 15, r.chest.x + fc * 6, r.chest.y + 26);
  ctx.lineTo(r.chest.x - fc * 11, r.chest.y + 23);
  ctx.quadraticCurveTo(r.chest.x - fc * 15, r.chest.y + 8, r.chest.x - fc * 11, r.chest.y - 2);
  ctx.quadraticCurveTo(r.chest.x, r.chest.y - 7, r.chest.x + fc * 13, r.chest.y - 2);
  ctx.closePath();
  ctx.fill();
  // 코어 라이트
  const cg = ctx.createRadialGradient(r.chest.x + fc * 2, r.chest.y + 11, 0, r.chest.x + fc * 2, r.chest.y + 11, 9);
  cg.addColorStop(0, pal.accent);
  cg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.ellipse(r.chest.x + fc * 2, r.chest.y + 11, 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 벨트
  ctx.save();
  ctx.translate(r.pelvis.x, r.pelvis.y - 3);
  ctx.rotate(r.lean * 0.5);
  ctx.fillStyle = pal.armor;
  ctx.fillRect(-DIM.hipW * 0.9, -4, DIM.hipW * 1.8, 8.5);
  ctx.fillStyle = pal.accent;
  ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.arc(fc * 3, 0, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();

  // 부츠 (뒤 → 앞)
  boot(ctx, r.footB, r.kneeB, fc, pal, false);
  boot(ctx, r.footF, r.kneeF, fc, pal, true);

  // 뒤 팔 보호대 + 장갑
  glove(ctx, r.handB, r.elbowB, pal, 6.2);
  shoulderPad(ctx, r.shoulderB, fc, pal, false);

  // 무릎 패드
  kneePad(ctx, r.kneeF, fc, pal, true);
  kneePad(ctx, r.kneeB, fc, pal, false);

  // 얼굴
  if (o.faceless) faceOverlay(ctx, r, o);
  else visorOverlay(ctx, r, o);
}

function boot(ctx: CanvasRenderingContext2D, ankle: P, knee: P, fc: number, pal: Palette, front: boolean) {
  const w = front ? 12 : 10.5;
  const dx = ankle.x - knee.x;
  const dir = Math.sign(dx) === 0 ? fc : Math.sign(dx);
  ctx.save();
  ctx.fillStyle = pal.armor;
  ctx.beginPath();
  ctx.moveTo(ankle.x - dir * 7, ankle.y - w);
  ctx.quadraticCurveTo(ankle.x + dir * 8, ankle.y - w * 0.8, ankle.x + dir * 16, ankle.y - w * 0.45);
  ctx.quadraticCurveTo(ankle.x + dir * 20, ankle.y + 1.5, ankle.x + dir * 14, ankle.y + 3.5);
  ctx.lineTo(ankle.x - dir * 10, ankle.y + 3.5);
  ctx.quadraticCurveTo(ankle.x - dir * 13, ankle.y - 2, ankle.x - dir * 7, ankle.y - w);
  ctx.closePath();
  ctx.fill();
  // 발등 발광 라인
  ctx.strokeStyle = pal.accent;
  ctx.globalAlpha = front ? 0.85 : 0.4;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(ankle.x - dir * 5, ankle.y - w * 0.55);
  ctx.lineTo(ankle.x + dir * 13, ankle.y - w * 0.4);
  ctx.stroke();
  ctx.restore();
}

function kneePad(ctx: CanvasRenderingContext2D, knee: P, fc: number, pal: Palette, front: boolean) {
  ctx.save();
  ctx.fillStyle = pal.armor;
  ctx.beginPath();
  ctx.ellipse(knee.x + fc * 1.5, knee.y, front ? 7 : 6, front ? 8 : 7, fc * 0.3, 0, Math.PI * 2);
  ctx.fill();
  if (front) {
    ctx.strokeStyle = pal.accent;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(knee.x + fc * 1.5, knee.y, 4, 5, fc * 0.3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function glove(ctx: CanvasRenderingContext2D, hand: P, wrist: P, pal: Palette, rad: number) {
  const dx = hand.x - wrist.x, dy = hand.y - wrist.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const ang = Math.atan2(uy, ux);
  ctx.save();
  ctx.fillStyle = pal.outline;
  ctx.beginPath();
  ctx.ellipse(hand.x + ux * 2, hand.y + uy * 2, rad * 1.3, rad * 1.15, ang, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.armor;
  ctx.beginPath();
  ctx.ellipse(hand.x + ux * 2, hand.y + uy * 2, rad * 1.15, rad, ang, 0, Math.PI * 2);
  ctx.fill();
  // 너클 발광
  ctx.fillStyle = pal.accent;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.ellipse(hand.x + ux * rad * 0.75, hand.y + uy * rad * 0.75, 2.6, 2.1, ang, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function shoulderPad(ctx: CanvasRenderingContext2D, s: P, fc: number, pal: Palette, front: boolean) {
  const w = front ? 16 : 13;
  ctx.save();
  ctx.fillStyle = pal.outline;
  ctx.beginPath();
  ctx.ellipse(s.x + fc * 2, s.y - 1, w * 0.78, w * 0.6, fc * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.armor;
  ctx.beginPath();
  ctx.ellipse(s.x + fc * 2, s.y - 1, w * 0.68, w * 0.52, fc * 0.2, 0, Math.PI * 2);
  ctx.fill();
  if (front) {
    ctx.strokeStyle = pal.accent;
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(s.x + fc * 2, s.y - 1, w * 0.48, w * 0.34, fc * 0.2, -2.4, -0.4);
    ctx.stroke();
  }
  ctx.restore();
}

// ── OPERATOR: 바이저 ─────────────────────────────
function visorOverlay(ctx: CanvasRenderingContext2D, r: Rig, o: BodyOpts) {
  const fc = r.facing;
  const pal = o.pal;
  const w = DIM.headW * 0.5, h = DIM.headH * 0.5;
  ctx.save();
  ctx.translate(r.head.x, r.head.y);
  ctx.rotate(r.headTilt * 0.55);

  // 바이저 프레임
  ctx.fillStyle = pal.armor;
  ctx.beginPath();
  ctx.moveTo(-fc * w * 0.84, -h * 0.34);
  ctx.quadraticCurveTo(fc * w * 0.1, -h * 0.56, fc * w * 0.97, -h * 0.26);
  ctx.lineTo(fc * w * 0.94, h * 0.2);
  ctx.quadraticCurveTo(fc * w * 0.05, h * 0.02, -fc * w * 0.82, h * 0.1);
  ctx.closePath();
  ctx.fill();

  // 발광 렌즈
  const lit = 0.45 + o.visorLit * 0.55;
  ctx.save();
  ctx.shadowColor = pal.visor;
  ctx.shadowBlur = 10 * lit;
  const vg = ctx.createLinearGradient(-w, 0, w, 0);
  vg.addColorStop(0, `${pal.visor}30`);
  vg.addColorStop(0.45, pal.visor);
  vg.addColorStop(0.85, `${pal.visor}70`);
  ctx.globalAlpha = lit;
  ctx.fillStyle = vg;
  ctx.beginPath();
  ctx.moveTo(-fc * w * 0.74, -h * 0.26);
  ctx.quadraticCurveTo(fc * w * 0.06, -h * 0.46, fc * w * 0.87, -h * 0.19);
  ctx.lineTo(fc * w * 0.85, h * 0.12);
  ctx.quadraticCurveTo(fc * w * 0.04, -h * 0.05, -fc * w * 0.72, h * 0.03);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 헬멧 크레스트
  ctx.fillStyle = pal.armor;
  ctx.beginPath();
  ctx.moveTo(-fc * w * 0.3, -h * 0.99);
  ctx.quadraticCurveTo(fc * w * 0.5, -h * 1.16, fc * w * 0.34, -h * 0.7);
  ctx.lineTo(-fc * w * 0.5, -h * 0.78);
  ctx.closePath();
  ctx.fill();

  // 후두부 배기 슬릿
  ctx.fillStyle = pal.accent;
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(-fc * w * 0.9, -h * 0.12 + i * 4.2, -fc * 4.5, 2);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── SIMULA: 무면 거울 ────────────────────────────
function faceOverlay(ctx: CanvasRenderingContext2D, r: Rig, o: BodyOpts) {
  const w = DIM.headW * 0.5, h = DIM.headH * 0.5;
  const pal = o.pal;
  ctx.save();
  ctx.translate(r.head.x, r.head.y);
  ctx.rotate(r.headTilt * 0.55);

  // 크롬 반사
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.98, h * 0.98, 0, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createLinearGradient(-w, -h, w * 0.6, h);
  g.addColorStop(0, 'rgba(255,255,255,0.92)');
  g.addColorStop(0.34, 'rgba(255,255,255,0.05)');
  g.addColorStop(0.56, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.78, 'rgba(255,255,255,0.02)');
  g.addColorStop(1, 'rgba(255,255,255,0.7)');
  ctx.fillStyle = g;
  ctx.fillRect(-w * 1.2, -h * 1.2, w * 2.4, h * 2.4);
  // 흐르는 스캔 라인
  ctx.strokeStyle = `${pal.accent}dd`;
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 5; i++) {
    const y = -h + ((o.time * 0.05 + i * 7) % (h * 2));
    ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.restore();

  // 하단 경계 음영
  ctx.strokeStyle = pal.outline;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.95, h * 0.95, 0, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  ctx.restore();
}

// ── 그림자 / 반사 ─────────────────────────────────
export function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  const s = Math.max(0.45, scale);
  const g = ctx.createRadialGradient(x, ARENA.floorY + 4, 2, x, ARENA.floorY + 4, 44 * s);
  g.addColorStop(0, 'rgba(0,0,0,0.6)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, ARENA.floorY + 4, 40 * s, 10 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  void y;
}

export function reflection(ctx: CanvasRenderingContext2D, r: Rig, o: BodyOpts, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(0, ARENA.floorY * 2 + 10);
  ctx.scale(1, -1);
  ctx.filter = 'blur(2.5px)';
  drawBody(ctx, r, { ...o, silhouette: o.pal.lo, glow: 0, visorLit: 0 });
  ctx.restore();
}
