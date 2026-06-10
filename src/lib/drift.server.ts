// Server-only drift engine. Reusable by createServerFn AND public API route.
import type { SupabaseClient } from "@supabase/supabase-js";
import { DriftReportSchema } from "./intent-types";

const TYPE_ALIASES: Record<string, "missing" | "unexpected" | "partial" | "violation"> = {
  absent: "missing",
  gap: "missing",
  missing: "missing",
  omission: "missing",
  omitted: "missing",
  unimplemented: "missing",
  deviation: "unexpected",
  divergence: "unexpected",
  extra: "unexpected",
  unexpected: "unexpected",
  unplanned: "unexpected",
  incomplete: "partial",
  partial: "partial",
  violation: "violation",
  violates: "violation",
};

function extractJson(s: string): unknown {
  let c = s
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const start = c.search(/[{[]/);
  const end = c.lastIndexOf(c[start] === "[" ? "]" : "}");
  if (start === -1 || end === -1) throw new Error(`AI returned no JSON. Raw: ${s.slice(0, 200)}`);
  c = c.slice(start, end + 1);
  try {
    return JSON.parse(c);
  } catch {
    return JSON.parse(
      c
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .split("")
        .filter((ch) => {
          const code = ch.charCodeAt(0);
          return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
        })
        .join(""),
    );
  }
}

function normalize(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const r = raw as { findings?: unknown };
  if (!Array.isArray(r.findings)) return raw;
  return {
    ...r,
    findings: r.findings.map((f) => {
      if (!f || typeof f !== "object") return f;
      const it = f as { type?: unknown };
      const t =
        TYPE_ALIASES[
          String(it.type ?? "")
            .trim()
            .toLowerCase()
        ];
      return t ? { ...it, type: t } : it;
    }),
  };
}

export type DriftRunResult =
  | { ok: false; message: string }
  | { ok: true; reportId: string; alignment: number; drift: number; findings: number };

export async function runDriftForProject(
  projectId: string,
  supabase: SupabaseClient,
  actorId: string | null,
): Promise<DriftRunResult> {
  const { data: blueprint, error: bpError } = await supabase
    .from("blueprint_versions")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_draft", false)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (bpError) return { ok: false, message: bpError.message };
  if (!blueprint) {
    const { data: latest } = await supabase
      .from("blueprint_versions")
      .select("version_number")
      .eq("project_id", projectId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    return {
      ok: false,
      message: latest
        ? `Approve Blueprint V${latest.version_number} before running drift analysis.`
        : "Create and approve a blueprint version before running drift analysis.",
    };
  }

  const { data: reality, error: rmError } = await supabase
    .from("reality_models")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (rmError) return { ok: false, message: rmError.message };
  if (!reality) return { ok: false, message: "Scan a repository before running drift analysis." };

  const { getGroqModel } = await import("./groq.server");
  const { generateText } = await import("ai");
  const model = getGroqModel();

  const prompt = `Compare the approved BLUEPRINT against the REALITY MODEL. Identify drift across categories: feature, architecture, technology, scope.

Return ONLY a JSON object (no markdown, no commentary) with EXACTLY this shape:
{
  "alignment_score": number (0-100),
  "drift_score": number (0-100),
  "feature_coverage": { "implemented": number, "total": number },
  "findings": [ { "title": string, "description": string, "severity": "low"|"medium"|"high"|"critical", "category": "feature"|"architecture"|"technology"|"scope", "type": "missing"|"unexpected"|"partial"|"violation", "evidence": string } ],
  "summary": string
}

BLUEPRINT:
${JSON.stringify({
  vision: blueprint.vision,
  personas: blueprint.personas,
  functional_reqs: blueprint.functional_reqs,
  nonfunctional_reqs: blueprint.nonfunctional_reqs,
  architecture: blueprint.architecture,
  constraints: blueprint.constraints,
  milestones: blueprint.milestones,
  success_metrics: blueprint.success_metrics,
}).slice(0, 20_000)}

REALITY MODEL:
${JSON.stringify({
  frontend: reality.frontend,
  backend: reality.backend,
  database: reality.database,
  infrastructure: reality.infrastructure,
  dependencies: reality.dependencies,
  services: reality.services,
  api_routes: reality.api_routes,
  features: reality.features,
  summary: reality.summary,
}).slice(0, 20_000)}`;

  const res = await generateText({
    model,
    system:
      "You are an intent-verification engine. Be strict, evidence-based, concise. Respond with ONLY valid JSON, no markdown fences.",
    prompt,
  });
  const text = res.text ?? "";
  if (!text.trim()) throw new Error("AI returned an empty response");

  const report = DriftReportSchema.parse(normalize(extractJson(text)));

  const { data: row, error } = await supabase
    .from("drift_reports")
    .insert({
      project_id: projectId,
      blueprint_version_id: blueprint.id,
      reality_model_id: reality.id,
      alignment_score: Math.round(report.alignment_score),
      drift_score: Math.round(report.drift_score),
      feature_coverage: report.feature_coverage,
      findings: report.findings,
      summary: report.summary,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  if (report.findings.length > 0) {
    await supabase.from("approvals").insert(
      report.findings.map((f, idx) => ({
        project_id: projectId,
        drift_report_id: row.id,
        finding_index: idx,
        finding: f,
        decision: "pending",
      })),
    );
  }

  await supabase.from("change_history").insert({
    project_id: projectId,
    event_type: "drift_analyzed",
    title: `Drift analysis: ${report.findings.length} finding(s), ${Math.round(report.alignment_score)}% aligned`,
    payload: { drift_report_id: row.id, findings: report.findings.length },
    actor_id: actorId,
  });

  return {
    ok: true,
    reportId: row.id as string,
    alignment: Math.round(report.alignment_score),
    drift: Math.round(report.drift_score),
    findings: report.findings.length,
  };
}
