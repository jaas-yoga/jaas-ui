import type { SearchResultItem } from "./jaas-api-types";

/** ui-design.md §10.2 filter chips. */
export type VisibilityFilter = "all" | "public" | "mine" | "tenant" | "shared-with-me";

export const VISIBILITY_FILTERS: { value: VisibilityFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "public", label: "Public" },
  { value: "mine", label: "My Skills" },
  { value: "shared-with-me", label: "Shared with me" },
  { value: "tenant", label: "My Tenant" },
];

/**
 * The backend's visibility rule (design.md §7.2 item 4) tells us an item IS
 * visible, never *why* — there's no "reason" field in SearchResultItem.
 *
 * "shared-with-me" is NOT handled here — IMPLEMENTATION_PLAN.md Phase 3.4
 * replaced the old client-side inference (an already-visible private item
 * neither owned by me nor my tenant must have reached me via a grant) with
 * a real fetch against GET /shares/received, which the search endpoint
 * has no equivalent of (grant metadata — who shared it, when, what
 * permission — simply isn't on SearchResultItem). See
 * src/app/(app)/skills/page.tsx's branch on activeFilter for where that
 * now lives. Kept returning false here (never true) only so this stays a
 * total, exhaustively-checked function if it's ever called with that
 * filter value by mistake.
 */
export function matchesVisibilityFilter(
  item: SearchResultItem,
  filter: VisibilityFilter,
  caller: { userId?: string; tenantId?: string },
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "public":
      return item.visibility === "public";
    case "mine":
      return item.ownerUser === caller.userId;
    case "tenant":
      return item.ownerTenant === caller.tenantId;
    case "shared-with-me":
      return false;
  }
}
