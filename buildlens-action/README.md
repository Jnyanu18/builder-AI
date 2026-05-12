# 🔍 BuildLens AI - GitHub Action

**Stop shipping incomplete code.** BuildLens AI automatically verifies your PRs with AI, blocks incomplete work, and gives clear feedback on what's missing.

## The Problem

Every developer knows this:
- 📝 You push a PR thinking it's done
- 👀 Reviewer spends 1 hour finding issues
- 🔄 You spend 2 hours fixing things you missed
- 😤 Repeat

**BuildLens solves this:** AI verifies your work *before* review. ✨

## What It Does

```
Every PR gets verified:
✅ Analyzes code changes
✅ Compares against linked issue/plan
✅ Generates completion score (0-100%)
✅ Lists what's missing (tests, error handling, docs, etc.)
✅ Blocks merge if <80% complete
```

## Quick Start (1 minute)

### 1. Get a Free API Key

Visit [groq.com/pricing](https://groq.com/pricing) and get a **free** API key.

### 2. Add to Your Repo

Create `.github/workflows/buildlens.yml`:

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

### 3. Add Secret

Go to repo → Settings → Secrets → New secret:
- Name: `GROQ_API_KEY`
- Value: Your key from step 1

**Done!** 🎉

## How It Works

1. **PR opens/updates** → BuildLens runs
2. **Scans:**
   - Code changes (files, functions, tests)
   - Linked issue description
   - PR title & body
3. **Generates AI Analysis:**
   ```
   🔍 BuildLens Analysis
   ━━━━━━━━━━━━━━━━━━━━━
   Overall: PARTIAL IMPLEMENTATION (72%)
   
   ✓ Feature implementation
   - Files modified correctly
   - Logic matches requirements
   
   ⚠ Testing
   - Unit tests missing for edge cases
   
   ✗ Documentation
   - README not updated
   ```
4. **Posts as PR Comment** → Dev sees feedback immediately
5. **Blocks merge** → PR checks fail if <80% complete

## Configuration

### Skip Verification

Add to PR body:
```
buildlens-skip: true
```

### Custom Threshold

Modify the workflow (default: 80%):
```yaml
- uses: Jnyanu18/buildlens-ai@v1
  with:
    groq-api-key: ${{ secrets.GROQ_API_KEY }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
    threshold: 75  # Custom score threshold
```

## What Gets Analyzed

- ✅ Code structure & completeness
- ✅ Test coverage
- ✅ Error handling
- ✅ Documentation
- ✅ Performance considerations
- ✅ Security implications
- ✅ Edge case handling
- ✅ Code comments/clarity

## Real Example

**PR Title:** "Add user authentication"
**Linked Issue:** "#45 - Implement JWT auth with refresh tokens"

**BuildLens Analysis:**
```
✓ JWT implementation - Added middleware, token generation
✓ Refresh tokens - Rotation logic implemented
⚠ Error handling - Missing expired token scenarios
✗ Tests - No unit tests for token expiry
✗ Docs - README needs auth section
⚠ Security - No rate limiting on token endpoint

Score: 65/100 - Needs work before merge
```

**Result:** PR blocked until dev addresses these items.

## Pricing

✅ **Completely free**
- Uses free Groq API tier (50 requests/day for testing)
- Upgrade later if needed

## Troubleshooting

### Action fails with "API key not found"
- Ensure secret `GROQ_API_KEY` is added to repo

### "Threshold exceeded" even though PR looks complete
- Linked issue text helps AI understand requirements
- Add issue link to PR body: `Closes #42`

### Why is score lower than expected?
- Missing tests = big score penalty
- No docs = score penalty
- Incomplete error handling = score penalty
- This is intentional! It pushes quality up.

## Feedback & Issues

Found a bug? Have suggestions?

- 🐦 Twitter: [@BuildLensAI](https://twitter.com/buildlensai)
- 💬 Discord: [Join community](https://discord.gg/buildlens)
- 📧 Email: support@buildlens.ai

## Roadmap

- [ ] Dashboard showing team metrics
- [ ] Slack notifications
- [ ] Jira/Linear integration
- [ ] Custom rules per team
- [ ] Analytics on what's commonly missed

---

**Built by developers, for developers.** ⚡

Made with ❤️ to stop shipping broken code.
