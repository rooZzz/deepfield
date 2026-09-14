import type { GraphDocument } from "../../src/types.ts";
import { byId } from "./model.ts";

export type HeatTone = "high" | "medium" | "none";

export function fileTone(graph: GraphDocument, fileId: string): HeatTone {
  return toneFrom(graph, (nodeId) => nodeId === fileId);
}

export function clusterTone(graph: GraphDocument, clusterId: string): HeatTone {
  const members = memberSet(graph, clusterId);
  if (!members.size) {
    return "none";
  }
  return toneFrom(graph, (nodeId) => members.has(nodeId));
}

export function clusterHeat(graph: GraphDocument, clusterId: string): number {
  const members = memberSet(graph, clusterId);
  let score = 0;
  for (const hit of graph.risks) {
    for (const item of hit.evidence) {
      if (!members.has(item.nodeId)) {
        continue;
      }
      score += hit.severity === "high" ? 2 : 1;
    }
  }
  return score;
}

export function heatGlow(score: number, tone: HeatTone): { glow: number; halo: number } {
  if (tone === "none") {
    return { glow: 0.1, halo: 4 };
  }
  const t = Math.min(1, score / 6);
  if (tone === "high") {
    return { glow: 0.34 + t * 0.22, halo: 8 + t * 8 };
  }
  return { glow: 0.22 + t * 0.12, halo: 6 + t * 4 };
}

function memberSet(graph: GraphDocument, clusterId: string): Set<string> {
  const node = byId(graph, clusterId);
  return new Set(node?.kind === "cluster" ? node.memberIds : []);
}

function toneFrom(graph: GraphDocument, inScope: (nodeId: string) => boolean): HeatTone {
  let high = false;
  let med = false;
  for (const hit of graph.risks) {
    if (!hit.evidence.some((item) => inScope(item.nodeId))) {
      continue;
    }
    if (hit.severity === "high") {
      high = true;
    } else {
      med = true;
    }
  }
  return high ? "high" : med ? "medium" : "none";
}
