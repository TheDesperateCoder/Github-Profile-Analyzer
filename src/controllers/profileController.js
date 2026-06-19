const githubService = require('../services/githubService');
const analysisService = require('../services/analysisService');
const profileModel = require('../models/profileModel');

const CACHE_TTL_MINUTES = Number(process.env.CACHE_TTL_MINUTES || 60);

/** mysql2 may return JSON columns as strings depending on driver/version; normalize either way. */
function normalizeRow(row) {
  if (!row) return row;
  let languageBreakdown = row.language_breakdown;
  if (typeof languageBreakdown === 'string') {
    try {
      languageBreakdown = JSON.parse(languageBreakdown);
    } catch {
      languageBreakdown = {};
    }
  }
  return { ...row, language_breakdown: languageBreakdown || {} };
}

/**
 * POST /api/profiles/:username/analyze
 * Fetches a username from GitHub, computes insights, and stores/updates
 * them in MySQL. Returns the cached row instead of re-hitting GitHub if
 * it was analyzed within CACHE_TTL_MINUTES (override with ?refresh=true).
 */
async function analyzeProfile(req, res, next) {
  try {
    const { username } = req.params;
    const forceRefresh = req.query.refresh === 'true';

    if (!forceRefresh) {
      const existing = await profileModel.getProfileByUsername(username);
      if (existing && existing.last_analyzed_at) {
        const minutesSince = (Date.now() - new Date(existing.last_analyzed_at).getTime()) / 60000;
        if (minutesSince < CACHE_TTL_MINUTES) {
          return res.status(200).json({ success: true, cached: true, data: normalizeRow(existing) });
        }
      }
    }

    const profile = await githubService.fetchUserProfile(username);
    const repos = await githubService.fetchAllPublicRepos(username);
    const insights = analysisService.buildInsights(profile, repos);
    const saved = await profileModel.upsertProfile(insights);

    res.status(200).json({ success: true, cached: false, data: normalizeRow(saved) });
  } catch (err) {
    next(err);
  }
}

/** GET /api/profiles — list all stored analyzed profiles, paginated + sortable. */
async function listProfiles(req, res, next) {
  try {
    const { limit, offset, sortBy, order } = req.query;
    const { rows, total, limit: appliedLimit, offset: appliedOffset } = await profileModel.getAllProfiles({
      limit,
      offset,
      sortBy,
      order,
    });

    res.status(200).json({
      success: true,
      total,
      count: rows.length,
      limit: appliedLimit,
      offset: appliedOffset,
      data: rows.map(normalizeRow),
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/profiles/:username — fetch one stored, already-analyzed profile. */
async function getProfile(req, res, next) {
  try {
    const { username } = req.params;
    const profile = await profileModel.getProfileByUsername(username);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: `No analyzed profile found for '${username}'. Analyze it first via POST /api/profiles/${username}/analyze`,
      });
    }

    res.status(200).json({ success: true, data: normalizeRow(profile) });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/profiles/:username — remove a stored profile (bonus). */
async function removeProfile(req, res, next) {
  try {
    const { username } = req.params;
    const deleted = await profileModel.deleteProfile(username);

    if (!deleted) {
      return res.status(404).json({ success: false, message: `No profile found for '${username}'` });
    }

    res.status(200).json({ success: true, message: `Profile '${username}' deleted` });
  } catch (err) {
    next(err);
  }
}

module.exports = { analyzeProfile, listProfiles, getProfile, removeProfile };
