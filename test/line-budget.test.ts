import { test } from "node:test";

test("source files stay near the 250-line soft cap", async () => {
  await import("./line-budget.ts");
});
