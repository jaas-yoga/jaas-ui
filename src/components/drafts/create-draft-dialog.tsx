"use client";

import { GitBranch, Laptop, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { parseGithubRepoUrl } from "@/components/github/github-pickers";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  createDraftAction,
  createDraftWithGitAction,
  listGithubBranchesAction,
  listGithubReposAction,
} from "@/lib/actions";

type Destination = "local" | "github";

function suggestWorkingBranch(repoFullName: string): string {
  const suffix = Math.random().toString(16).slice(2, 8);
  return `jaas/draft/${repoFullName.split("/")[1]}-${suffix}`;
}

/** A centered Dialog, matching every other "Create X" flow in the app
 * (CreateTenantDialog, CreatePatDialog, InviteMemberDialog) rather than
 * expanding an inline panel in the page's own flow — the earlier inline
 * approach read as a floating, disconnected fragment once the page had
 * empty space around it. Destination is two selectable cards (only ever
 * two options, so a picker reads faster than a dropdown); repo — restricted
 * to repos already registered under Connected Repos (Tenant Settings →
 * Repositories), not a live search over the whole GitHub account — and
 * branch stay as Selects underneath, only shown once GitHub is chosen. */
export function CreateDraftDialog({
  label,
  tenantId,
  githubConnected,
  connectedRepoUrls,
}: {
  label: string;
  tenantId?: string;
  githubConnected: boolean;
  connectedRepoUrls: string[];
}) {
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState<Destination>("local");
  const [selectedRepoUrl, setSelectedRepoUrl] = useState("");
  const [defaultBranchByUrl, setDefaultBranchByUrl] = useState<Record<string, string>>({});
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branches, setBranches] = useState<string[] | null>(null);
  const [branchesLoading, startBranchesLoading] = useTransition();
  const [emptyRepoConfirm, setEmptyRepoConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const canUseGithub = githubConnected && connectedRepoUrls.length > 0;
  const selectedRepoParsed = selectedRepoUrl ? parseGithubRepoUrl(selectedRepoUrl) : null;

  useEffect(() => {
    if (!open || !tenantId || !canUseGithub) return;
    // Only used to resolve each repo's default branch — the dropdown itself
    // is already restricted to connectedRepoUrls, this never browses the
    // wider account.
    listGithubReposAction(tenantId).then((result) => {
      if (!result.ok) return;
      const map: Record<string, string> = {};
      for (const repo of result.repos) {
        map[`https://github.com/${repo.fullName}`] = repo.defaultBranch;
      }
      setDefaultBranchByUrl(map);
    });
  }, [open, tenantId, canUseGithub]);

  useEffect(() => {
    if (!tenantId || !selectedRepoParsed) return;
    const defaultBranch = defaultBranchByUrl[selectedRepoUrl] ?? "";
    startBranchesLoading(async () => {
      setSelectedBranch(defaultBranch);
      const result = await listGithubBranchesAction(
        tenantId,
        selectedRepoParsed.owner,
        selectedRepoParsed.name,
      );
      if (result.ok) {
        setBranches(result.branches);
        if (!defaultBranch && result.branches.length > 0) setSelectedBranch(result.branches[0]);
      } else {
        setBranches([]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, selectedRepoUrl, defaultBranchByUrl]);

  function reset() {
    setDestination("local");
    setSelectedRepoUrl("");
    setSelectedBranch("");
    setBranches(null);
    setEmptyRepoConfirm(false);
    setError(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function selectDestination(next: Destination) {
    setDestination(next);
    setSelectedRepoUrl("");
    setBranches(null);
    setSelectedBranch("");
  }

  function handleCreateLocal() {
    setError(null);
    startTransition(async () => {
      await createDraftAction(undefined);
    });
  }

  function handleCreateGithub(confirmEmptyRepo = false) {
    if (!selectedRepoUrl) return;
    const fullName = selectedRepoParsed ? `${selectedRepoParsed.owner}/${selectedRepoParsed.name}` : "repo";
    const targetBranch = selectedBranch || defaultBranchByUrl[selectedRepoUrl] || "main";
    setError(null);
    startTransition(async () => {
      const result = await createDraftWithGitAction({
        provider: "github",
        repoUrl: selectedRepoUrl,
        targetBranch,
        workingBranch: suggestWorkingBranch(fullName),
        confirmInitializeEmptyRepo: confirmEmptyRepo,
      });
      if (!result.ok) {
        if (result.code === "DRAFT_GIT_EMPTY_REPO") {
          setSelectedBranch(targetBranch);
          setEmptyRepoConfirm(true);
          return;
        }
        setError(result.error);
        return;
      }
      close();
      router.push(`/drafts/${result.draftId}`);
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>{label}</Button>
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogContent className="max-w-lg">
          {emptyRepoConfirm ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedRepoParsed?.owner}/{selectedRepoParsed?.name} is empty
                </DialogTitle>
                <DialogDescription>
                  Name the branch this draft&apos;s first commit will create.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="empty-repo-branch">
                  Branch name
                </label>
                <Input
                  id="empty-repo-branch"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  placeholder="main"
                  className="font-mono"
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEmptyRepoConfirm(false)} disabled={pending}>
                  Back
                </Button>
                <Button
                  onClick={() => handleCreateGithub(true)}
                  disabled={pending || !selectedBranch.trim()}
                >
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  Create branch & start
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Create a new skill draft</DialogTitle>
                <DialogDescription>
                  Start from scratch, or connect it to a GitHub repo you&apos;ve already registered.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => selectDestination("local")}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                    destination === "local"
                      ? "border-brand bg-brand/5 ring-1 ring-brand"
                      : "border-border hover:border-brand/50",
                  )}
                >
                  <Laptop className="size-5 text-brand" />
                  <p className="text-sm font-medium text-foreground">Local only</p>
                  <p className="text-xs text-muted-foreground">
                    Work in the browser editor, publish when ready.
                  </p>
                </button>
                <button
                  type="button"
                  disabled={!canUseGithub}
                  onClick={() => canUseGithub && selectDestination("github")}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                    !canUseGithub && "cursor-not-allowed opacity-50",
                    destination === "github"
                      ? "border-brand bg-brand/5 ring-1 ring-brand"
                      : canUseGithub && "border-border hover:border-brand/50",
                  )}
                >
                  <GitBranch className="size-5 text-brand" />
                  <p className="text-sm font-medium text-foreground">GitHub repo</p>
                  <p className="text-xs text-muted-foreground">
                    Commit to a connected repo branch.
                  </p>
                </button>
              </div>
              {!canUseGithub && (
                <p className="text-xs text-muted-foreground">
                  {tenantId ? (
                    <>
                      {githubConnected ? "No repos connected yet — c" : "C"}onnect a repo under{" "}
                      <Link
                        href={`/tenants/${tenantId}/repositories`}
                        className="text-brand hover:underline"
                        onClick={close}
                      >
                        Tenant Settings → Repositories
                      </Link>{" "}
                      to enable this.
                    </>
                  ) : (
                    "This tenant hasn't connected GitHub."
                  )}
                </p>
              )}

              {destination === "github" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Repository</label>
                    <Select
                      value={selectedRepoUrl}
                      onValueChange={(url) => {
                        setSelectedRepoUrl(url);
                        setBranches(null);
                        setSelectedBranch("");
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a connected repo…" />
                      </SelectTrigger>
                      <SelectContent>
                        {connectedRepoUrls.map((url) => {
                          const parsed = parseGithubRepoUrl(url);
                          return (
                            <SelectItem key={url} value={url} className="font-mono">
                              {parsed ? `${parsed.owner}/${parsed.name}` : url}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedRepoUrl && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Branch</label>
                      {branchesLoading ? (
                        <p className="text-xs text-muted-foreground">Loading branches…</p>
                      ) : branches && branches.length > 0 ? (
                        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a branch…" />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.map((branch) => (
                              <SelectItem key={branch} value={branch} className="font-mono">
                                {branch}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No branches yet — the first commit will create one.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-danger">{error}</p>}

              <DialogFooter>
                <Button variant="outline" onClick={close} disabled={pending}>
                  Cancel
                </Button>
                {destination === "local" ? (
                  <Button onClick={handleCreateLocal} disabled={pending}>
                    {pending && <Loader2 className="size-4 animate-spin" />}
                    Create
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleCreateGithub(false)}
                    disabled={pending || !selectedRepoUrl}
                  >
                    {pending && <Loader2 className="size-4 animate-spin" />}
                    Create
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
