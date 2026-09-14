import { seedOf } from "./galaxy.ts";
import { mulberry32 } from "./starfield.ts";

export type SunLook = {
  core: string;
  mid: string;
  rim: string;
  corona: string;
  scale: number;
  orbit: number;
  spots: Array<{ x: number; y: number; r: number; a: number }>;
  flares: Array<{ ang: number; len: number; wid: number }>;
};

export type PlanetLook = {
  fill: string;
  size: number;
  x: number;
  y: number;
};

const TYPES = [
  { core: "#f8fbff", mid: "#c5d4ee", rim: "#7a8bb0", corona: "#a7b8d8" },
  { core: "#fffdf6", mid: "#f2e3b4", rim: "#c9a45c", corona: "#e6d08a" },
  { core: "#fff7ea", mid: "#ffd4a4", rim: "#d49258", corona: "#f0c090" },
  { core: "#fffaf2", mid: "#e6d8c4", rim: "#a89878", corona: "#d2c6ae" },
  { core: "#eef3ff", mid: "#b0c6ea", rim: "#6580b0", corona: "#8ea6d0" },
  { core: "#fff8f2", mid: "#f0c8b0", rim: "#c4846c", corona: "#e0b098" },
] as const;

const PLANETS = ["#b8c4dc", "#9eb0c8", "#c8b8a0", "#8aa0c0", "#d0c4b0", "#7a9bb8", "#c4a888", "#9c8c78"];

export function sunLook(label: string): SunLook {
  const rand = mulberry32(seedOf(label));
  const type = TYPES[Math.floor(rand() * TYPES.length)] ?? TYPES[0];
  const spots: SunLook["spots"] = [];
  const n = 7 + Math.floor(rand() * 8);
  for (let i = 0; i < n; i++) {
    const ang = rand() * Math.PI * 2;
    const rad = rand() ** 0.65 * 0.72;
    spots.push({
      x: Math.cos(ang) * rad,
      y: Math.sin(ang) * rad,
      r: 0.04 + rand() * 0.09,
      a: 0.08 + rand() * 0.16,
    });
  }
  const flares: SunLook["flares"] = [];
  const fn = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < fn; i++) {
    flares.push({
      ang: rand() * Math.PI * 2,
      len: 0.18 + rand() * 0.28,
      wid: 0.05 + rand() * 0.08,
    });
  }
  return {
    core: type.core,
    mid: type.mid,
    rim: type.rim,
    corona: type.corona,
    scale: 0.9 + rand() * 0.28,
    orbit: 1.15 + rand() * 0.35,
    spots,
    flares,
  };
}

export function planetLook(
  path: string,
  index: number,
  count: number,
  sunR: number,
  orbit: number,
  added: boolean,
): PlanetLook {
  const rand = mulberry32(seedOf(path));
  const fill = PLANETS[Math.floor(rand() * PLANETS.length)] ?? PLANETS[0];
  const lane = 1.35 + rand() * 0.7;
  const base = (index / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2;
  const angle = base + (rand() - 0.5) * 0.55;
  const r = sunR * orbit * lane;
  return {
    fill: added ? lift(fill) : fill,
    size: 5 + rand() * 4,
    x: Math.cos(angle) * r,
    y: Math.sin(angle) * r,
  };
}

export function sunScreen(
  pos: { x: number; y: number },
  size: number,
  zoom: number,
): { x: number; y: number; r: number } {
  return { x: pos.x, y: pos.y, r: Math.max(0, size) * zoom * 0.5 };
}

export function paintSun(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  look: SunLook,
  dim: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  const corona = ctx.createRadialGradient(0, 0, r * 0.35, 0, 0, r * 2.5);
  corona.addColorStop(0, fade(look.corona, 0.4 * dim));
  corona.addColorStop(0.45, fade(look.corona, 0.12 * dim));
  corona.addColorStop(1, fade(look.corona, 0));
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.5, 0, Math.PI * 2);
  ctx.fill();
  for (const flare of look.flares) {
    ctx.save();
    ctx.rotate(flare.ang);
    ctx.fillStyle = fade(look.mid, 0.32 * dim);
    ctx.beginPath();
    ctx.ellipse(r * 0.92, 0, r * flare.len, r * flare.wid, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const core = shade(look.core, dim);
  const mid = shade(look.mid, dim);
  const rim = shade(look.rim, dim);
  ctx.globalAlpha = 1;
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  const body = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  body.addColorStop(0, core);
  body.addColorStop(0.42, mid);
  body.addColorStop(1, rim);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  for (const spot of look.spots) {
    ctx.fillStyle = fade(core, spot.a);
    ctx.beginPath();
    ctx.arc(spot.x * r, spot.y * r, spot.r * r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function paintOrbit(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  look: SunLook,
  dim: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = fade(look.corona, 0.28 * dim);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, r * look.orbit * 1.55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function fade(hex: string, a: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function shade(hex: string, dim: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const k = Math.max(0, Math.min(1, dim));
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function lift(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + 28);
  const g = Math.min(255, ((n >> 8) & 255) + 28);
  const b = Math.min(255, (n & 255) + 24);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
