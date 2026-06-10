import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { RealityModelSchema } from "./intent-types";

// Parse https://github.com/owner/repo[.git] or owner/repo.
function parseRepoUrl(input: string): { owner: string; repo: string } {
  const trimmed = input.trim().replace(/\.git$/, "");
  const url = trimmed.match(/github\.com[/:]([^/]+)\/([^/]+)/);
  if (url) return { owner: url[1], repo: url[2] };
  const slug = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (slug) return { owner: slug[1], repo: slug[2] };
  throw new Error("Could not parse repository. Use https://github.com/owner/repo or owner/repo.");
}

function ghHeaders(token?: string | null): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "IntentOS",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function stripControlCharacters(value: string) {
  let cleaned = "";
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code >= 0x20 && code !== 0x7f) cleaned += value[i];
  }
  return cleaned;
}

async function gh(path: string, token?: string | null) {
  const res = await fetch(`https://api.github.com${path}`, { headers: ghHeaders(token) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function ghRaw(path: string, token?: string | null): Promise<string | null> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { ...ghHeaders(token), Accept: "application/vnd.github.raw" },
  });
  if (!res.ok) return null;
  return res.text();
}

export const getRepository = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("repositories")
      .select(
        "id, project_id, github_owner, github_repo, branch, last_scan_at, last_commit_sha, status, created_at, updated_at",
      )
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return rows;
  });

export const connectRepository = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        repoUrl: z.string().min(3).max(300),
        branch: z.string().min(1).max(120).optional().default("main"),
        token: z.string().max(500).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { owner, repo } = parseRepoUrl(data.repoUrl);
    const token = data.token?.trim() || null;

    // Verify access
    try {
      await gh(`/repos/${owner}/${repo}`, token);
    } catch (e) {
      throw new Error(`Could not access repository: ${(e as Error).message}`);
    }

    // Upsert
    const { data: existing } = await context.supabase
      .from("repositories")
      .select("id")
      .eq("project_id", data.projectId)
      .maybeSingle();

    const payload = {
      project_id: data.projectId,
      github_owner: owner,
      github_repo: repo,
      branch: data.branch || "main",
      access_token: token,
      status: "connected",
    };

    let result;
    if (existing) {
      const r = await context.supabase
        .from("repositories")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();
      if (r.error) throw new Error(r.error.message);
      result = r.data;
    } else {
      const r = await context.supabase.from("repositories").insert(payload).select().single();
      if (r.error) throw new Error(r.error.message);
      result = r.data;
    }

    await context.supabase.from("change_history").insert({
      project_id: data.projectId,
      event_type: "repository_connected",
      title: `Connected ${owner}/${repo}`,
      payload: { owner, repo, branch: payload.branch },
      actor_id: context.userId,
    });

    return { id: result.id, github_owner: owner, github_repo: repo, branch: payload.branch };
  });

export const listScans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("repository_scans")
      .select("id, status, commit_sha, started_at, finished_at, error")
      .eq("project_id", data.projectId)
      .order("started_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const scanRepository = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: repo, error: rErr } = await context.supabase
      .from("repositories")
      .select("*")
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!repo) throw new Error("Connect a repository first.");

    const { data: scan, error: sErr } = await context.supabase
      .from("repository_scans")
      .insert({
        repository_id: repo.id,
        project_id: data.projectId,
        status: "running",
      })
      .select()
      .single();
    if (sErr) throw new Error(sErr.message);

    try {
      // Resolve branch HEAD commit
      const branchInfo = await gh(
        `/repos/${repo.github_owner}/${repo.github_repo}/branches/${encodeURIComponent(repo.branch)}`,
        repo.access_token,
      );
      const commitSha = branchInfo.commit?.sha as string;
      const treeSha = branchInfo.commit?.commit?.tree?.sha as string;

      // Fetch tree
      const tree = await gh(
        `/repos/${repo.github_owner}/${repo.github_repo}/git/trees/${treeSha}?recursive=1`,
        repo.access_token,
      );

      const files = (tree.tree ?? []) as Array<{ path: string; type: string; size?: number }>;
      const paths = files.filter((f) => f.type === "blob").map((f) => f.path);

      const wanted = [
        "package.json",
        "bun.lockb",
        "pnpm-lock.yaml",
        "yarn.lock",
        "requirements.txt",
        "pyproject.toml",
        "Pipfile",
        "Cargo.toml",
        "go.mod",
        "Gemfile",
        "composer.json",
        "Dockerfile",
        "docker-compose.yml",
        "docker-compose.yaml",
        "README.md",
        "README",
        ".env.example",
        "vercel.json",
        "netlify.toml",
        "fly.toml",
        "supabase/config.toml",
      ];

      const fetched: Record<string, string> = {};
      for (const path of wanted) {
        if (!paths.includes(path)) continue;
        const txt = await ghRaw(
          `/repos/${repo.github_owner}/${repo.github_repo}/contents/${encodeURIComponent(path)}?ref=${commitSha}`,
          repo.access_token,
        );
        if (txt != null) fetched[path] = txt.slice(0, 50_000);
      }

      const topDirs = Array.from(
        new Set(paths.map((p) => p.split("/")[0]).filter((d) => !d.includes(".") || d === "src")),
      ).slice(0, 40);

      const apiHints = paths
        .filter((p) =>
          /(^|\/)(src\/routes\/api|app\/api|pages\/api|routes\/api|api\/|backend\/|server\/)/.test(
            p,
          ),
        )
        .slice(0, 60);

      const raw = {
        commit_sha: commitSha,
        total_files: paths.length,
        top_dirs: topDirs,
        files: fetched,
        api_hints: apiHints,
        sample_paths: paths.slice(0, 200),
      };

      // Persist raw scan
      await context.supabase
        .from("repository_scans")
        .update({
          status: "succeeded",
          commit_sha: commitSha,
          finished_at: new Date().toISOString(),
          raw_files: raw,
        })
        .eq("id", scan.id);

      // Use Groq AI to build reality model
      const { getGroqModel } = await import("./groq.server");
      const { generateText } = await import("ai");
      const model = getGroqModel();

      let text = "";
      try {
        const res = await generateText({
          model,
          system:
            "You are a senior software architect. Analyze the repository data and produce a precise Reality Model. Respond with ONLY valid JSON matching the requested shape — no markdown, no commentary.",
          prompt:
            `Return a JSON object with EXACTLY this shape (all fields required, arrays may be empty):\n` +
            `{"frontend": string, "backend": string, "database": string, "infrastructure": string[], "dependencies": string[], "services": string[], "api_routes": string[], "features": string[], "summary": string}\n\n` +
            `Repository data:\n${JSON.stringify(raw).slice(0, 40_000)}`,
        });
        text = res.text ?? "";
      } catch (e) {
        throw new Error(`Groq AI call failed: ${(e as Error).message}`);
      }
      if (!text.trim()) throw new Error("AI returned an empty response");

      function extractJson(s: string): unknown {
        let c = s
          .replace(/```json\s*/gi, "")
          .replace(/```\s*/g, "")
          .trim();
        const start = c.search(/[{[]/);
        const end = c.lastIndexOf(c[start] === "[" ? "]" : "}");
        if (start === -1 || end === -1)
          throw new Error(`AI returned no JSON. Raw: ${s.slice(0, 200)}`);
        c = c.slice(start, end + 1);
        try {
          return JSON.parse(c);
        } catch {
          return JSON.parse(
            c
              .replace(/,\s*}/g, "}")
              .replace(/,\s*]/g, "]")
              .split("\n")
              .map(stripControlCharacters)
              .join(""),
          );
        }
      }
      let reality;
      try {
        reality = RealityModelSchema.parse(extractJson(text));
      } catch (e) {
        throw new Error(
          `Failed to parse AI output: ${(e as Error).message}. Raw: ${text.slice(0, 200)}`,
        );
      }

      const { data: realityRow, error: realErr } = await context.supabase
        .from("reality_models")
        .insert({
          scan_id: scan.id,
          project_id: data.projectId,
          ...reality,
        })
        .select()
        .single();
      if (realErr) throw new Error(realErr.message);

      await context.supabase
        .from("repositories")
        .update({ last_scan_at: new Date().toISOString(), last_commit_sha: commitSha })
        .eq("id", repo.id);

      await context.supabase.from("change_history").insert({
        project_id: data.projectId,
        event_type: "repository_scanned",
        title: `Scanned ${repo.github_owner}/${repo.github_repo} @ ${commitSha.slice(0, 7)}`,
        payload: { scan_id: scan.id, commit_sha: commitSha },
        actor_id: context.userId,
      });

      return { scanId: scan.id, realityModelId: realityRow.id, commitSha };
    } catch (e) {
      await context.supabase
        .from("repository_scans")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error: (e as Error).message,
        })
        .eq("id", scan.id);
      throw e;
    }
  });
