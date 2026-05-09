const { GoogleGenerativeAI } = require("@google/generative-ai");
const { execFile } = require("child_process");
const fs = require("fs-extra");
const os = require("os");
const path = require("path");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);
const MAX_REPOMIX_CHARS = 15000;

function fallbackSummary(data) {
  const highRisk = data.risks.filter((file) => file.risk === "High").slice(0, 5);
  const implemented = data.planComparison.filter((item) => item.status === "Likely Implemented");
  const missing = data.planComparison.filter((item) => item.status === "Missing");

  return [
    `BuildLens scanned ${data.files.length} files and found ${Object.keys(data.graph).length} dependency graph nodes.`,
    highRisk.length
      ? `Highest-risk files include ${highRisk.map((file) => file.relativePath).join(", ")}.`
      : "No high-risk files were detected by the current size and complexity heuristics.",
    implemented.length
      ? `Plan items with strong code signals: ${implemented.map((item) => item.feature).join(", ")}.`
      : "No plan items had strong implementation signals yet.",
    missing.length
      ? `Missing or weakly detected plan items: ${missing.map((item) => item.feature).join(", ")}.`
      : "No clearly missing plan items were found.",
  ].join("\n\n");
}

async function packRepoForAi(repoPath) {
  const outputPath = path.join(os.tmpdir(), `buildlens-repomix-${Date.now()}.md`);
  const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

  try {
    await execFileAsync(
      npxCommand,
      [
        "repomix",
        repoPath,
        "--output",
        outputPath,
        "--style",
        "markdown",
        "--quiet",
        "--remove-comments",
        "--remove-empty-lines",
        "--truncate-base64",
      ],
      {
        timeout: 60000,
        maxBuffer: 1024 * 1024 * 8,
      }
    );

    const packedContent = await fs.readFile(outputPath, "utf8");
    return packedContent.slice(0, MAX_REPOMIX_CHARS);
  } catch (err) {
    console.warn(`Repomix packaging failed: ${err.message}`);
    return "";
  } finally {
    await fs.remove(outputPath).catch(() => {});
  }
}

async function generateSummary(data) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_api_key_here") {
    return fallbackSummary(data);
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  const repoContent = await packRepoForAi(data.repo.path);
  const repoContext = repoContent
    ? `Repomix Repository Context:\n${repoContent}`
    : `File Inventory:\n${JSON.stringify(data.files.slice(0, 250)).slice(0, 7000)}`;

  const prompt = `
Analyze this repository for BuildLens AI.

Repository:
${JSON.stringify(data.repo)}

${repoContext}

Dependencies:
${JSON.stringify(data.graph).slice(0, 7000)}

Risk Findings:
${JSON.stringify(data.risks.slice(0, 30)).slice(0, 5000)}

Plan Comparison:
${JSON.stringify(data.planComparison).slice(0, 5000)}

Explain:
1. what type of project this is
2. main architecture pattern used
3. top risky files and why
4. maintainability score out of 10
5. implementation gaps compared with the plan
`;

  const result = await model.generateContent(prompt);

  return result.response.text();
}

module.exports = generateSummary;
