const cloneRepo = require("./cloneRepo");
const generateSummary = require("./geminiSummary");
const scanRepo = require("../analyzers/repoScanner");
const generateDependencyGraph = require("../analyzers/dependencyGraph");
const analyzeRisk = require("../analyzers/riskAnalyzer");
const comparePlanToRepo = require("../analyzers/planMatcher");

async function runAnalysis({ repoUrl, repoPath, planText }) {
  const repo = repoUrl
    ? await cloneRepo(repoUrl)
    : {
        name: repoPath.split(/[\\/]/).filter(Boolean).pop(),
        path: repoPath,
        reused: true,
      };

  const files = scanRepo(repo.path);
  const graph = await generateDependencyGraph(repo.path);
  const risks = analyzeRisk(files, graph);
  const planComparison = comparePlanToRepo(planText, files);
  const summary = await generateSummary({
    repo,
    files,
    graph,
    risks: risks.slice(0, 20),
    planComparison,
  });

  return {
    repo,
    stats: {
      fileCount: files.length,
      dependencyNodes: Object.keys(graph).length,
      highRiskFiles: risks.filter((file) => file.risk === "High").length,
      mediumRiskFiles: risks.filter((file) => file.risk === "Medium").length,
      plannedFeatures: planComparison.length,
    },
    files,
    graph,
    risks,
    planComparison,
    summary,
  };
}

module.exports = runAnalysis;
