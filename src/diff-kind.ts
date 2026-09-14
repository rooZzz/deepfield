import type { DiffKind } from "./types.ts";

const LARGE = 200_000;
const BIN = /\.(png|jpe?g|gif|webp|ico|pdf|woff2?|zip|gz|bin|wasm)$/i;

export function describeDiff(
  posix: string,
  hunk: string,
): { hunk?: string; noDiff?: DiffKind; bytes?: string } {
  if (BIN.test(posix) || hunk.includes("Binary files")) {
    return { noDiff: "binary", bytes: bytesLabel(Math.max(hunk.length, 1)) };
  }
  if (hunk.length > LARGE) {
    return { noDiff: "large", bytes: bytesLabel(hunk.length) };
  }
  if (!hunk) {
    return {};
  }
  return { hunk };
}

function bytesLabel(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)} MB`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)} kB`;
  }
  return `${n} B`;
}
