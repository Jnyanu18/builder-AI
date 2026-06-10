import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProjectOverview } from "@/lib/overview.functions";
import { ProjectTabs } from "@/components/project-tabs";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  FileText,
  GitBranch,
  ScanLine,
  ShieldCheck,
  Inbox,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects/$id/")({
  head: () => ({ meta: [{ title: "Overview — IntentOS" }] }),
  component: OverviewPage,
});

function OverviewPage() {
  const { id } = useParams({ from: "/_authenticated/projects/$id/" });
  const fn = useServerFn(getProjectOverview);
  const { data } = useQuery({
    queryKey: ["overview", id],
    queryFn: () => fn({ data: { projectId: id } }),
  });

  if (!data) return <div className="p-8 text-muted-foreground">Loading…</div>;

  const steps = [
    {
      key: "blueprint",
      title: "Approve a blueprint",
      desc: "Write the plan: vision, features, architecture, then approve a version.",
      icon: FileText,
      done: !!data.blueprint.approved,
      href: `/projects/${id}/blueprint`,
      cta: data.blueprint.approved ? "Edit blueprint" : "Open blueprint",
    },
    {
      key: "repo",
      title: "Connect a GitHub repository",
      desc: "Link the repo whose code IntentOS should compare against the plan.",
      icon: GitBranch,
      done: !!data.repository,
      href: `/projects/${id}/repository`,
      cta: data.repository ? "Manage repository" : "Connect repo",
    },
    {
      key: "scan",
      title: "Scan the repository",
      desc: "Build a Reality Model from the current code on the connected branch.",
      icon: ScanLine,
      done: !!data.reality,
      href: `/projects/${id}/repository`,
      cta: data.reality ? "Re-scan" : "Run first scan",
    },
    {
      key: "drift",
      title: "Run drift analysis",
      desc: "Compare the approved blueprint with the scanned reality. Review findings.",
      icon: ShieldCheck,
      done: !!data.drift,
      href: `/projects/${id}/alignment`,
      cta: data.drift ? "View report" : "Run analysis",
    },
    {
      key: "approvals",
      title: "Review approvals",
      desc: "Approve or reject each drift finding to keep the team aligned.",
      icon: Inbox,
      done: !!data.drift && data.pendingApprovals === 0,
      href: `/projects/${id}/approvals`,
      cta: data.pendingApprovals > 0 ? `Review ${data.pendingApprovals} pending` : "View approvals",
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const nextStep = steps.find((s) => !s.done);
  const allDone = completed === total;

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">
          {data.project?.name ?? "Project"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {data.project?.description || "Get this project production-ready in 5 steps."}
        </p>
      </div>
      <ProjectTabs projectId={id} />

      {/* Progress hero */}
      <div className="relative overflow-hidden glass rounded-2xl p-6">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-6 flex-wrap">
          <div>
            <div className="text-[10px] uppercase font-mono tracking-widest text-primary">
              {allDone ? "All set" : "Setup progress"}
            </div>
            <div className="mt-1 font-display text-2xl font-bold">
              {completed} / {total} steps complete
            </div>
          </div>
          {nextStep ? (
            <Link
              to={nextStep.href}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4" /> Next: {nextStep.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <div className="inline-flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" /> Production-ready
            </div>
          )}
        </div>
        <div className="mt-5 h-2 rounded-full bg-background/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary/60 via-primary to-primary transition-all duration-500"
            style={{ width: `${(completed / total) * 100}%`, boxShadow: "0 0 16px var(--primary)" }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-3">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const StatusIcon = s.done ? CheckCircle2 : Circle;
          return (
            <Link
              key={s.key}
              to={s.href}
              className={`group glass glass-hover rounded-xl p-5 flex items-center gap-4 ${
                s.done ? "opacity-90" : ""
              }`}
            >
              <div
                className={`shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${
                  s.done ? "bg-success/15 text-success" : "bg-primary/10 text-primary"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Step {i + 1}
                  </span>
                  {s.done && (
                    <span className="text-[10px] font-mono uppercase tracking-widest text-success">
                      Done
                    </span>
                  )}
                </div>
                <div className="font-display text-base font-semibold">{s.title}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{s.desc}</div>
              </div>
              <StatusIcon
                className={`h-5 w-5 shrink-0 ${s.done ? "text-success" : "text-muted-foreground group-hover:text-primary transition-colors"}`}
              />
            </Link>
          );
        })}
      </div>

      {data.drift && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat label="Alignment" value={`${data.drift.alignment_score}%`} accent="text-primary" />
          <Stat label="Drift" value={`${data.drift.drift_score}%`} accent="text-warning" />
          <Stat label="Findings" value={String((data.drift.findings as unknown[])?.length ?? 0)} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent = "" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-display text-2xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}
