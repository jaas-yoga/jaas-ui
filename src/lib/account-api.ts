import "server-only";

import { jaasFetch } from "./jaas-api";
import type { PatSummaryResponse } from "./jaas-api-types";

export async function listPats(): Promise<PatSummaryResponse[]> {
  return jaasFetch<PatSummaryResponse[]>("/api/v1/account/tokens");
}
