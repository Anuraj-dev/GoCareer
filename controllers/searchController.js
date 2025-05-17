const careerDataService = require('../services/careerDataService');
const logger = require('../middleware/logger');

/**
 * Perform search across career data
 */
exports.performSearch = (req, res) => {
  const query = req.query.q ? req.query.q.toLowerCase() : '';
  
  if (!query) {
    return res.render("search-results", { 
      query: '', 
      results: [],
      resultsCount: 0
    });
  }

  try {
    const searchResults = careerDataService.searchCareers(query);
    
    res.render("search-results", { 
      query,
      results: searchResults,
      resultsCount: searchResults.length
    });
  } catch (error) {
    logger.error(`[SearchController] Error performing search for query "${query}": ${error.message}`, { 
      stack: error.stack 
    });
    
    res.render("search-results", { 
      query,
      results: [],
      resultsCount: 0,
      error: "An error occurred while searching. Please try again."
    });
  }
}; 