import "server-only";

import { jaasFetch } from "./jaas-api";
import type {
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
