const express = require("express");
const Groq = require("groq-sdk");

const router = express.Router();

router.post("/plan/match", async (req, res) => {
  const { plan, commits } = req.body;

  if (!plan || !commits) {
    return res.status(400).json({ error: "plan and commits are required" });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.json({ items: [] });
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const commitMessages = commits.map((c) => `- ${c.shortHash}: ${c.message}`).join("\n");

    const prompt = `Compare this implementation plan against these commits.
For each plan item, determine if it was implemented, partially done, or missing.
Return JSON only, no markdown, no explanation:
{ "items": [{ "feature": string, "status": "done"|"partial"|"missing", "evidence": string }] }

Implementation Plan:
${plan}

Commits:
${commitMessages}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
    });

    let text = completion.choices[0].message.content.trim();
    text = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
