import "server-only";

import { jaasFetch } from "./jaas-api";
import type {
  CustomGuardrailRuleDraftResponse,
  CustomGuardrailRuleResponse,
  GuardrailDefinitionResponse,
  TenantGuardrailPolicyResponse,
} from "./jaas-api-types";

export async function listGuardrailCatalog(): Promise<GuardrailDefinitionResponse[]> {
  return jaasFetch<GuardrailDefinitionResponse[]>("/api/v1/guardrails");
}

export async function getTenantGuardrailPolicy(
  tenantId: string,
): Promise<TenantGuardrailPolicyResponse> {
  return jaasFetch<TenantGuardrailPolicyResponse>(
    `/api/v1/tenants/${encodeURIComponent(tenantId)}/guardrail-policy`,
  );
}

export async function listCustomGuardrailRules(
  tenantId: string,
): Promise<CustomGuardrailRuleResponse[]> {
  return jaasFetch<CustomGuardrailRuleResponse[]>(
    `/api/v1/tenants/${encodeURIComponent(tenantId)}/custom-guardrails`,
  );
}

export async function getCustomGuardrailRuleDraft(
  tenantId: string,
  draftId: string,
): Promise<CustomGuardrailRuleDraftResponse> {
  return jaasFetch<CustomGuardrailRuleDraftResponse>(
    `/api/v1/tenants/${encodeURIComponent(tenantId)}/custom-guardrails/drafts/${encodeURIComponent(draftId)}`,
  );
}
