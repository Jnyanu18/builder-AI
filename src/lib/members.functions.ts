import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/db/auth-middleware";

const projectIdInput = z.object({ projectId: z.string().uuid() });

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => projectIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: members, error } = await context.db
      .from("project_members")
      .select("id, user_id, role, created_at")
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);

    // owner from projects
    const { data: project } = await context.db
      .from("projects")
      .select("owner_id")
      .eq("id", data.projectId)
      .maybeSingle();

    const ids = Array.from(
      new Set([
        ...(members ?? []).map((m) => m.user_id),
        ...(project?.owner_id ? [project.owner_id] : []),
      ]),
    );

    let profiles: { id: string; display_name: string | null; avatar_url: string | null }[] = [];
    if (ids.length) {
      const { data: profs } = await context.db
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      profiles = profs ?? [];
    }

    const byId = new Map(profiles.map((p) => [p.id, p]));
    const rows = (members ?? []).map((m) => ({
      ...m,
      profile: byId.get(m.user_id) ?? null,
    }));

    // Ensure owner appears
    if (project && !rows.some((r) => r.user_id === project.owner_id)) {
      rows.unshift({
        id: "owner",
        user_id: project.owner_id,
        role: "owner",
        created_at: new Date().toISOString(),
        profile: byId.get(project.owner_id) ?? null,
      });
    } else {
      // mark owner role
      for (const r of rows) if (r.user_id === project?.owner_id) r.role = "owner";
    }
    return rows;
  });

export const listInvites = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => projectIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.db
      .from("project_invites")
      .select("*")
      .eq("project_id", data.projectId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        email: z.string().email().toLowerCase(),
        role: z.enum(["editor", "viewer"]).default("editor"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // Find user by email
    const { findUserByEmail } = await import("@/integrations/db/client.server");
    const found = await findUserByEmail(data.email);

    if (found) {
      const { error } = await context.db
        .from("project_members")
        .upsert(
          { project_id: data.projectId, user_id: found.id, role: data.role },
          { onConflict: "project_id,user_id" },
        );
      if (error) throw new Error(error.message);
      return { added: true, email: data.email };
    }

    const { error } = await context.db.from("project_invites").upsert(
      {
        project_id: data.projectId,
        email: data.email,
        role: data.role,
        invited_by: context.userId,
      },
      { onConflict: "project_id,email" },
    );
    if (error) throw new Error(error.message);
    return { added: false, email: data.email };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ projectId: z.string().uuid(), userId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.db
      .from("project_members")
      .delete()
      .eq("project_id", data.projectId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const acceptPendingInvites = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { db, findUserById } = await import("@/integrations/db/client.server");
    const email = (await findUserById(context.userId))?.email?.toLowerCase();
    if (!email) return { accepted: 0 };
    const { data: invites } = await db
      .from("project_invites")
      .select("*")
      .eq("email", email)
      .is("accepted_at", null);
    if (!invites?.length) return { accepted: 0 };
    for (const inv of invites) {
      await db
        .from("project_members")
        .upsert(
          { project_id: inv.project_id, user_id: context.userId, role: inv.role },
          { onConflict: "project_id,user_id" },
        );
      await db
        .from("project_invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", inv.id);
    }
    return { accepted: invites.length };
  });
