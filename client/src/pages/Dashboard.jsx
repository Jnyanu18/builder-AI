import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import CommitTimeline from "../components/CommitTimeline.jsx";
import CommitExplainer from "../components/CommitExplainer.jsx";
import DiffViewer from "../components/DiffViewer.jsx";
import PlanVsReality from "../components/PlanVsReality.jsx";

const API_BASE = "http://localhost:5000";

export default function Dashboard() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const { commits = [], repoPath = "", plan = null } = state || {};

  const [selectedCommit, setSelectedCommit] = useState(commits[0] || null);
  const [explanation, setExplanation] = useState(null);
  const [diffStr, setDiffStr] = useState(null);
  const [planItems, setPlanItems] = useState(null);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);

  useEffect(() => {
    if (!state || !commits.length) {
      navigate("/");
    }
  }, []);

  useEffect(() => {
    if (selectedCommit) {
      loadDiff(selectedCommit.hash);
      setExplanation(null);
    }
  }, [selectedCommit?.hash]);

  useEffect(() => {
    if (plan && commits.length > 0) {
      loadPlanMatch();
    }
  }, []);

  async function loadDiff(commitHash) {
    setLoadingDiff(true);
    setDiffStr(null);
    try {
      const { data } = await axios.post(`${API_BASE}/api/commit/diff`, { repoPath, commitHash });
      setDiffStr(data.diff);
    } catch {
      setDiffStr(null);
    } finally {
      setLoadingDiff(false);
    }
  }

  async function handleExplain() {
    if (!selectedCommit) return;
    setLoadingExplain(true);
    setExplanation(null);
    try {
      const { data } = await axios.post(`${API_BASE}/api/commit/explain`, {
        repoPath,
        commitHash: selectedCommit.hash,
      });
      setExplanation(data.explanation);
    } catch {
      setExplanation("Failed to get explanation.");
    } finally {
      setLoadingExplain(false);
    }
  }

  async function loadPlanMatch() {
    setLoadingPlan(true);
    try {
      const { data } = await axios.post(`${API_BASE}/api/plan/match`, { repoPath, plan, commits });
      setPlanItems(data.items || []);
    } catch {
      setPlanItems([]);
    } finally {
      setLoadingPlan(false);
    }
  }

  function handleSelectCommit(commit) {
    setSelectedCommit(commit);
    setExplanation(null);
  }

  return (
    <div className="min-h-screen bg-gh-bg flex flex-col">
      {/* Header */}
      <header className="border-b border-gh-border px-6 py-3 flex items-center gap-4 sticky top-0 bg-gh-bg z-10 h-14">
        <Link to="/" className="flex items-center gap-2 text-gh-text hover:text-accent transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-semibold">BuildLens AI</span>
        </Link>
        <span className="text-gh-border">|</span>
        <span className="text-gh-muted text-sm truncate max-w-xs">{repoPath.split(/[/\\]/).pop()}</span>
        <span className="ml-auto text-gh-muted text-xs">{commits.length} commits</span>
        <Link
          to="/"
          className="text-xs text-gh-muted hover:text-gh-text border border-gh-border rounded-md px-3 py-1.5 transition-colors"
        >
          ← New Analysis
        </Link>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Commit Timeline */}
        <aside className="timeline-sidebar">
          <CommitTimeline
            commits={commits}
            selected={selectedCommit}
            onSelect={handleSelectCommit}
          />
        </aside>

        {/* Right: 3 stacked sections */}
        <main className="dashboard-content">
          <CommitExplainer
            commit={selectedCommit}
            explanation={explanation}
            loading={loadingExplain}
            onExplain={handleExplain}
          />

          <div className="border-t border-gh-border">
            <DiffViewer diff={diffStr} loading={loadingDiff} commit={selectedCommit} />
          </div>

          {plan && (
            <div className="border-t border-gh-border">
              <PlanVsReality items={planItems} loading={loadingPlan} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
