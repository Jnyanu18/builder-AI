import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:5000";

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const EVENT_LABELS = {
  repo_analyzed:    { label: "Repo analyzed",    color: "text-accent",   dot: "bg-accent"   },
  commit_explained: { label: "Commit explained",  color: "text-success",  dot: "bg-success"  },
  note_validated:   { label: "Note validated",    color: "text-warning",  dot: "bg-warning"  },
  plan_matched:     { label: "Plan matched",      color: "text-danger",   dot: "bg-danger"   },
};

function StatCard({ value, label, sub, color }) {
  return (
    <div className="bg-gh-surface border border-gh-border rounded-2xl p-6 hover:border-gh-border/80 transition-colors">
      <p className={`text-4xl font-bold mb-1 ${color}`}>{value}</p>
      <p className="text-gh-text font-semibold text-sm">{label}</p>
      {sub && <p className="text-gh-muted text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Monitoring() {
  const [stats, setStats] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [error, setError] = useState("");

  const fetchData = () => {
    setLoading(true);
    setLoadingSuggestions(true);
    axios.get(`${API}/api/analytics`)
      .then(r => setStats(r.data))
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
      
    axios.get(`${API}/api/analytics/suggestions`)
      .then(r => setSuggestions(r.data.suggestions || []))
      .catch(e => console.error(e))
      .finally(() => setLoadingSuggestions(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gh-bg">
      {/* Header */}
      <header className="border-b border-gh-border px-8 py-4 flex items-center gap-4 sticky top-0 bg-gh-bg z-10">
        <Link to="/" className="flex items-center gap-2 text-gh-text hover:text-accent transition-colors">
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            <span className="w-2 h-2 rounded-full bg-accent"></span>
            <span className="w-2 h-2 rounded-full bg-warning"></span>
          </div>
          <span className="font-bold">BuildLens AI</span>
        </Link>
        <span className="text-gh-border">|</span>
        <span className="text-gh-muted text-sm flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 12h4l3-9 4 18 3-9h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Monitoring Dashboard
        </span>
        <button onClick={fetchData}
          className="ml-auto text-xs text-gh-muted hover:text-gh-text border border-gh-border rounded-lg px-3 py-1.5 transition-colors">
          ↺ Refresh
        </button>
        <Link to="/" className="text-xs text-gh-muted hover:text-gh-text border border-gh-border rounded-lg px-3 py-1.5 transition-colors">
          ← New Analysis
        </Link>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-2 border-gh-border border-t-accent rounded-full animate-spin"></div>
          </div>
        )}

        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-xl px-5 py-4 text-danger text-sm mb-6">{error}</div>
        )}

        {stats && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <StatCard value={stats.counts.repo_analyzed}    label="Repos Analyzed"     sub="total sessions"       color="text-accent"  />
              <StatCard value={stats.counts.commit_explained} label="Commits Explained"   sub="via AI"               color="text-success" />
              <StatCard value={stats.counts.note_validated}   label="Notes Validated"     sub="developer annotations" color="text-warning" />
              <StatCard value={stats.counts.plan_matched}     label="Plans Matched"        sub="Notion / Jira / text" color="text-danger"  />
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Recent activity */}
              <div className="col-span-2 bg-gh-surface border border-gh-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gh-border flex items-center justify-between">
                  <h2 className="text-gh-text font-semibold">Recent Activity</h2>
                  <span className="text-gh-muted text-xs">{stats.recent.length} events</span>
                </div>
                <div className="divide-y divide-gh-border max-h-[480px] overflow-y-auto">
                  {stats.recent.length === 0 ? (
                    <div className="px-6 py-12 text-center text-gh-muted text-sm">
                      No activity yet. Analyze a repo to start tracking.
                    </div>
                  ) : stats.recent.map((e, i) => {
                    const cfg = EVENT_LABELS[e.type] || { label: e.type, color: "text-gh-muted", dot: "bg-gh-muted" };
                    const repo = e.data?.repoPath?.split(/[/\\]/).pop() || e.data?.path?.split(/[/\\]/).pop() || "—";
                    return (
                      <div key={i} className="px-6 py-3.5 flex items-center gap-4 hover:bg-gh-surface2 transition-colors">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`}></div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
                          <span className="text-gh-muted text-sm"> · </span>
                          <span className="text-gh-text text-sm truncate">{repo}</span>
                          {e.data?.commitHash && (
                            <span className="text-gh-muted text-xs font-mono ml-2">{String(e.data.commitHash).slice(0,7)}</span>
                          )}
                          {e.data?.commitCount && (
                            <span className="text-gh-muted text-xs ml-2">{e.data.commitCount} commits</span>
                          )}
                        </div>
                        <span className="text-gh-muted text-xs flex-shrink-0">{timeAgo(e.timestamp)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right column: AI Suggestions & Top repos */}
              <div className="flex flex-col gap-6">
                {/* AI Suggestions Card */}
                <div className="bg-gradient-to-br from-gh-surface to-accent/5 border border-accent/20 rounded-2xl overflow-hidden shadow-[0_0_15px_rgba(88,166,255,0.1)] relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="px-6 py-4 border-b border-accent/20 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-accent animate-pulse" stroke="currentColor" strokeWidth="2"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <h2 className="text-accent font-semibold">AI History Insights</h2>
                  </div>
                  <div className="p-6 relative z-10">
                    {loadingSuggestions ? (
                      <div className="flex flex-col items-center justify-center py-6 gap-3">
                        <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div>
                        <span className="text-xs text-accent">Analyzing activity history...</span>
                      </div>
                    ) : suggestions.length > 0 ? (
                      <ul className="space-y-4">
                        {suggestions.map((sug, i) => (
                          <li key={i} className="flex gap-3 text-sm text-gray-300">
                            <span className="text-accent mt-0.5">•</span>
                            <span>{sug}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-gh-muted">No insights available right now.</div>
                    )}
                  </div>
                </div>

                {/* Top repos */}
                <div className="bg-gh-surface border border-gh-border rounded-2xl overflow-hidden flex-1">
                  <div className="px-6 py-4 border-b border-gh-border">
                    <h2 className="text-gh-text font-semibold">Top Repos</h2>
                  </div>
                  <div className="divide-y divide-gh-border">
                    {stats.topRepos.length === 0 ? (
                      <div className="px-6 py-12 text-center text-gh-muted text-sm">No repos yet.</div>
                    ) : stats.topRepos.map((repo, i) => (
                      <div key={i} className="px-6 py-4 hover:bg-gh-surface2 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gh-text text-sm font-medium truncate">{repo.name}</span>
                          <span className="text-accent text-xs font-mono ml-2 flex-shrink-0">{repo.count}×</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 bg-gh-border rounded-full h-1 mr-3">
                            <div className="bg-accent h-1 rounded-full transition-all"
                              style={{ width: `${Math.min(100, (repo.count / (stats.topRepos[0]?.count || 1)) * 100)}%` }}></div>
                          </div>
                          <span className="text-gh-muted text-xs flex-shrink-0">{timeAgo(repo.last)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick links */}
                  <div className="p-4 border-t border-gh-border space-y-2 mt-auto">
                    <Link to="/" className="flex items-center gap-2 text-accent text-sm hover:text-accent-hover transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      New analysis
                    </Link>
                    <a href="http://localhost:5000/api/analytics" target="_blank"
                      className="flex items-center gap-2 text-gh-muted text-sm hover:text-gh-text transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      Raw analytics JSON
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
