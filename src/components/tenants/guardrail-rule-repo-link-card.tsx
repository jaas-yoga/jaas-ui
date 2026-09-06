"use client";

import { GitBranch, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { GithubRepoPicker, parseGithubRepoUrl } from "@/components/github/github-pickers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  createGuardrailRuleRepoLinkAction,
  deleteGuardrailRuleRepoLinkAction,
} from "@/lib/actions";
import type { GuardrailRuleRepoLinkResponse } from "@/lib/jaas-api-types";

function ConnectDialog({
  tenantId,
  githubConnected,
  open,
  onOpenChange,
}: {
  tenantId: string;
  githubConnected: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [mode, setMode] = useState<"manual" | "github">(githubConnected ? "github" : "manual");
  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleConnect(url: string) {
    setError(null);
    startTransition(async () => {
      const result = await createGuardrailRuleRepoLinkAction(tenantId, url);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      setRepoUrl("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect a rule repo</DialogTitle>
          <DialogDescription>
            Declares which repo{" "}
            <code className="rounded bg-muted px-1 py-0.5">jaasctl guardrails push</code> is
            expected to run from for this tenant. Once set, a push claiming a different repo is
            rejected, and a rule it manages can no longer be edited by hand in this UI.
          </DialogDescription>
        </DialogHeader>

        {mode === "github" ? (
          <GithubRepoPicker
            tenantId={tenantId}
            onSelect={(repo) => handleConnect(`https://github.com/${repo.fullName}`)}
          />
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Repo URL</label>
            <Input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/acme/guardrail-rules"
            />
          </div>
        )}

        {githubConnected && (
          <button
            type="button"
            className="text-left text-xs text-brand hover:underline"
            onClick={() => setMode(mode === "manual" ? "github" : "manual")}
          >
            {mode === "manual" ? "Pick from GitHub instead" : "Enter a URL manually instead"}
          </button>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {mode === "manual" && (
            <Button onClick={() => handleConnect(repoUrl.trim())} disabled={pending || !repoUrl.trim()}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Connect
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** design.md §4.5's "user can define guardrails" hardened for a git-native
 * workflow: declares which repo this tenant's custom guardrail rules come
 * from, so `jaasctl guardrails push` (the CI-facing alternative to
 * authoring rules by hand — see custom-guardrail-rules-editor.tsx) has
 * something to be checked against. Modeled on repo-links-editor.tsx, but
 * one link per tenant instead of one per skill id — no branch picking,
 * since the push endpoint doesn't use one. */
export function GuardrailRuleRepoLinkCard({
  tenantId,
  link,
  githubConnected,
  isAdmin,
}: {
  tenantId: string;
  link: GuardrailRuleRepoLinkResponse | null;
  githubConnected: boolean;
  isAdmin: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDisconnect() {
    startTransition(async () => {
      await deleteGuardrailRuleRepoLinkAction(tenantId);
      router.refresh();
    });
  }

  const parsed = link ? parseGithubRepoUrl(link.repoUrl) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Rule Repo</h2>
          <p className="text-xs text-muted-foreground">
            Where this tenant&apos;s custom guardrail rules are version-controlled.
          </p>
        </div>
        {isAdmin && !link && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            Connect a repo
          </Button>
        )}
      </div>

      {link ? (
        <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
          <GitBranch className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {parsed ? `${parsed.owner}/${parsed.name}` : link.repoUrl}
            </p>
            <p className="text-xs text-muted-foreground">
              Connected {new Date(link.createdAt).toLocaleDateString()}
            </p>
          </div>
          {isAdmin && (
            <Button variant="ghost" size="icon" onClick={handleDisconnect} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </Button>
          )}
        </div>
      ) : (
        <EmptyState
          icon={GitBranch}
          title="No rule repo connected"
          description={
            isAdmin
              ? "Connect a repo so `jaasctl guardrails push` can sync rules from CI."
              : "This tenant hasn't connected a guardrail rule repo yet."
          }
        />
      )}

      <ConnectDialog
        tenantId={tenantId}
        githubConnected={githubConnected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
