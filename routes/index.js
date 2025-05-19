const express = require("express");
const router = express.Router();

// Import route modules
const apiRoutes = require("./api");
const assessmentRoutes = require("./assessment");
const pageRoutes = require("./pages");
const searchRoutes = require("./search");

// Use route modules
router.use("/api", apiRoutes);
router.use("/assessment", assessmentRoutes);
router.use("/search", searchRoutes);
router.use("/", pageRoutes);

// Special case for the legacy /test endpoint which should map to assessmentRoutes
router.post("/test", (req, res, next) => {
  // Redirect to the assessment submit route
  res.redirect(307, "/assessment/submit");
});

// Special case for /career-paths to maintain compatibility
router.get("/career-paths", (req, res, next) => {
  // Redirect to the assessment career-paths route
  res.redirect("/assessment/career-paths");
});

// Career roadmap route
router.get("/career-roadmap/:title", (req, res) => {
  const careerTitle = req.params.title;

  try {
    // Check if we have a career with this title in the session
    let careerDetails = null;
    if (req.session.careerPaths) {
      careerDetails = req.session.careerPaths.find(
        (c) =>
          c.title.toLowerCase() ===
          decodeURIComponent(careerTitle).toLowerCase()
      );
    }

    if (!careerDetails) {
      req.app.locals.logger.warn(
        `[Routes] Career title ${careerTitle} not found in session data`
      );
      // Still proceed to the page, will load data via API
    }

    res.render("career-roadmap", {
      careerTitle: decodeURIComponent(careerTitle),
      careerDetails: careerDetails || {},
    });
  } catch (error) {
    req.app.locals.logger.error(
      `[Routes] Error rendering career roadmap for title ${careerTitle}: ${error.message}`
    );
    res.render("error", {
      message: "Error loading career roadmap",
      error: {
        status: 500,
        details:
          req.app.get("env") === "development"
            ? error.message
            : "Internal server error",
      },
    });
  }
});

module.exports = router;
