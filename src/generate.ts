import { classify } from "./classify.ts";
import { describeDiff } from "./diff-kind.ts";
import { clusterFiles } from "./cluster.ts";
import { contractEdges } from "./contracts.ts";
import { echoEdges } from "./echo.ts";
import { checkoutDelta } from "./git/delta.ts";
import { discoverCheckouts, type Checkout } from "./git/layout.ts";
import { sortById } from "./hash.ts";
import { importEdges } from "./imports.ts";
import { loadPackages } from "./packages.ts";
import { reviewPaths } from "./path.ts";
import { layoutPositions } from "./positions.ts";
import { riskHits } from "./risk.ts";
import type { FileNode, GraphDocument, ServiceNode } from "./types.ts";

export type GenerateOpts = {
  only?: string[];
  base?: string;
  bases?: Record<string, string>;
};

export function requestedBase(repo: string, opts: GenerateOpts = {}): string {
  return opts.bases?.[repo] ?? opts.base ?? "HEAD";
}

export async function generateGraph(root: string, opts: GenerateOpts = {}): Promise<GraphDocument> {
  const checkouts = selectCheckouts(await discoverCheckouts(root), opts.only);
  const files: FileNode[] = [];
  const deltas = [];
  for (const checkout of checkouts) {
    deltas.push(await checkoutDelta(checkout, requestedBase(checkout.repo, opts)));
  }
  for (const delta of deltas) {
    const paths = new Set(delta.files.map((file) => file.path));
    for (const changed of delta.files) {
      if (changed.gitlink) {
        continue;
      }
      const cls = classify(changed, paths);
      const diff = describeDiff(changed.path, changed.hunk);
      files.push({
        id: `file:${changed.repo}:${changed.path}`,
        kind: "file",
        repo: changed.repo,
        path: changed.path,
        change: changed.change,
        class: cls,
        hunk: diff.hunk,
        noDiff: diff.noDiff,
        bytes: diff.bytes,
      });
    }
  }
  const liveFiles = sortById(files);
  const services: ServiceNode[] = sortById(
    [...new Set(liveFiles.map((file) => file.repo))].map((repo) => ({
      id: `service:${repo}`,
      kind: "service" as const,
      repo,
    })),
  );
  const packages = await loadPackages(root, checkouts);
  const pkgLookup = new Map(
    [...packages.entries()].map(([name, pkg]) => [name, { repo: pkg.repo, main: pkg.main }]),
  );
  const edges = sortById([
    ...(await importEdges(liveFiles, root, pkgLookup)),
    ...(await contractEdges(liveFiles, root)),
    ...echoEdges(liveFiles),
  ]);
  const clusters = clusterFiles(liveFiles, edges);
  const risks = riskHits(liveFiles, edges, clusters);
  const filesById = new Map(liveFiles.map((file) => [file.id, file]));
  const paths = reviewPaths(clusters, edges, risks, filesById);
  return {
    version: 1,
    root,
    nodes: sortById([...services, ...clusters, ...liveFiles]),
    edges,
    risks,
    paths,
    positions: layoutPositions(services, clusters),
    warnings: [],
  };
}

function selectCheckouts(discovered: Checkout[], only: string[] | undefined): Checkout[] {
  if (!only?.length) {
    return discovered;
  }
  const known = new Set(discovered.map((checkout) => checkout.repo));
  const missing = only.filter((repo) => !known.has(repo));
  if (missing.length) {
    throw new Error(`generate --only unknown checkout(s): ${missing.join(", ")}`);
  }
  const allow = new Set(only);
  return discovered.filter((checkout) => allow.has(checkout.repo));
}
