import { useState } from "react";
import ReactDiffViewer from "react-diff-viewer-continued";

function parseUnifiedDiff(diffStr) {
  if (!diffStr) return [];
  const files = [];
  const sections = diffStr.split(/^diff --git /m);

  for (const section of sections) {
    if (!section.trim()) continue;

    const lines = section.split("\n");
    const header = lines[0] || "";
    const bMatch = header.match(/ b\/(.+)/);
    const fileName = bMatch ? bMatch[1].trim() : "unknown";

    let oldLines = [];
    let newLines = [];
    let inHunk = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("@@")) {
        inHunk = true;
        continue;
      }
      if (!inHunk) continue;
      if (line.startsWith("\\")) continue;

      if (line.startsWith("-")) {
        oldLines.push(line.slice(1));
      } else if (line.startsWith("+")) {
        newLines.push(line.slice(1));
      } else {
        const content = line.startsWith(" ") ? line.slice(1) : line;
        oldLines.push(content);
        newLines.push(content);
      }
    }

    if (oldLines.length > 0 || newLines.length > 0) {
      files.push({
        fileName,
        oldValue: oldLines.join("\n"),
        newValue: newLines.join("\n"),
      });
    }
  }

  return files;
}

export default function DiffViewer({ diff, loading, commit }) {
  const [activeFile, setActiveFile] = useState(0);

  const files = parseUnifiedDiff(diff);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center gap-3 text-gh-muted">
        <div className="w-5 h-5 border-2 border-gh-border border-t-accent rounded-full animate-spin"></div>
        <span className="text-sm">Loading diff...</span>
      </div>
    );
  }

  if (!diff && !loading) {
    return (
      <div className="p-8 text-center text-gh-muted text-sm">
        Select a commit to view its diff.
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="p-8 text-center text-gh-muted text-sm">
        No parseable diff content found.
      </div>
    );
  }

  const currentFile = files[Math.min(activeFile, files.length - 1)];

  return (
    <div>
      {/* Section header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <h3 className="text-gh-text font-semibold text-sm">Diff Viewer</h3>
        <span className="text-gh-muted text-xs">{files.length} file{files.length !== 1 ? "s" : ""} changed</span>
      </div>

      {/* File tabs */}
      {files.length > 1 && (
        <div className="flex gap-1 px-6 pb-3 overflow-x-auto">
          {files.map((file, i) => (
            <button
              key={file.fileName}
              onClick={() => setActiveFile(i)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-md font-mono transition-colors
                ${activeFile === i
                  ? "bg-accent text-white"
                  : "bg-gh-surface text-gh-muted hover:text-gh-text border border-gh-border"
                }`}
            >
              {file.fileName.split("/").pop()}
            </button>
          ))}
        </div>
      )}

      {/* File path */}
      <div className="px-6 pb-3">
        <span className="text-gh-muted text-xs font-mono bg-gh-surface border border-gh-border rounded px-2 py-1">
          {currentFile.fileName}
        </span>
      </div>

      {/* Diff */}
      <div className="diff-viewer-wrap overflow-x-auto">
        <ReactDiffViewer
          oldValue={currentFile.oldValue}
          newValue={currentFile.newValue}
          splitView={true}
          useDarkTheme={true}
          hideLineNumbers={false}
          styles={{
            variables: {
              dark: {
                diffViewerBackground: "#0d1117",
                addedBackground: "#0d4429",
                addedColor: "#3fb950",
                removedBackground: "#67060c",
                removedColor: "#f85149",
                wordAddedBackground: "#1a7f37",
                wordRemovedBackground: "#8e1519",
                addedGutterBackground: "#0a3623",
                removedGutterBackground: "#5e0a0e",
                gutterBackground: "#161b22",
                gutterBackgroundDark: "#0d1117",
                highlightBackground: "#2b2a30",
                highlightGutterBackground: "#2b2a30",
                codeFoldBackground: "#1c2128",
                emptyLineBackground: "#0d1117",
                codeFoldContentColor: "#8b949e",
                diffViewerTitleBackground: "#161b22",
                diffViewerTitleColor: "#c9d1d9",
                diffViewerTitleBorderColor: "#30363d",
              },
            },
          }}
        />
      </div>
    </div>
  );
}
