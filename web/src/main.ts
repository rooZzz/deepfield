import type { BucketId } from "./buckets.ts";
import { bindUi } from "./bind.ts";
import { renderEmpty, renderLod, renderStatus } from "./chrome.ts";
import { requireEl } from "./dom.ts";
import { mountGraph } from "./graph.ts";
import { paintStars } from "./stars.ts";
import { byId, clusterOfFile, files, pathIndexOf } from "./model.ts";
import { paint, paintCursor, type PaintFns } from "./paint.ts";
import { makeRemark, pendingLabel, saveStaged, toInboxItem } from "./remarks.ts";
import { bindReview, persistReview, toggleId } from "./review.ts";
import { scopeFiles, scopeHeadline, scopeKeyOf } from "./scope.ts";
import { loadGraph, loadInbox, loadReview, saveInbox } from "./session-api.ts";
import { app, graphView, setGraphView } from "./state.ts";

const fns: PaintFns = {
  goStep, setCursor, selectId, toggleBucket, toggleReviewed, pickFile, pickLine,
  stage, clearPending, editRemark, deleteRemark, requestChanges, moveCursor, mark, wholePath, scopeName, cursorStep,
};

async function boot(): Promise<void> {
  paintStars(requireEl("#stars"));
  const graph = await loadGraph();
  app.inbox = await loadInbox();
  if (!graph) {
    app.failed = true;
    renderStatus("generate failed", "fail");
    renderEmpty(true, "generate failed");
    return;
  }
  app.graph = graph;
  app.review = bindReview(await loadReview(), graph);
  await persistReview(app.review);
  app.focusId = null;
  app.cursorId = scopeFiles(graph, app.scope, app.hidden, app.pathIndex)[0]?.file.id ?? null;
  setGraphView(mountGraph(requireEl("#cy"), graph, app.hidden, {
    onSelect: selectId,
    onBackground: wholePath,
    onZoom: (z, vis) => renderLod(z, vis),
    hud: () => ({ graph: app.graph, focusId: app.focusId, pathIndex: app.pathIndex, remarks: app.remarks, scope: app.scope, overview: app.overview }),
  }));
  if (app.focusId) {
    graphView?.select(app.focusId);
  }
  bindUi(fns, () => void approve());
  paint(fns);
}

function selectId(id: string): void {
  const node = byId(app.graph, id);
  const edge = app.graph.edges.find((item) => item.id === id);
  app.overview = false;
  if (edge) {
    app.focusId = id;
    app.scope = { kind: "edge", id };
  } else if (node?.kind === "cluster") {
    app.focusId = id;
    app.scope = { kind: "cluster", id };
    const idx = pathIndexOf(app.graph, id);
    if (idx >= 0) {
      app.pathIndex = idx;
    }
  } else if (node?.kind === "service") {
    app.focusId = id;
    app.scope = { kind: "service", repo: node.repo };
  } else if (node?.kind === "file") {
    const parent = clusterOfFile(app.graph, id);
    if (parent) {
      app.scope = { kind: "cluster", id: parent.id };
      const idx = pathIndexOf(app.graph, parent.id);
      if (idx >= 0) {
        app.pathIndex = idx;
      }
    }
    app.focusId = id;
    setCursor(id);
    return;
  }
  syncCursor();
  app.revealCursor = true;
  paint(fns);
  graphView?.frame(false);
}

function goStep(i: number): void {
  const idx = Math.max(0, Math.min(app.graph.paths.length - 1, i));
  app.overview = false;
  app.pathIndex = idx;
  app.scope = { kind: "path" };
  app.focusId = null;
  const first = scopeFiles(app.graph, app.scope, app.hidden, idx)[0];
  if (first) {
    app.cursorId = first.file.id;
  }
  app.revealCursor = true;
  paint(fns);
  graphView?.frame(false);
}

function wholePath(): void {
  app.overview = true;
  app.scope = { kind: "path" };
  app.focusId = null;
  syncCursor();
  app.revealCursor = true;
  paint(fns);
  graphView?.frame(true);
}

function setCursor(id: string, reveal = true): void {
  app.cursorId = id;
  if (app.followFiles && scopeFiles(app.graph, app.scope, app.hidden, app.pathIndex).some((row) => row.file.id === id)) {
    graphView?.focus(id);
  }
  paintCursor(fns, reveal);
}

function moveCursor(delta: number): void {
  const rows = scopeFiles(app.graph, app.scope, app.hidden, app.pathIndex);
  const i = Math.max(0, Math.min(rows.length - 1, rows.findIndex((row) => row.file.id === app.cursorId) + delta));
  if (rows[i]) {
    setCursor(rows[i].file.id);
  }
}

function syncCursor(): void {
  const rows = scopeFiles(app.graph, app.scope, app.hidden, app.pathIndex);
  if (!rows.some((row) => row.file.id === app.cursorId)) {
    app.cursorId = rows[0]?.file.id ?? null;
  }
}

function cursorStep(): number | null {
  if (app.scope.kind === "path") {
    return app.pathIndex;
  }
  const row = scopeFiles(app.graph, app.scope, app.hidden, app.pathIndex).find((item) => item.file.id === app.cursorId);
  return row ? pathIndexOf(app.graph, row.cluster.id) : null;
}

function toggleBucket(id: BucketId): void {
  app.hidden = app.hidden.includes(id) ? app.hidden.filter((item) => item !== id) : [...app.hidden, id];
  graphView?.replace(app.graph, app.hidden);
  syncCursor();
  app.revealCursor = true;
  paint(fns);
}

async function toggleReviewed(id?: string): Promise<void> {
  const target = id ?? app.cursorId;
  if (!target) {
    return;
  }
  app.review.reviewed = toggleId(app.review.reviewed, target);
  await persistReview(app.review);
  paint(fns);
}

function mark(): void {
  void toggleReviewed(app.cursorId ?? undefined);
}

function pickFile(id: string): void {
  app.pending = { kind: "file", fileId: id };
  app.draft = "";
  paint(fns);
}

function pickLine(fileId: string, n: number, shift: boolean): void {
  const pending = app.pending;
  if (shift && "fileId" in pending && pending.fileId === fileId && (pending.kind === "line" || pending.kind === "lines")) {
    app.pending = { kind: "lines", fileId, anchor: pending.anchor, from: Math.min(pending.anchor, n), to: Math.max(pending.anchor, n) };
  } else {
    app.pending = { kind: "line", fileId, anchor: n, from: n, to: n };
  }
  paint(fns);
}

function stage(): void {
  const body = app.draft.trim();
  if (!body) {
    return;
  }
  const file = "fileId" in app.pending ? files(app.graph).find((item) => item.id === app.pending.fileId) : undefined;
  if (app.editingId) {
    app.remarks = app.remarks.map((item) => (item.id === app.editingId ? { ...item, body } : item));
  } else {
    app.remarks = [...app.remarks, makeRemark(app.pending, body, scopeKeyOf(app.scope), scopeName(), pendingLabel(app.pending, scopeName(), file ? `${file.repo}/${file.path}` : undefined), file)];
  }
  saveStaged(app.remarks);
  app.draft = "";
  app.editingId = null;
  app.pending = { kind: "scope" };
  paint(fns);
}

function editRemark(id: string): void {
  const remark = app.remarks.find((item) => item.id === id);
  if (!remark) {
    return;
  }
  app.draft = remark.body;
  app.editingId = id;
  app.pending = remark.kind === "scope"
    ? { kind: "scope-compose" }
    : remark.kind === "file" && remark.fileId
      ? { kind: "file", fileId: remark.fileId }
      : { kind: "line", fileId: remark.fileId ?? "", anchor: remark.from ?? 1, from: remark.from ?? 1, to: remark.to ?? remark.from ?? 1 };
  app.popover = false;
  paint(fns);
}

function deleteRemark(id: string): void {
  app.remarks = app.remarks.filter((item) => item.id !== id);
  saveStaged(app.remarks);
  paint(fns);
}

function clearPending(): void {
  app.pending = { kind: "scope" };
  app.draft = "";
  app.editingId = null;
  paint(fns);
}

async function submitRemarks(): Promise<void> {
  if (!app.remarks.length) {
    return;
  }
  app.inbox.items.push(...app.remarks.map(toInboxItem));
  await saveInbox(app.inbox);
  app.remarks = [];
  saveStaged(app.remarks);
  app.popover = false;
  app.statusLine = "inbox sent";
  paint(fns);
}

async function requestChanges(): Promise<void> {
  if (!app.remarks.length) {
    app.statusLine = "stage a note first";
    paint(fns);
    return;
  }
  app.inbox.verdict = { kind: "request-changes", author: "you", at: new Date().toISOString() };
  await submitRemarks();
}

async function approve(): Promise<void> {
  if (app.remarks.length) {
    app.statusLine = "send or drop notes before approve";
    paint(fns);
    return;
  }
  app.inbox.verdict = { kind: "approve", author: "you", at: new Date().toISOString() };
  await saveInbox(app.inbox);
  app.statusLine = "approved";
  paint(fns);
}

function scopeName(): string {
  return scopeHeadline(app.graph, app.scope, app.pathIndex).headline;
}

boot().catch((error) => {
  renderStatus(error instanceof Error ? error.message : "boot failed", "fail");
});
