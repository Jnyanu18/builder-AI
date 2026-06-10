import * as vscode from "vscode";

type Finding = {
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  type: "missing" | "unexpected" | "partial" | "violation";
  evidence?: string;
};

type Report = {
  alignment_score: number;
  drift_score: number;
  feature_coverage: { implemented: number; total: number };
  findings: Finding[];
  summary?: string;
  created_at: string;
};

const diag = vscode.languages.createDiagnosticCollection("intentos");
let statusBar: vscode.StatusBarItem;

function cfg() {
  const c = vscode.workspace.getConfiguration("intentos");
  return {
    baseUrl: (c.get<string>("apiBaseUrl") ?? "").replace(/\/$/, ""),
    projectId: c.get<string>("projectId") ?? "",
    token: c.get<string>("apiToken") ?? "",
    runOnSave: c.get<boolean>("runOnSave") ?? false,
  };
}

async function ensureConfigured(): Promise<boolean> {
  const { baseUrl, projectId, token } = cfg();
  if (baseUrl && projectId && token) return true;
  const pick = await vscode.window.showWarningMessage(
    "IntentOS is not configured. Set apiBaseUrl, projectId, and apiToken in settings.",
    "Open settings",
  );
  if (pick === "Open settings") {
    vscode.commands.executeCommand("workbench.action.openSettings", "intentos");
  }
  return false;
}

async function callApi(method: "GET" | "POST"): Promise<Report | null> {
  const { baseUrl, projectId, token } = cfg();
  const url = `${baseUrl}/api/public/projects/${projectId}/drift`;
  const res = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  });
  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    message?: string;
    report?: Report;
  };
  if (!res.ok) throw new Error(body.message ?? `HTTP ${res.status}`);
  if (method === "GET") return body.report ?? null;
  // POST returns a summary; fetch the full report after.
  if (body.ok === false) throw new Error(body.message ?? "Drift analysis failed");
  return await callApi("GET");
}

function renderFindings(report: Report) {
  diag.clear();
  const uri = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!uri) return;
  const target = vscode.Uri.joinPath(uri, "INTENTOS.md");
  const items: vscode.Diagnostic[] = report.findings.map((f, i) => {
    const sev =
      f.severity === "critical" || f.severity === "high"
        ? vscode.DiagnosticSeverity.Error
        : f.severity === "medium"
          ? vscode.DiagnosticSeverity.Warning
          : vscode.DiagnosticSeverity.Information;
    const d = new vscode.Diagnostic(
      new vscode.Range(i, 0, i, 1),
      `[${f.type}] ${f.title} — ${f.description}`,
      sev,
    );
    d.source = "IntentOS";
    return d;
  });
  diag.set(target, items);
}

function setStatus(report: Report | null) {
  if (!report) {
    statusBar.text = "$(shield) IntentOS: no report";
    statusBar.tooltip = "Run drift analysis";
  } else {
    const icon =
      report.alignment_score >= 80
        ? "$(pass)"
        : report.alignment_score >= 50
          ? "$(warning)"
          : "$(error)";
    statusBar.text = `${icon} IntentOS ${report.alignment_score}% · ${report.findings.length} drift`;
    statusBar.tooltip = report.summary ?? "Click to view findings";
  }
  statusBar.show();
}

async function showPanel(report: Report) {
  const panel = vscode.window.createWebviewPanel(
    "intentosReport",
    "IntentOS Drift Report",
    vscode.ViewColumn.Beside,
    { enableScripts: false },
  );
  const rows = report.findings
    .map(
      (f) => `
      <tr>
        <td class="${f.severity}">${f.severity}</td>
        <td>${f.type}</td>
        <td>${f.category}</td>
        <td><b>${escapeHtml(f.title)}</b><br/><small>${escapeHtml(f.description)}</small></td>
      </tr>`,
    )
    .join("");
  panel.webview.html = `<!doctype html><html><head><style>
    body { font-family: -apple-system, sans-serif; padding: 16px; color: var(--vscode-foreground); }
    h1 { font-size: 18px; }
    .metrics { display: flex; gap: 12px; margin: 12px 0 20px; }
    .m { padding: 10px 14px; border: 1px solid var(--vscode-panel-border); border-radius: 6px; }
    .m b { font-size: 22px; display: block; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--vscode-panel-border); vertical-align: top; }
    .critical, .high { color: #f87171; }
    .medium { color: #fbbf24; }
    .low { color: #93c5fd; }
  </style></head><body>
    <h1>IntentOS Drift Report</h1>
    <div class="metrics">
      <div class="m"><small>Alignment</small><b>${report.alignment_score}%</b></div>
      <div class="m"><small>Drift</small><b>${report.drift_score}%</b></div>
      <div class="m"><small>Findings</small><b>${report.findings.length}</b></div>
    </div>
    <p>${escapeHtml(report.summary ?? "")}</p>
    <table><thead><tr><th>Severity</th><th>Type</th><th>Category</th><th>Finding</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="4">No drift detected.</td></tr>`}</tbody></table>
  </body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export function activate(context: vscode.ExtensionContext) {
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = "intentos.showLatest";
  context.subscriptions.push(statusBar, diag);

  context.subscriptions.push(
    vscode.commands.registerCommand("intentos.configure", () =>
      vscode.commands.executeCommand("workbench.action.openSettings", "intentos"),
    ),
    vscode.commands.registerCommand("intentos.runDrift", async () => {
      if (!(await ensureConfigured())) return;
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: "IntentOS: running drift…" },
        async () => {
          try {
            const r = await callApi("POST");
            if (r) {
              renderFindings(r);
              setStatus(r);
              await showPanel(r);
            }
          } catch (e) {
            vscode.window.showErrorMessage(`IntentOS: ${(e as Error).message}`);
          }
        },
      );
    }),
    vscode.commands.registerCommand("intentos.showLatest", async () => {
      if (!(await ensureConfigured())) return;
      try {
        const r = await callApi("GET");
        if (!r) return vscode.window.showInformationMessage("No drift report yet.");
        renderFindings(r);
        setStatus(r);
        await showPanel(r);
      } catch (e) {
        vscode.window.showErrorMessage(`IntentOS: ${(e as Error).message}`);
      }
    }),
    vscode.workspace.onDidSaveTextDocument(async () => {
      if (!cfg().runOnSave) return;
      if (!(await ensureConfigured())) return;
      try {
        const r = await callApi("POST");
        if (r) {
          renderFindings(r);
          setStatus(r);
        }
      } catch {
        // swallow; status bar shows stale
      }
    }),
  );

  // Initial status load
  (async () => {
    const { baseUrl, projectId, token } = cfg();
    if (baseUrl && projectId && token) {
      try {
        const r = await callApi("GET");
        setStatus(r);
      } catch {
        setStatus(null);
      }
    } else {
      setStatus(null);
    }
  })();
}

export function deactivate() {
  diag.dispose();
}
