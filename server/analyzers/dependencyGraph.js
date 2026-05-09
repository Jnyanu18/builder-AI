const madge = require("madge");

async function generateDependencyGraph(repoPath) {
  try {
    const result = await madge(repoPath, {
      excludeRegExp: [/node_modules/, /\.git/, /dist/, /build/, /coverage/],
      fileExtensions: ["js", "jsx", "ts", "tsx", "mjs", "cjs"],
    });

    return result.obj();
  } catch (err) {
    return {
      error: err.message,
    };
  }
}

module.exports = generateDependencyGraph;
