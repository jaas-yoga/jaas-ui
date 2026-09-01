import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteDraftAction,
  deleteDraftFileAction,
  getDraftFileAction,
  moveDraftToGitDirectoryAction,
  saveDraftFileAction,
  validateDraftAction,
} from "@/lib/actions";

import { DraftWorkspace } from "./draft-workspace";

vi.mock("@/lib/actions", () => ({
  getDraftFileAction: vi.fn(),
  saveDraftFileAction: vi.fn(),
  validateDraftAction: vi.fn(),
  deleteDraftFileAction: vi.fn(),
  deleteDraftAction: vi.fn(),
  moveDraftToGitDirectoryAction: vi.fn(),
  publishDraftAction: vi.fn(),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark", theme: "dark" }),
}));

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

// Monaco doesn't run in jsdom — a plain textarea preserves the same
// value/onChange contract draft-workspace.tsx relies on.
vi.mock("@monaco-editor/react", () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

// Isolates DraftWorkspace's own save/validate/autosave logic from FileTree's
// own (unrelated) tree-building/drag-drop behavior.
vi.mock("@/components/drafts/file-tree", () => ({
  FileTree: ({ files, onSelect }: { files: string[]; onSelect: (path: string) => void }) => (
    <div>
      {files.map((f) => (
        <button key={f} type="button" onClick={() => onSelect(f)}>
          {f}
        </button>
      ))}
    </div>
  ),
}));

const mockedGetFile = vi.mocked(getDraftFileAction);
const mockedSaveFile = vi.mocked(saveDraftFileAction);
const mockedValidate = vi.mocked(validateDraftAction);
const mockedDeleteFile = vi.mocked(deleteDraftFileAction);
const mockedDeleteDraft = vi.mocked(deleteDraftAction);
const mockedMoveToDirectory = vi.mocked(moveDraftToGitDirectoryAction);

const SAVE_OK = { ok: true as const, files: ["manifest.yaml"], gitSyncStatus: null, gitSyncError: null };

beforeEach(() => {
  mockedGetFile.mockReset().mockResolvedValue("id: acme.text.summarizer\n");
  mockedSaveFile.mockReset().mockResolvedValue(SAVE_OK);
  mockedValidate.mockReset();
  mockedDeleteFile.mockReset();
  mockedDeleteDraft.mockReset();
  mockedMoveToDirectory.mockReset();
  push.mockReset();
});

function renderWorkspace() {
  return render(<DraftWorkspace draftId="draft-1" initialFiles={["manifest.yaml"]} />);
}

async function openManifest() {
  renderWorkspace();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "manifest.yaml" }));
  await screen.findByTestId("monaco-editor");
  return user;
}

// getDraftFileAction/saveDraftFileAction resolve on the microtask queue, not
// a timer — flushed with a couple of act()-wrapped ticks. Deliberately not
// userEvent + fake timers together here: that combination deadlocks (its
// internal dispatch pipeline waits on a fake timer no one advances). Plain
// fireEvent avoids that entirely, and is enough since these tests only need
// a click + a change event, not realistic keyboard/pointer sequencing.
async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("DraftWorkspace autosave", () => {
  it("debounces edits and autosaves without committing to git", async () => {
    vi.useFakeTimers();
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "manifest.yaml" }));
    await flushMicrotasks();
    expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("monaco-editor"), { target: { value: "id: updated\n" } });
    expect(mockedSaveFile).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    // scheduleSave's setTimeout calls saveFile(path, content) with no third
    // argument at all — saveDraftFileAction's own default parameter
    // (`options = {}`) is what ultimately makes this a non-git-syncing
    // save, not an explicit `{ syncToGit: false }` from this call site.
    expect(mockedSaveFile).toHaveBeenCalledWith(
      "draft-1",
      "manifest.yaml",
      "id: updated\n",
      undefined,
    );
    vi.useRealTimers();
  });

  it("surfaces a failed autosave on the tab without crashing the editor", async () => {
    vi.useFakeTimers();
    mockedSaveFile.mockResolvedValueOnce({ ok: false, error: "Network error." });
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "manifest.yaml" }));
    await flushMicrotasks();

    fireEvent.change(screen.getByTestId("monaco-editor"), { target: { value: "broken\n" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    await flushMicrotasks();

    expect(screen.getByTitle("Network error.")).toBeInTheDocument();
    // The editor itself is still there and still usable.
    expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
    vi.useRealTimers();
  });
});

describe("DraftWorkspace explicit save", () => {
  it("clicking Save Draft commits to git even without an edit first", async () => {
    const user = await openManifest();
    await user.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => {
      expect(mockedSaveFile).toHaveBeenCalledWith("draft-1", "manifest.yaml", "id: acme.text.summarizer\n", {
        syncToGit: true,
      });
    });
  });
});

describe("DraftWorkspace validate", () => {
  it("renders a success message for a passing validation", async () => {
    mockedValidate.mockResolvedValueOnce({
      valid: true,
      errors: [],
      warnings: [],
      certification: null,
    });
    renderWorkspace();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Validate" }));

    expect(await screen.findByText("Valid — ready to publish.")).toBeInTheDocument();
  });

  it("renders each error for a failing validation", async () => {
    mockedValidate.mockResolvedValueOnce({
      valid: false,
      errors: [{ code: "SCHEMA_VALIDATION_FAILED", message: "id is required", file: null }],
      warnings: [],
      certification: null,
    });
    renderWorkspace();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Validate" }));

    expect(await screen.findByText("SCHEMA_VALIDATION_FAILED")).toBeInTheDocument();
    expect(screen.getByText("id is required")).toBeInTheDocument();
  });
});
