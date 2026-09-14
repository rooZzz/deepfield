import type { Core, NodeSingular } from "cytoscape";

const GAS = ["#8b7cf0", "#3d6a9a", "#a45a96", "#4a58b0", "#5a7ab8"] as const;

export function paintNebula(cy: Core, litServices: Set<string>): void {
  const canvas = document.querySelector("#nebula");
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("missing #nebula canvas");
  }
  const host = canvas.parentElement;
  if (!host) {
    throw new Error("#nebula has no parent");
  }
  const w = host.clientWidth;
  const h = host.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pw = Math.round(w * dpr);
  const ph = Math.round(h * dpr);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("nebula canvas 2d context missing");
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighter";
  cy.nodes('[kind = "service"]').forEach((node) => {
    cloud(ctx, node, litServices.size === 0 || litServices.has(node.id()));
  });
  ctx.globalCompositeOperation = "source-over";
}

function cloud(ctx: CanvasRenderingContext2D, node: NodeSingular, lit: boolean): void {
  const bb = node.renderedBoundingBox({ includeLabels: false });
  const x = bb.x1 + bb.w / 2;
  const y = bb.y1 + bb.h / 2;
  const r = Math.max(bb.w, bb.h) * 0.48;
  const id = node.id();
  for (let i = 0; i < 6; i++) {
    lobe(ctx, id, i, x, y, r, lit);
  }
  veil(ctx, x, y, r, lit);
  specks(ctx, id, x, y, r);
}

function lobe(
  ctx: CanvasRenderingContext2D,
  id: string,
  i: number,
  x: number,
  y: number,
  r: number,
  lit: boolean,
): void {
  const ox = (unit(`${id}:x:${i}`) - 0.5) * r * 0.45;
  const oy = (unit(`${id}:y:${i}`) - 0.5) * r * 0.45;
  const rr = r * (0.48 + unit(`${id}:s:${i}`) * 0.38);
  const a = (lit ? 0.34 : 0.08) * (0.6 + unit(`${id}:a:${i}`) * 0.45);
  const color = GAS[(Math.floor(unit(id) * GAS.length) + i) % GAS.length];
  ctx.save();
  ctx.translate(x + ox, y + oy);
  ctx.rotate(unit(`${id}:rot:${i}`) * Math.PI * 2);
  ctx.scale(1.35, 0.58);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
  g.addColorStop(0, fade(color, a));
  g.addColorStop(0.38, fade(color, a * 0.42));
  g.addColorStop(1, fade(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rr, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function veil(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, lit: boolean): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, fade("#4c5397", lit ? 0.16 : 0.04));
  g.addColorStop(0.55, fade("#353b80", lit ? 0.07 : 0.015));
  g.addColorStop(1, fade("#353b80", 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function specks(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, r: number): void {
  for (let i = 0; i < 14; i++) {
    const px = x + (unit(`${id}:sx:${i}`) - 0.5) * r * 1.7;
    const py = y + (unit(`${id}:sy:${i}`) - 0.5) * r * 1.7;
    const s = 0.6 + unit(`${id}:ss:${i}`) * 1.2;
    ctx.fillStyle = fade("#e4e7f5", 0.08 + unit(`${id}:so:${i}`) * 0.18);
    ctx.beginPath();
    ctx.arc(px, py, s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function fade(hex: string, a: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function unit(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}
