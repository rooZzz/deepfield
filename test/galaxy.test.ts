import assert from "node:assert/strict";
import { test } from "node:test";
import { galaxyDisk, seedOf } from "../web/src/galaxy.ts";

test("same service id yields the same galaxy", () => {
  const a = galaxyDisk(seedOf("service:checkout-api"));
  const b = galaxyDisk(seedOf("service:checkout-api"));
  assert.equal(a.length, b.length);
  assert.deepEqual(a[0], b[0]);
  assert.notDeepEqual(a[0], galaxyDisk(seedOf("service:ledger-svc"))[0]);
});

test("galaxy stars sit in a disk, not a lattice", () => {
  const stars = galaxyDisk(0x51ed);
  assert.ok(stars.length >= 250);
  const n = stars.length;
  const meanI = (n - 1) / 2;
  const meanX = stars.reduce((s, p) => s + p.x, 0) / n;
  let num = 0;
  let denI = 0;
  let denX = 0;
  stars.forEach((star, i) => {
    const di = i - meanI;
    const dx = star.x - meanX;
    num += di * dx;
    denI += di * di;
    denX += dx * dx;
  });
  const corr = num / Math.sqrt(denI * denX);
  assert.ok(Math.abs(corr) < 0.25, `index/x correlation ${corr}`);
  const inside = stars.filter((star) => Math.hypot(star.x, star.y) < 0.55).length;
  assert.ok(inside / n > 0.92);
});
