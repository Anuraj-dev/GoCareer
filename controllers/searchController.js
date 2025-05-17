const careerDataService = require('../services/careerDataService');
const logger = require('../middleware/logger');

/**
 * Perform search across career data
 */
exports.performSearch = (req, res) => {
  const query = req.query.q ? req.query.q.toLowerCase().trim() : '';
  
  if (!query) {
    return res.render("search-results", { 
      query: '', 
      results: [],
      resultsCount: 0,
      pageTitle: 'Search - GoCareer'
    });
  }

  try {
    const searchResults = careerDataService.searchCareers(query);
    
    // Generate relevant search terms for suggestions
    const relatedTerms = generateRelatedTerms(query, searchResults);
    
    res.render("search-results", { 
      query,
      results: searchResults,
      resultsCount: searchResults.length,
      relatedTerms: relatedTerms,
      pageTitle: `Search Results for "${query}" - GoCareer`
    });
  } catch (error) {
    logger.error(`[SearchController] Error performing search for query "${query}": ${error.message}`, { 
      stack: error.stack 
    });
    
    res.render("search-results", { 
      query,
      results: [],
      resultsCount: 0,
      error: "An error occurred while searching. Please try again.",
      pageTitle: 'Search Error - GoCareer'
    });
  }
};

/**
 * Generate related search terms based on the query and results
 */
function generateRelatedTerms(query, results) {
  // Skip if no results or query is too short
  if (results.length === 0 || query.length < 3) {
    return [];
  }
  
  // Extract potential keywords from results
  const allKeywords = new Set();
  
  results.forEach(result => {
    // Extract words from title
    if (result.title) {
      result.title.split(/\s+/).forEach(word => {
        if (word.length > 3 && !query.includes(word.toLowerCase())) {
          allKeywords.add(word);
        }
      });
    }
    
    // Extract keywords from skills
    if (result.skills && Array.isArray(result.skills)) {
      result.skills.forEach(skill => {
        if (skill.length > 3 && !query.includes(skill.toLowerCase())) {
          allKeywords.add(skill);
        }
      });
    }
  });
  
  // Create related search terms by combining the original query with keywords
  const relatedTerms = Array.from(allKeywords)
    .slice(0, 5)
    .map(keyword => `${query} ${keyword}`)
    .filter(term => term !== query);
  
  return relatedTerms;
} 