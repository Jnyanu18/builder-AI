const express = require("express");
const simpleGit = require("simple-git");
const Groq = require("groq-sdk");

const router = express.Router();

async function getCommitDiff(repoPath, commitHash) {
  const git = simpleGit(repoPath);
  try {
    return await git.raw(["diff", `${commitHash}^`, commitHash]);
  } catch {
    return await git.raw(["show", commitHash]);
  }
}

router.post("/commit/explain", async (req, res) => {
  const { repoPath, commitHash } = req.body;
  if (!repoPath || !commitHash) {
    return res.status(400).json({ error: "repoPath and commitHash are required" });
  }

  try {
    const diff = await getCommitDiff(repoPath, commitHash);

    if (!process.env.GROQ_API_KEY) {
      return res.json({ explanation: "AI unavailable: GROQ_API_KEY not configured." });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `You are a senior developer. Explain what this commit does in plain English.
Be specific about what changed and why it matters.
Format:
- What changed (2-3 sentences)
- Files affected and why
- Impact on the project

Commit diff:
\`\`\`
${diff.slice(0, 8000)}
\`\`\``;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
    });

    res.json({ explanation: completion.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.json({ explanation: `AI unavailable: ${err.message}` });
  }
});

router.post("/commit/diff", async (req, res) => {
  const { repoPath, commitHash } = req.body;
  if (!repoPath || !commitHash) {
    return res.status(400).json({ error: "repoPath and commitHash are required" });
  }

  try {
    const diff = await getCommitDiff(repoPath, commitHash);
    res.json({ diff });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/commit/validate", async (req, res) => {
  const { note, diff, commitMessage } = req.body;
  if (!note || !diff) {
    return res.status(400).json({ error: "note and diff are required" });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.json({ result: "AI unavailable: GROQ_API_KEY not configured.", status: "error" });
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `A developer wrote this note about their commit:
"${note}"

Commit message: "${commitMessage}"

Actual code diff:
\`\`\`
${diff.slice(0, 6000)}
\`\`\`

Analyze in 3-4 sentences:
1. Does the note accurately describe what was implemented in the diff?
2. Is the implementation complete and working based on the code?
3. Any gaps, issues, or missing pieces?

Be direct and specific. Start with "✓ Accurate" if the note matches, "⚠ Partial" if partially right, or "✗ Mismatch" if it doesn't match.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
    });

    const result = completion.choices[0].message.content;
    const status = result.startsWith("✓") ? "ok" : result.startsWith("⚠") ? "warn" : "mismatch";
    res.json({ result, status });
  } catch (err) {
    console.error(err);
    res.json({ result: `AI error: ${err.message}`, status: "error" });
  }
});

module.exports = router;
