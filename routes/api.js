const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Configure Gemini 2.0 Flash model
async function getGeminiModel() {
  return genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
  });
}

// API route for career recommendations
router.post("/recommendations", async (req, res) => {
  const userData = req.body;

  try {
    const model = await getGeminiModel();

    const promptText = `You are a career counseling expert. Provide 6 suitable career paths for a student in rural India.
Student Profile:
- Qualification: ${userData.qualification}
${userData.qualification === "Class 12" ? `- Stream: ${userData.stream}` : ""}
${
  userData.qualification === "Class 12" && userData.subjects
    ? `- Subjects: ${userData.subjects}`
    : ""
}
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
      res.json({ success: true, careers: jsonData });
    } catch (jsonError) {
      console.error("Failed to parse AI response as JSON:", jsonError);
      res
        .status(500)
        .json({ success: false, error: "Failed to parse AI response" });
    }
  } catch (error) {
    console.error("AI recommendation error:", error);
    res.status(500).json({ success: false, error: "AI service error" });
  }
});

// Simple health check endpoint
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = router;
