import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * If the signed-in user has zero projects, create a sample "Welcome to IntentOS"
 * project with a starter blueprint so they have something to explore immediately.
 * Returns the seeded project id (or null if user already has projects).
 */
export const seedSampleProjectIfEmpty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { count, error: cErr } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true });
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) > 0) return { seeded: false, projectId: null };

    const { data: project, error: pErr } = await supabase
      .from("projects")
      .insert({
        owner_id: userId,
        name: "Welcome to IntentOS",
        description:
          "A sample project so you can explore the workflow. Edit the blueprint, connect your real repo, then run drift analysis.",
      })
      .select()
      .single();
    if (pErr) throw new Error(pErr.message);

    await supabase.from("blueprint_versions").insert({
      project_id: project.id,
      version_number: 1,
      is_draft: false,
      vision:
        "A platform that captures product intent as a versioned blueprint and continuously verifies the implementation against it.",
      personas: [
        { name: "Product Lead", goal: "Keep engineering aligned with the plan" },
        { name: "Engineer", goal: "See exactly what drifted on every push" },
      ],
      functional_reqs: [
        { name: "Capture and version product blueprints", description: "", priority: "must" },
        { name: "Scan connected GitHub repos and model reality", description: "", priority: "must" },
        { name: "Run AI drift analysis between plan and code", description: "", priority: "must" },
        { name: "Approve or reject each drift finding", description: "", priority: "must" },
      ],
      nonfunctional_reqs: [{ category: "Performance", requirement: "Drift analysis completes under 30 seconds" }],
      architecture: {
        frontend: "React + TanStack Start",
        backend: "TanStack server functions + Supabase",
        ai: "Lovable AI Gateway (Gemini)",
      },
      constraints: [{ rule: "Must work without leaving the editor", rationale: "" }],
      milestones: [
        { name: "Connect repo and run first drift", target_date: "", description: "" },
        { name: "Invite the team and review findings", target_date: "", description: "" },
      ],
      success_metrics: [{ name: "Alignment score > 80% on main branch", target: "" }],
    });

    await supabase.from("docs").insert({
      project_id: project.id,
      created_by: userId,
      title: "Getting started",
      icon: "👋",
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Welcome to IntentOS" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "This is your sample project. Try these in order:" }],
          },
          {
            type: "bulletList",
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Open Blueprint and tweak the vision." }],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "Go to Repository and connect a GitHub repo you own." },
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
                      { type: "text", text: 'Hit "Scan repository" then "Run drift analysis".' },
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
                        text: "Review the findings under Alignment and approve / reject in Approvals.",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    await supabase.from("change_history").insert({
      project_id: project.id,
      event_type: "project_created",
      title: `Sample project "${project.name}" created`,
      actor_id: userId,
    });

    return { seeded: true, projectId: project.id as string };
  });
