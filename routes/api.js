const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../middleware/logger");
const cacheMiddleware = require("../middleware/cache");
const { validateRecommendationRequest, validate } = require("../middleware/validation");
const { apiLimiter } = require("../middleware/rateLimit");
require("dotenv").config();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Configure Gemini 2.0 Flash model
async function getGeminiModel() {
  return genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
  });
}

// Helper function to validate AI response
function validateAIResponse(response) {
  if (!Array.isArray(response)) return false;
  if (response.length === 0) return false;

  const requiredFields = ['title', 'description', 'requirements', 'skills', 'salary_range', 'salary_min', 'salary_max', 'path_type'];
  return response.every(career => 
    requiredFields.every(field => career.hasOwnProperty(field)) &&
    Array.isArray(career.skills) &&
    typeof career.salary_min === 'number' &&
    typeof career.salary_max === 'number' &&
    ['higher_education', 'immediate'].includes(career.path_type)
  );
}

// API route for career recommendations
router.post("/recommendations",
  apiLimiter,
  validateRecommendationRequest,
  validate,
  cacheMiddleware,
  async (req, res) => {
    const userData = req.body;
    const requestId = Date.now().toString();

    try {
      logger.info(`Processing career recommendation request ${requestId}`, { userData });
      const model = await getGeminiModel();

      const promptText = `You are a career counseling expert. Provide 6 suitable career paths for a student in rural India.
Student Profile:
- Qualification: ${userData.qualification}
${userData.qualification === "Class 12" ? `- Stream: ${userData.stream}` : ""}
${userData.qualification === "Class 12" && userData.subjects ? `- Subjects: ${userData.subjects}` : ""}
${userData.higherStudies ? `- Higher Studies: ${userData.higherStudies}` : ""}
- Age: ${userData.age}
- Location: ${userData.location}

Output JSON array with 6 objects, each with: title, description (2-3 sentences), requirements, skills (3-5), salary_range (INR monthly), salary_min (number), salary_max (number), path_type ('higher_education' or 'immediate'). Prioritize local/remote jobs. If higher studies is 'Yes', suggest 'higher_education' paths, otherwise 'immediate' paths.`;

      const result = await model.generateContent(promptText);
      const response = await result.response;
      const text = await response.text();

      try {
        let cleanedText = text;
        if (cleanedText.startsWith("```json")) {
          cleanedText = cleanedText.substring(7);
        }
        if (cleanedText.endsWith("```")) {
          cleanedText = cleanedText.substring(0, cleanedText.length - 3);
        }
        cleanedText = cleanedText.trim();

        const jsonData = JSON.parse(cleanedText);
        
        if (!validateAIResponse(jsonData)) {
          logger.error(`Invalid AI response format for request ${requestId}`, { response: jsonData });
          throw new Error('Invalid AI response format');
        }

        logger.info(`Successfully generated recommendations for request ${requestId}`);
        res.json({ success: true, careers: jsonData });

      } catch (jsonError) {
        logger.error(`Failed to parse AI response as JSON for request ${requestId}`, { error: jsonError.message });
        res.status(500).json({ 
          success: false, 
          error: "Failed to parse AI response",
          requestId
        });
      }
    } catch (error) {
      logger.error(`AI recommendation error for request ${requestId}`, { error: error.message });
      res.status(500).json({ 
        success: false, 
        error: "AI service error",
        requestId
      });
    }
});

// Simple health check endpoint
router.get("/health", apiLimiter, (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

module.exports = router;
