"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useRef, useState, type TouchEvent } from "react";
import type { editor as MonacoEditorNS } from "monaco-editor";

import { FileTree } from "@/components/drafts/file-tree";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getSkillFileAction,
  getSkillSourceFileAction,
  listSkillSourceFilesAction,
} from "@/lib/actions";
import { languageForPath } from "@/lib/monaco-language";
import { cn } from "@/lib/utils";

function FileBrowserPane({
  files,
  openFile,
  activePath,
  content,
  loading,
  monacoTheme,
  emptyHint,
}: {
  files: string[];
  openFile: (path: string) => void;
  activePath: string | null;
  content: string | null;
  loading: boolean;
  monacoTheme: string;
  emptyHint: string;
}) {
  // A fixed, generous height rather than h-full/flex-1: this page (unlike
  // the draft workspace) is a normal document that scrolls inside
  // AppShell's <main overflow-y-auto>, not a fixed-viewport layout — so
  // there's no bounded ancestor height for flex-1 to fill in the first
  // place. A fixed height gives FileTree's own internal
  // `flex-1 overflow-y-auto` a real, always-adequate box to scroll
  // within (comfortably fits the 5-file package list with room to spare,
  // and scrolls internally for a larger source-repo tree) regardless of
  // how tall the rest of the page is.
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const lastTouchYRef = useRef<number | null>(null);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  // Monaco's own touch handling (vs/base/browser/touch.js's `Gesture`)
  // preventDefaults every touchmove over the editor unconditionally, even
  // when the editor has nothing left to scroll — which, on a page that
  // scrolls its *ancestor* (not the editor itself), permanently traps the
  // gesture and the surrounding page never moves. We only want Monaco to
  // keep the gesture when it's actually going to do something with it: it
  // has overflow, and the swipe direction still has room to move inside
  // it. Otherwise we stop the touch here (before it bubbles to Monaco's
  // document-level listener) so the browser's native scroll takes over,
  // exactly like it would for any other nested scroll container.
  function handleTouchStart(e: TouchEvent) {
    lastTouchYRef.current = e.touches[0]?.clientY ?? null;
  }

  function handleTouchMove(e: TouchEvent) {
    const editor = editorRef.current;
    const touchY = e.touches[0]?.clientY;
    const lastY = lastTouchYRef.current;
    if (!editor || touchY == null || lastY == null) return;
    const deltaY = touchY - lastY;
    lastTouchYRef.current = touchY;

    const scrollTop = editor.getScrollTop();
    const scrollHeight = editor.getScrollHeight();
    const viewHeight = editor.getLayoutInfo().height;
    const noOverflow = scrollHeight <= viewHeight;
    const atTop = scrollTop <= 0;
    const atBottom = scrollTop + viewHeight >= scrollHeight - 1;

    if (noOverflow || (deltaY > 0 && atTop) || (deltaY < 0 && atBottom)) {
      e.stopPropagation();
    }
  }

  return (
    <div className="flex h-[28rem] border-t border-border">
      <div className="w-56 shrink-0">
        <FileTree files={files} activePath={activePath} onSelect={openFile} readOnly />
      </div>
      <div
        className="min-w-0 flex-1"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : activePath && content !== null ? (
          <Editor
            path={activePath}
            language={languageForPath(activePath)}
            value={content}
            theme={monacoTheme}
            onMount={handleEditorMount}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              fontLigatures: false,
              automaticLayout: true,
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {emptyHint}
          </div>
        )}
      </div>
    </div>
  );
}

/** Read-only file browser for a published, immutable version — same
 * FileTree component the draft workspace uses (readOnly=true disables
 * create/delete), but no tabs/autosave/validate/publish: there is nothing
 * to save here. To edit, fork via "New Version" into a draft instead.
 *
 * Two tabs: the narrow, signed **published package** (manifest.yaml + 3
 * docs + entrypoint — what `files` below always is), and, when this
 * version has recorded git provenance, the **full source repo tree at the
 * release tag**, fetched live from GitHub only once that tab is opened. */
export function SkillFilesViewer({
  skillId,
  version,
  files,
  hasSourceRepo,
  className,
}: {
  skillId: string;
  version: string;
  files: string[];
  /** Whether this version has a source repo/ref recorded at all — gates
   * whether the "Source repo" tab shows up (no point offering a tab that
   * will always say "no source repository recorded"). */
  hasSourceRepo: boolean;
  className?: string;
}) {
  const { resolvedTheme, theme } = useTheme();
  const monacoTheme = (resolvedTheme ?? theme) === "light" || theme === "ocean" ? "vs" : "vs-dark";

  const [activeTab, setActiveTab] = useState<"package" | "source">("package");

  const [packageActivePath, setPackageActivePath] = useState<string | null>(null);
  const [packageContent, setPackageContent] = useState<string | null>(null);
  const [packageLoading, setPackageLoading] = useState(false);

  async function openPackageFile(path: string) {
    setPackageActivePath(path);
    setPackageLoading(true);
    setPackageContent(await getSkillFileAction(skillId, version, path));
    setPackageLoading(false);
  }

  const [sourceState, setSourceState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "unavailable"; reason: string }
    | { status: "ready"; files: string[] }
  >({ status: "idle" });
  const [sourceActivePath, setSourceActivePath] = useState<string | null>(null);
  const [sourceContent, setSourceContent] = useState<string | null>(null);
  const [sourceFileLoading, setSourceFileLoading] = useState(false);

  async function loadSourceTree() {
    setSourceState({ status: "loading" });
    const result = await listSkillSourceFilesAction(skillId, version);
    if (result.available) {
      setSourceState({ status: "ready", files: result.files });
    } else {
      setSourceState({
        status: "unavailable",
        reason: result.reason ?? "Source repository is not available to browse.",
      });
    }
  }

  async function openSourceFile(path: string) {
    setSourceActivePath(path);
    setSourceFileLoading(true);
    setSourceContent(await getSkillSourceFileAction(skillId, version, path));
    setSourceFileLoading(false);
  }

  if (files.length === 0) {
    return null;
  }

  if (!hasSourceRepo) {
    return (
      <Card className={cn("flex flex-col", className)}>
        <CardHeader>
          <CardTitle className="text-base">Files</CardTitle>
          <CardDescription>
            The published package: manifest.yaml, schema.json, permissions.yaml,
            dependencies.yaml, and the entrypoint file manifest.yaml declares. Other files in the
            source repo (tests, examples, docs, etc.) aren&apos;t part of the published archive.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <FileBrowserPane
            files={files}
            openFile={openPackageFile}
            activePath={packageActivePath}
            content={packageContent}
            loading={packageLoading}
            monacoTheme={monacoTheme}
            emptyHint="Select a file to view its content."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <CardTitle className="text-base">Files</CardTitle>
        <CardDescription>Package vs. the full repo at the release tag.</CardDescription>
        {/* CardAction is CardHeader's own documented "put something in the
         * top-right" slot (data-slot="card-action" flips CardHeader's grid
         * to grid-cols-[1fr_auto]) — a plain className override doesn't
         * actually switch CardHeader off `grid` (its own base display
         * utility), so an un-slotted child here just wraps onto its own
         * row, silently growing the header and stealing height from
         * CardContent below it. Tabs here only drives the trigger
         * buttons' active styling — the panel body below is plain
         * conditional rendering on `activeTab`, not TabsContent. */}
        <CardAction>
          <Tabs
            value={activeTab}
            onValueChange={(tab) => {
              const next = tab as "package" | "source";
              setActiveTab(next);
              if (next === "source" && sourceState.status === "idle") {
                void loadSourceTree();
              }
            }}
          >
            <TabsList>
              <TabsTrigger value="package">Published package</TabsTrigger>
              <TabsTrigger value="source">Source repo (at tag)</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        {activeTab === "package" ? (
          <FileBrowserPane
            files={files}
            openFile={openPackageFile}
            activePath={packageActivePath}
            content={packageContent}
            loading={packageLoading}
            monacoTheme={monacoTheme}
            emptyHint="Select a file to view its content."
          />
        ) : sourceState.status === "loading" || sourceState.status === "idle" ? (
          <div className="flex h-[28rem] items-center justify-center border-t border-border">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : sourceState.status === "unavailable" ? (
          <div className="flex h-[28rem] items-center justify-center border-t border-border px-6 text-center text-sm text-muted-foreground">
            {sourceState.reason}
          </div>
        ) : (
          <FileBrowserPane
            files={sourceState.files}
            openFile={openSourceFile}
            activePath={sourceActivePath}
            content={sourceContent}
            loading={sourceFileLoading}
            monacoTheme={monacoTheme}
            emptyHint="Select a file to view its content."
          />
        )}
      </CardContent>
    </Card>
  );
}
