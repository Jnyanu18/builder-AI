import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listChat = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ projectId: z.string().uuid(), limit: z.number().int().min(1).max(500).optional() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("chat_messages")
      .select("*")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: true })
      .limit(data.limit ?? 200);
    if (error) throw new Error(error.message);

    const ids = Array.from(
      new Set((rows ?? []).map((r) => r.user_id).filter((v): v is string => !!v)),
    );
    let profiles: { id: string; display_name: string | null; avatar_url: string | null }[] = [];
    if (ids.length) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      profiles = profs ?? [];
    }
    const byId = new Map(profiles.map((p) => [p.id, p]));
    return (rows ?? []).map((r) => ({
      ...r,
      profile: r.user_id ? (byId.get(r.user_id) ?? null) : null,
    }));
  });

export const sendChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        content: z.string().trim().min(1).max(4000),
        askAi: z.boolean().optional().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: inserted, error } = await context.supabase
      .from("chat_messages")
      .insert({
        project_id: data.projectId,
        user_id: context.userId,
        role: "user",
        content: data.content,
        is_ai: false,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (!data.askAi) return { message: inserted, ai: null };

    // Build context: blueprint + drift report summary
    const [{ data: bp }, { data: report }, { data: history }] = await Promise.all([
      context.supabase
        .from("blueprint_versions")
        .select("vision, version_number, is_draft")
        .eq("project_id", data.projectId)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle(),
      context.supabase
        .from("drift_reports")
        .select("summary, alignment_score, drift_score")
        .eq("project_id", data.projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      context.supabase
        .from("chat_messages")
        .select("role, content, is_ai")
        .eq("project_id", data.projectId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const ctx = [
      bp?.vision
        ? `Blueprint v${bp.version_number}${bp.is_draft ? " (draft)" : ""}:\n${bp.vision.slice(0, 2000)}`
        : "No blueprint yet.",
      report
        ? `Latest drift report — alignment ${report.alignment_score}%, drift ${report.drift_score}%.\n${report.summary?.slice(0, 800) ?? ""}`
        : "No drift report yet.",
    ].join("\n\n");

    const recent = (history ?? []).reverse().map((m) => ({
      role: m.is_ai ? "assistant" : "user",
      content: m.content,
    }));

    let aiText = "";
    try {
      const groqKey = process.env.GROQ_API_KEY;
      if (!groqKey) throw new Error("Missing GROQ_API_KEY");
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are IntentBot, an AI assistant embedded in a project workspace. You help the team reason about their blueprint, drift, and code. Be concise, friendly, and use markdown. Project context:\n\n${ctx}`,
            },
            ...recent,
          ],
          temperature: 0.4,
        }),
      });
      if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
      const json = await res.json();
      aiText = json?.choices?.[0]?.message?.content ?? "I couldn't generate a reply.";
    } catch (e) {
      aiText = `AI error: ${e instanceof Error ? e.message : String(e)}`;
    }

    const { data: aiRow } = await context.supabase
      .from("chat_messages")
      .insert({
        project_id: data.projectId,
        user_id: null,
        role: "assistant",
        content: aiText,
        is_ai: true,
      })
      .select()
      .single();

    return { message: inserted, ai: aiRow };
  });
