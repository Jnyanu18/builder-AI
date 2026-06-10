import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listApprovals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("approvals")
      .select("*")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const decideApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        approvalId: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        note: z.string().max(500).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: approval, error } = await context.supabase
      .from("approvals")
      .update({
        decision: data.decision,
        note: data.note,
        decided_at: new Date().toISOString(),
        decided_by: context.userId,
      })
      .eq("id", data.approvalId)
      .select()
      .single();
    if (error) throw new Error(error.message);

    // If approved, fork a new blueprint version with the finding noted in vision history.
    let newVersionId: string | null = null;
    if (data.decision === "approved") {
      const { data: bp } = await context.supabase
        .from("blueprint_versions")
        .select("*")
        .eq("project_id", approval.project_id)
        .order("version_number", { ascending: false })
        .limit(1);
      const latest = bp?.[0];
      if (latest) {
        const finding = approval.finding as { title?: string; description?: string };
        const updatedConstraints = Array.isArray(latest.constraints)
          ? [...(latest.constraints as unknown[])]
          : [];
        updatedConstraints.push({
          rule: `Accepted change: ${finding.title ?? "drift item"}`,
          rationale: finding.description ?? "",
        });

        const { data: created } = await context.supabase
          .from("blueprint_versions")
          .insert({
            project_id: approval.project_id,
            version_number: (latest.version_number ?? 0) + 1,
            is_draft: false,
            approved_at: new Date().toISOString(),
            approved_by: context.userId,
            vision: latest.vision,
            personas: latest.personas as never,
            functional_reqs: latest.functional_reqs as never,
            nonfunctional_reqs: latest.nonfunctional_reqs as never,
            architecture: latest.architecture as never,
            constraints: updatedConstraints as never,
            milestones: latest.milestones as never,
            success_metrics: latest.success_metrics as never,
          })
          .select()
          .single();
        if (created) {
          newVersionId = created.id;
          await context.supabase
            .from("approvals")
            .update({ resulting_blueprint_version_id: created.id })
            .eq("id", approval.id);
        }
      }
    }

    const finding = approval.finding as { title?: string };
    await context.supabase.from("change_history").insert({
      project_id: approval.project_id,
      event_type: data.decision === "approved" ? "change_approved" : "change_rejected",
      title: `${data.decision === "approved" ? "Approved" : "Rejected"}: ${finding.title ?? "drift item"}`,
      payload: { approval_id: approval.id, new_version_id: newVersionId },
      actor_id: context.userId,
    });

    return { ok: true, newVersionId };
  });
