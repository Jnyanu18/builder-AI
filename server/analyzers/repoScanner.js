const { globSync } = require("glob");
const fs = require("fs");
const path = require("path");

const ignored = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/.next/**",
  "**/package-lock.json",
  "**/yarn.lock",
  "**/pnpm-lock.yaml",
];

function detectLanguage(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const languageMap = {
    ".js": "JavaScript",
    ".jsx": "JavaScript React",
    ".ts": "TypeScript",
    ".tsx": "TypeScript React",
    ".json": "JSON",
    ".md": "Markdown",
    ".css": "CSS",
    ".html": "HTML",
    ".py": "Python",
    ".java": "Java",
    ".go": "Go",
    ".rb": "Ruby",
    ".php": "PHP",
  };

  return languageMap[extension] || extension.replace(".", "").toUpperCase() || "Unknown";
}

function scanRepo(repoPath) {
  const files = globSync("**/*", {
    cwd: repoPath,
    nodir: true,
    ignore: ignored,
    dot: true,
    windowsPathsNoEscape: true,
  });

  return files.map((relativePath) => {
    const absolutePath = path.join(repoPath, relativePath);
    const stats = fs.statSync(absolutePath);

    return {
      path: absolutePath,
      relativePath: relativePath.split(path.sep).join("/"),
      size: stats.size,
      language: detectLanguage(relativePath),
      extension: path.extname(relativePath).toLowerCase(),
    };
  });
}

module.exports = scanRepo;
