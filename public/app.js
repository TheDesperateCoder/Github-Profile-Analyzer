const form = document.getElementById('profile-form');
const usernameInput = document.getElementById('username');
const analyzeBtn = document.getElementById('analyze-btn');
const statusText = document.getElementById('status');
const resultTitle = document.getElementById('result-title');
const resultBadge = document.getElementById('result-badge');
const profilePanel = document.getElementById('profile-panel');
const avatar = document.getElementById('avatar');
const displayName = document.getElementById('display-name');
const handle = document.getElementById('handle');
const profileLink = document.getElementById('profile-link');
const statRepos = document.getElementById('stat-repos');
const statFollowers = document.getElementById('stat-followers');
const statStars = document.getElementById('stat-stars');
const statForks = document.getElementById('stat-forks');
const mostLanguage = document.getElementById('most-language');
const topRepo = document.getElementById('top-repo');
const ratio = document.getElementById('ratio');
const age = document.getElementById('age');
const languageBreakdown = document.getElementById('language-breakdown');
const cachedNote = document.getElementById('cached-note');
const recentSearchesList = document.getElementById('recent-searches');

const RECENT_SEARCHES_KEY = 'gha_recent_searches';
const MAX_RECENT_SEARCHES = 5;

function loadRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecentSearches(searches) {
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches.slice(0, MAX_RECENT_SEARCHES)));
}

function pushRecentSearch(username) {
  const normalized = username.trim();
  if (!normalized) {
    return;
  }

  const current = loadRecentSearches().filter((entry) => entry.toLowerCase() !== normalized.toLowerCase());
  current.unshift(normalized);
  saveRecentSearches(current);
  renderRecentSearches();
}

function renderRecentSearches() {
  if (!recentSearchesList) {
    return;
  }

  const recentSearches = loadRecentSearches();
  recentSearchesList.innerHTML = '';

  if (!recentSearches.length) {
    const empty = document.createElement('p');
    empty.className = 'recent-empty';
    empty.textContent = 'Your latest analyzed usernames will appear here.';
    recentSearchesList.appendChild(empty);
    return;
  }

  for (const search of recentSearches) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'recent-chip';
    button.textContent = search;
    button.addEventListener('click', () => {
      usernameInput.value = search;
      analyzeUsername(search, true);
    });
    recentSearchesList.appendChild(button);
  }
}

function setLoading(isLoading) {
  analyzeBtn.disabled = isLoading;
  analyzeBtn.textContent = isLoading ? 'Analyzing…' : 'Analyze';
  usernameInput.disabled = isLoading;
}

function setStatus(message, tone = 'neutral') {
  statusText.textContent = message;
  statusText.dataset.tone = tone;
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

function formatRatio(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return Number.isInteger(Number(value)) ? String(value) : Number(value).toFixed(2);
}

function showPanel(data) {
  profilePanel.classList.remove('hidden');
  resultTitle.textContent = `${data.username} analyzed successfully.`;
  resultBadge.textContent = data.last_analyzed_at ? 'Saved to MySQL' : 'Analyzed';

  avatar.src = data.avatar_url;
  avatar.alt = `${data.username} avatar`;
  displayName.textContent = data.name || data.username;
  handle.textContent = `@${data.username}`;
  profileLink.href = data.profile_url;

  statRepos.textContent = formatNumber(data.public_repos);
  statFollowers.textContent = formatNumber(data.followers);
  statStars.textContent = formatNumber(data.total_stars);
  statForks.textContent = formatNumber(data.total_forks);

  mostLanguage.textContent = data.most_used_language || '-';
  topRepo.textContent = data.top_starred_repo
    ? `${data.top_starred_repo} (${formatNumber(data.top_starred_repo_stars)} ★)`
    : '-';
  ratio.textContent = formatRatio(data.follower_following_ratio);
  age.textContent = `${formatNumber(data.account_age_days)} days`;

  languageBreakdown.innerHTML = '';
  const entries = Object.entries(data.language_breakdown || {});
  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'status';
    empty.textContent = 'No language breakdown available.';
    languageBreakdown.appendChild(empty);
  } else {
    for (const [language, count] of entries) {
      const pill = document.createElement('div');
      pill.className = 'language-pill';
      pill.innerHTML = `<span>${language}</span><strong>${count}</strong>`;
      languageBreakdown.appendChild(pill);
    }
  }

  cachedNote.textContent = data.last_analyzed_at ? `Last analyzed: ${new Date(data.last_analyzed_at).toLocaleString()}` : '';
  pushRecentSearch(data.username);
}

async function analyzeUsername(username, forceRefresh = true) {
  const normalized = username.trim();

  if (!normalized) {
    setStatus('Enter a GitHub username first.', 'error');
    return;
  }

  setLoading(true);
  setStatus(`Analyzing ${normalized}…`, 'loading');
  resultBadge.textContent = 'Working';

  try {
    const response = await fetch(`/api/profiles/${encodeURIComponent(normalized)}/analyze?refresh=${forceRefresh}` , {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || 'Unable to analyze profile.');
    }

    showPanel(payload.data);
    setStatus(payload.cached ? `${normalized} loaded from cache.` : `${normalized} analyzed and saved.`, 'success');
  } catch (error) {
    profilePanel.classList.add('hidden');
    resultTitle.textContent = 'No profile analyzed yet.';
    resultBadge.textContent = 'Error';
    setStatus(error.message, 'error');
  } finally {
    setLoading(false);
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  analyzeUsername(usernameInput.value, true);
});

document.querySelectorAll('[data-username]').forEach((button) => {
  button.addEventListener('click', () => {
    usernameInput.value = button.dataset.username;
    analyzeUsername(button.dataset.username, true);
  });
});

usernameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    analyzeUsername(usernameInput.value, true);
  }
});

renderRecentSearches();
