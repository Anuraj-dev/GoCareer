const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// Search functionality
router.get('/', searchController.performSearch);

module.exports = router; 