import { mulberry32, type Star } from "./starfield.ts";

export function seedOf(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function galaxyDisk(seed: number): Star[] {
  const rand = mulberry32(seed);
  const pick = rand();
  if (pick < 0.64) {
    return spin(rand, 380, false);
  }
  if (pick < 0.84) {
    return spin(rand, 340, true);
  }
  return elliptical(rand, 260);
}

export function galaxyTints(seed: number): readonly string[] {
  const palettes = [
    ["#8b9ad4", "#d5dcf2", "#c8c0e4"],
    ["#6e8ab8", "#c9d6ea", "#b7c4d8"],
    ["#8a72b0", "#ddd2ee", "#c4b8d8"],
    ["#5f7aaa", "#c5d0e4", "#d2c8bc"],
  ] as const;
  return palettes[seed % palettes.length] ?? palettes[0];
}

function spin(rand: () => number, count: number, barred: boolean): Star[] {
  const arms = 2 + Math.floor(rand() * 3);
  const wind = 3.5 + rand() * 2.1;
  const noise = 0.022 + rand() * 0.024;
  const flat = 0.66 + rand() * 0.28;
  const stars: Star[] = [];
  while (stars.length < count) {
    const kind = rand();
    if (barred && kind < 0.1) {
      stars.push(dot((rand() - 0.5) * 0.6, (rand() - 0.5) * 0.048, rand));
    } else if (kind < 0.2) {
      stars.push(dot(gauss(rand) * 0.048, gauss(rand) * 0.036, rand));
    } else {
      const t = rand() ** 0.5;
      const arm = Math.floor(rand() * arms);
      const theta = t * wind + (arm * Math.PI * 2) / arms + gauss(rand) * noise;
      const rad = 0.05 + t * 0.46;
      const x = Math.cos(theta) * rad;
      const y = Math.sin(theta) * rad;
      const n = 2 + Math.floor(rand() * 4);
      const spread = 0.01 + rand() * 0.012;
      for (let k = 0; k < n && stars.length < count; k++) {
        stars.push(dot(x + gauss(rand) * spread, y + gauss(rand) * spread, rand));
      }
    }
  }
  for (const star of stars) {
    star.y *= flat;
  }
  return turn(stars, rand() * Math.PI * 2);
}

function elliptical(rand: () => number, count: number): Star[] {
  const flat = 0.38 + rand() * 0.24;
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const s = rand() < 0.42 ? 0.09 : 0.23;
    stars.push(dot(gauss(rand) * s, gauss(rand) * s * flat, rand));
  }
  return turn(stars, rand() * Math.PI * 2);
}

function dot(x: number, y: number, rand: () => number): Star {
  const dist = Math.hypot(x, y);
  const mag = rand() ** 2.35;
  const core = Math.max(0, 1 - dist * 2.2);
  return {
    x,
    y,
    r: 0.3 + mag * (0.68 + core * 0.9),
    a: 0.15 + mag * 0.38 + core * 0.18,
    tint: rand(),
  };
}

function turn(stars: Star[], rot: number): Star[] {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return stars.map((star) => ({
    ...star,
    x: star.x * c - star.y * s,
    y: star.x * s + star.y * c,
  }));
}

function gauss(rand: () => number): number {
  const u = Math.max(1e-6, rand());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * rand());
}
