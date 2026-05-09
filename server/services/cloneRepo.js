const simpleGit = require("simple-git");
const path = require("path");
const fs = require("fs-extra");

const reposRoot = path.join(__dirname, "../../repos");

function getRepoName(repoUrl) {
  const trimmed = repoUrl.trim().replace(/\/$/, "");
  const name = trimmed.split("/").pop().replace(/\.git$/i, "");

  if (!name || name.includes("..")) {
    throw new Error("Invalid repository URL");
  }

  return name;
}

async function cloneRepo(repoUrl) {
  const repoName = getRepoName(repoUrl);
  const repoPath = path.join(reposRoot, repoName);
  const gitPath = path.join(repoPath, ".git");

  await fs.ensureDir(reposRoot);

  if (await fs.pathExists(gitPath)) {
    const git = simpleGit(repoPath);
    await git.fetch();

    return {
      name: repoName,
      path: repoPath,
      reused: true,
    };
  }

  if (await fs.pathExists(repoPath)) {
    await fs.remove(repoPath);
  }

  const git = simpleGit();
  await git.clone(repoUrl, repoPath, ["--depth", "1"]);

  return {
    name: repoName,
    path: repoPath,
    reused: false,
  };
}

module.exports = cloneRepo;
