import { requireEl } from "./dom.ts";
import { CAMERA } from "./graph-elements.ts";
import { bindKeys } from "./keys.ts";
import type { PaintFns } from "./paint.ts";
import { paint } from "./paint.ts";
import { dragReel } from "./resize.ts";
import { app, graphView } from "./state.ts";

export function bindUi(fns: PaintFns, requestChanges: () => void, approve: () => void): void {
  requireEl("#legend-btn").addEventListener("click", () => {
    app.legend = !app.legend;
    paint(fns);
  });
  requireEl("#reel-toggle").addEventListener("click", () => {
    app.reelOpen = !app.reelOpen;
    paint(fns);
  });
  requireEl("#remark-scope").addEventListener("click", () => {
    app.pending = { kind: "scope-compose" };
    app.draft = "";
    paint(fns);
  });
  requireEl("#request-changes").addEventListener("click", () => void requestChanges());
  requireEl("#approve").addEventListener("click", () => void approve());
  requireEl("#reel-grip").addEventListener("pointerdown", (event) => dragReel(event));
  requireEl("#cam-in").addEventListener("click", () => graphView?.zoomBy(CAMERA.step));
  requireEl("#cam-out").addEventListener("click", () => graphView?.zoomBy(1 / CAMERA.step));
  requireEl("#cam-frame").addEventListener("click", () => {
    app.overview = false;
    graphView?.frame(false);
  });
  requireEl("#cam-fit").addEventListener("click", fns.wholePath);
  bindKeys({
    path: (d) => fns.goStep(app.pathIndex + d),
    cursor: fns.moveCursor,
    mark: fns.mark,
    markNext: () => {
      fns.mark();
      fns.moveCursor(1);
    },
    expand: () => {
      app.overview = false;
      graphView?.frame(false);
    },
    zoom: (dir) => graphView?.zoomBy(dir > 0 ? CAMERA.step : 1 / CAMERA.step),
    escape: () => {
      if (app.popover) {
        app.popover = false;
      } else if (app.pending.kind !== "scope") {
        fns.clearPending();
        return;
      } else {
        app.legend = false;
      }
      paint(fns);
    },
    filter: (hidden) => {
      app.hidden = hidden;
      graphView?.replace(app.graph, hidden);
      paint(fns);
    },
    hidden: () => app.hidden,
    wholePath: fns.wholePath,
    legend: () => {
      app.legend = !app.legend;
      paint(fns);
    },
  });
  window.addEventListener("resize", () => graphView?.resize());
}
