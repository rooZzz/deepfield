import assert from "node:assert/strict";
import { test } from "node:test";
import { INS_MIN, insDefault, insMax } from "../web/src/pane.ts";

test("review pane max keeps a 720 floor on laptops and opens up on a wide display", () => {
  assert.equal(insMax(1280, 250), 720);
  assert.equal(insMax(1440, 250), 720);
  assert.ok(insMax(1920, 250) > 720);
  assert.ok(insMax(3440, 250) > 2000);
  assert.ok(insMax(3440, 250) < 3440 - 250);
});

test("review pane default stays 480 on a laptop and grows on a super-wide", () => {
  assert.equal(insDefault(1280, 250), 480);
  assert.ok(insDefault(1920, 250) >= 480);
  assert.ok(insDefault(3440, 250) > 800);
  assert.ok(insDefault(3440, 250) <= insMax(3440, 250));
  assert.ok(INS_MIN <= 480);
});
