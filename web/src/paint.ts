import { bucketOf, BUCKETS, type BucketId } from "./buckets.ts";
import { renderEmpty, renderFilters, renderFollow, renderProgress, renderStagedChip, renderStatus, renderVeil } from "./chrome.ts";
import { requireEl } from "./dom.ts";
import { ensureHighlighter } from "./highlight.ts";
import { focusHits } from "./inspect-hits.ts";
import { renderInspector } from "./inspector.ts";
import { renderLegend } from "./legend.ts";
import { files } from "./model.ts";
import { renderPath } from "./path-rail.ts";
import { paintCursorRows, revealFile, runWithoutReelSync } from "./reel-cursor.ts";
import { renderReel, renderReelMeta } from "./reel.ts";
import { inScope } from "./remarks.ts";
import { applyLayout, dragRail } from "./resize.ts";
import { pathProgress } from "./review.ts";
import { scopeFiles, scopeKeyOf } from "./scope.ts";
import { sessionLive } from "./session-api.ts";
import { app, graphView } from "./state.ts";
import { renderStaged } from "./staged.ts";

export type PaintFns = {
  goStep: (i: number) => void;
  setCursor: (id: string, reveal?: boolean) => void;
  selectId: (id: string) => void;
  toggleBucket: (id: BucketId) => void;
  toggleReviewed: (id?: string) => void;
  pickFile: (id: string) => void;
  pickLine: (fileId: string, n: number, shift: boolean) => void;
  stage: () => void;
  clearPending: () => void;
  editRemark: (id: string) => void;
  deleteRemark: (id: string) => void;
  requestChanges: () => void;
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
  const ready = sessionLive ? "watching inbox" : "demo";
  renderStatus(app.failed ? "generate failed" : app.statusLine || `${ready} · ${repos.size} services · ${high} high`, app.failed ? "fail" : app.statusLine ? "busy" : "ready");
  renderVeil(false, "");
  const counts = Object.fromEntries(BUCKETS.map((b) => [b.id, files(graph).filter((f) => bucketOf(f) === b.id).length])) as Record<BucketId, number>;
  renderFilters(app.hidden, counts, files(graph).filter((file) => app.hidden.includes(bucketOf(file))).length, fns.toggleBucket);
  const whole = pathProgress(graph, app.review.reviewed);
  renderProgress(whole.done, whole.total);
  renderFollow(app.followFiles);
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
  renderInspector(requireEl("#ins-brief"), graph, app.focusId, app.scope, app.pathIndex, app.insOpen, () => {
    app.insOpen = !app.insOpen;
    paint(fns);
  });
  requireEl("#inspector").classList.toggle("closed", !app.insOpen);
  const hits = focusHits(graph, app.focusId, app.pathIndex, app.scope.kind === "path");
  paintReelChrome(fns);
  const reel = requireEl("#reel-scroll");
  const reelY = reel.scrollTop;
  renderReel(reel, rows, hits, app.cursorId, app.review.reviewed, inScope(app.remarks, scopeKeyOf(app.scope)), app.pending, app.draft, fns.setCursor, fns.toggleReviewed, fns.pickFile, fns.pickLine, (value) => {
    app.draft = value;
  }, fns.stage, fns.clearPending, fns.editRemark, fns.deleteRemark);
  runWithoutReelSync(() => {
    if (app.revealCursor) {
      revealFile(reel, app.cursorId);
      app.revealCursor = false;
    } else {
      reel.scrollTop = reelY;
    }
  });
  applyLayout();
  renderLegend(requireEl("#legend"), app.legend, () => {
    app.legend = false;
    paint(fns);
  });
  renderStaged(app.remarks, graph, app.popover, () => {
    app.popover = false;
    paint(fns);
  }, fns.requestChanges, fns.editRemark, fns.deleteRemark);
  if (app.focusId) {
    graphView?.select(app.focusId);
  }
  graphView?.emphasize(app.scope);
  graphView?.hud();
}

export function paintCursor(fns: PaintFns, reveal: boolean): void {
  paintReelChrome(fns);
  const reel = requireEl("#reel-scroll");
  paintCursorRows(reel, app.cursorId);
  if (reveal) {
    revealFile(reel, app.cursorId);
  }
}

function paintReelChrome(fns: PaintFns): void {
  const rows = scopeFiles(app.graph, app.scope, app.hidden, app.pathIndex);
  const cursor = rows.find((row) => row.file.id === app.cursorId) ?? rows[0];
  const idx = Math.max(0, rows.findIndex((row) => row.file.id === app.cursorId));
  renderReelMeta(
    requireEl("#review-nav"),
    cursor,
    idx,
    rows.length,
    Boolean(cursor && app.review.reviewed.includes(cursor.file.id)),
    () => fns.moveCursor(-1),
    () => fns.moveCursor(1),
    fns.mark,
  );
}
