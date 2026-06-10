import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BlueprintDraftSchema } from "./intent-types";

export const listBlueprintVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("blueprint_versions")
      .select("*")
      .eq("project_id", data.projectId)
      .order("version_number", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getLatestBlueprint = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("blueprint_versions")
      .select("*")
      .eq("project_id", data.projectId)
      .order("version_number", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    return rows?.[0] ?? null;
  });

export const getLatestApprovedBlueprint = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("blueprint_versions")
      .select("*")
      .eq("project_id", data.projectId)
      .eq("is_draft", false)
      .order("version_number", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    return rows?.[0] ?? null;
  });

export const saveBlueprintDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        draft: BlueprintDraftSchema,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // Find current draft, else create a new version above the latest.
    const { data: existing } = await context.supabase
      .from("blueprint_versions")
      .select("*")
      .eq("project_id", data.projectId)
      .eq("is_draft", true)
      .order("version_number", { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      const { data: updated, error } = await context.supabase
        .from("blueprint_versions")
        .update({
          vision: data.draft.vision,
          personas: data.draft.personas,
          functional_reqs: data.draft.functional_reqs,
          nonfunctional_reqs: data.draft.nonfunctional_reqs,
          architecture: data.draft.architecture,
          constraints: data.draft.constraints,
          milestones: data.draft.milestones,
          success_metrics: data.draft.success_metrics,
        })
        .eq("id", existing[0].id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated;
    }

    // No draft — create one above the highest version.
    const { data: latest } = await context.supabase
      .from("blueprint_versions")
      .select("version_number")
      .eq("project_id", data.projectId)
      .order("version_number", { ascending: false })
      .limit(1);
    const nextVersion = (latest?.[0]?.version_number ?? 0) + 1;

    const { data: created, error } = await context.supabase
      .from("blueprint_versions")
      .insert({
        project_id: data.projectId,
        version_number: nextVersion,
        is_draft: true,
        vision: data.draft.vision,
        personas: data.draft.personas,
        functional_reqs: data.draft.functional_reqs,
        nonfunctional_reqs: data.draft.nonfunctional_reqs,
        architecture: data.draft.architecture,
        constraints: data.draft.constraints,
        milestones: data.draft.milestones,
        success_metrics: data.draft.success_metrics,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

export const approveBlueprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ versionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: version, error } = await context.supabase
      .from("blueprint_versions")
      .update({
        is_draft: false,
        approved_at: new Date().toISOString(),
        approved_by: context.userId,
      })
      .eq("id", data.versionId)
      .select()
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("change_history").insert({
      project_id: version.project_id,
      event_type: "blueprint_approved",
      title: `Blueprint V${version.version_number} approved`,
      payload: { version_id: version.id, version_number: version.version_number },
      actor_id: context.userId,
    });

    return version;
  });
