import type { AnchorDrift, FileNode, InboxItem, RemarkKind } from "../../src/types.ts";
import { anchorTextOf, relocate } from "./hunk.ts";

export type StagedRemark = {
  id: string;
  kind: RemarkKind;
  fileId?: string;
  from?: number;
  to?: number;
  anchorText?: string;
  scopeKey: string;
  scopeLabel: string;
  label: string;
  body: string;
  author: string;
  createdAt: string;
  state: "staged";
};

export type Pending =
  | { kind: "scope" }
  | { kind: "scope-compose" }
  | { kind: "file"; fileId: string }
  | { kind: "line"; fileId: string; anchor: number; from: number; to: number }
  | { kind: "lines"; fileId: string; anchor: number; from: number; to: number };

const KEY = "deepfield:staged-remarks:v2";
const AUTHOR = "you";

export function loadStaged(): StagedRemark[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as StagedRemark[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    throw new Error("Failed to read staged remarks", { cause: error });
  }
}

export function saveStaged(list: StagedRemark[]): void {
  sessionStorage.setItem(KEY, JSON.stringify(list));
}

export function inScope(remarks: StagedRemark[], scopeKey: string): StagedRemark[] {
  return remarks.filter((remark) => remark.scopeKey === scopeKey);
}

export function withDrift(remark: StagedRemark, file: FileNode | undefined): StagedRemark & { drift: AnchorDrift } {
  if (!remark.from || remark.kind === "scope" || remark.kind === "file") {
    return { ...remark, drift: "none" };
  }
  const placed = relocate(file, remark);
  return { ...remark, from: placed.from, to: placed.to, drift: placed.drift };
}

export function makeRemark(
  pending: Pending,
  body: string,
  scopeKey: string,
  scopeLabel: string,
  label: string,
  file: FileNode | undefined,
): StagedRemark {
  const kind: RemarkKind = pending.kind === "scope-compose" ? "scope" : pending.kind === "scope" ? "scope" : pending.kind;
  const from = "from" in pending ? pending.from : undefined;
  const to = "to" in pending ? pending.to : undefined;
  const fileId = "fileId" in pending ? pending.fileId : undefined;
  return {
    id: `rm:${Date.now().toString(36)}`,
    kind,
    fileId,
    from,
    to,
    anchorText: from ? anchorTextOf(file, from, to ?? from) : undefined,
    scopeKey,
    scopeLabel,
    label,
    body,
    author: AUTHOR,
    createdAt: new Date().toISOString(),
    state: "staged",
  };
}

export function toInboxItem(remark: StagedRemark): InboxItem {
  return {
    id: remark.id,
    targetId: remark.fileId ?? remark.scopeKey,
    body: remark.body,
    status: "pending",
    kind: remark.kind,
    fileId: remark.fileId,
    from: remark.from,
    to: remark.to,
    anchorText: remark.anchorText,
    scopeKey: remark.scopeKey,
    scopeLabel: remark.scopeLabel,
    label: remark.label,
    author: remark.author,
    createdAt: remark.createdAt,
  };
}

export function pendingLabel(pending: Pending, scopeName: string, filePath: string | undefined): string {
  if (pending.kind === "scope" || pending.kind === "scope-compose") {
    return scopeName;
  }
  const name = filePath?.split("/").pop() ?? "file";
  if (pending.kind === "file") {
    return filePath ?? name;
  }
  if (pending.kind === "lines") {
    return `${name}:${pending.from}–${pending.to}`;
  }
  return `${name}:${pending.from}`;
}
