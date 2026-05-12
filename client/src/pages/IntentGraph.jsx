import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function IntentGraph() {
  const [planText, setPlanText] = useState(localStorage.getItem("activePlan") || "Implement Stripe payments behind feature flag");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  async function handleRunAlignment() {
    const repoPath = localStorage.getItem("activeRepoPath");
    if (!repoPath) {
        setError("No active repository found. Please go back to Home and analyze a repository first.");
        return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await axios.post("http://localhost:5000/api/intent-graph/align", { 
          planText,
          repoPath
      });
      if (response.data.success) {
        setResults(response.data.results);
      } else {
        setError(response.data.message || "Failed to align");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleOverride(index) {
    const newResults = [...results];
    newResults[index].overridden = !newResults[index].overridden;
    if (newResults[index].overridden) {
        newResults[index].action = "auto-accept";
    } else {
        if (newResults[index].confidence >= 0.85) newResults[index].action = "auto-accept";
        else if (newResults[index].confidence >= 0.7) newResults[index].action = "review";
        else newResults[index].action = "flag";
    }
    setResults(newResults);
  }

  const getActionColor = (action) => {
    switch (action) {
      case "auto-accept": return "bg-success/20 text-success border-success/30 shadow-[0_0_15px_rgba(35,134,54,0.3)]";
      case "review": return "bg-warning/20 text-warning border-warning/30 shadow-[0_0_15px_rgba(210,153,34,0.3)]";
      case "flag": return "bg-danger/20 text-danger border-danger/30 shadow-[0_0_15px_rgba(248,81,73,0.3)]";
      default: return "bg-gh-surface border-gh-border text-gh-muted";
    }
  };

  const getConfidenceColor = (conf) => {
    if (conf >= 0.85) return "text-success drop-shadow-[0_0_8px_rgba(35,134,54,0.8)]";
    if (conf >= 0.7) return "text-warning drop-shadow-[0_0_8px_rgba(210,153,34,0.8)]";
    return "text-danger drop-shadow-[0_0_8px_rgba(248,81,73,0.8)]";
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col font-sans relative overflow-hidden text-gh-text selection:bg-accent/30">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[120px] pointer-events-none animate-pulse duration-[8000ms]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-success/10 blur-[120px] pointer-events-none animate-pulse duration-[10000ms] delay-1000"></div>
      
      {/* Header */}
      <header className="border-b border-gh-border/50 bg-[#0d1117]/60 backdrop-blur-xl px-8 py-4 flex items-center justify-between sticky top-0 z-20 shadow-lg">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 group-hover:border-accent/50 transition-all duration-500 shadow-[0_0_20px_rgba(88,166,255,0.15)] group-hover:shadow-[0_0_25px_rgba(88,166,255,0.3)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-accent group-hover:scale-110 transition-transform duration-500" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 tracking-tight">IntentGraph</h1>
            <p className="text-[10px] uppercase tracking-widest text-accent font-semibold mt-0.5 opacity-80">Deep Alignment Engine</p>
          </div>
        </Link>
        <Link to="/" className="text-sm font-medium text-gh-muted hover:text-white transition-colors duration-300 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to Dashboard
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden max-w-[1600px] mx-auto w-full p-6 gap-6 relative z-10">
        {/* Glass Sidebar */}
        <aside className="w-96 flex flex-col h-full bg-[#161b22]/40 backdrop-blur-md border border-gh-border/50 rounded-3xl shadow-2xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>
          
          <div className="p-6 flex flex-col h-full relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-accent" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="font-semibold text-white tracking-wide text-sm uppercase">Implementation Plan</h2>
            </div>
            
            <div className="relative flex-1 flex flex-col mb-6 group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/30 to-purple-500/30 rounded-2xl blur opacity-20 group-focus-within:opacity-50 transition duration-500"></div>
              <textarea
                value={planText}
                onChange={(e) => setPlanText(e.target.value)}
                className="relative flex-1 bg-[#0d1117]/80 backdrop-blur-sm border border-gh-border rounded-xl p-5 text-sm focus:outline-none focus:border-accent/50 text-gray-300 placeholder-gray-600 resize-none leading-relaxed transition-all duration-300 shadow-inner"
                placeholder="Paste your product plan or requirements here..."
              />
            </div>
            
            <button
              onClick={handleRunAlignment}
              disabled={loading || !planText.trim()}
              className="relative w-full group overflow-hidden rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-[0_0_30px_rgba(88,166,255,0.4)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-accent to-blue-600 transition-all duration-500 group-hover:scale-105"></div>
              <div className="relative px-6 py-4 flex items-center justify-center gap-2 text-white font-bold tracking-wide">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Aligning...</span>
                  </>
                ) : (
                  <>
                    <span>Execute Alignment</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:translate-x-1 transition-transform">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </div>
            </button>
            
            {error && (
              <div className="mt-4 p-4 bg-danger/10 text-danger border border-danger/30 rounded-xl text-sm flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                {error}
              </div>
            )}
          </div>
        </aside>

        {/* Main Glass Content */}
        <main className="flex-1 flex flex-col h-full bg-[#161b22]/40 backdrop-blur-md border border-gh-border/50 rounded-3xl shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          
          <div className="p-8 pb-4 flex items-center justify-between border-b border-gh-border/30">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Alignment Matrix</h2>
              <p className="text-sm text-gh-muted mt-1">Cross-referencing plan requirements with code purposes via Embeddings + LLM</p>
            </div>
            
            {results.length > 0 && !loading && (
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_8px_rgba(35,134,54,0.8)]"></div>
                  <span className="text-gray-300 font-medium">Auto-accept</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-warning shadow-[0_0_8px_rgba(210,153,34,0.8)]"></div>
                  <span className="text-gray-300 font-medium">Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-danger shadow-[0_0_8px_rgba(248,81,73,0.8)]"></div>
                  <span className="text-gray-300 font-medium">Flagged</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-auto p-8 relative">
            {results.length === 0 && !loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <div className="w-24 h-24 rounded-full bg-gh-surface border border-gh-border flex items-center justify-center mb-6 shadow-xl relative group">
                  <div className="absolute inset-0 rounded-full border border-accent/30 scale-110 group-hover:scale-125 transition-transform duration-700 opacity-50"></div>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gh-muted group-hover:text-accent transition-colors duration-500" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Awaiting Instructions</h3>
                <p className="text-gh-muted max-w-md">Input your implementation plan and run the alignment engine to visually map requirements to existing codebase purposes.</p>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d1117]/40 backdrop-blur-sm z-10">
                <div className="relative flex items-center justify-center w-24 h-24 mb-8">
                  <div className="absolute inset-0 border-t-2 border-accent rounded-full animate-spin duration-700"></div>
                  <div className="absolute inset-2 border-b-2 border-purple-500 rounded-full animate-spin duration-1000 direction-reverse"></div>
                  <div className="absolute inset-4 border-l-2 border-success rounded-full animate-spin duration-500"></div>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-accent animate-pulse" stroke="currentColor" strokeWidth="2"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 animate-pulse">Running Deep Alignment...</h3>
                <div className="flex gap-2 items-center text-sm text-gh-muted">
                  <span className="inline-block w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="inline-block w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="inline-block w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  Extracting • Parsing • Embedding
                </div>
              </div>
            )}

            {results.length > 0 && !loading && (
              <div className="space-y-4">
                {results.map((res, i) => (
                  <div 
                    key={i} 
                    className="group bg-[#0d1117]/60 border border-gh-border/50 hover:border-accent/40 rounded-2xl p-5 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] relative overflow-hidden animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationFillMode: 'both', animationDelay: `${i * 100}ms` }}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-gh-border to-transparent group-hover:via-accent transition-colors duration-500"></div>
                    
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`border px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase backdrop-blur-md ${getActionColor(res.action)}`}>
                            {res.overridden ? "Manually Accepted" : res.action}
                          </span>
                          <span className="text-xs font-mono text-gh-muted bg-gh-surface px-2 py-1 rounded-md border border-gh-border">
                            {res.matchedFile}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-200 mb-2 leading-tight">
                          {res.requirement}
                        </h3>
                        <p className="text-sm text-gray-400 leading-relaxed border-l-2 border-gh-border/50 pl-3">
                          {res.explanation}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-4 min-w-[140px]">
                        <div className="text-right">
                          <div className="text-[10px] uppercase tracking-widest text-gh-muted font-semibold mb-1">Confidence Score</div>
                          <div className={`text-3xl font-bold font-mono tracking-tighter ${getConfidenceColor(res.confidence)}`}>
                            {(res.confidence * 100).toFixed(1)}<span className="text-lg opacity-60">%</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleOverride(i)}
                          className="relative overflow-hidden group/btn bg-gh-surface hover:bg-[#1f2937] border border-gh-border hover:border-accent/50 text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 shadow-sm hover:shadow-[0_0_15px_rgba(88,166,255,0.2)]"
                        >
                          <span className="relative z-10">{res.overridden ? "Revert Policy" : "Force Override"}</span>
                          <div className="absolute inset-0 bg-accent/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
