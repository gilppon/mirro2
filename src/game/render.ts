// ─────────────────────────────────────────────────────────────
//  캔버스 렌더러 — 네온 아레나 + 액체 거울 도플갱어
// ─────────────────────────────────────────────────────────────
import { ARENA, MOVES, type AttackId, type Fighter } from './types';
import type { Engine, TrailSample } from './engine';
import { ACTION_COLOR, ACTION_KR } from './brain';
import { buildRig, type P, type PoseInput, type Rig } from './character';
import {
  OPERATOR_PAL, drawBody, reflection, shadow, simulaPal, type BodyOpts,
} from './draw';

// 천 시뮬레이션 상태 보관 (캐릭터별)
const clothState: Record<string, P[] | null> = { player: null, simula: null, ghost: null };

/** 캐릭터 표시 배율 — 발끝 기준 확대 */
const CHAR_SCALE = 1.22;

/** 캐릭터 전용 좌표계 (발끝 고정 스케일) */
function charSpace(ctx: CanvasRenderingContext2D, x: number, fn: () => void) {
  ctx.save();
  ctx.translate(x, ARENA.floorY);
  ctx.scale(CHAR_SCALE, CHAR_SCALE);
  ctx.translate(-x, -ARENA.floorY);
  fn();
  ctx.restore();
}

function moveProgress(f: Fighter): { phase: 'startup' | 'active' | 'recovery'; t: number } {
  const m = MOVES[(f.move ?? 'light') as AttackId];
  const fr = f.moveFrame;
  if (fr <= m.startup) return { phase: 'startup', t: fr / Math.max(1, m.startup) };
  if (fr <= m.startup + m.active) return { phase: 'active', t: (fr - m.startup) / Math.max(1, m.active) };
  return { phase: 'recovery', t: (fr - m.startup - m.active) / Math.max(1, m.recovery) };
}

function rigOf(f: Fighter, time: number, key: string): Rig {
  const input: PoseInput = {
    x: f.x, y: f.y, facing: f.facing, state: f.state,
    move: f.move, moveFrame: f.moveFrame, wobble: 0,
    blocking: f.blocking, blockLow: f.blockLow,
    crouching: f.crouching, vx: f.vx ?? 0,
  };
  const r = buildRig(input, time, clothState[key] ?? null);
  clothState[key] = r.cloth;
  return r;
}

/** 공격 잔상 궤적 — 손/발 스윕 아크 */
function swingArc(ctx: CanvasRenderingContext2D, f: Fighter, r: Rig, color: string) {
  if (f.state !== 'attack' || !f.move) return;
  const { phase, t } = moveProgress(f);
  if (phase !== 'active') return;
  const m = MOVES[f.move];
  const isLow = m.height === 'low';
  const tip = isLow ? r.footF : r.handF;
  const pivot = isLow ? r.hipF : r.shoulderF;
  const rad = Math.hypot(tip.x - pivot.x, tip.y - pivot.y);
  const ang = Math.atan2(tip.y - pivot.y, tip.x - pivot.x);
  const sweep = (f.move === 'heavy' ? 1.5 : f.move === 'low' ? 1.2 : 0.8) * (0.4 + t * 0.6);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(pivot.x, pivot.y, rad * 0.4, pivot.x, pivot.y, rad * 1.12);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.75, `${color}55`);
  g.addColorStop(1, `${color}00`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(pivot.x, pivot.y);
  ctx.arc(pivot.x, pivot.y, rad * 1.1, ang - sweep, ang + 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(pivot.x, pivot.y, rad, ang - sweep * 0.6, ang + 0.08);
  ctx.stroke();
  ctx.restore();
}

/** 가드 실드 */
function guardShield(ctx: CanvasRenderingContext2D, f: Fighter, r: Rig, color: string) {
  if (!(f.blocking || f.state === 'blockstun')) return;
  const hard = f.state === 'blockstun';
  const cy = f.blockLow ? r.pelvis.y - 6 : r.chest.y + 10;
  ctx.save();
  ctx.shadowColor = color; ctx.shadowBlur = hard ? 26 : 12;
  ctx.strokeStyle = color;
  ctx.globalAlpha = hard ? 0.95 : 0.42;
  ctx.lineWidth = hard ? 3.4 : 2.2;
  ctx.beginPath();
  ctx.ellipse(f.x + f.facing * 22, cy, 26, 44, f.facing * 0.16, -Math.PI / 1.9, Math.PI / 1.9);
  ctx.stroke();
  ctx.globalAlpha = hard ? 0.5 : 0.18;
  ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.ellipse(f.x + f.facing * 22, cy + i * 17, 14 - Math.abs(i) * 3, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// ── 플레이어: 테크슈트 파이터 ─────────────────────
function drawPlayer(ctx: CanvasRenderingContext2D, f: Fighter, time: number) {
  const r = rigOf(f, time, 'player');
  const opts: BodyOpts = {
    pal: OPERATOR_PAL,
    glow: f.flash > 0 ? 1 : 0.45,
    flash: f.flash > 0,
    faceless: false,
    visorLit: f.state === 'attack' ? 1 : f.blocking ? 0.7 : 0.4,
    time,
  };
  shadow(ctx, f.x, f.y, 1.1 + f.y * 0.0016);
  reflection(ctx, r, opts, 0.15);
  charSpace(ctx, f.x, () => {
    swingArc(ctx, f, r,
      f.move === 'heavy' ? '#ff9a3c' : f.move === 'low' ? '#ffd447'
        : f.move === 'upper' ? '#ff7a45' : f.move === 'slide' ? '#c0ff4f' : '#7ff0ff');
    drawBody(ctx, r, opts);
    guardShield(ctx, f, r, '#9fe8ff');
  });
}

// ── 시뮬라: 이목구비 없는 액체 거울 ────────────────
function drawSimula(ctx: CanvasRenderingContext2D, f: Fighter, eng: Engine, time: number) {
  const r = rigOf(f, time, 'simula');
  const absorb = eng.brain.absorption;
  const desync = eng.brain.desync > 0;
  const lv = eng.aBot ? 5 : eng.brain.stage.lv;
  const stageCol = eng.aBot ? '#ff4fa3' : eng.brain.stage.color;
  const betrayer = lv >= 6;
  const pal = simulaPal(eng.skinColor, betrayer);
  const opts: BodyOpts = {
    pal, glow: 0.5 + absorb * 0.5, flash: f.flash > 0,
    faceless: true, visorLit: 0, time,
  };

  shadow(ctx, f.x, f.y, 1.05);
  reflection(ctx, r, opts, 0.2);

  charSpace(ctx, f.x, () => {
    // 액체 아우라 (블러 실루엣)
    ctx.save();
    ctx.filter = betrayer ? 'blur(12px)' : 'blur(8px)';
    ctx.globalAlpha = betrayer ? 0.8 : 0.55 + absorb * 0.25;
    drawBody(ctx, r, {
      ...opts,
      silhouette: desync ? '#7dffc2' : eng.brain.mirrorFlashT > 0 ? '#ff4fa3' : stageCol,
      glow: 0,
    });
    ctx.restore();

    // Lv.6 배신자 균열 오라
    if (betrayer) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(time * 0.006);
      ctx.strokeStyle = '#ff2e5e';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + time * 0.0011;
        const rad = 58 + Math.sin(time * 0.004 + i) * 12;
        ctx.beginPath();
        ctx.moveTo(f.x + Math.cos(a) * rad * 0.45, r.pelvis.y + Math.sin(a) * rad * 0.8);
        ctx.lineTo(f.x + Math.cos(a) * rad, r.pelvis.y + Math.sin(a) * rad * 1.5);
        ctx.stroke();
      }
      ctx.restore();
    }

    swingArc(ctx, f, r, betrayer ? '#ff2e5e' : '#ff86c3');
    drawBody(ctx, r, opts);

    // 표면 하이라이트 — 흐르는 수은 띠
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      const yy = r.chest.y + 6 + i * 20 + Math.sin(time * 0.003 + i) * 5;
      ctx.beginPath();
      ctx.moveTo(r.x - 15, yy);
      ctx.quadraticCurveTo(r.x, yy - 5, r.x + 15, yy);
      ctx.stroke();
    }
    ctx.restore();

    // 부유하는 수은 방울
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const a = time * 0.0013 + i * 1.4;
      const rx = Math.cos(a) * (32 + i * 5);
      const ry = Math.sin(a * 1.4) * 22 - 46;
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(a * 2);
      ctx.fillStyle = betrayer ? '#ffc8d6' : '#dbe8fa';
      ctx.beginPath();
      ctx.ellipse(f.x + rx, r.pelvis.y + ry, 2.6 + (i % 2), 4 + (i % 2), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 미러링: 플레이어 포즈를 겹쳐 복사
    if (eng.brain.mirrorFlashT > 0 && eng.trail.length) {
      const s: TrailSample = eng.trail[eng.trail.length - 1];
      const gr = buildRig(
        { x: f.x, y: s.y, facing: f.facing, state: s.state, move: s.move, moveFrame: s.moveFrame, wobble: 0 },
        time, clothState.ghost,
      );
      clothState.ghost = gr.cloth;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.3 * (eng.brain.mirrorFlashT / 34);
      drawBody(ctx, gr, { ...opts, silhouette: '#ff4fa3', glow: 0 });
      ctx.restore();
    }

    guardShield(ctx, f, r, betrayer ? '#ffb3c4' : '#dcebff');
  });

  // DESYNC 글리치 스캔
  if (desync) {
    ctx.save();
    ctx.strokeStyle = 'rgba(125,255,194,0.9)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const yy = r.head.y + Math.random() * 150;
      ctx.beginPath();
      ctx.moveTo(f.x - 42 + Math.random() * 12, yy);
      ctx.lineTo(f.x + 42 - Math.random() * 12, yy);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── 미러파 비상체
function drawProjectiles(ctx: CanvasRenderingContext2D, eng: Engine, time: number) {
  for (const pr of eng.projectiles) {
    const mine = pr.owner === 'player';
    const c1 = mine ? '#dffaff' : '#ffe4f3';
    const c2 = mine ? '#22d3ee' : '#f0409a';
    const dir = Math.sign(pr.vx);
    const wob = Math.sin(time * 0.02 + pr.age * 0.3) * 3;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 5; i >= 1; i--) {
      ctx.globalAlpha = 0.1 * i;
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.ellipse(pr.x - dir * i * 13, pr.y + wob * 0.3, 20 - i * 2, 13 - i, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(pr.x, pr.y, 2, pr.x, pr.y, 30);
    g.addColorStop(0, c1);
    g.addColorStop(0.45, c2);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(pr.x, pr.y + wob, 30, 24 + wob * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c1;
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(pr.x, pr.y, 14 + Math.sin(pr.age * 0.4) * 4, 18, pr.age * 0.12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, eng: Engine, time: number) {
  const { w, h, floorY } = ARENA;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#05070f');
  g.addColorStop(0.45, '#0a1126');
  g.addColorStop(1, '#04060d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // 신경 코어
  const cx = w / 2, cy = 210;
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.001);
  const rg = ctx.createRadialGradient(cx, cy, 10, cx, cy, 300);
  const ab = eng.brain.absorption;
  rg.addColorStop(0, `rgba(${60 + ab * 150},${120 - ab * 40},${255 - ab * 60},${0.15 + pulse * 0.08})`);
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, w, h);

  // 신경망 노드
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = 'rgba(80,150,230,0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + time * 0.0002;
    const r = 120 + (i % 4) * 46;
    const x = cx + Math.cos(a) * r * 1.8;
    const y = cy + Math.sin(a) * r * 0.5;
    ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2); ctx.stroke();
    if (i % 2 === 0) {
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.globalAlpha = 0.08; ctx.stroke(); ctx.globalAlpha = 0.35;
    }
  }
  ctx.restore();

  // 지평선
  ctx.fillStyle = 'rgba(90,190,255,0.25)';
  ctx.fillRect(0, floorY - 1, w, 1);

  // 원근 격자
  ctx.save();
  ctx.strokeStyle = 'rgba(70,160,255,0.18)';
  ctx.lineWidth = 1;
  for (let i = -12; i <= 12; i++) {
    ctx.beginPath();
    ctx.moveTo(w / 2 + i * 34, floorY);
    ctx.lineTo(w / 2 + i * 240, h);
    ctx.stroke();
  }
  for (let i = 1; i < 9; i++) {
    const y = floorY + Math.pow(i / 9, 2.1) * (h - floorY);
    ctx.globalAlpha = 0.25 - i * 0.015;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.restore();

  // 학습 스트림
  const streamN = 5 + Math.floor(eng.brain.absorption * 14);
  ctx.save();
  for (let i = 0; i < streamN; i++) {
    const t = ((time * 0.00035 + i / streamN) % 1);
    const x0 = eng.p.x, x1 = eng.a.x;
    const x = x0 + (x1 - x0) * t;
    const y = ARENA.floorY - 120 - Math.sin(t * Math.PI) * 90;
    ctx.globalAlpha = Math.sin(t * Math.PI) * 0.75;
    ctx.fillStyle = eng.round >= 2 ? '#ff6fb5' : '#58d7ff';
    ctx.fillRect(x, y, 3, 3);
  }
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, eng: Engine, time: number) {
  const { w, h } = ARENA;
  ctx.save();
  const sh = eng.shake;
  if (sh > 0.4) ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);

  drawBackground(ctx, eng, time);

  // 플레이어 잔상 (시뮬라가 흡수 중인 기억)
  if (eng.brain.stage.lv >= 3 && eng.trail.length) {
    ctx.save();
    for (let i = 0; i < eng.trail.length; i += 5) {
      const s = eng.trail[i];
      const gr = buildRig(
        { x: s.x, y: s.y, facing: s.facing, state: s.state, move: s.move, moveFrame: s.moveFrame, wobble: 0 },
        time, null,
      );
      ctx.globalAlpha = 0.05 + (i / eng.trail.length) * 0.06;
      charSpace(ctx, s.x, () => {
        drawBody(ctx, gr, {
          pal: OPERATOR_PAL, glow: 0, flash: false, faceless: false,
          visorLit: 0, silhouette: '#3fd2ff', time,
        });
      });
    }
    ctx.restore();
  }

  // 초필살기 연출 (암전 + 광선)
  const sf = Math.max(eng.p.superFlash, eng.a.superFlash);
  if (sf > 0) {
    const who = eng.p.superFlash >= eng.a.superFlash ? eng.p : eng.a;
    const k = sf / 70;
    ctx.save();
    ctx.globalAlpha = Math.min(0.7, k * 0.85);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const col = who.id === 'player' ? '#22d3ee' : '#f0409a';
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + time * 0.004;
      ctx.globalAlpha = 0.16 * k;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(who.x, ARENA.floorY - 80);
      ctx.lineTo(who.x + Math.cos(a) * 900, ARENA.floorY - 80 + Math.sin(a) * 900);
      ctx.lineTo(who.x + Math.cos(a + 0.1) * 900, ARENA.floorY - 80 + Math.sin(a + 0.1) * 900);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawSimula(ctx, eng.a, eng, time);
  drawPlayer(ctx, eng.p, time);
  drawProjectiles(ctx, eng, time);

  // 무적 프레임 표시
  for (const f of [eng.p, eng.a]) {
    if (!f.invuln) continue;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(time * 0.04);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(f.x, ARENA.floorY - 88 + f.y * CHAR_SCALE, 48, 100, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 시뮬라의 예측 말풍선
  const live = eng.brain.live;
  if (eng.phase === 'fight' && eng.brain.stage.lv >= 3 && live && live.p > 0.22) {
    const label = `${ACTION_KR[live.action]} ${Math.round(live.p * 100)}%`;
    const col = ACTION_COLOR[live.action];
    ctx.save();
    ctx.font = '700 13px "Noto Sans KR",system-ui,sans-serif';
    const tw = ctx.measureText(label).width;
    const bw = tw + 54;
    const bx = Math.max(10, Math.min(w - bw - 10, eng.a.x - bw / 2));
    const by = ARENA.floorY - 232;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(4,7,15,0.85)';
    ctx.strokeStyle = `${col}99`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(bx, by, bw, 24, 4);
    else ctx.rect(bx, by, bw, 24);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(eng.a.x, by + 34); ctx.lineTo(bx + bw / 2, by + 24);
    ctx.strokeStyle = `${col}55`;
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = '700 9px "JetBrains Mono",monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('예측', bx + 9, by + 16);
    ctx.font = '700 13px "Noto Sans KR",system-ui,sans-serif';
    ctx.fillStyle = col;
    ctx.fillText(label, bx + 38, by + 17);
    if (eng.brain.mirrorFlashT > 0) {
      ctx.fillStyle = '#ff2ea6';
      ctx.font = '700 9px "JetBrains Mono",monospace';
      ctx.fillText('−0.01s', bx + bw - 2, by - 4);
    }
    ctx.restore();
  }

  // 파티클
  for (const p of eng.particles) {
    const a = p.life / p.maxLife;
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = p.color;
    if (p.kind === 'ring') {
      ctx.strokeStyle = p.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, (1 - a) * 90, 0, Math.PI * 2); ctx.stroke();
    } else if (p.kind === 'shard') {
      ctx.fillRect(p.x, p.y, p.size * 3, p.size * 0.9);
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // 데미지 텍스트
  ctx.textAlign = 'center';
  for (const t of eng.texts) {
    const a = Math.min(1, t.life / 24);
    ctx.globalAlpha = a;
    ctx.font = `900 ${t.size}px "Pretendard","Noto Sans KR",system-ui,sans-serif`;
    ctx.fillStyle = '#000';
    ctx.fillText(t.text, t.x + 2, t.y + 2);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;

  // 피격 콤보
  if (eng.p.combo > 1) {
    ctx.font = '900 30px system-ui'; ctx.fillStyle = '#ff4fa3'; ctx.textAlign = 'left';
    ctx.fillText(`${eng.p.combo} HIT`, 34, 320);
    ctx.font = '700 11px "JetBrains Mono",monospace'; ctx.fillStyle = 'rgba(255,120,190,.7)';
    ctx.fillText('시뮬라 콤보', 34, 336);
  }

  // 플레이어 콤보 루트
  const cf = eng.comboFeed;
  if (cf.life > 0 && cf.hits > 1) {
    const a = Math.min(1, cf.life / 22);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'right';
    const bx = w - 34;
    ctx.font = '900 46px system-ui';
    ctx.fillStyle = '#38f2ff';
    ctx.shadowColor = '#0891b2'; ctx.shadowBlur = 18;
    ctx.fillText(`${cf.hits}`, bx - 62, 320);
    ctx.font = '900 20px system-ui';
    ctx.fillStyle = '#dbeafe'; ctx.shadowBlur = 8;
    ctx.fillText('HIT COMBO', bx, 318);
    ctx.shadowBlur = 0;
    ctx.font = '700 13px "JetBrains Mono",monospace';
    ctx.fillStyle = '#fde68a';
    ctx.fillText(`${cf.dmg.toFixed(0)} DMG${cf.best ? '  ★ BEST' : ''}`, bx, 338);
    ctx.font = '600 12px "Noto Sans KR",system-ui,sans-serif';
    ctx.fillStyle = 'rgba(190,215,245,.8)';
    ctx.fillText(cf.route.join(' ▸ '), bx, 358);
    ctx.restore();
  }

  // 실시간 습관 경고
  if (eng.phase === 'fight' && live && live.p > 0.52 && eng.brain.stage.lv >= 3 && !eng.aBot) {
    ctx.save();
    const label = `습관 감지 — ${ACTION_KR[live.action]} ${Math.round(live.p * 100)}%`;
    ctx.font = '700 13px "Noto Sans KR",system-ui,sans-serif';
    const tw = ctx.measureText(label).width;
    const bw = tw + 26;
    const bx = w / 2 - bw / 2;
    const pulse = 0.55 + 0.35 * Math.sin(time * 0.008);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = 'rgba(251,113,133,0.16)';
    ctx.strokeStyle = 'rgba(251,113,133,0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(bx, 96, bw, 25, 3);
    else ctx.rect(bx, 96, bw, 25);
    ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd9e2';
    ctx.fillText(label, w / 2, 113);
    ctx.restore();
  }

  // ═══ READ MOMENT ═══
  const rd = eng.read;
  if (rd) {
    const t = 1 - rd.life / rd.maxLife;
    const inA = Math.min(1, t / 0.12);
    const outA = rd.life < 18 ? rd.life / 18 : 1;
    const a = inA * outA;
    const punch = 1 + (1 - Math.min(1, t / 0.18)) * 0.5;
    const cy = 196;
    ctx.save();
    ctx.globalAlpha = a;

    const bandH = 92 * Math.min(1, t / 0.1);
    const bg = ctx.createLinearGradient(0, cy - bandH / 2, 0, cy + bandH / 2);
    bg.addColorStop(0, 'rgba(0,0,0,0)');
    bg.addColorStop(0.5, `${rd.color}30`);
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, cy - bandH / 2, w, bandH);
    ctx.strokeStyle = `${rd.color}88`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy - bandH / 2); ctx.lineTo(w, cy - bandH / 2);
    ctx.moveTo(0, cy + bandH / 2); ctx.lineTo(w, cy + bandH / 2); ctx.stroke();

    ctx.textAlign = 'center';
    const fs = Math.round(58 * punch);
    ctx.font = `900 ${fs}px "JetBrains Mono", system-ui, sans-serif`;
    const jitter = rd.life > rd.maxLife * 0.72 ? 5 : 1.4;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,0,90,0.85)';
    ctx.fillText(rd.big, w / 2 - jitter * (1 + Math.random()), cy - 4);
    ctx.fillStyle = 'rgba(0,220,255,0.8)';
    ctx.fillText(rd.big, w / 2 + jitter * (1 + Math.random()), cy - 4);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(rd.big, w / 2, cy - 4);

    ctx.font = '800 19px "Noto Sans KR", system-ui, sans-serif';
    ctx.fillStyle = rd.color;
    ctx.fillText(rd.kr, w / 2, cy + 26);
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(rd.sub, w / 2, cy + 44);

    if (rd.repeat >= 3 && rd.kind !== 'broke') {
      ctx.font = '900 13px "JetBrains Mono", monospace';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`×${rd.repeat}`, w / 2 + ctx.measureText(rd.kr).width / 2 + 34, cy + 26);
    }

    if (rd.kind !== 'broke') {
      ctx.strokeStyle = `${rd.color}aa`;
      ctx.lineWidth = 1.2;
      const px = eng.p.x, py = ARENA.floorY - 86;
      const r = 48 + Math.sin(t * 12) * 4;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(ang) * (r - 10), py + Math.sin(ang) * (r - 10));
        ctx.lineTo(px + Math.cos(ang) * (r + 10), py + Math.sin(ang) * (r + 10));
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 연속 피독 경고
  if (eng.phase === 'fight' && eng.tally.streak >= 3 && !eng.aBot) {
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.3 * Math.sin(time * 0.012);
    ctx.textAlign = 'center';
    ctx.font = '800 12px "Noto Sans KR", system-ui, sans-serif';
    ctx.fillStyle = '#fb7185';
    ctx.fillText(`연속 ${eng.tally.streak}회 읽힘 — 패턴을 바꾸세요`, w / 2, 138);
    ctx.restore();
  }

  // 배너
  if (eng.banner) {
    ctx.textAlign = 'center';
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.font = '900 58px system-ui';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#39c6ff'; ctx.shadowBlur = 26;
    ctx.fillText(eng.banner, w / 2, 210);
    ctx.font = '600 19px system-ui';
    ctx.fillStyle = '#9ddcff'; ctx.shadowBlur = 10;
    ctx.fillText(eng.bannerSub, w / 2, 248);
    ctx.restore();
  }

  // 글리치 슬라이스
  if (eng.glitch > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const y = Math.random() * h;
      const hh = 2 + Math.random() * 16;
      const dx = (Math.random() - 0.5) * 80;
      ctx.globalAlpha = 0.1 + Math.random() * 0.22;
      ctx.fillStyle = i % 2 ? '#00ffc3' : '#ff2ea6';
      ctx.fillRect(dx, y, w, hh);
    }
    ctx.restore();
  }

  // 스캔라인 + 비네트
  ctx.globalAlpha = 0.055;
  ctx.fillStyle = '#000';
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  ctx.globalAlpha = 1;
  const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  if (eng.flashScreen > 0.02) {
    ctx.globalAlpha = Math.min(0.5, eng.flashScreen * 0.5);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

