import type { ReactNode } from "react";

import { AccountNavTabs } from "@/components/account/account-nav-tabs";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="w-full space-y-6">
      <AccountNavTabs />
      {children}
    </div>
  );
}
