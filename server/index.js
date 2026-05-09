require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs-extra");

const repoRoutes = require("./routes/repoRoutes");
const analysisRoutes = require("./routes/analysisRoutes");
const analyzeRoutes = require("./routes/analyzeRoutes");
const commitRoutes = require("./routes/commitRoutes");
const planCommitRoutes = require("./routes/planCommitRoutes");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

fs.ensureDirSync(path.join(__dirname, "../repos"));
fs.ensureDirSync(path.join(__dirname, "../uploads"));
fs.ensureDirSync(path.join(__dirname, "../temp"));

app.get("/", (req, res) => {
  res.send("BuildLens Backend Running");
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    name: "BuildLens AI",
    positioning:
      "BuildLens AI analyzes repository evolution against implementation plans to identify engineering progress, implementation gaps, and architecture drift directly from code structure.",
  });
});

app.use("/api/repo", repoRoutes);
app.use("/api", analyzeRoutes);
app.use("/api", commitRoutes);
app.use("/api", planCommitRoutes);
app.use("/api/analysis", analysisRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: err.message || "Unexpected server error",
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
