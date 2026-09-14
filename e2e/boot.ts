import { writeFile } from "node:fs/promises";
import path from "node:path";
import { generateGraph } from "../src/generate.ts";
import { startServer } from "../src/serve.ts";
import { writeGraph, writeInbox } from "../src/session.ts";
import { buildPaymentRetryFixture } from "../test/helpers/meta-fixture.ts";

const fixture = await buildPaymentRetryFixture();
const graph = await generateGraph(fixture.root);
await writeGraph(fixture.root, graph);
await writeInbox(fixture.root, { version: 1, items: [] });
await writeFile(path.join(fixture.root, ".eagle-eye", "root.txt"), fixture.root);
const url = await startServer({ root: fixture.root, port: 4173 });
process.stdout.write(`${url} root=${fixture.root}\n`);
