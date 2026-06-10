# IntentOS — VS Code Extension

Verify that your code matches the approved blueprint, from inside VS Code.

## Setup

1. In your IntentOS app, open the project → **Repository** tab → copy the **API token**.
2. In VS Code, run **IntentOS: Configure project** and set:
   - `intentos.apiBaseUrl` — e.g. `https://your-app.lovable.app`
   - `intentos.projectId` — the project UUID (visible in the URL)
   - `intentos.apiToken` — the token you copied
3. (Optional) Enable `intentos.runOnSave` to re-check after every save.

## Commands

- **IntentOS: Run drift analysis** — re-runs analysis against the latest approved blueprint and your latest repository scan.
- **IntentOS: Show latest drift report** — opens the latest report in a side panel.

The status bar shows alignment %, drift count, and verdict at a glance.

## Build & install (unpacked)

```bash
cd vscode-extension
npm install
npm run compile
```

Then in VS Code: **Extensions → ⋯ → Install from VSIX…** or **Developer: Install Extension from Location…** pointing at this folder.
