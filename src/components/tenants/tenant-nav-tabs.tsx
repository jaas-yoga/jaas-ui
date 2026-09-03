import { SettingsNav } from "@/components/shell/settings-nav";

/** ui-design.md §9.14 — Members | Repositories, as the tenant's left-side
 * settings nav (Sharing will slot in here the same way once §10.6 is
 * built). Guardrails moved out to its own top-level sidebar item — it acts
 * on the active tenant like /skills and /drafts do, rather than needing a
 * tenant id in the URL. */
export function TenantNavTabs({ tenantId }: { tenantId: string }) {
  return (
    <SettingsNav
      items={[
        { label: "Members", href: `/tenants/${tenantId}/members` },
        { label: "Repositories", href: `/tenants/${tenantId}/repositories` },
      ]}
    />
  );
}
