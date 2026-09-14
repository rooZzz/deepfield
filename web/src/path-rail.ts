import type { GraphDocument } from "../../src/types.ts";
import { el } from "./dom.ts";
import { ACC3, HI, MED } from "./palette.ts";
import { pathCard, type Scope } from "./scope.ts";
import { clusterProgress } from "./review.ts";

export function renderPath(
  graph: GraphDocument,
  pathIndex: number,
  scope: Scope,
  cursorStep: number | null,
  reviewed: string[],
  open: boolean,
  onStep: (i: number) => void,
  onToggle: () => void,
  onDrag: (e: PointerEvent) => void,
): HTMLElement {
  if (!open) {
    const fold = el("button", { type: "button", class: "side-fold", title: "expand review path" }, ["review path ›"]);
    fold.addEventListener("click", onToggle);
    return fold;
  }
  const grip = el("div", { class: "resize rail", title: "drag to resize" });
  grip.addEventListener("pointerdown", onDrag);
  const fold = el("button", { type: "button", class: "rail-fold", title: "collapse" }, ["‹"]);
  fold.addEventListener("click", onToggle);
  const head = el("div", { class: "rail-head" }, [
    el("div", { class: "rail-kicker-row" }, [
      el("span", { class: "kicker" }, ["review path"]),
      fold,
    ]),
  ]);
  const steps = el("div", { class: "rail-steps" });
  graph.paths.forEach((ids, index) => {
    const card = pathCard(graph, ids);
    const prog = clusterProgress(graph, reviewed, ids);
    const cur = scope.kind === "path" && index === pathIndex;
    const btn = el("button", {
      type: "button",
      class: "path-step",
      ...(cur ? { "aria-current": "true" } : {}),
    });
    btn.append(
      pathBody(card, prog, cur),
    );
    if (cur) {
      btn.append(el("span", { class: "mark" }));
    } else if (scope.kind === "path" && cursorStep === index) {
      btn.append(el("span", { class: "path-cursor" }));
    }
    btn.addEventListener("click", () => onStep(index));
    steps.append(btn);
  });
  return el("div", { style: "display:contents" }, [
    grip,
    head,
    steps,
    el("div", { class: "rail-foot mono dim" }, ["J / K walk · P whole scene"]),
  ]);
}

export function revealCurrentPath(list: HTMLElement): void {
  const cur = list.querySelector(":scope > .path-step[aria-current='true']");
  if (!(cur instanceof HTMLElement)) {
    return;
  }
  const view = list.getBoundingClientRect();
  const row = cur.getBoundingClientRect();
  if (row.top < view.top) {
    list.scrollTop -= view.top - row.top;
  } else if (row.bottom > view.bottom) {
    list.scrollTop += row.bottom - view.bottom;
  }
}

function pathBody(
  card: ReturnType<typeof pathCard>,
  prog: { done: number; total: number },
  cur: boolean,
): HTMLElement {
  const wrap = el("span", { style: "min-width:0;display:block;" });
  wrap.append(el("span", { class: "path-step-title", style: cur ? `color:${ACC3}` : "" }, [card.name]));
  wrap.append(el("span", { class: "path-step-meta mono dim" }, [card.summary]));
  if (card.chips.length) {
    const chips = el("span", { class: "path-step-meta" });
    for (const item of card.chips) {
      const ink = item.sev === "high" ? HI : MED;
      chips.append(el("span", { title: item.hint, class: "path-chip", style: `border-color:${ink};color:${ink}` }, [item.chip]));
    }
    wrap.append(chips);
  }
  const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : 0;
  const bar = el("span", { class: "path-step-bar" });
  bar.append(
    el("span", { class: "path-step-track" }, [
      el("span", { style: `display:block;height:100%;width:${pct}%;background:${pct === 100 ? "var(--color-add)" : "var(--color-accent-600)"}` }),
    ]),
    el("span", { class: "mono dim", style: "font-size:9px;" }, [`${prog.done}/${prog.total}`]),
  );
  wrap.append(bar);
  return wrap;
}
