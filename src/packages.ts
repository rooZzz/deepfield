import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Checkout } from "./git/layout.ts";

export type Pkg = { repo: string; name: string; main?: string };

export async function loadPackages(root: string, checkouts: Checkout[]): Promise<Map<string, Pkg>> {
  const map = new Map<string, Pkg>();
  for (const checkout of checkouts) {
    const pkgPath = path.join(checkout.abs, "package.json");
    try {
      const raw = JSON.parse(await readFile(pkgPath, "utf8")) as {
        name?: string;
        main?: string;
      };
      if (!raw.name) {
        continue;
      }
      map.set(raw.name, {
        repo: checkout.repo,
        name: raw.name,
        main: raw.main,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new Error(`Failed to read ${pkgPath}`, { cause: error });
      }
    }
  }
  return map;
}
