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
const PORT = config.server.port;
const server = app
  .listen(PORT, () => {
    console.log(`Go Career Server running on port ${PORT}`);
    console.log(
      `Open http://localhost:${PORT} in your browser to access Go Career`
    );
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use.`);
      console.log(`Attempting to use alternative port ${PORT + 1}...`);
      // Try the next port
      const newPort = PORT + 1;
      server.close();
      app.listen(newPort, () => {
        console.log(`Go Career Server running on alternative port ${newPort}`);
        console.log(
          `Open http://localhost:${newPort} in your browser to access Go Career`
        );
      });
    } else {
      console.error("Error starting server:", err);
    }
  });
