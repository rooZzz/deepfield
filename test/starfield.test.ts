import assert from "node:assert/strict";
import { test } from "node:test";
import { mulberry32, poisson, starLayers } from "../web/src/starfield.ts";

test("star positions are uncorrelated with index", () => {
  const pts = poisson(160, 0.03, mulberry32(0x51ed));
  const n = pts.length;
  const meanI = (n - 1) / 2;
  const meanX = pts.reduce((s, p) => s + p.x, 0) / n;
  let num = 0;
  let denI = 0;
  let denX = 0;
  pts.forEach((pt, i) => {
    const di = i - meanI;
    const dx = pt.x - meanX;
    num += di * dx;
    denI += di * di;
    denX += dx * dx;
  });
  const corr = num / Math.sqrt(denI * denX);
  assert.ok(Math.abs(corr) < 0.2, `index/x correlation ${corr}`);
});

test("poisson samples keep a minimum gap on the torus", () => {
  const minDist = 0.05;
  const pts = poisson(80, minDist, mulberry32(7));
  const min2 = minDist * minDist;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = torus((pts[i]?.x ?? 0) - (pts[j]?.x ?? 0));
      const dy = torus((pts[i]?.y ?? 0) - (pts[j]?.y ?? 0));
      assert.ok(dx * dx + dy * dy + 1e-12 >= min2);
    }
  }
});

test("layers are far dust, then fewer brighter stars", () => {
  const layers = starLayers();
  assert.equal(layers.length, 3);
  assert.ok((layers[0]?.stars.length ?? 0) > (layers[1]?.stars.length ?? 0));
  assert.ok((layers[1]?.stars.length ?? 0) > (layers[2]?.stars.length ?? 0));
  const farR = mean(layers[0]?.stars.map((s) => s.r) ?? []);
  const nearR = mean(layers[2]?.stars.map((s) => s.r) ?? []);
  assert.ok(nearR > farR);
});

function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function torus(d: number): number {
  return ((d % 1) + 1.5) % 1 - 0.5;
}
