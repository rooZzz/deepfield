import { app, graphView } from "./state.ts";
import { requireEl } from "./dom.ts";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function apply(): void {
  const root = requireEl("#app");
  root.style.setProperty("--rail-w", app.railOpen ? `${app.railW}px` : "34px");
  root.style.setProperty("--ins-w", app.insOpen ? `${app.insW}px` : "34px");
  root.style.setProperty("--reel-h", app.reelOpen ? `${app.reelH}px` : "32px");
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
    app.railW = clamp(w0 + ev.clientX - x0, 186, 460);
    apply();
  });
}

export function dragIns(event: PointerEvent): void {
  event.preventDefault();
  const x0 = event.clientX;
  const w0 = app.insW;
  drag((ev) => {
    app.insW = clamp(w0 + (x0 - ev.clientX), 250, 560);
    apply();
  });
}

export function dragReel(event: PointerEvent): void {
  event.preventDefault();
  const y0 = event.clientY;
  const h0 = app.reelH;
  drag((ev) => {
    app.reelH = clamp(h0 + (y0 - ev.clientY), 140, window.innerHeight - 220);
    apply();
  });
}

export function applyLayout(): void {
  apply();
}
