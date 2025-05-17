const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../middleware/logger");
const config = require("../config");

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(config.api.googleApiKey);

// Configure Gemini model
async function getGeminiModel() {
  return genAI.getGenerativeModel({
    model: config.api.geminiModel,
  });
}

// Helper function to validate AI response structure
function validateAIResponse(response) {
  if (!Array.isArray(response)) return false;
  // Allow empty array as a valid response from AI initially, further checks can filter
  if (response.length === 0) return true; 

  const requiredFields = [
    "title",
    "description",
    "requirements",
    "skills",
    "salary_range",
    "salary_min",
    "salary_max",
    "path_type",
  ];
  return response.every(
    (career) =>
      requiredFields.every((field) => career.hasOwnProperty(field)) &&
      Array.isArray(career.skills) &&
      typeof career.salary_min === "number" &&
      typeof career.salary_max === "number" &&
      ["higher_education", "immediate"].includes(career.path_type)
  );
}

// Helper function to get career recommendations from Gemini AI
async function getCareerRecommendationsFromAI(userData, requestId = Date.now().toString()) {
  const MAX_RETRIES = 3;
  let retryCount = 0;

  logger.info(`AI Service: Processing career recommendation request ${requestId}`, { userData });

  while (retryCount < MAX_RETRIES) {
    try {
      logger.info(`AI Service: Attempt ${retryCount + 1} for request ${requestId}`);
      const model = await getGeminiModel();

      // Enhanced prompt that includes interests and income level
      const promptText = `You are a career counseling expert. Provide 6 suitable career paths for a student in rural India.
Student Profile:
- Qualification: ${userData.qualification}
${userData.qualification === "Class 12" ? `- Stream: ${userData.stream}` : ""}
${
  userData.subjects
    ? `- Subjects: ${userData.subjects}`
    : ""
}
${
  userData.after10th && userData.qualification === "Class 10"
    ? `- After 10th Plan: ${userData.after10th === "continue" ? "Continue to 11th & 12th" : 
      userData.after10th === "diploma" ? "Pursue Diploma" : 
      userData.after10th === "iti" ? "Join ITI" : userData.after10th}`
    : ""
}
- Higher Studies: ${userData.higherStudies || "No"}
- Age: ${userData.age}
- Location: ${userData.location}
${
  userData.interests && userData.interests.length > 0
    ? `- Interests: ${Array.isArray(userData.interests) ? userData.interests.join(', ') : userData.interests}`
    : ""
}
${
  userData.incomeLevel
    ? `- Family Income Level: ${userData.incomeLevel === "low" ? "Below ₹15,000" : 
      userData.incomeLevel === "medium" ? "₹15,000 - ₹50,000" : 
      userData.incomeLevel === "high" ? "Above ₹50,000" : userData.incomeLevel}`
    : ""
}

Output JSON array with 6 objects, each with these EXACT fields:
- title: job/career title
- description: 2-3 sentences about the career
- requirements: education/qualification needed
- skills: array of 3-5 skills needed
- salary_range: text description (e.g., "₹15,000 - ₹35,000")
- salary_min: number (e.g., 15000)
- salary_max: number (e.g., 35000)
- path_type: MUST BE EXACTLY "higher_education" or "immediate"

If Higher Studies is "Yes", ALL careers should have path_type "higher_education".
If Higher Studies is "No", ALL careers should have path_type "immediate".
Consider the student's interests and income level in your recommendations.`;

      const result = await model.generateContent(promptText);
      const response = await result.response;
      const text = await response.text();
      logger.debug(`AI Service: Raw AI response for request ${requestId}: ${text.substring(0, 200)}...`);
      
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
        logger.error(`AI Service: Invalid AI response format for request ${requestId}`, { response: jsonData });
        throw new Error("Invalid AI response format");
      }
      
      // Additional processing (data cleaning/massaging as in app.js)
      jsonData.forEach((career) => {
        if (userData.higherStudies === "Yes") {
          career.path_type = "higher_education";
        } else {
          career.path_type = "immediate";
        }
        if (typeof career.salary_min !== "number") {
          career.salary_min = parseInt(career.salary_min) || 0;
        }
        if (typeof career.salary_max !== "number") {
          career.salary_max = parseInt(career.salary_max) || 0;
        }
        if (!Array.isArray(career.skills)) {
          career.skills = career.skills ? [String(career.skills)] : [];
        }
      });

      const validatedData = jsonData.filter((career) => {
        const hasRequiredFields =
          career.title && career.description && career.path_type;
        if (!hasRequiredFields) {
          logger.warn(`AI Service: Filtering out invalid career data for request ${requestId}`, { career });
          return false;
        }
        return true;
      });

      if (validatedData.length === 0) {
        logger.warn(`AI Service: No valid career paths after validation for request ${requestId}`);
        // If AI returns empty but valid (e.g. [] for a tough query), we might still want to return that
        // instead of null, depending on desired behavior. For now, returning null if empty after filtering.
        if (retryCount < MAX_RETRIES - 1) {
            retryCount++;
            logger.info(`AI Service: Retrying due to no valid data after validation for request ${requestId}`);
            await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
            continue;
        }
        return null;
      }

      validatedData.sort((a, b) => {
        const aValue = a.salary_max || a.salary_min || 0;
        const bValue = b.salary_max || b.salary_min || 0;
        return bValue - aValue;
      });
      
      logger.info(`AI Service: Successfully generated recommendations for request ${requestId}`);
      return validatedData.slice(0, 6);

    } catch (error) {
      logger.error(`AI Service: Error in getCareerRecommendationsFromAI (attempt ${retryCount + 1}) for request ${requestId}: ${error.message}`, { stack: error.stack, rawResponse: error.rawResponse || null });
      if (retryCount < MAX_RETRIES - 1) {
        retryCount++;
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        continue;
      }
      logger.error(`AI Service: All AI recommendation attempts failed for request ${requestId}`);
      return null; // Or throw error, depending on how consumer wants to handle
    }
  }
  // Fallthrough if loop finishes, should ideally be caught by return null in catch
  logger.error(`AI Service: All AI recommendation attempts failed (fallthrough) for request ${requestId}`);
  return null;
}

module.exports = {
  getCareerRecommendationsFromAI,
}; 