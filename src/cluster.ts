import path from "node:path";
import { hash12, sortById, sortStrings } from "./hash.ts";
import type { ClusterNode, FileNode, GraphEdge } from "./types.ts";

export function clusterFiles(files: FileNode[], edges: GraphEdge[]): ClusterNode[] {
  const live = files.filter((file) => !file.class.startsWith("noise."));
  const byRepo = new Map<string, FileNode[]>();
  for (const file of live) {
    const list = byRepo.get(file.repo) ?? [];
    list.push(file);
    byRepo.set(file.repo, list);
  }
  const clusters: ClusterNode[] = [];
  for (const repo of sortStrings([...byRepo.keys()])) {
    clusters.push(...clusterRepo(repo, byRepo.get(repo) ?? [], edges));
  }
  return sortById(clusters);
}

function clusterRepo(repo: string, files: FileNode[], edges: GraphEdge[]): ClusterNode[] {
  const ids = new Set(files.map((file) => file.id));
  const adj = new Map<string, Set<string>>();
  for (const id of ids) {
    adj.set(id, new Set());
  }
  for (const edge of edges) {
    if (!ids.has(edge.fromId) || !ids.has(edge.toId)) {
      continue;
    }
    adj.get(edge.fromId)?.add(edge.toId);
    adj.get(edge.toId)?.add(edge.fromId);
  }
  const components = connected(ids, adj).map((memberIds) => sortStrings(memberIds));
  const merged = mergeSingletons(repo, files, components);
  return merged.map((memberIds) => toCluster(repo, files, memberIds));
}

function connected(ids: Set<string>, adj: Map<string, Set<string>>): string[][] {
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const start of sortStrings([...ids])) {
    if (seen.has(start)) {
      continue;
    }
    const stack = [start];
    const comp: string[] = [];
    seen.add(start);
    while (stack.length) {
      const id = stack.pop()!;
      comp.push(id);
      for (const next of sortStrings([...(adj.get(id) ?? [])])) {
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      }
    }
    out.push(comp);
  }
  return out;
}

function mergeSingletons(repo: string, files: FileNode[], components: string[][]): string[][] {
  const byId = new Map(files.map((file) => [file.id, file]));
  const groups = components.map((memberIds) => ({ memberIds, prefix: prefixOf(byId, memberIds) }));
  const result: string[][] = [];
  const consumed = new Set<number>();
  for (let i = 0; i < groups.length; i++) {
    if (consumed.has(i) || groups[i].memberIds.length !== 1) {
      continue;
    }
    const prefix = depthPrefix(groups[i].prefix, 2);
    let best = -1;
    for (let j = 0; j < groups.length; j++) {
      if (i === j || consumed.has(j) || groups[j].memberIds.length < 1) {
        continue;
      }
      if (depthPrefix(groups[j].prefix, 2) !== prefix || prefix === "") {
        continue;
      }
      if (
        best === -1 ||
        groups[j].memberIds.length > groups[best].memberIds.length ||
        (groups[j].memberIds.length === groups[best].memberIds.length &&
          groups[j].memberIds[0] < groups[best].memberIds[0])
      ) {
        best = j;
      }
    }
    if (best >= 0) {
      groups[best].memberIds = sortStrings([...groups[best].memberIds, ...groups[i].memberIds]);
      consumed.add(i);
    }
  }
  for (let i = 0; i < groups.length; i++) {
    if (!consumed.has(i)) {
      result.push(groups[i].memberIds);
    }
  }
  return result;
}

function prefixOf(byId: Map<string, FileNode>, memberIds: string[]): string {
  const paths = memberIds.map((id) => byId.get(id)?.path ?? "").filter(Boolean);
  if (paths.length === 0) {
    return "";
  }
  const parts = paths[0].split("/");
  let i = 0;
  for (; i < parts.length; i++) {
    if (!paths.every((p) => p.split("/")[i] === parts[i])) {
      break;
    }
  }
  const joined = parts.slice(0, i).join("/");
  return joined.endsWith(".ts") || joined.includes(".") ? path.posix.dirname(paths[0]) : joined;
}

function depthPrefix(prefix: string, depth: number): string {
  return prefix.split("/").slice(0, depth).join("/");
}

function toCluster(repo: string, files: FileNode[], memberIds: string[]): ClusterNode {
  const byId = new Map(files.map((file) => [file.id, file]));
  const members = memberIds.map((id) => byId.get(id)!).filter(Boolean);
  const title = clusterTitle(members);
  const behavioural = members.filter((file) => file.class === "behavioural").length;
  const id = `cluster:${repo}:${hash12(memberIds.join(","))}`;
  return {
    id,
    kind: "cluster",
    repo,
    title,
    memberIds,
    summary: `${behavioural} behavioural files, ${members.length} files`,
  };
}

function clusterTitle(members: FileNode[]): string {
  const paths = sortStrings(members.map((file) => file.path));
  const prefix = prefixOf(new Map(members.map((file) => [file.id, file])), members.map((file) => file.id));
  if (prefix && prefix !== ".") {
    return prefix;
  }
  return path.posix.basename(paths[0] ?? "change");
}
