import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * GitHub push webhook → auto-rescan repo (best effort) → run drift analysis.
 *
 * Configure in GitHub: Settings → Webhooks → Add webhook
 *   Payload URL: https://<project-url>/api/public/projects/<projectId>/github-webhook
 *   Content type: application/json
 *   Secret: (the webhook_secret shown on the Repository tab)
 *   Events: Just the push event
 */
export const Route = createFileRoute("/api/public/projects/$id/github-webhook")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const projectId = params.id;
        const rawBody = await request.text();
        const signature = request.headers.get("x-hub-signature-256") ?? "";
        const event = request.headers.get("x-github-event") ?? "";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: repo, error } = await supabaseAdmin
          .from("repositories")
          .select("id, project_id, branch, webhook_secret, projects!inner(owner_id)")
          .eq("project_id", projectId)
          .maybeSingle();
        if (error || !repo) return new Response("Repository not connected", { status: 404 });

        // Verify HMAC signature
        const expected =
          "sha256=" + createHmac("sha256", repo.webhook_secret).update(rawBody).digest("hex");
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
          return new Response("Invalid signature", { status: 401 });
        }

        // Acknowledge ping events
        if (event === "ping") return Response.json({ ok: true, msg: "pong" });
        if (event !== "push") return Response.json({ ok: true, skipped: event });

        let payload: { ref?: string; after?: string } = {};
        try {
          payload = JSON.parse(rawBody);
        } catch {
          /* ignore */
        }

        // Only run on the tracked branch
        const branch = repo.branch || "main";
        if (payload.ref && payload.ref !== `refs/heads/${branch}`) {
          return Response.json({ ok: true, skipped: "other-branch", ref: payload.ref });
        }

        const ownerId = (repo.projects as unknown as { owner_id: string }).owner_id;

        await supabaseAdmin.from("change_history").insert({
          project_id: projectId,
          event_type: "github_push",
          title: `Push received on ${branch}${payload.after ? ` (${payload.after.slice(0, 7)})` : ""}`,
          actor_id: ownerId,
          payload: { ref: payload.ref, commit: payload.after ?? null },
        });

        // Run drift against the most recent reality model.
        // (For a full rescan on push, click "Scan repository" once in the app
        // and the webhook will keep drift fresh on every subsequent push.)
        try {
          const { runDriftForProject } = await import("@/lib/drift.server");
          const result = await runDriftForProject(projectId, supabaseAdmin, ownerId);
          return Response.json({ ok: true, drift: result });
        } catch (e) {
          return Response.json({ ok: false, message: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
