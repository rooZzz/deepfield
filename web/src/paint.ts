import { bucketOf, BUCKETS, type BucketId } from "./buckets.ts";
import { renderEmpty, renderFilters, renderProgress, renderStagedChip, renderStatus, renderVeil } from "./chrome.ts";
import { requireEl } from "./dom.ts";
import { ensureHighlighter } from "./highlight.ts";
import { renderInspector } from "./inspector.ts";
import { renderLegend } from "./legend.ts";
import { files } from "./model.ts";
import { renderPath } from "./path-rail.ts";
import { renderReel, renderReelMeta } from "./reel.ts";
import { inScope } from "./remarks.ts";
import { applyLayout, dragIns, dragRail } from "./resize.ts";
import { pathProgress } from "./review.ts";
import { scopeFiles, scopeHeadline, scopeKeyOf } from "./scope.ts";
import { app, graphView } from "./state.ts";
import { renderStaged } from "./staged.ts";

export type PaintFns = {
  goStep: (i: number) => void;
  setCursor: (id: string) => void;
  selectId: (id: string) => void;
  toggleBucket: (id: BucketId) => void;
  toggleReviewed: (id?: string) => void;
  pickFile: (id: string) => void;
  pickLine: (fileId: string, n: number, shift: boolean) => void;
  stage: () => void;
  clearPending: () => void;
  editRemark: (id: string) => void;
  deleteRemark: (id: string) => void;
  submitRemarks: () => void;
  moveCursor: (d: number) => void;
  mark: () => void;
  wholePath: () => void;
  scopeName: () => string;
  cursorStep: () => number | null;
};

export function paint(fns: PaintFns): void {
  ensureHighlighter(() => paint(fns));
  const graph = app.graph;
  renderEmpty(graph.nodes.length === 0 && !app.failed, "no change to review");
  const high = graph.risks.filter((hit) => hit.severity === "high").length;
  const repos = new Set(files(graph).map((file) => file.repo));
  renderStatus(app.failed ? "generate failed" : app.statusLine || `watching inbox · ${repos.size} services · ${high} high`, app.failed ? "fail" : app.statusLine ? "busy" : "ready");
  renderVeil(false, "");
  const counts = Object.fromEntries(BUCKETS.map((b) => [b.id, files(graph).filter((f) => bucketOf(f) === b.id).length])) as Record<BucketId, number>;
  renderFilters(app.hidden, counts, files(graph).filter((file) => app.hidden.includes(bucketOf(file))).length, fns.toggleBucket);
  const whole = pathProgress(graph, app.review.reviewed);
  renderProgress(whole.done, whole.total);
  renderStagedChip(app.remarks.length, () => {
    app.popover = true;
    paint(fns);
  });
  const pane = requireEl("#path-pane");
  const railY = Number(pane.querySelector(".rail-steps")?.scrollTop ?? 0);
  pane.replaceChildren(renderPath(graph, app.pathIndex, app.scope, fns.cursorStep(), app.review.reviewed, app.railOpen, fns.goStep, () => {
    app.railOpen = !app.railOpen;
    paint(fns);
  }, dragRail));
  const railList = pane.querySelector(".rail-steps");
  if (railList) {
    railList.scrollTop = railY;
  }
  pane.classList.toggle("closed", !app.railOpen);
  const rows = scopeFiles(graph, app.scope, app.hidden, app.pathIndex);
  renderInspector(requireEl("#inspector"), graph, app.focusId, app.scope, app.pathIndex, rows, app.cursorId, app.review.reviewed, app.insOpen, () => {
    app.insOpen = !app.insOpen;
    paint(fns);
  }, dragIns, fns.setCursor, fns.selectId);
  requireEl("#inspector").classList.toggle("closed", !app.insOpen);
  const meta = scopeHeadline(graph, app.scope, app.pathIndex);
  const cursor = rows.find((row) => row.file.id === app.cursorId) ?? rows[0];
  const idx = Math.max(0, rows.findIndex((row) => row.file.id === app.cursorId));
  renderReelMeta(requireEl("#reel-meta"), fns.scopeName(), app.scope.kind, meta.summary, whole.done, whole.total, cursor, idx, rows.length, Boolean(cursor && app.review.reviewed.includes(cursor.file.id)), () => fns.moveCursor(-1), () => fns.moveCursor(1), fns.mark, fns.wholePath, app.scope.kind !== "path");
  renderReel(requireEl("#reel-scroll"), rows, app.cursorId, app.review.reviewed, inScope(app.remarks, scopeKeyOf(app.scope)), app.pending, app.draft, fns.setCursor, fns.toggleReviewed, fns.pickFile, fns.pickLine, (value) => {
    app.draft = value;
  }, fns.stage, fns.clearPending, fns.editRemark, fns.deleteRemark);
  requireEl("#reel-scope").textContent = fns.scopeName();
  requireEl("#app").classList.toggle("reel-closed", !app.reelOpen);
  applyLayout();
  renderLegend(requireEl("#legend"), app.legend, () => {
    app.legend = false;
    paint(fns);
  });
  renderStaged(app.remarks, graph, app.popover, () => {
    app.popover = false;
    paint(fns);
  }, fns.submitRemarks, fns.editRemark, fns.deleteRemark);
  if (app.focusId) {
    graphView?.select(app.focusId);
  }
  graphView?.emphasize(app.scope);
  graphView?.hud();
}
