import type { LucideIcon } from "lucide-react";
import { FolderOpen, LayoutGrid } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/** ui-design.md §10.1 — global sidebar primary nav. My Skills/Public/Shared
 * with Me/My Tenant are all filter chips *inside* /skills (§10.2,
 * VISIBILITY_FILTERS) — the sidebar doesn't duplicate them as separate nav
 * links, it just gets you to the one search screen. Drafts gets its own
 * section since it's not part of that search index (ui-design.md §7 —
 * drafts are explicitly unindexed scratch space). */
export const PRIMARY_NAV: NavItem[] = [
  { label: "Skills", href: "/skills", icon: LayoutGrid },
  { label: "Drafts", href: "/drafts", icon: FolderOpen },
];
