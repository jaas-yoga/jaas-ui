"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition, type ComponentProps, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createCustomGuardrailRuleDraftAction } from "@/lib/actions";

/** Shared by the Guardrails page header ("Create Rule") and each Custom
 * Rules row's "Edit" pencil (which forks the published rule via
 * `forkFromSlug` — the guardrails equivalent of a skill's "New Version").
 * Both cases are the same one action: create a draft, then navigate
 * straight into its editor — no intermediate modal, there's nothing to
 * configure upfront (unlike CreateDraftDialog's local-vs-GitHub choice). */
export function CreateGuardrailRuleDraftButton({
  tenantId,
  forkFromSlug,
  iconOnly = false,
  children,
  ...buttonProps
}: {
  tenantId: string;
  forkFromSlug?: string;
  /** Set for a fixed-width icon button (size="icon"/"icon-sm") — the
   * spinner replaces the icon instead of sitting alongside it, which
   * would overflow that button's fixed width. */
  iconOnly?: boolean;
  children: ReactNode;
} & Omit<ComponentProps<typeof Button>, "onClick" | "disabled">) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await createCustomGuardrailRuleDraftAction(tenantId, forkFromSlug);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(`/guardrails/rules/${result.draftId}`);
    });
  }

  return (
    <Button onClick={handleClick} disabled={pending} {...buttonProps}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {!(pending && iconOnly) && children}
    </Button>
  );
}
