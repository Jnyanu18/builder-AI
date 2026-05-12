const Groq = require("groq-sdk");

function limitBytes(str, maxBytes) {
    // Rough bytes limit in UTF-8: approximate by characters; good enough for action.
    if (!str) return "";
    if (Buffer.byteLength(str, "utf8") <= maxBytes) return str;
    // Trim by characters then ensure byte size.
    let out = str;
    while (out.length > 0 && Buffer.byteLength(out, "utf8") > maxBytes) {
        out = out.slice(0, -1);
    }
    return out;
}

function formatBuildLensBlock({ verdict, linkedIssue, checklist }) {
    const lines = [];
    lines.push("🔍 BuildLens Analysis");
    lines.push("━━━━━━━━━━━━━━━━━━━━━");

    if (linkedIssue) {
        lines.push(`Linked Issue: ${linkedIssue.split("\n")[0] || ""}`.trim());
        lines.push("");
    }

    lines.push(`Overall: ${verdict}`);
    lines.push("");
    for (const item of checklist) {
        const { status, feature, evidence } = item;
        lines.push(`${status} ${feature}`);
        if (evidence && evidence.length) {
            for (const e of evidence.slice(0, 6)) lines.push(`- ${e}`);
        }
        lines.push("");
    }

    return lines.join("\n").trim();
}

async function analyzePullRequest({ octokit, owner, repo, pull_number, groqApiKey, pr, linkedIssueText }) {
    // Keep diff payload small: use patch from PR files.
    // GitHub provides PR file patches only for small diffs; for larger diffs, patch can be omitted.
    const { data: files } = await octokit.rest.pulls.listFiles({ owner, repo, pull_number, per_page: 100 });

    const changedFiles = (files || []).slice(0, 30);

    const diffSnippets = changedFiles
        .map((f) => {
            const patch = f.patch || "";
            const header = `File: ${f.filename}`;
            const snippet = limitBytes(patch, 3500);
            return `${header}\n${snippet}`.trim();
        })
        .join("\n\n---\n\n");

    const prBody = pr.body || "";
    const prTitle = pr.title || "";

    const prompt = `You are BuildLens AI, a strict PR auto-validator.

Goal: Determine whether the PR actually implements the linked issue/plan.

Inputs:
1) PR Title: ${prTitle}
2) PR Body: ${prBody}
3) Linked Issue / Plan Text (may be empty):\n${linkedIssueText || "(none)"}
4) PR Diff Snippets (may be incomplete):\n${diffSnippets || "(no patch available)"}

Task:
- Extract up to 5 implementation claims / features mentioned in the linked issue text.
- For each claim, decide: ✓ Implemented, ⚠ Partially Implemented, ✗ Missing (based ONLY on evidence in the diff snippets).
- Provide short evidence bullets referencing file names or key code fragments if present.
- If linked issue text is empty or diff snippets are empty, you must still respond, but set claims to generic categories (auth/login/token/expiry) only if strongly implied by PR title/body.

Output format (MUST MATCH):
- First line: Overall: COMPLETE | PARTIAL IMPLEMENTATION | MISSING
- Then a checklist section:
  For each claim line:
  [✓] feature (1 short sentence)
  Evidence:
  - bullet
  - bullet

If you cannot find evidence for a claim, mark it ✗ Missing.

Now produce the final report.`;

    const groq = new Groq({ apiKey: groqApiKey });

    const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
    });

    const text = completion.choices?.[0]?.message?.content || "";

    // Normalize into structured-ish fields for later formatting.
    // We keep it simple: parse verdict and leave the rest mostly intact.
    const verdictMatch = text.match(/Overall:\s*(COMPLETE|PARTIAL IMPLEMENTATION|MISSING)/i);
    const verdict = verdictMatch ? verdictMatch[1].toUpperCase() : "PARTIAL IMPLEMENTATION";

    // Convert checklist into array by scanning [✓]/[⚠]/[✗] lines.
    const checklist = [];
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    let current = null;
    for (const line of lines) {
        const m = line.match(/^\[([✓✗⚠])\]\s*(.+)$/);
        if (m) {
            if (current) checklist.push(current);
            const symbol = m[1];
            const feature = m[2];
            const status = symbol === "✓" ? "✓" : symbol === "⚠" ? "⚠" : "✗";
            current = { status, feature, evidence: [] };
            continue;
        }
        if (!current) continue;
        const isEvidenceLine = line.startsWith("Evidence:") || line.startsWith("- ");
        if (line.startsWith("- ")) {
            current.evidence.push(line.slice(2).trim());
        }
    }
    if (current) checklist.push(current);

    // Fallback if parsing failed
    if (!checklist.length) {
        return {
            commentBody: `BuildLens Analysis\n\n${text}`,
        };
    }

    return {
        commentBody: formatBuildLensBlock({
            verdict,
            linkedIssue: linkedIssueText ? linkedIssueText.split("\n").slice(0, 1).join(" ") : "",
            checklist,
        }),
    };
}

module.exports = { analyzePullRequest };

