import { createHash } from "node:crypto";

export function hash12(payload: string): string {
  return createHash("sha256").update(payload).digest("hex").slice(0, 12);
}

export function sortById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function sortStrings(items: string[]): string[] {
  return [...items].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export function canonicalJson(value: unknown): string {
  return `${stable(value)}\n`;
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stable).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
}
