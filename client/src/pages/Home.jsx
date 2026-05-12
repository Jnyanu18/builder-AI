import { useState, useRef, useEffect } from "react";
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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  async function analyze(source, value) {
    if (!value.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/api/analyze`, {
        source, value: value.trim(), plan: plan.trim() || null,
      });
      localStorage.setItem("activeRepoPath", data.repoPath);
      localStorage.setItem("activePlan", plan.trim() || "");
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
    <div className="min-h-screen bg-gradient-to-br from-gh-bg via-[#0a0e17] to-gh-bg flex flex-col overflow-x-hidden relative">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "4s" }}></div>
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-success/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "6s", animationDelay: "1s" }}></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "5s", animationDelay: "2s" }}></div>
      </div>

      {/* Nav */}
      <header className="relative z-20 border-b border-gh-border/30 px-8 py-5 flex items-center justify-between bg-gh-bg/40 backdrop-blur-xl sticky top-0 border-b-gh-border">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gradient-to-r from-success to-accent animate-pulse"></span>
            <span className="w-3 h-3 rounded-full bg-gradient-to-r from-accent to-warning animate-pulse" style={{ animationDelay: "0.2s" }}></span>
            <span className="w-3 h-3 rounded-full bg-gradient-to-r from-warning to-danger animate-pulse" style={{ animationDelay: "0.4s" }}></span>
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-accent via-success to-accent bg-clip-text text-transparent tracking-tight">BuildLens AI</span>
        </div>
        <nav className="flex items-center gap-8 text-sm">
          <Link to="/work-session" className="text-gh-muted hover:text-accent transition-all hover:gap-2 flex items-center gap-1.5 group">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="group-hover:translate-x-0.5 transition-transform">Work Session</span>
          </Link>
          <Link to="/intent-graph" className="text-gh-muted hover:text-success transition-all hover:gap-2 flex items-center gap-1.5 group">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="group-hover:translate-x-0.5 transition-transform">IntentGraph</span>
          </Link>
          <Link to="/monitoring" className="text-gh-muted hover:text-warning transition-all hover:gap-2 flex items-center gap-1.5 group">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 12h4l3-9 4 18 3-9h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="group-hover:translate-x-0.5 transition-transform">Monitoring</span>
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <div className="relative z-10 overflow-hidden">
        <div className="relative flex flex-col items-center pt-20 pb-16 px-4 text-center">
          <div className="inline-flex items-center gap-2.5 bg-gradient-to-r from-accent/20 to-success/10 border border-accent/30 rounded-full px-5 py-2 mb-10 text-xs font-semibold text-accent backdrop-blur-sm hover:border-accent/50 transition-colors">
            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-accent to-success animate-pulse"></span>
            AI-Powered Commit Intelligence
          </div>
          <h1 className="text-7xl font-black text-gh-text mb-6 tracking-tight leading-tight max-w-4xl">
            Make commits <span className="bg-gradient-to-r from-accent via-success to-accent bg-clip-text text-transparent animate-pulse">intelligent</span>
          </h1>
          <p className="text-lg text-gh-muted max-w-3xl leading-relaxed mb-4">
            Analyze any GitHub repo or local project. AI explains every commit, validates your plan vs actual code, and tracks implementation progress with precision.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gh-muted mt-4">
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gh-surface/50 border border-gh-border/30 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>Notion sync
            </span>
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gh-surface/50 border border-gh-border/30 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>Jira integration
            </span>
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gh-surface/50 border border-gh-border/30 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>Plan verification
            </span>
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gh-surface/50 border border-gh-border/30 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-danger animate-pulse"></span>AI validation
            </span>
          </div>
        </div>
      </div>

      {/* Input section with glassmorphism */}
      <div className="relative z-10 max-w-6xl mx-auto w-full px-4 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* GitHub */}
          <div className="group relative bg-gradient-to-br from-gh-surface/40 to-gh-surface/10 border border-accent/20 rounded-3xl p-8 backdrop-blur-xl hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/10 transition-all duration-300">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center border border-accent/30 group-hover:border-accent/60 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-accent">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-gh-text font-bold text-base">GitHub Repository</h2>
                  <p className="text-gh-muted text-xs">Clone and analyze</p>
                </div>
              </div>
              <input type="text" value={githubUrl} onChange={e => setGithubUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
                className="w-full bg-gh-bg/80 border border-gh-border/40 rounded-xl px-5 py-3.5 text-gh-text text-sm placeholder-gh-muted/60 focus:outline-none focus:border-accent/60 focus:bg-gh-bg transition-all mb-4 font-mono backdrop-blur-sm"
                onKeyDown={e => e.key === "Enter" && analyze("github", githubUrl)} />
              <button onClick={() => analyze("github", githubUrl)} disabled={loading || !githubUrl.trim()}
                className="w-full bg-gradient-to-r from-accent to-accent-hover hover:shadow-lg hover:shadow-accent/30 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all text-sm group/btn relative overflow-hidden">
                <span className="relative flex items-center justify-center gap-2">
                  <span>Analyze Repo</span>
                  <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                </span>
              </button>
            </div>
          </div>

          {/* Local */}
          <div className="group relative bg-gradient-to-br from-gh-surface/40 to-gh-surface/10 border border-success/20 rounded-3xl p-8 backdrop-blur-xl hover:border-success/40 hover:shadow-2xl hover:shadow-success/10 transition-all duration-300">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-success/30 to-success/10 flex items-center justify-center border border-success/30 group-hover:border-success/60 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-success">
                    <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-gh-text font-bold text-base">Local Folder</h2>
                  <p className="text-gh-muted text-xs">Analyze locally</p>
                </div>
              </div>
              <input type="text" value={localPath} onChange={e => setLocalPath(e.target.value)}
                placeholder="C:\projects\my-app or /Users/path/repo"
                className="w-full bg-gh-bg/80 border border-gh-border/40 rounded-xl px-5 py-3.5 text-gh-text text-sm placeholder-gh-muted/60 focus:outline-none focus:border-success/60 focus:bg-gh-bg transition-all mb-4 font-mono backdrop-blur-sm"
                onKeyDown={e => e.key === "Enter" && analyze("local", localPath)} />
              <button onClick={() => analyze("local", localPath)} disabled={loading || !localPath.trim()}
                className="w-full bg-gradient-to-r from-success to-success border border-success/30 hover:shadow-lg hover:shadow-success/30 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all text-sm group/btn relative overflow-hidden">
                <span className="relative flex items-center justify-center gap-2">
                  <span>Analyze Local</span>
                  <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Plan section */}
      <div className="relative z-10 max-w-6xl mx-auto w-full px-4 pb-10">
        <div className="bg-gradient-to-br from-gh-surface/30 to-gh-surface/10 border border-gh-border/20 rounded-3xl overflow-hidden backdrop-blur-xl">
          {/* Tab bar */}
          <div className="flex border-b border-gh-border/20 bg-gh-bg/20 p-1">
            {[
              { id: "text", label: "📝 Plan Text", icon: "📋" },
              { id: "notion", label: "◻ Notion", icon: "🔗" },
              { id: "jira", label: "◈ Jira", icon: "🎯" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setPlanTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all flex-1 relative ${planTab === tab.id
                  ? "text-accent"
                  : "text-gh-muted hover:text-gh-text"
                  }`}>
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
                {planTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-accent to-success"></div>}
              </button>
            ))}
            {planTab === "text" && (
              <div className="ml-auto flex items-center pr-6">
                <button onClick={() => fileRef.current?.click()}
                  className="text-xs font-semibold text-accent hover:text-accent-hover flex items-center gap-1.5 transition-colors px-3 py-2 rounded-lg hover:bg-accent/10">
                  ⬆ Upload .md
                </button>
                <input ref={fileRef} type="file" accept=".md,.txt" className="hidden" onChange={handleFileUpload} />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-8">
            {planTab === "text" && (
              <div>
                <textarea value={plan} onChange={e => setPlan(e.target.value)} rows={6}
                  placeholder={"• User authentication\n• REST API endpoints\n• Dashboard UI\n• Database integration\n• Payment flow\n• Analytics tracking"}
                  className="w-full bg-gh-bg/80 border border-gh-border/30 rounded-xl px-5 py-4 text-gh-text text-sm placeholder-gh-muted/50 focus:outline-none focus:border-accent/60 transition-all resize-none font-mono leading-relaxed backdrop-blur-sm" />
                {plan && <p className="text-gh-muted text-xs mt-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                  {plan.split("\n").filter(l => l.trim()).length} plan items ready
                </p>}
              </div>
            )}

            {planTab === "notion" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gh-muted text-xs font-semibold block mb-2 uppercase tracking-wide">API Key</label>
                    <input type="password" value={notionKey} onChange={e => setNotionKey(e.target.value)}
                      placeholder="secret_..."
                      className="w-full bg-gh-bg/80 border border-gh-border/30 rounded-lg px-4 py-3 text-gh-text text-sm placeholder-gh-muted/50 focus:outline-none focus:border-accent/60 transition-all font-mono backdrop-blur-sm" />
                  </div>
                  <div>
                    <label className="text-gh-muted text-xs font-semibold block mb-2 uppercase tracking-wide">Page URL</label>
                    <input type="text" value={notionUrl} onChange={e => setNotionUrl(e.target.value)}
                      placeholder="https://notion.so/..."
                      className="w-full bg-gh-bg/80 border border-gh-border/30 rounded-lg px-4 py-3 text-gh-text text-sm placeholder-gh-muted/50 focus:outline-none focus:border-accent/60 transition-all backdrop-blur-sm" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={importNotion} disabled={notionLoading}
                    className="bg-gradient-to-r from-accent to-accent-hover hover:shadow-lg hover:shadow-accent/20 disabled:opacity-40 text-white text-sm font-bold px-6 py-2.5 rounded-lg transition-all">
                    {notionLoading ? "Importing…" : "Import"}
                  </button>
                  {notionMsg && <span className={`text-sm font-medium ${notionMsg.startsWith("✓") ? "text-success" : "text-danger"}`}>{notionMsg}</span>}
                </div>
              </div>
            )}

            {planTab === "jira" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gh-muted text-xs font-semibold block mb-2 uppercase tracking-wide">Domain</label>
                    <div className="flex items-center bg-gh-bg/80 border border-gh-border/30 rounded-lg overflow-hidden focus-within:border-accent/60 transition-colors">
                      <input type="text" value={jiraDomain} onChange={e => setJiraDomain(e.target.value)}
                        placeholder="mycompany"
                        className="flex-1 bg-transparent px-4 py-3 text-gh-text text-sm placeholder-gh-muted/50 focus:outline-none" />
                      <span className="text-gh-muted text-xs pr-4">.atlassian.net</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-gh-muted text-xs font-semibold block mb-2 uppercase tracking-wide">Project Key</label>
                    <input type="text" value={jiraProject} onChange={e => setJiraProject(e.target.value)}
                      placeholder="PROJ"
                      className="w-full bg-gh-bg/80 border border-gh-border/30 rounded-lg px-4 py-3 text-gh-text text-sm placeholder-gh-muted/50 focus:outline-none focus:border-accent/60 transition-all font-mono" />
                  </div>
                  <div>
                    <label className="text-gh-muted text-xs font-semibold block mb-2 uppercase tracking-wide">Email</label>
                    <input type="email" value={jiraEmail} onChange={e => setJiraEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full bg-gh-bg/80 border border-gh-border/30 rounded-lg px-4 py-3 text-gh-text text-sm placeholder-gh-muted/50 focus:outline-none focus:border-accent/60 transition-all" />
                  </div>
                  <div>
                    <label className="text-gh-muted text-xs font-semibold block mb-2 uppercase tracking-wide">API Token</label>
                    <input type="password" value={jiraToken} onChange={e => setJiraToken(e.target.value)}
                      placeholder="Token from id.atlassian.com"
                      className="w-full bg-gh-bg/80 border border-gh-border/30 rounded-lg px-4 py-3 text-gh-text text-sm placeholder-gh-muted/50 focus:outline-none focus:border-accent/60 transition-all" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={importJira} disabled={jiraLoading}
                    className="bg-gradient-to-r from-accent to-accent-hover hover:shadow-lg hover:shadow-accent/20 disabled:opacity-40 text-white text-sm font-bold px-6 py-2.5 rounded-lg transition-all">
                    {jiraLoading ? "Importing…" : "Import"}
                  </button>
                  {jiraMsg && <span className={`text-sm font-medium ${jiraMsg.startsWith("✓") ? "text-success" : "text-danger"}`}>{jiraMsg}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="relative z-10 max-w-6xl mx-auto w-full px-4 pb-6">
          <div className="bg-danger/10 border border-danger/40 rounded-xl px-6 py-4 text-danger text-sm font-medium backdrop-blur-sm">✕ {error}</div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-gh-bg/95 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gh-surface/80 to-gh-surface/40 border border-gh-border/30 rounded-3xl p-12 flex flex-col items-center gap-6 shadow-2xl backdrop-blur-xl">
            <div className="relative">
              <div className="w-16 h-16 border-3 border-gh-border/30 rounded-full"></div>
              <div className="absolute inset-0 w-16 h-16 border-3 border-transparent border-t-gradient-to-r border-t-accent rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-gh-text font-bold text-xl">Analyzing…</p>
              <p className="text-gh-muted text-sm mt-2">Extracting commits and building history</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
