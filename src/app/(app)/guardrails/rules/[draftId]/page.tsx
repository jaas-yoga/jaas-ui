import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { GuardrailRuleDraftEditor } from "@/components/tenants/guardrail-rule-draft-editor";
import { getCustomGuardrailRuleDraft } from "@/lib/guardrails-api";
import { JaasApiRequestError } from "@/lib/jaas-api";
import { listMembers } from "@/lib/tenants-api";

/** Draft-editing screen for a custom guardrail rule — the guardrails
 * equivalent of /drafts/[draftId] for skills. Reached from /guardrails'
 * "Create Rule" button or a rule's "Edit" (which forks a new draft first,
 * see custom-guardrail-rules-editor.tsx). */
export default async function GuardrailRuleDraftPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;
  const session = await auth();
  const tenantId = session?.jaasActiveTenantId;
  if (!tenantId) {
    redirect("/guardrails");
  }

  let draft, members;
  try {
    [draft, members] = await Promise.all([
      getCustomGuardrailRuleDraft(tenantId, draftId),
      listMembers(tenantId),
    ]);
  } catch (err) {
    if (err instanceof JaasApiRequestError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  const isAdmin = members.find((m) => m.userId === session?.jaasUser?.id)?.role === "admin";

  return <GuardrailRuleDraftEditor tenantId={tenantId} draft={draft} isAdmin={isAdmin} />;
}
