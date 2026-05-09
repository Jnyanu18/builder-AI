const express = require("express");

const cloneRepo = require("../services/cloneRepo");

const router = express.Router();

router.post("/clone", async (req, res, next) => {
  try {
    const { repoUrl } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ error: "repoUrl is required" });
    }

    const repo = await cloneRepo(repoUrl);

    res.json({
      success: true,
      repo,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
