"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type SettingsNavItem = { label: string; href: string };

/** Shared left-side secondary nav for a settings-style section (Tenant
 * Members/Guardrails/Repositories, Account Profile/Appearance/Tokens) —
 * real routes, not a client-side panel switch, so plain Links + usePathname
 * rather than the Tabs primitive. A vertical list reads better than a top
 * tab row once a section's content gets long (e.g. the Guardrails page's
 * scrolling rule list) and matches how the primary sidebar already works. */
export function SettingsNav({ items }: { items: SettingsNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="w-44 shrink-0 space-y-0.5">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
