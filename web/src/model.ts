import type { ClusterNode, FileNode, GraphDocument, GraphEdge, ServiceNode } from "../../src/types.ts";

export type Focus =
  | { kind: "cluster"; id: string }
  | { kind: "file"; id: string }
  | { kind: "edge"; id: string }
  | { kind: "service"; id: string }
  | { kind: "path"; id: "path" }
  | null;

export function services(graph: GraphDocument): ServiceNode[] {
  return graph.nodes.filter((node): node is ServiceNode => node.kind === "service");
}

export function clusters(graph: GraphDocument): ClusterNode[] {
  return graph.nodes.filter((node): node is ClusterNode => node.kind === "cluster");
}

export function files(graph: GraphDocument): FileNode[] {
  return graph.nodes.filter((node): node is FileNode => node.kind === "file");
}

export function byId(graph: GraphDocument, id: string) {
  return graph.nodes.find((node) => node.id === id);
}

export function clusterOfFile(graph: GraphDocument, fileId: string): ClusterNode | undefined {
  return clusters(graph).find((cluster) => cluster.memberIds.includes(fileId));
}

export function clusterRisk(graph: GraphDocument, clusterId: string): string[] {
  return graph.risks.filter((hit) => hit.clusterIds.includes(clusterId)).map((hit) => hit.ruleId);
}

export function clusterSeverity(graph: GraphDocument, clusterId: string): "high" | "medium" | "low" | "none" {
  const hits = graph.risks.filter((hit) => hit.clusterIds.includes(clusterId));
  if (hits.some((hit) => hit.severity === "high")) {
    return "high";
  }
  if (hits.some((hit) => hit.severity === "medium")) {
    return "medium";
  }
  if (hits.length) {
    return "low";
  }
  return "none";
}

export function behaviouralWeight(graph: GraphDocument, cluster: ClusterNode): number {
  return files(graph).filter((file) => cluster.memberIds.includes(file.id) && file.class === "behavioural").length;
}

export function edges(graph: GraphDocument): GraphEdge[] {
  return graph.edges;
}

export function pathAt(graph: GraphDocument, index: number): string[] {
  return graph.paths[index] ?? [];
}

export function pathClusters(graph: GraphDocument): string[] {
  return graph.paths.flat();
}

export function pathIndexOf(graph: GraphDocument, clusterId: string): number {
  return graph.paths.findIndex((ids) => ids.includes(clusterId));
}

export function graphId(graph: GraphDocument): string {
  let hash = 2166136261;
  const key = `${graph.paths.map((ids) => ids.join(",")).join(";")}|${graph.nodes.map((node) => node.id).join(",")}`;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function emptyGraph(): GraphDocument {
  return {
    version: 1,
    root: "",
    nodes: [],
    edges: [],
    risks: [],
    paths: [],
    positions: {},
    warnings: [],
  };
}
