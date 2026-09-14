import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

export async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await run(
    "git",
    ["-c", "user.name=eagle", "-c", "user.email=eagle@test", "-c", "protocol.file.allow=always", ...args],
    { cwd, encoding: "utf8" },
  );
  return stdout.trim();
}

export async function write(root: string, rel: string, body: string): Promise<void> {
  const abs = path.join(root, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body);
}

export async function initMain(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  await git(dir, ["init", "-b", "main"]);
}
