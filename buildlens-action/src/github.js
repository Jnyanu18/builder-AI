const { context } = require("@actions/github");

function extractIssueRefsFromText(text = "") {
    const matches = [...String(text).matchAll(/\(#(\d+)\)/g)];
    const nums = matches.map((m) => Number(m[1])).filter(Boolean);
    // Deduplicate preserving order
    return [...new Set(nums)];
}

async function getLinkedIssueText(octokit, { owner, repo, pull_number }) {
    // Prefer PR body references like "(#142)" or "(#142)".
    const { data: prData } = await octokit.rest.pulls.get({ owner, repo, pull_number });

    const bodyText = prData.body || "";
    const issueNumbers = extractIssueRefsFromText(bodyText);

    const firstIssueNumber = issueNumbers[0];
    if (!firstIssueNumber) {
        return "";
    }

    const { data: issue } = await octokit.rest.issues.get({
        owner,
        repo,
        issue_number: firstIssueNumber,
    });

    const title = issue.title || "";
    const issueBody = issue.body || "";
    const combined = `#${issue.number} ${title}\n\n${issueBody}`.trim();
    return combined;
}

async function getOrCreateClientComment(octokit, { owner, repo, pull_number, body }) {
    const marker = "<!-- buildlens-ai-validator -->";
    const finalBody = `${marker}\n${body}`;

    const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: pull_number,
        per_page: 100,
    });

    const existing = comments.find((c) => (c.body || "").startsWith(marker));

    if (existing) {
        await octokit.rest.issues.updateComment({
            owner,
            repo,
            comment_id: existing.id,
            body: finalBody,
        });
        return;
    }

    await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body: finalBody,
    });
}

module.exports = {
    getLinkedIssueText,
    getOrCreateClientComment,
};

