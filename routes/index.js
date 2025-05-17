const express = require('express');
const router = express.Router();

// Import route modules
const apiRoutes = require('./api');
const assessmentRoutes = require('./assessment');
const pageRoutes = require('./pages');
const searchRoutes = require('./search');

// Use route modules
router.use('/api', apiRoutes);
router.use('/assessment', assessmentRoutes);
router.use('/search', searchRoutes);
router.use('/', pageRoutes);

// Special case for the legacy /test endpoint which should map to assessmentRoutes
router.post('/test', (req, res) => {
  const origUrl = req.url;
  req.url = '/submit';
  assessmentRoutes(req, res);
});

// Special case for /career-paths to maintain compatibility
router.get('/career-paths', (req, res) => {
  const origUrl = req.url;
  req.url = '/assessment/career-paths';
  router.handle(req, res);
});

module.exports = router; 