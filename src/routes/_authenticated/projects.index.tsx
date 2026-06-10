import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listProjects, createProject, deleteProject } from "@/lib/projects.functions";
import { useState } from "react";
import { Plus, FolderKanban, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({ meta: [{ title: "Projects — IntentOS" }] }),
  component: Projects,
});

function Projects() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listFn = useServerFn(listProjects);
  const createFn = useServerFn(createProject);
  const deleteFn = useServerFn(deleteProject);
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => listFn() });
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const create = useMutation({
    mutationFn: (vars: { name: string; description: string }) => createFn({ data: vars }),
    onSuccess: (p) => {
      toast.success("Project created");
      qc.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: `/projects/${p.id}/blueprint` });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Project deleted");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Every project has its own blueprint and verification loop.
          </p>
        </div>
        <button
          onClick={() => setShow(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New project
        </button>
      </div>

      {!projects ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <FolderKanban className="h-12 w-12 text-primary mx-auto" />
          <h2 className="mt-4 text-xl font-display font-semibold">No projects yet</h2>
          <p className="mt-2 text-muted-foreground">Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="glass glass-hover rounded-xl p-5 flex flex-col">
              <Link to={`/projects/${p.id}/blueprint`} className="flex-1">
                <h3 className="font-display text-lg font-semibold">{p.name}</h3>
                {p.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                )}
                <div className="mt-4 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  {new Date(p.updated_at).toLocaleDateString()}
                </div>
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Delete "${p.name}"?`)) remove.mutate(p.id);
                }}
                className="mt-3 self-end text-xs text-muted-foreground hover:text-danger transition-colors flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {show && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={() => setShow(false)}
        >
          <div
            className="glass rounded-2xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-display font-semibold">New project</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate({ name, description: desc });
              }}
              className="mt-4 space-y-3"
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Project name"
                className="w-full rounded-lg border border-border bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
                className="w-full rounded-lg border border-border bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShow(false)}
                  className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={create.isPending}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {create.isPending ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
