import type { ElementDefinition } from "cytoscape";
import type { ClusterNode, FileNode, GraphDocument } from "../../src/types.ts";
import { bucketOf, type BucketId } from "./buckets.ts";
import { behaviouralWeight, clusterOfFile, clusters, files, services } from "./model.ts";
import { clusterHeat, clusterTone, fileTone, heatGlow } from "./heat.ts";

const SPACE = 1000;
const SERVICE = 300;
const FILE_R = 18;

export const LOD = {
  clusterLabel: 0.42,
  files: 1.35,
  fileLabel: 2,
};

export const CAMERA = { min: 0.25, max: 4, step: 1.25 };

export function toElements(graph: GraphDocument, hidden: BucketId[]): ElementDefinition[] {
  const elements: ElementDefinition[] = [];
  for (const service of services(graph)) {
    const p = scale(graph.positions[service.id]);
    elements.push({
      data: { id: service.id, kind: "service", label: service.repo.toUpperCase(), repo: service.repo, size: SERVICE },
      position: p,
      grabbable: false,
    });
  }
  for (const cluster of clusters(graph)) {
    const p = scale(graph.positions[cluster.id]);
    const weight = behaviouralWeight(graph, cluster);
    const tone = clusterTone(graph, cluster.id);
    const glow = heatGlow(clusterHeat(graph, cluster.id), tone);
    const station = graph.paths.findIndex((ids) => ids.includes(cluster.id));
    const classes = [
      weight === 0 ? "hollow" : "",
      tone === "high" ? "risk-high" : tone === "medium" ? "risk-med" : "",
    ].filter(Boolean).join(" ");
    elements.push({
      data: {
        id: cluster.id,
        kind: "cluster",
        label: cluster.title.split("/").slice(-2).join("/"),
        repo: cluster.repo,
        size: 10 + weight * 4,
        station: station >= 0 ? station + 1 : 0,
        glow: glow.glow,
        halo: glow.halo,
      },
      position: p,
      classes,
      grabbable: false,
    });
    placeFiles(elements, graph, cluster, p, hidden);
  }
  addClusterEdges(elements, graph);
  const ids = new Set(elements.map((item) => item.data.id).filter((id): id is string => Boolean(id)));
  for (const edge of graph.edges) {
    if (!ids.has(edge.fromId) || !ids.has(edge.toId)) {
      continue;
    }
    elements.push({
      data: {
        id: edge.id,
        source: edge.fromId,
        target: edge.toId,
        kind: edge.kind,
        cross: edge.crossService ? 1 : 0,
        lod: "detail",
      },
    });
  }
  for (const route of graph.paths) {
    for (let i = 1; i < route.length; i++) {
      const from = route[i - 1];
      const to = route[i];
      if (!from || !to) {
        continue;
      }
      elements.push({
        data: { id: `path:${from}:${to}`, source: from, target: to, kind: "path", lod: "path" },
      });
    }
  }
  return elements;
}

function placeFiles(
  elements: ElementDefinition[],
  graph: GraphDocument,
  cluster: ClusterNode,
  origin: { x: number; y: number },
  hidden: BucketId[],
): void {
  const members = cluster.memberIds
    .map((id) => files(graph).find((file) => file.id === id))
    .filter((file): file is FileNode => Boolean(file) && !hidden.includes(bucketOf(file)));
  members.forEach((file, index) => {
    const angle = (index / Math.max(members.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const tone = fileTone(graph, file.id);
    elements.push({
      data: {
        id: file.id,
        kind: "file",
        label: file.path.split("/").pop() ?? file.path,
        clusterId: cluster.id,
      },
      position: {
        x: origin.x + Math.cos(angle) * FILE_R,
        y: origin.y + Math.sin(angle) * FILE_R,
      },
      classes: [
        file.change === "delete" ? "file-del" : "",
        tone === "high" ? "file-high" : tone === "medium" ? "file-med" : "",
      ].filter(Boolean).join(" "),
      grabbable: false,
    });
  });
}

function scale(pos: { x: number; y: number } | undefined): { x: number; y: number } {
  return { x: (pos?.x ?? 0.5) * SPACE, y: (pos?.y ?? 0.5) * SPACE };
}

function addClusterEdges(elements: ElementDefinition[], graph: GraphDocument): void {
  const seen = new Set<string>();
  for (const edge of graph.edges) {
    const from = clusterOfFile(graph, edge.fromId);
    const to = clusterOfFile(graph, edge.toId);
    if (!from || !to || from.id === to.id) {
      continue;
    }
    const ends = from.id < to.id ? `${from.id}:${to.id}` : `${to.id}:${from.id}`;
    const key = `${edge.kind}:${ends}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    elements.push({
      data: {
        id: `wide:${key}`,
        source: from.id,
        target: to.id,
        kind: edge.kind,
        cross: edge.crossService ? 1 : 0,
        lod: "wide",
      },
    });
  }
}
