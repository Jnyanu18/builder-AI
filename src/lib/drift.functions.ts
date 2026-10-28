import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/db/auth-middleware";

export const getLatestDriftReport = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.db
      .from("drift_reports")
      .select("*")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    return rows?.[0] ?? null;
  });

export const runDriftAnalysis = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { runDriftForProject } = await import("./drift.server");
    try {
      return await runDriftForProject(data.projectId, context.db, context.userId);
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  });

export const getProjectApiToken = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.db
      .from("projects")
      .select("api_token")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { api_token: row?.api_token ?? null };
  });
