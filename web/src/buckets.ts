import type { FileClass, FileNode } from "../../src/types.ts";

export type BucketId = "behavioural" | "tests" | "boilerplate" | "docs" | "generated";

export const BUCKETS: Array<{ id: BucketId; label: string; hint: string; classes: FileClass[] }> = [
  { id: "behavioural", label: "behavioural", hint: "logic changes", classes: ["behavioural"] },
  { id: "tests", label: "tests", hint: "test files", classes: ["mechanical.test"] },
  { id: "boilerplate", label: "boilerplate", hint: "DTOs, types, imports", classes: ["mechanical.dto", "noise.import", "noise.rename"] },
  { id: "docs", label: "docs", hint: "markdown", classes: ["noise.docs"] },
  {
    id: "generated",
    label: "generated",
    hint: "codegen, locks, formatting",
    classes: ["noise.generated", "noise.lock", "noise.format", "noise.pin", "noise.deps", "noise.fixture"],
  },
];

const CLASS_BUCKET = new Map<FileClass, BucketId>();
for (const bucket of BUCKETS) {
  for (const cls of bucket.classes) {
    CLASS_BUCKET.set(cls, bucket.id);
  }
}

export function bucketOf(file: FileNode): BucketId {
  return CLASS_BUCKET.get(file.class) ?? "boilerplate";
}

export function allHidden(): BucketId[] {
  return ["tests", "boilerplate", "docs", "generated"];
}
