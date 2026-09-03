import { Plus, ShieldQuestion } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { CreateGuardrailRuleDraftButton } from "@/components/tenants/create-guardrail-rule-draft-button";
import { CustomGuardrailRulesEditor } from "@/components/tenants/custom-guardrail-rules-editor";
import { GuardrailPolicyEditor } from "@/components/tenants/guardrail-policy-editor";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";
import {
  listCustomGuardrailRules,
  listGuardrailCatalog,
  getTenantGuardrailPolicy,
} from "@/lib/guardrails-api";
import { JaasApiRequestError } from "@/lib/jaas-api";
import { listMembers } from "@/lib/tenants-api";

/** Top-level nav item (moved out of Tenant Settings — acts on whichever
 * tenant is active in the sidebar's TenantSwitcher, the same way /skills
 * and /drafts already do, rather than requiring a tenant id in the URL).
 * ui-design.md §9.15/§9.16/§10.7 — grouped-toggle pattern. GitHub
 * connection + repo links live on the Repositories tab under Tenant
 * Settings — connecting a repo isn't itself a guardrail setting. */
const SCOPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "public", label: "Public" },
  { value: "mine", label: "Created by me" },
  { value: "tenant", label: "My Tenant" },
] as const;

type ScopeFilter = (typeof SCOPE_FILTERS)[number]["value"];

function isValidScope(value: string | undefined): value is ScopeFilter {
  return SCOPE_FILTERS.some((f) => f.value === value);
}

export default async function GuardrailsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const rawScope = Array.isArray(params.scope) ? params.scope[0] : params.scope;
  const activeScope: ScopeFilter = isValidScope(rawScope) ? rawScope : "all";

  const session = await auth();
  const tenantId = session?.jaasActiveTenantId;

  const titleBlock = (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Publish Guardrails</h1>
      <p className="text-sm text-muted-foreground">
        Automated checks that run every time someone on this tenant publishes a skill — from the
        web UI, `jaasctl publish`, or a git-native CI release.
      </p>
    </div>
  );

  if (!tenantId) {
    return (
      <div className="w-full space-y-6">
        {titleBlock}
        <EmptyState
          icon={ShieldQuestion}
          title="No active tenant"
          description="Select a tenant from the switcher to see its guardrails."
        />
      </div>
    );
  }

  let catalog, policy, members, customRules;
  try {
    [catalog, policy, members, customRules] = await Promise.all([
      listGuardrailCatalog(),
      getTenantGuardrailPolicy(tenantId),
      listMembers(tenantId),
      listCustomGuardrailRules(tenantId),
    ]);
  } catch (err) {
    if (err instanceof JaasApiRequestError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  const isAdmin = members.find((m) => m.userId === session?.jaasUser?.id)?.role === "admin";
  const visibleCustomRules =
    activeScope === "mine"
      ? customRules.filter((rule) => rule.createdBy === session?.jaasUser?.id)
      : customRules;

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        {titleBlock}
        <CreateGuardrailRuleDraftButton tenantId={tenantId} className="shrink-0">
          <Plus className="size-4" />
          Create Rule
        </CreateGuardrailRuleDraftButton>
      </div>

      <div className="flex flex-wrap gap-2">
        {SCOPE_FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value === "all" ? "/guardrails" : `/guardrails?scope=${filter.value}`}
          >
            <Badge
              variant={filter.value === activeScope ? "default" : "outline"}
              className="cursor-pointer px-3 py-1 text-sm font-normal"
            >
              {filter.label}
            </Badge>
          </Link>
        ))}
      </div>

      {(activeScope === "all" || activeScope === "public") && (
        <GuardrailPolicyEditor
          tenantId={tenantId}
          catalog={catalog}
          initialEnabledIds={policy.enabledCheckIds}
          isAdmin={isAdmin}
        />
      )}

      {activeScope === "all" && <Separator />}

      {(activeScope === "all" || activeScope === "tenant" || activeScope === "mine") && (
        <CustomGuardrailRulesEditor
          tenantId={tenantId}
          rules={visibleCustomRules}
          isAdmin={isAdmin}
          emptyDescription={
            activeScope === "mine" && customRules.length > 0
              ? "You haven't created any custom rules yet — other tenant members have, though. Switch to \"My Tenant\" to see all of them."
              : undefined
          }
        />
      )}
    </div>
  );
}
