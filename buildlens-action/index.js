const core = require("@actions/core");
const github = require("@actions/github");
const { analyzePullRequest } = require("./src/analyzer");
const { getLinkedIssueText, getOrCreateClientComment } = require("./src/github");

async function run() {
    try {
        const groqApiKey = core.getInput("groq-api-key", { required: true });
        const githubToken = core.getInput("github-token", { required: true });

        const octokit = github.getOctokit(githubToken);
        const context = github.context;

        if (!context.payload.pull_request) {
            core.info("No pull_request found in event payload; exiting.");
            return;
        }

        const { owner, repo } = context.repo;
        const pull_number = context.payload.pull_request.number;

        core.info(`Validating PR #${pull_number} in ${owner}/${repo}`);

        const linkedIssueText = await getLinkedIssueText(octokit, {
            owner,
            repo,
            pull_number,
        });

        const pr = context.payload.pull_request;

        // Feed PR body + linked issue into analyzer.
        const analysis = await analyzePullRequest({
            octokit,
            owner,
            repo,
            pull_number,
            groqApiKey,
            pr,
            linkedIssueText,
        });

        const commentBody = analysis.commentBody;
        await getOrCreateClientComment(octokit, {
            owner,
            repo,
            pull_number,
            body: commentBody,
        });

        core.info("BuildLens PR validation comment posted/updated.");
    } catch (err) {
        core.setFailed(err.message || String(err));
    }
}

run();

