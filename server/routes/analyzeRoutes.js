const express = require("express");
const path = require("path");
const simpleGit = require("simple-git");
const fs = require("fs-extra");
const { track } = require("../services/analytics");

const router = express.Router();

function parseShortStat(statStr) {
  const filesMatch = statStr.match(/(\d+) file/);
  const insertMatch = statStr.match(/(\d+) insertion/);
  const deleteMatch = statStr.match(/(\d+) deletion/);
  return {
    filesChanged: filesMatch ? parseInt(filesMatch[1]) : 0,
    insertions: insertMatch ? parseInt(insertMatch[1]) : 0,
    deletions: deleteMatch ? parseInt(deleteMatch[1]) : 0,
  };
}

async function getCommitStats(git, hash) {
  try {
    const stat = await git.raw(["diff", "--shortstat", `${hash}^`, hash]);
    return parseShortStat(stat);
  } catch {
    try {
      const stat = await git.raw(["show", "--stat", "--format=", hash]);
      return parseShortStat(stat);
    } catch {
      return { filesChanged: 0, insertions: 0, deletions: 0 };
    }
  }
}

router.post("/analyze", async (req, res) => {
  try {
    const { source, value, plan } = req.body;

    if (!source || !value) {
      return res.status(400).json({ error: "source and value are required" });
    }

    let repoPath;

    if (source === "github") {
      const reposDir = path.join(__dirname, "../../repos");
      await fs.ensureDir(reposDir);

      const repoName = value.replace(/\.git$/, "").split("/").pop();
      repoPath = path.join(reposDir, repoName);

      if (await fs.pathExists(repoPath)) {
        const git = simpleGit(repoPath);
        try {
          await git.pull();
        } catch {
          // Ignore pull errors, use existing clone
        }
      } else {
        console.log("Cloning repo:", value);
        const git = simpleGit();
        await git.clone(value, repoPath);
      }
    } else if (source === "local") {
      repoPath = value;
      if (!(await fs.pathExists(repoPath))) {
        return res.status(400).json({ error: `Local path does not exist: ${value}` });
      }
    } else {
      return res.status(400).json({ error: "source must be 'github' or 'local'" });
    }

    const git = simpleGit(repoPath);
    const log = await git.log({ maxCount: 20 });

    const commits = await Promise.all(
      log.all.map(async (entry) => {
        const stats = await getCommitStats(git, entry.hash);
        return {
          hash: entry.hash,
          shortHash: entry.hash.substring(0, 7),
          message: entry.message,
          author: entry.author_name,
          date: entry.date,
          ...stats,
        };
      })
    );

    track("repo_analyzed", { repoPath, commitCount: commits.length }).catch(() => {});
    res.json({ success: true, repoPath, commits, plan: plan || null });
  } catch (err) {
    console.error(err);
    if (err.message?.toLowerCase().includes("clone")) {
      return res.status(500).json({ error: `Failed to clone repository: ${err.message}` });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
