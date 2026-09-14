import assert from "node:assert/strict";
import { test } from "node:test";
import { reviewPaths } from "../src/path.ts";
import type { ClusterNode, FileClass, GraphEdge, RiskHit } from "../src/types.ts";

test("review paths are connected walks, not one list grouped by service", () => {
  const clusters: ClusterNode[] = [
    cluster("cluster:api:retry", "api", ["file:api:retry"]),
    cluster("cluster:api:session", "api", ["file:api:session"]),
    cluster("cluster:pay:intent", "pay", ["file:pay:intent"]),
    cluster("cluster:web:client", "web", ["file:web:client"]),
  ];
  const edges: GraphEdge[] = [
    edge("e:client-session", "file:web:client", "file:api:session", true),
    edge("e:session-intent", "file:api:session", "file:pay:intent", true),
  ];
  const risks: RiskHit[] = [
    risk("r:retry", "R3_RETRY_IDEMPOTENCY", ["cluster:api:retry"], ["file:api:retry"]),
    risk("r:session", "R2_CROSS_SERVICE", ["cluster:api:session"], ["file:api:session"]),
    risk("r:client", "R2_CROSS_SERVICE", ["cluster:web:client"], ["file:web:client"]),
  ];
  const filesById = new Map(
    ["file:api:retry", "file:api:session", "file:pay:intent", "file:web:client"].map((id) => [
      id,
      { class: "behavioural" as FileClass },
    ]),
  );
  assert.deepEqual(reviewPaths(clusters, edges, risks, filesById), [
    ["cluster:api:session", "cluster:web:client", "cluster:pay:intent"],
    ["cluster:api:retry"],
  ]);
});

test("equal-severity next hop prefers a cross-service neighbour", () => {
  const clusters: ClusterNode[] = [
    cluster("cluster:api:session", "api", ["file:api:session"]),
    cluster("cluster:api:retry", "api", ["file:api:retry"]),
    cluster("cluster:web:client", "web", ["file:web:client"]),
  ];
  const edges: GraphEdge[] = [
    edge("e:session-retry", "file:api:session", "file:api:retry", false),
    edge("e:session-client", "file:api:session", "file:web:client", true),
  ];
  const risks: RiskHit[] = [
    risk("r:session", "R2_CROSS_SERVICE", ["cluster:api:session"], ["file:api:session"]),
    risk("r:retry", "R3_RETRY_IDEMPOTENCY", ["cluster:api:retry"], ["file:api:retry"]),
    risk("r:client", "R2_CROSS_SERVICE", ["cluster:web:client"], ["file:web:client"]),
  ];
  const filesById = new Map(
    ["file:api:session", "file:api:retry", "file:web:client"].map((id) => [
      id,
      { class: "behavioural" as FileClass },
    ]),
  );
  assert.deepEqual(reviewPaths(clusters, edges, risks, filesById), [
    ["cluster:api:session", "cluster:web:client", "cluster:api:retry"],
  ]);
});

function cluster(id: string, repo: string, memberIds: string[]): ClusterNode {
  return { id, kind: "cluster", repo, title: id, memberIds, summary: "" };
}

function edge(id: string, fromId: string, toId: string, crossService: boolean): GraphEdge {
  return { id, kind: "import", fromId, toId, crossService };
}

function risk(id: string, ruleId: string, clusterIds: string[], evidenceIds: string[]): RiskHit {
  return {
    id,
    ruleId,
    severity: "high",
    evidence: evidenceIds.map((nodeId) => ({ nodeId, path: nodeId, repo: "x" })),
    clusterIds,
    serviceIds: [],
  };
}
