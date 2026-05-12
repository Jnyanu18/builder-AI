# 📖 Installation Guide - BuildLens AI

Complete step-by-step guide to set up BuildLens AI on your GitHub repository.

## Prerequisites

- GitHub repository (public or private)
- GitHub account with admin access to repository settings
- 2 minutes of time

## Step 1: Get a Free Groq API Key

1. Go to [groq.com/pricing](https://groq.com/pricing)
2. Click "Sign Up" or "Sign In"
3. Complete signup (takes 30 seconds)
4. Navigate to API Keys section
5. Click "Create API Key"
6. Copy the key (looks like: `gsk_1a2b3c4d5e6f...`)

**Why Groq?** It's free, fast, and gives you 50 requests/day. Perfect for getting started.

---

## Step 2: Add GitHub Secret

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Fill in:
   - **Name:** `GROQ_API_KEY`
   - **Value:** Paste the key from Step 1
5. Click **Add secret**

✅ Now GitHub has permission to use BuildLens on your PRs.

---

## Step 3: Create Workflow File

1. In your repo, create this file structure:
   ```
   .github/
   └── workflows/
       └── buildlens.yml
   ```

2. Add this content to `.github/workflows/buildlens.yml`:

```yaml
name: BuildLens PR Verification

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  buildlens:
    runs-on: ubuntu-latest
    steps:
      - uses: Jnyanu18/buildlens-ai@v1
        with:
          groq-api-key: ${{ secrets.GROQ_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

3. Commit and push:
   ```bash
   git add .github/workflows/buildlens.yml
   git commit -m "chore: add BuildLens AI verification"
   git push
   ```

✅ BuildLens is now installed!

---

## Step 4: Test It

1. **Create a new branch:**
   ```bash
   git checkout -b test-buildlens
   ```

2. **Make a small change** (e.g., add a TODO to a file):
   ```
   TODO: This is incomplete
   ```

3. **Commit and push:**
   ```bash
   git add .
   git commit -m "test: incomplete feature"
   git push -u origin test-buildlens
   ```

4. **Open a Pull Request** and add a linked issue:
   ```
   Closes #123
   ```

5. **Wait 30 seconds** → BuildLens comment appears on your PR

6. **See the analysis:**
   ```
   🔍 BuildLens Analysis
   ━━━━━━━━━━━━━━━━━━━━
   Overall: INCOMPLETE (45%)
   
   ✗ Implementation
   - TODO markers found: 1
   - Incomplete code detected
   
   ✗ Tests
   - No test files modified
   ```

✅ It works! The PR is blocked because the work is incomplete.

---

## Step 5: Fix & Merge

1. **Complete the work** (remove TODOs, add tests, docs)
2. **Push again:**
   ```bash
   git add .
   git commit -m "feat: complete feature"
   git push
   ```

3. **BuildLens re-analyzes** automatically

4. **Once score ≥80%** → Merge button lights up ✅

---

## Troubleshooting

### ❌ "API Key Error"

- Did you add the secret? Check: Settings → Secrets
- Is the secret name exactly `GROQ_API_KEY`? (case-sensitive)
- Copy-pasted the key correctly from Groq?

**Solution:** Delete the secret and re-add it carefully.

### ❌ "BuildLens didn't comment"

- Did you link an issue? Add `Closes #123` to PR body
- Wait 60 seconds on first run (API warm-up)
- Check **Actions** tab → BuildLens job logs

### ❌ "Score seems wrong"

- BuildLens is conservative: penalizes missing tests, docs, error handling
- This is intentional! It pushes quality up
- Missing TODO comments also drop score

---

## Advanced: Custom Threshold

Want to require 90% instead of 80%? Edit `.github/workflows/buildlens.yml`:

```yaml
- uses: Jnyanu18/buildlens-ai@v1
  with:
    groq-api-key: ${{ secrets.GROQ_API_KEY }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
    min-score: 90  # Changed from 80
```

---

## Next Steps

- 🎉 Congrats! BuildLens is live on your repo
- 📖 Read the [README](./buildlens-action/README.md) for more features
- 💬 Join our [Discord community](https://discord.gg/buildlens)
- 🐦 Follow [@BuildLensAI](https://twitter.com/buildlensai) for updates

---

## Questions?

- **Email:** support@buildlens.ai
- **Discord:** [discord.gg/buildlens](https://discord.gg/buildlens)
- **GitHub Issues:** [github.com/Jnyanu18/buildlens-ai/issues](https://github.com/Jnyanu18/buildlens-ai/issues)

Happy shipping! 🚀
