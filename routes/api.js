const express = require("express");
const router = express.Router();
const { getCareerRecommendationsFromAI, getCareerRoadmapFromAI } = require("../services/aiService");
const logger = require("../middleware/logger");
const cacheMiddleware = require("../middleware/cache");
const { validateRecommendationRequest, validate } = require("../middleware/validation");
const { apiLimiter } = require("../middleware/rateLimit");

// API route for career recommendations
router.post("/recommendations",
  apiLimiter,
  validateRecommendationRequest,
  validate,
  cacheMiddleware,
  async (req, res) => {
    const userData = req.body;
    const requestId = req.headers['x-request-id'] || `api-${Date.now().toString()}`;

    try {
      const recommendations = await getCareerRecommendationsFromAI(userData, requestId);

      if (recommendations && recommendations.length > 0) {
        logger.info(`[API /recommendations] Successfully generated recommendations for request ${requestId}`);
        res.json({ success: true, careers: recommendations, requestId });
      } else if (recommendations) {
        logger.info(`[API /recommendations] AI returned no recommendations for request ${requestId}`);
        res.json({ success: true, careers: [], requestId, message: "No specific recommendations found based on the provided criteria." });
      } else {
        logger.error(`[API /recommendations] AI service failed to return recommendations for request ${requestId}`);
        res.status(500).json({
          success: false,
          error: "Failed to get career recommendations from AI service after multiple attempts.",
          requestId,
        });
      }
    } catch (error) {
      logger.error(`[API /recommendations] Unexpected error for request ${requestId}: ${error.message}`, { stack: error.stack });
      res.status(500).json({
        success: false,
        error: "An unexpected error occurred while fetching career recommendations.",
        requestId,
      });
    }
  });

// API route for career roadmap
router.post("/career-roadmap",
  apiLimiter,
  async (req, res) => {
    const { careerTitle, careerDetails } = req.body;
    const requestId = req.headers['x-request-id'] || `roadmap-${Date.now().toString()}`;

    if (!careerTitle) {
      return res.status(400).json({
        success: false,
        error: "Career title is required",
        requestId
      });
    }

    try {
      const roadmap = await getCareerRoadmapFromAI(careerTitle, careerDetails, requestId);

      if (roadmap) {
        logger.info(`[API /career-roadmap] Successfully generated roadmap for ${careerTitle}, request ${requestId}`);
        res.json({ success: true, roadmap, requestId });
      } else {
        logger.error(`[API /career-roadmap] AI service failed to return roadmap for ${careerTitle}, request ${requestId}`);
        res.status(500).json({
          success: false,
          error: "Failed to get career roadmap from AI service after multiple attempts.",
          requestId,
        });
      }
    } catch (error) {
      logger.error(`[API /career-roadmap] Unexpected error for request ${requestId}: ${error.message}`, { stack: error.stack });
      res.status(500).json({
        success: false,
        error: "An unexpected error occurred while fetching career roadmap.",
        requestId,
      });
    }
  });

// Simple health check endpoint
router.get("/health", apiLimiter, (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

module.exports = router;
