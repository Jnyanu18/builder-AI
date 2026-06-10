import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listApprovals, decideApproval } from "@/lib/approvals.functions";
import { ProjectTabs } from "@/components/project-tabs";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { decisionClass, severityClass } from "@/lib/badges";

export const Route = createFileRoute("/_authenticated/projects/$id/approvals")({
  head: () => ({ meta: [{ title: "Approvals — IntentOS" }] }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { id } = useParams({ from: "/_authenticated/projects/$id/approvals" });
  const qc = useQueryClient();
  const listFn = useServerFn(listApprovals);
  const decideFn = useServerFn(decideApproval);
  const { data: approvals } = useQuery({
    queryKey: ["approvals", id],
    queryFn: () => listFn({ data: { projectId: id } }),
  });

  const decide = useMutation({
    mutationFn: (v: { approvalId: string; decision: "approved" | "rejected" }) =>
      decideFn({ data: { approvalId: v.approvalId, decision: v.decision, note: "" } }),
    onSuccess: (res, vars) => {
      toast.success(
        vars.decision === "approved"
          ? "Change approved — new blueprint version created"
          : "Marked as rejected drift",
      );
      qc.invalidateQueries({ queryKey: ["approvals", id] });
      qc.invalidateQueries({ queryKey: ["blueprint", id] });
      qc.invalidateQueries({ queryKey: ["blueprint-versions", id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-display font-bold tracking-tight">Approval Center</h1>
      <ProjectTabs projectId={id} />

      {!approvals || approvals.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center text-muted-foreground">
          No approvals queued. Run a drift analysis on the Alignment tab.
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((a) => {
            const f = a.finding as {
              title?: string;
              description?: string;
              severity?: string;
              category?: string;
              type?: string;
            };
            return (
              <div key={a.id} className="glass rounded-xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-mono uppercase tracking-wider ${severityClass(f.severity ?? "low")}`}
                      >
                        {f.severity}
                      </span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        {f.category}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-mono uppercase tracking-wider ${decisionClass(a.decision)}`}
                      >
                        {a.decision}
                      </span>
                    </div>
                    <div className="font-semibold">{f.title}</div>
                    <p className="text-sm text-muted-foreground mt-1">{f.description}</p>
                  </div>
                  {a.decision === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => decide.mutate({ approvalId: a.id, decision: "rejected" })}
                        disabled={decide.isPending}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-danger/10 hover:text-danger hover:border-danger/40"
                      >
                        <X className="h-4 w-4" /> Reject
                      </button>
                      <button
                        onClick={() => decide.mutate({ approvalId: a.id, decision: "approved" })}
                        disabled={decide.isPending}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        <Check className="h-4 w-4" /> Approve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
