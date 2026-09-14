import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIRS = ["src", "web/src", "test", "e2e"];
const SOFT = 250;
const HARD = 280;

async function walk(dir: string): Promise<string[]> {
  const abs = path.join(ROOT, dir);
  let entries;
  try {
    entries = await readdir(abs, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(rel)));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".css")) {
      files.push(rel);
    }
  }
  return files;
}

const over: string[] = [];
for (const dir of DIRS) {
  for (const file of await walk(dir)) {
    const text = await readFile(path.join(ROOT, file), "utf8");
    const lines = text.split("\n").length;
    if (lines > SOFT) {
      process.stdout.write(`${file}: ${lines} (soft ${SOFT})\n`);
    }
    if (lines > HARD) {
      over.push(`${file}: ${lines}`);
    }
  }
}
if (over.length) {
  throw new Error(`files over ${HARD} lines:\n${over.join("\n")}`);
}
