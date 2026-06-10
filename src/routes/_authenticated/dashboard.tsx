import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listProjects } from "@/lib/projects.functions";
import { getDashboardData, listHistory } from "@/lib/history.functions";
import { listMembers } from "@/lib/members.functions";
import { listChat } from "@/lib/chat.functions";
import { listDocs } from "@/lib/docs.functions";
import { acceptPendingInvites } from "@/lib/members.functions";
import { seedSampleProjectIfEmpty } from "@/lib/seed.functions";
import { useState, useEffect } from "react";
import {
  FolderKanban,
  ShieldCheck,
  AlertTriangle,
  Inbox,
  GitBranch,
  ArrowRight,
  FileCheck2,
  Users,
  MessageSquare,
  BookOpen,
  Activity,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — IntentOS" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const listFn = useServerFn(listProjects);
  const seedFn = useServerFn(seedSampleProjectIfEmpty);
  const qc = useQueryClient();
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => listFn() });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (projects && projects.length > 0 && !selectedId) setSelectedId(projects[0].id);
  }, [projects, selectedId]);

  // First-run: seed a sample project so new users have something to explore.
  useEffect(() => {
    if (!projects || projects.length > 0) return;
    seedFn()
      .then((res) => {
        if (res?.seeded) qc.invalidateQueries({ queryKey: ["projects"] });
      })
      .catch(() => {
        /* non-fatal */
      });
  }, [projects, seedFn, qc]);

  // Accept any pending email invites once on dashboard load
  const acceptFn = useServerFn(acceptPendingInvites);
  useEffect(() => {
    acceptFn();
  }, [acceptFn]);

  const dashFn = useServerFn(getDashboardData);
  const membersFn = useServerFn(listMembers);
  const chatFn = useServerFn(listChat);
  const docsFn = useServerFn(listDocs);
  const histFn = useServerFn(listHistory);

  const enabled = !!selectedId;
  const { data: dash } = useQuery({
    queryKey: ["dashboard", selectedId],
    queryFn: () => dashFn({ data: { projectId: selectedId! } }),
    enabled,
  });
  const { data: members } = useQuery({
    queryKey: ["members", selectedId],
    queryFn: () => membersFn({ data: { projectId: selectedId! } }),
    enabled,
  });
  const { data: chat } = useQuery({
    queryKey: ["chat", selectedId],
    queryFn: () => chatFn({ data: { projectId: selectedId!, limit: 5 } }),
    enabled,
  });
  const { data: docs } = useQuery({
    queryKey: ["docs", selectedId],
    queryFn: () => docsFn({ data: { projectId: selectedId! } }),
    enabled,
  });
  const { data: history } = useQuery({
    queryKey: ["history", selectedId],
    queryFn: () => histFn({ data: { projectId: selectedId! } }),
    enabled,
  });

  if (!projects) return <div className="p-8 text-muted-foreground">Loading…</div>;

  if (projects.length === 0) {
    return (
      <div className="p-8">
        <Header title="Dashboard" subtitle="Project alignment, drift, and pending approvals." />
        <div className="glass rounded-2xl p-12 text-center max-w-2xl mx-auto mt-12">
          <FolderKanban className="h-12 w-12 text-primary mx-auto" />
          <h2 className="mt-4 text-xl font-display font-semibold">No projects yet</h2>
          <p className="mt-2 text-muted-foreground">
            Create your first project to start capturing intent.
          </p>
          <button
            onClick={() => navigate({ to: "/projects" })}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create project <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const report = dash?.report;
  const alignment = report?.alignment_score ?? 0;
  const drift = report?.drift_score ?? 0;
  const fc = (report?.feature_coverage as { implemented?: number; total?: number } | null) ?? null;
  const memberCount = members?.length ?? 0;
  const docCount = docs?.length ?? 0;
  const chatCount = chat?.length ?? 0;
  const recentActivity = (history ?? []).slice(0, 6);

  const currentProject = projects.find((p) => p.id === selectedId);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Hero header */}
      <div className="relative overflow-hidden glass rounded-2xl p-8">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-primary">
              Workspace
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-gradient">
              {currentProject?.name ?? "Dashboard"}
            </h1>
            <p className="text-muted-foreground">Plan, build, and verify — all in one place.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value)}
              className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {selectedId && (
              <Link
                to={`/projects/${selectedId}/blueprint`}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Open project <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Alignment progress bar */}
        {report && (
          <div className="relative mt-8 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono uppercase tracking-widest text-muted-foreground">
                Plan vs Implementation
              </span>
              <span className="font-display text-lg font-bold text-primary">
                {alignment}% aligned
              </span>
            </div>
            <div className="h-2 rounded-full bg-background/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/60 via-primary to-primary transition-all duration-700"
                style={{ width: `${alignment}%`, boxShadow: "0 0 20px var(--primary)" }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <MetricCard
          icon={ShieldCheck}
          label="Alignment"
          value={`${alignment}%`}
          color="text-primary"
        />
        <MetricCard icon={AlertTriangle} label="Drift" value={`${drift}%`} color="text-warning" />
        <MetricCard
          icon={FileCheck2}
          label="Coverage"
          value={fc ? `${fc.implemented ?? 0}/${fc.total ?? 0}` : "—"}
        />
        <MetricCard
          icon={Inbox}
          label="Pending"
          value={String(dash?.pending ?? 0)}
          color="text-primary"
        />
        <MetricCard icon={Users} label="Members" value={String(memberCount)} />
        <MetricCard icon={BookOpen} label="Docs" value={String(docCount)} />
        <MetricCard icon={MessageSquare} label="Messages" value={String(chatCount)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent chat */}
        <Card
          title="Recent chat"
          icon={MessageSquare}
          href={selectedId ? `/projects/${selectedId}/chat` : undefined}
        >
          {(chat?.length ?? 0) === 0 ? (
            <Empty icon={Sparkles} label="No messages yet. Start a thread or ask IntentBot." />
          ) : (
            <ul className="space-y-3">
              {chat!.slice(-5).map((m) => (
                <li key={m.id} className="text-sm">
                  <div className={`text-xs ${m.is_ai ? "text-primary" : "text-muted-foreground"}`}>
                    {m.is_ai ? "IntentBot" : (m.profile?.display_name ?? "User")} ·{" "}
                    {new Date(m.created_at).toLocaleTimeString()}
                  </div>
                  <div className="line-clamp-2 text-foreground/90">{m.content}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent docs */}
        <Card
          title="Recent docs"
          icon={BookOpen}
          href={selectedId ? `/projects/${selectedId}/docs` : undefined}
        >
          {(docs?.length ?? 0) === 0 ? (
            <Empty icon={BookOpen} label="No pages yet. Create the first note." />
          ) : (
            <ul className="space-y-2">
              {[...docs!]
                .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
                .slice(0, 5)
                .map((d) => (
                  <li key={d.id} className="flex items-center gap-2 text-sm">
                    <span className="text-base">{d.icon ?? "📄"}</span>
                    <span className="flex-1 truncate">{d.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(d.updated_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        {/* Team */}
        <Card
          title="Team"
          icon={Users}
          href={selectedId ? `/projects/${selectedId}/members` : undefined}
        >
          {(members?.length ?? 0) === 0 ? (
            <Empty icon={Users} label="Invite teammates to collaborate." />
          ) : (
            <ul className="space-y-2">
              {members!.slice(0, 6).map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-sm">
                  {m.profile?.avatar_url ? (
                    <img
                      src={m.profile.avatar_url}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center font-semibold">
                      {(m.profile?.display_name ?? "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="flex-1 truncate">{m.profile?.display_name ?? "Member"}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {m.role}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Activity
            </h3>
            {selectedId && (
              <Link to={`/projects/${selectedId}/history`} className="text-xs text-primary">
                View all →
              </Link>
            )}
          </div>
          {recentActivity.length === 0 ? (
            <Empty icon={Activity} label="No activity yet." />
          ) : (
            <ul className="space-y-2.5">
              {recentActivity.map((h) => (
                <li key={h.id} className="flex items-start gap-3 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1">
                    <div className="text-foreground/90">{h.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(h.created_at).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" /> Repository
            </h3>
            {selectedId && (
              <Link to={`/projects/${selectedId}/repository`} className="text-xs text-primary">
                Manage →
              </Link>
            )}
          </div>
          {dash?.repo ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" /> {dash.repo.github_owner}/
                {dash.repo.github_repo}
              </div>
              <div className="text-muted-foreground">Branch: {dash.repo.branch}</div>
              {dash.repo.last_scan_at && (
                <div className="text-muted-foreground">
                  Last scan: {new Date(dash.repo.last_scan_at).toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <Empty icon={GitBranch} label="No repository connected." />
          )}
        </div>
      </div>
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-3xl font-display font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="glass glass-hover rounded-xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">
          {label}
        </span>
        <Icon className={`h-3.5 w-3.5 ${color || "text-muted-foreground"}`} />
      </div>
      <div className={`mt-2 font-display text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  href,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm font-semibold flex items-center gap-2 uppercase tracking-wider">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </h3>
        {href && (
          <Link to={href} className="text-xs text-primary">
            Open →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="text-center text-xs text-muted-foreground py-6">
      <Icon className="h-6 w-6 mx-auto mb-2 opacity-50" />
      {label}
    </div>
  );
}
