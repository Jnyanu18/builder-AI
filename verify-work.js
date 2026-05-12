#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const IntelligenceSystem = require('./intelligence-system');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function getGitStatus() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    return status.split('\n').filter(line => line.trim()).map(line => ({
      type: line.substring(0, 2),
      file: line.substring(3)
    }));
  } catch {
    return [];
  }
}

function readFileContent(file) {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    return fs.readFileSync(fullPath, 'utf-8');
  }
  return '';
}

function analyzeFile(file) {
  const content = readFileContent(file);
  const lines = content.split('\n');

  return {
    file,
    lines: lines.length,
    hasComments: content.includes('//') || content.includes('/*'),
    hasErrors: content.includes('TODO') || content.includes('FIXME') || content.includes('XXX'),
    hasTests: content.includes('test(') || content.includes('describe(') || content.includes('it('),
    imports: (content.match(/^(import|require)/gm) || []).length,
    functions: (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(|async\s+\w+/gm) || []).length,
  };
}

function calculateCompletionScore(workDescription, changedFiles) {
  let score = 0;
  const issues = [];

  // Check if work description is clear
  if (workDescription.length > 10) score += 15;
  else issues.push('Work description too vague');

  // Check file changes
  if (changedFiles.length > 0) score += 20;
  else {
    issues.push('No files changed');
    return { score: 0, issues };
  }

  // Analyze changed files
  let totalLines = 0;
  let filesWithCode = 0;
  let codeFiles = changedFiles.filter(f =>
    f.file.endsWith('.js') || f.file.endsWith('.jsx') ||
    f.file.endsWith('.ts') || f.file.endsWith('.tsx')
  );

  codeFiles.forEach(f => {
    const analysis = analyzeFile(f.file);
    totalLines += analysis.lines;
    if (analysis.functions > 0 || analysis.imports > 0) filesWithCode++;

    if (analysis.hasErrors) {
      issues.push(`${f.file}: Contains TODO/FIXME markers`);
    }
    if (analysis.functions === 0 && analysis.lines > 5) {
      issues.push(`${f.file}: No functions defined (might be incomplete)`);
    }
  });

  // Scoring
  if (filesWithCode === codeFiles.length) score += 20;
  if (totalLines >= 50) score += 15;
  else if (totalLines > 0) score += 10;
  if (changedFiles.length >= 3) score += 15;
  if (codeFiles.some(f => !readFileContent(f.file).includes('console.log'))) score += 10;

  // Check for proper git structure
  try {
    const log = execSync('git log --oneline -1', { encoding: 'utf-8' });
    if (!log.includes('WIP') && !log.includes('temp')) score += 5;
  } catch { }

  return { score: Math.min(score, 100), issues };
}

function getDiffSummary(file) {
  try {
    const diff = execSync(`git diff ${file}`, { encoding: 'utf-8' });
    const addedLines = (diff.match(/^\+/gm) || []).length;
    const removedLines = (diff.match(/^\-/gm) || []).length;
    return { added: addedLines, removed: removedLines };
  } catch {
    return { added: 0, removed: 0 };
  }
}

async function main() {
  console.log('\n🚀 BuildLens AI - Work Verification System\n');

  const intelligence = new IntelligenceSystem();

  // Step 1: Ask what they're building
  const workDescription = await question('📝 What did you build today? ');
  if (!workDescription.trim()) {
    console.log('❌ Work description required!');
    rl.close();
    process.exit(1);
  }

  // Step 2: Get git status
  console.log('\n🔍 Scanning changed files...');
  const changes = await getGitStatus();
  const changedFiles = changes.filter(c => c.type === ' M' || c.type === '??').slice(0, 20);

  if (changedFiles.length === 0) {
    console.log('❌ No changes detected!');
    rl.close();
    process.exit(1);
  }

  console.log(`✅ Found ${changedFiles.length} changed files`);

  // Step 3: Analyze implementation
  console.log('\n📊 Analyzing implementation...\n');

  const { score, issues } = calculateCompletionScore(workDescription, changedFiles);
  const fileNames = changedFiles.map(f => f.file);

  // Get AI-powered recommendations
  const category = intelligence.categorizeWork(workDescription, fileNames);
  const recommendations = intelligence.getRecommendations(category, score);

  // Step 4: Display report
  console.log('═'.repeat(60));
  console.log(`📋 VERIFICATION REPORT`);
  console.log('═'.repeat(60));
  console.log(`\n📌 Work: ${workDescription}`);
  console.log(`📂 Category: ${category.toUpperCase()}`);
  console.log(`\n📈 Completion Score: ${score}/100`);

  if (score >= 80) console.log('   ✅ Excellent completion!');
  else if (score >= 60) console.log('   ⚠️  Good progress, but could be more complete');
  else if (score >= 40) console.log('   ⚡ Work in progress');
  else console.log('   ❌ Needs more implementation');

  // Changed files summary
  console.log(`\n📝 Changed Files (${changedFiles.length}):`);
  changedFiles.slice(0, 10).forEach(f => {
    const diff = getDiffSummary(f.file);
    console.log(`   ${f.type === '??' ? '🆕' : '✏️ '} ${f.file} (+${diff.added}/-${diff.removed})`);
  });

  // Issues found
  if (issues.length > 0) {
    console.log(`\n⚠️  Issues Found (${issues.length}):`);
    issues.forEach(issue => console.log(`   • ${issue}`));
  } else {
    console.log('\n✅ No issues detected!');
  }

  // AI Recommendations
  if (recommendations.length > 0) {
    console.log(`\n💡 AI Recommendations (from your patterns):`);
    recommendations.forEach(rec => {
      const icon = rec.severity === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`   ${icon} ${rec.message}`);
    });
  }

  console.log('\n' + '═'.repeat(60));

  // Step 5: Ask to commit
  if (score >= 50 || issues.length === 0) {
    const commitChoice = await question('\n✅ Ready to commit? (yes/no): ');
    if (commitChoice.toLowerCase().startsWith('y')) {
      const commitMsg = await question('📝 Commit message: ');
      if (commitMsg.trim()) {
        try {
          execSync(`git add -A`, { stdio: 'inherit' });
          execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit' });
          console.log('\n✅ Committed successfully!');

          // Record session for learning
          intelligence.recordSession({
            description: workDescription,
            score,
            issues,
            files: fileNames
          });

          // Show insights
          intelligence.displayLearningReport();
        } catch (e) {
          console.log('\n❌ Commit failed');
        }
      }
    }
  } else {
    console.log('\n❌ Score too low to commit. Fix the issues first!');
  }

  rl.close();
}

main().catch(console.error);
