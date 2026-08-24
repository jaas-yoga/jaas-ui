import "server-only";

import { jaasFetch } from "./jaas-api";
import type { MemberResponse } from "./jaas-api-types";

export async function listMembers(tenantId: string): Promise<MemberResponse[]> {
  return jaasFetch<MemberResponse[]>(`/api/v1/tenants/${encodeURIComponent(tenantId)}/members`);
}
