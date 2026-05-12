#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HISTORY_FILE = path.join(__dirname, '.buildlens-history.json');

class IntelligenceSystem {
  constructor() {
    this.history = this.loadHistory();
  }

  loadHistory() {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    }
    return { sessions: [], patterns: {}, insights: [] };
  }

  saveHistory() {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(this.history, null, 2));
  }

  // Learn patterns from your work
  learnPatterns(verification) {
    const { workType, score, issues, files, description } = verification;

    // Identify work type/category
    const category = this.categorizeWork(description, files);
    if (!this.history.patterns[category]) {
      this.history.patterns[category] = {
        count: 0,
        avgScore: 0,
        commonIssues: [],
        avgFilesChanged: 0,
        avgCodeLines: 0
      };
    }

    const pattern = this.history.patterns[category];
    pattern.count++;
    pattern.avgScore = (pattern.avgScore * (pattern.count - 1) + score) / pattern.count;
    pattern.avgFilesChanged = (pattern.avgFilesChanged * (pattern.count - 1) + files.length) / pattern.count;

    // Track common issues by category
    issues.forEach(issue => {
      const existing = pattern.commonIssues.find(i => i.type === issue);
      if (existing) {
        existing.frequency++;
      } else {
        pattern.commonIssues.push({ type: issue, frequency: 1 });
      }
    });

    pattern.commonIssues.sort((a, b) => b.frequency - a.frequency);
  }

  categorizeWork(description, files) {
    const desc = description.toLowerCase();
    const fileTypes = files.map(f => f.split('.').pop()).join(',');

    if (desc.includes('fix') || desc.includes('bug')) return 'bugfix';
    if (desc.includes('feature') || desc.includes('add')) return 'feature';
    if (desc.includes('refactor') || desc.includes('optimize')) return 'refactor';
    if (desc.includes('test') || fileTypes.includes('test')) return 'testing';
    if (desc.includes('doc') || desc.includes('readme')) return 'documentation';
    if (fileTypes.includes('json') || fileTypes.includes('yaml')) return 'config';
    return 'other';
  }

  // Generate personalized recommendations
  getRecommendations(category, currentScore) {
    const pattern = this.history.patterns[category];
    if (!pattern) return [];

    const recommendations = [];

    // Compare to category average
    if (currentScore < pattern.avgScore - 10) {
      recommendations.push({
        type: 'score',
        severity: 'warning',
        message: `Your score is ${Math.round(pattern.avgScore - currentScore)}% below your average for ${category}s`
      });
    }

    // Suggest avoiding common issues
    if (pattern.commonIssues.length > 0) {
      const topIssue = pattern.commonIssues[0];
      if (topIssue.frequency > 2) {
        recommendations.push({
          type: 'issue',
          severity: 'info',
          message: `You frequently encounter: "${topIssue.type.toLowerCase()}". Consider addressing this first.`
        });
      }
    }

    // Check file count expectations
    if (files && files.length < pattern.avgFilesChanged * 0.5) {
      recommendations.push({
        type: 'completeness',
        severity: 'warning',
        message: `Typically you change ~${Math.round(pattern.avgFilesChanged)} files for ${category}s. This might be incomplete.`
      });
    }

    return recommendations;
  }

  // Generate insights from patterns
  generateInsights() {
    const insights = [];

    Object.entries(this.history.patterns).forEach(([category, data]) => {
      if (data.count >= 3) {
        insights.push({
          category,
          count: data.count,
          avgScore: Math.round(data.avgScore),
          trend: this.getTrend(category)
        });
      }
    });

    return insights.sort((a, b) => b.avgScore - a.avgScore);
  }

  getTrend(category) {
    const sessions = this.history.sessions.filter(s => s.category === category).slice(-5);
    if (sessions.length < 2) return 'stable';

    const recent = sessions.slice(-2).map(s => s.score).reduce((a, b) => a + b) / 2;
    const earlier = sessions.slice(-5, -2).map(s => s.score).reduce((a, b) => a + b) / Math.max(sessions.length - 2, 1);

    if (recent > earlier + 5) return 'improving 📈';
    if (recent < earlier - 5) return 'declining 📉';
    return 'stable ➡️';
  }

  // Store session for future learning
  recordSession(verification) {
    const session = {
      timestamp: new Date().toISOString(),
      ...verification,
      category: this.categorizeWork(verification.description, verification.files)
    };

    this.history.sessions.push(session);
    this.history.sessions = this.history.sessions.slice(-100); // Keep last 100
    this.learnPatterns(verification);
    this.saveHistory();

    return session;
  }

  getStats() {
    return {
      totalSessions: this.history.sessions.length,
      categories: Object.keys(this.history.patterns),
      avgScore: Math.round(
        this.history.sessions.reduce((sum, s) => sum + s.score, 0) / Math.max(this.history.sessions.length, 1)
      ),
      recentTrend: this.getRecentTrend()
    };
  }

  getRecentTrend() {
    const recent = this.history.sessions.slice(-10).map(s => s.score);
    if (recent.length < 2) return 'insufficient data';
    const avg = recent.reduce((a, b) => a + b) / recent.length;
    const older = this.history.sessions.slice(-20, -10).map(s => s.score);
    if (older.length === 0) return 'new data';
    const oldAvg = older.reduce((a, b) => a + b) / older.length;
    if (avg > oldAvg + 5) return 'improving 📈';
    if (avg < oldAvg - 5) return 'declining 📉';
    return 'stable ➡️';
  }

  displayLearningReport() {
    const insights = this.generateInsights();
    const stats = this.getStats();

    console.log('\n📚 INTELLIGENCE SYSTEM INSIGHTS\n');
    console.log('═'.repeat(60));

    if (insights.length === 0) {
      console.log('Build 3+ items in a category to unlock personalized insights!');
      console.log('═'.repeat(60));
      return;
    }

    console.log('📊 Your Work Patterns:');
    insights.forEach(i => {
      console.log(`\n  ${i.category.toUpperCase()}`);
      console.log(`    ✓ Completed: ${i.count} times`);
      console.log(`    ✓ Avg Score: ${i.avgScore}/100`);
      console.log(`    ✓ Trend: ${i.trend}`);
    });

    console.log(`\n📈 Overall Stats:`);
    console.log(`    • Total Sessions: ${stats.totalSessions}`);
    console.log(`    • Average Score: ${stats.avgScore}/100`);
    console.log(`    • Recent Trend: ${stats.recentTrend}`);
    console.log('\n' + '═'.repeat(60));
  }
}

module.exports = IntelligenceSystem;
