import type { Core } from "cytoscape";
import type { GraphDocument } from "../../src/types.ts";
import { el } from "./dom.ts";
import { ACC, ACC3 } from "./palette.ts";
import { byId, files, pathAt, pathClusters } from "./model.ts";
import { LOD } from "./graph-elements.ts";
import { sunScreen } from "./sun.ts";
import type { StagedRemark } from "./remarks.ts";
import type { Scope } from "./scope.ts";

export type HudModel = {
  graph: GraphDocument;
  focusId: string | null;
  hoverId?: string | null;
  pathIndex: number;
  remarks: StagedRemark[];
  scope: Scope;
  overview: boolean;
};

type Box = { x1: number; y1: number; x2: number; y2: number };

export function renderHud(pane: HTMLElement, cy: Core, model: HudModel, onSelect: (id: string) => void): void {
  pane.replaceChildren();
  const z = cy.zoom();
  const taken: Box[] = [];
  const w = pane.clientWidth;
  const h = pane.clientHeight;
  placeServices(pane, cy, model, taken, w, h, onSelect);
  placeClusters(pane, cy, model, taken, w, h, z);
  placeFiles(pane, cy, model, taken, w, h, z);
  placeCrossings(pane, cy, model, taken, w, h);
}

function placeServices(
  pane: HTMLElement,
  cy: Core,
  model: HudModel,
  taken: Box[],
  w: number,
  h: number,
  onSelect: (id: string) => void,
): void {
  cy.nodes('[kind = "service"]').forEach((node) => {
    const bb = node.renderedBoundingBox({ includeLabels: false });
    const label = String(node.data("label") ?? "");
    const wide = label.length * 8 + 14;
    const spot = place(bb.x1 + bb.w / 2, bb.y1 - 18, wide, 16, taken, w, h, false);
    if (!spot) {
      return;
    }
    const focus = model.focusId === node.id();
    const btn = el("button", { type: "button", class: "hud-svc" }, [label]);
    btn.style.left = `${spot.x}px`;
    btn.style.top = `${spot.y}px`;
    btn.style.color = focus ? ACC3 : "#9397ab";
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      onSelect(node.id());
    });
    pane.append(btn);
  });
}

function placeClusters(
  pane: HTMLElement,
  cy: Core,
  model: HudModel,
  taken: Box[],
  w: number,
  h: number,
  z: number,
): void {
  cy.nodes('[kind = "cluster"]').forEach((node) => {
    const id = node.id();
    const disc = sunScreen(node.renderedPosition(), Number(node.data("size")), z);
    const sel = model.focusId === id;
    const inPath = pathClusters(model.graph).includes(id);
    if (z < LOD.clusterLabel && !sel && !inPath) {
      return;
    }
    const cluster = byId(model.graph, id);
    if (!cluster || cluster.kind !== "cluster") {
      return;
    }
    const title = String(node.data("label") ?? "");
    const repo = cluster.repo;
    const members = files(model.graph).filter((file) => cluster.memberIds.includes(file.id));
    const sub = z < LOD.files && (z > 1.05 || sel) ? `${members.length} files · ${repo}` : "";
    const wide = Math.max(title.length * 6.4, sub.length * 5.8) + 6;
    const spot = place(disc.x, disc.y + disc.r + 4, wide, sub ? 27 : 15, taken, w, h, sel);
    if (spot) {
      const wrap = el("div", { class: "hud-label" });
      wrap.style.left = `${spot.x}px`;
      wrap.style.top = `${spot.y}px`;
      wrap.append(el("div", { style: `font-size:11px;line-height:1.25;color:${sel ? "#e9e9ed" : "#b2b6ca"}` }, [title]));
      if (sub) {
        wrap.append(el("div", { class: "mono dim", style: "font-size:9px;line-height:1.4;" }, [sub]));
      }
      pane.append(wrap);
    }
    const mine = model.remarks.filter((item) => item.fileId && members.some((file) => file.id === item.fileId));
    if (mine.length) {
      const pinAt = place(disc.x - disc.r - 8, disc.y - disc.r - 8, 17, 17, taken, w, h, true);
      const pin = el("div", { class: "hud-pin" }, [String(mine.length)]);
      pin.style.left = `${pinAt.x - 8.5}px`;
      pin.style.top = `${pinAt.y}px`;
      pin.style.border = `1px dashed ${ACC}`;
      pin.style.color = ACC3;
      pane.append(pin);
    }
  });
}

export function fileLabelAnchor(
  sun: { x: number; y: number },
  planet: { x: number; y: number },
  radius: number,
): { x: number; y: number } {
  const dx = planet.x - sun.x;
  const dy = planet.y - sun.y;
  const len = Math.hypot(dx, dy) || 1;
  const reach = radius + 10;
  return {
    x: planet.x + (dx / len) * reach,
    y: planet.y + (dy / len) * reach,
  };
}

function placeFiles(
  pane: HTMLElement,
  cy: Core,
  model: HudModel,
  taken: Box[],
  w: number,
  h: number,
  z: number,
): void {
  if (z < LOD.fileLabel) {
    return;
  }
  const nodes = cy.nodes('[kind = "file"]').toArray().sort((a, b) => {
    const rank = (id: string) => Number(id === model.focusId || id === model.hoverId);
    return rank(b.id()) - rank(a.id());
  });
  for (const node of nodes) {
    if (node.style("display") === "none") {
      continue;
    }
    const id = node.id();
    const name = String(node.data("label") ?? "");
    const sun = cy.getElementById(String(node.data("clusterId") ?? ""));
    const planet = node.renderedPosition();
    const origin = sun.empty() ? planet : sun.renderedPosition();
    const at = fileLabelAnchor(origin, planet, Number(node.data("size")) * z * 0.5);
    const hold = id === model.focusId || id === model.hoverId;
    const spot = place(at.x, at.y - 6, name.length * 5.6 + 4, 12, taken, w, h, hold);
    if (!spot) {
      continue;
    }
    const tag = el("div", { class: hold ? "hud-file cur" : "hud-file" }, [name]);
    tag.style.left = `${spot.x}px`;
    tag.style.top = `${spot.y}px`;
    pane.append(tag);
  }
}

function placeCrossings(pane: HTMLElement, cy: Core, model: HudModel, taken: Box[], w: number, h: number): void {
  const path = model.overview ? [] : pathAt(model.graph, model.pathIndex);
  for (let i = 1; i < path.length; i++) {
    const from = cy.getElementById(path[i - 1] ?? "");
    const to = cy.getElementById(path[i] ?? "");
    if (from.empty() || to.empty()) {
      continue;
    }
    const a = from.renderedPosition();
    const b = to.renderedPosition();
    const ar = String(from.data("repo") ?? "");
    const br = String(to.data("repo") ?? "");
    if (!ar || ar === br) {
      continue;
    }
    const label = `${ar} → ${br}`;
    const wide = label.length * 6.1 + 34;
    const spot = place((a.x + b.x) / 2, (a.y + b.y) / 2 - 24, wide, 19, taken, w, h, true);
    if (!spot) {
      continue;
    }
    const pill = el("div", { class: "hud-cross" }, [
      el("span", { class: "diamond" }),
      el("span", {}, [label]),
    ]);
    pill.style.left = `${spot.x}px`;
    pill.style.top = `${spot.y}px`;
    pill.style.color = ACC3;
    pane.append(pill);
  }
}

function place(cx: number, top: number, width: number, height: number, taken: Box[], paneW: number, paneH: number, forced: boolean): { x: number; y: number } | null {
  const pad = 5;
  const half = width / 2;
  const x = width + pad * 2 >= paneW ? paneW / 2 : Math.max(half + pad, Math.min(paneW - half - pad, cx));
  const y = Math.max(pad, Math.min(Math.max(pad, paneH - height - pad), top));
  const box = { x1: x - half, y1: y, x2: x + half, y2: y + height };
  if (!forced && taken.some((item) => box.x1 < item.x2 && box.x2 > item.x1 && box.y1 < item.y2 && box.y2 > item.y1)) {
    return null;
  }
  taken.push(box);
  return { x, y };
}
