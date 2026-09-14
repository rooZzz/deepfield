import assert from "node:assert/strict";
import { test } from "node:test";
import { excerptRange, lineKind, lineSign, sourceOfLine } from "../web/src/hunk.ts";
import { langFromPath } from "../web/src/lang.ts";

test("langFromPath maps extensions and dockerfile names", () => {
  assert.equal(langFromPath("src/a.ts"), "typescript");
  assert.equal(langFromPath("web/App.tsx"), "tsx");
  assert.equal(langFromPath("pkg/foo.go"), "go");
  assert.equal(langFromPath("Dockerfile"), "docker");
  assert.equal(langFromPath("notes.txt"), "text");
});

test("hunk lines strip the marker for highlighting and keep git headers as meta", () => {
  assert.equal(lineKind("@@ -1,2 +1,3 @@"), "meta");
  assert.equal(lineKind("diff --git a/a.ts b/a.ts"), "meta");
  assert.equal(lineKind("--- a/a.ts"), "meta");
  assert.equal(lineKind("+++ b/a.ts"), "meta");
  assert.equal(lineKind("+const x = 1"), "add");
  assert.equal(sourceOfLine("+const x = 1"), "const x = 1");
  assert.equal(lineSign("+const x = 1"), "+");
  assert.equal(sourceOfLine(" context"), "context");
  assert.deepEqual(excerptRange(20, 8, 10, 2), { start: 6, end: 12 });
  assert.deepEqual(excerptRange(5, 1, 24, 0), { start: 1, end: 5 });
});
