import { readFile } from "node:fs/promises";
import path from "node:path";
import { sortById } from "./hash.ts";
import type { FileNode, GraphEdge } from "./types.ts";

const CONTRACT = [
  /\.(proto|graphql|gql|avsc|avro)$/,
  /(^|\/)openapi[^/]*\.(yml|yaml|json)$/i,
  /(^|\/).*swagger.*\.(yml|yaml|json)$/i,
  /(^|\/)asyncapi[^/]*\.(yml|yaml|json)$/i,
];

export function isContractFile(filePath: string): boolean {
  if (CONTRACT.some((re) => re.test(filePath))) {
    return true;
  }
  return filePath.endsWith(".d.ts") && /(^|\/)(contracts|api)\//.test(filePath);
}

export async function contractEdges(files: FileNode[], root: string): Promise<GraphEdge[]> {
  const contracts = files.filter(
    (file) => file.change !== "delete" && !file.class.startsWith("noise.") && isContractFile(file.path),
  );
  const others = files.filter((file) => file.change !== "delete" && !contracts.includes(file));
  const edges: GraphEdge[] = [];
  for (const contract of contracts) {
    const base = path.posix.basename(contract.path);
    for (const other of others) {
      const abs = path.join(root, other.repo === "." ? "" : other.repo, other.path);
      let source = "";
      try {
        source = await readFile(abs, "utf8");
      } catch {
        continue;
      }
      if (!source.includes(base)) {
        continue;
      }
      edges.push({
        id: `edge:contract:${contract.id}:${other.id}`,
        kind: "contract",
        fromId: contract.id,
        toId: other.id,
        crossService: contract.repo !== other.repo,
      });
    }
  }
  return sortById(edges);
}
