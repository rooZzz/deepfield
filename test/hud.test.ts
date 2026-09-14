import assert from "node:assert/strict";
import { test } from "node:test";
import { fileLabelAnchor } from "../web/src/graph-hud.ts";

test("file names sit outside the planet, away from the sun", () => {
  assert.deepEqual(fileLabelAnchor({ x: 0, y: 0 }, { x: 0, y: 10 }, 4), { x: 0, y: 24 });
  assert.deepEqual(fileLabelAnchor({ x: 0, y: 0 }, { x: 20, y: 0 }, 5), { x: 35, y: 0 });
});
