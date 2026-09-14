import type { Core } from "cytoscape";
import { LOD } from "./graph-elements.ts";
import { paintOrbit, paintSun, sunLook, sunScreen } from "./sun.ts";

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
  const zoom = cy.zoom();
  const files = zoom >= LOD.files;
  cy.nodes('[kind = "cluster"]').forEach((node) => {
    const look = sunLook(String(node.data("label") ?? node.id()));
    const disc = sunScreen(node.renderedPosition(), Number(node.data("size")), zoom);
    const dim = node.hasClass("recede") ? 0.38 : 1;
    paintSun(ctx, disc.x, disc.y, disc.r, look, dim);
    if (files) {
      paintOrbit(ctx, disc.x, disc.y, disc.r, look, dim);
    }
  });
}
