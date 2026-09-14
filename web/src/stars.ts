import { paintStar, starLayers, type StarLayer } from "./starfield.ts";

type Field = {
  canvas: HTMLCanvasElement;
  layers: StarLayer[];
  pan: { x: number; y: number };
  zoom: number;
};

let field: Field | null = null;

export function paintStars(root: HTMLElement): void {
  if (field) {
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  root.replaceChildren(canvas);
  field = { canvas, layers: starLayers(), pan: { x: 0, y: 0 }, zoom: 1 };
  const ro = new ResizeObserver(() => draw());
  ro.observe(root);
  draw();
}

export function shiftStars(pan: { x: number; y: number }, zoom: number): void {
  if (!field) {
    return;
  }
  field.pan = pan;
  field.zoom = zoom;
  draw();
}

function draw(): void {
  if (!field) {
    return;
  }
  const canvas = field.canvas;
  const host = canvas.parentElement;
  if (!host) {
    return;
  }
  const w = host.clientWidth;
  const h = host.clientHeight;
  if (w < 2 || h < 2) {
    return;
  }
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
    throw new Error("starfield canvas 2d context missing");
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1;
  for (const layer of field.layers) {
    paintLayer(ctx, layer, field.pan, field.zoom, w, h, still);
  }
}

function paintLayer(
  ctx: CanvasRenderingContext2D,
  layer: StarLayer,
  pan: { x: number; y: number },
  zoom: number,
  w: number,
  h: number,
  still: number,
): void {
  const z = 1 + (zoom - 1) * layer.depth * 0.55 * still;
  const ox = pan.x * layer.depth * still;
  const oy = pan.y * layer.depth * still;
  for (const star of layer.stars) {
    const x = wrap((star.x - 0.5) * w * z - ox + w / 2, w);
    const y = wrap((star.y - 0.5) * h * z - oy + h / 2, h);
    paintStar(ctx, star, x, y);
  }
}

function wrap(v: number, span: number): number {
  return ((v % span) + span) % span;
}
