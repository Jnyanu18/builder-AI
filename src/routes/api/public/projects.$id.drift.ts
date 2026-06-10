import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

async function authorize(projectId: string, request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token)
    return { error: new Response("Missing bearer token", { status: 401, headers: cors }) };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id, api_token, owner_id, name")
    .eq("id", projectId)
    .maybeSingle();
  if (error || !data)
    return { error: new Response("Project not found", { status: 404, headers: cors }) };
  if (data.api_token !== token)
    return { error: new Response("Invalid token", { status: 403, headers: cors }) };
  return { project: data, supabaseAdmin };
}

export const Route = createFileRoute("/api/public/projects/$id/drift")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),

      GET: async ({ request, params }) => {
        const a = await authorize(params.id, request);
        if ("error" in a) return a.error;
        const { data } = await a.supabaseAdmin
          .from("drift_reports")
          .select("*")
          .eq("project_id", params.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return Response.json({ project: a.project.name, report: data }, { headers: cors });
      },

      POST: async ({ request, params }) => {
        const a = await authorize(params.id, request);
        if ("error" in a) return a.error;
        try {
          const { runDriftForProject } = await import("@/lib/drift.server");
          const result = await runDriftForProject(params.id, a.supabaseAdmin, a.project.owner_id);
          return Response.json(result, {
            status: "ok" in result && result.ok ? 200 : 409,
            headers: cors,
          });
        } catch (e) {
          return Response.json(
            { ok: false, message: (e as Error).message },
            { status: 500, headers: cors },
          );
        }
      },
    },
  },
});
