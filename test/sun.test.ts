import assert from "node:assert/strict";
import { test } from "node:test";
import { planetLook, sunLook } from "../web/src/sun.ts";

test("the same cluster title yields the same sun", () => {
  const a = sunLook("contracts");
  const b = sunLook("contracts");
  assert.deepEqual(a, b);
  assert.notDeepEqual(sunLook("checkout/http"), a);
});

test("suns are not a rust-red risk wash", () => {
  const labels = ["contracts", "checkout/http", "ledger/balance", "payments/webhook", "db/migrations"];
  for (const label of labels) {
    const sun = sunLook(label);
    assert.notEqual(sun.rim.toLowerCase(), "#c45c3e");
    assert.notEqual(sun.mid.toLowerCase(), "#e08962");
    assert.ok(sun.scale >= 0.9 && sun.scale <= 1.2);
    assert.ok(sun.spots.length >= 7);
  }
});

test("planets sit on a hashed orbit around the sun", () => {
  const a = planetLook("src/pay.ts", 0, 3, 10, 1.2, false);
  const b = planetLook("src/pay.ts", 0, 3, 10, 1.2, false);
  assert.deepEqual(a, b);
  const other = planetLook("src/dto.ts", 1, 3, 10, 1.2, false);
  assert.notDeepEqual(other, a);
  assert.ok(Math.hypot(a.x, a.y) > 10);
  const added = planetLook("src/pay.ts", 0, 3, 10, 1.2, true);
  assert.notEqual(added.fill, a.fill);
});
