import { sortById, sortStrings } from "./hash.ts";
import type { FileNode, GraphEdge } from "./types.ts";

const MIN = 8;
const MAX_FILES = 12;

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

type FileKeys = { file: FileNode; keys: Map<string, string> };

export function echoEdges(files: FileNode[]): GraphEdge[] {
  const byFile = collect(files);
  const valid = validKeys(byFile);
  const byRepo = new Map<string, string[]>();
  for (const { file } of byFile.values()) {
    const list = byRepo.get(file.repo) ?? [];
    list.push(file.id);
    byRepo.set(file.repo, list);
  }
  const repos = sortStrings([...byRepo.keys()]);
  const edges: GraphEdge[] = [];
  for (let i = 0; i < repos.length; i++) {
    const repoA = repos[i];
    if (!repoA) {
      continue;
    }
    for (let j = i + 1; j < repos.length; j++) {
      const repoB = repos[j];
      if (!repoB) {
        continue;
      }
      const edge = pairEcho(repoA, repoB, byRepo, byFile, valid);
      if (edge) {
        edges.push(edge);
      }
    }
  }
  return sortById(edges);
}

function collect(files: FileNode[]): Map<string, FileKeys> {
  const byFile = new Map<string, FileKeys>();
  for (const file of files) {
    if (file.change === "delete" || file.class.startsWith("noise.") || file.noDiff || !file.hunk) {
      continue;
    }
    const keys = new Map<string, string>();
    for (const { key, token } of tokensFromHunk(file.hunk)) {
      const prev = keys.get(key);
      keys.set(key, prev ? betterRaw(prev, token) : token);
    }
    if (keys.size) {
      byFile.set(file.id, { file, keys });
    }
  }
  return byFile;
}

function validKeys(byFile: Map<string, FileKeys>): Set<string> {
  const keyFiles = new Map<string, string[]>();
  for (const { file, keys } of byFile.values()) {
    for (const key of keys.keys()) {
      const list = keyFiles.get(key) ?? [];
      list.push(file.id);
      keyFiles.set(key, list);
    }
  }
  const valid = new Set<string>();
  for (const [key, ids] of keyFiles) {
    if (ids.length > MAX_FILES) {
      continue;
    }
    const repos = new Set(ids.map((id) => byFile.get(id)?.file.repo));
    if (repos.size >= 2) {
      valid.add(key);
    }
  }
  return valid;
}

function pairEcho(
  repoA: string,
  repoB: string,
  byRepo: Map<string, string[]>,
  byFile: Map<string, FileKeys>,
  valid: Set<string>,
): GraphEdge | null {
  const aIds = byRepo.get(repoA) ?? [];
  const bIds = byRepo.get(repoB) ?? [];
  const cands: Array<{ key: string; token: string; count: number; from: FileNode; to: FileNode }> = [];
  for (const key of valid) {
    const aHits = withKey(aIds, key, byFile);
    const bHits = withKey(bIds, key, byFile);
    const aBest = aHits[0];
    const bBest = bHits[0];
    if (!aBest || !bBest) {
      continue;
    }
    let token = aBest.keys.get(key) ?? key;
    for (const hit of [...aHits, ...bHits]) {
      const raw = hit.keys.get(key);
      if (raw) {
        token = betterRaw(token, raw);
      }
    }
    const from = aBest.file.id < bBest.file.id ? aBest.file : bBest.file;
    const to = aBest.file.id < bBest.file.id ? bBest.file : aBest.file;
    cands.push({ key, token, count: aHits.length + bHits.length, from, to });
  }
  cands.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  const win = cands[0];
  if (!win) {
    return null;
  }
  return {
    id: `edge:echo:${win.from.id}:${win.to.id}`,
    kind: "echo",
    fromId: win.from.id,
    toId: win.to.id,
    crossService: true,
    token: win.token,
  };
}

function withKey(ids: string[], key: string, byFile: Map<string, FileKeys>): FileKeys[] {
  const hits: FileKeys[] = [];
  for (const id of ids) {
    const hit = byFile.get(id);
    if (hit?.keys.has(key)) {
      hits.push(hit);
    }
  }
  hits.sort((a, b) => a.file.id.localeCompare(b.file.id));
  return hits;
}

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
      const key = echoKey(raw);
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

function isChangeLine(line: string): boolean {
  if (line.startsWith("+++") || line.startsWith("---")) {
    return false;
  }
  return line.startsWith("+") || line.startsWith("-");
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

function betterRaw(a: string, b: string): string {
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
  return a.localeCompare(b) < 0 ? a : b;
}
