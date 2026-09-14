import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FileNode, GraphEdge } from "./types.ts";
import { hash12, sortById } from "./hash.ts";

export async function importEdges(
  files: FileNode[],
  root: string,
  packages: Map<string, { repo: string; main?: string }>,
): Promise<GraphEdge[]> {
  const byPath = new Map(files.map((file) => [`${file.repo}:${file.path}`, file]));
  const edges: GraphEdge[] = [];
  for (const file of files) {
    if (file.change === "delete") {
      continue;
    }
    if (file.class.startsWith("noise.") || !isJs(file.path)) {
      continue;
    }
    const abs = path.join(root, file.repo === "." ? "" : file.repo, file.path);
    let source = "";
    try {
      source = await readFile(abs, "utf8");
    } catch {
      continue;
    }
    for (const spec of specifiers(source)) {
      const target = resolveSpec(file, spec, byPath, packages);
      if (!target || target.id === file.id) {
        continue;
      }
      edges.push(edge(file, target));
    }
  }
  return sortById(unique(edges));
}

function isJs(filePath: string): boolean {
  return /\.([cm]?[jt]sx?)$/.test(filePath);
}

function specifiers(source: string): string[] {
  const found: string[] = [];
  const re =
    /(?:import|export)\s+(?:[^'"\n]+from\s+)?["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    found.push(match[1] ?? match[2]);
  }
  return found;
}

function resolveSpec(
  from: FileNode,
  spec: string,
  byPath: Map<string, FileNode>,
  packages: Map<string, { repo: string; main?: string }>,
): FileNode | null {
  if (spec.startsWith(".")) {
    const dir = path.posix.dirname(from.path);
    const joined = path.posix.normalize(`${dir}/${spec}`);
    return lookup(from.repo, joined, byPath);
  }
  for (const [name, pkg] of [...packages.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (spec === name || spec.startsWith(`${name}/`)) {
      const rest = spec === name ? "" : spec.slice(name.length + 1);
      if (rest) {
        const hit = lookup(pkg.repo, rest, byPath) ?? lookup(pkg.repo, `src/${rest}`, byPath);
        if (hit) {
          return hit;
        }
      }
      if (pkg.main) {
        const main = lookup(pkg.repo, pkg.main, byPath);
        if (main) {
          return main;
        }
      }
    }
  }
  return null;
}

function lookup(repo: string, rel: string, byPath: Map<string, FileNode>): FileNode | null {
  const clean = rel.replace(/^\.\//, "");
  const candidates = [
    clean,
    `${clean}.ts`,
    `${clean}.js`,
    `${clean}.tsx`,
    `${clean}/index.ts`,
    `${clean}/index.js`,
  ];
  for (const candidate of candidates) {
    const hit = byPath.get(`${repo}:${candidate}`);
    if (hit) {
      return hit;
    }
  }
  return null;
}

function edge(from: FileNode, to: FileNode): GraphEdge {
  return {
    id: `edge:import:${from.id}:${to.id}`,
    kind: "import",
    fromId: from.id,
    toId: to.id,
    crossService: from.repo !== to.repo,
  };
}

function unique(edges: GraphEdge[]): GraphEdge[] {
  const map = new Map(edges.map((item) => [item.id, item]));
  return [...map.values()];
}
