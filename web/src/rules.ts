export type RuleInfo = {
  chip: string;
  title: string;
};

const RULES: Record<string, RuleInfo> = {
  R1_CONTRACT: { chip: "Contract", title: "Contract file in the change" },
  R2_CROSS_SERVICE: { chip: "Boundary", title: "Cross-service edge on behavioural code" },
  R3_RETRY_IDEMPOTENCY: { chip: "Retry", title: "Retry / idempotency" },
  R4_AUTH_SECURITY: { chip: "Auth", title: "Auth / secrets" },
  R5_DATA_LOSS: { chip: "Migrate", title: "Destructive data change" },
  R6_ERROR_PROPAGATION: { chip: "Errors", title: "Error propagation" },
  R7_TEST_REMOVED: { chip: "Tests", title: "Test coverage removed" },
  R8_SHARED_CONFIG: { chip: "Config", title: "Shared config / flags" },
  R9_BEHAVIOUR_MOVED: { chip: "Moved", title: "Behaviour moved across services" },
  R10_PAYMENT_MONEY: { chip: "Money", title: "Payment / money path" },
};

export function ruleChip(ruleId: string): string {
  return RULES[ruleId]?.chip ?? labelFromId(ruleId);
}

export function ruleTitle(ruleId: string): string {
  return RULES[ruleId]?.title ?? ruleId;
}

export function ruleHint(ruleId: string): string {
  return ruleTitle(ruleId);
}

export function riskChips(ruleIds: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ruleIds) {
    const chip = ruleChip(id);
    if (!seen.has(chip)) {
      seen.add(chip);
      out.push(id);
    }
  }
  return out;
}

function labelFromId(ruleId: string): string {
  const parts = ruleId.split("_");
  const stem = /^R\d+$/i.test(parts[0] ?? "") ? parts.slice(1) : parts;
  const word = stem[0];
  if (!word) {
    return ruleId;
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}
