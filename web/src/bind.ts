import { requireEl } from "./dom.ts";
import { CAMERA } from "./graph-elements.ts";
import { applyDemoTitle, dismissIntro, shouldShowIntro } from "./intro.ts";
import { bindKeys } from "./keys.ts";
import { fileAtViewport, reelScrollIgnored } from "./reel-cursor.ts";
import { paint, type PaintFns } from "./paint.ts";
import { applyLayout, dragIns } from "./resize.ts";
import { insDefault } from "./pane.ts";
import { app, graphView } from "./state.ts";

export function bindUi(fns: PaintFns, approve: () => void): void {
  app.intro = shouldShowIntro();
  applyDemoTitle();
  app.insW = insDefault(window.innerWidth, app.railOpen ? app.railW : 34);
  requireEl("#legend-btn").addEventListener("click", () => {
    app.legend = !app.legend;
    paint(fns);
  });
  requireEl("#ins-fold").addEventListener("click", () => {
    app.insOpen = true;
    paint(fns);
  });
  requireEl("#ins-grip").addEventListener("pointerdown", (event) => dragIns(event));
  requireEl("#note-scope").addEventListener("click", () => {
    app.pending = { kind: "scope-compose" };
    app.draft = "";
    paint(fns);
  });
  requireEl("#approve").addEventListener("click", () => void approve());
  requireEl("#cam-in").addEventListener("click", () => graphView?.zoomBy(CAMERA.step));
  requireEl("#cam-out").addEventListener("click", () => graphView?.zoomBy(1 / CAMERA.step));
  requireEl("#cam-frame").addEventListener("click", () => {
    app.overview = false;
    graphView?.frame(false);
  });
  requireEl("#cam-follow").addEventListener("click", () => {
    app.followFiles = !app.followFiles;
    paint(fns);
    if (app.followFiles && app.cursorId) {
      fns.setCursor(app.cursorId, false);
    }
  });
  requireEl("#map-echoes").addEventListener("click", () => {
    app.showEchoes = !app.showEchoes;
    graphView?.replace(app.graph, app.hidden, false);
    paint(fns);
  });
  requireEl("#cam-fit").addEventListener("click", fns.wholePath);
  requireEl("#reel-scroll").addEventListener("scroll", () => {
    if (reelScrollIgnored()) {
      return;
    }
    const id = fileAtViewport(requireEl("#reel-scroll"));
    if (id && id !== app.cursorId) {
      fns.setCursor(id, false);
    }
  }, { passive: true });
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
    locked: () => app.intro,
    escape: () => {
      if (app.intro) {
        dismissIntro();
        app.intro = false;
      } else if (app.popover) {
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
  window.addEventListener("resize", () => applyLayout());
}
