const axios = require('axios');

const GITHUB_API_BASE = 'https://api.github.com';
const MAX_REPO_PAGES = 10; // safety cap -> up to 1000 repos analyzed per user

/**
 * Custom error so the route layer / error handler can distinguish
 * "GitHub said no" from generic server errors and respond with the
 * right status code and message.
 */
class GitHubApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'GitHubApiError';
    this.statusCode = statusCode;
  }
}

function getHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

function translateAxiosError(err, username) {
  if (err.response) {
    const { status } = err.response;
    if (status === 404) {
      return new GitHubApiError(`GitHub user '${username}' not found`, 404);
    }
    if (status === 403 || status === 429) {
      return new GitHubApiError(
        'GitHub API rate limit exceeded. Add a GITHUB_TOKEN to your .env to raise the limit, or try again later.',
        429
      );
    }
    return new GitHubApiError(`GitHub API responded with status ${status}`, status);
  }
  return new GitHubApiError(`Failed to reach GitHub API: ${err.message}`, 502);
}

/** Fetch the public profile object for a GitHub username. */
async function fetchUserProfile(username) {
  try {
    const { data } = await axios.get(`${GITHUB_API_BASE}/users/${username}`, {
      headers: getHeaders(),
    });
    return data;
  } catch (err) {
    throw translateAxiosError(err, username);
  }
}

/**
 * Fetch every public repo owned by the user (paginated, 100 per page).
 * Used to derive stars/forks/language insights.
 */
async function fetchAllPublicRepos(username) {
  const repos = [];
  let page = 1;

  try {
    while (page <= MAX_REPO_PAGES) {
      const { data } = await axios.get(`${GITHUB_API_BASE}/users/${username}/repos`, {
        headers: getHeaders(),
        params: { per_page: 100, page, type: 'owner', sort: 'updated' },
      });
      repos.push(...data);
      if (data.length < 100) break; // last page reached
      page += 1;
    }
    return repos;
  } catch (err) {
    throw translateAxiosError(err, username);
  }
}

module.exports = { fetchUserProfile, fetchAllPublicRepos, GitHubApiError };
