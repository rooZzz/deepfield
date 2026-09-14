import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export async function git(cwd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await run("git", ["-c", "core.quotepath=false", ...args], {
      cwd,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
    return stdout.replace(/\n$/, "");
  } catch (error) {
    throw new Error(`git ${args.join(" ")} failed in ${cwd}`, { cause: error });
  }
}

export async function gitOk(cwd: string, args: string[]): Promise<string | null> {
  try {
    return await git(cwd, args);
  } catch {
    return null;
  }
}
