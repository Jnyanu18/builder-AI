import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:5000";

const PLAN_TABS = ["text", "notion", "jira"];

export default function Home() {
  const [githubUrl, setGithubUrl] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [plan, setPlan] = useState("");
  const [planTab, setPlanTab] = useState("text");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Notion
  const [notionKey, setNotionKey] = useState("");
  const [notionUrl, setNotionUrl] = useState("");
  const [notionLoading, setNotionLoading] = useState(false);
  const [notionMsg, setNotionMsg] = useState("");

  // Jira
  const [jiraDomain, setJiraDomain] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraToken, setJiraToken] = useState("");
  const [jiraProject, setJiraProject] = useState("");
  const [jiraLoading, setJiraLoading] = useState(false);
  const [jiraMsg, setJiraMsg] = useState("");

  const fileRef = useRef(null);
  const navigate = useNavigate();

  async function analyze(source, value) {
    if (!value.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/api/analyze`, {
        source, value: value.trim(), plan: plan.trim() || null,
      });
      navigate("/dashboard", { state: { commits: data.commits, repoPath: data.repoPath, plan: plan.trim() || null } });
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function importNotion() {
    if (!notionKey.trim() || !notionUrl.trim()) { setNotionMsg("Enter API key and page URL."); return; }
    setNotionLoading(true); setNotionMsg("");
    try {
      const { data } = await axios.post(`${API}/api/integrations/notion`, { apiKey: notionKey.trim(), pageUrl: notionUrl.trim() });
      setPlan(data.plan);
      setNotionMsg(`✓ Imported ${data.itemCount} items from Notion`);
      setPlanTab("text");
    } catch (err) {
      setNotionMsg("✗ " + (err.response?.data?.error || err.message));
    } finally { setNotionLoading(false); }
  }

  async function importJira() {
    if (!jiraDomain || !jiraEmail || !jiraToken || !jiraProject) { setJiraMsg("Fill all Jira fields."); return; }
    setJiraLoading(true); setJiraMsg("");
    try {
      const { data } = await axios.post(`${API}/api/integrations/jira`, {
        domain: jiraDomain.trim(), email: jiraEmail.trim(), token: jiraToken.trim(), projectKey: jiraProject.trim(),
      });
      setPlan(data.plan);
      setJiraMsg(`✓ Imported ${data.count} issues from Jira`);
      setPlanTab("text");
    } catch (err) {
      setJiraMsg("✗ " + (err.response?.data?.error || err.message));
    } finally { setJiraLoading(false); }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPlan(await file.text());
  }

  return (
    <div className="min-h-screen bg-gh-bg flex flex-col">
      {/* Nav */}
      <header className="border-b border-gh-border px-8 py-4 flex items-center justify-between bg-gh-bg/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" style={{animationDelay:"0.2s"}}></span>
            <span className="w-2.5 h-2.5 rounded-full bg-warning animate-pulse" style={{animationDelay:"0.4s"}}></span>
          </div>
          <span className="text-gh-text font-bold text-lg tracking-tight">BuildLens AI</span>
        </div>
        <nav className="flex items-center gap-6 text-sm">
          <Link to="/monitoring" className="text-gh-muted hover:text-accent transition-colors flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 12h4l3-9 4 18 3-9h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Monitoring
          </Link>
          <a href="http://localhost:5000/api/health" target="_blank" className="text-gh-muted hover:text-gh-text transition-colors text-xs">API ↗</a>
        </nav>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-success/5 pointer-events-none"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-success/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative flex flex-col items-center pt-16 pb-12 px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-8 text-xs font-medium text-accent">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
            Powered by Groq · llama-3.3-70b
          </div>
          <h1 className="text-6xl font-bold text-gh-text mb-5 tracking-tight leading-tight">
            Make commits <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-success">intelligent</span>
          </h1>
          <p className="text-gh-muted text-lg max-w-2xl leading-relaxed mb-3">
            Analyze any GitHub repo or local project. AI explains every commit, validates your notes against real code, and maps your plan to actual progress.
          </p>
          <div className="flex items-center gap-4 text-xs text-gh-muted mt-2">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success"></span>Notion import</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent"></span>Jira import</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning"></span>Plan vs Reality</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger"></span>AI Validation</span>
          </div>
        </div>
      </div>

      {/* Input section */}
      <div className="max-w-5xl mx-auto w-full px-4 pb-4">
        <div className="flex gap-4">
          {/* GitHub */}
          <div className="flex-1 bg-gh-surface border border-gh-border rounded-2xl p-6 hover:border-accent/40 transition-colors group">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-gh-surface2 flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-gh-muted group-hover:text-accent transition-colors">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-gh-text font-semibold text-sm">GitHub Repository</h2>
                <p className="text-gh-muted text-xs">Clone and analyze any public repo</p>
              </div>
            </div>
            <input type="text" value={githubUrl} onChange={e => setGithubUrl(e.target.value)}
              placeholder="https://github.com/user/repo.git"
              className="w-full bg-gh-bg border border-gh-border rounded-xl px-4 py-3 text-gh-text text-sm placeholder-gh-muted focus:outline-none focus:border-accent transition-colors mb-4 font-mono"
              onKeyDown={e => e.key === "Enter" && analyze("github", githubUrl)} />
            <button onClick={() => analyze("github", githubUrl)} disabled={loading || !githubUrl.trim()}
              className="w-full bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-accent/20 text-sm">
              {loading ? "Analyzing…" : "Analyze GitHub Repo →"}
            </button>
          </div>

          {/* Divider */}
          <div className="flex flex-col items-center justify-center gap-2 py-6">
            <div className="w-px flex-1 bg-gh-border"></div>
            <span className="text-gh-border text-xs font-medium px-1">OR</span>
            <div className="w-px flex-1 bg-gh-border"></div>
          </div>

          {/* Local */}
          <div className="flex-1 bg-gh-surface border border-gh-border rounded-2xl p-6 hover:border-success/40 transition-colors group">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-gh-surface2 flex items-center justify-center group-hover:bg-success/10 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gh-muted group-hover:text-success transition-colors">
                  <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h2 className="text-gh-text font-semibold text-sm">Local Folder</h2>
                <p className="text-gh-muted text-xs">Analyze a repo on your machine</p>
              </div>
            </div>
            <input type="text" value={localPath} onChange={e => setLocalPath(e.target.value)}
              placeholder="C:\projects\my-app"
              className="w-full bg-gh-bg border border-gh-border rounded-xl px-4 py-3 text-gh-text text-sm placeholder-gh-muted focus:outline-none focus:border-success transition-colors mb-4 font-mono"
              onKeyDown={e => e.key === "Enter" && analyze("local", localPath)} />
            <button onClick={() => analyze("local", localPath)} disabled={loading || !localPath.trim()}
              className="w-full bg-gh-surface2 hover:bg-gh-border border border-gh-border disabled:opacity-40 disabled:cursor-not-allowed text-gh-text font-semibold py-3 rounded-xl transition-colors text-sm">
              {loading ? "Analyzing…" : "Analyze Local Repo →"}
            </button>
          </div>
        </div>
      </div>

      {/* Plan section with tabs */}
      <div className="max-w-5xl mx-auto w-full px-4 pb-8">
        <div className="bg-gh-surface border border-gh-border rounded-2xl overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-gh-border bg-gh-bg/50">
            {[
              { id: "text", label: "📝 Plan Text", desc: "Paste or type" },
              { id: "notion", label: "◻ Notion", desc: "Import from page" },
              { id: "jira", label: "◈ Jira", desc: "Import issues" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setPlanTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                  planTab === tab.id
                    ? "text-accent border-accent bg-accent/5"
                    : "text-gh-muted border-transparent hover:text-gh-text hover:border-gh-border"
                }`}>
                {tab.label}
                <span className="text-xs text-gh-muted hidden sm:inline">{tab.desc}</span>
              </button>
            ))}
            {planTab === "text" && (
              <div className="ml-auto flex items-center pr-4">
                <button onClick={() => fileRef.current?.click()}
                  className="text-xs text-accent hover:text-accent-hover flex items-center gap-1 transition-colors">
                  ↑ Upload .md
                </button>
                <input ref={fileRef} type="file" accept=".md,.txt" className="hidden" onChange={handleFileUpload} />
              </div>
            )}
          </div>

          {/* Text tab */}
          {planTab === "text" && (
            <div className="p-5">
              <textarea value={plan} onChange={e => setPlan(e.target.value)} rows={5}
                placeholder={"- User authentication\n- REST API endpoints\n- Dashboard UI\n- Database integration\n- Payment flow"}
                className="w-full bg-gh-bg border border-gh-border rounded-xl px-4 py-3 text-gh-text text-sm placeholder-gh-muted focus:outline-none focus:border-accent transition-colors resize-none font-mono leading-relaxed" />
              {plan && <p className="text-gh-muted text-xs mt-2">{plan.split("\n").filter(l => l.trim()).length} plan items ready</p>}
            </div>
          )}

          {/* Notion tab */}
          {planTab === "notion" && (
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gh-muted text-xs font-medium block mb-1.5">Notion Integration API Key</label>
                  <input type="password" value={notionKey} onChange={e => setNotionKey(e.target.value)}
                    placeholder="secret_..."
                    className="w-full bg-gh-bg border border-gh-border rounded-xl px-4 py-2.5 text-gh-text text-sm placeholder-gh-muted focus:outline-none focus:border-accent transition-colors font-mono" />
                </div>
                <div>
                  <label className="text-gh-muted text-xs font-medium block mb-1.5">Page URL or ID</label>
                  <input type="text" value={notionUrl} onChange={e => setNotionUrl(e.target.value)}
                    placeholder="https://notion.so/..."
                    className="w-full bg-gh-bg border border-gh-border rounded-xl px-4 py-2.5 text-gh-text text-sm placeholder-gh-muted focus:outline-none focus:border-accent transition-colors" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={importNotion} disabled={notionLoading}
                  className="bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors">
                  {notionLoading ? "Importing…" : "Import from Notion"}
                </button>
                {notionMsg && <span className={`text-sm ${notionMsg.startsWith("✓") ? "text-success" : "text-danger"}`}>{notionMsg}</span>}
              </div>
              <p className="text-gh-muted text-xs">Get your API key at <span className="text-accent">notion.so/my-integrations</span> · Share the page with your integration first</p>
            </div>
          )}

          {/* Jira tab */}
          {planTab === "jira" && (
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gh-muted text-xs font-medium block mb-1.5">Atlassian Domain</label>
                  <div className="flex items-center bg-gh-bg border border-gh-border rounded-xl overflow-hidden focus-within:border-accent transition-colors">
                    <input type="text" value={jiraDomain} onChange={e => setJiraDomain(e.target.value)}
                      placeholder="mycompany"
                      className="flex-1 bg-transparent px-4 py-2.5 text-gh-text text-sm placeholder-gh-muted focus:outline-none" />
                    <span className="text-gh-muted text-xs pr-3">.atlassian.net</span>
                  </div>
                </div>
                <div>
                  <label className="text-gh-muted text-xs font-medium block mb-1.5">Project Key</label>
                  <input type="text" value={jiraProject} onChange={e => setJiraProject(e.target.value)}
                    placeholder="PROJ"
                    className="w-full bg-gh-bg border border-gh-border rounded-xl px-4 py-2.5 text-gh-text text-sm placeholder-gh-muted focus:outline-none focus:border-accent transition-colors font-mono" />
                </div>
                <div>
                  <label className="text-gh-muted text-xs font-medium block mb-1.5">Email</label>
                  <input type="email" value={jiraEmail} onChange={e => setJiraEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full bg-gh-bg border border-gh-border rounded-xl px-4 py-2.5 text-gh-text text-sm placeholder-gh-muted focus:outline-none focus:border-accent transition-colors" />
                </div>
                <div>
                  <label className="text-gh-muted text-xs font-medium block mb-1.5">API Token</label>
                  <input type="password" value={jiraToken} onChange={e => setJiraToken(e.target.value)}
                    placeholder="API token from id.atlassian.com"
                    className="w-full bg-gh-bg border border-gh-border rounded-xl px-4 py-2.5 text-gh-text text-sm placeholder-gh-muted focus:outline-none focus:border-accent transition-colors" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={importJira} disabled={jiraLoading}
                  className="bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors">
                  {jiraLoading ? "Importing…" : "Import from Jira"}
                </button>
                {jiraMsg && <span className={`text-sm ${jiraMsg.startsWith("✓") ? "text-success" : "text-danger"}`}>{jiraMsg}</span>}
              </div>
              <p className="text-gh-muted text-xs">Generate API token at <span className="text-accent">id.atlassian.com/manage-profile/security/api-tokens</span></p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="max-w-5xl mx-auto w-full px-4 pb-6">
          <div className="bg-danger/10 border border-danger/30 rounded-xl px-5 py-3 text-danger text-sm">{error}</div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-gh-bg/90 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-gh-surface border border-gh-border rounded-2xl p-10 flex flex-col items-center gap-5 shadow-2xl">
            <div className="relative">
              <div className="w-14 h-14 border-2 border-gh-border rounded-full"></div>
              <div className="absolute inset-0 w-14 h-14 border-2 border-transparent border-t-accent rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-gh-text font-semibold text-lg">Analyzing repository…</p>
              <p className="text-gh-muted text-sm mt-1">Extracting commits and building history</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
