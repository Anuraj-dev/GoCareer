const express = require('express');
const router = express.Router();
const careerController = require('../controllers/careerController');

// Assessment page
router.get('/', (req, res) => {
  res.render('test');
});

// Handle assessment form submission
router.post('/submit', careerController.processAssessment);

// Career paths results page
router.get('/career-paths', (req, res) => {
  if (!req.session.careerPaths) {
    // If redirected from /test due to no data, this prevents direct access without data
    req.app.locals.logger.warn('[Routes] No career paths in session. Redirecting to /assessment.');
    return res.redirect('/assessment');
  }

  res.render('career-paths', {
    careerPaths: req.session.careerPaths,
    userData: req.session.userData,
    recommendationSource: req.session.recommendationSource,
  });
});

module.exports = router; 