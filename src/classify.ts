import path from "node:path";
import type { ChangedFile, FileClass } from "./types.ts";

const LOCKS = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "Cargo.lock",
  "go.sum",
  "yarn.lock",
  "composer.lock",
]);

const CONTROL = /\b(if|switch|try|catch|return|throw|await|rescue|raise|except)\b/;

export function classify(file: ChangedFile, deltaPaths: Set<string>): FileClass {
  const posix = file.path;
  const base = path.posix.basename(posix);
  if (file.gitlink) {
    return "noise.pin";
  }
  if (LOCKS.has(base)) {
    return "noise.lock";
  }
  if (isGenerated(posix, file.hunk)) {
    return "noise.generated";
  }
  if (file.change === "rename" && isWhitespaceOrCommentOnly(file.hunk)) {
    return "noise.rename";
  }
  if (isWhitespaceOrCommentOnly(file.hunk) && file.change === "modify") {
    return "noise.format";
  }
  if (isImportOnly(file.hunk)) {
    return "noise.import";
  }
  if (isDepBump(posix, file.hunk)) {
    return "noise.deps";
  }
  if (isDocs(posix)) {
    return "noise.docs";
  }
  if (isFixture(posix)) {
    return "noise.fixture";
  }
  if (isDto(posix) && !CONTROL.test(changedLines(file.hunk))) {
    return "mechanical.dto";
  }
  if (isTest(posix) && hasProductionTwin(posix, deltaPaths)) {
    return "mechanical.test";
  }
  return "behavioural";
}

function isGenerated(posix: string, hunk: string): boolean {
  return (
    /(^|\/)(dist|build|generated)\//.test(posix) ||
    posix.includes(".generated.") ||
    posix.endsWith(".pb.go") ||
    posix.endsWith("_pb2.py") ||
    /@generated/.test(hunk.slice(0, 400))
  );
}

function isDocs(posix: string): boolean {
  return (
    posix.endsWith(".md") ||
    posix.endsWith(".mdx") ||
    posix.startsWith("docs/") ||
    posix.includes("/docs/") ||
    /^license/i.test(path.posix.basename(posix))
  );
}

function isFixture(posix: string): boolean {
  return /\/(fixtures|testdata)\//.test(posix) || posix.endsWith(".snap");
}

function isDto(posix: string): boolean {
  const base = path.posix.basename(posix);
  return /(types?|models?|dto|entities|schema)\./i.test(base) || /\/(dto|models)\//.test(posix);
}

function isTest(posix: string): boolean {
  return /\.(test|spec)\./.test(posix) || /(^|\/)tests?\//.test(posix);
}

function hasProductionTwin(posix: string, delta: Set<string>): boolean {
  const twin = posix
    .replace(/\.(test|spec)\./, ".")
    .replace(/(^|\/)tests?\//, "$1src/")
    .replace(/(^|\/)tests?\//, "$1");
  return delta.has(twin) || [...delta].some((p) => path.posix.basename(p) === path.posix.basename(twin) && p !== posix);
}

function isDepBump(posix: string, hunk: string): boolean {
  const base = path.posix.basename(posix);
  if (!["package.json", "go.mod", "Cargo.toml"].includes(base)) {
    return false;
  }
  const lines = changedLines(hunk);
  return !CONTROL.test(lines) && /(version|sha|rev|tag)/i.test(lines);
}

function isImportOnly(hunk: string): boolean {
  const lines = changedCodeLines(hunk);
  if (lines.length === 0) {
    return false;
  }
  return lines.every((line) => /^\s*(import|export|from|use |#include|require\()/.test(line));
}

function isWhitespaceOrCommentOnly(hunk: string): boolean {
  const lines = changedCodeLines(hunk);
  return lines.length === 0 && hunk.length > 0;
}

function changedLines(hunk: string): string {
  return changedCodeLines(hunk).join("\n");
}

function changedCodeLines(hunk: string): string[] {
  const out: string[] = [];
  for (const line of hunk.split("\n")) {
    if (!(line.startsWith("+") || line.startsWith("-"))) {
      continue;
    }
    if (line.startsWith("+++") || line.startsWith("---")) {
      continue;
    }
    const body = line.slice(1).trim();
    if (!body || body.startsWith("//") || body.startsWith("#") || body.startsWith("*")) {
      continue;
    }
    out.push(body);
  }
  return out;
}
