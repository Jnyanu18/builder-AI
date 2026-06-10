import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getRepository,
  connectRepository,
  scanRepository,
  listScans,
} from "@/lib/repositories.functions";
import { getRepoSecrets } from "@/lib/overview.functions";
import { ProjectTabs } from "@/components/project-tabs";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GitBranch, Play, Copy, Code2, Webhook } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects/$id/repository")({
  head: () => ({ meta: [{ title: "Repository — IntentOS" }] }),
  component: RepoPage,
});

function RepoPage() {
  const { id } = useParams({ from: "/_authenticated/projects/$id/repository" });
  const qc = useQueryClient();
  const getFn = useServerFn(getRepository);
  const connectFn = useServerFn(connectRepository);
  const scanFn = useServerFn(scanRepository);
  const listFn = useServerFn(listScans);
  const secretsFn = useServerFn(getRepoSecrets);

  const { data: repo } = useQuery({
    queryKey: ["repo", id],
    queryFn: () => getFn({ data: { projectId: id } }),
  });
  const { data: scans } = useQuery({
    queryKey: ["scans", id],
    queryFn: () => listFn({ data: { projectId: id } }),
  });
  const { data: secrets } = useQuery({
    queryKey: ["repo-secrets", id],
    queryFn: () => secretsFn({ data: { projectId: id } }),
  });
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setWebhookUrl(`${window.location.origin}/api/public/projects/${id}/github-webhook`);
    }
  }, [id]);

  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [token, setToken] = useState("");

  const connect = useMutation({
    mutationFn: () => connectFn({ data: { projectId: id, repoUrl: url, branch, token } }),
    onSuccess: () => {
      toast.success("Repository connected");
      qc.invalidateQueries({ queryKey: ["repo", id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const scan = useMutation({
    mutationFn: () => scanFn({ data: { projectId: id } }),
    onSuccess: () => {
      toast.success("Scan complete");
      qc.invalidateQueries({ queryKey: ["repo", id] });
      qc.invalidateQueries({ queryKey: ["scans", id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-display font-bold tracking-tight">Repository</h1>
      <ProjectTabs projectId={id} />

      <div className="glass rounded-xl p-6">
        <h3 className="font-display text-lg font-semibold mb-1">Connect a GitHub repository</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Paste a repository URL. For private repos, provide a fine-grained personal access token
          with <span className="font-mono text-foreground">Contents: Read</span>.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="rounded-lg border border-border bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="main"
            className="rounded-lg border border-border bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          type="password"
          placeholder="GitHub token (optional, required for private repos)"
          className="mt-3 w-full rounded-lg border border-border bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => connect.mutate()}
            disabled={connect.isPending || !url}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {connect.isPending ? "Connecting…" : repo ? "Update connection" : "Connect"}
          </button>
        </div>
      </div>

      {repo && (
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 text-lg font-display font-semibold">
                <GitBranch className="h-5 w-5 text-primary" />
                {repo.github_owner}/{repo.github_repo}
              </div>
              <div className="text-sm text-muted-foreground">
                Branch: {repo.branch}
                {repo.last_scan_at &&
                  ` · Last scan ${new Date(repo.last_scan_at).toLocaleString()}`}
              </div>
            </div>
            <button
              onClick={() => scan.mutate()}
              disabled={scan.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Play className="h-4 w-4" /> {scan.isPending ? "Scanning…" : "Scan now"}
            </button>
          </div>

          {scans && scans.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
                Scan history
              </h4>
              {scans.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-background/30 px-4 py-2 text-sm"
                >
                  <span className="font-mono">{s.commit_sha ? s.commit_sha.slice(0, 8) : "—"}</span>
                  <span className="text-muted-foreground">
                    {new Date(s.started_at).toLocaleString()}
                  </span>
                  <span
                    className={
                      s.status === "succeeded"
                        ? "text-success"
                        : s.status === "failed"
                          ? "text-danger"
                          : "text-primary"
                    }
                  >
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Code2 className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-semibold">VS Code extension &amp; API</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Trigger drift analysis from your editor or CI. The IntentOS VS Code extension uses these
          credentials to call the public API.
        </p>
        <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Project ID
        </label>
        <div className="mt-1 mb-4 flex gap-2">
          <input
            readOnly
            value={id}
            className="flex-1 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm font-mono"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(id);
              toast.success("Project ID copied");
            }}
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent/40"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          API token
        </label>
        <div className="mt-1 flex gap-2">
          <input
            readOnly
            type={showToken ? "text" : "password"}
            value={secrets?.api_token ?? ""}
            className="flex-1 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm font-mono"
          />
          <button
            onClick={() => setShowToken((s) => !s)}
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent/40"
          >
            {showToken ? "Hide" : "Show"}
          </button>
          <button
            onClick={() => {
              if (secrets?.api_token) {
                navigator.clipboard.writeText(secrets.api_token);
                toast.success("Token copied");
              }
            }}
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent/40"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Endpoint:{" "}
          <span className="font-mono text-foreground">POST /api/public/projects/{id}/drift</span> ·
          Auth:{" "}
          <span className="font-mono text-foreground">Authorization: Bearer &lt;token&gt;</span>
        </p>
      </div>

      {repo && (
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <Webhook className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold">Auto-drift on push</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Add a GitHub webhook so every push to{" "}
            <span className="font-mono text-foreground">{repo.branch}</span> auto-runs drift
            analysis.
          </p>
          <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Payload URL
          </label>
          <div className="mt-1 mb-4 flex gap-2">
            <input
              readOnly
              value={webhookUrl}
              className="flex-1 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm font-mono"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(webhookUrl);
                toast.success("URL copied");
              }}
              className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent/40"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Webhook secret
          </label>
          <div className="mt-1 flex gap-2">
            <input
              readOnly
              type={showSecret ? "text" : "password"}
              value={secrets?.webhook_secret ?? ""}
              className="flex-1 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm font-mono"
            />
            <button
              onClick={() => setShowSecret((s) => !s)}
              className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent/40"
            >
              {showSecret ? "Hide" : "Show"}
            </button>
            <button
              onClick={() => {
                if (secrets?.webhook_secret) {
                  navigator.clipboard.writeText(secrets.webhook_secret);
                  toast.success("Secret copied");
                }
              }}
              className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent/40"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <ol className="mt-4 list-decimal list-inside text-xs text-muted-foreground space-y-1">
            <li>
              Go to your GitHub repo →{" "}
              <span className="font-mono text-foreground">Settings → Webhooks → Add webhook</span>.
            </li>
            <li>
              Paste the Payload URL above. Content type:{" "}
              <span className="font-mono text-foreground">application/json</span>.
            </li>
            <li>
              Paste the Webhook secret. Select{" "}
              <span className="font-mono text-foreground">Just the push event</span>.
            </li>
            <li>
              Save. IntentOS will re-run drift on every push to{" "}
              <span className="font-mono text-foreground">{repo.branch}</span>.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
