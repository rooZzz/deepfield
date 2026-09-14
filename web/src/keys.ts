import { allHidden, type BucketId } from "./buckets.ts";

export type KeyHandlers = {
  path: (delta: number) => void;
  cursor: (delta: number) => void;
  mark: () => void;
  markNext: () => void;
  expand: () => void;
  escape: () => void;
  filter: (hidden: BucketId[]) => void;
  hidden: () => BucketId[];
  wholePath: () => void;
  legend: () => void;
  zoom: (dir: number) => void;
  locked: () => boolean;
};

export function bindKeys(handlers: KeyHandlers): void {
  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) {
      return;
    }
    const key = event.key.toLowerCase();
    if (handlers.locked()) {
      if (key === "escape") {
        handlers.escape();
      }
      return;
    }
    if (key === "j" || key === "n") {
      handlers.path(1);
    } else if (key === "k") {
      handlers.path(-1);
    } else if (event.key === "ArrowDown" || key === "]") {
      event.preventDefault();
      handlers.cursor(1);
    } else if (event.key === "ArrowUp" || key === "[") {
      event.preventDefault();
      handlers.cursor(-1);
    } else if (key === "r") {
      handlers.mark();
    } else if (key === " ") {
      event.preventDefault();
      handlers.markNext();
    } else if (key === "f") {
      handlers.filter(handlers.hidden().length ? [] : allHidden());
    } else if (key === "p") {
      handlers.wholePath();
    } else if (key === "+" || key === "=") {
      event.preventDefault();
      handlers.zoom(1);
    } else if (key === "-" || key === "_") {
      event.preventDefault();
      handlers.zoom(-1);
    } else if (key === "?" || key === "/") {
      handlers.legend();
    } else if (key === "enter") {
      handlers.expand();
    } else if (key === "escape") {
      handlers.escape();
    }
  });
}
