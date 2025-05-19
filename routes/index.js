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

module.exports = router;
