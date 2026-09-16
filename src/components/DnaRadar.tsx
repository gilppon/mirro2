import type { DNA } from '../game/dna';

const AXES: { key: keyof DNA; kr: string }[] = [
  { key: 'aggression', kr: '공격' },
  { key: 'pressure', kr: '압박' },
  { key: 'risk', kr: '위험' },
  { key: 'grab', kr: '잡기' },
  { key: 'aerial', kr: '점프' },
  { key: 'zoning', kr: '거리' },
  { key: 'defense', kr: '방어' },
  { key: 'counter', kr: '카운터' },
  { key: 'repetition', kr: '반복' },
];

interface Props {
  dna: DNA;
  compare?: DNA;
  color?: string;
  compareColor?: string;
  size?: number;
  labels?: boolean;
}

export default function DnaRadar({
  dna, compare, color = '#38f2ff', compareColor = '#ff4fa3', size = 230, labels = true,
}: Props) {
  const cx = size / 2, cy = size / 2;
  const R = size * 0.34;
  const pts = (d: DNA) =>
    AXES.map((a, i) => {
      const ang = (i / AXES.length) * Math.PI * 2 - Math.PI / 2;
      const r = (Math.max(4, d[a.key]) / 100) * R;
      return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r];
    });
  const poly = (d: DNA) => pts(d).map((p) => p.join(',')).join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
      <defs>
        <radialGradient id="rg-bg">
          <stop offset="0%" stopColor="rgba(80,160,255,.12)" />
          <stop offset="100%" stopColor="rgba(80,160,255,0)" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={R * 1.12} fill="url(#rg-bg)" />
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon
          key={k}
          points={AXES.map((_, i) => {
            const ang = (i / AXES.length) * Math.PI * 2 - Math.PI / 2;
            return `${cx + Math.cos(ang) * R * k},${cy + Math.sin(ang) * R * k}`;
          }).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,.09)"
          strokeWidth={1}
        />
      ))}
      {AXES.map((a, i) => {
        const ang = (i / AXES.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(ang) * R;
        const y = cy + Math.sin(ang) * R;
        const lx = cx + Math.cos(ang) * (R * 1.3);
        const ly = cy + Math.sin(ang) * (R * 1.3);
        return (
          <g key={a.key}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,.08)" strokeWidth={1} />
            {labels && (
              <text
                x={lx} y={ly + 3}
                textAnchor="middle"
                className="fill-white/45"
                style={{ fontSize: size * 0.045, fontFamily: 'JetBrains Mono, monospace' }}
              >
                {a.kr}
              </text>
            )}
          </g>
        );
      })}
      {compare && (
        <polygon points={poly(compare)} fill={`${compareColor}22`} stroke={compareColor} strokeWidth={1.6} strokeDasharray="4 3" />
      )}
      <polygon points={poly(dna)} fill={`${color}30`} stroke={color} strokeWidth={2} />
      {pts(dna).map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={2.6} fill={color} />
      ))}
    </svg>
  );
}
