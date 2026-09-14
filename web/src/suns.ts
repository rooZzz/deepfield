import type { Core } from "cytoscape";
import { LOD } from "./graph-elements.ts";
import { paintOrbit, paintSun, sunLook } from "./sun.ts";

export function paintSuns(cy: Core): void {
  const canvas = document.querySelector("#suns");
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("missing #suns canvas");
  }
  const host = canvas.parentElement;
  if (!host) {
    throw new Error("#suns has no parent");
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
    throw new Error("sun canvas 2d context missing");
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const files = cy.zoom() >= LOD.files;
  cy.nodes('[kind = "cluster"]').forEach((node) => {
    const look = sunLook(String(node.data("label") ?? node.id()));
    const bb = node.renderedBoundingBox({ includeLabels: false });
    const x = bb.x1 + bb.w / 2;
    const y = bb.y1 + bb.h / 2;
    const r = Math.max(bb.w, bb.h) * 0.5;
    const dim = node.hasClass("recede") ? 0.38 : 1;
    paintSun(ctx, x, y, r, look, dim);
    if (files) {
      paintOrbit(ctx, x, y, r, look, dim);
    }
  });
}
