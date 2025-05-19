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
- **AI:** Google Gemini 2.0 Flash AI (`@google/generative-ai` v0.1.2)
- **Templating Engine:** EJS v3.1.10 (Embedded JavaScript templates)
- **Database:** (No dedicated database) Uses JSON files for default career data.
- **Middleware:**
    - `body-parser` v2.2.0: For parsing request bodies.
    - `express-session` v1.18.1: For session management.
    - `dotenv` v16.3.1: For environment variable management.
    - `winston` v3.17.0: For logging.
    - `express-validator` v7.2.1: For input validation.
    - `express-rate-limit` v7.5.0: For API rate limiting.
    - `node-cache` v5.1.2: For caching API responses.
- **Development:** `nodemon` v3.0.1 for automatic server restarts.

## Setup Instructions

### Prerequisites

- Node.js (v14.x or later recommended)
- npm (Node Package Manager)

### Installation Steps

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/yourusername/go-career.git
    cd go-career
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Set Up Environment Variables:**
    Create a `.env` file in the root of the project with the following variables:

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

    > **Note:** You'll need to obtain a Gemini API key from the [Google AI Studio](https://makersuite.google.com/) to use the AI features.

## Running the Application

### Development Mode:

For development with hot-reloading:

```bash
npx nodemon app.js
```

Or add a dev script to package.json:
```json
"scripts": {
  "start": "node app.js",
  "dev": "nodemon app.js"
}
```

Then run:
```bash
npm run dev
```

### Production Mode:

```bash
npm start
```

Access the application at `http://localhost:3000` (or your configured PORT).

## Project Structure

```
go-career/
├── app.js                # Main application file
├── config/               # Configuration files
├── controllers/          # Request handlers
├── data/                 # Default career data (JSON files)
├── logs/                 # Log files
├── middleware/           # Custom Express middleware
├── models/               # Data models
├── public/               # Static assets (CSS, JS, images)
├── routes/               # API and route definitions
├── services/             # Business logic services
├── utils/                # Utility functions
├── views/                # EJS templates for web pages
├── .env                  # Environment variables (create manually)
├── .gitignore            # Git ignore file
├── package.json          # Project metadata and dependencies
└── README.md             # Project documentation
```

## API Documentation

The application provides the following API endpoints:

- **GET /api/health**: Health check endpoint
- **POST /api/recommendations**: Get career recommendations based on user data

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Gemini AI for powering the career recommendations
- All contributors who have helped shape this project 