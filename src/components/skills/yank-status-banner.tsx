import { AlertTriangle } from "lucide-react";

/**
 * IMPLEMENTATION_PLAN.md Phase 3.4: surfaces the `status` field
 * api/schemas.py's SkillMetadataResponse has returned since Phase 1.3,
 * never rendered anywhere in the frontend until now. Renders nothing for
 * "active" — this is a warning, not a status indicator, so it should be
 * invisible in the overwhelmingly common case.
 *
 * The metadata endpoint doesn't expose a yank reason/actor/timestamp (only
 * the yank/unyank action responses do, ephemerally) — a generic warning is
 * all that's honestly renderable here today.
 */
export function YankStatusBanner({ status }: { status: "active" | "yanked" }) {
  if (status !== "yanked") return null;

  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <p>
        This version has been <span className="font-medium">yanked</span> by a maintainer —
        it&apos;s excluded from <code className="font-mono text-xs">latest</code>/range
        resolution, but still installable by this exact version pin.
      </p>
    </div>
  );
}
