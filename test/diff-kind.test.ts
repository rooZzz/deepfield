import assert from "node:assert/strict";
import { test } from "node:test";
import { describeDiff } from "../src/diff-kind.ts";

test("binary, large, and ordinary diffs", () => {
  assert.equal(describeDiff("icon.png", "xx").noDiff, "binary");
  assert.equal(describeDiff("a.bin", "Binary files differ").noDiff, "binary");
  const large = describeDiff("a.ts", "x".repeat(200_001));
  assert.equal(large.noDiff, "large");
  assert.ok(large.bytes);
  assert.equal(describeDiff("a.ts", "").noDiff, undefined);
  assert.equal(describeDiff("a.ts", "@@\n+ok\n").hunk, "@@\n+ok\n");
});
