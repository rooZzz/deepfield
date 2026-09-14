import { readFile, writeFile } from "node:fs/promises";
import type { Plugin } from "vite";
import { graphPath, inboxPath, reviewPath } from "./session.ts";

export function eagleEyePlugin(root: string): Plugin {
  return {
    name: "eagle-eye-session",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        try {
          if (await serveFile(req, res, url, "/.eagle-eye/graph.json", graphPath(root), "GET")) {
            return;
          }
          if (await serveFile(req, res, url, "/.eagle-eye/inbox.json", inboxPath(root), req.method ?? "GET")) {
            return;
          }
          if (await serveFile(req, res, url, "/.eagle-eye/review.json", reviewPath(root), req.method ?? "GET")) {
            return;
          }
        } catch (error) {
          res.statusCode = 500;
          res.end(error instanceof Error ? error.message : "session error");
          return;
        }
        next();
      });
    },
  };
}

async function serveFile(
  req: { method?: string },
  res: { setHeader: (k: string, v: string) => void; end: (b?: string) => void; statusCode: number },
  url: string,
  route: string,
  file: string,
  method: string,
): Promise<boolean> {
  if (url !== route) {
    return false;
  }
  if (method === "GET") {
    try {
      const body = await readFile(file, "utf8");
      res.setHeader("content-type", "application/json");
      res.end(body);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT" && route !== "/.eagle-eye/graph.json") {
        res.setHeader("content-type", "application/json");
        res.end(route.includes("review") ? '{"version":1,"graphId":"","reviewed":[]}' : '{"version":1,"items":[]}');
        return true;
      }
      throw error;
    }
    return true;
  }
  if (method === "PUT" || method === "POST") {
    const body = await readStream(req as NodeJS.ReadableStream);
    await writeFile(file, body);
    res.setHeader("content-type", "application/json");
    res.end(body);
    return true;
  }
  return false;
}

function readStream(req: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
