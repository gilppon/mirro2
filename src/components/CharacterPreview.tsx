import { useEffect, useRef } from 'react';
import { ARENA } from '../game/types';
import { buildRig, type P, type PoseInput } from '../game/character';
import { OPERATOR_PAL, drawBody, simulaPal } from '../game/draw';

interface Props {
  who: 'operator' | 'simula';
  size?: number;
  skin?: string;
  betrayer?: boolean;
  animate?: boolean;
  pose?: 'idle' | 'attack' | 'guard';
  className?: string;
}

const W = 240;
const H = 300;
const FLOOR = 282;

/** 게임 렌더러로 캐릭터를 그대로 그려 보여준다 */
export default function CharacterPreview({
  who, size = 280, skin = '#cfe0f5', betrayer = false, animate = true,
  pose = 'idle', className,
}: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef(0);
  const cloth = useRef<P[] | null>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr;
    cv.height = H * dpr;
    cv.style.width = `${size}px`;
    cv.style.height = `${Math.round((size * H) / W)}px`;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const loop = (now: number) => {
      if (animate) raf.current = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, W, H);

      const pal = who === 'operator' ? OPERATOR_PAL : simulaPal(skin, betrayer);

      // 배경 글로우
      const bg = ctx.createRadialGradient(W / 2, H * 0.4, 6, W / 2, H * 0.4, W * 0.72);
      bg.addColorStop(0, `${pal.accent}20`);
      bg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const input: PoseInput = pose === 'guard'
        ? { x: W / 2, y: 0, facing: 1, state: 'idle', move: null, moveFrame: 0, wobble: 0, blocking: true }
        : pose === 'attack'
          ? { x: W / 2, y: 0, facing: 1, state: 'attack', move: 'heavy', moveFrame: 14, wobble: 0 }
          : { x: W / 2, y: 0, facing: 1, state: 'idle', move: null, moveFrame: 0, wobble: 0 };

      const rig = buildRig(input, now, cloth.current, FLOOR);
      cloth.current = rig.cloth;

      // 그림자
      const sg = ctx.createRadialGradient(W / 2, FLOOR + 4, 2, W / 2, FLOOR + 4, 48);
      sg.addColorStop(0, 'rgba(0,0,0,.55)');
      sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.ellipse(W / 2, FLOOR + 4, 44, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // 리그는 ARENA.floorY 기준 좌표 → 캔버스로 평행이동
      ctx.save();
      ctx.translate(0, FLOOR - ARENA.floorY);
      drawBody(ctx, rig, {
        pal, glow: 0.6, flash: false,
        faceless: who === 'simula', visorLit: 0.5, time: now,
      });
      ctx.restore();

      // 바닥 라인
      ctx.strokeStyle = 'rgba(120,190,255,.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(10, FLOOR + 4);
      ctx.lineTo(W - 10, FLOOR + 4);
      ctx.stroke();
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [who, skin, betrayer, animate, size, pose]);

  return <canvas ref={ref} className={className} />;
}
