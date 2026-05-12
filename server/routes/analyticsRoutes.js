const express = require("express");
const Groq = require("groq-sdk");
const { getStats } = require("../services/analytics");
const fs = require("fs-extra");
const path = require("path");

const router = express.Router();

router.get("/analytics", async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/analytics/suggestions", async (req, res) => {
  try {
    const DATA_FILE = path.join(__dirname, "../../data/analytics.json");
    let store = { events: [] };
    try {
      store = await fs.readJson(DATA_FILE);
    } catch {}

    const recentEvents = store.events.slice(0, 50).map(e => ({
      type: e.type,
      repo: e.data?.repoPath?.split(/[/\\]/).pop() || "unknown",
      time: e.timestamp
    }));

    if (recentEvents.length === 0) {
      return res.json({ suggestions: ["Not enough data yet. Start analyzing some repositories to get insights!"] });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are an AI engineering mentor. Given the user's recent activity history on their repositories, provide 2-3 brief, highly actionable suggestions on what they should focus on next. Return a JSON array of strings. Example: [\"You've been explaining many commits in 'frontend'. Consider running a plan alignment to ensure architecture isn't drifting.\"]"
        },
        {
          role: "user",
          content: JSON.stringify(recentEvents)
        }
      ],
      temperature: 0.4
    });

    const text = response.choices[0].message.content.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : ["Keep up the good work!"];

    res.json({ suggestions });
  } catch (err) {
    console.error("Suggestions error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
