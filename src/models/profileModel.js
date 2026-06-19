const pool = require('../config/db');

const ALLOWED_SORT_COLUMNS = [
  'username',
  'public_repos',
  'followers',
  'following',
  'total_stars',
  'total_forks',
  'last_analyzed_at',
  'created_at',
];

/** Insert a new analyzed profile, or update it in place if it already exists. */
async function upsertProfile(insights) {
  const sql = `
    INSERT INTO profiles (
      username, github_id, name, avatar_url, bio, company, location, blog, email,
      twitter_username, public_repos, public_gists, followers, following,
      total_stars, total_forks, most_used_language, language_breakdown,
      top_starred_repo, top_starred_repo_stars, account_created_at, account_age_days,
      follower_following_ratio, profile_url, last_analyzed_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, NOW())
    ON DUPLICATE KEY UPDATE
      github_id = VALUES(github_id),
      name = VALUES(name),
      avatar_url = VALUES(avatar_url),
      bio = VALUES(bio),
      company = VALUES(company),
      location = VALUES(location),
      blog = VALUES(blog),
      email = VALUES(email),
      twitter_username = VALUES(twitter_username),
      public_repos = VALUES(public_repos),
      public_gists = VALUES(public_gists),
      followers = VALUES(followers),
      following = VALUES(following),
      total_stars = VALUES(total_stars),
      total_forks = VALUES(total_forks),
      most_used_language = VALUES(most_used_language),
      language_breakdown = VALUES(language_breakdown),
      top_starred_repo = VALUES(top_starred_repo),
      top_starred_repo_stars = VALUES(top_starred_repo_stars),
      account_created_at = VALUES(account_created_at),
      account_age_days = VALUES(account_age_days),
      follower_following_ratio = VALUES(follower_following_ratio),
      profile_url = VALUES(profile_url),
      last_analyzed_at = NOW()
  `;

  const params = [
    insights.username,
    insights.githubId,
    insights.name,
    insights.avatarUrl,
    insights.bio,
    insights.company,
    insights.location,
    insights.blog,
    insights.email,
    insights.twitterUsername,
    insights.publicRepos,
    insights.publicGists,
    insights.followers,
    insights.following,
    insights.totalStars,
    insights.totalForks,
    insights.mostUsedLanguage,
    JSON.stringify(insights.languageBreakdown || {}),
    insights.topStarredRepo,
    insights.topStarredRepoStars,
    insights.accountCreatedAt ? new Date(insights.accountCreatedAt) : null,
    insights.accountAgeDays,
    insights.followerFollowingRatio,
    insights.profileUrl,
  ];

  await pool.execute(sql, params);
  return getProfileByUsername(insights.username);
}

async function getProfileByUsername(username) {
  const [rows] = await pool.execute('SELECT * FROM profiles WHERE username = ?', [username]);
  return rows[0] || null;
}

/** Paginated + sortable list of every analyzed profile. */
async function getAllProfiles({ limit = 20, offset = 0, sortBy = 'last_analyzed_at', order = 'DESC' } = {}) {
  const sortColumn = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : 'last_analyzed_at';
  const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // Column names are validated against an allowlist above, so this is safe
  // to interpolate; values are still passed as bound params.
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const [rows] = await pool.query(
    `SELECT * FROM profiles ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`,
    [safeLimit, safeOffset]
  );
  const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM profiles');

  return { rows, total: count, limit: safeLimit, offset: safeOffset };
}

async function deleteProfile(username) {
  const [result] = await pool.execute('DELETE FROM profiles WHERE username = ?', [username]);
  return result.affectedRows > 0;
}

module.exports = { upsertProfile, getProfileByUsername, getAllProfiles, deleteProfile, ALLOWED_SORT_COLUMNS };
