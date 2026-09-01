# E2E tests

Playwright tests here exercise the real app against a real backend
(`jaas-skills`) and a real guardrails service (`jaas-guardrails`) — draft
validate/publish call out to both, so unlike the component tests
(`npm run test`), these can't run against mocks alone.

## Running locally

1. Start the full stack from this repo: `./run.sh start` (starts web,
   `jaas-registry`, and `jaas-guardrails` — see the repo root `run.sh` for
   details, including sibling-checkout locations).
2. Make sure `JAAS_DEV_LOGIN_PASSWORD` is set to the same value the backend
   was started with (`.env.local` locally; `run.sh` reads it from there
   automatically for the backend, but Playwright's own process also needs
   it in its environment — e.g. `export JAAS_DEV_LOGIN_PASSWORD=...` before
   running tests, or run them via a tool that loads `.env.local` into the
   shell).
3. `npm run test:e2e`
4. `./run.sh stop` when done (optional — leaving the stack running is fine
   for repeated local runs).

## Scope

`drafts-workflow.spec.ts` covers the full local-draft happy path (create →
edit → save → validate → publish) and the delete-draft flow. It's
deliberately local-only — no GitHub repo linking — since that path needs a
real connected repo (a registered GitHub OAuth App + Connected Repo) to be
meaningful, which isn't set up in this environment. The one deferred case
from the original test plan is the `DRAFT_GIT_MERGE_CONFLICT` error path,
which needs real diverged GitHub repo state to trigger — per
`IMPLEMENTATION_PLAN.md`'s own stated fallback, that's covered at the
component-test level instead (`publish-dialog.test.tsx`), not here.
