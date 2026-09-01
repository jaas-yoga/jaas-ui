import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { publishDraftAction } from "@/lib/actions";

import { PublishDialog } from "./publish-dialog";

vi.mock("@/lib/actions", () => ({
  publishDraftAction: vi.fn(),
}));

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const mockedPublish = vi.mocked(publishDraftAction);

beforeEach(() => {
  mockedPublish.mockReset();
  push.mockReset();
});

async function openDialog() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Publish Skill" }));
  return user;
}

describe("PublishDialog", () => {
  it("renders a disabled trigger when canPublish is false", () => {
    render(<PublishDialog draftId="draft-1" canPublish={false} />);
    expect(screen.getByRole("button", { name: "Publish Skill" })).toBeDisabled();
  });

  it("defaults visibility to private", async () => {
    render(<PublishDialog draftId="draft-1" canPublish />);
    await openDialog();
    expect(screen.getByRole("combobox", { name: "Visibility" })).toHaveTextContent(
      "Private — only you and your tenant",
    );
  });

  it("publishes and redirects to the new version on success", async () => {
    mockedPublish.mockResolvedValueOnce({
      ok: true,
      skill: {
        id: "acme.text.summarizer",
        version: "1.0.0",
        digest: "sha256:abc",
        prUrl: null,
        releaseUrl: null,
        guardrailCertifiedLevel: null,
        guardrailLevelStatuses: [],
        guardrailWarningCheckIds: [],
      },
    });

    render(<PublishDialog draftId="draft-1" canPublish />);
    const user = await openDialog();
    await user.click(screen.getByRole("button", { name: "Publish Skill" }));

    await waitFor(() => {
      expect(mockedPublish).toHaveBeenCalledWith("draft-1", "private");
    });
    expect(push).toHaveBeenCalledWith("/skills/acme.text.summarizer/versions/1.0.0");
  });

  it("surfaces a DRAFT_GIT_MERGE_CONFLICT error with a link to resolve it on GitHub", async () => {
    mockedPublish.mockResolvedValueOnce({
      ok: false,
      error: "The working branch has diverged from the target branch.",
      code: "DRAFT_GIT_MERGE_CONFLICT",
      prUrl: "https://github.com/acme/skills/pull/42",
    });

    render(<PublishDialog draftId="draft-1" canPublish />);
    const user = await openDialog();
    await user.click(screen.getByRole("button", { name: "Publish Skill" }));

    const link = await screen.findByRole("link", { name: "Resolve on GitHub" });
    expect(link).toHaveAttribute("href", "https://github.com/acme/skills/pull/42");
    // The error text and the link are siblings inside one <p> — assert on
    // the shared container's combined text rather than a single node, since
    // getByText only matches an element's *own* direct text-node children.
    expect(link.parentElement).toHaveTextContent(
      "The working branch has diverged from the target branch.",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("renders a generic error with no GitHub link when the failure isn't a merge conflict", async () => {
    mockedPublish.mockResolvedValueOnce({
      ok: false,
      error: "Guardrail check failed.",
      code: "GUARDRAIL_VIOLATION",
    });

    render(<PublishDialog draftId="draft-1" canPublish />);
    const user = await openDialog();
    await user.click(screen.getByRole("button", { name: "Publish Skill" }));

    expect(await screen.findByText("Guardrail check failed.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Resolve on GitHub" })).not.toBeInTheDocument();
  });
});
