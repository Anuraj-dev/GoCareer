const { getCareerRecommendationsFromAI } = require('../services/aiService');
const careerDataService = require('../services/careerDataService');
const logger = require('../middleware/logger');

/**
 * Process the assessment form data and generate career recommendations
 */
exports.processAssessment = async (req, res) => {
  // Map form data to expected format
  // 1. Fix qualification mapping
  let qualification = "Unknown";
  if (req.body.qualification === "after10th") qualification = "Class 10";
  if (req.body.qualification === "after12th") qualification = "Class 12";
  
  // 2. Fix stream mapping and handle science subjects
  let stream = req.body.stream;
  let subjects = req.body.subjects || ""; // Use req.body.subjects directly
  
  // Normalize stream values
  if (stream === "pcm" || stream === "pcb") {
    // For Science stream, set subjects based on stream selection
    // and set stream to "Science"
    subjects = stream.toUpperCase() + (subjects ? ", " + subjects : "");
    stream = "Science";
  } else if (stream === "commerce") {
    stream = "Commerce";
  } else if (stream === "arts") {
    stream = "Arts";
  }

  // Create userData object with all form data, properly mapped
  const userData = {
    qualification: qualification,
    stream: stream,
    subjects: subjects,
    age: req.body.age,
    location: req.body.location,
    higherStudies: req.body.higherStudies,
    incomeLevel: req.body.incomeLevel,
    // Add the missing fields that were collected but not used
    interests: Array.isArray(req.body.interests) ? req.body.interests : 
               (req.body.interests ? [req.body.interests] : []),
    after10th: req.body.after10th || null
  };

  req.session.userData = userData;
  const requestId = req.sessionID || Date.now().toString();

  try {
    logger.info(`[CareerController] Attempting AI recommendations for session: ${requestId}`, { userData });
    
    // Update the AI service call to include interests if they exist
    const aiRecommendations = await getCareerRecommendationsFromAI(userData, requestId); 

    if (aiRecommendations && aiRecommendations.length > 0) {
      logger.info(`[CareerController] AI recommendations successful for session: ${requestId}`);
      req.session.careerPaths = aiRecommendations;
      req.session.recommendationSource = "AI Recommendations";
    } else {
      logger.warn(`[CareerController] AI recommendations failed or returned empty for session: ${requestId}. Falling back to default.`);
      const defaultRecommendations = careerDataService.getDefaultCareerRecommendations(userData);
      if (defaultRecommendations && defaultRecommendations.length > 0) {
        logger.info(`[CareerController] Default recommendations used for session: ${requestId}`);
        req.session.careerPaths = defaultRecommendations;
        req.session.recommendationSource =
          "Default Recommendations (AI Fallback)";
      } else {
        logger.warn(`[CareerController] No default recommendations available for session: ${requestId}`);
        req.session.careerPaths = [];
        req.session.recommendationSource = "No Recommendations Available";
      }
    }
    res.redirect("/career-paths");
  } catch (error) {
    logger.error(`[CareerController] Error processing assessment for session ${requestId}: ${error.message}`, { stack: error.stack });
    res.status(500).render("error", {
        message: "We encountered an issue while processing your assessment.",
        error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
}; 