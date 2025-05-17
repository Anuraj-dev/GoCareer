const express = require('express');
const router = express.Router();

// Home page
router.get('/', (req, res) => {
  res.render('home', {
    logoPath: '/logo.png',
  });
});

// About Us page
router.get('/about', (req, res) => {
  res.render('about');
});

// Explore page
router.get('/explore', (req, res) => {
  res.render('explore');
});

// Insights page
router.get('/insights', (req, res) => {
  res.render('insights');
});

// Help page
router.get('/help', (req, res) => {
  res.render('help');
});

module.exports = router; 