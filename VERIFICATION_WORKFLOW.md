# BuildLens AI - Work Verification Workflow

This document explains how to use the automated work verification system.

## 🎯 The Workflow

### 1. **Build Your Feature/Fix**
```bash
npm run dev  # Start development
# Make your changes in VS Code
```

### 2. **Mark Work Complete**
When you've finished implementing a feature or fix, run the verification:

```bash
npm run verify
```

### 3. **What Happens**
The verification tool will:

1. **Ask what you built** - You describe the feature/fix
   ```
   📝 What did you build today? Added dark mode toggle to settings
   ```

2. **Scan your changes** - Analyzes all modified files
   ```
   🔍 Scanning changed files...
   ✅ Found 5 changed files
   ```

3. **Analyze implementation** - Checks:
   - Number of files changed
   - Lines of code added
   - Function/component definitions
   - TODO/FIXME markers (errors)
   - Code structure

4. **Generate verification report**:
   ```
   📋 VERIFICATION REPORT
   ════════════════════════════════════════════════════════════
   📌 Work: Added dark mode toggle
   📈 Completion Score: 78/100
      ⚠️ Good progress, but could be more complete
   
   📝 Changed Files (5):
      ✏️ client/src/components/Settings.jsx (+45/-2)
      ✏️ client/src/styles/theme.css (+120/-0)
      🆕 client/src/hooks/useDarkMode.js
      ✏️ client/src/App.jsx (+8/-0)
      ✏️ server/index.js (+5/-0)
   
   ⚠️ Issues Found (1):
      • client/src/components/Settings.jsx: Contains TODO/FIXME markers
   ```

5. **Allow commit** - If score ≥ 50%, you can commit:
   ```
   ✅ Ready to commit? (yes/no): yes
   📝 Commit message: feat: add dark mode toggle
   ✅ Committed successfully!
   ```

## 📊 Scoring System

| Score | Status | Requirements |
|-------|--------|--------------|
| 80-100 | ✅ Excellent | Clear description + 3+ files + 50+ lines + no errors |
| 60-79 | ⚠️ Good | Decent changes, but incomplete or has minor issues |
| 40-59 | ⚡ In Progress | Basic implementation present |
| 0-39 | ❌ Needs Work | Insufficient implementation |

## ⚠️ Common Issues

**Issue: "No changes detected"**
- Make sure you've actually modified files
- Check with `git status`

**Issue: "Score too low to commit"**
- Add more implementation
- Remove TODO markers
- Structure code with proper functions/components

**Issue: "No functions defined"**
- Make sure your new files have actual code (functions, components, etc.)
- Not just configuration or comments

## 💡 Pro Tips

1. **Run before you think you're done** - Sometimes the verification catches missing pieces
2. **Read the issues** - They'll tell you what to fix
3. **Iterate** - Make fixes → run verify again → commit when ready
4. **Clear descriptions** - More detailed work descriptions = higher scores

## 🔧 Manual Process (If Needed)

If you prefer not to use the verification tool:
```bash
git add -A
git commit -m "your message"
git push
```

But using `npm run verify` gives you confidence your work is complete! 🚀
