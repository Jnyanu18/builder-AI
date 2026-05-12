const express = require("express");
const simpleGit = require("simple-git");
const Groq = require("groq-sdk");
const fs = require("fs-extra");
const path = require("path");

const router = express.Router();

// ── Get work session diff ──────────────────────────────────────
router.post("/work-session/diff", async (req, res) => {
    const { repoPath, baseRef = "HEAD~1", headRef = "HEAD" } = req.body;
    if (!repoPath) return res.status(400).json({ error: "repoPath required" });

    try {
        const git = simpleGit(repoPath);
        const diff = await git.raw(["diff", baseRef, headRef]);
        const status = await git.status();
        const log = await git.log({ maxCount: 5 });

        res.json({
            diff,
            unstaged: status.files.filter(f => f.working_dir !== " "),
            staged: status.files.filter(f => f.index !== " "),
            recent: log.all.map(c => ({ hash: c.hash.slice(0, 7), msg: c.message })),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Verify work session ────────────────────────────────────────
router.post("/work-session/verify", async (req, res) => {
    const { repoPath, description, diff, sessionStart } = req.body;
    if (!repoPath || !description || !diff) {
        return res.status(400).json({ error: "repoPath, description, and diff required" });
    }

    if (!process.env.GROQ_API_KEY) {
        return res.json({
            score: 50,
            description: "GROQ_API_KEY not configured",
            categories: {},
            issues: [],
            summary: "AI features unavailable"
        });
    }

    try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        // ── Prompt for verification ────────────────────────────────
        const verifyPrompt = `You are a senior engineer reviewing daily work progress.

Developer's claim of what they built today:
"""
${description}
"""

Actual code changes made:
"""
${diff.slice(0, 12000)}
"""

Analyze and score this work session:

1. COMPLETENESS (0-25): Did they implement what they claimed?
2. CODE_QUALITY (0-25): Is the code well-structured and clean?
3. TEST_COVERAGE (0-15): Are there tests? Edge cases handled?
4. DOCUMENTATION (0-15): Comments, README, clarity?
5. ERROR_HANDLING (0-20): Error handling, validation present?

Return JSON only:
{
  "scores": {
    "completeness": number,
    "code_quality": number,
    "test_coverage": number,
    "documentation": number,
    "error_handling": number
  },
  "issues": [
    { "type": "missing|bug|quality|improvement", "severity": "critical|warning|info", "description": "..." }
  ],
  "summary": "Brief assessment in 1-2 sentences",
  "fixes_suggested": ["fix1", "fix2"]
}`;

        const verification = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: verifyPrompt }],
        });

        let text = verification.choices[0].message.content.trim();
        text = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
        const data = JSON.parse(text);

        const totalScore = Math.round(
            data.scores.completeness +
            data.scores.code_quality +
            data.scores.test_coverage +
            data.scores.documentation +
            data.scores.error_handling
        );

        res.json({
            score: totalScore,
            maxScore: 100,
            categories: data.scores,
            issues: data.issues || [],
            summary: data.summary,
            suggestedFixes: data.fixes_suggested || [],
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Auto-fix issues ────────────────────────────────────────────
router.post("/work-session/auto-fix", async (req, res) => {
    const { repoPath, issue, filePath } = req.body;
    if (!repoPath || !issue || !filePath) {
        return res.status(400).json({ error: "repoPath, issue, and filePath required" });
    }

    if (!process.env.GROQ_API_KEY) {
        return res.json({ suggestion: "AI unavailable" });
    }

    try {
        const fullPath = path.join(repoPath, filePath);
        const fileContent = await fs.readFile(fullPath, "utf8");

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const fixPrompt = `Fix this code issue:

Issue: ${issue}

File: ${filePath}

Current code:
\`\`\`
${fileContent.slice(0, 4000)}
\`\`\`

Provide ONLY the fixed code block, ready to paste. No explanation.`;

        const fixResult = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: fixPrompt }],
        });

        const fixedCode = fixResult.choices[0].message.content
            .replace(/^```(?:js|jsx|ts|tsx|javascript)?\n?/i, "")
            .replace(/\n?```$/i, "")
            .trim();

        // Actually apply the fix
        await fs.writeFile(fullPath, fixedCode, "utf8");

        res.json({ fixedCode, suggestion: fixedCode, applied: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
