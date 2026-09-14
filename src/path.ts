import type { ClusterNode, GraphEdge, RiskHit } from "./types.ts";

const RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

type Scored = {
  id: string;
  severity: number;
  contract: boolean;
  cross: boolean;
  behavioural: boolean;
};

export function reviewPaths(
  clusters: ClusterNode[],
  edges: GraphEdge[],
  risks: RiskHit[],
  filesById: Map<string, { class: string }>,
): string[][] {
  const scored = new Map(clusters.map((cluster) => {
    const item: Scored = {
      id: cluster.id,
      severity: maxSeverity(cluster.id, risks),
      contract: hasKind(cluster, edges, "contract") || hasKind(cluster, edges, "echo"),
      cross: hasCross(cluster, edges),
      behavioural: cluster.memberIds.some((id) => filesById.get(id)?.class === "behavioural"),
    };
    return [cluster.id, item] as const;
  }));
  const adj = adjacency(clusters, edges);
  const remaining = new Set(scored.keys());
  const paths: string[][] = [];
  while (remaining.size) {
    const seed = pickSeed(remaining, scored);
    if (!seed) {
      break;
    }
    const walk = [seed];
    remaining.delete(seed);
    const onPath = new Set<string>([seed]);
    while (true) {
      const next = pickFrontier(remaining, onPath, adj, scored);
      if (!next) {
        break;
      }
      walk.push(next);
      remaining.delete(next);
      onPath.add(next);
    }
    paths.push(walk);
  }
  return paths;
}

function pickSeed(remaining: Set<string>, scored: Map<string, Scored>): string | undefined {
  return [...remaining].sort((a, b) => cmpSeed(need(scored, a), need(scored, b)))[0];
}

function pickFrontier(
  remaining: Set<string>,
  onPath: Set<string>,
  adj: Map<string, Map<string, boolean>>,
  scored: Map<string, Scored>,
): string | undefined {
  const hops: Array<{ id: string; cross: boolean }> = [];
  const seen = new Map<string, boolean>();
  for (const id of onPath) {
    const neighbours = adj.get(id);
    if (!neighbours) {
      continue;
    }
    for (const [nid, cross] of neighbours) {
      if (!remaining.has(nid)) {
        continue;
      }
      seen.set(nid, Boolean(seen.get(nid) || cross));
    }
  }
  for (const [id, cross] of seen) {
    hops.push({ id, cross });
  }
  hops.sort((a, b) => cmpHop(need(scored, a.id), a.cross, need(scored, b.id), b.cross));
  return hops[0]?.id;
}

function cmpSeed(a: Scored, b: Scored): number {
  if (b.severity !== a.severity) {
    return b.severity - a.severity;
  }
  if (a.cross !== b.cross) {
    return a.cross ? -1 : 1;
  }
  if (a.contract !== b.contract) {
    return a.contract ? -1 : 1;
  }
  if (a.behavioural !== b.behavioural) {
    return a.behavioural ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function cmpHop(a: Scored, crossA: boolean, b: Scored, crossB: boolean): number {
  if (b.severity !== a.severity) {
    return b.severity - a.severity;
  }
  if (crossA !== crossB) {
    return crossA ? -1 : 1;
  }
  return cmpSeed(a, b);
}

function adjacency(clusters: ClusterNode[], edges: GraphEdge[]): Map<string, Map<string, boolean>> {
  const ofFile = new Map<string, string>();
  for (const cluster of clusters) {
    for (const id of cluster.memberIds) {
      ofFile.set(id, cluster.id);
    }
  }
  const adj = new Map<string, Map<string, boolean>>();
  for (const cluster of clusters) {
    adj.set(cluster.id, new Map());
  }
  for (const edge of edges) {
    const from = ofFile.get(edge.fromId);
    const to = ofFile.get(edge.toId);
    if (!from || !to || from === to) {
      continue;
    }
    link(adj, from, to, edge.crossService);
    link(adj, to, from, edge.crossService);
  }
  return adj;
}

function link(adj: Map<string, Map<string, boolean>>, from: string, to: string, cross: boolean): void {
  const row = adj.get(from);
  if (!row) {
    throw new Error(`cluster ${from} missing from adjacency`);
  }
  row.set(to, Boolean(row.get(to) || cross));
}

function maxSeverity(clusterId: string, risks: RiskHit[]): number {
  let max = 0;
  for (const hit of risks) {
    if (!hit.clusterIds.includes(clusterId)) {
      continue;
    }
    max = Math.max(max, RANK[hit.severity] ?? 0);
  }
  return max;
}

function hasKind(cluster: ClusterNode, edges: GraphEdge[], kind: GraphEdge["kind"]): boolean {
  const members = new Set(cluster.memberIds);
  return edges.some((edge) => edge.kind === kind && (members.has(edge.fromId) || members.has(edge.toId)));
}

function hasCross(cluster: ClusterNode, edges: GraphEdge[]): boolean {
  const members = new Set(cluster.memberIds);
  return edges.some((edge) => edge.crossService && (members.has(edge.fromId) || members.has(edge.toId)));
}

function need(scored: Map<string, Scored>, id: string): Scored {
  const item = scored.get(id);
  if (!item) {
    throw new Error(`unscored cluster ${id}`);
  }
  return item;
}
