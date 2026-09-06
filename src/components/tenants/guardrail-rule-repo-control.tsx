"use client";

import { GitBranch, Loader2, X } from "lucide-react";
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
 * authoring rules by hand) has something to be checked against. Lives
 * inline in the Custom Rules section header (custom-guardrail-rules-editor.tsx)
 * next to Create Rule, rather than as its own card — the two are
 * alternative ways into the same rule list, not separate features, and a
 * full empty-state card for a tenant that never uses the git workflow was
 * pure clutter. Renders nothing for a non-admin when there's nothing
 * connected — only an admin can act on it either way. */
export function GuardrailRuleRepoControl({
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

  if (!link && !isAdmin) return null;

  const parsed = link ? parseGithubRepoUrl(link.repoUrl) : null;

  return (
    <>
      {link ? (
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 py-1 pr-1.5 pl-2.5 text-xs">
          <GitBranch className="size-3.5 text-muted-foreground" />
          <span className="font-medium text-foreground">
            {parsed ? `${parsed.owner}/${parsed.name}` : link.repoUrl}
          </span>
          {isAdmin && (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={pending}
              title="Disconnect rule repo"
              className="text-muted-foreground hover:text-danger"
            >
              {pending ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
            </button>
          )}
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <GitBranch className="size-4" />
          Connect repo
        </Button>
      )}

      <ConnectDialog
        tenantId={tenantId}
        githubConnected={githubConnected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
