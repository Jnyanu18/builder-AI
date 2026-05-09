const STATUS_CONFIG = {
  done: {
    label: "Done",
    bg: "bg-success/10",
    border: "border-success/30",
    text: "text-success",
    dot: "bg-success",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  partial: {
    label: "Partial",
    bg: "bg-warning/10",
    border: "border-warning/30",
    text: "text-warning",
    dot: "bg-warning",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  missing: {
    label: "Missing",
    bg: "bg-danger/10",
    border: "border-danger/30",
    text: "text-danger",
    dot: "bg-danger",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.missing;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.border} border ${config.text}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

export default function PlanVsReality({ items, loading }) {
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center gap-3 text-gh-muted">
        <div className="w-5 h-5 border-2 border-gh-border border-t-accent rounded-full animate-spin"></div>
        <span className="text-sm">Matching plan against commits...</span>
      </div>
    );
  }

  if (!items) return null;

  const doneCount = items.filter((i) => i.status === "done").length;
  const partialCount = items.filter((i) => i.status === "partial").length;
  const missingCount = items.filter((i) => i.status === "missing").length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-gh-text font-semibold text-sm">Plan vs Reality</h3>
          <p className="text-gh-muted text-xs mt-0.5">Comparing your implementation plan against actual commits</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-success">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            {doneCount} done
          </span>
          <span className="flex items-center gap-1.5 text-warning">
            <span className="w-2 h-2 rounded-full bg-warning"></span>
            {partialCount} partial
          </span>
          <span className="flex items-center gap-1.5 text-danger">
            <span className="w-2 h-2 rounded-full bg-danger"></span>
            {missingCount} missing
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-gh-surface border border-dashed border-gh-border rounded-xl p-6 text-center">
          <p className="text-gh-muted text-sm">No plan items returned. Check your GEMINI_API_KEY.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((item, i) => {
            const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.missing;
            return (
              <div
                key={i}
                className={`bg-gh-surface border ${config.border} rounded-xl p-4 transition-colors`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-gh-text text-sm font-medium leading-snug">{item.feature}</p>
                  <StatusBadge status={item.status} />
                </div>
                {item.evidence && (
                  <p className="text-gh-muted text-xs leading-relaxed">{item.evidence}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
