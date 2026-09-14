import { mkdir } from "node:fs/promises";
import { generateGraph } from "./generate.ts";
import { flag, parseGenerateOpts } from "./opts.ts";
import { inboxPath, readInbox, sessionDir, writeGraph, writeInbox } from "./session.ts";
import { startServer } from "./serve.ts";
import { watchInbox } from "./watch.ts";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0] ?? "help";
  const root = flag(args, "--root") ?? process.cwd();
  const port = Number(flag(args, "--port") ?? "4173");
  const opts = parseGenerateOpts(args);
  if (cmd === "generate") {
    const graph = await generateGraph(root, opts);
    const dest = await writeGraph(root, graph);
    await ensureInbox(root);
    process.stdout.write(`${dest}\n`);
    return;
  }
  if (cmd === "serve") {
    const graph = await generateGraph(root, opts);
    await writeGraph(root, graph);
    await ensureInbox(root);
    const url = await startServer({ root, port });
    process.stdout.write(`${url}\n`);
    return;
  }
  if (cmd === "watch") {
    await ensureInbox(root);
    process.stdout.write(`watching ${inboxPath(root)}\n`);
    await watchInbox(root);
    process.stdout.write("inbox changed\n");
    return;
  }
  process.stderr.write(
    "usage: cli.ts generate|serve|watch --root <dir> [--port n] [--only repo,repo] [--base ref] [--base repo=ref]\n",
  );
  process.exitCode = 1;
}

async function ensureInbox(root: string): Promise<void> {
  await mkdir(sessionDir(root), { recursive: true });
  const inbox = await readInbox(root);
  if (inbox.items.length === 0) {
    await writeInbox(root, { version: 1, items: [] });
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  process.exitCode = 1;
});
