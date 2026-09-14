import { requireEl } from "./dom.ts";
import { sessionLive } from "./session-api.ts";

const KEY = "deepfield:demo-intro";

export function shouldShowIntro(): boolean {
  if (sessionLive) {
    return false;
  }
  try {
    return localStorage.getItem(KEY) !== "1";
  } catch (error) {
    throw new Error("Failed to read demo intro", { cause: error });
  }
}

export function dismissIntro(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch (error) {
    throw new Error("Failed to write demo intro", { cause: error });
  }
}

export function applyDemoTitle(): void {
  if (!sessionLive) {
    document.title = "Deepfield | Demo";
  }
}

export function renderIntro(open: boolean, onClose: () => void): void {
  const pane = requireEl("#intro");
  const wasHidden = pane.hidden;
  pane.hidden = !open;
  if (pane.hidden) {
    return;
  }
  requireEl("#intro-ok").onclick = onClose;
  pane.onclick = (event) => {
    if (event.target === pane) {
      onClose();
    }
  };
  if (wasHidden) {
    requireEl("#intro-ok").focus();
  }
}
