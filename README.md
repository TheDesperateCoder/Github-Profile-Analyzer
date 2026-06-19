# GitHub Profile Analyzer

A backend service that fetches a GitHub user's public profile via the GitHub REST API, computes useful insights from it, and persists those insights in MySQL — with endpoints to list and retrieve the analyzed data.

## Tech Stack

- **Node.js** + **Express.js** — HTTP API
- **MySQL** (via `mysql2/promise`) — storage
- **GitHub REST API** — data source (`/users/:username`, `/users/:username/repos`)
- **axios** — HTTP client for GitHub calls
- **helmet**, **cors**, **express-rate-limit**, **morgan** — security/hygiene middleware

## Features

### Required
1. Fetch a public GitHub profile by username.
2. Compute and store useful insights (see below).
3. Persist results in MySQL (insert new profile or update an existing one).
4. `GET /api/profiles` — list every analyzed profile.
5. `GET /api/profiles/:username` — fetch a single analyzed profile.

### Extras added on top of the requirements
- **Richer insights**, not just repo/follower counts (see table below) — total stars/forks across all repos, most-used language, a full language breakdown, the single most-starred repo, account age in days, and a follower/following ratio.
- **Smart caching** — re-analyzing a username within `CACHE_TTL_MINUTES` (default 60) returns the stored row instead of re-hitting GitHub, to conserve GitHub's rate limit. Pass `?refresh=true` to force a fresh pull.
- **Pagination & sorting** on the list endpoint (`limit`, `offset`, `sortBy`, `order`).
- **DELETE endpoint** to remove a stored profile.
- **Rate limiting** on our own API (independent of GitHub's), via `express-rate-limit`.
- **Optional GitHub token support** — without one you get GitHub's unauthenticated limit of 60 requests/hour; with one (no scopes needed for public data) you get 5,000/hour.
- **One-command DB setup** (`npm run db:init`) that creates the database and table from `db/schema.sql`.
- Centralized error handling that distinguishes GitHub errors (404 user not found, 429 rate-limited) from internal/database errors.

## Insights Computed

| Field | Description |
|---|---|
| `public_repos`, `public_gists` | Straight from GitHub |
| `followers`, `following` | Straight from GitHub |
| `total_stars` | Sum of `stargazers_count` across all public repos |
| `total_forks` | Sum of `forks_count` across all public repos |
| `most_used_language` | Language appearing in the most repos |
| `language_breakdown` | JSON map of language → repo count |
| `top_starred_repo`, `top_starred_repo_stars` | The user's single most-starred repo |
| `account_age_days` | Days since the GitHub account was created |
| `follower_following_ratio` | `followers / following` (useful "influence" signal) |
| `last_analyzed_at` | Timestamp of the most recent analysis (drives the cache) |

## Project Structure

```
github-profile-analyzer/
├── db/
│   └── schema.sql            # MySQL table definition
├── scripts/
│   └── initDb.js             # Runs schema.sql against your MySQL server
├── src/
│   ├── config/db.js          # MySQL connection pool
│   ├── services/
│   │   ├── githubService.js  # All GitHub API calls
│   │   └── analysisService.js# Turns raw GitHub data into insights
│   ├── models/profileModel.js# SQL queries (upsert/select/delete)
│   ├── controllers/profileController.js
│   ├── routes/profileRoutes.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   ├── app.js                # Express app (middleware + routes)
│   └── server.js             # Entry point — checks DB, then listens
├── .env.example
└── package.json
```

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env` with your MySQL credentials. A `GITHUB_TOKEN` is optional but recommended (raises the GitHub rate limit from 60/hr to 5000/hr — create one at https://github.com/settings/tokens, no scopes required for public data).

### 3. Create the database & table
```bash
npm run db:init
```
This connects to MySQL using your `.env` credentials and runs `db/schema.sql` (creates the `github_analyzer` database and `profiles` table if they don't already exist).

### 4. Run the server
```bash
npm start        # production
npm run dev       # auto-restart on file changes (nodemon)
```
The API listens on `http://localhost:3000` by default.

## Deploy to Render

This project can run on Render as a Node web service, but it still needs a MySQL database hosted externally because Render does not provide a managed MySQL service.

### 1. Create the web service
1. Push the repo to GitHub.
2. In Render, create a new Web Service from the repository.
3. Render will use [render.yaml](render.yaml) or you can set the service manually.

### 2. Set environment variables
Add these in the Render dashboard:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `GITHUB_TOKEN` optional, but recommended
- `CACHE_TTL_MINUTES` optional

Render injects `PORT` automatically, and the app already reads `process.env.PORT`.

### 3. Initialize the database
Run the schema once against your MySQL database:

```bash
npm run db:init
```

If your MySQL database is already hosted externally, run the init command from your local machine or any CI job that can reach the database.

### 4. Confirm the live URL
After deployment, Render will give you a public URL like:

```text
https://your-service-name.onrender.com
```

Use that URL as your submission's live deployed API URL.

## API Reference

### Analyze a profile
```
POST /api/profiles/:username/analyze
POST /api/profiles/:username/analyze?refresh=true   # bypass cache
```
Fetches the user from GitHub, computes insights, and stores/updates them.

```bash
curl -X POST http://localhost:3000/api/profiles/octocat/analyze
```
```json
{
  "success": true,
  "cached": false,
  "data": {
    "username": "octocat",
    "name": "The Octocat",
    "public_repos": 8,
    "followers": 18000,
    "total_stars": 15980,
    "most_used_language": "HTML",
    "language_breakdown": { "C": 1, "HTML": 2 },
    "top_starred_repo": "Spoon-Knife",
    "account_age_days": 5621,
    "follower_following_ratio": 2000,
    "last_analyzed_at": "2026-06-17T10:00:00.000Z"
  }
}
```

### List all analyzed profiles
```
GET /api/profiles
GET /api/profiles?limit=10&offset=0&sortBy=followers&order=DESC
```
Sortable by `username`, `public_repos`, `followers`, `following`, `total_stars`, `total_forks`, `last_analyzed_at`, or `created_at`.

```bash
curl http://localhost:3000/api/profiles?sortBy=followers&order=DESC&limit=5
```

### Get a single stored profile
```
GET /api/profiles/:username
```
```bash
curl http://localhost:3000/api/profiles/octocat
```
Returns `404` if that username hasn't been analyzed yet.

### Delete a stored profile
```
DELETE /api/profiles/:username
```

### Health check
```
GET /health
```

## Error Handling

- Unknown GitHub username → `404` with a clear message.
- GitHub rate limit hit → `429` suggesting you add a `GITHUB_TOKEN`.
- Database errors → `500` with the underlying SQL error message (for debugging; consider hiding `detail` in production).
- Unmatched routes → `404`.

## Possible Future Improvements

- Background job (cron) to periodically refresh stale profiles instead of relying purely on on-demand refresh.
- Webhooks/GitHub App integration for real-time updates instead of polling.
- Auth (API keys) on write/delete endpoints.
- Historical tracking (a `profile_history` table) to chart follower/star growth over time.
- Swagger/OpenAPI spec for interactive API docs.
