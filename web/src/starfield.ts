export type Star = {
  x: number;
  y: number;
  r: number;
  a: number;
  tint: number;
};

export type StarLayer = {
  depth: number;
  stars: Star[];
};

export function starLayers(seed = 0x9e3779b9): StarLayer[] {
  return [
    { depth: 0.08, stars: sprinkle(240, 0.024, seed, 0.5, 0.2) },
    { depth: 0.22, stars: sprinkle(52, 0.065, seed ^ 0x85ebca6b, 1.05, 0.36) },
    { depth: 0.45, stars: sprinkle(20, 0.12, seed ^ 0xc2b2ae35, 1.55, 0.52) },
  ];
}

export function sprinkle(
  count: number,
  minDist: number,
  seed: number,
  size: number,
  alpha: number,
): Star[] {
  const rand = mulberry32(seed);
  const pts = poisson(count, minDist, rand);
  return pts.map((pt) => {
    const mag = rand() ** 2.15;
    return {
      x: pt.x,
      y: pt.y,
      r: 0.35 + mag * size,
      a: 0.06 + mag * alpha,
      tint: rand(),
    };
  });
}

export function poisson(count: number, minDist: number, rand: () => number): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const min2 = minDist * minDist;
  let guard = 0;
  while (pts.length < count && guard < count * 90) {
    guard += 1;
    const x = rand();
    const y = rand();
    if (pts.every((pt) => {
      const dx = torus(pt.x - x);
      const dy = torus(pt.y - y);
      return dx * dx + dy * dy >= min2;
    })) {
      pts.push({ x, y });
    }
  }
  while (pts.length < count) {
    pts.push({ x: rand(), y: rand() });
  }
  return pts;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const STAR_TINTS = ["#9aa3c4", "#e4e7f5", "#d8d2c8"] as const;

export function paintStar(
  ctx: CanvasRenderingContext2D,
  star: Star,
  x: number,
  y: number,
  tints: readonly string[] = STAR_TINTS,
  dim = 1,
): void {
  const color = tints[star.tint > 0.84 ? 2 : star.tint > 0.4 ? 1 : 0] ?? tints[1] ?? "#e4e7f5";
  const a = star.a * dim;
  if (star.r > 1.15) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, star.r * 3.2);
    g.addColorStop(0, fade(color, a * 0.35));
    g.addColorStop(1, fade(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, star.r * 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = fade(color, a);
  ctx.beginPath();
  ctx.arc(x, y, star.r, 0, Math.PI * 2);
  ctx.fill();
}

function fade(hex: string, a: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function torus(d: number): number {
  const w = ((d % 1) + 1.5) % 1 - 0.5;
  return w;
}
