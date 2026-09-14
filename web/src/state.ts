import type { GraphDocument, InboxDocument, ReviewDocument } from "../../src/types.ts";
import type { BucketId } from "./buckets.ts";
import type { GraphView } from "./graph.ts";
import { emptyGraph } from "./model.ts";
import { loadStaged, type Pending, type StagedRemark } from "./remarks.ts";
import type { Scope } from "./scope.ts";

export const app = {
  graph: emptyGraph() as GraphDocument,
  inbox: { version: 1, items: [] } as InboxDocument,
  review: { version: 1, graphId: "", reviewed: [] } as ReviewDocument,
  failed: false,
  focusId: null as string | null,
  pathIndex: 0,
  scope: { kind: "path" } as Scope,
  cursorId: null as string | null,
  hidden: [] as BucketId[],
  remarks: loadStaged() as StagedRemark[],
  draft: "",
  pending: { kind: "scope" } as Pending,
  editingId: null as string | null,
  legend: false,
  popover: false,
  railOpen: true,
  insOpen: true,
  reelOpen: true,
  railW: 250,
  insW: 344,
  reelH: 280,
  statusLine: "",
  overview: true,
};

export let graphView: GraphView | null = null;

export function setGraphView(view: GraphView | null): void {
  graphView = view;
}
