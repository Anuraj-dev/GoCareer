<p align="center">
  <img src="public/images/logo.png" alt="GoCareer logo" width="88" height="88" />
</p>

<h1 align="center">GoCareer</h1>

<p align="center">
  Career guidance for students in rural India, powered by Gemini 2.0 Flash.<br />
  Answer a short assessment and get six career paths with monthly salary ranges. Open a roadmap for any of them.
</p>

<p align="center">
  <a href="#running-it">Run it locally</a>
  ·
  <a href="#configuration">Configuration</a>
  ·
  <a href="#api">API</a>
</p>

GoCareer helps students who have finished Class 10 or Class 12 decide what to do next. The assessment asks for your qualification, age, location, stream, interests and whether you plan to study further. Gemini turns those answers into six career paths, each with requirements, skills and a salary range in rupees.

It is a Node.js and Express server that renders EJS pages. There is no database. Live results need a Gemini API key from Google AI Studio. Without one, the app falls back to the career lists bundled in `data/`.

## What you get

- **Six careers, sorted by top salary.** The prompt asks Gemini for exactly six paths, each with a title, description, requirements, skills and numeric `salary_min` and `salary_max` values in rupees. The server checks every field, makes up to three attempts when a reply is malformed or empty, and sorts the results by `salary_max`.
- **A bundled fallback.** If the Gemini key is missing, the call fails, or all three attempts fail, the assessment uses `data/class10Careers.json` or `data/class12Careers.json` for your stream and filters them by your higher studies answer. The Class 12 lists are almost all higher education paths. Only the Fine Arts list has a path that does not need higher studies, and it has just one. A Class 12 student who answers No can get an empty results page.
- **A roadmap for each career.** Opening a career calls `POST /api/career-roadmap`. The prompt asks Gemini for three stages, from entry level to senior, each with duration, skills, education, typical roles, a salary range and growth tips. The roadmap also lists learning resources, an industry outlook and a paragraph on local relevance.
- **Search without Gemini.** `/search?q=` scores every career in the bundled lists by where the words appear in its title, description, requirements and skills. It drops weak matches and shows each title once. Search never calls Gemini, so it works without a key.
- **Limits on the API.** Every `/api` route shares a limit of 100 requests per 15 minutes per IP. Recommendation requests are validated first, so a bad age or missing location gets a 400 before Gemini is called. Successful recommendations are cached in memory for an hour, keyed by the request body.

## Running it

You need Node.js 20.18.0. `package.json` pins that version in `engines`, and other versions print an engine warning on install. The app also started on Node.js 26.13.1 in testing. A Gemini API key is optional, as described above.

### Install

```sh
git clone https://github.com/Anuraj-dev/GoCareer.git
cd GoCareer
npm ci
```

### Start

```sh
npm start
```

Open `http://localhost:8000`. Set `PORT` in `.env` to use another port.

To restart the server on every file change while you edit, run `npx nodemon app.js`. nodemon is a dev dependency, so `npm ci` already installs it.

## Configuration

Put these variables in a `.env` file in the project root. Git ignores that file.

| Variable | Default | What it does |
| --- | --- | --- |
| `GOOGLE_API_KEY` | none | Gemini API key for recommendations and roadmaps. Get one from [Google AI Studio](https://aistudio.google.com/). |
| `SECRET` | `go-career-default-secret-key` | Session secret. Set your own long, random value. |
| `PORT` | `8000` | HTTP port. If it is taken, the server tries the next port, up to five attempts in total. |
| `NODE_ENV` | `development` | In development, logs also print to the console, and error handlers receive the error details. Set `production` to turn both off. |

Session data lives in memory, so a restart clears any assessment in progress. Logs go to `logs/combined.log` and `logs/error.log`, which Git also ignores.

## API

| Method | Path | What it does |
| --- | --- | --- |
| `GET` | `/api/health` | Returns `status` and a timestamp. |
| `POST` | `/api/recommendations` | Returns career paths for an assessment. Requires `qualification`, `age` from 14 to 25, and `location`. |
| `POST` | `/api/career-roadmap` | Returns a roadmap for `careerTitle`. `careerDetails` is optional and adds context. |

All three routes share the rate limit from the list above. Over the limit, the API returns `429`.
