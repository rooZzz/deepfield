import type { GraphDocument, GraphEdge } from "../../src/types.ts";
import { el } from "./dom.ts";
import { pathHits, targetHits } from "./inspect-hits.ts";
import { pathAt, byId, clusterOfFile, clusterRisk } from "./model.ts";
import { ruleChip, ruleHint, ruleTitle } from "./rules.ts";
import { pathCard, type Scope, type ScopeRow } from "./scope.ts";

export function renderInspector(
  pane: HTMLElement,
  graph: GraphDocument,
  focusId: string | null,
  scope: Scope,
  pathIndex: number,
  rows: ScopeRow[],
  cursorId: string | null,
  reviewed: string[],
  open: boolean,
  onToggle: () => void,
  onDrag: (e: PointerEvent) => void,
  onFile: (id: string) => void,
  onSelect: (id: string) => void,
): void {
  pane.replaceChildren();
  pane.classList.toggle("closed", !open);
  if (!open) {
    const fold = el("button", { type: "button", class: "side-fold" }, ["‹ Inspector"]);
    fold.addEventListener("click", onToggle);
    pane.append(fold);
    return;
  }
  const grip = el("div", { class: "resize ins", title: "Drag to resize" });
  grip.addEventListener("pointerdown", onDrag);
  const node = focusId ? byId(graph, focusId) : undefined;
  const edge = focusId ? graph.edges.find((item) => item.id === focusId) : undefined;
  const route = !edge && !node && scope.kind === "path";
  const kicker = route ? "review path" : edge ? `${edge.kind} edge` : node?.kind ?? "inspector";
  const title = route ? pathCard(graph, pathAt(graph, pathIndex)).name : titleOf(graph, focusId, edge);
  const collapse = el("button", { type: "button", title: "Collapse", style: "border:0;background:transparent;color:var(--color-neutral-700);font-family:var(--font-mono);" }, ["›"]);
  collapse.addEventListener("click", onToggle);
  const head = el("div", { class: "ins-head" });
  head.append(
    el("div", { style: "display:flex;align-items:baseline;justify-content:space-between;" }, [
      el("span", { class: "kicker mono" }, [kicker]),
      collapse,
    ]),
    el("div", { style: "font-family:var(--font-heading);font-weight:500;font-size:16px;margin-top:3px;" }, [title]),
  );
  const body = el("div", { class: "ins-body" });
  body.append(factsDl(route ? pathFacts(graph, pathIndex) : factsFor(graph, focusId, edge)));
  const hits = route ? pathHits(graph, pathIndex) : targetHits(graph, focusId, edge);
  body.append(hits.length ? hitsBlock(hits) : emptyBlock("no risks", "No named rule fired on this target."));
  body.append(scopeBlock(graph, scope, rows, cursorId, reviewed, onFile, onSelect, focusId));
  pane.append(grip, head, body);
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
    return "Select a cluster";
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

function pathFacts(graph: GraphDocument, pathIndex: number): Array<[string, string]> {
  const ids = pathAt(graph, pathIndex);
  const card = pathCard(graph, ids);
  const repos = [...new Set(ids.map((id) => {
    const node = byId(graph, id);
    return node && "repo" in node ? node.repo : "";
  }).filter(Boolean))];
  return [
    ["summary", card.summary],
    ["services", repos.join(" · ") || "—"],
    ["risk", card.chips.map((item) => item.chip).join(" ") || "none"],
  ];
}

function factsFor(graph: GraphDocument, id: string | null, edge: GraphEdge | undefined): Array<[string, string]> {
  if (edge) {
    const a = byId(graph, edge.fromId);
    const b = byId(graph, edge.toId);
    return [
      ["from", a && a.kind === "cluster" ? `${a.repo} · ${a.title}` : edge.fromId],
      ["to", b && b.kind === "cluster" ? `${b.repo} · ${b.title}` : edge.toId],
      ["kind", `${edge.kind}${edge.crossService ? " · crosses a service boundary" : " · within one service"}`],
    ];
  }
  const node = id ? byId(graph, id) : undefined;
  if (!node) {
    return [];
  }
  if (node.kind === "cluster") {
    return [
      ["service", node.repo],
      ["summary", node.summary],
      ["risk", clusterRisk(graph, node.id).map(ruleChip).join(" ") || "none"],
    ];
  }
  if (node.kind === "file") {
    const parent = clusterOfFile(graph, node.id);
    return [
      ["path", `${node.repo}/${node.path}`],
      ["class", node.class],
      ["change", node.change],
      ["cluster", parent?.title ?? "—"],
    ];
  }
  return [["repo", node.repo]];
}

function hitsBlock(hits: Array<{ rule: string; sev: string; color: string; path: string; excerpt: string }>): HTMLElement {
  const wrap = el("div", { style: "margin-bottom:var(--space-6);" }, [el("div", { class: "kicker", style: "margin-bottom:var(--space-3);" }, ["Risk hits"])]);
  for (const hit of hits) {
    const card = el("div", { class: "hit", style: `border-left-color:${hit.color};margin-bottom:8px;` });
    card.append(
      el("div", {}, [
        el("span", { class: "path-chip", title: ruleHint(hit.rule), style: `border-color:${hit.color};color:${hit.color}` }, [ruleChip(hit.rule)]),
        el("span", { class: "dim", style: "margin-left:8px;font-size:11px;" }, [ruleTitle(hit.rule)]),
        el("span", { class: "kicker", style: "margin-left:8px;" }, [hit.sev]),
      ]),
      el("div", { class: "mono dim", style: "margin-top:4px;font-size:10px;" }, [hit.path]),
    );
    if (hit.excerpt) {
      card.append(el("div", { class: "mono", style: "margin-top:5px;padding-left:7px;border-left:1px solid var(--color-neutral-800);font-size:10.5px;" }, [hit.excerpt]));
    }
    wrap.append(card);
  }
  return wrap;
}

function emptyBlock(kicker: string, text: string): HTMLElement {
  return el("div", { style: "margin-bottom:var(--space-6);" }, [
    el("div", { class: "kicker", style: "margin-bottom:var(--space-3);" }, [kicker]),
    el("p", { class: "dim", style: "margin:0;font-size:12px;" }, [text]),
  ]);
}

function factsDl(rows: Array<[string, string]>): HTMLElement {
  const dl = el("dl", { class: "facts" });
  for (const [k, v] of rows) {
    dl.append(el("dt", {}, [k]), el("dd", {}, [v]));
  }
  return dl;
}

function scopeBlock(
  graph: GraphDocument,
  scope: Scope,
  rows: ScopeRow[],
  cursorId: string | null,
  reviewed: string[],
  onFile: (id: string) => void,
  onSelect: (id: string) => void,
  focusId: string | null,
): HTMLElement {
  const wrap = el("div");
  wrap.append(el("div", { class: "kicker", style: "margin-bottom:var(--space-3);" }, [`In scope · ${scope.kind}`]));
  const node = focusId ? byId(graph, focusId) : undefined;
  if (node?.kind === "cluster") {
    const related = graph.edges.filter((edge) => edge.fromId === node.id || edge.toId === node.id);
    if (related.length) {
      const list = el("div", { style: "margin-bottom:var(--space-4);" }, [el("div", { class: "kicker", style: "margin-bottom:var(--space-2);" }, ["Edges from here"])]);
      for (const edge of related) {
        const other = byId(graph, edge.fromId === node.id ? edge.toId : edge.fromId);
        const btn = el("button", { type: "button", class: "scope-file", style: "padding:4px 6px;" }, [
          el("span", { class: "mono", style: "font-size:10.5px;" }, [other && "repo" in other ? `${other.repo} · ${titleNode(other)}` : edge.id]),
        ]);
        btn.addEventListener("click", () => onSelect(edge.id));
        list.append(btn);
      }
      wrap.append(list);
    }
  }
  const ids = [...new Set(rows.map((row) => row.cluster.id))];
  for (const cid of ids) {
    const group = rows.filter((row) => row.cluster.id === cid);
    const cluster = group[0]?.cluster;
    if (!cluster) {
      continue;
    }
    const box = el("div", { style: "border-left:2px solid var(--color-neutral-800);padding-left:var(--space-3);margin-bottom:10px;" });
    if (group[0].crossesInto) {
      box.append(el("div", { class: "cross-row", style: "margin-bottom:3px;" }, [el("span", { class: "diamond" }), el("span", {}, [cluster.repo])]));
    }
    const head = el("button", { type: "button", style: "border:0;background:transparent;padding:0 0 3px;display:flex;gap:8px;width:100%;text-align:left;" }, [
      el("span", {}, [cluster.title]),
    ]);
    head.addEventListener("click", () => onSelect(cluster.id));
    box.append(head);
    for (const row of group) {
      const cur = row.file.id === cursorId;
      const btn = el("button", { type: "button", class: "scope-file", style: `padding:4px 6px;background:${cur ? "#22243a" : "transparent"}` });
      btn.append(
        el("span", { class: "mono", style: `color:${row.file.change === "add" ? "var(--color-add)" : row.file.change === "delete" ? "var(--color-del)" : "#595d6c"}` }, [row.file.change === "add" ? "+" : row.file.change === "delete" ? "−" : "·"]),
        el("span", { class: "mono", style: `color:${cur ? "#d2cefd" : "#cfd3e5"};font-size:10.5px;` }, [row.file.path.split("/").slice(-2).join("/")]),
        el("span", { style: "color:#8fbf98;font-size:10px;" }, [reviewed.includes(row.file.id) ? "✓" : ""]),
      );
      btn.addEventListener("click", () => onFile(row.file.id));
      box.append(btn);
    }
    wrap.append(box);
  }
  if (!rows.length) {
    wrap.append(el("p", { class: "dim", style: "margin:0;" }, ["Nothing in this scope."]));
  }
  return wrap;
}
