import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/db/auth-middleware";

export const listHistory = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.db
      .from("change_history")
      .select("*")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [report, approvals, repo, bp] = await Promise.all([
      context.db
        .from("drift_reports")
        .select("*")
        .eq("project_id", data.projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .then((r) => r.data?.[0] ?? null),
      context.db.from("approvals").select("id, decision").eq("project_id", data.projectId),
      context.db
        .from("repositories")
        .select("github_owner, github_repo, branch, last_scan_at, last_commit_sha, status")
        .eq("project_id", data.projectId)
        .maybeSingle()
        .then((r) => r.data),
      context.db
        .from("blueprint_versions")
        .select("version_number, is_draft, approved_at")
        .eq("project_id", data.projectId)
        .order("version_number", { ascending: false })
        .limit(1)
        .then((r) => r.data?.[0] ?? null),
    ]);

    const pending = (approvals.data ?? []).filter((a) => a.decision === "pending").length;
    const approved = (approvals.data ?? []).filter((a) => a.decision === "approved").length;
    const rejected = (approvals.data ?? []).filter((a) => a.decision === "rejected").length;

    return { report, pending, approved, rejected, repo, latestBlueprint: bp };
  });
