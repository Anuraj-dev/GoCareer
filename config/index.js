const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config();

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || "development",
  },

  // Session configuration
  session: {
    secret: process.env.SECRET || "go-career-default-secret-key",
    cookie: {
      maxAge: 3600000, // 1 hour
      sameSite: "lax",
    },
    resave: false,
    saveUninitialized: true,
  },

  // API configuration
  api: {
    googleApiKey: process.env.GOOGLE_API_KEY,
    geminiModel: "gemini-2.0-flash",
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
  },

  // Paths configuration
  paths: {
    views: path.join(__dirname, "..", "views"),
    public: path.join(__dirname, "..", "public"),
    data: path.join(__dirname, "..", "data"),
    logs: path.join(__dirname, "..", "logs"),
  },
};
