"use client";

import { Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteCustomGuardrailRuleDraftAction,
  publishCustomGuardrailRuleDraftAction,
  updateCustomGuardrailRuleDraftAction,
  validateCustomGuardrailRuleDraftAction,
} from "@/lib/actions";
import { CUSTOM_GUARDRAIL_CATEGORIES, CUSTOM_GUARDRAIL_KINDS } from "@/lib/guardrail-rule-meta";
import type { CustomGuardrailRuleDraftResponse } from "@/lib/jaas-api-types";

type PendingAction = "save" | "validate" | "publish" | "delete" | null;

/** Draft → Validate → Publish, the same process a skill goes through
 * (create draft → edit → validate → publish → immutable version) — see
 * CreateDraftDialog/draft-workspace.tsx for the skill-side equivalent.
 * Publish is admin-gated on the backend (same tier as the old direct PUT
 * endpoint this ultimately calls); a non-admin can still draft, edit, and
 * validate — they just don't see a Publish button. */
export function GuardrailRuleDraftEditor({
  tenantId,
  draft,
  isAdmin,
}: {
  tenantId: string;
  draft: CustomGuardrailRuleDraftResponse;
  isAdmin: boolean;
}) {
  const [slug, setSlug] = useState(draft.slug);
  const [name, setName] = useState(draft.name);
  const [description, setDescription] = useState(draft.description);
  const [category, setCategory] = useState(draft.category || "CODE_SAFETY");
  const [severity, setSeverity] = useState<"BLOCK" | "WARN">(
    draft.severity === "BLOCK" ? "BLOCK" : "WARN",
  );
  const [standardRef, setStandardRef] = useState(draft.standardRef);
  const [kind, setKind] = useState(draft.kind || "regex_file_scan");
  const [configText, setConfigText] = useState(JSON.stringify(draft.config ?? {}, null, 2));
  const [version, setVersion] = useState(draft.version);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const router = useRouter();

  const isForked = draft.forkedFromVersion !== null;

  function parsedConfig(): { ok: true; config: Record<string, unknown> } | { ok: false } {
    try {
      return { ok: true, config: JSON.parse(configText || "{}") };
    } catch {
      setError("Config must be valid JSON.");
      return { ok: false };
    }
  }

  async function saveDraft(): Promise<boolean> {
    if (!slug.trim() || !name.trim()) {
      setError("Slug and name are required.");
      return false;
    }
    const parsed = parsedConfig();
    if (!parsed.ok) return false;
    setError(null);
    const result = await updateCustomGuardrailRuleDraftAction(tenantId, draft.id, {
      slug,
      name,
      description,
      category,
      severity,
      standardRef,
      kind,
      config: parsed.config,
      version,
    });
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    return true;
  }

  function handleSaveOnly() {
    setPendingAction("save");
    startTransition(async () => {
      await saveDraft();
    });
  }

  function handleValidate() {
    setPendingAction("validate");
    setValidation(null);
    startTransition(async () => {
      if (!(await saveDraft())) return;
      const result = await validateCustomGuardrailRuleDraftAction(tenantId, draft.id);
      setValidation(result.valid ? "Looks good." : (result.error ?? "Invalid rule."));
    });
  }

  function handlePublish() {
    setPendingAction("publish");
    startTransition(async () => {
      if (!(await saveDraft())) return;
      const result = await publishCustomGuardrailRuleDraftAction(tenantId, draft.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/guardrails?scope=tenant");
      router.refresh();
    });
  }

  function handleDelete() {
    setPendingAction("delete");
    startTransition(async () => {
      await deleteCustomGuardrailRuleDraftAction(tenantId, draft.id);
      router.push("/guardrails?scope=tenant");
      router.refresh();
    });
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <Link href="/guardrails?scope=tenant" className="text-sm text-muted-foreground hover:underline">
          ← Back to Guardrails
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          {slug || "New custom rule"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isForked
            ? `Editing — this will publish as a new version (forked from ${draft.forkedFromVersion}).`
            : "Restricted to the platform's executor kinds — a custom rule can never run arbitrary code, only a declarative check like the built-in catalog uses."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Slug</label>
          <Input
            value={slug}
            disabled={isForked}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="no-internal-hostnames"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="No internal hostnames"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this rule flags and why"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Standard reference (optional)
          </label>
          <Input
            value={standardRef}
            onChange={(e) => setStandardRef(e.target.value)}
            placeholder="e.g. SOC2 CC6.1"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CUSTOM_GUARDRAIL_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Severity</label>
          <Select value={severity} onValueChange={(v) => setSeverity(v as "BLOCK" | "WARN")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WARN">WARN</SelectItem>
              <SelectItem value="BLOCK">BLOCK</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Kind</label>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CUSTOM_GUARDRAIL_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Version</label>
          <Input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0.0"
            className="font-mono"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Config (JSON — shape depends on kind, see the guardrails service README)
        </label>
        <Textarea value={configText} onChange={(e) => setConfigText(e.target.value)} rows={8} />
      </div>

      {validation && (
        <p className={validation === "Looks good." ? "text-sm text-success" : "text-sm text-danger"}>
          {validation}
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="ghost" className="text-danger hover:text-danger" onClick={handleDelete} disabled={pending}>
          {pending && pendingAction === "delete" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
          Delete Draft
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleValidate} disabled={pending}>
            {pending && pendingAction === "validate" && <Loader2 className="size-4 animate-spin" />}
            Validate
          </Button>
          <Button variant="outline" onClick={handleSaveOnly} disabled={pending}>
            {pending && pendingAction === "save" && <Loader2 className="size-4 animate-spin" />}
            Save Draft
          </Button>
          {isAdmin && (
            <Button onClick={handlePublish} disabled={pending}>
              {pending && pendingAction === "publish" && <Loader2 className="size-4 animate-spin" />}
              Publish
            </Button>
          )}
        </div>
      </div>
      {!isAdmin && (
        <p className="text-right text-xs text-muted-foreground">
          Only a tenant admin can publish this rule.
        </p>
      )}
    </div>
  );
}
