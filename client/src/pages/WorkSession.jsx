import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API_BASE = "http://localhost:5000";

export default function WorkSession() {
    const [sessionActive, setSessionActive] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [description, setDescription] = useState("");
    const [repoPath, setRepoPath] = useState(localStorage.getItem("activeRepoPath") || "");
    const [diff, setDiff] = useState("");
    const [verification, setVerification] = useState(null);
    const [loading, setLoading] = useState(false);
    const [applyingFix, setApplyingFix] = useState(null);
    const [error, setError] = useState("");

    // Start session
    function startSession() {
        setSessionActive(true);
        setStartTime(new Date());
        setDescription("");
        setVerification(null);
        setError("");
    }

    // Load diff
    async function loadDiff() {
        if (!repoPath) { setError("Enter repo path"); return; }
        setLoading(true);
        try {
            const { data } = await axios.post(`${API_BASE}/api/work-session/diff`, { repoPath });
            setDiff(data.diff);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally { setLoading(false); }
    }

    // Verify session
    async function verifySession() {
        if (!description.trim()) { setError("Describe what you built"); return; }
        if (!diff) { setError("Load diff first or make changes"); return; }

        setLoading(true);
        setError("");
        try {
            const { data } = await axios.post(`${API_BASE}/api/work-session/verify`, {
                repoPath,
                description: description.trim(),
                diff: diff.slice(0, 10000),
                sessionStart: startTime,
            });
            setVerification(data);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally { setLoading(false); }
    }

    // Auto-fix issue
    async function applyFix(issue, filePath) {
        setApplyingFix(issue);
        try {
            const { data } = await axios.post(`${API_BASE}/api/work-session/auto-fix`, {
                repoPath,
                issue,
                filePath,
            });
            alert(`Fix applied:\n\n${data.fixedCode}`);
            setApplyingFix(null);
        } catch (err) {
            alert(`Fix failed: ${err.message}`);
            setApplyingFix(null);
        }
    }

    // Time duration
    const elapsed = startTime ? Math.round((Date.now() - startTime.getTime()) / 60000) : 0;

    return (
        <div className="min-h-screen bg-gh-bg">
            {/* Header */}
            <header className="border-b border-gh-border px-8 py-4 flex items-center justify-between bg-gh-bg/80 backdrop-blur-sm sticky top-0 z-20">
                <Link to="/" className="flex items-center gap-2 text-gh-text hover:text-accent transition-colors">
                    <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" style={{ animationDelay: "0.2s" }}></span>
                        <span className="w-2 h-2 rounded-full bg-warning animate-pulse" style={{ animationDelay: "0.4s" }}></span>
                    </div>
                    <span className="font-bold">BuildLens AI</span>
                </Link>
                <div className="flex items-center gap-4">
                    {sessionActive && (
                        <div className="flex items-center gap-3 text-sm">
                            <span className="text-gh-muted">Session</span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                                <span className="text-success font-mono">{elapsed}m active</span>
                            </span>
                        </div>
                    )}
                    <Link to="/monitoring" className="text-gh-muted hover:text-accent transition-colors text-sm">Analytics</Link>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-6 py-8">
                {!sessionActive ? (
                    // Empty state
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="text-5xl mb-6">📝</div>
                        <h1 className="text-3xl font-bold text-gh-text mb-3">Daily Work Verification</h1>
                        <p className="text-gh-muted max-w-xl mb-8 leading-relaxed">
                            Start a work session. Describe what you're building. Get an AI-powered verification of your implementation with a completion score, error detection, and automated fixes.
                        </p>
                        <button onClick={startSession}
                            className="bg-accent hover:bg-accent-hover text-white font-semibold px-8 py-4 rounded-xl transition-all hover:shadow-lg hover:shadow-accent/20 text-lg">
                            ▶ Start Work Session
                        </button>
                        <p className="text-gh-muted text-sm mt-6">Takes ~2 minutes to verify and score</p>
                    </div>
                ) : (
                    // Active session
                    <div className="grid grid-cols-3 gap-6">
                        {/* Left: Input */}
                        <div className="col-span-2">
                            <div className="bg-gh-surface border border-gh-border rounded-2xl p-6 mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-gh-text font-semibold text-lg">What did you build today?</h2>
                                    <span className="text-xs text-gh-muted bg-gh-bg px-3 py-1 rounded-full">{elapsed}m</span>
                                </div>
                                <textarea value={description} onChange={e => setDescription(e.target.value)}
                                    placeholder="Describe your work:&#10;- Added JWT authentication&#10;- Implemented refresh token logic&#10;- Added error handling for expired tokens&#10;- Wrote unit tests for auth flow"
                                    rows={7}
                                    className="w-full bg-gh-bg border border-gh-border rounded-xl px-4 py-3 text-gh-text text-sm placeholder-gh-muted focus:outline-none focus:border-accent transition-colors resize-none font-sans leading-relaxed mb-4" />
                                <div className="flex gap-3">
                                    <button onClick={loadDiff} disabled={!repoPath || loading}
                                        className="flex-1 bg-gh-surface2 hover:bg-gh-border text-gh-text font-semibold py-3 rounded-xl transition-colors disabled:opacity-40 border border-gh-border">
                                        📂 Load Changes
                                    </button>
                                    <button onClick={verifySession} disabled={!description.trim() || !diff || loading}
                                        className="flex-1 bg-success hover:bg-success text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-40">
                                        {loading ? "Verifying..." : "✓ Verify Work"}
                                    </button>
                                </div>
                            </div>

                            {/* Repo path input */}
                            <div className="bg-gh-surface border border-gh-border rounded-2xl p-6 mb-6">
                                <label className="text-gh-muted text-xs font-medium block mb-2">Repository Path</label>
                                <div className="flex gap-3">
                                    <input type="text" value={repoPath} onChange={e => setRepoPath(e.target.value)}
                                        placeholder="j:\buildlens ai"
                                        className="flex-1 bg-gh-bg border border-gh-border rounded-xl px-4 py-3 text-gh-text text-sm placeholder-gh-muted focus:outline-none focus:border-accent transition-colors font-mono" />
                                    <button onClick={loadDiff} disabled={!repoPath || loading}
                                        className="bg-accent hover:bg-accent-hover text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-40">
                                        Load Diff
                                    </button>
                                </div>
                            </div>

                            {/* Diff preview */}
                            {diff && (
                                <div className="bg-gh-surface border border-gh-border rounded-2xl p-6 mb-6">
                                    <h3 className="text-gh-text font-semibold mb-3">Changes Detected</h3>
                                    <div className="bg-gh-bg border border-gh-border rounded-lg p-4 font-mono text-xs text-gh-muted max-h-48 overflow-y-auto">
                                        {diff.split("\n").slice(0, 50).map((line, i) => (
                                            <div key={i} className={line.startsWith("+") ? "text-success" : line.startsWith("-") ? "text-danger" : ""}>
                                                {line}
                                            </div>
                                        ))}
                                        {diff.split("\n").length > 50 && <div className="text-gh-muted mt-2">... {diff.split("\n").length - 50} more lines</div>}
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="bg-danger/10 border border-danger/30 rounded-xl px-5 py-4 text-danger text-sm mb-6">{error}</div>
                            )}
                        </div>

                        {/* Right: Score */}
                        {verification && (
                            <div className="col-span-1">
                                <div className="bg-gh-surface border border-gh-border rounded-2xl p-6 sticky top-24">
                                    {/* Score display */}
                                    <div className="text-center mb-6">
                                        <div className="text-5xl font-bold text-accent mb-2">{verification.score}</div>
                                        <div className="text-gh-muted text-sm">/ {verification.maxScore} Completion Score</div>
                                        <div className={`text-xs font-semibold mt-2 ${verification.score >= 80 ? "text-success" :
                                                verification.score >= 60 ? "text-warning" :
                                                    "text-danger"
                                            }`}>
                                            {verification.score >= 80 ? "🟢 Excellent" : verification.score >= 60 ? "🟡 Good" : "🔴 Needs work"}
                                        </div>
                                    </div>

                                    {/* Category breakdown */}
                                    <div className="space-y-2 mb-6 pb-6 border-b border-gh-border">
                                        {Object.entries(verification.categories || {}).map(([key, val]) => (
                                            <div key={key} className="flex items-center justify-between text-sm">
                                                <span className="text-gh-muted capitalize">{key.replace(/_/g, " ")}</span>
                                                <span className="text-gh-text font-mono font-semibold">{val}/25</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Summary */}
                                    <div className="mb-6 pb-6 border-b border-gh-border">
                                        <p className="text-gh-muted text-xs uppercase font-semibold mb-2">Assessment</p>
                                        <p className="text-gh-text text-sm leading-relaxed">{verification.summary}</p>
                                    </div>

                                    {/* Issues */}
                                    {verification.issues?.length > 0 && (
                                        <div>
                                            <p className="text-gh-muted text-xs uppercase font-semibold mb-2">Issues Found ({verification.issues.length})</p>
                                            <div className="space-y-2">
                                                {verification.issues.map((issue, i) => (
                                                    <div key={i} className={`p-2 rounded-lg text-xs ${issue.severity === "critical" ? "bg-danger/10 border border-danger/30 text-danger" :
                                                            issue.severity === "warning" ? "bg-warning/10 border border-warning/30 text-warning" :
                                                                "bg-gh-border text-gh-muted"
                                                        }`}>
                                                        <strong>{issue.type}</strong>: {issue.description}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    <div className="mt-6 flex gap-2">
                                        <button onClick={() => { setSessionActive(false); setVerification(null); }}
                                            className="flex-1 bg-gh-border hover:bg-gh-surface2 text-gh-text font-semibold py-2 rounded-lg transition-colors text-sm">
                                            ← End Session
                                        </button>
                                        <button onClick={() => alert("Commit feature coming soon!")}
                                            className="flex-1 bg-success hover:bg-success text-white font-semibold py-2 rounded-lg transition-colors text-sm">
                                            ✓ Commit Work
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
