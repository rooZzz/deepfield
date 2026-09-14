import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { git, initMain } from "./git.ts";
import { seedCheckoutApi, seedCheckoutWeb, seedIdle, seedLedger, seedPayments } from "./seed-vertical.ts";

export const FIXTURE_BASE = "origin/main";

export type MetaFixture = {
  root: string;
  payments: string;
  checkout: string;
  idle: string;
};

export async function buildPaymentRetryFixture(): Promise<MetaFixture> {
  const base = await mkdtemp(path.join(tmpdir(), "deepfield-meta-"));
  const origins = path.join(base, "origins");
  const root = path.join(base, "meta");
  const paymentsOrigin = path.join(origins, "payments-api");
  const checkoutOrigin = path.join(origins, "checkout-web");
  const apiOrigin = path.join(origins, "checkout-api");
  const ledgerOrigin = path.join(origins, "ledger-svc");
  const idleOrigin = path.join(origins, "idle-service");
  await seedPayments(paymentsOrigin);
  await seedCheckoutWeb(checkoutOrigin);
  await seedCheckoutApi(apiOrigin);
  await seedLedger(ledgerOrigin);
  await seedIdle(idleOrigin);
  await initMain(root);
  await git(root, ["submodule", "add", paymentsOrigin, "payments-api"]);
  await git(root, ["submodule", "add", checkoutOrigin, "checkout-web"]);
  await git(root, ["submodule", "add", apiOrigin, "checkout-api"]);
  await git(root, ["submodule", "add", ledgerOrigin, "ledger-svc"]);
  await git(root, ["submodule", "add", idleOrigin, "idle-service"]);
  await git(root, ["commit", "-m", "pin mains"]);
  await git(root, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
  const payments = path.join(root, "payments-api");
  const checkout = path.join(root, "checkout-web");
  const idle = path.join(root, "idle-service");
  for (const repo of ["payments-api", "checkout-web", "checkout-api", "ledger-svc"]) {
    const abs = path.join(root, repo);
    await git(abs, ["checkout", "feat/retry"]);
    await git(abs, ["update-ref", "refs/remotes/origin/main", "main"]);
  }
  await git(idle, ["update-ref", "refs/remotes/origin/main", "main"]);
  return { root, payments, checkout, idle };
}
