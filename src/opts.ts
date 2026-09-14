import type { GenerateOpts } from "./generate.ts";

export function parseGenerateOpts(args: string[]): GenerateOpts {
  const onlyRaw = flag(args, "--only");
  const only = onlyRaw === undefined
    ? undefined
    : onlyRaw.split(",").map((part) => part.trim()).filter(Boolean);
  if (onlyRaw !== undefined && (!only || only.length === 0)) {
    throw new Error("generate --only requires at least one checkout path");
  }
  let base: string | undefined;
  const bases: Record<string, string> = {};
  for (const value of flags(args, "--base")) {
    const cut = value.indexOf("=");
    if (cut > 0) {
      bases[value.slice(0, cut)] = value.slice(cut + 1);
    } else {
      base = value;
    }
  }
  return {
    ...(only ? { only } : {}),
    ...(base ? { base } : {}),
    ...(Object.keys(bases).length ? { bases } : {}),
  };
}

export function flags(args: string[], name: string): string[] {
  const out: string[] = [];
  const prefix = `${name}=`;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === name) {
      const next = args[i + 1];
      if (next !== undefined) {
        out.push(next);
        i += 1;
      }
      continue;
    }
    if (arg?.startsWith(prefix)) {
      out.push(arg.slice(prefix.length));
    }
  }
  return out;
}

export function flag(args: string[], name: string): string | undefined {
  return flags(args, name)[0];
}
