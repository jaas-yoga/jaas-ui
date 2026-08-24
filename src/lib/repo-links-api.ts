import "server-only";

import { jaasFetch } from "./jaas-api";
import type { RepoLinkResponse } from "./jaas-api-types";

export async function listRepoLinks(tenantId: string): Promise<RepoLinkResponse[]> {
  return jaasFetch<RepoLinkResponse[]>(`/api/v1/tenants/${encodeURIComponent(tenantId)}/repo-links`);
}
