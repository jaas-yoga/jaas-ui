import type { LucideIcon } from "lucide-react";
import { FolderOpen, LayoutGrid, ShieldCheck } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/** ui-design.md §10.1 — global sidebar primary nav. My Skills/Public/Shared
 * with Me/My Tenant are all filter chips *inside* /skills (§10.2,
 * VISIBILITY_FILTERS) — the sidebar doesn't duplicate them as separate nav
 * links, it just gets you to the one search screen. Guardrails is the same
 * shape (Public/My Tenant filter chips inside /guardrails) — both act on
 * whichever tenant is active in the TenantSwitcher above, not a tenant id
 * in the URL, unlike Tenant Settings' own Members/Repositories. Drafts
 * gets its own section since it's not part of that search index
 * (ui-design.md §7 — drafts are explicitly unindexed scratch space). */
export const PRIMARY_NAV: NavItem[] = [
  { label: "Skills", href: "/skills", icon: LayoutGrid },
  { label: "Guardrails", href: "/guardrails", icon: ShieldCheck },
  { label: "Drafts", href: "/drafts", icon: FolderOpen },
];
