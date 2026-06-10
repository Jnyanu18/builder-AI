import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLatestDriftReport, runDriftAnalysis } from "@/lib/drift.functions";
import { ProjectTabs } from "@/components/project-tabs";
import { AlignmentErrorBoundary } from "@/components/alignment-error-boundary";
import { toast } from "sonner";
import {
  Play,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertCircle,
} from "lucide-react";
import { severityClass } from "@/lib/badges";
import type { Finding } from "@/lib/intent-types";
import { useEffect, useMemo, useRef, useState } from "react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

export const Route = createFileRoute("/_authenticated/projects/$id/alignment")({
  head: () => ({ meta: [{ title: "Alignment — IntentOS" }] }),
  component: AlignmentRoute,
});

const KNOWN_TYPES: ReadonlyArray<Finding["type"]> = [
  "missing",
  "unexpected",
  "partial",
  "violation",
];

function AlignmentRoute() {
  const { id } = useParams({ from: "/_authenticated/projects/$id/alignment" });
  const getFn = useServerFn(getLatestDriftReport);
  const { data: report } = useQuery({
    queryKey: ["drift", id],
    queryFn: () => getFn({ data: { projectId: id } }),
  });
  return (
    <AlignmentErrorBoundary projectId={id} debugPayload={report}>
      <AlignmentPage />
    </AlignmentErrorBoundary>
  );
}

const TYPE_ICON: Record<Finding["type"], typeof CheckCircle2> = {
  missing: XCircle,
  unexpected: AlertCircle,
  partial: MinusCircle,
  violation: AlertTriangle,
};
const TYPE_COLOR: Record<Finding["type"], string> = {
  missing: "text-danger",
  unexpected: "text-warning",
  partial: "text-info",
  violation: "text-danger",
};

function AlignmentPage() {
  const { id } = useParams({ from: "/_authenticated/projects/$id/alignment" });
  const qc = useQueryClient();
  const getFn = useServerFn(getLatestDriftReport);
  const runFn = useServerFn(runDriftAnalysis);
  const { data: report } = useQuery({
    queryKey: ["drift", id],
    queryFn: () => getFn({ data: { projectId: id } }),
  });

  const findings = (report?.findings as Finding[]) ?? [];
  const fc = (report?.feature_coverage as { implemented?: number; total?: number }) ?? {};
  const [selected, setSelected] = useState(0);
  const [filter, setFilter] = useState<"all" | Finding["type"]>("all");

  // --- Diagnostic: detect malformed findings BEFORE they reach the render path.
  const anomalies = useMemo(() => {
    return findings
      .map((f, idx) => {
        const issues: string[] = [];
        if (!f || typeof f !== "object") issues.push("not-an-object");
        else {
          if (!KNOWN_TYPES.includes(f.type)) issues.push(`unknown-type:${String(f?.type)}`);
          if (!f.title) issues.push("missing-title");
          if (!f.severity) issues.push("missing-severity");
        }
        return issues.length ? { idx, issues, finding: f } : null;
      })
      .filter(Boolean) as Array<{ idx: number; issues: string[]; finding: unknown }>;
  }, [findings]);

  const reportedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!report || anomalies.length === 0) return;
    const fingerprint = `${report.id ?? "no-id"}:${anomalies.map((a) => a.idx).join(",")}`;
    if (reportedRef.current === fingerprint) return;
    reportedRef.current = fingerprint;
    // eslint-disable-next-line no-console
    console.warn("[alignment] malformed findings detected", {
      projectId: id,
      reportId: report.id,
      count: anomalies.length,
      anomalies,
    });
    reportLovableError(new Error(`Alignment: ${anomalies.length} malformed finding(s)`), {
      area: "alignment",
      severity: "warning",
      projectId: id,
      reportId: report.id,
      anomalies,
    });
  }, [report, anomalies, id]);

  const run = useMutation({
    mutationFn: () => runFn({ data: { projectId: id } }),
    onSuccess: (result) => {
      if (!result.ok) return toast.error(result.message);
      toast.success(`Analysis complete — ${result.findings} finding(s)`);
      qc.invalidateQueries({ queryKey: ["drift", id] });
      qc.invalidateQueries({ queryKey: ["approvals", id] });
      setSelected(0);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const filtered = filter === "all" ? findings : findings.filter((f) => f.type === filter);
  const active = filtered[selected];

  const counts = {
    missing: findings.filter((f) => f.type === "missing").length,
    partial: findings.filter((f) => f.type === "partial").length,
    unexpected: findings.filter((f) => f.type === "unexpected").length,
    violation: findings.filter((f) => f.type === "violation").length,
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-display font-bold tracking-tight">Plan vs Implementation</h1>
        <button
          onClick={() => run.mutate()}
          disabled={run.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Play className="h-4 w-4" /> {run.isPending ? "Analyzing…" : "Run drift analysis"}
        </button>
      </div>
      <ProjectTabs projectId={id} />

      {!report ? (
        <div className="glass rounded-2xl p-12 text-center">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto" />
          <h2 className="mt-4 text-xl font-display font-semibold">No report yet</h2>
          <p className="mt-2 text-muted-foreground">
            Approve a blueprint, connect a repo, scan it, then run drift analysis.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="Alignment" value={`${report.alignment_score}%`} color="text-primary" />
            <Metric label="Drift" value={`${report.drift_score}%`} color="text-warning" />
            <Metric label="Coverage" value={`${fc.implemented ?? 0} / ${fc.total ?? 0}`} />
            <Metric label="Findings" value={`${findings.length}`} />
          </div>

          {report.summary && (
            <div className="glass rounded-xl p-5">
              <div className="text-xs uppercase font-mono tracking-widest text-muted-foreground mb-2">
                Verdict
              </div>
              <p className="text-sm">{report.summary}</p>
            </div>
          )}

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2">
            <Chip
              label={`All (${findings.length})`}
              active={filter === "all"}
              onClick={() => {
                setFilter("all");
                setSelected(0);
              }}
            />
            <Chip
              label={`Missing (${counts.missing})`}
              active={filter === "missing"}
              onClick={() => {
                setFilter("missing");
                setSelected(0);
              }}
              color="text-danger"
            />
            <Chip
              label={`Partial (${counts.partial})`}
              active={filter === "partial"}
              onClick={() => {
                setFilter("partial");
                setSelected(0);
              }}
              color="text-info"
            />
            <Chip
              label={`Unexpected (${counts.unexpected})`}
              active={filter === "unexpected"}
              onClick={() => {
                setFilter("unexpected");
                setSelected(0);
              }}
              color="text-warning"
            />
            <Chip
              label={`Violation (${counts.violation})`}
              active={filter === "violation"}
              onClick={() => {
                setFilter("violation");
                setSelected(0);
              }}
              color="text-danger"
            />
          </div>

          {findings.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
              <p className="mt-3 text-sm text-muted-foreground">
                Implementation matches the plan. No drift detected.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 min-h-[420px]">
              {/* Checklist */}
              <div className="glass rounded-xl p-2 overflow-y-auto max-h-[70vh]">
                {filtered.map((f, i) => {
                  const Icon = TYPE_ICON[f.type] ?? AlertCircle;
                  const colorClass = TYPE_COLOR[f.type] ?? "text-muted-foreground";
                  const isActive = i === selected;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelected(i)}
                      className={`w-full text-left rounded-lg px-3 py-2.5 text-sm transition-colors flex items-start gap-2.5 ${
                        isActive
                          ? "bg-primary/15 border border-primary/30"
                          : "border border-transparent hover:bg-accent/40"
                      }`}
                    >
                      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${colorClass}`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{f.title}</div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">
                          {f.category} · {f.type}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No findings of this type.
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="glass rounded-xl p-6">
                {active ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-mono uppercase tracking-wider ${severityClass(active.severity)}`}
                      >
                        <AlertTriangle className="h-3 w-3" /> {active.severity}
                      </span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        {active.category}
                      </span>
                      <span
                        className={`rounded-full border border-border px-2 py-0.5 text-xs font-mono uppercase tracking-wider ${TYPE_COLOR[active.type] ?? "text-muted-foreground"}`}
                      >
                        {active.type}
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-semibold">{active.title}</h3>
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                      {active.description}
                    </p>

                    {active.evidence && (
                      <div className="mt-5">
                        <div className="text-xs uppercase font-mono tracking-widest text-muted-foreground mb-2">
                          Evidence from code
                        </div>
                        <pre className="text-xs font-mono whitespace-pre-wrap rounded-lg border border-border/60 bg-background/40 p-3 leading-relaxed">
                          {active.evidence}
                        </pre>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Select a finding from the list.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Metric({ label, value, color = "" }: { label: string; value: string; color?: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1.5 font-display text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
  color = "",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
        active
          ? "bg-primary/15 border-primary/40 text-foreground"
          : "border-border text-muted-foreground hover:text-foreground"
      } ${color}`}
    >
      {label}
    </button>
  );
}
