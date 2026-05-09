const express = require("express");

const runAnalysis = require("../services/runAnalysis");

const router = express.Router();

router.post("/run", async (req, res, next) => {
  try {
    const { repoUrl, repoPath, planText = "" } = req.body;

    if (!repoUrl && !repoPath) {
      return res.status(400).json({
        error: "Provide repoUrl to clone or repoPath to analyze an existing local repository.",
      });
    }

    const analysis = await runAnalysis({ repoUrl, repoPath, planText });

    res.json({
      success: true,
      analysis,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
