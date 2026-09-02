"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, type FormEvent } from "react";

import { AccountMenu, type AccountUser } from "@/components/shell/account-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Input } from "@/components/ui/input";

/** The single, global search bar — there is no second, page-level search
 * form on /skills anymore. ⌘K/Ctrl+K from anywhere focuses it. On /skills
 * it's a live-bound control (prefilled from the current ?query=, and it
 * preserves the current visibility/category filters on submit); anywhere
 * else it just navigates to /skills with the typed query. Uncontrolled
 * (defaultValue + a `key` derived from the URL) rather than a
 * value/onChange pair kept in sync via effect — that would fight the
 * user's own typing every time searchParams re-renders. */
export function TopBar({ user }: { user?: AccountUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const onSkills = pathname === "/skills";
  const currentQuery = onSkills ? (searchParams.get("query") ?? "") : "";

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = (inputRef.current?.value ?? "").trim();
    const qs = new URLSearchParams();
    if (trimmed) qs.set("query", trimmed);
    if (onSkills) {
      const visibility = searchParams.get("visibility");
      const category = searchParams.get("category");
      if (visibility) qs.set("visibility", visibility);
      if (category) qs.set("category", category);
    }
    router.push(qs.size > 0 ? `/skills?${qs.toString()}` : "/skills");
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      <form onSubmit={handleSubmit} className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          key={`${onSkills}:${currentQuery}`}
          ref={inputRef}
          type="search"
          defaultValue={currentQuery}
          placeholder="Search skills… (⌘K)"
          className="pl-8"
          aria-label="Search skills"
        />
      </form>
      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
        <AccountMenu user={user} />
      </div>
    </header>
  );
}
