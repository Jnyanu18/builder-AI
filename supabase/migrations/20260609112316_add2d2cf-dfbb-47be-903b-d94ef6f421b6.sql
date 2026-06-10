
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles self select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles self upsert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PROJECTS
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects owner all" ON public.projects FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER projects_touch BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Helper to check project ownership (used by child-table policies)
CREATE OR REPLACE FUNCTION public.owns_project(_project_id UUID) RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = _project_id AND owner_id = auth.uid())
$$;

-- BLUEPRINT VERSIONS
CREATE TABLE public.blueprint_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  vision TEXT NOT NULL DEFAULT '',
  personas JSONB NOT NULL DEFAULT '[]'::jsonb,
  functional_reqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  nonfunctional_reqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  architecture JSONB NOT NULL DEFAULT '{}'::jsonb,
  constraints JSONB NOT NULL DEFAULT '[]'::jsonb,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  success_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_draft BOOLEAN NOT NULL DEFAULT TRUE,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, version_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blueprint_versions TO authenticated;
GRANT ALL ON public.blueprint_versions TO service_role;
ALTER TABLE public.blueprint_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blueprint owner all" ON public.blueprint_versions FOR ALL TO authenticated USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id));
CREATE TRIGGER blueprint_touch BEFORE UPDATE ON public.blueprint_versions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- REPOSITORIES
CREATE TABLE public.repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  github_owner TEXT NOT NULL,
  github_repo TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  access_token TEXT,
  last_scan_at TIMESTAMPTZ,
  last_commit_sha TEXT,
  status TEXT NOT NULL DEFAULT 'connected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repositories TO authenticated;
GRANT ALL ON public.repositories TO service_role;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "repositories owner all" ON public.repositories FOR ALL TO authenticated USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id));
CREATE TRIGGER repositories_touch BEFORE UPDATE ON public.repositories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- REPOSITORY SCANS
CREATE TABLE public.repository_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  commit_sha TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  raw_files JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repository_scans TO authenticated;
GRANT ALL ON public.repository_scans TO service_role;
ALTER TABLE public.repository_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scans owner all" ON public.repository_scans FOR ALL TO authenticated USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id));

-- REALITY MODELS
CREATE TABLE public.reality_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.repository_scans(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  frontend TEXT,
  backend TEXT,
  database TEXT,
  infrastructure JSONB NOT NULL DEFAULT '[]'::jsonb,
  dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  api_routes JSONB NOT NULL DEFAULT '[]'::jsonb,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reality_models TO authenticated;
GRANT ALL ON public.reality_models TO service_role;
ALTER TABLE public.reality_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reality owner all" ON public.reality_models FOR ALL TO authenticated USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id));

-- DRIFT REPORTS
CREATE TABLE public.drift_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  blueprint_version_id UUID REFERENCES public.blueprint_versions(id) ON DELETE SET NULL,
  reality_model_id UUID REFERENCES public.reality_models(id) ON DELETE SET NULL,
  alignment_score INTEGER NOT NULL DEFAULT 0,
  drift_score INTEGER NOT NULL DEFAULT 0,
  feature_coverage JSONB NOT NULL DEFAULT '{}'::jsonb,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drift_reports TO authenticated;
GRANT ALL ON public.drift_reports TO service_role;
ALTER TABLE public.drift_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drift owner all" ON public.drift_reports FOR ALL TO authenticated USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id));

-- APPROVALS
CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  drift_report_id UUID NOT NULL REFERENCES public.drift_reports(id) ON DELETE CASCADE,
  finding_index INTEGER NOT NULL,
  finding JSONB NOT NULL,
  decision TEXT NOT NULL DEFAULT 'pending',
  note TEXT,
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  resulting_blueprint_version_id UUID REFERENCES public.blueprint_versions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approvals TO authenticated;
GRANT ALL ON public.approvals TO service_role;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approvals owner all" ON public.approvals FOR ALL TO authenticated USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id));

-- CHANGE HISTORY
CREATE TABLE public.change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.change_history TO authenticated;
GRANT ALL ON public.change_history TO service_role;
ALTER TABLE public.change_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history owner all" ON public.change_history FOR ALL TO authenticated USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id));
