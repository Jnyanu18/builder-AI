const express = require('express');
const CodeReviewAnalyzer = require('../code-review-analyzer');

module.exports = () => {
  const router = express.Router();
  const reviewer = new CodeReviewAnalyzer();

  /**
   * POST /api/review
   * Comprehensive code review of all changed files
   */
  router.post('/', async (req, res) => {
    try {
      const { repoPath, plan } = req.body;

      if (!repoPath) {
        return res.status(400).json({ error: 'repoPath required' });
      }

      const review = await reviewer.reviewImplementation(repoPath, plan);

      if (!review.success) {
        return res.status(400).json(review);
      }

      res.json(review);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/review/file
   * Review a specific file
   */
  router.post('/file', async (req, res) => {
    try {
      const { filePath, plan } = req.body;

      if (!filePath) {
        return res.status(400).json({ error: 'filePath required' });
      }

      const fileContent = reviewer.readEntireFile(filePath);
      if (!fileContent) {
        return res.status(404).json({ error: 'File not found or empty' });
      }

      const analysis = await reviewer.analyzeWithAI(
        fileContent,
        filePath.split('/').pop(),
        reviewer.detectLanguage(filePath),
        plan || 'No specific plan provided'
      );

      res.json({
        file: filePath,
        linesOfCode: fileContent.split('\n').length,
        ...analysis
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/review/summary
   * Get just the metrics/summary
   */
  router.post('/summary', async (req, res) => {
    try {
      const { repoPath, plan } = req.body;

      if (!repoPath) {
        return res.status(400).json({ error: 'repoPath required' });
      }

      const review = await reviewer.reviewImplementation(repoPath, plan);

      res.json({
        success: review.success,
        metrics: review.metrics,
        report: review.report,
        timestamp: review.timestamp
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
