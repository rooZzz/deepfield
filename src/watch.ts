import { mkdir, writeFile } from "node:fs/promises";
import { watch as fsWatch } from "node:fs";
import { inboxPath, readInbox, sessionDir, writeInbox } from "./session.ts";

export async function watchInbox(root: string): Promise<void> {
  await mkdir(sessionDir(root), { recursive: true });
  const current = await readInbox(root);
  await writeInbox(root, current);
  const target = inboxPath(root);
  const before = await stamp(target);
  await new Promise<void>((resolve, reject) => {
    const watcher = fsWatch(target, () => {
      stamp(target)
        .then((after) => {
          if (after !== before) {
            watcher.close();
            resolve();
          }
        })
        .catch((error) => {
          watcher.close();
          reject(error);
        });
    });
    watcher.on("error", (error) => {
      reject(new Error(`Failed to watch ${target}`, { cause: error }));
    });
  });
}

async function stamp(file: string): Promise<string> {
  const { readFile } = await import("node:fs/promises");
  return readFile(file, "utf8");
}
