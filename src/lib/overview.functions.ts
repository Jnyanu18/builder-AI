import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Returns the status of every onboarding step for a project, so the Overview
 * page can render a checklist and a "next action" CTA.
 */
export const getProjectOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const projectId = data.projectId;
    const { supabase } = context;

    const [project, blueprintDraft, blueprintApproved, repo, reality, drift, pending] =
      await Promise.all([
        supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
        supabase
          .from("blueprint_versions")
          .select("id, version_number, is_draft")
          .eq("project_id", projectId)
          .order("version_number", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("blueprint_versions")
          .select("id, version_number")
          .eq("project_id", projectId)
          .eq("is_draft", false)
          .order("version_number", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("repositories")
          .select("id, github_owner, github_repo, branch, last_scan_at, last_commit_sha")
          .eq("project_id", projectId)
          .maybeSingle(),
        supabase
          .from("reality_models")
          .select("id, created_at")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("drift_reports")
          .select("id, alignment_score, drift_score, created_at, findings")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("approvals")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId)
          .eq("decision", "pending"),
      ]);

    return {
      project: project.data,
      blueprint: {
        hasDraft: !!blueprintDraft.data,
        approved: blueprintApproved.data ?? null,
      },
      repository: repo.data,
      reality: reality.data,
      drift: drift.data,
      pendingApprovals: pending.count ?? 0,
    };
  });

/**
 * Returns sensitive repo identifiers (api_token + webhook_secret) so the
 * Repository tab can show them. Owner-only because RLS is scoped to project
 * members already, but we still mask the values in the UI.
 */
export const getRepoSecrets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [proj, repo] = await Promise.all([
      context.supabase.from("projects").select("api_token").eq("id", data.projectId).maybeSingle(),
      context.supabase
        .from("repositories")
        .select("webhook_secret")
        .eq("project_id", data.projectId)
        .maybeSingle(),
    ]);
    return {
      api_token: proj.data?.api_token ?? null,
      webhook_secret: repo.data?.webhook_secret ?? null,
    };
  });
