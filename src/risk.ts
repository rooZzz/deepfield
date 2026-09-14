import { hash12, sortById, sortStrings } from "./hash.ts";
import { isContractFile } from "./contracts.ts";
import type { ClusterNode, FileNode, GraphEdge, RiskHit } from "./types.ts";

type Rule = {
  ruleId: string;
  severity: RiskHit["severity"];
  hit: (ctx: Ctx) => RiskHit | null;
};

type Ctx = {
  files: FileNode[];
  edges: GraphEdge[];
  clusters: ClusterNode[];
};

const KEYWORD_RULES: Array<{
  ruleId: string;
  severity: RiskHit["severity"];
  re: RegExp;
}> = [
  { ruleId: "R3_RETRY_IDEMPOTENCY", severity: "high", re: /retry|idempotenc|at[-_ ]least[-_ ]once|exactly[-_ ]once|dedup|exactlyOnce|atLeastOnce/i },
  { ruleId: "R4_AUTH_SECURITY", severity: "high", re: /authz?|oauth|jwt|permission|rbac|acl|secret|password|api[_-]?key|crypto|csrf|cors/i },
  { ruleId: "R5_DATA_LOSS", severity: "high", re: /migrat|drop |truncate|delete from|destroy|cascade/i },
  { ruleId: "R10_PAYMENT_MONEY", severity: "high", re: /payment|payout|ledger|balance|currency|stripe|settlement/i },
];

export function riskHits(files: FileNode[], edges: GraphEdge[], clusters: ClusterNode[]): RiskHit[] {
  const ctx = { files, edges, clusters };
  const hits = [
    r1(ctx),
    r2(ctx),
    ...keywordHits(ctx),
    r5Path(ctx),
    r6(ctx),
    r7(ctx),
    r8(ctx),
    r9(ctx),
  ].filter((hit): hit is RiskHit => hit !== null);
  return sortById(hits);
}

function r1(ctx: Ctx): RiskHit | null {
  const evidence = ctx.files.filter(
    (file) => isContractFile(file.path) && !file.class.startsWith("noise."),
  );
  return pack("R1_CONTRACT", "high", evidence, ctx.clusters);
}

function r2(ctx: Ctx): RiskHit | null {
  const files = new Map(ctx.files.map((file) => [file.id, file]));
  const evidence: FileNode[] = [];
  for (const edge of ctx.edges) {
    if (!edge.crossService) {
      continue;
    }
    const from = files.get(edge.fromId);
    const to = files.get(edge.toId);
    if (from?.class === "behavioural" || to?.class === "behavioural") {
      if (from) {
        evidence.push(from);
      }
      if (to) {
        evidence.push(to);
      }
    }
  }
  return pack("R2_CROSS_SERVICE", "high", uniqueFiles(evidence), ctx.clusters);
}

function keywordHits(ctx: Ctx): RiskHit[] {
  return KEYWORD_RULES.map((rule) => {
    const evidence = ctx.files.filter((file) => {
      if (file.class !== "behavioural") {
        return false;
      }
      return rule.re.test(file.path) || rule.re.test(diffLines(file.hunk ?? ""));
    });
    return pack(rule.ruleId, rule.severity, evidence, ctx.clusters);
  }).filter((hit): hit is RiskHit => hit !== null);
}

function r5Path(ctx: Ctx): RiskHit | null {
  const evidence = ctx.files.filter(
    (file) => file.class === "behavioural" && file.path.includes("/migrations/"),
  );
  return pack("R5_DATA_LOSS", "high", evidence, ctx.clusters);
}

function r6(ctx: Ctx): RiskHit | null {
  const re = /^[+-].*(\bcatch\b|\brescue\b|\.catch\(|\bexcept\b|\bthrow\b|\braise\b)/;
  const evidence = ctx.files.filter((file) => {
    if (file.class !== "behavioural") {
      return false;
    }
    return (file.hunk ?? "").split("\n").some((line) => re.test(line) && !line.startsWith("+++") && !line.startsWith("---"));
  });
  return pack("R6_ERROR_PROPAGATION", "medium", evidence, ctx.clusters);
}

function r7(ctx: Ctx): RiskHit | null {
  const evidence: FileNode[] = [];
  for (const file of ctx.files) {
    const isTest = /\.(test|spec)\./.test(file.path) || /(^|\/)tests?\//.test(file.path);
    if (!isTest) {
      continue;
    }
    if (file.change === "delete") {
      evidence.push(file);
      continue;
    }
    if ((file.hunk ?? "").split("\n").some((line) => line.startsWith("-") && /assert|expect\(|should\.|require\./.test(line))) {
      const cluster = ctx.clusters.find((item) => item.memberIds.includes(file.id));
      const sibling = ctx.files.some(
        (other) => other.class === "behavioural" && cluster?.memberIds.includes(other.id),
      );
      if (sibling) {
        evidence.push(file);
      }
    }
  }
  return pack("R7_TEST_REMOVED", "medium", evidence, ctx.clusters);
}

function r8(ctx: Ctx): RiskHit | null {
  const re = /feature.?flag|unleash|launchdarkly|config/i;
  const evidence = ctx.files.filter((file) => {
    if (!re.test(file.path)) {
      return false;
    }
    return ctx.edges.some(
      (edge) =>
        (edge.fromId === file.id || edge.toId === file.id) &&
        (edge.crossService || importedByTwo(file.id, ctx.edges)),
    );
  });
  return pack("R8_SHARED_CONFIG", "medium", evidence, ctx.clusters);
}

function r9(ctx: Ctx): RiskHit | null {
  const deleted = ctx.files.filter((file) => file.change === "delete");
  const added = ctx.files.filter((file) => file.change === "add");
  const evidence: FileNode[] = [];
  for (const gone of deleted) {
    const base = gone.path.split("/").pop();
    const twin = added.find((file) => file.repo !== gone.repo && file.path.split("/").pop() === base);
    if (twin) {
      evidence.push(gone, twin);
    }
  }
  return pack("R9_BEHAVIOUR_MOVED", "high", uniqueFiles(evidence), ctx.clusters);
}

function importedByTwo(fileId: string, edges: GraphEdge[]): boolean {
  const repos = new Set(
    edges.filter((edge) => edge.toId === fileId).map((edge) => edge.fromId),
  );
  return repos.size >= 2;
}

function pack(
  ruleId: string,
  severity: RiskHit["severity"],
  files: FileNode[],
  clusters: ClusterNode[],
): RiskHit | null {
  if (files.length === 0) {
    return null;
  }
  const evidence = sortById(
    files.map((file) => ({
      nodeId: file.id,
      path: file.path,
      repo: file.repo,
      excerpt: excerpt(file),
    })),
  );
  const clusterIds = sortStrings(
    clusters.filter((cluster) => cluster.memberIds.some((id) => files.some((file) => file.id === id))).map((c) => c.id),
  );
  const serviceIds = sortStrings([...new Set(files.map((file) => `service:${file.repo}`))]);
  return {
    id: `risk:${ruleId}:${hash12(evidence.map((item) => item.nodeId).join(","))}`,
    ruleId,
    severity,
    evidence,
    clusterIds,
    serviceIds,
  };
}

function excerpt(file: FileNode): string | undefined {
  const line = (file.hunk ?? "").split("\n").find((row) => row.startsWith("+") && !row.startsWith("+++"));
  if (!line) {
    return undefined;
  }
  return line.slice(1).trim().slice(0, 120);
}

function diffLines(hunk: string): string {
  return hunk
    .split("\n")
    .filter((line) => (line.startsWith("+") || line.startsWith("-")) && !line.startsWith("+++") && !line.startsWith("---"))
    .join("\n");
}

function uniqueFiles(files: FileNode[]): FileNode[] {
  return [...new Map(files.map((file) => [file.id, file])).values()];
}

export type { Rule };
