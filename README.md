# GoCareer - Career Discovery App

GoCareer is a web application designed to help rural students discover suitable career paths using Google's Gemini AI. It provides personalized career recommendations based on user qualifications, interests, and other relevant factors.

## Key Features

- **AI-Powered Career Recommendations:** Utilizes Google's Gemini 2.0 Flash AI to generate personalized career suggestions.
- **User Assessment:** Collects user information (qualification, stream, subjects, age, location, higher studies preference) through an intuitive form.
- **Fallback System:** Provides default career recommendations from a predefined dataset if AI recommendations are unavailable.
- **Dynamic Content:** Uses EJS templating for server-side rendering of dynamic web pages.
- **Session Management:** Maintains user session to store assessment data and results.
- **API Endpoints:** Includes API endpoints for career recommendations and health checks, with rate limiting and caching.
- **Structured Logging:** Implements logging for errors and application events.
- **Input Validation:** Validates user input for API requests.

## Technology Stack

- **Backend:** Node.js, Express.js
- **AI:** Google Gemini 2.0 Flash AI (`@google/generative-ai`)
- **Templating Engine:** EJS (Embedded JavaScript templates)
- **Database:** (No dedicated database) Uses JSON files for default career data.
- **Middleware:**
    - `body-parser`: For parsing request bodies.
    - `express-session`: For session management.
    - `dotenv`: For environment variable management.
    - `winston`: For logging.
    - `express-validator`: For input validation.
    - `express-rate-limit`: For API rate limiting.
    - `node-cache`: For caching API responses.
- **Development:** `nodemon` for automatic server restarts.

## Setup Instructions

### Prerequisites

- Node.js (v14.x or later recommended)
- npm (Node Package Manager)

### Steps

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd go-career
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Set Up Environment Variables:**
    Create a `.env` file in the root of the project and add the following variables:

    ```env
    # Google Generative AI API Key
    GOOGLE_API_KEY=your_gemini_api_key_here

    # Session Secret (a long, random string)
    SECRET=your_strong_session_secret_here

    # Port for the application (optional, defaults to 3000)
    PORT=3000

    # Node Environment (development or production)
    NODE_ENV=development
    ```
    - Replace `your_gemini_api_key_here` with your actual Google Gemini API key.
    - Replace `your_strong_session_secret_here` with a secure, random string for session encryption.

## Running the Application

- **Development Mode (with nodemon):**
  If you have `nodemon` installed globally, or if it's correctly configured in `package.json` (which it is as a dev dependency):
  ```bash
  npm run start # (Assuming the "start" script in package.json uses nodemon, or you can run nodemon app.js directly if preferred)
  # The package.json currently has "start": "node app.js". For development with nodemon, you might add a script like "dev": "nodemon app.js"
  # or run directly: npx nodemon app.js
  ```
  The current `start` script (`node app.js`) is more suited for production. To run with `nodemon` during development, you can use:
  ```bash
  npx nodemon app.js
  ```

- **Production Mode:**
  ```bash
  npm start
  ```

Once the server is running, you can access the application at `http://localhost:PORT` (e.g., `http://localhost:3000` if `PORT` is 3000).

## Project Structure

```
go-career/
├── app.js                # Main application file (Express setup, routes, core logic)
├── data/                 # Default career data (JSON files)
├── logs/                 # Log files (created by Winston)
├── middleware/           # Custom Express middleware (cache, logger, rateLimit, validation)
├── node_modules/         # Project dependencies (installed via npm)
├── public/               # Static assets (CSS, client-side JS, images)
├── routes/               # Route handlers (e.g., api.js)
├── services/             # Business logic services (e.g., aiService.js)
├── views/                # EJS templates for web pages (e.g., home.ejs, test.ejs, error.ejs)
├── .env                  # Environment variables (needs to be created manually)
├── .gitignore            # Specifies intentionally untracked files that Git should ignore
├── package-lock.json     # Records exact versions of dependencies
├── package.json          # Project metadata and dependencies
└── README.md             # This file
```

## Contributing

(Optional: Add guidelines for contributing to the project if applicable.)

## License

(Optional: Specify the license for your project, e.g., MIT License.) 