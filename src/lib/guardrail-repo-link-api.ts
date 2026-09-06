import "server-only";

import { jaasFetch } from "./jaas-api";
import type { GuardrailRuleRepoLinkResponse } from "./jaas-api-types";

export async function getGuardrailRuleRepoLink(
  tenantId: string,
): Promise<GuardrailRuleRepoLinkResponse | null> {
  return jaasFetch<GuardrailRuleRepoLinkResponse | null>(
    `/api/v1/tenants/${encodeURIComponent(tenantId)}/custom-guardrails/repo-link`,
  );
}
