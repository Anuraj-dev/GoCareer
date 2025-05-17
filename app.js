// Load environment variables
require("dotenv").config();

// Import required modules
const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const session = require("express-session");
const logger = require("./middleware/logger");

// Initialize Express app
const app = express();

// Set up middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

// Import API routes
const apiRoutes = require("./routes/api");

const secret = process.env.SECRET;

// Set up session
app.use(
  session({
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 3600000, // 1 hour
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: "Internal server error",
    requestId: Date.now().toString(),
  });
});

// Set view engine to EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Load default career data
const class10Careers = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data", "class10Careers.json"), "utf8")
);
const class12Careers = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data", "class12Careers.json"), "utf8")
);

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Configure Gemini 2.0 Flash model
async function getGeminiModel() {
  return genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
  });
}

// Helper function to get career recommendations from Gemini AI
async function getCareerRecommendationsFromAI(userData) {
  const MAX_RETRIES = 3;
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      console.log(`Attempt ${retryCount + 1} to get AI recommendations...`);
      const model = await getGeminiModel();

      // Refine the prompt to be more explicit about path_type
      const promptText = `You are a career counseling expert. Provide 6 suitable career paths for a student in rural India.
Student Profile:
- Qualification: ${userData.qualification}
${userData.qualification === "Class 12" ? `- Stream: ${userData.stream}` : ""}
${
  userData.qualification === "Class 12" && userData.subjects
    ? `- Subjects: ${userData.subjects}`
    : ""
}
- Higher Studies: ${userData.higherStudies || "No"}
- Age: ${userData.age}
- Location: ${userData.location}

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
If Higher Studies is "No", ALL careers should have path_type "immediate".`;

      const result = await model.generateContent(promptText);
      const response = await result.response;
      const text = await response.text();

      console.log("AI response received. Parsing response...");

      try {
        let cleanedText = text;
        if (cleanedText.startsWith("```json")) {
          cleanedText = cleanedText.substring(7);
        }
        if (cleanedText.endsWith("```")) {
          cleanedText = cleanedText.substring(0, cleanedText.length - 3);
        }
        cleanedText = cleanedText.trim();

        // Log the cleaned text for debugging
        console.log("Cleaned response:", cleanedText.substring(0, 100) + "...");

        const jsonData = JSON.parse(cleanedText);

        // Fix path_type if needed - ensure it matches user preference
        jsonData.forEach((career) => {
          // Ensure path_type matches user preference
          if (userData.higherStudies === "Yes") {
            career.path_type = "higher_education";
          } else {
            career.path_type = "immediate";
          }

          // Ensure salary values are numbers
          if (typeof career.salary_min !== "number") {
            career.salary_min = parseInt(career.salary_min) || 0;
          }
          if (typeof career.salary_max !== "number") {
            career.salary_max = parseInt(career.salary_max) || 0;
          }

          // Ensure skills is an array
          if (!Array.isArray(career.skills)) {
            career.skills = career.skills ? [career.skills] : [];
          }
        });

        const validatedData = jsonData.filter((career) => {
          // Simplified validation - check only critical fields
          const hasRequiredFields =
            career.title && career.description && career.path_type;

          if (!hasRequiredFields) {
            console.log(
              `Invalid career data found: ${JSON.stringify(career).substring(
                0,
                100
              )}`
            );
            return false;
          }

          // Keep other validation logic as needed
          return true;
        });

        if (validatedData.length === 0) {
          console.error("No valid career paths in AI response");
          if (retryCount < MAX_RETRIES - 1) {
            retryCount++;
            continue;
          }
          return null;
        }

        validatedData.sort((a, b) => {
          const aValue = a.salary_max || a.salary_min || 0;
          const bValue = b.salary_max || b.salary_min || 0;
          return bValue - aValue;
        });

        // Always return at least what we got, even if less than 6
        return validatedData.slice(0, 6);
      } catch (jsonError) {
        console.error("Failed to parse AI response as JSON:", jsonError);
        console.error("Raw AI response:", text);
        if (retryCount < MAX_RETRIES - 1) {
          retryCount++;
          continue;
        }
        return null;
      }
    } catch (error) {
      console.error(
        `AI recommendation error (attempt ${retryCount + 1}):`,
        error
      );
      if (retryCount < MAX_RETRIES - 1) {
        retryCount++;
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, retryCount))
        );
        continue;
      }
      return null;
    }
  }

  console.error("All AI recommendation attempts failed");
  return null;
}

// Helper function to get default career recommendations
function getDefaultCareerRecommendations(userData) {
  let defaultCareers = [];

  if (userData.qualification === "Class 10") {
    defaultCareers = class10Careers[userData.stream] || [];
  } else if (userData.qualification === "Class 12") {
    const streamData = class12Careers[userData.stream];
    if (!streamData) return [];

    if (userData.stream === "Science") {
      defaultCareers =
        userData.subjects && userData.subjects.includes("PCB")
          ? streamData.PCB
          : streamData.PCM;
    } else if (userData.stream === "Commerce") {
      defaultCareers =
        userData.subjects && userData.subjects.includes("Mathematics")
          ? streamData["With Mathematics"]
          : streamData["Without Mathematics"];
    } else if (userData.stream === "Arts") {
      defaultCareers =
        userData.subjects && userData.subjects.includes("Fine Arts")
          ? streamData["Fine Arts"]
          : streamData["Humanities"];
    }
  }

  // Filter based on higher studies preference
  if (userData.higherStudies === "Yes") {
    defaultCareers = defaultCareers.filter(
      (career) => career.path_type === "higher_education"
    );
  } else if (userData.higherStudies === "No") {
    defaultCareers = defaultCareers.filter(
      (career) => career.path_type === "immediate"
    );
  }

  // Sort by salary (highest first)
  defaultCareers.sort((a, b) => {
    return (b.salary_max || 0) - (a.salary_max || 0);
  });

  return defaultCareers.slice(0, 6);
}

// Routes
// Home page
app.get("/", (req, res) => {
  res.render("home", {
    logoPath: "/logo.png", // Adding logo path for the EJS template
  });
});

// About Us page
app.get("/about", (req, res) => {
  res.render("about");
});

// Explore page
app.get("/explore", (req, res) => {
  res.render("explore");
});

// Insights page
app.get("/insights", (req, res) => {
  res.render("insights");
});

// Help page
app.get("/help", (req, res) => {
  res.render("help");
});

// Search functionality
app.get("/search", (req, res) => {
  const query = req.query.q;
  // Implement search functionality here
  res.render("search-results", { query });
});

// Assessment page
app.get("/assessment", (req, res) => {
  res.render("test");
});

// API routes
app.use("/api", apiRoutes);

// Handle assessment form submission
app.post("/test", async (req, res) => {
  const userData = {
    qualification: req.body.qualification,
    stream: req.body.stream,
    subjects: req.body.subjects,
    age: req.body.age,
    location: req.body.location,
    higherStudies: req.body.higherStudies,
    incomeLevel: req.body.incomeLevel,
  };

  req.session.userData = userData;

  try {
    // First try to get AI recommendations
    const aiRecommendations = await getCareerRecommendationsFromAI(userData);
    if (aiRecommendations && aiRecommendations.length > 0) {
      req.session.careerPaths = aiRecommendations;
      req.session.recommendationSource = "AI Recommendations";
    } else {
      // Fallback to default recommendations if AI fails
      const defaultRecommendations = getDefaultCareerRecommendations(userData);
      if (defaultRecommendations && defaultRecommendations.length > 0) {
        req.session.careerPaths = defaultRecommendations;
        req.session.recommendationSource =
          "Default Recommendations (AI Fallback)";
      } else {
        req.session.careerPaths = [];
        req.session.recommendationSource = "No Recommendations Available";
      }
    }
    res.redirect("/career-paths");
  } catch (error) {
    console.error("Error processing test:", error);
app.get("/career-paths", (req, res) => {
  if (!req.session.careerPaths) {
    return res.redirect("/assessment");
  }

  res.render("career-paths", {
    careerPaths: req.session.careerPaths,
    userData: req.session.userData,
    recommendationSource: req.session.recommendationSource,
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Go Career Server running on port ${PORT}`);
  console.log(
    `Open http://localhost:${PORT} in your browser to access Go Career`
  );
});
