import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProject } from "@/lib/projects.functions";
import { listDocs, getDoc, createDoc, updateDoc, deleteDoc } from "@/lib/docs.functions";
import { ProjectTabs } from "@/components/project-tabs";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Plus,
  FileText,
  Trash2,
  Bold,
  Italic,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Quote,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects/$id/docs")({
  head: () => ({ meta: [{ title: "Docs — IntentOS" }] }),
  component: DocsPage,
});

function DocsPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getProjectFn = useServerFn(getProject);
  const listFn = useServerFn(listDocs);
  const getFn = useServerFn(getDoc);
  const createFn = useServerFn(createDoc);
  const updateFn = useServerFn(updateDoc);
  const deleteFn = useServerFn(deleteDoc);

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProjectFn({ data: { id } }),
  });
  const { data: docs } = useQuery({
    queryKey: ["docs", id],
    queryFn: () => listFn({ data: { projectId: id } }),
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    if (!activeId && docs && docs.length > 0) setActiveId(docs[0].id);
  }, [docs, activeId]);

  const { data: activeDoc } = useQuery({
    queryKey: ["doc", activeId],
    queryFn: () => getFn({ data: { id: activeId! } }),
    enabled: !!activeId,
  });

  const create = useMutation({
    mutationFn: () => createFn({ data: { projectId: id, title: "Untitled" } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["docs", id] });
      setActiveId(r.id);
    },
  });

  const remove = useMutation({
    mutationFn: (docId: string) => deleteFn({ data: { id: docId } }),
    onSuccess: (_r, docId) => {
      qc.invalidateQueries({ queryKey: ["docs", id] });
      if (activeId === docId) setActiveId(null);
    },
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-2 text-sm">
        <Link to="/projects" className="text-muted-foreground hover:text-foreground">
          ← Projects
        </Link>
      </div>
      <h1 className="text-3xl font-display font-bold tracking-tight">{project?.name}</h1>
      <p className="text-muted-foreground mt-1">Team docs and notes.</p>
      <ProjectTabs projectId={id} />

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-12 md:col-span-3 glass rounded-xl p-4 h-fit">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-sm font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Pages
            </h2>
            <button
              onClick={() => create.mutate()}
              className="text-xs inline-flex items-center gap-1 rounded-md bg-primary/15 text-primary px-2 py-1 hover:bg-primary/25"
            >
              <Plus className="h-3 w-3" /> New
            </button>
          </div>
          <div className="space-y-0.5">
            {(docs ?? []).map((d) => (
              <div
                key={d.id}
                className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer ${activeId === d.id ? "bg-primary/15 text-foreground" : "hover:bg-accent/40 text-muted-foreground"}`}
                onClick={() => setActiveId(d.id)}
              >
                <span className="text-base leading-none w-4">{d.icon ?? "📄"}</span>
                <span className="flex-1 truncate">{d.title || "Untitled"}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this page?")) remove.mutate(d.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {(docs?.length ?? 0) === 0 && (
              <div className="text-xs text-muted-foreground px-2 py-6 text-center">
                <FileText className="h-6 w-6 mx-auto mb-2 opacity-50" />
                No pages yet
              </div>
            )}
          </div>
        </aside>

        <main className="col-span-12 md:col-span-9">
          {activeDoc ? (
            <DocEditor
              key={activeDoc.id}
              doc={activeDoc}
              onChange={(patch) => updateFn({ data: { id: activeDoc.id, ...patch } })}
              onTitleSaved={() => qc.invalidateQueries({ queryKey: ["docs", id] })}
            />
          ) : (
            <div className="glass rounded-xl p-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-60" />
              <p>Select a page or create one to start writing.</p>
              <button
                onClick={() => create.mutate()}
                className="mt-4 inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> New page
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

type DocRow = { id: string; title: string; icon: string | null; content: unknown };

function DocEditor({
  doc,
  onChange,
  onTitleSaved,
}: {
  doc: DocRow;
  onChange: (patch: {
    title?: string;
    icon?: string | null;
    content?: unknown;
  }) => Promise<unknown>;
  onTitleSaved: () => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [icon, setIcon] = useState(doc.icon ?? "📄");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Type '/' for blocks, or just start writing…" }),
    ],
    content: (doc.content as object) ?? { type: "doc", content: [] },
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm md:prose-base max-w-none focus:outline-none min-h-[400px]",
      },
    },
    onUpdate: ({ editor }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        onChange({ content: editor.getJSON() });
      }, 600);
    },
  });

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  function commitTitle() {
    if (title !== doc.title || icon !== (doc.icon ?? "📄")) {
      onChange({ title, icon }).then(onTitleSaved);
    }
  }

  if (!editor) return null;

  return (
    <div className="glass rounded-xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <input
          value={icon}
          onChange={(e) => setIcon(e.target.value.slice(0, 4))}
          onBlur={commitTitle}
          className="w-12 text-3xl bg-transparent text-center focus:outline-none"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          placeholder="Untitled"
          className="flex-1 text-3xl font-display font-bold tracking-tight bg-transparent focus:outline-none"
        />
      </div>

      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;
  const btn = (
    active: boolean,
    onClick: () => void,
    Icon: React.ComponentType<{ className?: string }>,
  ) => (
    <button
      type="button"
      onClick={onClick}
      className={`p-2 rounded-md hover:bg-accent/40 ${active ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-1 border border-border/60 rounded-lg p-1 mb-4 sticky top-2 bg-background/80 backdrop-blur z-10">
      {btn(
        editor.isActive("heading", { level: 1 }),
        () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        Heading1,
      )}
      {btn(
        editor.isActive("heading", { level: 2 }),
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        Heading2,
      )}
      <div className="w-px h-5 bg-border/60 mx-1" />
      {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), Bold)}
      {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), Italic)}
      {btn(editor.isActive("code"), () => editor.chain().focus().toggleCode().run(), Code)}
      <div className="w-px h-5 bg-border/60 mx-1" />
      {btn(
        editor.isActive("bulletList"),
        () => editor.chain().focus().toggleBulletList().run(),
        List,
      )}
      {btn(
        editor.isActive("orderedList"),
        () => editor.chain().focus().toggleOrderedList().run(),
        ListOrdered,
      )}
      {btn(
        editor.isActive("taskList"),
        () => editor.chain().focus().toggleTaskList().run(),
        CheckSquare,
      )}
      {btn(
        editor.isActive("blockquote"),
        () => editor.chain().focus().toggleBlockquote().run(),
        Quote,
      )}
    </div>
  );
}
