import { SettingsNav } from "@/components/shell/settings-nav";

/** Mirrors TenantNavTabs — Profile/Appearance/Tokens as one Settings area's
 * left-side nav, not three separate top-level destinations. */
export function AccountNavTabs() {
  return (
    <SettingsNav
      items={[
        { label: "Profile", href: "/account" },
        { label: "Appearance", href: "/account/appearance" },
        { label: "Tokens", href: "/account/tokens" },
      ]}
    />
  );
}
