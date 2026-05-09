function getFanIn(graph) {
  const fanIn = {};

  Object.entries(graph || {}).forEach(([source, dependencies]) => {
    if (!Array.isArray(dependencies)) {
      return;
    }

    dependencies.forEach((dependency) => {
      fanIn[dependency] = (fanIn[dependency] || 0) + 1;
    });
  });

  return fanIn;
}

function analyzeRisk(files, graph = {}) {
  const fanIn = getFanIn(graph);

  return files
    .map((file) => {
      let score = 0;
      const reasons = [];

      if (file.size > 50000) {
        score += 45;
        reasons.push("large file");
      } else if (file.size > 20000) {
        score += 25;
        reasons.push("moderately large file");
      }

      const incomingDependencies = fanIn[file.relativePath] || 0;
      if (incomingDependencies >= 5) {
        score += 35;
        reasons.push("many modules depend on it");
      } else if (incomingDependencies >= 2) {
        score += 15;
        reasons.push("shared dependency");
      }

      if (/auth|payment|billing|admin|config|database|db|route|middleware/i.test(file.relativePath)) {
        score += 20;
        reasons.push("sensitive area");
      }

      const risk = score >= 60 ? "High" : score >= 30 ? "Medium" : "Low";

      return {
        ...file,
        score,
        risk,
        reasons: reasons.length ? reasons : ["small isolated file"],
      };
    })
    .sort((a, b) => b.score - a.score || b.size - a.size);
}

module.exports = analyzeRisk;
