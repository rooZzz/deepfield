import type { FileNode } from "../../src/types.ts";
import type { AnchorDrift } from "../../src/types.ts";

export function hunkRows(file: FileNode | undefined): string[] {
  return file?.hunk ? file.hunk.split("\n") : [];
}

export function anchorTextOf(file: FileNode | undefined, from: number, to: number): string {
  const rows = hunkRows(file);
  if (!rows.length || !from) {
    return "";
  }
  return rows.slice(from - 1, to || from).join("\n");
}

export function relocate(
  file: FileNode | undefined,
  remark: { from?: number; to?: number; anchorText?: string },
): { from: number; to: number; drift: AnchorDrift } {
  const from = remark.from ?? 0;
  const to = remark.to ?? from;
  if (!from) {
    return { from, to, drift: "none" };
  }
  const rows = hunkRows(file);
  if (!rows.length) {
    return { from, to, drift: "stale" };
  }
  const want = remark.anchorText || "";
  const span = to - from + 1;
  const at = rows.slice(from - 1, from - 1 + span).join("\n");
  if (at === want) {
    return { from, to, drift: "none" };
  }
  for (let i = 0; i + span <= rows.length; i++) {
    if (rows.slice(i, i + span).join("\n") === want) {
      return { from: i + 1, to: i + span, drift: "moved" };
    }
  }
  return { from, to, drift: "stale" };
}

export function lineKind(line: string): "add" | "del" | "meta" | "ctx" {
  if (line.startsWith("@@") || isGitFileHeader(line)) {
    return "meta";
  }
  if (line.startsWith("+")) {
    return "add";
  }
  if (line.startsWith("-")) {
    return "del";
  }
  return "ctx";
}

export function sourceOfLine(line: string): string {
  if (lineKind(line) === "meta") {
    return line;
  }
  if (line.startsWith("+") || line.startsWith("-") || line.startsWith(" ")) {
    return line.slice(1);
  }
  return line;
}

export function lineSign(line: string): string {
  const kind = lineKind(line);
  if (kind === "add") {
    return "+";
  }
  if (kind === "del") {
    return "-";
  }
  if (kind === "meta") {
    return "";
  }
  return line.startsWith(" ") ? " " : "";
}

export function excerptRange(total: number, from: number, to: number, pad: number): { start: number; end: number } {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  return {
    start: Math.max(1, lo - pad),
    end: Math.min(total, hi + pad),
  };
}

export function isGitFileHeader(line: string): boolean {
  return (
    line.startsWith("diff ") ||
    line.startsWith("index ") ||
    line.startsWith("new file mode") ||
    line.startsWith("deleted file mode") ||
    line.startsWith("old mode") ||
    line.startsWith("new mode") ||
    line.startsWith("similarity index") ||
    line.startsWith("rename from") ||
    line.startsWith("rename to") ||
    line.startsWith("copy from") ||
    line.startsWith("copy to") ||
    line.startsWith("--- ") ||
    line.startsWith("+++ ")
  );
}

export function gitHeaderEnd(rows: string[]): number {
  let end = 0;
  for (const line of rows) {
    if (!isGitFileHeader(line)) {
      break;
    }
    end += 1;
  }
  return end;
}
