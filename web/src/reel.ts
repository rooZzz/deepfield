import type { FileNode } from "../../src/types.ts";
import { composer, remarkCard } from "./composer.ts";
import { el } from "./dom.ts";
import { hunkRows } from "./hunk.ts";
import { hunkUnavailable, renderHunkBody } from "./hunk-view.ts";
import { ADD } from "./palette.ts";
import type { Pending, StagedRemark } from "./remarks.ts";
import type { ScopeRow } from "./scope.ts";

export function renderReelMeta(
  pane: HTMLElement,
  scopeName: string,
  kicker: string,
  meta: string,
  done: number,
  total: number,
  cursor: ScopeRow | undefined,
  index: number,
  count: number,
  reviewed: boolean,
  onPrev: () => void,
  onNext: () => void,
  onMark: () => void,
  onWholePath: () => void,
  notPath: boolean,
): void {
  pane.replaceChildren();
  pane.append(
    el("div", { class: "mono accent", style: "font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;" }, [`scope · ${kicker}`]),
    el("div", { style: "margin-top:3px;font-size:12.5px;" }, [scopeName]),
    el("div", { class: "mono dim", style: "margin-top:2px;font-size:9.5px;" }, [meta]),
  );
  if (notPath) {
    const back = el("button", { type: "button", class: "pill", style: "margin-top:8px;width:100%;" }, ["Back to whole scene"]);
    back.addEventListener("click", onWholePath);
    pane.append(back);
  }
  const pct = total ? (done / total) * 100 : 0;
  pane.append(
    el("div", { style: "margin-top:12px;height:3px;border-radius:2px;background:var(--color-neutral-900);overflow:hidden;" }, [
      el("span", { style: `display:block;height:100%;width:${pct}%;background:${done === total && total ? ADD : "var(--color-accent)"}` }),
    ]),
    el("div", { class: "mono dim", style: "margin-top:8px;" }, ["reading"]),
    el("div", { class: "mono", style: "margin-top:4px;font-size:11.5px;" }, [cursor ? `${cursor.file.repo}/${cursor.file.path}` : "—"]),
    el("div", { class: "mono dim", style: "margin-top:4px;font-size:10px;" }, [cursor ? `${index + 1} / ${count} · ${cursor.file.class}` : ""]),
  );
  const nav = el("div", { style: "display:flex;gap:8px;margin-top:auto;padding-top:12px;" });
  const prev = el("button", { type: "button", class: "pill", title: "[ or ↑" }, ["↑"]);
  const next = el("button", { type: "button", class: "pill", title: "] or ↓" }, ["↓"]);
  const mark = el("button", { type: "button", class: "pill", style: `flex:1;color:${reviewed ? ADD : "var(--color-accent)"};border-color:currentColor;` }, [reviewed ? "Reviewed ✓" : "Mark reviewed"]);
  prev.addEventListener("click", onPrev);
  next.addEventListener("click", onNext);
  mark.addEventListener("click", onMark);
  nav.append(prev, next, mark);
  pane.append(nav);
}

export function renderReel(
  pane: HTMLElement,
  rows: ScopeRow[],
  cursorId: string | null,
  reviewed: string[],
  remarks: StagedRemark[],
  pending: Pending,
  draft: string,
  onCursor: (id: string) => void,
  onToggle: (id: string) => void,
  onRemarkFile: (id: string) => void,
  onLine: (fileId: string, n: number, shift: boolean) => void,
  onDraft: (value: string) => void,
  onSubmit: () => void,
  onCancel: () => void,
  onEdit: (id: string) => void,
  onDelete: (id: string) => void,
): void {
  pane.replaceChildren();
  for (const remark of remarks.filter((item) => item.kind === "scope")) {
    pane.append(remarkCard(remark, undefined, onEdit, onDelete));
  }
  if (pending.kind === "scope-compose") {
    pane.append(composer(draft, "this scope", "whole scope", onDraft, onSubmit, onCancel));
  }
  rows.forEach((row, i) => {
    const first = i === 0 || rows[i - 1].cluster.id !== row.cluster.id;
    if (first) {
      pane.append(stepHead(row, i === 0 ? undefined : rows[i - 1]));
    }
    const block = el("div", { class: "file-block" });
    block.append(fileBar(row, i, rows.length, row.file.id === cursorId, reviewed.includes(row.file.id), remarks, onCursor, onToggle, onRemarkFile));
    for (const remark of remarks.filter((item) => item.kind === "file" && item.fileId === row.file.id)) {
      block.append(remarkCard(remark, row.file, onEdit, onDelete));
    }
    if (pending.kind === "file" && pending.fileId === row.file.id) {
      block.append(composer(draft, pendingLabel(row.file.path), "whole file", onDraft, onSubmit, onCancel));
    }
    block.append(hunkBlock(row.file, remarks, pending, draft, onLine, onDraft, onSubmit, onCancel, onEdit, onDelete));
    pane.append(block);
  });
  if (!rows.length) {
    pane.append(el("p", { class: "dim", style: "padding:16px;" }, ["Nothing in this scope."]));
  }
}

function stepHead(row: ScopeRow, prev: ScopeRow | undefined): HTMLElement {
  const head = el("div", { style: "display:flex;align-items:center;gap:8px;padding:10px 16px 6px;" }, [
    el("span", { class: "mono accent", style: "font-size:10px;letter-spacing:0.08em;text-transform:uppercase;" }, [row.cluster.title]),
  ]);
  if (row.crossesInto && prev) {
    head.append(el("span", { class: "cross-row" }, [el("span", { class: "diamond" }), el("span", {}, [`${prev.file.repo} → ${row.file.repo}`])]));
  }
  return head;
}

function fileBar(
  row: ScopeRow,
  i: number,
  n: number,
  cur: boolean,
  done: boolean,
  remarks: StagedRemark[],
  onCursor: (id: string) => void,
  onToggle: (id: string) => void,
  onRemarkFile: (id: string) => void,
): HTMLElement {
  const count = remarks.filter((item) => item.fileId === row.file.id).length;
  const bar = el("div", { class: `file-row${cur ? " cur" : ""}`, style: `opacity:${done && !cur ? "0.6" : "1"}` });
  const tick = el("button", {
    type: "button",
    class: "file-tick",
    title: "R — mark reviewed",
    "aria-pressed": done ? "true" : "false",
    style: `border:1px solid ${done ? ADD : cur ? "var(--color-accent-600)" : "var(--color-neutral-800)"}`,
  });
  tick.addEventListener("click", (event) => {
    event.stopPropagation();
    onToggle(row.file.id);
  });
  const remark = el("button", { type: "button", class: "pill" }, ["remark", count ? ` ${count}` : ""]);
  remark.addEventListener("click", (event) => {
    event.stopPropagation();
    onRemarkFile(row.file.id);
  });
  bar.append(
    tick,
    el("span", { class: "mono", style: `color:${cur ? "#e9e9ed" : "#b2b6ca"}` }, [`${row.file.repo}/${row.file.path}`]),
    el("span", { class: "kicker" }, [row.file.class === "behavioural" ? "behavioural" : row.file.class]),
    remark,
    el("span", { class: "mono dim" }, [`${i + 1} / ${n}`]),
  );
  bar.addEventListener("click", () => onCursor(row.file.id));
  return bar;
}

function hunkBlock(
  file: FileNode,
  remarks: StagedRemark[],
  pending: Pending,
  draft: string,
  onLine: (fileId: string, n: number, shift: boolean) => void,
  onDraft: (value: string) => void,
  onSubmit: () => void,
  onCancel: () => void,
  onEdit: (id: string) => void,
  onDelete: (id: string) => void,
): HTMLElement {
  const wrap = el("div", { style: "padding:8px 0 14px;" });
  const blocked = hunkUnavailable(file);
  if (blocked) {
    wrap.append(blocked);
    return wrap;
  }
  wrap.append(renderHunkBody(file, {
    start: 1,
    end: hunkRows(file).length,
    interactive: true,
    picked: (n) => (pending.kind === "line" || pending.kind === "lines") && pending.fileId === file.id && n >= pending.from && n <= pending.to,
    marked: (n) => remarks.some((item) => item.fileId === file.id && item.from && n >= item.from && n <= (item.to ?? item.from)),
    onLine: (n, shift) => onLine(file.id, n, shift),
    afterLine: (n, body) => {
      for (const remark of remarks.filter((item) => item.fileId === file.id && (item.to ?? item.from) === n)) {
        body.append(remarkCard(remark, file, onEdit, onDelete));
      }
      if ((pending.kind === "line" || pending.kind === "lines") && pending.fileId === file.id && pending.to === n) {
        body.append(composer(draft, pendingLabel(file.path, pending.from, pending.to), pending.kind === "lines" ? "line range" : "line", onDraft, onSubmit, onCancel));
      }
    },
  }));
  return wrap;
}

function pendingLabel(path: string, from?: number, to?: number): string {
  const name = path.split("/").pop() ?? path;
  if (from && to && from !== to) {
    return `${name}:${from}–${to}`;
  }
  if (from) {
    return `${name}:${from}`;
  }
  return path;
}

