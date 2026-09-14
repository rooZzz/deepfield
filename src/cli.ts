import { mkdir } from "node:fs/promises";
import { generateGraph } from "./generate.ts";
import { inboxPath, readInbox, sessionDir, writeGraph, writeInbox } from "./session.ts";
import { startServer } from "./serve.ts";
import { watchInbox } from "./watch.ts";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0] ?? "help";
  const root = flag(args, "--root") ?? process.cwd();
  const port = Number(flag(args, "--port") ?? "4173");
  if (cmd === "generate") {
    const graph = await generateGraph(root);
    const dest = await writeGraph(root, graph);
    await ensureInbox(root);
    process.stdout.write(`${dest}\n`);
    return;
  }
  if (cmd === "serve") {
    const graph = await generateGraph(root);
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
  process.stderr.write("usage: cli.ts generate|serve|watch --root <dir> [--port n]\n");
  process.exitCode = 1;
}

function flag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index >= 0) {
    return args[index + 1];
  }
  const prefix = `${name}=`;
  const hit = args.find((arg) => arg.startsWith(prefix));
  return hit?.slice(prefix.length);
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
