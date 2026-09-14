import type { GraphDocument, GraphEdge } from "../../src/types.ts";
import { el } from "./dom.ts";
import { pathAt, byId, clusterOfFile } from "./model.ts";
import { pathCard, type Scope } from "./scope.ts";

export function renderInspector(
  pane: HTMLElement,
  graph: GraphDocument,
  focusId: string | null,
  scope: Scope,
  pathIndex: number,
  open: boolean,
  onToggle: () => void,
): void {
  pane.replaceChildren();
  if (!open) {
    return;
  }
  const node = focusId ? byId(graph, focusId) : undefined;
  const edge = focusId ? graph.edges.find((item) => item.id === focusId) : undefined;
  const route = !edge && !node && scope.kind === "path";
  const kicker = route ? "review path" : edge ? `${edge.kind} edge` : node?.kind ?? "review";
  const title = route ? pathCard(graph, pathAt(graph, pathIndex)).name : titleOf(graph, focusId, edge);
  const meta = route ? pathMeta(graph, pathIndex) : metaOf(graph, focusId, edge);
  const collapse = el("button", { type: "button", title: "collapse", class: "rail-fold" }, ["›"]);
  collapse.addEventListener("click", onToggle);
  const copy = el("div", { class: "ins-copy" }, [
    el("span", { class: "kicker mono" }, [kicker]),
    el("span", { class: "ins-title" }, [title]),
  ]);
  if (meta) {
    copy.append(el("span", { class: "ins-meta dim", title: meta }, [meta]));
  }
  pane.append(el("div", { class: "ins-head" }, [copy, collapse]));
}

function titleOf(graph: GraphDocument, id: string | null, edge: GraphEdge | undefined): string {
  if (edge) {
    const a = byId(graph, edge.fromId);
    const b = byId(graph, edge.toId);
    const ar = a && "repo" in a ? a.repo : "";
    const br = b && "repo" in b ? b.repo : "";
    return edge.crossService ? `${ar} → ${br}` : `${titleNode(a)} → ${titleNode(b)}`;
  }
  const node = id ? byId(graph, id) : undefined;
  if (!node) {
    return "select a cluster";
  }
  if (node.kind === "cluster") {
    return node.title;
  }
  if (node.kind === "file") {
    return node.path.split("/").pop() ?? node.path;
  }
  return node.repo;
}

function titleNode(node: ReturnType<typeof byId>): string {
  if (!node) {
    return "?";
  }
  if (node.kind === "cluster") {
    return node.title.split("/").pop() ?? node.title;
  }
  if (node.kind === "file") {
    return node.path;
  }
  return node.repo;
}

function pathMeta(graph: GraphDocument, pathIndex: number): string {
  const ids = pathAt(graph, pathIndex);
  const card = pathCard(graph, ids);
  const repos = [...new Set(ids.map((id) => {
    const node = byId(graph, id);
    return node && "repo" in node ? node.repo : "";
  }).filter(Boolean))];
  return [card.summary, repos.join(" · ")].filter(Boolean).join(" · ");
}

function metaOf(graph: GraphDocument, id: string | null, edge: GraphEdge | undefined): string {
  if (edge) {
    return `${edge.kind}${edge.token ? ` · ${edge.token}` : ""}${edge.crossService ? " · crosses a service" : " · one service"}`;
  }
  const node = id ? byId(graph, id) : undefined;
  if (!node) {
    return "";
  }
  if (node.kind === "cluster") {
    return [node.summary, node.repo].filter(Boolean).join(" · ");
  }
  if (node.kind === "file") {
    const parent = clusterOfFile(graph, node.id);
    return [node.class, parent?.title].filter(Boolean).join(" · ");
  }
  return "";
}
