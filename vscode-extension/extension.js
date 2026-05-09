const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

const NOTES_KEY = "buildlens.commitNotes";
const API_BASE = "http://localhost:5000";

class BuildLensViewProvider {
  static viewType = "buildlens.panel";

  constructor(context) {
    this._context = context;
    this._view = null;
  }

  resolveWebviewView(webviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = this._getHtml();

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
        case "showError": {
          vscode.window.showErrorMessage(`BuildLens: ${msg.message}`);
          break;
        }
      }
    });
  }

  refresh() {
    if (this._view) {
      const folders = vscode.workspace.workspaceFolders;
      const workspacePath = folders?.[0]?.uri?.fsPath || "";
      const notes = this._context.workspaceState.get(NOTES_KEY, {});
      this._view.webview.postMessage({ type: "init", workspacePath, notes });
    }
  }

  _getHtml() {
    const htmlPath = path.join(this._context.extensionPath, "media", "panel.html");
    return fs.readFileSync(htmlPath, "utf8");
  }
}

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
    vscode.commands.registerCommand("buildlens.refresh", () => {
      provider.refresh();
    })
  );
}

module.exports = { activate };
