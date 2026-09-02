"use client";

import { Check, Loader2, Pencil, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateDisplayNameAction } from "@/lib/actions";

/** Account/Profile tab — lets a user override the name shown in place of
 * their Google name (email/picture stay Google-sourced, no override for
 * those). A blank save resets to the Google name. `useSession().update()`
 * is what actually pushes the change into the session cookie (see
 * auth.ts's jwt callback) — the server action alone only updates the
 * backend record, it doesn't touch the client's own session state. */
export function EditDisplayNameForm({
  name,
  hasOverride,
}: {
  name: string;
  hasOverride: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { update } = useSession();
  const router = useRouter();

  function save(nextValue: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateDisplayNameAction(nextValue);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await update({
        jaasUser: { name: result.user.name, displayName: result.user.displayName },
      });
      router.refresh();
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-medium text-foreground">{name}</p>
        <button
          type="button"
          onClick={() => {
            setValue(name);
            setError(null);
            setEditing(true);
          }}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Edit display name"
        >
          <Pencil className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-7 max-w-48 text-sm"
          aria-label="Display name"
          autoFocus
          disabled={pending}
        />
        <Button
          size="icon-sm"
          onClick={() => save(value)}
          disabled={pending || !value.trim()}
          aria-label="Save display name"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setEditing(false)}
          disabled={pending}
          aria-label="Cancel"
        >
          <X className="size-3.5" />
        </Button>
      </div>
      {hasOverride && (
        <button
          type="button"
          onClick={() => save("")}
          disabled={pending}
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          Reset to Google name
        </button>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
