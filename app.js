// Import required modules
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");

// Import configuration
const config = require("./config");

// Import middleware
const logger = require("./middleware/logger");

// Import routes
const routes = require("./routes");

// Initialize Express app
const app = express();

// Set up middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(config.paths.public));

// Make logger available in request context
app.locals.logger = logger;

// Set up session
app.use(session(config.session));

// Set view engine to EJS
app.set("view engine", "ejs");
app.set("views", config.paths.views);

// Use routes
app.use(routes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", { error: err.message, stack: err.stack });
  res.status(500).render("error", {
    message: "Internal server error",
    error: config.server.env === "development" ? err : {},
  });
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).render("error", {
    message: "The page you requested could not be found.",
    error: { status: 404 },
  });
});

// Start the server with port fallback logic
const PORT = process.env.PORT || 8000;
let currentPort = PORT;
const MAX_PORT_ATTEMPTS = 5;
let attempts = 0;

function startServer(port) {
  attempts++;
  return app.listen(port, () => {
    console.log(`Go Career Server running on port ${port}`);
    console.log(`Open http://localhost:${port} in your browser to access Go Career`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempts < MAX_PORT_ATTEMPTS) {
      console.error(`Port ${port} is already in use.`);
      const newPort = parseInt(port) + 1;
      console.log(`Attempting to use alternative port ${newPort}...`);
      // Try the next port
      return startServer(newPort);
    } else if (attempts >= MAX_PORT_ATTEMPTS) {
      console.error(`Failed to find an available port after ${MAX_PORT_ATTEMPTS} attempts.`);
      console.error('Please free up one of the ports or modify the PORT environment variable.');
      process.exit(1);
    } else {
      console.error('Error starting server:', err);
      process.exit(1);
    }
  });
}

startServer(currentPort);
