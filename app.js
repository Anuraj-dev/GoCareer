// Load environment variables
require("dotenv").config();

// Import required modules
const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const session = require("express-session");

// Initialize Express app
const app = express();

// Set up middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

// Import API routes
const apiRoutes = require("./routes/api");

// Set up session
app.use(
  session({
    secret: "gocareer-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 }, // 1 hour
  })
);

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

      const validatedData = jsonData.filter((career) => {
        const hasRequiredFields =
          career.title &&
          career.description &&
          career.requirements &&
          Array.isArray(career.skills) &&
          career.salary_range &&
          typeof career.salary_min === "number" &&
          typeof career.salary_max === "number" &&
          career.path_type;

        if (!hasRequiredFields) {
          return false;
        }

        if (
          userData.qualification === "Class 10" &&
          userData.higherStudies === "No"
        ) {
          const reqTextLower = career.requirements.toLowerCase();
          if (
            reqTextLower.includes("class 12") ||
            reqTextLower.includes("12th") ||
            reqTextLower.includes("higher") ||
            reqTextLower.includes("bachelor") ||
            reqTextLower.includes("degree") ||
            reqTextLower.includes("diploma")
          ) {
            return false;
          }
        }

        if (userData.qualification === "Class 12") {
          const reqTextLower = career.requirements.toLowerCase();
          const isOnlyClass10 =
            reqTextLower.includes("class 10") &&
            !reqTextLower.includes("class 12") &&
            !reqTextLower.includes("12th") &&
            !reqTextLower.includes("higher") &&
            !reqTextLower.includes("bachelor") &&
            !reqTextLower.includes("degree") &&
            !reqTextLower.includes("diploma") &&
            !reqTextLower.includes("online course");

          if (isOnlyClass10) {
            return false;
          }

          if (userData.higherStudies === "Yes") {
            if (!(career.salary_min > 30000)) {
              return false;
            }

            const meetsEducationCriteria =
              reqTextLower.includes("bachelor") ||
              reqTextLower.includes("degree") ||
              reqTextLower.includes("online course") ||
              reqTextLower.includes("certification") ||
              reqTextLower.includes("diploma");

            if (!meetsEducationCriteria) {
              return false;
            }
          }
        }
        return true;
      });

      if (validatedData.length === 0) {
        console.error("No valid career paths in AI response");
        return null;
      }

      validatedData.sort((a, b) => {
        const aValue = a.salary_max || a.salary_min || 0;
        const bValue = b.salary_max || b.salary_min || 0;
        return bValue - aValue;
      });

      return validatedData.slice(0, 6);
    } catch (jsonError) {
      console.error("Failed to parse AI response as JSON:", jsonError);
      console.error("Raw AI response:", text);
      return null;
    }
  } catch (error) {
    console.error("AI recommendation error:", error);
    return null;
  }
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
  res.render("home");
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
    // Fallback to default recommendations if any error occurs
    const defaultRecommendations = getDefaultCareerRecommendations(userData);
    if (defaultRecommendations && defaultRecommendations.length > 0) {
      req.session.careerPaths = defaultRecommendations;
      req.session.recommendationSource =
        "Default Recommendations (Error Fallback)";
    } else {
      req.session.careerPaths = [];
      req.session.recommendationSource = "Error - No Recommendations Available";
    }
    res.redirect("/career-paths");
  }
});

// Career paths results route
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
