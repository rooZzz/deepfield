import type { Core, NodeSingular } from "cytoscape";
import { galaxyDisk, galaxyTints, seedOf } from "./galaxy.ts";
import { paintStar, type Star } from "./starfield.ts";

const cache = new Map<string, Star[]>();

export function paintGalaxies(cy: Core, litServices: Set<string>): void {
  const canvas = document.querySelector("#galaxies");
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("missing #galaxies canvas");
  }
  const host = canvas.parentElement;
  if (!host) {
    throw new Error("#galaxies has no parent");
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
    throw new Error("galaxy canvas 2d context missing");
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  cy.nodes('[kind = "service"]').forEach((node) => {
    disk(ctx, node, litServices.size === 0 || litServices.has(node.id()));
  });
}

function disk(ctx: CanvasRenderingContext2D, node: NodeSingular, lit: boolean): void {
  const bb = node.renderedBoundingBox({ includeLabels: false });
  const x = bb.x1 + bb.w / 2;
  const y = bb.y1 + bb.h / 2;
  const span = Math.max(bb.w, bb.h) * 0.5;
  const zoom = node.cy().zoom();
  const id = node.id();
  let stars = cache.get(id);
  if (!stars) {
    stars = galaxyDisk(seedOf(id));
    cache.set(id, stars);
  }
  const tints = galaxyTints(seedOf(id));
  const dim = lit ? 1 : 0.38;
  for (const star of stars) {
    paintStar(
      ctx,
      { ...star, r: star.r * zoom },
      x + star.x * span * 2,
      y + star.y * span * 2,
      tints,
      dim,
    );
  }
}
