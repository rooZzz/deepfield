import assert from "node:assert/strict";
import { test } from "node:test";
import { layoutPositions } from "../src/positions.ts";
import type { ClusterNode, ServiceNode } from "../src/types.ts";

test("clusters stay inside their service orbit", () => {
  const services: ServiceNode[] = ["checkout-api", "checkout-web", "ledger-svc", "payments-api"].map((repo) => ({
    id: `service:${repo}`,
    kind: "service",
    repo,
  }));
  const clusters: ClusterNode[] = [];
  for (const service of services) {
    for (let i = 0; i < 3; i++) {
      clusters.push({
        id: `cluster:${service.repo}:${i}`,
        kind: "cluster",
        repo: service.repo,
        title: `src/${i}`,
        memberIds: [],
        summary: "0 files",
      });
    }
  }
  const pos = layoutPositions(services, clusters);
  assert.equal(Object.keys(pos).filter((id) => id.startsWith("service:")).length, 4);
  for (const cluster of clusters) {
    const home = pos[`service:${cluster.repo}`];
    const at = pos[cluster.id];
    assert.ok(home && at);
  assert.ok(Math.hypot(at.x - home.x, at.y - home.y) < 0.1);
  }
  const homes = services.map((service) => pos[service.id]);
  for (let i = 0; i < homes.length; i++) {
    for (let j = i + 1; j < homes.length; j++) {
      const a = homes[i];
      const b = homes[j];
      assert.ok(a && b);
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 0.45);
    }
  }
});
