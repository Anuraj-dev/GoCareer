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

      // Enhanced prompt with clearer structure, contextual guidance, and formatting requirements
      const promptText = `You are a career counseling expert specialized in advising rural Indian students. Your task is to provide 6 practical and achievable career paths based on the student's profile.

## STUDENT PROFILE
- Qualification: ${userData.qualification}
${userData.qualification === "Class 12" ? `- Stream: ${userData.stream}` : ""}
${userData.subjects ? `- Subjects: ${userData.subjects}` : ""}
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

## CONTEXT
- Consider the rural Indian context and realistic opportunities
- Focus on careers that align with the student's qualifications
- Balance aspirational goals with practical accessibility
- Account for financial constraints based on income level
- Consider locally available educational institutions and job markets
- Include both traditional and emerging career options
${userData.higherStudies === "No" ? "- Since the student doesn't want higher studies, focus ONLY on immediate career options that don't require further education" : "- Since the student wants higher studies, focus ONLY on career paths requiring further education"}

## ACCURACY CONSTRAINTS
- Use only REAL career paths that actually exist in India
- All salary figures must reflect ACTUAL market rates in India for 2023-2024
- Entry-level salaries for most roles should be between ₹10,000-₹50,000 per month
- Do NOT inflate salary expectations beyond realistic market rates
- Include only genuine educational requirements that are standard in India
- For skills, list only specific technical or domain skills, not personality traits
- If uncertain about any data point, use conservative estimates rather than exaggerated ones

## OUTPUT REQUIREMENTS
Return a JSON array with EXACTLY 6 objects, each representing a suitable career path with these mandatory fields:
- "title": Clear, specific job/career title
- "description": 2-3 factual sentences describing the career, its nature, and why it suits the student profile
- "requirements": Specific education/qualification needed, including degree names and duration
- "skills": Array of 3-5 specific, tangible skills needed (no generic skills like "communication")
- "salary_range": Text description with realistic Indian salary figures (e.g., "₹15,000 - ₹35,000 per month")
- "salary_min": Numeric minimum monthly salary in rupees without commas (e.g., 15000)
- "salary_max": Numeric maximum monthly salary in rupees without commas (e.g., 35000)
- "path_type": EXACTLY "higher_education" or "immediate" (must be "higher_education" if Higher Studies is "Yes", must be "immediate" if Higher Studies is "No")

## REALISTIC SALARY GUIDELINES
- Entry-level (0-2 years): ₹10,000-₹30,000/month for non-technical, ₹15,000-₹40,000/month for technical roles
- Mid-level (3-5 years): ₹25,000-₹60,000/month for non-technical, ₹35,000-₹80,000/month for technical roles 
- Senior-level (5+ years): ₹40,000-₹100,000/month for non-technical, ₹60,000-₹150,000/month for technical roles
- Salaries in rural areas are typically 30-40% lower than urban areas
- Government jobs typically start at ₹18,000-₹35,000/month based on qualification level
- For higher education careers, report starting salaries after education completion

## CRITICAL RULES
1. Every career MUST match the path_type requirement ("higher_education" or "immediate") based on the Higher Studies preference
2. All numeric values must be pure numbers without text, commas or currency symbols
3. Salary ranges must be realistic for rural India and the career level
4. Skills must be specific and relevant to the career
5. Ensure diversity in the recommended careers rather than variations of the same field
6. Format output as a valid JSON array with no markdown formatting codes
7. DO NOT include any explanatory text before or after the JSON
8. DO NOT include fictional, hypothetical, or non-existent career paths
9. DO NOT exaggerate salary figures or educational requirements

## EXAMPLE OUTPUT FORMAT
[
  {
    "title": "Junior Agricultural Extension Officer",
    "description": "Agricultural extension officers assist farmers with modern farming techniques and government schemes. This role suits students with agriculture interests and requires minimal higher education.",
    "requirements": "Diploma in Agriculture (2 years) or B.Sc Agriculture",
    "skills": ["Crop management", "Soil testing", "Farmer training", "Government scheme knowledge"],
    "salary_range": "₹18,000 - ₹25,000 per month",
    "salary_min": 18000,
    "salary_max": 25000,
    "path_type": "higher_education"
  },
  ... (5 more career objects)
]`;

      const result = await model.generateContent(promptText);
      const response = await result.response;
      const text = await response.text();
      logger.debug(`AI Service: Raw AI response for request ${requestId}: ${text.substring(0, 200)}...`);
      
      let cleanedText = text;
      // More robust JSON extraction
      const jsonPattern = /\[\s*{[\s\S]*}\s*\]/;
      const jsonMatch = cleanedText.match(jsonPattern);
      
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      } else {
        // Fallback to existing cleanup logic
        if (cleanedText.startsWith("```json")) {
          cleanedText = cleanedText.substring(7);
        } else if (cleanedText.startsWith("```")) {
          cleanedText = cleanedText.substring(3);
        }
        if (cleanedText.endsWith("```")) {
          cleanedText = cleanedText.substring(0, cleanedText.length - 3);
        }
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

// Helper function to get career roadmap from Gemini AI
async function getCareerRoadmapFromAI(careerTitle, careerDetails = {}, requestId = Date.now().toString()) {
  const MAX_RETRIES = 3;
  let retryCount = 0;

  logger.info(`AI Service: Processing career roadmap request for ${careerTitle}, request ID ${requestId}`);

  while (retryCount < MAX_RETRIES) {
    try {
      logger.info(`AI Service: Roadmap attempt ${retryCount + 1} for ${careerTitle}, request ${requestId}`);
      const model = await getGeminiModel();

      // Enhanced roadmap prompt with clearer structure and instructions
      const promptText = `You are a career counseling expert specializing in Indian career paths. Generate a detailed, practical roadmap for the career: "${careerTitle}".

## CAREER CONTEXT
${careerDetails.description ? `• About this career: ${careerDetails.description}` : ''}
${careerDetails.requirements ? `• Requirements: ${careerDetails.requirements}` : ''}
${careerDetails.skills ? `• Key skills needed: ${Array.isArray(careerDetails.skills) ? careerDetails.skills.join(', ') : careerDetails.skills}` : ''}
${careerDetails.salary_range ? `• Typical salary range: ${careerDetails.salary_range}` : ''}

## ACCURACY CONSTRAINTS
- ALL information must be factual and verifiable for the Indian job market
- Salary ranges must reflect current Indian market rates (2023-2024)
- Education requirements must align with actual Indian education system offerings
- List only actual companies, institutions, and certification bodies that exist in India
- Mention only real career progression paths that professionals actually follow
- When uncertain about exact figures, use ranges rather than specific numbers
- For growth rates and trends, use conservative estimates based on reliable sources
- Do not fabricate information - focus on quality of factual content rather than quantity

## REALISTIC SALARY GUIDELINES
- Entry-level (0-2 years): ₹10,000-₹30,000/month for non-technical, ₹15,000-₹40,000/month for technical roles
- Mid-level (3-5 years): ₹25,000-₹60,000/month for non-technical, ₹35,000-₹80,000/month for technical roles 
- Senior-level (5+ years): ₹40,000-₹100,000/month for non-technical, ₹60,000-₹150,000/month for technical roles
- Salaries in rural areas are typically 30-40% lower than urban areas
- Government jobs typically have fixed pay scales based on level

## OUTPUT REQUIREMENTS
Return a detailed JSON object with the following structure:
{
  "title": "Career Roadmap for ${careerTitle}",
  "summary": "Concise 2-3 sentence overview focused on practicality and relevance in India",
  
  "timeline": [
    {
      "stage": "Entry Level",
      "duration": "0-2 years",
      "description": "Specific responsibilities and challenges at this stage",
      "key_skills": ["3-5 specific technical or soft skills required"],
      "education": "Specific degrees, certifications, or qualifications needed",
      "typical_roles": ["2-3 specific job titles available at this stage"],
      "salary_range": "Realistic salary range in Indian context (₹X - ₹Y per month)",
      "growth_tips": "3-4 actionable tips for advancing to the next stage"
    },
    {
      "stage": "Mid Level",
      "duration": "2-5 years",
      "description": "Specific responsibilities and expectations",
      "key_skills": ["3-5 advanced skills needed for this level"],
      "education": "Additional certifications or qualifications that help at this stage",
      "typical_roles": ["2-3 specific mid-level positions"],
      "salary_range": "Realistic mid-level salary range in India",
      "growth_tips": "3-4 specific strategies for reaching senior level"
    },
    {
      "stage": "Senior Level",
      "duration": "5+ years",
      "description": "Leadership and advanced responsibilities",
      "key_skills": ["3-5 leadership and specialized skills"],
      "education": "Advanced qualifications or specializations helpful at this level",
      "typical_roles": ["2-3 senior position titles"],
      "salary_range": "Realistic senior-level salary range in India",
      "growth_tips": "Career advancement strategies beyond senior level"
    }
  ],
  
  "learning_resources": [
    {
      "type": "Online Course/Certification/Book/YouTube Channel",
      "name": "Specific resource name (not generic)",
      "provider": "Organization or platform offering this resource",
      "description": "Brief description of content and benefits",
      "level": "Beginner/Intermediate/Advanced",
      "accessibility": "Free/Paid/Subscription (with approximate cost in INR if paid)"
    },
    // Include at least 3 resources of different types, with at least 1 free option
  ],
  
  "industry_outlook": {
    "growth_rate": "Specific growth projection with timeframe",
    "trends": ["3-4 current industry trends affecting this career"],
    "challenges": ["2-3 specific challenges professionals face in India"],
    "opportunities": ["2-3 emerging opportunities in this field"],
    "demand_regions": ["3-4 specific Indian states/cities with highest demand"]
  },
  
  "local_relevance": "Detailed paragraph on this career's prospects in India, including regional opportunities, cultural factors, and government initiatives supporting this field"
}

## DATA ACCURACY RULES
1. DO NOT include fictional companies, institutions, or certification bodies
2. DO NOT mention non-existent job roles or career paths
3. DO NOT exaggerate salary figures or job growth projections
4. DO NOT fabricate statistics - use reasonable estimates based on industry knowledge
5. DO NOT suggest unrealistic career progression timelines
6. DO NOT list generic learning resources - include only specific courses, books, or platforms
7. DO NOT include explanatory text outside the JSON structure

## GUIDELINES
1. Focus on PRACTICAL advice specifically for the Indian context
2. Include locally relevant education paths and Indian institutions where possible
3. Provide realistic salary ranges based on Indian market rates
4. Mention specific Indian companies that hire for these roles
5. Reference Indian certification bodies or standards where applicable
6. Include region-specific opportunities across different Indian states
7. Consider both urban and rural contexts in your recommendations`;

      const result = await model.generateContent(promptText);
      const response = await result.response;
      const text = await response.text();
      
      let cleanedText = text;
      // More robust JSON extraction
      const jsonPattern = /\{[\s\S]*\}/;
      const jsonMatch = cleanedText.match(jsonPattern);
      
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      } else {
        // Fallback to existing cleanup logic
        if (cleanedText.startsWith("```json")) {
          cleanedText = cleanedText.substring(7);
        } else if (cleanedText.startsWith("```")) {
          cleanedText = cleanedText.substring(3);
        }
        if (cleanedText.endsWith("```")) {
          cleanedText = cleanedText.substring(0, cleanedText.length - 3);
        }
      }
      
      cleanedText = cleanedText.trim();

      try {
        const jsonData = JSON.parse(cleanedText);
        
        // Enhanced validation
        const requiredTopLevelFields = ["title", "summary", "timeline", "learning_resources", "industry_outlook"];
        const missingFields = requiredTopLevelFields.filter(field => !jsonData[field]);
        
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        // Ensure we have timeline stages
        if (!Array.isArray(jsonData.timeline) || jsonData.timeline.length === 0) {
          throw new Error("Timeline cannot be empty and must be an array");
        }
        
        // Ensure we have learning resources
        if (!Array.isArray(jsonData.learning_resources) || jsonData.learning_resources.length === 0) {
          throw new Error("Learning resources cannot be empty and must be an array");
        }
        
        logger.info(`AI Service: Successfully generated roadmap for ${careerTitle}, request ${requestId}`);
        return jsonData;
      } catch (parseError) {
        logger.error(`AI Service: Failed to parse roadmap response for ${careerTitle}, request ${requestId}: ${parseError.message}`);
        throw new Error("Failed to parse AI response");
      }

    } catch (error) {
      logger.error(`AI Service: Error in getCareerRoadmapFromAI (attempt ${retryCount + 1}) for ${careerTitle}, request ${requestId}: ${error.message}`);
      if (retryCount < MAX_RETRIES - 1) {
        retryCount++;
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        continue;
      }
      logger.error(`AI Service: All roadmap attempts failed for ${careerTitle}, request ${requestId}`);
      return null;
    }
  }
  return null;
}

module.exports = {
  getCareerRecommendationsFromAI,
  getCareerRoadmapFromAI
}; 