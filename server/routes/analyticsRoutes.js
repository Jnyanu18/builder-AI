const express = require("express");
const { getStats } = require("../services/analytics");

const router = express.Router();

router.get("/analytics", async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
