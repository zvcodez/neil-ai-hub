// GitHub API client. Fetches public repositories for a username.
// Optionally uses a personal access token (stored locally) for higher rate
// limits / private repos. No token is required for public repos.

const USERNAME = 'zvcodez';
const TOKEN_KEY = 'nah:github-token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token.trim());
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export async function fetchRepos(username = USERNAME) {
  const token = getToken();
  const headers = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  // When authenticated, /user/repos returns private repos too; otherwise use
  // the public per-user endpoint.
  const url = token
    ? 'https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner'
    : `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (res.status === 403 && remaining === '0') {
      throw new Error('GitHub API rate limit reached. Add a personal access token to continue.');
    }
    if (res.status === 401) throw new Error('GitHub token is invalid or expired.');
    if (res.status === 404) throw new Error(`GitHub user "${username}" not found.`);
    throw new Error(`GitHub API error (${res.status}).`);
  }
  const data = await res.json();
  return data
    .filter((r) => !r.fork || true) // keep all; user can ignore forks visually
    .map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description || '',
      htmlUrl: r.html_url,
      homepage: r.homepage || '',
      language: r.language || '',
      stars: r.stargazers_count,
      updatedAt: r.pushed_at || r.updated_at,
      createdAt: r.created_at,
      isFork: r.fork,
      isPrivate: r.private,
      topics: r.topics || [],
    }));
}

export { USERNAME };
