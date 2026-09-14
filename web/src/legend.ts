import { el } from "./dom.ts";

export function renderLegend(pane: HTMLElement, open: boolean, onClose: () => void): void {
  pane.hidden = !open;
  if (!open) {
    return;
  }
  pane.replaceChildren();
  const close = el("button", { type: "button", style: "border:0;background:transparent;color:var(--color-neutral-600);font-family:var(--font-mono);font-size:11px;" }, ["esc"]);
  close.addEventListener("click", onClose);
  pane.append(
    el("div", { style: "display:flex;justify-content:space-between;margin-bottom:12px;" }, [
      el("span", { class: "kicker" }, ["Legend"]),
      close,
    ]),
  );
  const rows: Array<[string, string]> = [
    ["cluster", "size is behavioural weight"],
    ["hollow", "mechanical-only"],
    ["corona", "heat = in-scope risk"],
    ["dashed", "contract edge"],
    ["violet arc", "cross-service import"],
    ["route", "selected review path"],
  ];
  for (const [k, v] of rows) {
    pane.append(el("div", { style: "display:grid;grid-template-columns:72px 1fr;gap:8px;font-size:11.5px;color:var(--color-neutral-400);margin-bottom:8px;" }, [
      el("span", { class: "mono accent" }, [k]),
      el("span", {}, [v]),
    ]));
  }
  const keys = el("div", { class: "mono dim", style: "margin-top:12px;padding-top:12px;border-top:1px solid var(--color-neutral-900);display:grid;grid-template-columns:auto 1fr;gap:5px 12px;font-size:10px;" });
  const map: Array<[string, string]> = [
    ["J K", "review path next / prev"],
    ["↑ ↓", "file in path scope"],
    ["R", "done on this file"],
    ["Space", "done and next"],
    ["Enter", "expand cluster"],
    ["Esc", "collapse"],
    ["F", "behavioural only / all"],
    ["P", "whole scene"],
    ["follow", "camera tracks the file cursor"],
    ["+ −", "zoom in / out"],
    ["⌘↵", "stage note"],
  ];
  for (const [k, v] of map) {
    keys.append(el("span", { style: "color:var(--color-neutral-400)" }, [k]), el("span", {}, [v]));
  }
  pane.append(keys);
}
