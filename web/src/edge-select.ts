import type { GraphDocument, GraphEdge } from "../../src/types.ts";
import { byId, clusterOfFile } from "./model.ts";

export type DrawnTap = {
  id: string;
  kind: string;
  source: string;
  target: string;
};

export function tapEdgeId(graph: GraphDocument, drawn: DrawnTap): string | undefined {
  if (graph.edges.some((edge) => edge.id === drawn.id)) {
    return drawn.id;
  }
  const kind = drawn.kind === "import" || drawn.kind === "contract" ? drawn.kind : undefined;
  return edgeBetweenClusters(graph, drawn.source, drawn.target, kind)?.id;
}

export function edgeBetweenClusters(
  graph: GraphDocument,
  a: string,
  b: string,
  kind?: GraphEdge["kind"],
): GraphEdge | undefined {
  const from = clusterId(graph, a);
  const to = clusterId(graph, b);
  if (!from || !to || from === to) {
    return undefined;
  }
  const hits = graph.edges.filter((edge) => {
    if (kind && edge.kind !== kind) {
      return false;
    }
    const src = clusterId(graph, edge.fromId);
    const tgt = clusterId(graph, edge.toId);
    return Boolean(src && tgt && ((src === from && tgt === to) || (src === to && tgt === from)));
  });
  return hits.find((edge) => edge.kind === "contract")
    ?? hits.find((edge) => edge.crossService)
    ?? hits[0];
}

function clusterId(graph: GraphDocument, id: string): string | undefined {
  const node = byId(graph, id);
  if (node?.kind === "cluster") {
    return node.id;
  }
  if (node?.kind === "file") {
    return clusterOfFile(graph, node.id)?.id;
  }
  return undefined;
}
