const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process");

const NOTES_KEY = "buildlens.commitNotes";
let backendProcess = null;

// ── Backend health check ──────────────────────────────────────
function checkBackend() {
  return new Promise((resolve) => {
    const req = http.get("http://localhost:5000/api/health", (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ── Auto-start backend ────────────────────────────────────────
async function startBackend(context) {
  if (await checkBackend()) return; // Already running

  // Find backend root: look for server/index.js in workspace
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) return;

  let backendRoot = null;
  for (const folder of folders) {
    const candidate = path.join(folder.uri.fsPath, "server", "index.js");
    if (fs.existsSync(candidate)) {
      backendRoot = folder.uri.fsPath;
      break;
    }
  }

  if (!backendRoot) return;

  vscode.window.setStatusBarMessage("$(sync~spin) BuildLens: Starting backend…", 8000);

  backendProcess = spawn("npm", ["run", "dev"], {
    cwd: backendRoot,
    shell: true,
    stdio: "ignore",
    detached: false,
  });

  backendProcess.on("error", () => {});

  context.subscriptions.push({
    dispose: () => { try { backendProcess?.kill(); } catch {} },
  });

  // Poll until up (max 15 seconds)
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    if (await checkBackend()) {
      vscode.window.setStatusBarMessage("$(check) BuildLens: Backend ready on :5000", 4000);
      return;
    }
  }

  vscode.window.showWarningMessage("BuildLens: Backend didn't start. Run 'npm run dev' manually.");
}

// ── Webview Provider ──────────────────────────────────────────
class BuildLensViewProvider {
  static viewType = "buildlens.panel";

  constructor(context) {
    this._context = context;
    this._view = null;
  }

  resolveWebviewView(webviewView) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = fs.readFileSync(
      path.join(this._context.extensionPath, "media", "panel.html"),
      "utf8"
    );

    webviewView.webview.onDidReceiveMessage((msg) => {
      switch (msg.type) {
        case "ready": {
          const folders = vscode.workspace.workspaceFolders;
          const workspacePath = folders?.[0]?.uri?.fsPath || "";
          const notes = this._context.workspaceState.get(NOTES_KEY, {});
          webviewView.webview.postMessage({ type: "init", workspacePath, notes });
          break;
        }
        case "saveNote": {
          const notes = this._context.workspaceState.get(NOTES_KEY, {});
          notes[msg.commitHash] = msg.note;
          this._context.workspaceState.update(NOTES_KEY, notes);
          break;
        }
        case "openBrowser": {
          vscode.env.openExternal(vscode.Uri.parse("http://localhost:5173"));
          break;
        }
        case "openMonitoring": {
          vscode.env.openExternal(vscode.Uri.parse("http://localhost:5173/monitoring"));
          break;
        }
        case "startBackend": {
          startBackend(this._context);
          break;
        }
      }
    });
  }

  refresh() {
    if (!this._view) return;
    const folders = vscode.workspace.workspaceFolders;
    const workspacePath = folders?.[0]?.uri?.fsPath || "";
    const notes = this._context.workspaceState.get(NOTES_KEY, {});
    this._view.webview.postMessage({ type: "init", workspacePath, notes });
  }
}

// ── Activate ──────────────────────────────────────────────────
function activate(context) {
  const provider = new BuildLensViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      BuildLensViewProvider.viewType,
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("buildlens.refresh", () => provider.refresh())
  );

  // Auto-start backend after 2 seconds
  setTimeout(() => startBackend(context), 2000);
}

function deactivate() {
  try { backendProcess?.kill(); } catch {}
}

module.exports = { activate, deactivate };
