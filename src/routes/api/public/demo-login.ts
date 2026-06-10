import { createFileRoute } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const DEMO_EMAIL = "demo@intentos.app";
const DEMO_PASSWORD = "DemoUser!2026";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

export const Route = createFileRoute("/api/public/demo-login")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Find or create the demo user.
          let userId: string | null = null;
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 200,
          });
          const existing = list?.users.find((u) => u.email === DEMO_EMAIL);
          if (existing) {
            userId = existing.id;
            // Make sure password and confirmation state are the known demo values.
            const { error: uErr } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
              password: DEMO_PASSWORD,
              email_confirm: true,
              user_metadata: { full_name: "Demo User" },
            });
            if (uErr) throw uErr;
          } else {
            const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
              email: DEMO_EMAIL,
              password: DEMO_PASSWORD,
              email_confirm: true,
              user_metadata: { full_name: "Demo User" },
            });
            if (cErr) throw cErr;
            userId = created.user!.id;
          }

          const { error: profileErr } = await supabaseAdmin.from("profiles").upsert({
            id: userId!,
            display_name: "Demo User",
            avatar_url: null,
          });
          if (profileErr) throw profileErr;

          // Idempotent seed: recreate if the previous attempt left partial demo data.
          const { data: existingProject } = await supabaseAdmin
            .from("projects")
            .select("id")
            .eq("owner_id", userId!)
            .eq("name", "IntentOS Demo — Taskly App")
            .maybeSingle();

          if (existingProject) {
            const complete = await isDemoProjectComplete(supabaseAdmin, existingProject.id);
            if (!complete) {
              const { error: dErr } = await supabaseAdmin
                .from("projects")
                .delete()
                .eq("id", existingProject.id);
              if (dErr) throw dErr;
              await seedDemoProject(supabaseAdmin, userId!);
            }
          } else {
            await seedDemoProject(supabaseAdmin, userId!);
          }

          return Response.json({ email: DEMO_EMAIL, password: DEMO_PASSWORD }, { headers: cors });
        } catch (e) {
          return Response.json({ error: (e as Error).message }, { status: 500, headers: cors });
        }
      },
    },
  },
});

async function hasRows(
  supabaseAdmin: SupabaseClient<Database>,
  table:
    | "blueprint_versions"
    | "repositories"
    | "repository_scans"
    | "reality_models"
    | "drift_reports"
    | "approvals"
    | "docs"
    | "chat_messages"
    | "change_history",
  projectId: string,
) {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

async function isDemoProjectComplete(supabaseAdmin: SupabaseClient<Database>, projectId: string) {
  const checks = await Promise.all([
    hasRows(supabaseAdmin, "blueprint_versions", projectId),
    hasRows(supabaseAdmin, "repositories", projectId),
    hasRows(supabaseAdmin, "repository_scans", projectId),
    hasRows(supabaseAdmin, "reality_models", projectId),
    hasRows(supabaseAdmin, "drift_reports", projectId),
    hasRows(supabaseAdmin, "approvals", projectId),
    hasRows(supabaseAdmin, "docs", projectId),
    hasRows(supabaseAdmin, "chat_messages", projectId),
    hasRows(supabaseAdmin, "change_history", projectId),
  ]);
  return checks.every(Boolean);
}

async function seedDemoProject(supabaseAdmin: SupabaseClient<Database>, userId: string) {
  // 1. Project
  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .insert({
      owner_id: userId,
      name: "IntentOS Demo — Taskly App",
      description:
        "A fully seeded demo: approved blueprint, connected repo, scanned reality, drift report with findings, and pending approvals. Click through to see the entire flow.",
    })
    .select()
    .single();
  if (projectError) throw projectError;
  const pid = project.id as string;

  // 2. Approved blueprint v1
  const { data: bp, error: blueprintError } = await supabaseAdmin
    .from("blueprint_versions")
    .insert({
      project_id: pid,
      version_number: 1,
      is_draft: false,
      approved_at: new Date().toISOString(),
      approved_by: userId,
      vision:
        "Taskly is a lightweight team task tracker. Users sign in, create projects, add tasks with due dates and assignees, and get email reminders. The plan promises a clean kanban board, real-time updates, and a public REST API.",
      personas: [
        { name: "Team Lead", goal: "Track everyone's work in one board" },
        { name: "Contributor", goal: "Get a daily digest of what's due" },
        { name: "Integrator", goal: "Hit a REST API to sync tasks externally" },
      ],
      functional_reqs: [
        { name: "Email + Google sign-in", description: "", priority: "must" },
        { name: "Create / edit / delete tasks", description: "", priority: "must" },
        { name: "Kanban board with drag-and-drop columns", description: "", priority: "must" },
        { name: "Realtime updates across collaborators", description: "", priority: "must" },
        { name: "Daily email digest of due tasks", description: "", priority: "must" },
        { name: "Public REST API at /api/v1/tasks", description: "", priority: "must" },
      ],
      nonfunctional_reqs: [
        { category: "Performance", requirement: "P95 page load under 1.5s" },
        { category: "Security", requirement: "All data encrypted at rest" },
      ],
      architecture: {
        frontend: "React + TanStack Start",
        backend: "TanStack server functions + Supabase",
        database: "Postgres (Supabase)",
        realtime: "Supabase Realtime channels",
      },
      constraints: [
        { rule: "No third-party analytics", rationale: "" },
        { rule: "Must work offline-first for task editing", rationale: "" },
      ],
      milestones: [
        { name: "Auth + projects + tasks CRUD", target_date: "", description: "" },
        { name: "Kanban board + realtime", target_date: "", description: "" },
        { name: "Email digest + public API", target_date: "", description: "" },
      ],
      success_metrics: [
        { name: "Alignment score > 85% on main", target: "" },
        { name: "<2 unresolved drift findings at any time", target: "" },
      ],
    })
    .select()
    .single();
  if (blueprintError) throw blueprintError;

  // 3. Repository
  const { data: repo, error: repoError } = await supabaseAdmin
    .from("repositories")
    .insert({
      project_id: pid,
      github_owner: "intentos-demo",
      github_repo: "taskly",
      branch: "main",
      status: "connected",
      last_scan_at: new Date().toISOString(),
      last_commit_sha: "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
    })
    .select()
    .single();
  if (repoError) throw repoError;

  // 4. Scan + reality
  const { data: scan, error: scanError } = await supabaseAdmin
    .from("repository_scans")
    .insert({
      repository_id: repo.id,
      project_id: pid,
      commit_sha: "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
      status: "completed",
      finished_at: new Date().toISOString(),
      raw_files: { count: 87, languages: { TypeScript: 72, CSS: 9, SQL: 6 } },
    })
    .select()
    .single();
  if (scanError) throw scanError;

  const { data: reality, error: realityError } = await supabaseAdmin
    .from("reality_models")
    .insert({
      scan_id: scan.id,
      project_id: pid,
      frontend: "React + TanStack Start",
      backend: "TanStack server functions",
      database: "Supabase Postgres",
      summary:
        "Auth, projects, and tasks CRUD are shipped. Kanban board exists but drag-and-drop is disabled. No realtime channel. No email digest. No public REST API.",
      dependencies: [
        "react",
        "@tanstack/react-start",
        "@supabase/supabase-js",
        "zod",
        "tailwindcss",
      ],
      services: [
        { name: "Auth", source: "Supabase" },
        { name: "Database", source: "Supabase Postgres" },
      ],
      api_routes: [
        { method: "GET", path: "/api/tasks" },
        { method: "POST", path: "/api/tasks" },
      ],
      features: [
        { id: "F1", status: "implemented", evidence: "src/routes/auth.tsx" },
        { id: "F2", status: "implemented", evidence: "src/routes/_app/tasks.tsx" },
        { id: "F3", status: "partial", evidence: "Board renders but DnD handlers are stubbed" },
        { id: "F4", status: "missing" },
        { id: "F5", status: "missing" },
        { id: "F6", status: "missing" },
      ],
      infrastructure: [{ name: "Supabase", region: "us-east-1" }],
    })
    .select()
    .single();
  if (realityError) throw realityError;

  // 5. Drift report with findings
  const findings = [
    {
      severity: "high",
      type: "missing_feature",
      title: "Realtime updates (F4) not implemented",
      detail:
        "Blueprint promises realtime sync via Supabase Realtime, but no channel subscriptions exist in the codebase.",
      blueprint_ref: "F4",
      suggestion:
        "Either implement Supabase Realtime channels on the tasks table, or downgrade F4 in the blueprint.",
    },
    {
      severity: "high",
      type: "missing_feature",
      title: "Public REST API (F6) is missing",
      detail: "No routes exist under /api/v1/. Integrators have no surface to hit.",
      blueprint_ref: "F6",
      suggestion: "Add src/routes/api/v1/tasks.ts with GET/POST handlers, or remove F6 from scope.",
    },
    {
      severity: "medium",
      type: "partial_feature",
      title: "Kanban drag-and-drop (F3) is stubbed",
      detail: "Board renders columns but onDragEnd handlers are empty no-ops.",
      blueprint_ref: "F3",
      suggestion: "Wire up dnd-kit handlers to persist column changes.",
    },
    {
      severity: "medium",
      type: "missing_feature",
      title: "Daily email digest (F5) not implemented",
      detail: "No scheduled function or email integration found.",
      blueprint_ref: "F5",
      suggestion: "Add a pg_cron job + Resend integration, or defer F5 to the next milestone.",
    },
    {
      severity: "low",
      type: "undeclared_dependency",
      title: "Code uses 'date-fns' but it is not listed in blueprint",
      detail:
        "package.json includes date-fns. Not a problem, but worth noting in the architecture section.",
      blueprint_ref: null,
      suggestion: "Add date-fns to the blueprint dependencies list.",
    },
  ];

  const { data: drift, error: driftError } = await supabaseAdmin
    .from("drift_reports")
    .insert({
      project_id: pid,
      blueprint_version_id: bp.id,
      reality_model_id: reality.id,
      alignment_score: 58,
      drift_score: 42,
      feature_coverage: {
        implemented: ["F1", "F2"],
        partial: ["F3"],
        missing: ["F4", "F5", "F6"],
      },
      summary:
        "Foundation is solid (auth + CRUD) but three of six promised features are missing and one is half-built. Recommend either shipping F3/F4 this sprint or trimming scope.",
      findings,
    })
    .select()
    .single();
  if (driftError) throw driftError;

  // 6. Approvals (3 pending, 2 already decided)
  const approvalRows = findings.map((f, i) => ({
    project_id: pid,
    drift_report_id: drift.id,
    finding_index: i,
    finding: f,
    decision: i < 3 ? "pending" : i === 3 ? "accepted" : "rejected",
    decided_by: i >= 3 ? userId : null,
    decided_at: i >= 3 ? new Date().toISOString() : null,
    note: i === 3 ? "Deferred to M3" : i === 4 ? "Noise, ignored" : null,
  }));
  const { error: approvalsError } = await supabaseAdmin.from("approvals").insert(approvalRows);
  if (approvalsError) throw approvalsError;

  // 7. Docs
  const { error: docsError } = await supabaseAdmin.from("docs").insert([
    {
      project_id: pid,
      created_by: userId,
      title: "How to read this demo",
      icon: "👋",
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Welcome to the IntentOS demo" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "This project is fully seeded so you can see the entire flow without setting anything up. Walk through it like this:",
              },
            ],
          },
          {
            type: "orderedList",
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Overview — five-step checklist, all green." }],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Blueprint — the approved plan (6 features, 3 milestones).",
                      },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "Repository — the connected demo repo and last scan." },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Alignment — drift report showing 58% alignment and 5 findings.",
                      },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Approvals — 3 pending, 2 already decided. Try approving one.",
                      },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "History — every event above is recorded here." },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    {
      project_id: pid,
      created_by: userId,
      title: "Architecture decisions",
      icon: "📐",
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Why Supabase + TanStack Start" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Picked for: built-in auth, Postgres + RLS, realtime channels, and a single deploy target on the edge.",
              },
            ],
          },
        ],
      },
    },
  ]);
  if (docsError) throw docsError;

  // 8. Chat
  const { error: chatError } = await supabaseAdmin.from("chat_messages").insert([
    {
      project_id: pid,
      user_id: userId,
      role: "user",
      content: "Why is alignment only 58%?",
      is_ai: false,
    },
    {
      project_id: pid,
      user_id: null,
      role: "assistant",
      is_ai: true,
      content:
        "Three of six promised features are missing (F4 realtime, F5 email digest, F6 public API) and F3 kanban DnD is half-built. Approve the trim or schedule the work to lift the score.",
    },
    {
      project_id: pid,
      user_id: userId,
      role: "user",
      content: "What should I tackle first?",
      is_ai: false,
    },
    {
      project_id: pid,
      user_id: null,
      role: "assistant",
      is_ai: true,
      content:
        "Finish F3 — it's the smallest gap and unlocks daily usage. Then ship F4 realtime since it shares the same data model.",
    },
  ]);
  if (chatError) throw chatError;

  // 9. History
  const histEvents = [
    { event_type: "project_created", title: "Project created" },
    { event_type: "blueprint_approved", title: "Blueprint v1 approved" },
    { event_type: "repository_connected", title: "Connected intentos-demo/taskly" },
    { event_type: "scan_completed", title: "Scan completed (87 files)" },
    { event_type: "drift_run", title: "Drift analysis: 58% alignment, 5 findings" },
    { event_type: "approval_decided", title: "Approval: F5 deferred to M3" },
    { event_type: "approval_decided", title: "Approval: undeclared dependency dismissed" },
  ];
  const { error: historyError } = await supabaseAdmin
    .from("change_history")
    .insert(histEvents.map((e) => ({ ...e, project_id: pid, actor_id: userId })));
  if (historyError) throw historyError;
}
