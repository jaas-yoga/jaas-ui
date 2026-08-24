"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Switch } from "@/components/ui/switch";

/** Simple light/dark toggle for unauthenticated pages (/login) — the
 * full light/dark/system/ocean/violet picker (theme-toggle.tsx,
 * theme-picker.tsx) is for signed-in users, ui-design.md §8.5.2. */
export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // See theme-toggle.tsx — next-themes' documented SSR-hydration guard.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 shadow-sm backdrop-blur-sm">
      <Sun className="size-3.5 text-muted-foreground" />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle dark mode"
      />
      <Moon className="size-3.5 text-muted-foreground" />
    </div>
  );
}
