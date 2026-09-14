export type FileClass =
  | "noise.pin"
  | "noise.lock"
  | "noise.generated"
  | "noise.format"
  | "noise.import"
  | "noise.rename"
  | "noise.deps"
  | "noise.docs"
  | "noise.fixture"
  | "mechanical.dto"
  | "mechanical.test"
  | "behavioural";

export type ChangeKind = "add" | "modify" | "delete" | "rename";

export type DiffKind = "binary" | "large" | "missing";

export type FileNode = {
  id: string;
  kind: "file";
  repo: string;
  path: string;
  change: ChangeKind;
  class: FileClass;
  hunk?: string;
  noDiff?: DiffKind;
  bytes?: string;
};

export type ServiceNode = {
  id: string;
  kind: "service";
  repo: string;
};

export type ClusterNode = {
  id: string;
  kind: "cluster";
  repo: string;
  title: string;
  memberIds: string[];
  summary: string;
};

export type GraphNode = FileNode | ServiceNode | ClusterNode;

export type GraphEdge = {
  id: string;
  kind: "import" | "contract";
  fromId: string;
  toId: string;
  crossService: boolean;
};

export type RiskEvidence = {
  nodeId: string;
  path: string;
  repo: string;
  excerpt?: string;
};

export type RiskHit = {
  id: string;
  ruleId: string;
  severity: "high" | "medium" | "low";
  evidence: RiskEvidence[];
  clusterIds: string[];
  serviceIds: string[];
};

export type Point = { x: number; y: number };

export type GraphDocument = {
  version: 1;
  root: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  risks: RiskHit[];
  paths: string[][];
  positions: Record<string, Point>;
  warnings: string[];
};

export type RemarkKind = "scope" | "file" | "line" | "lines";
export type RemarkStatus = "staged" | "pending" | "applied" | "partial" | "blocked";
export type AnchorDrift = "none" | "moved" | "stale";
export type VerdictKind = "approve" | "request-changes";

export type InboxItem = {
  id: string;
  targetId: string;
  body: string;
  extraRepos?: string[];
  status: "pending" | "applied" | "partial" | "blocked";
  reason?: string;
  kind?: RemarkKind;
  fileId?: string;
  from?: number;
  to?: number;
  anchorText?: string;
  scopeKey: string;
  scopeLabel?: string;
  label?: string;
  author: string;
  createdAt: string;
};

export type InboxVerdict = {
  kind: VerdictKind;
  author: string;
  at: string;
};

export type InboxDocument = {
  version: 1;
  items: InboxItem[];
  verdict?: InboxVerdict;
};

export type ReviewDocument = {
  version: 1;
  graphId: string;
  reviewed: string[];
};

export type ChangedFile = {
  repo: string;
  path: string;
  change: ChangeKind;
  hunk: string;
  renamedFrom?: string;
  gitlink: boolean;
  exists: boolean;
};
