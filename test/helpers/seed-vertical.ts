import { git, initMain, write } from "./git.ts";

type Tree = Record<string, string>;

export async function seedCheckoutWeb(dir: string): Promise<void> {
  await origin(dir, { name: "@acme/checkout-web" }, {
    "app/checkout/client/pay.ts": "export async function pay(): Promise<void> {}\n",
    "app/checkout/client/types.ts": "export type Cart = { total: number };\n",
    "app/checkout/form/PayButton.ts": "export function PayButton(): void {}\n",
    "app/checkout/form/key.ts": "export function makeKey(): string { return ''; }\n",
  }, {
    "app/checkout/client/pay.ts": `import { createSession } from "@acme/checkout-api";
import type { Cart } from "./types.ts";
// contract: openapi.yaml
export async function pay(cart: Cart, key: string, correlationId: string): Promise<void> {
  return createSession({ cart, currency: cart.currency, idempotencyKey: key, correlationId });
}
`,
    "app/checkout/client/types.ts": "export type Cart = { total: number; currency: string };\nconst cartFields = ['currency'];\n",
    "app/checkout/form/key.ts": "export function makeKey(): string {\n  return `k-${Date.now()}`;\n}\n",
    "app/checkout/form/PayButton.ts": `import { makeKey } from "./key.ts";
export function PayButton(): string {
  return makeKey();
}
`,
    "app/checkout/client/pay.e2e.ts": "export async function testPay(): Promise<void> {\n  await payStub();\n}\nfunction payStub(): Promise<void> { return Promise.resolve(); }\n",
  });
}

export async function seedCheckoutApi(dir: string): Promise<void> {
  await origin(dir, { name: "@acme/checkout-api", main: "src/checkout/session/create.ts" }, {
    "src/checkout/retry/policy.ts": "export const retryPolicy = { maxAttempts: 1 };\n",
    "src/checkout/retry/backoff.ts": "export function delay(): Promise<void> { return Promise.resolve(); }\n",
    "src/checkout/session/create.ts": "export async function createSession(): Promise<void> {}\n",
    "src/checkout/session/dto.ts": "export type SessionDto = { currency: string };\n",
    "src/checkout/http/client.ts": "export function withKey(): void {}\n",
    "src/checkout/http/headers.ts": "export const IDEMPOTENCY = 'idempotency-key';\n",
    "contracts/openapi.yaml": "openapi: 3.0.0\ninfo:\n  title: checkout\npaths: {}\n",
  }, {
    "src/checkout/retry/backoff.ts": `export function delay(attempt: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 10 * attempt));
}
`,
    "src/checkout/retry/policy.ts": `import { delay } from "./backoff.ts";
export const retryPolicy = { maxAttempts: 3, methods: ["GET", "HEAD", "POST"] };
export async function retryPayment(send: () => Promise<void>): Promise<void> {
  for (let attempt = 0; attempt < retryPolicy.maxAttempts; attempt++) {
    try {
      await send();
      return;
    } catch (error) {
      await delay(attempt);
      if (attempt === retryPolicy.maxAttempts - 1) {
        throw error;
      }
    }
  }
}
`,
    "src/checkout/session/dto.ts": "export type SessionDto = { cart: { total: number }; currency: string; idempotencyKey: string; correlationId: string };\nconst sessionFields = ['currency', 'idempotencyKey', 'correlationId'];\n",
    "src/checkout/session/create.ts": `import type { SessionDto } from "./dto.ts";
import { createIntent } from "@acme/payments-api";
export async function createSession(body: SessionDto): Promise<void> {
  await createIntent({ amount: body.cart.total, currency: body.currency, correlationId: body.correlationId });
}
`,
    "src/checkout/http/headers.ts": `export const IDEMPOTENCY = "idempotency-key";
export const CORRELATION = "X-Correlation-Id";
export function headerName(): string {
  return IDEMPOTENCY;
}
export function correlationHeader(): string {
  return CORRELATION;
}
`,
    "src/checkout/http/client.ts": `import { IDEMPOTENCY, CORRELATION } from "./headers.ts";
export function withKey(headers: Record<string, string>, key: string, correlationId: string): Record<string, string> {
  return { ...headers, [IDEMPOTENCY]: key, [CORRELATION]: correlationId };
}
`,
    "contracts/openapi.yaml": "openapi: 3.0.0\ninfo:\n  title: checkout\n  version: \"2.0.0\"\npaths:\n  /session:\n    post:\n      summary: create with idempotencyKey\n",
  });
}

export async function seedPayments(dir: string): Promise<void> {
  await origin(dir, { name: "@acme/payments-api", main: "src/payments/intent/create.ts" }, {
    "src/payments/intent/create.ts": "export async function createIntent(): Promise<void> {}\n",
    "src/payments/intent/dto.ts": "export type IntentDto = { amount: number };\n",
    "src/payments/webhook/handler.ts": "export async function handleWebhook(): Promise<void> {}\n",
    "src/payments/webhook/verify.ts": "export function verify(): boolean { return true; }\n",
  }, {
    "src/payments/intent/dto.ts": "export type IntentDto = { amount: number; currency: string; correlationId: string };\nconst intentFields = ['amount', 'currency', 'correlationId'];\n",
    "src/payments/intent/create.ts": `import type { IntentDto } from "./dto.ts";
import { writeEntry } from "@acme/ledger-svc";
export async function createIntent(input: IntentDto): Promise<void> {
  const amount = input.amount;
  const currency = input.currency;
  await writeEntry({ amount, currency, correlationId: input.correlationId });
}
`,
    "src/payments/webhook/verify.ts": "export function verify(raw: string): { ok: boolean } {\n  return { ok: raw.length > 0 };\n}\n",
    "src/payments/webhook/handler.ts": `import { verify } from "./verify.ts";
export async function handleWebhook(raw: string, headers: Record<string, string>): Promise<void> {
  const correlationId = headers["X-Correlation-Id"];
  const event = verify(raw);
  if (!event.ok || !correlationId) {
    throw new Error("webhook");
  }
}
`,
    "db/migrations/0042_drop_idempotency_keys.sql": "DROP TABLE IF EXISTS idempotency_keys CASCADE;\n",
  });
}

export async function seedLedger(dir: string): Promise<void> {
  await origin(dir, { name: "@acme/ledger-svc", main: "src/ledger/entries/write.ts" }, {
    "src/ledger/entries/write.ts": "export async function writeEntry(): Promise<void> {}\n",
    "src/ledger/entries/schema.ts": "export type Entry = { amount: number };\n",
    "src/ledger/balance/read.ts": "export function readBalance(): number { return 0; }\n",
    "src/ledger/balance/format.ts": "export function formatMoney(n: number): string { return String(n); }\n",
    "src/ledger/balance/read.test.ts": "export function testRead(): void {}\n",
  }, {
    "src/ledger/entries/schema.ts": "export type Entry = { amount: number; currency: string; source?: string; correlationId?: string };\nconst entryFields = ['amount', 'currency', 'source', 'correlationId'];\n",
    "src/ledger/entries/write.ts": `import type { Entry } from "./schema.ts";
export async function writeEntry(entry: Entry): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.insert(entry);
  });
}
const db = {
  transaction: async (fn: (tx: { insert: (row: Entry) => Promise<void> }) => Promise<void>) =>
    fn({ insert: async () => undefined }),
};
`,
    "src/ledger/balance/format.ts": "export function formatMoney(amount: number, currency: string): string {\n  return `${currency} ${amount}`;\n}\n",
    "src/ledger/balance/read.ts": `import { formatMoney } from "./format.ts";
export function readBalance(amount: number, currency: string): string {
  return formatMoney(amount, currency);
}
`,
  }, ["src/ledger/balance/read.test.ts"]);
}

export async function seedIdle(dir: string): Promise<void> {
  await initMain(dir);
  await write(dir, "src/ok.ts", "export const idle = true;\n");
  await git(dir, ["add", "."]);
  await git(dir, ["commit", "-m", "main"]);
}

async function origin(dir: string, pkg: { name: string; main?: string }, base: Tree, feat: Tree, drop: string[] = []): Promise<void> {
  await initMain(dir);
  await write(dir, "package.json", `${JSON.stringify(pkg, null, 2)}\n`);
  for (const [rel, body] of Object.entries(base)) {
    await write(dir, rel, body);
  }
  await git(dir, ["add", "."]);
  await git(dir, ["commit", "-m", "main"]);
  await git(dir, ["checkout", "-b", "feat/retry"]);
  for (const [rel, body] of Object.entries(feat)) {
    await write(dir, rel, body);
  }
  for (const rel of drop) {
    await git(dir, ["rm", rel]);
  }
  await git(dir, ["add", "-A"]);
  await git(dir, ["commit", "-m", "feat"]);
  await git(dir, ["checkout", "main"]);
}
