import type { FileNode } from "./types.ts";

export const MIN = 8;

const STOP = new Set([
  "tostring",
  "valueof",
  "hasownproperty",
  "addeventlistener",
  "createelement",
  "queryselector",
  "preventdefault",
  "stoppropagation",
  "textcontent",
  "innerhtml",
  "localstorage",
  "sessionstorage",
]);

const STOP_PARTS = new Set(["id", "ids", "key", "keys", "dto", "get", "set", "the", "and", "for", "val", "src", "api"]);

export function tokensFromHunk(hunk: string): Array<{ key: string; token: string }> {
  const found = new Map<string, string>();
  for (const line of hunk.split("\n")) {
    if (!isChangeLine(line)) {
      continue;
    }
    for (const raw of extractRaws(line.slice(1))) {
      if (!isDistinctive(raw)) {
        continue;
      }
      const key = storeKey(raw);
      if (!key || STOP.has(key)) {
        continue;
      }
      const prev = found.get(key);
      found.set(key, prev ? betterRaw(prev, raw) : raw);
    }
  }
  return [...found.entries()].map(([key, token]) => ({ key, token }));
}

export function echoKey(raw: string): string | null {
  let s = raw.toLowerCase();
  if (s.startsWith("x-")) {
    s = s.slice(2);
  }
  s = s.replace(/[^a-z0-9]+/g, "");
  if (s.length < MIN) {
    return null;
  }
  return s;
}

export function analogMatch(a: string, b: string): boolean {
  if (a === b) {
    return false;
  }
  return partsAlign(tokenParts(a), tokenParts(b));
}

export function storeKey(raw: string): string | null {
  const hard = echoKey(raw);
  if (hard) {
    return hard;
  }
  const parts = tokenParts(raw);
  if (!parts.length) {
    return null;
  }
  return `~${parts.join("")}`;
}

export function tokenParts(raw: string): string[] {
  let s = raw.trim();
  if (/^x-/i.test(s)) {
    s = s.slice(2);
  }
  return s
    .split(/[-_]+/)
    .flatMap(splitCamel)
    .map((part) => part.toLowerCase())
    .filter((part) => part.length >= 3 && !STOP_PARTS.has(part));
}

export function siteScore(file: FileNode, token: string, key: string): number {
  let best = 0;
  for (const line of (file.hunk ?? "").split("\n")) {
    if (!isChangeLine(line)) {
      continue;
    }
    const body = line.slice(1);
    if (!mentions(body, token, key)) {
      continue;
    }
    let n = 0;
    if (quotedHit(body, token, key)) {
      n += 4;
    }
    if (/header/i.test(body)) {
      n += 3;
    }
    if (n > best) {
      best = n;
    }
  }
  return best + (file.class === "behavioural" ? 1 : 0);
}

export function betterRaw(a: string, b: string): string {
  const score = (value: string): number => {
    let n = 0;
    if (/[a-z][A-Z]/.test(value)) {
      n += 2;
    }
    if (value.includes("-")) {
      n += 1;
    }
    return n;
  };
  const as = score(a);
  const bs = score(b);
  if (bs !== as) {
    return bs > as ? b : a;
  }
  if (b.length !== a.length) {
    return b.length > a.length ? b : a;
  }
  return a.localeCompare(b) < 0 ? a : b;
}

export function isChangeLine(line: string): boolean {
  if (line.startsWith("+++") || line.startsWith("---")) {
    return false;
  }
  return line.startsWith("+") || line.startsWith("-");
}

function partsAlign(a: string[], b: string[]): boolean {
  if (!a.length || !b.length || a.length !== b.length) {
    return false;
  }
  if (a.length >= 2) {
    return a.every((part, i) => prefixPart(part, b[i] ?? "") || prefixPart(b[i] ?? "", part));
  }
  const left = a[0] ?? "";
  const right = b[0] ?? "";
  const [short, long] = left.length <= right.length ? [left, right] : [right, left];
  return short.length >= 3 && long.length >= 7 && long.startsWith(short) && short !== long;
}

function prefixPart(short: string, long: string): boolean {
  return short === long || (short.length >= 3 && long.startsWith(short));
}

function splitCamel(chunk: string): string[] {
  return chunk.split(/(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/).filter(Boolean);
}

function extractRaws(body: string): string[] {
  const raws: string[] = [];
  const quoted = /["']([^"'\\\n]{2,80})["']/g;
  let match: RegExpExecArray | null;
  while ((match = quoted.exec(body))) {
    if (match[1]) {
      raws.push(match[1]);
    }
  }
  const ident = /\b[A-Za-z_][A-Za-z0-9_]*\b/g;
  while ((match = ident.exec(body))) {
    if (match[0]) {
      raws.push(match[0]);
    }
  }
  const kebab = /\b[A-Za-z][A-Za-z0-9]*(-[A-Za-z0-9]+)+\b/g;
  while ((match = kebab.exec(body))) {
    if (match[0]) {
      raws.push(match[0]);
    }
  }
  return raws;
}

function isDistinctive(raw: string): boolean {
  if (raw.includes("/") || raw.includes(".") || raw.includes(" ")) {
    return false;
  }
  return /[a-z][A-Z]/.test(raw) || /[A-Z][a-z]+[A-Z]/.test(raw) || raw.includes("-") || raw.includes("_");
}

function mentions(body: string, token: string, key: string): boolean {
  return body.includes(token) || body.toLowerCase().replace(/[^a-z0-9]+/g, "").includes(key);
}

function quotedHit(body: string, token: string, key: string): boolean {
  const quoted = /["']([^"'\\\n]+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = quoted.exec(body))) {
    const inner = match[1] ?? "";
    if (inner.includes(token) || echoKey(inner) === key) {
      return true;
    }
  }
  return false;
}
