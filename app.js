// Load environment variables
require("dotenv").config();

// Import required modules
const express = require("express");
// const { GoogleGenerativeAI } = require("@google/generative-ai"); // Removed, now in aiService
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const session = require("express-session");
const logger = require("./middleware/logger");
const { getCareerRecommendationsFromAI } = require("./services/aiService"); // Added

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
    requestId: Date.now().toString(), // Consider using a request ID if available
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

// Initialize Gemini API - REMOVED
// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Configure Gemini 2.0 Flash model - REMOVED
// async function getGeminiModel() { ... }

// Helper function to get career recommendations from Gemini AI - REMOVED
// async function getCareerRecommendationsFromAI(userData) { ... } // Logic moved to aiService.js

// Helper function to get default career recommendations
function getDefaultCareerRecommendations(userData) {
  let defaultCareers = [];

  // Now data has been standardized in app.post('/test')
  // qualification will be "Class 10" or "Class 12"
  // stream will be "Science", "Commerce", or "Arts"
  // subjects will include "PCM" or "PCB" for Science stream

  if (userData.qualification === "Class 10") {
    // Ensure stream exists for Class 10 data structure or handle gracefully
    defaultCareers = (class10Careers && class10Careers[userData.stream]) || [];
    
    // If user selected after10th=diploma or after10th=iti, try to filter to more relevant careers
    if (userData.after10th === "diploma" || userData.after10th === "iti") {
      // If there are specific diploma/ITI categories in class10Careers, use those
      const after10thCareers = class10Careers[userData.after10th];
      if (after10thCareers && after10thCareers.length > 0) {
        defaultCareers = after10thCareers;
      }
      // Otherwise, default careers will remain as they were
    }
  } else if (userData.qualification === "Class 12") {
    const streamData = class12Careers && class12Careers[userData.stream];
    if (!streamData) return [];

    if (userData.stream === "Science") {
      // Now subjects might contain "PCM" or "PCB" at the start,
      // so we check if it includes either of these substrings
      defaultCareers =
        userData.subjects && userData.subjects.includes("PCB")
          ? streamData.PCB || []
          : streamData.PCM || [];
    } else if (userData.stream === "Commerce") {
      defaultCareers =
        userData.subjects && userData.subjects.includes("Mathematics")
          ? streamData["With Mathematics"] || []
          : streamData["Without Mathematics"] || [];
    } else if (userData.stream === "Arts") {
      defaultCareers =
        userData.subjects && userData.subjects.includes("Fine Arts")
          ? streamData["Fine Arts"] || []
          : streamData["Humanities"] || [];
    } else {
        defaultCareers = []; // Handle unknown stream for Class 12
    }
  } else {
      defaultCareers = []; // Handle unknown qualification
  }

  // Filter based on higher studies preference
  if (userData.higherStudies === "Yes") {
    defaultCareers = defaultCareers.filter(
      (career) => career.path_type === "higher_education"
    );
  } else if (userData.higherStudies === "No") { // Explicitly check for "No"
    defaultCareers = defaultCareers.filter(
      (career) => career.path_type === "immediate"
    );
  }

  // Consider interests if available
  if (userData.interests && userData.interests.length > 0) {
    // Optional: Try to prioritize careers that match user interests
    // This is a simple implementation - you might want to enhance this logic
    const interestsLower = userData.interests.map(i => i.toLowerCase());
    
    defaultCareers.sort((a, b) => {
      // Check if career title or description contains any interest keywords
      const aMatches = interestsLower.some(interest => 
        (a.title && a.title.toLowerCase().includes(interest)) || 
        (a.description && a.description.toLowerCase().includes(interest))
      );
      
      const bMatches = interestsLower.some(interest => 
        (b.title && b.title.toLowerCase().includes(interest)) || 
        (b.description && b.description.toLowerCase().includes(interest))
      );
      
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      
      // If both or neither match interests, sort by salary as before
      return (b.salary_max || 0) - (a.salary_max || 0);
    });
  } else {
    // Sort by salary (highest first) if no interests to consider
    defaultCareers.sort((a, b) => {
      return (b.salary_max || 0) - (a.salary_max || 0);
    });
  }

  return defaultCareers.slice(0, 6);
}

// Routes
// Home page
app.get("/", (req, res) => {
  res.render("home", {
    logoPath: "/logo.png", 
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
  const query = req.query.q ? req.query.q.toLowerCase() : '';
  
  if (!query) {
    return res.render("search-results", { 
      query: '', 
      results: [],
      resultsCount: 0
    });
  }

  // Collect career data from both Class 10 and Class 12 career files
  let allCareers = [];
  
  // Collect from Class 10 careers
  if (class10Careers) {
    Object.values(class10Careers).forEach(careers => {
      if (Array.isArray(careers)) {
        allCareers = allCareers.concat(careers);
      }
    });
  }
  
  // Collect from Class 12 careers
  if (class12Careers) {
    Object.values(class12Careers).forEach(streamData => {
      if (typeof streamData === 'object' && streamData !== null) {
        Object.values(streamData).forEach(careers => {
          if (Array.isArray(careers)) {
            allCareers = allCareers.concat(careers);
          }
        });
      }
    });
  }
  
  // Filter careers by search query
  const results = allCareers.filter(career => {
    // Search in various career fields
    return (
      (career.title && career.title.toLowerCase().includes(query)) ||
      (career.description && career.description.toLowerCase().includes(query)) ||
      (career.requirements && career.requirements.toLowerCase().includes(query)) ||
      (career.skills && 
        (Array.isArray(career.skills) 
          ? career.skills.some(skill => skill.toLowerCase().includes(query))
          : career.skills.toLowerCase().includes(query))
      )
    );
  });
  
  // Remove duplicates (based on title)
  const uniqueResults = Array.from(
    new Map(results.map(item => [item.title, item])).values()
  );
  
  res.render("search-results", { 
    query,
    results: uniqueResults,
    resultsCount: uniqueResults.length
  });
});

// Assessment page
app.get("/assessment", (req, res) => {
  res.render("test");
});

// API routes
app.use("/api", apiRoutes);

// Handle assessment form submission
app.post("/test", async (req, res) => {
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
    logger.info(`[App.js /test] Attempting AI recommendations for session: ${requestId}`, { userData });
    
    // Update the AI service call to include interests if they exist
    const aiRecommendations = await getCareerRecommendationsFromAI(userData, requestId); 

    if (aiRecommendations && aiRecommendations.length > 0) {
      logger.info(`[App.js /test] AI recommendations successful for session: ${requestId}`);
      req.session.careerPaths = aiRecommendations;
      req.session.recommendationSource = "AI Recommendations";
    } else {
      logger.warn(`[App.js /test] AI recommendations failed or returned empty for session: ${requestId}. Falling back to default.`);
      const defaultRecommendations = getDefaultCareerRecommendations(userData);
      if (defaultRecommendations && defaultRecommendations.length > 0) {
        logger.info(`[App.js /test] Default recommendations used for session: ${requestId}`);
        req.session.careerPaths = defaultRecommendations;
        req.session.recommendationSource =
          "Default Recommendations (AI Fallback)";
      } else {
        logger.warn(`[App.js /test] No default recommendations available for session: ${requestId}`);
        req.session.careerPaths = [];
        req.session.recommendationSource = "No Recommendations Available";
      }
    }
    res.redirect("/career-paths");
  } catch (error) {
    logger.error(`[App.js /test] Error processing assessment for session ${requestId}: ${error.message}`, { stack: error.stack });
    res.status(500).render("error", {
        message: "We encountered an issue while processing your assessment.",
        error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

app.get("/career-paths", (req, res) => {
  if (!req.session.careerPaths) {
    // If redirected from /test due to no data, this prevents direct access without data
    logger.warn("[App.js /career-paths] No career paths in session. Redirecting to /assessment.");
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
