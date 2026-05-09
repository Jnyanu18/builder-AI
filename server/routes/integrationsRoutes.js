const express = require("express");
const router = express.Router();

// ── Notion ────────────────────────────────────────────────────
router.post("/integrations/notion", async (req, res) => {
  const { apiKey, pageUrl } = req.body;
  if (!apiKey || !pageUrl) return res.status(400).json({ error: "apiKey and pageUrl are required" });

  // Extract page ID from URL or raw ID
  const raw = pageUrl.split("?")[0].split("/").pop().replace(/-/g, "");
  if (raw.length < 32) return res.status(400).json({ error: "Invalid Notion page URL or ID" });
  const pageId = `${raw.slice(0,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}-${raw.slice(16,20)}-${raw.slice(20,32)}`;

  try {
    const response = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(400).json({ error: err.message || "Failed to fetch Notion page. Check your API key and page permissions." });
    }

    const data = await response.json();
    const lines = [];

    for (const block of data.results || []) {
      const type = block.type;
      const richText = block[type]?.rich_text || [];
      const text = richText.map((t) => t.plain_text).join("").trim();
      if (!text) continue;

      if (type === "heading_1") lines.push(`# ${text}`);
      else if (type === "heading_2") lines.push(`## ${text}`);
      else if (type === "heading_3") lines.push(`### ${text}`);
      else if (["bulleted_list_item", "numbered_list_item", "to_do"].includes(type)) lines.push(`- ${text}`);
      else if (type === "paragraph") lines.push(text);
    }

    res.json({ plan: lines.join("\n"), itemCount: lines.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Jira ──────────────────────────────────────────────────────
router.post("/integrations/jira", async (req, res) => {
  const { domain, email, token, projectKey } = req.body;
  if (!domain || !email || !token || !projectKey) {
    return res.status(400).json({ error: "domain, email, token, and projectKey are required" });
  }

  try {
    const auth = Buffer.from(`${email}:${token}`).toString("base64");
    const url = `https://${domain}.atlassian.net/rest/api/3/search?jql=project=${projectKey}+ORDER+BY+created+DESC&maxResults=50&fields=summary,status,issuetype,priority`;

    const response = await fetch(url, {
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
    });

    if (!response.ok) {
      return res.status(400).json({ error: "Failed to connect to Jira. Check your domain, email, and API token." });
    }

    const data = await response.json();
    const issues = data.issues || [];

    const byType = {};
    for (const issue of issues) {
      const type = issue.fields.issuetype?.name || "Task";
      if (!byType[type]) byType[type] = [];
      byType[type].push(`- [${issue.key}] ${issue.fields.summary} (${issue.fields.status?.name})`);
    }

    const lines = [];
    for (const [type, items] of Object.entries(byType)) {
      lines.push(`## ${type}s`);
      lines.push(...items);
    }

    res.json({ plan: lines.join("\n"), count: issues.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
