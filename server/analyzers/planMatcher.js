const fs = require("fs");

const domainSignals = {
  authentication: ["auth", "login", "register", "password", "session", "token", "jwt", "bcrypt"],
  jwt: ["jwt", "jsonwebtoken", "sign", "verify", "bearer"],
  payment: ["payment", "billing", "checkout", "invoice", "stripe", "razorpay", "webhook"],
  admin: ["admin", "dashboard", "role", "permission", "rbac"],
  database: ["database", "db", "model", "schema", "migration", "mongoose", "mongodb", "prisma", "sql"],
  email: ["email", "mail", "smtp", "nodemailer", "sendgrid"],
  upload: ["upload", "file", "multer", "multipart"],
  testing: ["test", "spec", "jest", "vitest", "mocha", "cypress", "playwright"],
  responsive: ["responsive", "media", "viewport", "mobile", "max width", "grid"],
  animation: ["animation", "animate", "transition", "keyframes", "transform"],
  keyboard: ["keydown", "keyup", "keypress", "key", "shortcut", "add event listener"],
  scroll: ["scroll", "intersection observer", "observer", "viewport"],
  canvas: ["canvas", "get context", "request animation frame"],
  video: ["video", "iframe", "youtube", "embed"],
};

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "with",
  "after",
  "before",
  "when",
  "where",
  "using",
  "use",
  "show",
  "display",
  "build",
  "create",
  "add",
  "make",
  "allow",
  "implement",
  "implemented",
  "implementation",
  "feature",
  "project",
  "page",
  "section",
  "component",
  "function",
  "user",
  "text",
]);

function parsePlan(planText = "") {
  return planText
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*#>\d.\s[\]]+/, "").trim())
    .filter((line) => line.length > 2)
    .slice(0, 80);
}

function normalizeText(value = "") {
  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_./\\:-]+/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function ngrams(tokens, size) {
  const items = [];

  for (let i = 0; i <= tokens.length - size; i += 1) {
    items.push(tokens.slice(i, i + size).join(" "));
  }

  return items;
}

function singularize(token) {
  if (token.endsWith("ies") && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.endsWith("s") && token.length > 4) {
    return token.slice(0, -1);
  }

  return token;
}

function getSignalsForFeature(feature) {
  const normalized = normalizeText(feature);
  const tokens = tokenize(feature);
  const signals = new Set([
    normalized,
    ...tokens,
    ...tokens.map(singularize),
    ...ngrams(tokens, 2),
    ...ngrams(tokens, 3),
  ]);

  Object.entries(domainSignals).forEach(([keyword, relatedSignals]) => {
    if (tokens.includes(keyword) || normalized.includes(keyword)) {
      relatedSignals.forEach((signal) => signals.add(normalizeText(signal)));
    }
  });

  return [...signals].filter((signal) => signal.length > 2);
}

function extractCodeSignals(content) {
  const signals = [];
  const patterns = [
    /\bid=["'`]([^"'`]+)["'`]/g,
    /\bclass(?:Name)?=["'`]([^"'`]+)["'`]/g,
    /\b(?:function|class)\s+([a-zA-Z_$][\w$]*)/g,
    /\b(?:const|let|var)\s+([a-zA-Z_$][\w$]*)/g,
    /\basync\s+function\s+([a-zA-Z_$][\w$]*)/g,
    /\bimport\s+.*?\s+from\s+["'`]([^"'`]+)["'`]/g,
    /\brequire\(["'`]([^"'`]+)["'`]\)/g,
    /\bdata-[\w-]+=["'`]([^"'`]+)["'`]/g,
    /#([a-zA-Z][\w-]*)/g,
    /\.([a-zA-Z][\w-]*)/g,
  ];

  patterns.forEach((pattern) => {
    for (const match of content.matchAll(pattern)) {
      signals.push(...String(match[1]).split(/\s+/));
    }
  });

  return normalizeText(signals.join(" "));
}

function readSmallTextFile(file) {
  if (file.size > 750000 || !/\.(js|jsx|ts|tsx|json|md|env|css|html|py|java|go|rb|php)$/i.test(file.relativePath)) {
    return "";
  }

  try {
    const content = fs.readFileSync(file.path, "utf8");
    return `${normalizeText(content)} ${extractCodeSignals(content)}`;
  } catch (err) {
    return "";
  }
}

function scoreFileAgainstSignals({ pathText, content }, signals) {
  const hits = [];
  let score = 0;

  signals.forEach((signal) => {
    const inPath = pathText.includes(signal);
    const inContent = content.includes(signal);

    if (!inPath && !inContent) {
      return;
    }

    hits.push(signal);

    if (signal.includes(" ")) {
      score += inPath ? 32 : 24;
      return;
    }

    score += inPath ? 24 : 12;
  });

  return { hits, score };
}

function comparePlanToRepo(planText, files) {
  const features = parsePlan(planText);
  const searchableFiles = files.map((file) => ({
    file,
    pathText: normalizeText(file.relativePath),
    content: readSmallTextFile(file),
  }));

  return features.map((feature) => {
    const signals = getSignalsForFeature(feature);
    const evidence = [];
    let confidence = 0;

    searchableFiles.forEach((searchableFile) => {
      const { hits, score } = scoreFileAgainstSignals(searchableFile, signals);

      if (!hits.length) {
        return;
      }

      confidence += Math.min(score, 55);
      evidence.push({
        file: searchableFile.file.relativePath,
        signals: hits.slice(0, 8),
      });
    });

    const cappedConfidence = Math.min(100, Math.round(confidence));
    const status =
      cappedConfidence >= 60 ? "Likely Implemented" : cappedConfidence >= 24 ? "Partially Detected" : "Missing";

    return {
      feature,
      confidence: cappedConfidence,
      status,
      evidence: evidence.slice(0, 8),
    };
  });
}

module.exports = comparePlanToRepo;
