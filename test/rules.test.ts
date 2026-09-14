import assert from "node:assert/strict";
import { test } from "node:test";
import { ruleChip, ruleHint } from "../web/src/rules.ts";

test("rule chips are one-word labels with a hover hint", () => {
  assert.equal(ruleChip("R3_RETRY_IDEMPOTENCY"), "Retry");
  assert.equal(ruleChip("R10_PAYMENT_MONEY"), "Money");
  assert.equal(ruleChip("R2_CROSS_SERVICE"), "Boundary");
  assert.equal(ruleHint("R2_CROSS_SERVICE"), "Cross-service edge on behavioural code");
});
