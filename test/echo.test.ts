import assert from "node:assert/strict";
import { test } from "node:test";
import { analogMatch, echoEdges, echoKey, tokensFromHunk } from "../src/echo.ts";
import type { FileNode } from "../src/types.ts";

function file(repo: string, path: string, hunk: string): FileNode {
  return {
    id: `file:${repo}:${path}`,
    kind: "file",
    repo,
    path,
    change: "modify",
    class: "behavioural",
    hunk,
  };
}

test("echoKey collapses header spellings", () => {
  assert.equal(echoKey("correlationId"), "correlationid");
  assert.equal(echoKey("correlation_id"), "correlationid");
  assert.equal(echoKey("X-Correlation-Id"), "correlationid");
  assert.equal(echoKey("id"), null);
});

test("tokensFromHunk reads added lines only", () => {
  const tokens = tokensFromHunk("@@\n+ headers.correlationId = id;\n context\n- old\n");
  assert.equal(tokens.some((item) => item.key === "correlationid"), true);
});

test("echo edges join services that share a header token", () => {
  const edges = echoEdges([
    file("api", "mw.ts", "@@\n+ set('X-Correlation-Id', id);\n"),
    file("web", "client.ts", "@@\n+ headers.correlationId = id;\n"),
  ]);
  assert.equal(edges.length, 1);
  assert.equal(edges[0]?.kind, "echo");
  assert.equal(edges[0]?.crossService, true);
  assert.equal(edges[0]?.token, "correlationId");
});

test("echo edges skip same-repo and generic words", () => {
  const same = echoEdges([
    file("api", "a.ts", "@@\n+ const correlationId = 1;\n"),
    file("api", "b.ts", "@@\n+ const correlationId = 2;\n"),
  ]);
  assert.equal(same.length, 0);
  const noise = echoEdges([
    file("api", "a.ts", "@@\n+ const undefined = x;\n+ toString();\n"),
    file("web", "b.ts", "@@\n+ const undefined = y;\n+ toString();\n"),
  ]);
  assert.equal(noise.length, 0);
});

test("echo edges are one per service pair", () => {
  const many = echoEdges([
    file("api", "a.ts", "@@\n+ const correlationId = 1;\n"),
    file("api", "b.ts", "@@\n+ const correlationId = 2;\n"),
    file("web", "c.ts", "@@\n+ const correlationId = 3;\n"),
    file("web", "d.ts", "@@\n+ const correlationId = 4;\n"),
  ]);
  assert.equal(many.length, 1);
  assert.equal(many[0]?.token, "correlationId");
  const tokens = echoEdges([
    file("api", "a.ts", "@@\n+ const correlationId = 1;\n+ function createSession(): void {}\n"),
    file("web", "b.ts", "@@\n+ const correlationId = 2;\n+ createSession();\n"),
  ]);
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0]?.token, "correlationId");
  const trio = echoEdges([
    file("api", "a.ts", "@@\n+ const correlationId = 1;\n"),
    file("web", "b.ts", "@@\n+ const correlationId = 2;\n"),
    file("pay", "c.ts", "@@\n+ const correlationId = 3;\n"),
  ]);
  assert.equal(trio.length, 3);
});

test("analog match is prefix identity, not a model", () => {
  assert.equal(analogMatch("corrId", "correlationId"), true);
  assert.equal(analogMatch("reqId", "requestId"), true);
  assert.equal(analogMatch("cid", "correlationId"), false);
  assert.equal(analogMatch("sessionId", "sessionKey"), false);
  const analog = echoEdges([
    file("api", "a.ts", "@@\n+ const corrId = 1;\n"),
    file("web", "b.ts", "@@\n+ const correlationId = 2;\n"),
  ]);
  assert.equal(analog.length, 1);
  assert.equal(analog[0]?.token, "correlationId");
  const request = echoEdges([
    file("api", "a.ts", "@@\n+ const reqId = 1;\n"),
    file("web", "b.ts", "@@\n+ const requestId = 2;\n"),
  ]);
  assert.equal(request.length, 1);
  assert.equal(request[0]?.token, "requestId");
  assert.equal(echoEdges([
    file("api", "a.ts", "@@\n+ const cid = 1;\n"),
    file("web", "b.ts", "@@\n+ const correlationId = 2;\n"),
  ]).length, 0);
  assert.equal(echoEdges([
    file("api", "a.ts", "@@\n+ const sessionId = 1;\n"),
    file("web", "b.ts", "@@\n+ const sessionKey = 2;\n"),
  ]).length, 0);
  assert.equal(echoEdges([
    file("api", "a.ts", "@@\n+ const userId = 1;\n"),
    file("web", "b.ts", "@@\n+ const userId = 2;\n"),
  ]).length, 0);
});

test("hard echo prefers quoted header sites over lex-smallest", () => {
  const edges = echoEdges([
    file("api", "a.ts", "@@\n+ const correlationId = 1;\n"),
    file("api", "headers.ts", "@@\n+ set('X-Correlation-Id', id);\n"),
    file("web", "client.ts", "@@\n+ headers.correlationId = id;\n"),
  ]);
  assert.equal(edges.length, 1);
  const ends = [edges[0]?.fromId, edges[0]?.toId];
  assert.equal(ends.some((id) => id?.includes("headers.ts")), true);
  assert.equal(ends.some((id) => id?.includes("a.ts")), false);
});

test("hard match wins over analog on the same service pair", () => {
  const edges = echoEdges([
    file("api", "a.ts", "@@\n+ const corrId = 1;\n+ const correlationId = 2;\n"),
    file("web", "b.ts", "@@\n+ const correlationId = 3;\n"),
  ]);
  assert.equal(edges.length, 1);
  assert.equal(edges[0]?.token, "correlationId");
});
