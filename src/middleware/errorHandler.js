const { GitHubApiError } = require('../services/githubService');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err instanceof GitHubApiError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'Duplicate entry' });
  }

  if (err.code && err.code.startsWith('ER_')) {
    return res.status(500).json({ success: false, message: 'Database error', detail: err.sqlMessage });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
}

module.exports = errorHandler;
