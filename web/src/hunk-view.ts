import type { FileNode } from "../../src/types.ts";
import { el } from "./dom.ts";
import { tokensForHunk, type TokenSpan } from "./highlight.ts";
import { hunkRows, lineKind, lineSign, sourceOfLine } from "./hunk.ts";

export type HunkPaint = {
  start: number;
  end: number;
  interactive: boolean;
  picked?: (n: number) => boolean;
  marked?: (n: number) => boolean;
  onLine?: (n: number, shift: boolean) => void;
  afterLine?: (n: number, wrap: HTMLElement) => void;
};

export function hunkUnavailable(file: FileNode): HTMLElement | null {
  if (file.noDiff === "binary") {
    return el("div", { class: "collapsed" }, [`binary file — no text diff${file.bytes ? ` · ${file.bytes}` : ""}`]);
  }
  if (file.noDiff === "large") {
    return el("div", { class: "collapsed" }, [`diff too large to display${file.bytes ? ` · ${file.bytes}` : ""}`]);
  }
  if (!hunkRows(file).length) {
    return el("div", { class: "collapsed" }, ["diff not captured by the run"]);
  }
  return null;
}

export function renderHunkBody(file: FileNode, paint: HunkPaint): HTMLElement {
  const wrap = el("div", { class: "hunk-body" });
  const rows = hunkRows(file);
  const tokens = file.hunk ? tokensForHunk(file.hunk, file.path) : null;
  for (let n = paint.start; n <= paint.end; n++) {
    const line = rows[n - 1] ?? "";
    wrap.append(hunkLineEl(line, n, tokens?.[n - 1], {
      interactive: paint.interactive,
      picked: Boolean(paint.picked?.(n)),
      marked: Boolean(paint.marked?.(n)),
      onLine: paint.onLine,
    }));
    paint.afterLine?.(n, wrap);
  }
  return wrap;
}

function hunkLineEl(
  line: string,
  n: number,
  tokens: TokenSpan[] | undefined,
  opts: { interactive: boolean; picked: boolean; marked: boolean; onLine?: (n: number, shift: boolean) => void },
): HTMLElement {
  const kind = lineKind(line);
  const cls = `hunk-line ${kind}${opts.picked ? " pick" : ""}`;
  const node = opts.interactive
    ? el("button", {
      type: "button",
      class: cls,
      title: "Click to remark on this line · shift-click to extend",
    })
    : el("div", { class: cls });
  node.append(
    el("span", { class: "hunk-gutter" }, [
      el("span", { class: "accent" }, [opts.marked ? "◆" : ""]),
      el("span", { class: "dim hunk-n" }, [kind === "meta" ? "" : String(n)]),
      el("span", { class: "hunk-sign" }, [kind === "meta" ? "" : lineSign(line)]),
    ]),
    hunkCode(line, kind, tokens),
  );
  if (opts.interactive && opts.onLine && node instanceof HTMLButtonElement) {
    const onLine = opts.onLine;
    node.addEventListener("click", (event) => onLine(n, event.shiftKey));
  }
  return node;
}

function hunkCode(line: string, kind: ReturnType<typeof lineKind>, tokens: TokenSpan[] | undefined): HTMLElement {
  const source = kind === "meta" ? line : sourceOfLine(line);
  if (kind === "meta" || !tokens?.length) {
    return el("span", { class: "hunk-code" }, [source || " "]);
  }
  const body = el("span", { class: "hunk-code hunk-tokens" });
  for (const tok of tokens) {
    body.append(el("span", { style: tok.color ? `color:${tok.color}` : undefined }, [tok.text]));
  }
  return body;
}
