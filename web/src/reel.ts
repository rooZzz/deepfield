import type { FileNode } from "../../src/types.ts";
import { composer, remarkCard } from "./composer.ts";
import { el } from "./dom.ts";
import { hunkRows } from "./hunk.ts";
import { hunkUnavailable, renderHunkBody } from "./hunk-view.ts";
import { chipsForFile, type InspectHit } from "./inspect-hits.ts";
import { ADD } from "./palette.ts";
import type { Pending, StagedRemark } from "./remarks.ts";
import { ruleChip, ruleTitle } from "./rules.ts";
import type { ScopeRow } from "./scope.ts";

export function renderReelMeta(
  pane: HTMLElement,
  cursor: ScopeRow | undefined,
  index: number,
  count: number,
  reviewed: boolean,
  onPrev: () => void,
  onNext: () => void,
  onMark: () => void,
): void {
  pane.replaceChildren();
  const prev = el("button", { type: "button", class: "pill nav-step", title: "[ or ↑" }, ["↑"]);
  const next = el("button", { type: "button", class: "pill nav-step", title: "] or ↓" }, ["↓"]);
  const mark = el("button", {
    type: "button",
    class: "pill mark-btn",
    style: `color:${reviewed ? ADD : "var(--color-accent)"};border-color:currentColor;`,
    title: "R — done",
    "aria-pressed": reviewed ? "true" : "false",
  }, ["done"]);
  prev.addEventListener("click", onPrev);
  next.addEventListener("click", onNext);
  mark.addEventListener("click", onMark);
  pane.append(
    prev,
    next,
    el("span", { class: "mono dim nav-count" }, [cursor ? `${index + 1} / ${count}` : "0 / 0"]),
    mark,
  );
}

export function renderReel(
  pane: HTMLElement,
  rows: ScopeRow[],
  hits: InspectHit[],
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
    const block = el("div", { class: "file-block", "data-file-id": row.file.id });
    if (first) {
      block.append(stepHead(row, i === 0 ? undefined : rows[i - 1]));
    }
    block.append(fileBar(row, row.file.id === cursorId, reviewed.includes(row.file.id), remarks, chipsForFile(hits, row.file.id), onCursor, onToggle, onRemarkFile));
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
    pane.append(el("p", { class: "dim", style: "padding:16px;" }, ["nothing in this scope."]));
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
  cur: boolean,
  done: boolean,
  remarks: StagedRemark[],
  chips: InspectHit[],
  onCursor: (id: string) => void,
  onToggle: (id: string) => void,
  onRemarkFile: (id: string) => void,
): HTMLElement {
  const count = remarks.filter((item) => item.fileId === row.file.id).length;
  const path = `${row.file.repo}/${row.file.path}`;
  const bar = el("div", { class: `file-row${cur ? " cur" : ""}`, style: `opacity:${done && !cur ? "0.6" : "1"}` });
  const tick = el("button", {
    type: "button",
    class: "file-tick",
    title: "R — done",
    "aria-pressed": done ? "true" : "false",
    style: `border:1px solid ${done ? ADD : cur ? "var(--color-accent-600)" : "var(--color-neutral-800)"}`,
  });
  tick.addEventListener("click", (event) => {
    event.stopPropagation();
    onToggle(row.file.id);
  });
  const note = el("button", { type: "button", class: "pill" }, ["note", count ? ` ${count}` : ""]);
  note.addEventListener("click", (event) => {
    event.stopPropagation();
    onRemarkFile(row.file.id);
  });
  const end = el("span", { class: "file-end" }, [note]);
  bar.append(tick, el("span", { class: "mono file-path", title: path }, [path]), end);
  if (chips.length) {
    bar.append(chipRow(chips));
  }
  bar.addEventListener("click", () => onCursor(row.file.id));
  return bar;
}

function chipRow(chips: InspectHit[]): HTMLElement {
  const wrap = el("span", { class: "file-chips" });
  for (const hit of chips) {
    const hint = [ruleTitle(hit.rule), hit.excerpt].filter(Boolean).join(" — ");
    wrap.append(el("span", { class: "path-chip", title: hint, style: `border-color:${hit.color};color:${hit.color}` }, [ruleChip(hit.rule)]));
  }
  return wrap;
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
  const wrap = el("div", { class: "hunk-wrap" });
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
