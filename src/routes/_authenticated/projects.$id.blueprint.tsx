import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getLatestBlueprint,
  listBlueprintVersions,
  saveBlueprintDraft,
  approveBlueprint,
} from "@/lib/blueprints.functions";
import { getProject } from "@/lib/projects.functions";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProjectTabs } from "@/components/project-tabs";
import { Plus, X, Check, FileCheck2 } from "lucide-react";
import { EMPTY_BLUEPRINT, type BlueprintDraft } from "@/lib/intent-types";

export const Route = createFileRoute("/_authenticated/projects/$id/blueprint")({
  head: () => ({ meta: [{ title: "Blueprint — IntentOS" }] }),
  component: BlueprintPage,
});

function BlueprintPage() {
  const { id } = useParams({ from: "/_authenticated/projects/$id/blueprint" });
  const qc = useQueryClient();
  const getFn = useServerFn(getLatestBlueprint);
  const listFn = useServerFn(listBlueprintVersions);
  const saveFn = useServerFn(saveBlueprintDraft);
  const approveFn = useServerFn(approveBlueprint);
  const projFn = useServerFn(getProject);

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projFn({ data: { id } }),
  });
  const { data: latest } = useQuery({
    queryKey: ["blueprint", id],
    queryFn: () => getFn({ data: { projectId: id } }),
  });
  const { data: versions } = useQuery({
    queryKey: ["blueprint-versions", id],
    queryFn: () => listFn({ data: { projectId: id } }),
  });

  const [draft, setDraft] = useState<BlueprintDraft>(EMPTY_BLUEPRINT);

  useEffect(() => {
    if (latest) {
      const normalizeFunc = (arr: any[] | null | undefined) => {
        if (!Array.isArray(arr)) return [];
        return arr.map((item: any) => {
          if (typeof item === "object" && item !== null) {
            return {
              name: item.name || item.title || item.id || "",
              description: item.description || "",
              priority: item.priority || "must",
            };
          }
          return { name: String(item), description: "", priority: "must" };
        });
      };

      const normalizeNonFunc = (arr: any[] | null | undefined) => {
        if (!Array.isArray(arr)) return [];
        return arr.map((item: any) => {
          if (typeof item === "object" && item !== null) {
            return {
              category: item.category || "General",
              requirement: item.requirement || item.title || item.id || "",
            };
          }
          return { category: "General", requirement: String(item) };
        });
      };

      const normalizeConstraints = (arr: any[] | null | undefined) => {
        if (!Array.isArray(arr)) return [];
        return arr.map((item: any) => {
          if (typeof item === "object" && item !== null) {
            return {
              rule: item.rule || item.title || item.id || "",
              rationale: item.rationale || "",
            };
          }
          return { rule: String(item), rationale: "" };
        });
      };

      const normalizeMilestones = (arr: any[] | null | undefined) => {
        if (!Array.isArray(arr)) return [];
        return arr.map((item: any) => {
          if (typeof item === "object" && item !== null) {
            return {
              name: item.name || item.title || item.id || "",
              target_date: item.target_date || "",
              description: item.description || "",
            };
          }
          return { name: String(item), target_date: "", description: "" };
        });
      };

      const normalizeMetrics = (arr: any[] | null | undefined) => {
        if (!Array.isArray(arr)) return [];
        return arr.map((item: any) => {
          if (typeof item === "object" && item !== null) {
            return {
              name: item.name || item.title || item.id || "",
              target: item.target || "",
            };
          }
          return { name: String(item), target: "" };
        });
      };

      setDraft({
        vision: latest.vision || "",
        personas: (latest.personas as never) || [],
        functional_reqs: normalizeFunc(latest.functional_reqs),
        nonfunctional_reqs: normalizeNonFunc(latest.nonfunctional_reqs),
        architecture: (latest.architecture as never) || EMPTY_BLUEPRINT.architecture,
        constraints: normalizeConstraints(latest.constraints),
        milestones: normalizeMilestones(latest.milestones),
        success_metrics: normalizeMetrics(latest.success_metrics),
      });
    }
  }, [latest]);

  const save = useMutation({
    mutationFn: () => saveFn({ data: { projectId: id, draft } }),
    onSuccess: () => {
      toast.success("Draft saved");
      qc.invalidateQueries({ queryKey: ["blueprint", id] });
      qc.invalidateQueries({ queryKey: ["blueprint-versions", id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const approve = useMutation({
    mutationFn: async () => {
      await saveFn({ data: { projectId: id, draft } });
      const fresh = await getFn({ data: { projectId: id } });
      if (!fresh) throw new Error("No draft to approve");
      return approveFn({ data: { versionId: fresh.id } });
    },
    onSuccess: () => {
      toast.success("Blueprint approved");
      qc.invalidateQueries({ queryKey: ["blueprint", id] });
      qc.invalidateQueries({ queryKey: ["blueprint-versions", id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const isDraft = latest?.is_draft ?? true;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">
          {project?.name ?? "Project"}
        </h1>
        <p className="text-muted-foreground mt-1">
          The approved source of truth for what this software is meant to be.
        </p>
      </div>
      <ProjectTabs projectId={id} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-mono uppercase tracking-widest text-primary">
          <FileCheck2 className="h-3 w-3" />
          {latest
            ? `Version ${latest.version_number}${isDraft ? " · draft" : " · approved"}`
            : "No version"}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/40 disabled:opacity-50"
          >
            {save.isPending ? "Saving…" : "Save draft"}
          </button>
          <button
            onClick={() => approve.mutate()}
            disabled={approve.isPending || !isDraft}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> Approve version
          </button>
        </div>
      </div>

      <Section title="Product Vision">
        <textarea
          value={draft.vision}
          onChange={(e) => setDraft({ ...draft, vision: e.target.value })}
          rows={4}
          placeholder="What is this software and why does it exist?"
          className="w-full rounded-lg border border-border bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
      </Section>

      <Section title="User Personas">
        <ListEditor
          items={draft.personas}
          empty={{ name: "", description: "" }}
          onChange={(personas) => setDraft({ ...draft, personas })}
          render={(item, update) => (
            <>
              <input
                value={item.name}
                onChange={(e) => update({ ...item, name: e.target.value })}
                placeholder="Persona name"
                className="flex-1 min-w-[160px] rounded border border-border bg-background/40 px-2 py-1.5 text-sm"
              />
              <input
                value={item.description}
                onChange={(e) => update({ ...item, description: e.target.value })}
                placeholder="Description"
                className="flex-[2] min-w-[200px] rounded border border-border bg-background/40 px-2 py-1.5 text-sm"
              />
            </>
          )}
        />
      </Section>

      <Section title="Functional Requirements (Features)">
        <ListEditor
          items={draft.functional_reqs}
          empty={{ name: "", description: "", priority: "must" as const }}
          onChange={(functional_reqs) => setDraft({ ...draft, functional_reqs })}
          render={(item, update) => (
            <>
              <input
                value={item.name}
                onChange={(e) => update({ ...item, name: e.target.value })}
                placeholder="Feature name"
                className="flex-1 min-w-[160px] rounded border border-border bg-background/40 px-2 py-1.5 text-sm"
              />
              <input
                value={item.description}
                onChange={(e) => update({ ...item, description: e.target.value })}
                placeholder="Description"
                className="flex-[2] min-w-[200px] rounded border border-border bg-background/40 px-2 py-1.5 text-sm"
              />
              <select
                value={item.priority}
                onChange={(e) =>
                  update({ ...item, priority: e.target.value as "must" | "should" | "could" })
                }
                className="rounded border border-border bg-background/40 px-2 py-1.5 text-sm"
              >
                <option value="must">must</option>
                <option value="should">should</option>
                <option value="could">could</option>
              </select>
            </>
          )}
        />
      </Section>

      <Section title="Non-Functional Requirements">
        <ListEditor
          items={draft.nonfunctional_reqs}
          empty={{ category: "", requirement: "" }}
          onChange={(nonfunctional_reqs) => setDraft({ ...draft, nonfunctional_reqs })}
          render={(item, update) => (
            <>
              <input
                value={item.category}
                onChange={(e) => update({ ...item, category: e.target.value })}
                placeholder="Category (performance, security, …)"
                className="flex-1 min-w-[160px] rounded border border-border bg-background/40 px-2 py-1.5 text-sm"
              />
              <input
                value={item.requirement}
                onChange={(e) => update({ ...item, requirement: e.target.value })}
                placeholder="Requirement"
                className="flex-[2] min-w-[200px] rounded border border-border bg-background/40 px-2 py-1.5 text-sm"
              />
            </>
          )}
        />
      </Section>

      <Section title="Architecture">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(["frontend", "backend", "database", "infrastructure", "pattern"] as const).map((k) => (
            <div key={k}>
              <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
                {k}
              </label>
              <input
                value={draft.architecture[k] ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    architecture: { ...draft.architecture, [k]: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Constraints">
        <ListEditor
          items={draft.constraints}
          empty={{ rule: "", rationale: "" }}
          onChange={(constraints) => setDraft({ ...draft, constraints })}
          render={(item, update) => (
            <>
              <input
                value={item.rule}
                onChange={(e) => update({ ...item, rule: e.target.value })}
                placeholder='e.g. "Monolith only — no microservices"'
                className="flex-1 min-w-[200px] rounded border border-border bg-background/40 px-2 py-1.5 text-sm"
              />
              <input
                value={item.rationale}
                onChange={(e) => update({ ...item, rationale: e.target.value })}
                placeholder="Rationale"
                className="flex-[2] min-w-[200px] rounded border border-border bg-background/40 px-2 py-1.5 text-sm"
              />
            </>
          )}
        />
      </Section>

      <Section title="Milestones">
        <ListEditor
          items={draft.milestones}
          empty={{ name: "", target_date: "", description: "" }}
          onChange={(milestones) => setDraft({ ...draft, milestones })}
          render={(item, update) => (
            <>
              <input
                value={item.name}
                onChange={(e) => update({ ...item, name: e.target.value })}
                placeholder="Milestone"
                className="flex-1 min-w-[160px] rounded border border-border bg-background/40 px-2 py-1.5 text-sm"
              />
              <input
                value={item.target_date}
                onChange={(e) => update({ ...item, target_date: e.target.value })}
                placeholder="Target"
                className="w-32 rounded border border-border bg-background/40 px-2 py-1.5 text-sm"
              />
              <input
                value={item.description}
                onChange={(e) => update({ ...item, description: e.target.value })}
                placeholder="Notes"
                className="flex-[2] min-w-[200px] rounded border border-border bg-background/40 px-2 py-1.5 text-sm"
              />
            </>
          )}
        />
      </Section>

      <Section title="Success Metrics">
        <ListEditor
          items={draft.success_metrics}
          empty={{ name: "", target: "" }}
          onChange={(success_metrics) => setDraft({ ...draft, success_metrics })}
          render={(item, update) => (
            <>
              <input
                value={item.name}
                onChange={(e) => update({ ...item, name: e.target.value })}
                placeholder="Metric"
                className="flex-1 min-w-[160px] rounded border border-border bg-background/40 px-2 py-1.5 text-sm"
              />
              <input
                value={item.target}
                onChange={(e) => update({ ...item, target: e.target.value })}
                placeholder="Target"
                className="flex-1 min-w-[160px] rounded border border-border bg-background/40 px-2 py-1.5 text-sm"
              />
            </>
          )}
        />
      </Section>

      {versions && versions.length > 0 && (
        <Section title="Version history">
          <div className="space-y-2">
            {versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-background/30 px-4 py-2 text-sm"
              >
                <span className="font-mono">V{v.version_number}</span>
                <span className={v.is_draft ? "text-muted-foreground" : "text-success"}>
                  {v.is_draft
                    ? "draft"
                    : `approved ${v.approved_at ? new Date(v.approved_at).toLocaleDateString() : ""}`}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl p-6">
      <h3 className="font-display text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function ListEditor<T>({
  items,
  empty,
  onChange,
  render,
}: {
  items: T[];
  empty: T;
  onChange: (items: T[]) => void;
  render: (item: T, update: (next: T) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex flex-wrap items-center gap-2">
          {render(item, (next) => {
            const arr = [...items];
            arr[idx] = next;
            onChange(arr);
          })}
          <button
            onClick={() => onChange(items.filter((_, i) => i !== idx))}
            className="rounded p-1.5 text-muted-foreground hover:text-danger"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, structuredClone(empty)])}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <Plus className="h-3 w-3" /> Add
      </button>
    </div>
  );
}
