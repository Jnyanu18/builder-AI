function sizeColor(insertions, deletions) {
  const total = insertions + deletions;
  if (total >= 200) return "text-danger border-danger";
  if (total >= 50) return "text-warning border-warning";
  return "text-success border-success";
}

function sizeDot(insertions, deletions) {
  const total = insertions + deletions;
  if (total >= 200) return "bg-danger";
  if (total >= 50) return "bg-warning";
  return "bg-success";
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function CommitTimeline({ commits, selected, onSelect }) {
  return (
    <div className="flex flex-col">
      <div className="px-4 py-3 border-b border-gh-border">
        <h2 className="text-gh-text text-sm font-semibold">Commit History</h2>
        <p className="text-gh-muted text-xs mt-0.5">{commits.length} commits loaded</p>
      </div>

      <div className="flex flex-col">
        {commits.map((commit, index) => {
          const isSelected = selected?.hash === commit.hash;
          const dotColor = sizeDot(commit.insertions, commit.deletions);

          return (
            <button
              key={commit.hash}
              onClick={() => onSelect(commit)}
              className={`w-full text-left px-4 py-3 border-b border-gh-border transition-colors relative group
                ${isSelected
                  ? "bg-accent/10 border-l-2 border-l-accent"
                  : "hover:bg-gh-surface2 border-l-2 border-l-transparent"
                }`}
            >
              {/* Timeline dot + line */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center mt-1 flex-shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${dotColor} ${isSelected ? "ring-2 ring-accent/30" : ""}`}></div>
                  {index < commits.length - 1 && (
                    <div className="w-px flex-1 bg-gh-border mt-1" style={{ minHeight: "20px" }}></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Message */}
                  <p className={`text-sm font-medium leading-snug truncate ${isSelected ? "text-accent" : "text-gh-text"}`}>
                    {commit.message}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-gh-muted text-xs font-mono">{commit.shortHash}</span>
                    <span className="text-gh-border">·</span>
                    <span className="text-gh-muted text-xs truncate max-w-[90px]">{commit.author}</span>
                    <span className="text-gh-border">·</span>
                    <span className="text-gh-muted text-xs">{formatDate(commit.date)}</span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-2 mt-1.5">
                    {commit.insertions > 0 && (
                      <span className="text-success text-xs font-mono">+{commit.insertions}</span>
                    )}
                    {commit.deletions > 0 && (
                      <span className="text-danger text-xs font-mono">-{commit.deletions}</span>
                    )}
                    {commit.filesChanged > 0 && (
                      <span className="text-gh-muted text-xs">{commit.filesChanged} file{commit.filesChanged !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
