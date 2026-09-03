"use client";

import { Loader2, Pencil, ShieldPlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateGuardrailRuleDraftButton } from "@/components/tenants/create-guardrail-rule-draft-button";
import { deleteCustomGuardrailRuleAction } from "@/lib/actions";
import type { CustomGuardrailRuleResponse } from "@/lib/jaas-api-types";

/** design.md §4.5's "user can define guardrails" — a tenant-owned library
 * of reusable custom rules, applied tenant-wide or per-skill via a
 * .jaas/guardrails.yaml `apply:` list (guardrails/skill_config.py in the
 * backend). This library never runs anything itself; the standalone
 * guardrails service validates+executes whatever gets sent to it.
 * Creating/editing a rule is a Draft → Validate → Publish flow (see
 * guardrail-rule-draft-editor.tsx) — "Edit" here forks the published rule
 * into a new draft rather than opening an inline form, the same as a
 * skill's "New Version". The page-header "Create Rule" button
 * (guardrails/page.tsx) creates a brand-new, blank draft the same way. */
export function CustomGuardrailRulesEditor({
  tenantId,
  rules,
  isAdmin,
  emptyDescription,
}: {
  tenantId: string;
  rules: CustomGuardrailRuleResponse[];
  isAdmin: boolean;
  /** Overrides the empty-state copy — used by the "Created by me" filter,
   * where "no custom rules yet" would be misleading if the tenant already
   * has rules authored by someone else. */
  emptyDescription?: string;
}) {
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete(slug: string) {
    setDeletingSlug(slug);
    startTransition(async () => {
      await deleteCustomGuardrailRuleAction(tenantId, slug);
      setDeletingSlug(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Custom Rules</h2>
        <p className="text-xs text-muted-foreground">
          Rules this tenant defines itself, on top of the platform catalog above. Apply them
          tenant-wide here, or per-skill via that skill&apos;s own{" "}
          <code className="rounded bg-muted px-1 py-0.5">.jaas/guardrails.yaml</code>.
        </p>
      </div>

      {rules.length === 0 ? (
        <EmptyState
          icon={ShieldPlus}
          title="No custom rules yet"
          description={
            emptyDescription ??
            (isAdmin
              ? "Use Create Rule above to define one, or push one from git with `jaasctl guardrails push`."
              : "This tenant hasn't defined any custom guardrail rules.")
          }
        />
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{rule.name}</p>
                  <Badge
                    variant="outline"
                    className={
                      rule.severity === "BLOCK"
                        ? "border-danger/30 text-danger"
                        : "border-warning/30 text-warning"
                    }
                  >
                    {rule.severity}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs">
                    v{rule.version}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  <code>{rule.id}</code> · {rule.category} · {rule.kind}
                </p>
              </div>
              {isAdmin && (
                <div className="flex shrink-0 items-center gap-1">
                  <CreateGuardrailRuleDraftButton
                    tenantId={tenantId}
                    forkFromSlug={rule.slug}
                    variant="ghost"
                    size="icon"
                    iconOnly
                  >
                    <Pencil className="size-4" />
                  </CreateGuardrailRuleDraftButton>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(rule.slug)}
                    disabled={pending && deletingSlug === rule.slug}
                  >
                    {pending && deletingSlug === rule.slug ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
