const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Groq = require('groq-sdk');

class CodeReviewAnalyzer {
  constructor() {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not configured');
    }
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  /**
   * Read entire file content
   */
  readEntireFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
    } catch (err) {
      console.error(`Error reading file ${filePath}:`, err.message);
    }
    return '';
  }

  /**
   * Get all changed files with full content
   */
  getChangedFilesWithContent(repoPath) {
    try {
      const gitStatus = execSync(`cd "${repoPath}" && git status --porcelain`, { encoding: 'utf-8' });
      const files = gitStatus
        .split('\n')
        .filter(line => line.trim())
        .map(line => ({
          status: line.substring(0, 2),
          path: line.substring(3)
        }))
        .filter(f => !f.path.includes('node_modules') && !f.path.includes('.git'));

      return files.map(f => ({
        ...f,
        fullPath: path.join(repoPath, f.path),
        content: this.readEntireFile(path.join(repoPath, f.path)),
        extension: path.extname(f.path),
        language: this.detectLanguage(f.path)
      }));
    } catch (err) {
      console.error('Error getting changed files:', err.message);
      return [];
    }
  }

  /**
   * Detect programming language from file extension
   */
  detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const langMap = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript/React',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript/React',
      '.py': 'Python',
      '.java': 'Java',
      '.cpp': 'C++',
      '.c': 'C',
      '.go': 'Go',
      '.rs': 'Rust',
      '.rb': 'Ruby',
      '.php': 'PHP',
      '.sql': 'SQL',
      '.json': 'JSON',
      '.yaml': 'YAML',
      '.yml': 'YAML',
      '.html': 'HTML',
      '.css': 'CSS',
      '.scss': 'SCSS',
    };
    return langMap[ext] || 'Unknown';
  }

  /**
   * Analyze code with Groq AI
   */
  async analyzeWithAI(fileContent, fileName, language, planDescription) {
    const prompt = `You are an expert code reviewer (like SonarQube). Analyze this code file comprehensively.

FILE: ${fileName}
LANGUAGE: ${language}
PLAN/REQUIREMENT: ${planDescription}

CODE TO REVIEW:
\`\`\`${language.toLowerCase()}
${fileContent.substring(0, 5000)}
\`\`\`

Provide a detailed analysis in this EXACT JSON format (no markdown, just JSON):
{
  "implementationStatus": "0-100 percentage of how complete this implementation is",
  "quality": {
    "overall": "1-10 score",
    "readability": "1-10 score with brief comment",
    "performance": "1-10 score with brief comment",
    "security": "1-10 score with brief comment",
    "maintainability": "1-10 score with brief comment"
  },
  "issues": [
    {
      "severity": "critical|warning|info",
      "type": "bug|code-quality|security|performance|design",
      "title": "Issue title",
      "description": "Detailed description",
      "suggestion": "How to fix it"
    }
  ],
  "missingFeatures": ["Feature that should be there based on plan but isn't"],
  "implementedFeatures": ["What has been successfully implemented"],
  "improvements": ["Suggestions for improvement"],
  "summary": "One paragraph summary"
}`;

    try {
      const message = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2048,
        temperature: 0.5,
      });

      const responseText = message.choices[0].message.content;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return JSON.parse(responseText);
    } catch (err) {
      console.error('Error analyzing with Groq:', err.message);
      return {
        implementationStatus: 50,
        quality: { overall: 5, readability: 5, performance: 5, security: 5, maintainability: 5 },
        issues: [{ severity: 'warning', type: 'analysis-error', title: 'Analysis incomplete', description: 'Full analysis not available', suggestion: 'Review manually' }],
        missingFeatures: [],
        implementedFeatures: [],
        improvements: [],
        summary: 'Partial analysis due to LLM limitations'
      };
    }
  }

  /**
   * Calculate overall metrics
   */
  calculateMetrics(analyses) {
    if (!analyses || analyses.length === 0) return null;

    const avgImplementation = analyses.reduce((sum, a) => sum + (a.implementationStatus || 0), 0) / analyses.length;
    const avgQuality = analyses.reduce((sum, a) => sum + (a.quality?.overall || 0), 0) / analyses.length;

    const allIssues = analyses.flatMap(a => a.issues || []);
    const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
    const warningCount = allIssues.filter(i => i.severity === 'warning').length;
    const infoCount = allIssues.filter(i => i.severity === 'info').length;

    const allMissing = [...new Set(analyses.flatMap(a => a.missingFeatures || []))];
    const allImplemented = [...new Set(analyses.flatMap(a => a.implementedFeatures || []))];

    return {
      avgImplementation: Math.round(avgImplementation),
      avgQuality: Math.round(avgQuality * 10) / 10,
      filesAnalyzed: analyses.length,
      criticalIssues: criticalCount,
      warnings: warningCount,
      infos: infoCount,
      missingFeatures: allMissing,
      implementedFeatures: allImplemented,
      completenessLevel: avgImplementation >= 90 ? 'Excellent' : avgImplementation >= 75 ? 'Good' : avgImplementation >= 50 ? 'Partial' : 'Incomplete'
    };
  }

  /**
   * Full review process
   */
  async reviewImplementation(repoPath, plan) {
    console.log('📋 Starting comprehensive code review...');

    const changedFiles = this.getChangedFilesWithContent(repoPath);

    if (changedFiles.length === 0) {
      return {
        success: false,
        error: 'No changed files found',
        analyses: [],
        metrics: null
      };
    }

    const analyses = [];

    // Analyze each file
    for (const file of changedFiles) {
      if (!file.content || file.content.length === 0) continue;

      // Skip non-code files
      if (!['JavaScript', 'JavaScript/React', 'TypeScript', 'TypeScript/React', 'Python', 'Java', 'SQL'].includes(file.language)) {
        continue;
      }

      console.log(`🔍 Analyzing: ${file.path}`);

      const analysis = await this.analyzeWithAI(
        file.content,
        file.path,
        file.language,
        plan || 'No specific plan provided'
      );

      analyses.push({
        file: file.path,
        language: file.language,
        linesOfCode: file.content.split('\n').length,
        ...analysis
      });
    }

    const metrics = this.calculateMetrics(analyses);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      totalFilesChanged: changedFiles.length,
      filesAnalyzed: analyses.length,
      analyses,
      metrics,
      report: this.generateReport(analyses, metrics)
    };
  }

  /**
   * Generate human-readable report
   */
  generateReport(analyses, metrics) {
    if (!metrics) return 'No files analyzed';

    let report = `
╔════════════════════════════════════════════════════════════╗
║           CODE REVIEW REPORT - SonarQube Style             ║
╚════════════════════════════════════════════════════════════╝

📊 OVERALL METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Implementation Completion: ${metrics.avgImplementation}% [${metrics.completenessLevel}]
  Code Quality Score: ${metrics.avgQuality}/10
  Files Analyzed: ${metrics.filesAnalyzed}

🐛 ISSUES FOUND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔴 Critical: ${metrics.criticalIssues}
  🟡 Warnings: ${metrics.warnings}
  ℹ️  Info: ${metrics.infos}

✅ IMPLEMENTED FEATURES (${metrics.implementedFeatures.length})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    metrics.implementedFeatures.slice(0, 10).forEach(f => {
      report += `\n  ✓ ${f}`;
    });

    report += `\n\n❌ MISSING FEATURES (${metrics.missingFeatures.length})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    metrics.missingFeatures.slice(0, 10).forEach(f => {
      report += `\n  ✗ ${f}`;
    });

    report += `\n\n📁 FILE-BY-FILE ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    analyses.forEach(a => {
      report += `\n\n  📄 ${a.file}
    Language: ${a.language} | LOC: ${a.linesOfCode}
    Implementation: ${a.implementationStatus}% | Quality: ${a.quality.overall}/10
    Issues: ${(a.issues || []).length} critical/${(a.issues || []).filter(i => i.severity === 'critical').length}`;
    });

    report += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    return report;
  }
}

module.exports = CodeReviewAnalyzer;
