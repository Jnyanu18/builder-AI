## IntentOS — MVP Build Plan

An AI-native intent verification platform that compares an approved project blueprint against a real GitHub repository, surfaces drift, and gates changes behind explicit human approval.

### 1. Foundation

- Enable Lovable Cloud (Postgres + Auth) and provision `LOVABLE_API_KEY` for the AI Gateway.
- Set the visual theme: deep navy (`#0A0F1E`) / midnight (`#111A33`) surfaces, electric cyan (`#22D3EE`) accent, light slate (`#E2E8F0`) text. Glassmorphism cards, subtle gradients, Inter for body + a distinctive display font for headings. All tokens in `src/styles.css`.
- Email/password auth + Google sign-in via Lovable Cloud's managed broker.

### 2. Database schema (Lovable Cloud)

Tables (RLS scoped to `auth.uid()` via `owner_id`; user roles in a dedicated `user_roles` table):

- `profiles` (id → auth.users, display_name, avatar_url)
- `projects` (id, owner_id, name, description, status)
- `blueprints` (id, project_id, current_version_id)
- `blueprint_versions` (id, blueprint_id, version_number, vision, personas, functional_reqs jsonb, nonfunctional_reqs jsonb, architecture jsonb, constraints jsonb, milestones jsonb, success_metrics jsonb, approved_at, approved_by)
- `repositories` (id, project_id, github_owner, github_repo, default_branch, github_repo_id, installation_token_ref, last_scan_at, status)
- `repository_scans` (id, repository_id, commit_sha, started_at, finished_at, status, raw_tree jsonb)
- `reality_models` (id, scan_id, frontend, backend, database, infrastructure jsonb, dependencies jsonb, services jsonb, api_routes jsonb, summary)
- `drift_reports` (id, project_id, blueprint_version_id, reality_model_id, alignment_score, drift_score, feature_coverage jsonb, findings jsonb, generated_at)
- `approvals` (id, drift_finding_id, project_id, decision enum [pending|approved|rejected], decided_by, decided_at, note, resulting_blueprint_version_id)
- `change_history` (id, project_id, event_type, payload jsonb, created_at, actor_id)

Each table: `GRANT` block → enable RLS → policies scoped to project owner.

### 3. GitHub OAuth (per-user)

- Use the Lovable App User Connector flow with the `github` connector and popup-based `web_message` response mode (works inside the Lovable preview).
- Server fn `startGithubConnect` → returns authorization URL; client uses `connectAppUser` helper.
- Persist returned `connectionAPIKey` on the `repositories` row (encrypted, server-only access).
- Server fn `listUserRepos` calls `callAsAppUser` → `/user/repos`. UI lets user pick a repo + branch.

### 4. Repository scanner (server fn)

- Fetch repo tree (`/repos/:owner/:repo/git/trees/:sha?recursive=1`).
- Fetch + parse: `package.json`, `requirements.txt`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Dockerfile`, `docker-compose.yml`, `README.md`, `.env.example`, top-level dirs.
- Detect API routes by scanning common framework folders (`src/routes`, `app/api`, `pages/api`, `routes/`).
- Hand the structured findings to the AI gateway (`google/gemini-3-flash-preview`) with a system prompt that returns a strict JSON Reality Model (frontend, backend, db, infra, dependencies, services, summary). Persist to `reality_models`.

### 5. Drift analyzer (AI-powered server fn)

- Input: latest approved `blueprint_version` + latest `reality_model`.
- Prompt the gateway to emit structured findings via `Output.object` schema:
  - `findings[]`: `{ category: feature|architecture|technology|scope, type: missing|unexpected|partial|violation, title, description, severity: low|medium|high|critical, evidence }`.
  - `alignment_score` (0-100), `drift_score`, `feature_coverage { implemented, total }`.
- Persist `drift_report`; auto-create `approvals` rows (pending) for each finding.

### 6. App sections

Routes under `_authenticated/`:

- `/` Dashboard — alignment score, drift score, feature coverage, architecture status, pending approvals; Recharts donut + trendline; project selector.
- `/projects` list + create.
- `/projects/$id/blueprint` — versioned blueprint editor (structured form: vision, personas, features list, non-functional reqs, architecture, constraints, milestones, success metrics). "Approve" creates a new immutable version.
- `/projects/$id/repository` — connect GitHub, pick repo/branch, "Scan now", scan history.
- `/projects/$id/alignment` — latest alignment report with severity-coded findings, expand for evidence.
- `/projects/$id/approvals` — pending drift items; approve (creates Blueprint vN+1 with the change merged) or reject (recorded as confirmed drift).
- `/projects/$id/history` — timeline of all events from `change_history`.

Public route: `/auth` (sign in / sign up). Marketing `/` only if signed-out; otherwise redirect to dashboard.

### 7. UI system

- Sidebar nav with project switcher, top bar with user menu.
- Cards use translucent navy with cyan border-glow; metrics use large numerals + delta chips.
- Severity colors: low=slate, medium=amber, high=orange, critical=rose. Approval state: pending=cyan, approved=emerald, rejected=rose.
- No chat UI, no kanban, no task lists — only verification surfaces.

### Technical notes

- TanStack Start server fns own all DB + AI + GitHub calls. `requireSupabaseAuth` middleware on every protected fn.
- `client.server` (service role) used only for writing reality models / drift reports after the user's session validated the request.
- AI calls via `@ai-sdk/openai-compatible` provider helper at `https://ai.gateway.lovable.dev/v1`, header `Lovable-API-Key`. Default model `google/gemini-3-flash-preview`, structured output via `Output.object` + Zod schemas.
- Each drift_report writes a `change_history` entry; each approval decision writes another, and approvals create a new `blueprint_version` row.

### Out of scope for MVP

- Webhook-based auto-scan on push (manual "Scan now" only).
- Team membership / multi-user projects (single owner per project).
- Billing, notifications, exports.

### Success criteria

A founder signs in, creates a project, fills the blueprint, approves V1, connects a GitHub repo, runs a scan, sees an alignment report with findings, and approves/rejects each finding — producing Blueprint V2 and a clean change history.
