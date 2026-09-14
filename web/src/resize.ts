import { app, graphView } from "./state.ts";
import { requireEl } from "./dom.ts";
import { clampIns, clampRail, insMax } from "./pane.ts";

const FOLD = 34;

function railPx(): number {
  return app.railOpen ? app.railW : FOLD;
}

function apply(): void {
  const root = requireEl("#app");
  root.style.setProperty("--rail-w", app.railOpen ? `${app.railW}px` : `${FOLD}px`);
  root.style.setProperty("--ins-w", app.insOpen ? `${app.insW}px` : `${FOLD}px`);
  graphView?.resize();
}

function drag(onMove: (event: PointerEvent) => void): void {
  const move = (event: PointerEvent) => onMove(event);
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    apply();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

export function dragRail(event: PointerEvent): void {
  event.preventDefault();
  const x0 = event.clientX;
  const w0 = app.railW;
  drag((ev) => {
    app.railW = clampRail(w0 + ev.clientX - x0);
    apply();
  });
}

export function dragIns(event: PointerEvent): void {
  event.preventDefault();
  const x0 = event.clientX;
  const w0 = app.insW;
  drag((ev) => {
    app.insW = clampIns(w0 + (x0 - ev.clientX), window.innerWidth, railPx());
    apply();
  });
}

export function applyLayout(): void {
  app.insW = clampIns(app.insW, window.innerWidth, railPx());
  apply();
}
