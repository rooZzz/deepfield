import { analogMatch, betterRaw, siteScore, tokensFromHunk } from "./echo-match.ts";
import { sortById, sortStrings } from "./hash.ts";
import type { FileNode, GraphEdge } from "./types.ts";

const MAX_FILES = 12;

type FileKeys = { file: FileNode; keys: Map<string, string> };

type Cand = {
  hard: boolean;
  key: string;
  token: string;
  count: number;
  from: FileNode;
  to: FileNode;
};

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

export { analogMatch, echoKey, tokensFromHunk } from "./echo-match.ts";

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
    if (key.startsWith("~") || ids.length > MAX_FILES) {
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
  const hard = hardCands(aIds, bIds, byFile, valid);
  const win = pick(hard) ?? pick(analogCands(aIds, bIds, byFile));
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

function hardCands(
  aIds: string[],
  bIds: string[],
  byFile: Map<string, FileKeys>,
  valid: Set<string>,
): Cand[] {
  const cands: Cand[] = [];
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
    const ends = order(aBest.file, bBest.file);
    cands.push({ hard: true, key, token, count: aHits.length + bHits.length, ...ends });
  }
  return cands;
}

function analogCands(aIds: string[], bIds: string[], byFile: Map<string, FileKeys>): Cand[] {
  const fileCount = new Map<string, number>();
  for (const { keys } of byFile.values()) {
    for (const key of keys.keys()) {
      fileCount.set(key, (fileCount.get(key) ?? 0) + 1);
    }
  }
  const cands: Cand[] = [];
  for (const aid of aIds) {
    const aHit = byFile.get(aid);
    if (!aHit) {
      continue;
    }
    for (const bid of bIds) {
      const bHit = byFile.get(bid);
      if (!bHit) {
        continue;
      }
      for (const [ka, ta] of aHit.keys) {
        for (const [kb, tb] of bHit.keys) {
          if (ka === kb || (fileCount.get(ka) ?? 0) > MAX_FILES || (fileCount.get(kb) ?? 0) > MAX_FILES) {
            continue;
          }
          if (!analogMatch(ta, tb)) {
            continue;
          }
          const ends = order(aHit.file, bHit.file);
          cands.push({
            hard: false,
            key: ka < kb ? ka : kb,
            token: betterRaw(ta, tb),
            count: siteScore(aHit.file, ta, ka) + siteScore(bHit.file, tb, kb),
            ...ends,
          });
        }
      }
    }
  }
  return cands;
}

function pick(cands: Cand[]): Cand | undefined {
  return [...cands].sort((a, b) => {
    if (a.hard !== b.hard) {
      return a.hard ? -1 : 1;
    }
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.key.localeCompare(b.key) || a.from.id.localeCompare(b.from.id) || a.to.id.localeCompare(b.to.id);
  })[0];
}

function withKey(ids: string[], key: string, byFile: Map<string, FileKeys>): FileKeys[] {
  const hits: FileKeys[] = [];
  for (const id of ids) {
    const hit = byFile.get(id);
    if (hit?.keys.has(key)) {
      hits.push(hit);
    }
  }
  hits.sort((a, b) => {
    const token = a.keys.get(key) ?? key;
    const diff = siteScore(b.file, b.keys.get(key) ?? token, key) - siteScore(a.file, a.keys.get(key) ?? token, key);
    return diff || a.file.id.localeCompare(b.file.id);
  });
  return hits;
}

function order(a: FileNode, b: FileNode): { from: FileNode; to: FileNode } {
  return a.id < b.id ? { from: a, to: b } : { from: b, to: a };
}
