function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function CommitExplainer({ commit, explanation, loading, onExplain }) {
  if (!commit) {
    return (
      <div className="p-8 text-center text-gh-muted">
        <p className="text-sm">Select a commit from the timeline to view details.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Commit header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex-1 min-w-0">
          <h2 className="text-gh-text font-semibold text-lg leading-snug mb-2">
            {commit.message}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gh-muted">
            <span className="font-mono text-accent bg-accent/10 px-2 py-0.5 rounded text-xs">{commit.shortHash}</span>
            <span>{commit.author}</span>
            <span>{formatDate(commit.date)}</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            {commit.insertions > 0 && (
              <span className="text-success text-sm font-mono">+{commit.insertions} additions</span>
            )}
            {commit.deletions > 0 && (
              <span className="text-danger text-sm font-mono">-{commit.deletions} deletions</span>
            )}
            {commit.filesChanged > 0 && (
              <span className="text-gh-muted text-sm">{commit.filesChanged} file{commit.filesChanged !== 1 ? "s" : ""} changed</span>
            )}
          </div>
        </div>

        <button
          onClick={onExplain}
          disabled={loading}
          className="flex-shrink-0 flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Analyzing...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Explain This Commit
            </>
          )}
        </button>
      </div>

      {/* AI Explanation */}
      {explanation && (
        <div className="bg-gh-surface border border-gh-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-accent">
                <path d="M12 2a10 10 0 110 20A10 10 0 0112 2zm0 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm1 4h-2v7h2v-7z" />
              </svg>
            </div>
            <span className="text-gh-muted text-xs font-medium uppercase tracking-wide">AI Explanation</span>
          </div>
          <div className="text-gh-text text-sm leading-relaxed whitespace-pre-wrap">
            {explanation}
          </div>
        </div>
      )}

      {!explanation && !loading && (
        <div className="bg-gh-surface border border-dashed border-gh-border rounded-xl p-6 text-center">
          <p className="text-gh-muted text-sm">Click "Explain This Commit" to get an AI-powered explanation of what changed and why.</p>
        </div>
      )}

      {loading && !explanation && (
        <div className="bg-gh-surface border border-gh-border rounded-xl p-6 text-center">
          <div className="w-8 h-8 border-2 border-gh-border border-t-accent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gh-muted text-sm">Gemini is analyzing the diff...</p>
        </div>
      )}
    </div>
  );
}
