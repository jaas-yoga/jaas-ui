---
name: jaas-frontend-conventions
description: Conventions and known gotchas for the jaas-registry web app (this repo, jaas_ui) — Next.js 16's breaking changes vs. training data, the Tailwind v4 CSS-first theming architecture, Auth.js v5 type-augmentation quirk, and the server-only backend API client pattern. Use when reading, writing, or reviewing any code in this repo.
---

# jaas-registry web app conventions

Next.js 16 App Router + TypeScript + Tailwind v4 + shadcn/ui + Auth.js v5
(`next-auth@beta`). This repo is independent from the Python backend it
talks to (`../jaas-skills`, a sibling checkout by convention — hyphenated,
not `jaas_skills`; check `run.sh`'s own `BACKEND_DIR` default if this
drifts again) and from the standalone guardrails service
(`../jaas-guardrails`) — no shared code, only HTTP. `run.sh` in this
repo's root starts all three together for local dev — see "Local dev
orchestration" below. Read `../jaas-skills/ui-design.md` and
`../jaas-skills/ui-implementation-plan.md` for the full design and phase
plan this app implements — those docs are cross-cutting (they also cover
backend changes made to support the UI) so they stay in the backend repo
rather than being duplicated here.

## This is Next.js 16 — not what's in training data

`AGENTS.md` says this outright; the two changes that actually bite:

- **Middleware is renamed Proxy.** The file is `src/proxy.ts`, not
  `middleware.ts`; export a `proxy` function (default or named), not
  `middleware`. Behavior is otherwise unchanged (`export const config = {
  matcher: [...] }` still works). See `node_modules/next/dist/docs/01-app/
  01-getting-started/16-proxy.md` if in doubt.
- **`params` and `searchParams` are both `Promise<...>`** on every page/
  layout/route handler — `await params` / `await searchParams` before use.
- When genuinely unsure whether something changed, check
  `node_modules/next/dist/docs/` before trusting prior Next.js knowledge.

## Theming is CSS-first (Tailwind v4) — one file to edit

- `src/styles/tokens.css` is the **single source of truth** for every color
  and font, as bare `H S% L%` triples scoped per theme:
  `[data-theme="light|dark|ocean|violet"] { --background: ...; --brand: ...; }`.
- `src/app/globals.css`'s `@theme inline` block maps those to real Tailwind
  utilities: `--color-background: hsl(var(--background));` etc. — this is
  why components can use `bg-background`, `bg-brand`, `text-danger` as
  ordinary Tailwind classes.
- **Never hardcode a color or a raw Tailwind color utility** (`bg-indigo-600`,
  `text-slate-400`) in a component. Add or retune a theme by editing
  `tokens.css` only.
- Semantic tokens (`--success`, `--warning`, `--danger`, `--info`) keep the
  same hue across all four themes — only `--brand` and the neutral scale
  vary per theme. Don't repurpose a semantic color for decoration.
- `next-themes` drives the `data-theme` attribute (`ThemeProvider` in
  `src/components/theme/theme-provider.tsx`); the "mounted" `useEffect`
  guard in `theme-toggle.tsx`/`theme-picker.tsx` is next-themes' documented
  SSR-hydration-mismatch workaround, not a bug — don't "simplify" it away.

## Auth.js v5 type augmentation: target `@auth/core/jwt`, not `next-auth/jwt`

The `jwt` callback's `token` parameter type resolves through `@auth/core`'s
own `AuthConfig["callbacks"]`, which imports `JWT` directly from
`@auth/core/jwt` — augmenting `declare module "next-auth/jwt"` silently
fails to merge into that type (you'll see `token.yourField` typed as
`unknown`). The working augmentation lives in `src/types/next-auth.d.ts`:
`declare module "@auth/core/jwt"`. Session augmentation via
`declare module "next-auth"` works exactly as documented — only the JWT
side has this quirk.

## The registry's JWT never reaches the browser

- `src/lib/jaas-api.ts`'s `jaasFetch()` is the only way server code calls
  the Python backend — it's `"server-only"`, reads the session via `auth()`,
  and attaches `Authorization: Bearer <token>` itself. Never fetch the
  backend directly from a client component or expose the token to one.
- `src/lib/skills-api.ts` (search, metadata, shares) and future API modules
  should be thin wrappers over `jaasFetch`, called from Server
  Components/Server Actions — not from `"use client"` code.

## Server Actions can't be inline inside a client-bundled file

If a component is pulled into a `"use client"` tree (imported and rendered
by any client component), an inline `async () => { "use server"; ... }`
closure inside it fails to build ("not allowed to define inline Server
Actions in Client Components"). Extract the action to its own `"use
server"` file instead — see `src/lib/actions.ts` (`signOutAction`,
`createShareGrantAction`, `revokeShareGrantAction`) — and import the named
export.

## Keeping the backend contract in sync

`src/lib/jaas-api-types.ts` is a **hand-kept mirror** of
`../jaas_skills/src/jaas_registry/api/schemas.py`'s Pydantic response
models (a sibling repo now — no shared filesystem to grep against
automatically) — field names and shapes must match exactly. When the
backend schema changes, update the matching TypeScript type here in a
coordinated change across both repos; there is no codegen step.

## Local dev orchestration (`run.sh`)

- `./run.sh start` boots web (port 3027) + `jaas-registry` (port 8027,
  from `../jaas-skills/.venv/bin/jaasctl`) + `jaas-guardrails` (port 8028)
  together, backgrounded (`nohup ... &`), and returns immediately — it does
  **not** block until they're actually ready to serve requests. `./run.sh
  status`/`stop`/`logs [api|web|guardrails]` manage the same three. Reads
  `JAAS_DEV_LOGIN_PASSWORD`/`AUTH_GOOGLE_ID` from this repo's own
  `.env.local` and forwards them to the backend subprocess — no separate
  copy needed there.
- Draft `validate`/`publish` call out to **both** the backend and the
  guardrails service — testing either path manually or in E2E needs all
  three running, not just `next dev` alone.
- **The starter draft's scaffolded `manifest.yaml` does not validate
  as-is**: placeholder id `your-team.your-domain.your-skill`, and
  `entrypoint: prompt.md` with no `prompt.md` file actually created
  (`jaas-skills/drafts/store.py`'s `_STARTER_FILES`). A fresh "Create
  Skill" → "Validate" will fail until both are fixed — this is real
  scaffold behavior, not a bug to "fix" in a test.

## Testing (Vitest + React Testing Library + Playwright)

- **`@vitejs/plugin-react` must stay pinned to `^5.2.0`, not latest 6.x** —
  6.x pulls in `@rolldown/plugin-babel`, which peer-conflicts with this
  repo's existing `@babel/core` tree (via `shadcn`'s own babel deps) and
  fails `npm install` outright. Re-check this pin before ever bumping it.
- `vitest.config.mts` (the `.mts` extension, not `.ts` — avoids a Vite
  native-config-loader CJS/ESM warning) needs `test.globals: true`, or
  React Testing Library's automatic `afterEach(cleanup)` never registers
  and every test after the first in a file sees the previous test's DOM
  still mounted (manifests as confusing "multiple elements found" errors
  that look unrelated to cleanup).
- **`getByText`/`findByText` only matches an element's own direct
  text-node children, not text inside nested elements.** A string split
  across an inline element — e.g. `{errorText}{" "}<a>a link</a>` inside
  one `<p>` — will never exact-match via `getByText`, no single node has
  exactly that text as its own direct children. Query the stable nested
  element instead (e.g. `getByRole("link", {...})`) and assert on
  `element.parentElement`'s `toHaveTextContent(...)` (substring match
  across the whole subtree) rather than fighting `getByText`'s matching
  rules.
- **Don't combine `userEvent` with `vi.useFakeTimers()`** — this
  repo's version combination deadlocks (`userEvent`'s internal dispatch
  pipeline waits on a fake timer nothing advances, even with
  `advanceTimers: vi.advanceTimersByTimeAsync` passed to `userEvent.setup`).
  When a test needs fake timers (e.g. asserting the exact 1500ms autosave
  debounce), use plain `fireEvent` instead and manually flush pending
  microtask-based state updates with `await act(async () => { await
  Promise.resolve(); await Promise.resolve(); })` — `waitFor`/`findBy*`
  also deadlock under fake timers for the same reason (their polling is
  itself timer-based) so avoid those too until timers are real again.
- **Driving the real Monaco editor from Playwright** (not the
  `@monaco-editor/react` mock used in component tests — see below):
  click `.monaco-editor .view-lines` to focus it, never
  `.monaco-editor textarea` directly (that locator can resolve to a
  separate, `readonly`/`aria-hidden` IME-composition textarea whose
  pointer events get intercepted by the editor's own content overlay, not
  the real input-capture element). Monaco auto-indents on **every** Enter
  keystroke to match the previous line — this fires even for
  `page.keyboard.insertText()`, not just `.type()`, so multi-line content
  with explicit indentation (YAML) gets corrupted unless you type
  line-by-line and clear the auto-inserted indent first: `Enter` →
  `Shift+Home` → `insertText(line)` per line. There's a reusable
  `typeIntoMonaco()` helper for this in `e2e/drafts-workflow.spec.ts`.
  Also: `Ctrl/Cmd+A` reliably fails to select Monaco's actual buffer from
  a Playwright-driven click+keypress in this setup (new text ends up
  appended, not replacing the selection) — don't rely on select-all-then-
  retype; delete the file via the file tree and recreate it empty instead
  when a test needs to replace a file's whole content.
- `FileTree`'s per-file delete button is `hidden` until its row is
  hovered (`group-hover:block`) — `.hover()` the row before clicking
  "Delete `<filename>`" in Playwright, a plain `.click()` will time out
  waiting for visibility.
- `CreateDraftDialog` renders **both** a header "Create Skill" button and
  an empty-state "Create Your First Skill" button simultaneously whenever
  a user has zero drafts — `getByRole("button", { name: "Create Skill" })`
  without `exact: true` matches both (a strict-mode violation); use
  `{ name: "Create Skill", exact: true }`.
- CI needs a `CI_DEV_LOGIN_PASSWORD` repository secret for the E2E job's
  dev-login round trip — **not yet configured** as of this writing; the
  E2E job will fail until someone with repo-secrets access adds it (see
  `.github/workflows/ci.yml`). `jaas-yoga/jaas-skills` and
  `jaas-yoga/jaas-guardrails` are both public, so the cross-repo
  `actions/checkout` steps need no additional token.

## Components

- shadcn/ui components are vendored into `src/components/ui/` (not an npm
  black box) — add more with `npx shadcn@latest add <name>` (already
  initialized with the `nova`/`radix` preset); don't hand-roll a component
  that duplicates one already there.
- Any page under `src/app/(app)/` renders inside the authenticated
  `AppShell` automatically via that route group's `layout.tsx` — don't
  re-wrap it in a page component.

## Phase 3.4: yank/governance display, "Shared with me"

- **The published-file viewer, cross-tenant sharing audit page, and
  share/validation notifications the roadmap's Phase 3.4 named were
  investigated before building anything** — the file viewer
  (`skill-files-viewer.tsx`) already existed and needed nothing;
  "notifications" mapped to no backend concept at all (no email/SSE/
  websocket/inbox anywhere in `jaas-skills`); "cross-tenant sharing audit"
  split into an unrelated multi-event-type tenant audit-export (no UI
  built for it — out of this pass's agreed scope) and a genuinely useful,
  previously-unexposed `list_for_grantee` backend function. Don't assume
  a roadmap one-liner describes the actual gap — check first, the way
  Phase 3.3's "audit export" also turned out to need more than it said.
- **`YankStatusBanner` (`skills/yank-status-banner.tsx`) and
  `GovernanceCard` (`skills/governance-card.tsx`) both render `null` for
  the common case** (`status: "active"`, no governance record set) —
  they're warnings/detail cards, not status indicators, so they should be
  invisible unless there's something to say. Wired into the skill detail
  page (`skills/[id]/versions/[version]/page.tsx`) right after the
  immutability notice and after `CertificationCard` respectively.
- **`GET /shares/received` replaced the old `matchesVisibilityFilter`
  client-side inference for the `"shared-with-me"` chip** on
  `/skills` (`src/lib/visibility-filter.ts`) — the inference (an
  already-visible private item neither owned by me nor my tenant must
  have reached me via a grant) still logically holds, but the new
  endpoint returns real grant metadata (who shared it, when, what
  permission) that `SearchResultItem` has no equivalent of, so
  `app/(app)/skills/page.tsx` now branches: `activeFilter ===
  "shared-with-me"` fetches `listReceivedShares()` and renders a
  dedicated table (Name/Category/Permission/Shared by/Shared at), every
  other filter still goes through `searchSkills()` +
  `matchesVisibilityFilter()` exactly as before. `matchesVisibilityFilter`
  itself now always returns `false` for `"shared-with-me"` (its switch
  stays exhaustive, but that branch is dead — the real logic moved to the
  page). Don't "simplify" that back without moving the branch too.
- **Found via manual verification against the real running stack (`run.sh`),
  not just tests**: the backend's `skills:governance` permission scope
  (gating `PUT /skills/{id}/governance`) was defined and used to build the
  route, but never added to `_MEMBER_SCOPES` in
  `jaas-skills/src/jaas_registry/authn/service.py` — meaning no real
  login-minted token could ever call it, only hand-rolled test JWTs that
  happened to include the scope. Fixed on the backend side (that file's
  `_MEMBER_SCOPES` tuple), not here — but worth remembering: an
  integration test with a hand-minted token proves the route's logic is
  correct, not that a real user can ever reach it. When adding a new
  permission scope, always check it's actually granted somewhere in the
  real sign-in path, not just exercised in a test fixture.
