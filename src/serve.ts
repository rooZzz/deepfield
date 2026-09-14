import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { eagleEyePlugin } from "./vite-plugin.ts";

const WEB = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "web");

export async function startServer(opts: { root: string; port: number }): Promise<string> {
  process.env.EAGLE_EYE_ROOT = opts.root;
  const server = await createServer({
    root: WEB,
    configFile: false,
    server: {
      port: opts.port,
      host: "127.0.0.1",
      strictPort: true,
    },
    plugins: [eagleEyePlugin(opts.root)],
  });
  await server.listen();
  const urls = server.resolvedUrls?.local ?? [];
  if (!urls[0]) {
    throw new Error("Vite did not bind a local URL");
  }
  return urls[0];
}
