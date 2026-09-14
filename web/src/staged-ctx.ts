import type { ClusterNode, FileNode, GraphDocument, GraphEdge } from "../../src/types.ts";
import { el } from "./dom.ts";
import { excerptRange, hunkRows } from "./hunk.ts";
import { hunkUnavailable, renderHunkBody } from "./hunk-view.ts";
import { byId, clusters, files } from "./model.ts";
import { HI, MED } from "./palette.ts";
import type { StagedRemark } from "./remarks.ts";
import { pathCard } from "./scope.ts";

const FILE_CAP = 24;
const EDGE_CAP = 12;
const LINE_PAD = 3;

export type StagedTarget =
  | { kind: "hunk"; file: FileNode; from: number; to: number }
  | { kind: "file"; file: FileNode }
  | { kind: "edge"; edge: GraphEdge }
  | { kind: "cluster"; cluster: ClusterNode }
  | { kind: "service"; repo: string }
  | { kind: "path"; ids: string[] }
  | { kind: "plain"; label: string };

export function stagedTarget(remark: StagedRemark, graph: GraphDocument): StagedTarget {
  if ((remark.kind === "line" || remark.kind === "lines") && remark.fileId && remark.from) {
    const file = fileOf(graph, remark.fileId);
    if (file) {
      return { kind: "hunk", file, from: remark.from, to: remark.to ?? remark.from };
    }
  }
  if (remark.kind === "file" && remark.fileId) {
    const file = fileOf(graph, remark.fileId);
    if (file) {
      return { kind: "file", file };
    }
  }
  const key = remark.scopeKey;
  if (key === "path") {
    const match = graph.paths.find((path) => pathCard(graph, path).name === remark.scopeLabel);
    return { kind: "path", ids: match ?? graph.paths[0] ?? [] };
  }
  if (key.startsWith("service:")) {
    return { kind: "service", repo: key.slice("service:".length) };
  }
  if (key.startsWith("cluster:")) {
    const node = byId(graph, key.slice("cluster:".length));
    if (node?.kind === "cluster") {
      return { kind: "cluster", cluster: node };
    }
  }
  if (key.startsWith("edge:")) {
    const edge = graph.edges.find((item) => item.id === key.slice("edge:".length));
    if (edge) {
      return { kind: "edge", edge };
    }
  }
  const fallback = remark.fileId ? fileOf(graph, remark.fileId) : undefined;
  return fallback ? { kind: "file", file: fallback } : { kind: "plain", label: remark.scopeLabel };
}

export function renderStagedCtx(remark: StagedRemark, graph: GraphDocument): HTMLElement {
  const box = el("div", { class: "staged-ctx" });
  const target = stagedTarget(remark, graph);
  if (target.kind === "hunk") {
    box.append(fileHead(target.file), hunkSlice(target.file, target.from, target.to, LINE_PAD, true));
  } else if (target.kind === "file") {
    box.append(fileHead(target.file), hunkSlice(target.file, 1, FILE_CAP, 0, false));
  } else if (target.kind === "edge") {
    box.append(edgeBlock(graph, target.edge));
  } else if (target.kind === "cluster") {
    box.append(clusterBlock(graph, target.cluster));
  } else if (target.kind === "service") {
    box.append(serviceBlock(graph, target.repo));
  } else if (target.kind === "path") {
    box.append(pathBlock(graph, target.ids));
  } else {
    box.append(el("div", { class: "ctx-head" }, [el("div", { class: "kicker" }, ["scope"]), el("div", {}, [target.label])]));
  }
  return box;
}

function fileOf(graph: GraphDocument, id: string): FileNode | undefined {
  const node = byId(graph, id);
  return node?.kind === "file" ? node : undefined;
}

function fileHead(file: FileNode): HTMLElement {
  return el("div", { class: "ctx-head" }, [
    el("div", { class: "kicker" }, ["file"]),
    el("div", { class: "mono" }, [`${file.repo}/${file.path}`]),
    el("div", { class: "mono dim" }, [`${file.change} · ${file.class}`]),
  ]);
}

function hunkSlice(file: FileNode, from: number, to: number, pad: number, mark: boolean): HTMLElement {
  const blocked = hunkUnavailable(file);
  if (blocked) {
    return blocked;
  }
  const total = hunkRows(file).length;
  const range = excerptRange(total, from, Math.min(to, total) || total, pad);
  return renderHunkBody(file, {
    start: range.start,
    end: range.end,
    interactive: false,
    picked: mark ? (n) => n >= from && n <= to : undefined,
    marked: mark ? (n) => n >= from && n <= to : undefined,
  });
}

function edgeBlock(graph: GraphDocument, edge: GraphEdge): HTMLElement {
  const wrap = el("div");
  wrap.append(el("div", { class: "ctx-head" }, [
    el("div", { class: "kicker" }, [`${edge.kind} edge`]),
    el("div", { class: "mono" }, [`${endLabel(graph, edge.fromId)} → ${endLabel(graph, edge.toId)}`]),
    el("div", { class: "mono dim" }, [edge.crossService ? "crosses a service boundary" : "within one service"]),
  ]));
  for (const id of [edge.fromId, edge.toId]) {
    const node = byId(graph, id);
    if (node?.kind === "file") {
      wrap.append(fileHead(node), hunkSlice(node, 1, EDGE_CAP, 0, false));
    } else if (node?.kind === "cluster") {
      wrap.append(clusterBlock(graph, node));
    }
  }
  return wrap;
}

function clusterBlock(graph: GraphDocument, cluster: ClusterNode): HTMLElement {
  const wrap = el("div");
  wrap.append(el("div", { class: "ctx-head" }, [
    el("div", { class: "kicker" }, ["cluster"]),
    el("div", {}, [cluster.title]),
    el("div", { class: "mono dim" }, [`${cluster.repo} · ${cluster.summary}`]),
  ]));
  wrap.append(fileList(files(graph).filter((file) => cluster.memberIds.includes(file.id)).map((file) => `${mark(file.change)} ${file.path}`)));
  return wrap;
}

function serviceBlock(graph: GraphDocument, repo: string): HTMLElement {
  const owned = files(graph).filter((file) => file.repo === repo);
  const titles = clusters(graph).filter((cluster) => cluster.repo === repo).map((cluster) => cluster.title);
  const wrap = el("div");
  wrap.append(el("div", { class: "ctx-head" }, [
    el("div", { class: "kicker" }, ["service"]),
    el("div", {}, [repo]),
    el("div", { class: "mono dim" }, [`${owned.length} files · ${titles.join(" · ") || "no clusters"}`]),
  ]));
  wrap.append(fileList(owned.map((file) => file.path)));
  return wrap;
}

function pathBlock(graph: GraphDocument, ids: string[]): HTMLElement {
  const card = pathCard(graph, ids);
  const wrap = el("div");
  wrap.append(el("div", { class: "ctx-head" }, [
    el("div", { class: "kicker" }, ["review path"]),
    el("div", {}, [card.name]),
    el("div", { class: "mono dim" }, [card.summary]),
  ]));
  if (card.chips.length) {
    const chips = el("div", { class: "ctx-chips" });
    for (const item of card.chips) {
      const ink = item.sev === "high" ? HI : MED;
      chips.append(el("span", { class: "path-chip", title: item.hint, style: `border-color:${ink};color:${ink}` }, [item.chip]));
    }
    wrap.append(chips);
  }
  wrap.append(fileList(ids.map((id) => {
    const node = byId(graph, id);
    return node?.kind === "cluster" ? `${node.repo} · ${node.title}` : "";
  }).filter(Boolean)));
  return wrap;
}

function fileList(rows: string[]): HTMLElement {
  const list = el("div", { class: "ctx-list" });
  for (const row of rows) {
    list.append(el("div", { class: "mono ctx-file" }, [row]));
  }
  return list;
}

function endLabel(graph: GraphDocument, id: string): string {
  const node = byId(graph, id);
  if (!node) {
    return id;
  }
  if (node.kind === "file") {
    return `${node.repo}/${node.path}`;
  }
  if (node.kind === "cluster") {
    return `${node.repo} · ${node.title}`;
  }
  return node.repo;
}

function mark(change: FileNode["change"]): string {
  if (change === "add") {
    return "+";
  }
  if (change === "delete") {
    return "−";
  }
  return "·";
}
