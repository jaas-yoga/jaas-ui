import type { ReactNode } from "react";

import { AccountNavTabs } from "@/components/account/account-nav-tabs";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full gap-8">
      <AccountNavTabs />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
