const fs = require("fs-extra");
const path = require("path");

const DATA_FILE = path.join(__dirname, "../../data/analytics.json");

async function read() {
  try {
    return await fs.readJson(DATA_FILE);
  } catch {
    return { events: [] };
  }
}

async function track(type, data) {
  const store = await read();
  store.events.unshift({ type, data, timestamp: new Date().toISOString() });
  if (store.events.length > 1000) store.events = store.events.slice(0, 1000);
  await fs.writeJson(DATA_FILE, store, { spaces: 2 });
}

async function getStats() {
  const store = await read();
  const events = store.events;

  const counts = { repo_analyzed: 0, commit_explained: 0, note_validated: 0, plan_matched: 0 };
  const repoMap = {};

  for (const e of events) {
    if (counts[e.type] !== undefined) counts[e.type]++;
    const repo = e.data?.repoPath?.split(/[/\\]/).pop() || e.data?.path?.split(/[/\\]/).pop();
    if (repo) {
      if (!repoMap[repo]) repoMap[repo] = { name: repo, path: e.data?.repoPath || e.data?.path, count: 0, last: e.timestamp };
      repoMap[repo].count++;
    }
  }

  return {
    counts,
    topRepos: Object.values(repoMap).sort((a, b) => b.count - a.count).slice(0, 10),
    recent: events.slice(0, 30),
  };
}

module.exports = { track, getStats };
