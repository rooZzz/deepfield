import assert from "node:assert/strict";
import { test } from "node:test";
import { parseGenerateOpts } from "../src/opts.ts";

test("parseGenerateOpts defaults to empty opts", () => {
  assert.deepEqual(parseGenerateOpts(["generate", "--root", "/tmp"]), {});
});

test("parseGenerateOpts reads --only and repeated --base", () => {
  assert.deepEqual(
    parseGenerateOpts([
      "generate",
      "--only",
      "payments-api, checkout-web",
      "--base",
      "develop",
      "--base",
      "payments-api=topic",
    ]),
    {
      only: ["payments-api", "checkout-web"],
      base: "develop",
      bases: { "payments-api": "topic" },
    },
  );
});

test("parseGenerateOpts rejects empty --only", () => {
  assert.throws(() => parseGenerateOpts(["generate", "--only", ""]), /requires at least one/);
});
