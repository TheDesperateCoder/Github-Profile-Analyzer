/** Days between a GitHub account's creation and now. */
function computeAccountAgeDays(createdAt) {
  const created = new Date(createdAt);
  const diffMs = Date.now() - created.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Walk the user's repo list once to derive: total stars, total forks,
 * a language usage breakdown, the most-used language, and the
 * single most-starred repo.
 */
function analyzeRepos(repos) {
  let totalStars = 0;
  let totalForks = 0;
  const languageCounts = {};
  let topRepo = null;

  for (const repo of repos) {
    totalStars += repo.stargazers_count || 0;
    totalForks += repo.forks_count || 0;

    if (repo.language) {
      languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
    }

    if (!topRepo || (repo.stargazers_count || 0) > (topRepo.stargazers_count || 0)) {
      topRepo = repo;
    }
  }

  let mostUsedLanguage = null;
  let maxCount = 0;
  for (const [lang, count] of Object.entries(languageCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostUsedLanguage = lang;
    }
  }

  return {
    totalStars,
    totalForks,
    languageBreakdown: languageCounts,
    mostUsedLanguage,
    topStarredRepo: topRepo ? topRepo.name : null,
    topStarredRepoStars: topRepo ? topRepo.stargazers_count || 0 : 0,
  };
}

/**
 * Combine the raw GitHub profile + repo list into the flat insights
 * object that gets persisted to MySQL.
 */
function buildInsights(profile, repos) {
  const repoAnalysis = analyzeRepos(repos);
  const accountAgeDays = computeAccountAgeDays(profile.created_at);

  const followerFollowingRatio =
    profile.following > 0
      ? Number((profile.followers / profile.following).toFixed(2))
      : Number(profile.followers || 0);

  return {
    username: profile.login,
    githubId: profile.id,
    name: profile.name,
    avatarUrl: profile.avatar_url,
    bio: profile.bio,
    company: profile.company,
    location: profile.location,
    blog: profile.blog,
    email: profile.email,
    twitterUsername: profile.twitter_username,

    publicRepos: profile.public_repos,
    publicGists: profile.public_gists,
    followers: profile.followers,
    following: profile.following,

    totalStars: repoAnalysis.totalStars,
    totalForks: repoAnalysis.totalForks,
    mostUsedLanguage: repoAnalysis.mostUsedLanguage,
    languageBreakdown: repoAnalysis.languageBreakdown,
    topStarredRepo: repoAnalysis.topStarredRepo,
    topStarredRepoStars: repoAnalysis.topStarredRepoStars,

    accountCreatedAt: profile.created_at,
    accountAgeDays,
    followerFollowingRatio,

    profileUrl: profile.html_url,
  };
}

module.exports = { buildInsights, analyzeRepos, computeAccountAgeDays };
