export interface RepoRef {
  owner: string;
  name: string;
  fullName: string;
}

const RESERVED_ROOTS = new Set([
  'about',
  'account',
  'apps',
  'beta',
  'collections',
  'contact',
  'copilot',
  'customer',
  'customers',
  'dashboard',
  'enterprise',
  'events',
  'explore',
  'features',
  'gist',
  'issues',
  'join',
  'login',
  'logout',
  'marketplace',
  'messages',
  'new',
  'notifications',
  'organizations',
  'orgs',
  'pricing',
  'pulls',
  'search',
  'security',
  'sentinel',
  'sessions',
  'settings',
  'signup',
  'site',
  'skills',
  'sponsors',
  'stars',
  'team',
  'teams',
  'tos',
  'topics',
  'trending',
  'users',
]);

const RESERVED_REPOS = new Set(['settings', 'notifications', 'search', 'new']);

export function parseRepoPath(pathname: string): RepoRef | null {
  const parts = pathname.replace(/^\/+|\/+$/g, '').split('/');
  if (parts.length < 2) return null;

  const [owner, name] = parts;
  if (!owner || !name) return null;
  if (RESERVED_ROOTS.has(owner.toLowerCase())) return null;
  if (RESERVED_REPOS.has(name.toLowerCase())) return null;
  if (owner.startsWith('.') || name.startsWith('.')) return null;
  if (name.endsWith('.git')) return null;

  return { owner, name, fullName: `${owner}/${name}` };
}

export function isRepoPage(pathname: string): boolean {
  return parseRepoPath(pathname) !== null;
}
