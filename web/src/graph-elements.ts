import type { ElementDefinition } from "cytoscape";
import type { ClusterNode, FileNode, GraphDocument } from "../../src/types.ts";
import { bucketOf, type BucketId } from "./buckets.ts";
import { wideClusterEdges } from "./edge-select.ts";
import { behaviouralWeight, clusters, files, services } from "./model.ts";
import { planetLook, sunLook } from "./sun.ts";

const SPACE = 1000;
const SERVICE = 300;

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
    const label = cluster.title.split("/").slice(-2).join("/");
    const look = sunLook(label);
    const weight = behaviouralWeight(graph, cluster);
    const size = (14 + weight * 5) * look.scale;
    const station = graph.paths.findIndex((ids) => ids.includes(cluster.id));
    elements.push({
      data: {
        id: cluster.id,
        kind: "cluster",
        label,
        repo: cluster.repo,
        size,
        station: station >= 0 ? station + 1 : 0,
      },
      position: p,
      grabbable: false,
    });
    placeFiles(elements, graph, cluster, p, hidden, size / 2, look.orbit);
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
  return elements;
}

function placeFiles(
  elements: ElementDefinition[],
  graph: GraphDocument,
  cluster: ClusterNode,
  origin: { x: number; y: number },
  hidden: BucketId[],
  sunR: number,
  orbit: number,
): void {
  const members = cluster.memberIds
    .map((id) => files(graph).find((file) => file.id === id))
    .filter((file): file is FileNode => Boolean(file) && !hidden.includes(bucketOf(file)));
  members.forEach((file, index) => {
    const planet = planetLook(file.path, index, members.length, sunR, orbit, file.change === "add");
    elements.push({
      data: {
        id: file.id,
        kind: "file",
        label: file.path.split("/").pop() ?? file.path,
        clusterId: cluster.id,
        fill: planet.fill,
        size: planet.size,
      },
      position: {
        x: origin.x + planet.x,
        y: origin.y + planet.y,
      },
      classes: file.change === "delete" ? "file-del" : "",
      grabbable: false,
    });
  });
}

function scale(pos: { x: number; y: number } | undefined): { x: number; y: number } {
  return { x: (pos?.x ?? 0.5) * SPACE, y: (pos?.y ?? 0.5) * SPACE };
}

function addClusterEdges(elements: ElementDefinition[], graph: GraphDocument): void {
  for (const edge of wideClusterEdges(graph)) {
    elements.push({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        kind: edge.kind,
        cross: edge.cross,
        lod: "wide",
      },
    });
  }
}
