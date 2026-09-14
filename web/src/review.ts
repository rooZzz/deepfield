import type { GraphDocument, ReviewDocument } from "../../src/types.ts";
import { graphId } from "./model.ts";
import { saveReview } from "./session-api.ts";
import { pathFiles } from "./scope.ts";

export function bindReview(stored: ReviewDocument, graph: GraphDocument): ReviewDocument {
  const id = graphId(graph);
  if (stored.graphId !== id) {
    return { version: 1, graphId: id, reviewed: [] };
  }
  return { ...stored, graphId: id };
}

export function pathProgress(graph: GraphDocument, reviewed: string[]): { done: number; total: number } {
  const rows = pathFiles(graph, []);
  const done = rows.filter((row) => reviewed.includes(row.file.id)).length;
  return { done, total: rows.length };
}

export function clusterProgress(
  graph: GraphDocument,
  reviewed: string[],
  clusterIds: string[],
): { done: number; total: number } {
  const want = new Set(clusterIds);
  const rows = pathFiles(graph, []).filter((row) => want.has(row.cluster.id));
  const done = rows.filter((row) => reviewed.includes(row.file.id)).length;
  return { done, total: rows.length };
}

export async function persistReview(review: ReviewDocument): Promise<void> {
  await saveReview(review);
}

export function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}
