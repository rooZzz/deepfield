import cytoscape from "cytoscape";
import type { Core, EdgeSingular, NodeSingular } from "cytoscape";
import type { GraphDocument } from "../../src/types.ts";
import type { BucketId } from "./buckets.ts";
import { requireEl } from "./dom.ts";
import { CAMERA, LOD, toElements } from "./graph-elements.ts";
import { tapEdgeId } from "./edge-select.ts";
import { renderHud, type HudModel } from "./graph-hud.ts";
import { frameScope, litClusterIds, recedeOutside } from "./graph-frame.ts";
import { graphStyle } from "./graph-style.ts";
import { byId, pathHopKeys } from "./model.ts";
import { paintGalaxies } from "./galaxies.ts";
import { paintSuns } from "./suns.ts";
import { shiftStars } from "./stars.ts";
import { edgeClusterIds, type Scope } from "./scope.ts";

export type GraphView = {
  select: (id: string) => void;
  focus: (id: string) => void;
  zoom: () => number;
  filesVisible: () => boolean;
  zoomBy: (factor: number) => void;
  resize: () => void;
  destroy: () => void;
  replace: (graph: GraphDocument, hidden: BucketId[]) => void;
  hud: () => void;
  emphasize: (scope: Scope) => void;
  frame: (overview: boolean) => void;
};

export type GraphHandlers = {
  onSelect: (id: string) => void;
  onBackground: () => void;
  onZoom: (zoom: number, files: boolean) => void;
  hud: () => HudModel;
};

export function mountGraph(
  container: HTMLElement,
  graph: GraphDocument,
  hidden: BucketId[],
  handlers: GraphHandlers,
): GraphView {
  const overlay = requireEl("#map-hud");
  container.style.background = "transparent";
  const cy = cytoscape({
    container,
    elements: toElements(graph, hidden),
    style: graphStyle,
    layout: { name: "preset", fit: false },
    minZoom: CAMERA.min,
    maxZoom: CAMERA.max,
    autoungrabify: true,
    boxSelectionEnabled: false,
  });
  let hudTick = 0;
  let hoverId: string | null = null;
  const paintHud = () => {
    const hud = handlers.hud();
    paintGalaxies(cy, litServices(hud));
    paintSuns(cy);
    shiftStars(cy.pan(), cy.zoom());
    renderHud(overlay, cy, { ...hud, hoverId }, handlers.onSelect);
  };
  const scheduleHud = () => {
    if (hudTick) {
      return;
    }
    hudTick = requestAnimationFrame(() => {
      hudTick = 0;
      applyLod(cy);
      handlers.onZoom(cy.zoom(), cy.zoom() >= LOD.files);
      paintHud();
    });
  };
  const onWheel = bindWheel(container, cy);
  cy.resize();
  applyLod(cy);
  fitScene(cy);
  cy.on("zoom pan", scheduleHud);
  cy.on("mouseover", 'node[kind = "file"]', (event) => {
    hoverId = (event.target as NodeSingular).id();
    scheduleHud();
  });
  cy.on("mouseout", 'node[kind = "file"]', () => {
    hoverId = null;
    scheduleHud();
  });
  cy.on("tap", "node", (event) => {
    event.stopPropagation();
    handlers.onSelect((event.target as NodeSingular).id());
  });
  cy.on("tap", "edge", (event) => {
    event.stopPropagation();
    const edge = event.target as EdgeSingular;
    const id = tapEdgeId(handlers.hud().graph, {
      id: edge.id(),
      kind: String(edge.data("kind") ?? ""),
      source: edge.source().id(),
      target: edge.target().id(),
    });
    if (id) {
      handlers.onSelect(id);
    }
  });
  cy.on("tap", (event) => {
    if (event.target === cy) {
      handlers.onBackground();
    }
  });
  expose(cy);
  handlers.onZoom(cy.zoom(), cy.zoom() >= LOD.files);
  paintHud();
  return {
    select(id: string) {
      cy.elements().unselect();
      const graph = handlers.hud().graph;
      const clusters = edgeClusterIds(graph, id);
      if (clusters.length) {
        for (const cid of clusters) {
          cy.getElementById(cid).select();
        }
        const kinds = new Set(graph.edges.filter((item) => item.id === id).map((item) => item.kind));
        const ends = new Set(clusters);
        cy.edges().forEach((edge) => {
          if (!ends.has(edge.source().id()) || !ends.has(edge.target().id())) {
            return;
          }
          if (edge.id() === id || kinds.has(String(edge.data("kind") ?? ""))) {
            edge.select();
          }
        });
        return;
      }
      const el = cy.getElementById(id);
      if (!el.empty()) {
        el.select();
      }
    },
    focus(id: string) {
      const el = cy.getElementById(id);
      if (el.empty()) {
        return;
      }
      cy.stop();
      cy.elements().unselect();
      el.select();
      if (el.data("kind") === "file") {
        el.style("display", "element");
        cy.animate({ zoom: Math.max(cy.zoom(), LOD.fileLabel), center: { eles: el }, duration: 200 });
        return;
      }
      cy.animate({ center: { eles: el }, duration: 180 });
    },
    zoom: () => cy.zoom(),
    filesVisible: () => cy.zoom() >= LOD.files,
    zoomBy(factor: number) {
      const next = Math.max(CAMERA.min, Math.min(CAMERA.max, cy.zoom() * factor));
      cy.stop();
      cy.animate({ zoom: next, duration: 180, easing: "ease-out" });
    },
    resize() {
      cy.resize();
      paintHud();
    },
    destroy() {
      if (hudTick) {
        cancelAnimationFrame(hudTick);
      }
      const host = container.parentElement ?? container;
      host.removeEventListener("wheel", onWheel, { capture: true });
      cy.destroy();
    },
    replace(next, nextHidden) {
      cy.elements().remove();
      cy.add(toElements(next, nextHidden));
      applyLod(cy);
      fitScene(cy);
      paintHud();
    },
    hud: paintHud,
    emphasize(scope: Scope) {
      const hud = handlers.hud();
      const ids = litClusterIds(hud.graph, scope, hud.pathIndex, hud.overview);
      recedeOutside(cy, ids, scope.kind === "edge" ? scope.id : null, pathHopKeys(hud.graph, hud.pathIndex, hud.overview));
    },
    frame(overview: boolean) {
      const hud = handlers.hud();
      frameScope(cy, hud.graph, hud.scope, hud.pathIndex, overview);
    },
  };
}

function bindWheel(container: HTMLElement, cy: Core): (event: WheelEvent) => void {
  const host = container.parentElement ?? container;
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const next = Math.max(CAMERA.min, Math.min(CAMERA.max, cy.zoom() * Math.pow(0.9987, event.deltaY * 1.6)));
    const box = host.getBoundingClientRect();
    cy.zoom({
      level: next,
      renderedPosition: { x: event.clientX - box.left, y: event.clientY - box.top },
    });
  };
  host.addEventListener("wheel", onWheel, { passive: false, capture: true });
  return onWheel;
}

function fitScene(cy: Core): void {
  cy.fit(cy.nodes('[kind = "service"], [kind = "cluster"]'), 36);
}

function applyLod(cy: Core): void {
  const z = cy.zoom();
  cy.batch(() => {
    cy.nodes('[kind = "file"]').forEach((node) => {
      node.style({
        display: z >= LOD.files ? "element" : "none",
      });
    });
    cy.edges().forEach((edge) => {
      const lod = edge.data("lod");
      if (lod === "detail") {
        edge.style("display", z >= LOD.files ? "element" : "none");
      } else {
        edge.style("display", z < LOD.files ? "element" : "none");
      }
    });
  });
}

function expose(cy: Core): void {
  (globalThis as { __deepfield?: { zoom: () => number; filesVisible: () => boolean; pan: () => { x: number; y: number } } }).__deepfield = {
    zoom: () => cy.zoom(),
    filesVisible: () => cy.zoom() >= LOD.files,
    pan: () => cy.pan(),
  };
}

function litServices(hud: HudModel): Set<string> {
  const ids = litClusterIds(hud.graph, hud.scope, hud.pathIndex, hud.overview);
  const lit = new Set<string>();
  for (const id of ids) {
    const node = byId(hud.graph, id);
    if (node && "repo" in node) {
      lit.add(`service:${node.repo}`);
    }
  }
  if (hud.scope.kind === "service") {
    lit.add(`service:${hud.scope.repo}`);
  }
  return lit;
}
