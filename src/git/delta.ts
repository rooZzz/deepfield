import { readFile } from "node:fs/promises";
import path from "node:path";
import { sortStrings } from "../hash.ts";
import type { ChangeKind, ChangedFile } from "../types.ts";
import { git, gitOk } from "./exec.ts";
import type { Checkout } from "./layout.ts";

export type Delta = {
  checkout: Checkout;
  base: string;
  files: ChangedFile[];
};

const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

export async function checkoutDelta(checkout: Checkout, baseRef: string): Promise<Delta> {
  const head = await gitOk(checkout.abs, ["rev-parse", "--verify", "HEAD"]);
  if (!head) {
    return await collect(checkout, EMPTY_TREE, false);
  }
  const resolved = await gitOk(checkout.abs, ["rev-parse", "--verify", baseRef]);
  if (resolved === null) {
    throw new Error(`generate base ${baseRef} not found in ${checkout.repo}`);
  }
  return await collect(checkout, baseRef, true);
}

async function collect(checkout: Checkout, base: string, hasHead: boolean): Promise<Delta> {
  const names = await changedPaths(checkout.abs, base, hasHead);
  const files: ChangedFile[] = [];
  for (const rel of names) {
    files.push(await describe(checkout, base, rel, hasHead));
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { checkout, base, files };
}

async function changedPaths(cwd: string, base: string, hasHead: boolean): Promise<string[]> {
  const names = new Set<string>();
  if (hasHead) {
    const range = await git(cwd, ["diff", "--name-only", "-z", `${base}...HEAD`]);
    const unstaged = await git(cwd, ["diff", "--name-only", "-z"]);
    const staged = await git(cwd, ["diff", "--name-only", "-z", "--cached"]);
    for (const blob of [range, unstaged, staged]) {
      for (const name of blob.split("\0")) {
        if (name) {
          names.add(name);
        }
      }
    }
  }
  const untracked = await git(cwd, ["ls-files", "--others", "--exclude-standard", "-z"]);
  for (const name of untracked.split("\0")) {
    if (name) {
      names.add(name);
    }
  }
  return sortStrings([...names]);
}

async function describe(
  checkout: Checkout,
  base: string,
  rel: string,
  hasHead: boolean,
): Promise<ChangedFile> {
  const abs = path.join(checkout.abs, rel);
  let exists = true;
  try {
    await readFile(abs);
  } catch {
    exists = false;
  }
  const nameStatus = hasHead
    ? await gitOk(checkout.abs, ["diff", "--name-status", "-M", `${base}...HEAD`, "--", rel])
    : "";
  let change: ChangeKind = exists ? "modify" : "delete";
  let renamedFrom: string | undefined;
  const line = nameStatus?.split("\n")[0] ?? "";
  if (line.startsWith("A")) {
    change = "add";
  } else if (line.startsWith("D")) {
    change = "delete";
  } else if (line.startsWith("R")) {
    change = "rename";
    renamedFrom = line.split("\t")[1];
  }
  if (!exists && change !== "delete") {
    change = "delete";
  }
  const untracked = await gitOk(checkout.abs, ["ls-files", "--others", "--exclude-standard", "--", rel]);
  if (untracked === rel) {
    change = "add";
  }
  const hunk = await fileHunk(checkout.abs, base, rel, exists, change, hasHead);
  const mode = hasHead ? await gitOk(checkout.abs, ["ls-tree", base, rel]) : null;
  const gitlink = Boolean(mode?.startsWith("160000"));
  return {
    repo: checkout.repo,
    path: rel.split(path.sep).join("/"),
    change,
    hunk,
    renamedFrom,
    gitlink,
    exists,
  };
}

async function fileHunk(
  cwd: string,
  base: string,
  rel: string,
  exists: boolean,
  change: ChangeKind,
  hasHead: boolean,
): Promise<string> {
  const parts: string[] = [];
  if (hasHead) {
    const ranged = await gitOk(cwd, ["diff", "-M", `${base}...HEAD`, "--", rel]);
    const work = await gitOk(cwd, ["diff", "--", rel]);
    const staged = await gitOk(cwd, ["diff", "--cached", "--", rel]);
    for (const part of [ranged, work, staged]) {
      if (part) {
        parts.push(part);
      }
    }
  }
  if (parts.length > 0) {
    return parts.join("\n");
  }
  if (change === "add" && exists) {
    return await readFile(path.join(cwd, rel), "utf8");
  }
  return "";
}
