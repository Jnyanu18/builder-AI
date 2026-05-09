import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = "http://localhost:5000";

export default function Home() {
  const [githubUrl, setGithubUrl] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  async function analyze(source, value) {
    if (!value.trim()) return;
    setLoading(true);
    setError("");

    try {
      const { data } = await axios.post(`${API_BASE}/api/analyze`, {
        source,
        value: value.trim(),
        plan: plan.trim() || null,
      });

      navigate("/dashboard", {
        state: {
          commits: data.commits,
          repoPath: data.repoPath,
          plan: plan.trim() || null,
        },
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePlanUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    setPlan(text);
  }

  return (
    <div className="min-h-screen bg-gh-bg flex flex-col">
      {/* Header */}
      <header className="border-b border-gh-border px-8 py-4 flex items-center gap-3">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-accent">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-gh-text font-semibold text-lg">BuildLens AI</span>
      </header>

      {/* Hero */}
      <div className="flex flex-col items-center justify-center pt-16 pb-10 px-4 text-center">
        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-3 py-1 mb-6">
          <span className="w-2 h-2 rounded-full bg-accent"></span>
          <span className="text-accent text-xs font-medium">Commit History Intelligence</span>
        </div>
        <h1 className="text-5xl font-bold text-gh-text mb-4 tracking-tight">
          Make your commits <span className="text-accent">intelligent</span>
        </h1>
        <p className="text-gh-muted text-lg max-w-xl leading-relaxed">
          Analyze any GitHub repository or local project. Understand commit history,
          get AI explanations for every change, and visualize your implementation progress.
        </p>
      </div>

      {/* Input Cards */}
      <div className="flex gap-4 justify-center px-4 max-w-4xl mx-auto w-full">
        {/* GitHub */}
        <div className="flex-1 bg-gh-surface border border-gh-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-gh-muted">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <h2 className="text-gh-text font-semibold">GitHub Repository</h2>
          </div>
          <input
            type="text"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/user/repo.git"
            className="w-full bg-gh-bg border border-gh-border rounded-lg px-3 py-2.5 text-gh-text text-sm placeholder-gh-muted focus:outline-none focus:border-accent transition-colors mb-3"
            onKeyDown={(e) => e.key === "Enter" && analyze("github", githubUrl)}
          />
          <button
            onClick={() => analyze("github", githubUrl)}
            disabled={loading || !githubUrl.trim()}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? "Cloning & Analyzing..." : "Analyze GitHub Repo"}
          </button>
        </div>

        {/* Divider */}
        <div className="flex flex-col items-center justify-center gap-2 py-4">
          <div className="w-px flex-1 bg-gh-border"></div>
          <span className="text-gh-muted text-xs font-medium">OR</span>
          <div className="w-px flex-1 bg-gh-border"></div>
        </div>

        {/* Local */}
        <div className="flex-1 bg-gh-surface border border-gh-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gh-muted">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h2 className="text-gh-text font-semibold">Local Folder</h2>
          </div>
          <input
            type="text"
            value={localPath}
            onChange={(e) => setLocalPath(e.target.value)}
            placeholder="C:\Users\you\projects\my-app"
            className="w-full bg-gh-bg border border-gh-border rounded-lg px-3 py-2.5 text-gh-text text-sm placeholder-gh-muted focus:outline-none focus:border-accent transition-colors mb-3"
            onKeyDown={(e) => e.key === "Enter" && analyze("local", localPath)}
          />
          <button
            onClick={() => analyze("local", localPath)}
            disabled={loading || !localPath.trim()}
            className="w-full bg-gh-surface2 hover:bg-gh-border disabled:opacity-40 disabled:cursor-not-allowed border border-gh-border text-gh-text font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? "Analyzing..." : "Analyze Local Repo"}
          </button>
        </div>
      </div>

      {/* Plan Upload */}
      <div className="max-w-4xl mx-auto w-full px-4 mt-6">
        <div className="bg-gh-surface border border-gh-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gh-muted">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-gh-text text-sm font-medium">Implementation Plan</span>
              <span className="text-gh-muted text-xs">(optional — used for Plan vs Reality analysis)</span>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-accent text-xs hover:text-accent-hover transition-colors flex items-center gap-1"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Upload .md file
            </button>
            <input ref={fileInputRef} type="file" accept=".md,.txt" className="hidden" onChange={handlePlanUpload} />
          </div>
          <textarea
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder={"- User authentication\n- Dashboard UI\n- REST API endpoints\n- Database integration"}
            rows={4}
            className="w-full bg-gh-bg border border-gh-border rounded-lg px-3 py-2.5 text-gh-text text-sm placeholder-gh-muted focus:outline-none focus:border-accent transition-colors resize-none font-mono"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-4xl mx-auto w-full px-4 mt-4">
          <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-3 text-danger text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-gh-bg/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gh-surface border border-gh-border rounded-xl p-8 flex flex-col items-center gap-4 shadow-2xl">
            <div className="w-10 h-10 border-2 border-gh-border border-t-accent rounded-full animate-spin"></div>
            <div className="text-center">
              <p className="text-gh-text font-medium">Analyzing repository...</p>
              <p className="text-gh-muted text-sm mt-1">Extracting commits and calculating stats</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
