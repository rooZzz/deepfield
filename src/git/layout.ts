import { readdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { sortStrings } from "../hash.ts";
import { gitOk } from "./exec.ts";

const SKIP = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  "coverage",
  "playwright-report",
  "test-results",
    ".deepfield",
    ".vite",
    "tmp",
]);

export type Checkout = {
  repo: string;
  abs: string;
};

export async function discoverCheckouts(root: string): Promise<Checkout[]> {
  const absRoot = path.resolve(root);
  const found = new Map<string, Checkout>();
  const rootGit = await gitOk(absRoot, ["rev-parse", "--show-toplevel"]);
  if (rootGit) {
    add(found, absRoot, absRoot);
  }
  for (const rel of await parseGitmodules(absRoot)) {
    const abs = path.join(absRoot, rel);
    if (await isGit(abs)) {
      add(found, absRoot, abs);
    }
  }
  await walkGit(absRoot, absRoot, found, 0);
  return [...found.values()].sort((a, b) => a.repo.localeCompare(b.repo));
}

function add(found: Map<string, Checkout>, root: string, abs: string): void {
  const rel = posixRel(root, abs);
  found.set(rel, { repo: rel, abs });
}

export function posixRel(root: string, abs: string): string {
  const rel = path.relative(root, abs).split(path.sep).join("/");
  return rel === "" ? "." : rel;
}

async function isGit(abs: string): Promise<boolean> {
  const top = await gitOk(abs, ["rev-parse", "--show-toplevel"]);
  if (!top) {
    return false;
  }
  try {
    return (await realpath(top)) === (await realpath(abs));
  } catch {
    return path.resolve(top) === path.resolve(abs);
  }
}

async function parseGitmodules(root: string): Promise<string[]> {
  try {
    const text = await readFile(path.join(root, ".gitmodules"), "utf8");
    const paths: string[] = [];
    for (const line of text.split("\n")) {
      const match = /^\s*path\s*=\s*(.+)$/.exec(line);
      if (match) {
        paths.push(match[1].trim());
      }
    }
    return sortStrings(paths);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function walkGit(
  root: string,
  dir: string,
  found: Map<string, Checkout>,
  depth: number,
): Promise<void> {
  if (depth > 6) {
    return;
  }
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP.has(entry.name) || entry.name.startsWith(".")) {
      continue;
    }
    const abs = path.join(dir, entry.name);
    if (await isGit(abs)) {
      add(found, root, abs);
      continue;
    }
    const st = await stat(abs);
    if (st.isDirectory()) {
      await walkGit(root, abs, found, depth + 1);
    }
  }
}
