import "server-only";

import { jaasFetch } from "./jaas-api";
import type { GithubConnectionResponse, GithubOAuthAppResponse } from "./jaas-api-types";

export async function getGithubConnection(tenantId: string): Promise<GithubConnectionResponse> {
  return jaasFetch<GithubConnectionResponse>(
    `/api/v1/tenants/${encodeURIComponent(tenantId)}/github/connection`,
  );
}

export async function getGithubOAuthApp(tenantId: string): Promise<GithubOAuthAppResponse> {
  return jaasFetch<GithubOAuthAppResponse>(
    `/api/v1/tenants/${encodeURIComponent(tenantId)}/github/oauth-app`,
  );
}
