import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { generateGraph } from "./generate.ts";
import { canonicalJson } from "./hash.ts";
import { buildPaymentRetryFixture } from "../test/helpers/meta-fixture.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "web");
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "eagle-eye";
const base = process.env.PAGES_BASE ?? `/${repo}/`;

process.env.VITE_DEEPFIELD_STATIC = "1";

const fixture = await buildPaymentRetryFixture();
const graph = await generateGraph(fixture.root);
graph.root = "demo";

await build({
  root: WEB,
  base,
  configFile: false,
  define: {
    "import.meta.env.VITE_DEEPFIELD_STATIC": JSON.stringify("1"),
  },
  build: { outDir: "dist", emptyOutDir: true },
});

const dist = path.join(WEB, "dist");
await mkdir(dist, { recursive: true });
await writeFile(path.join(dist, ".nojekyll"), "");
await writeFile(path.join(dist, "graph.json"), canonicalJson(graph), "utf8");
process.stdout.write(`pages ${path.join(dist, "index.html")} base=${base}\n`);
